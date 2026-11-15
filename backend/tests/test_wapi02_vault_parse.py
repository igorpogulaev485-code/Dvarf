"""W-API-02: разбор markdown-хранилища Who → строки черновика сверки."""

from __future__ import annotations

import io
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.models.world_import import WorldImportDraftItem, WorldImportJob, WorldSourceKey
from app.schemas.world_import import WorldImportCreateRequest, WorldVaultParseRequest
from app.services import lobby_roles as roles
from app.services.world_import import WorldImportService
from app.services.world_vault_parse import (
    VaultFile,
    classify_vault_path,
    extract_zip_to_files,
    load_vault_dir,
    parse_vault_files,
    split_frontmatter,
)

FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "who_vault"


def _user(name="U"):
    return SimpleNamespace(id=uuid4(), display_name=name, login=None, email=f"{name}@t.test")


def _lobby(owner_id):
    return SimpleNamespace(
        id=uuid4(),
        owner_id=owner_id,
        name="Лобби",
        invite_code="ABC123",
        members=[],
        roles=[],
        settings=[],
        sessions=[],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def _setting(lobby_id, name="Мир"):
    return SimpleNamespace(
        id=uuid4(),
        lobby_id=lobby_id,
        name=name,
        world_notes="",
        is_extra=False,
        deleted_at=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


class FakeLobbies:
    def __init__(self, lobby, setting):
        self.lobby = lobby
        self.setting = setting

    def get(self, lobby_id):
        return self.lobby if self.lobby.id == lobby_id else None

    def get_setting(self, setting_id):
        return self.setting if self.setting.id == setting_id else None


class FakeDB:
    def __init__(self):
        self.jobs: list[WorldImportJob] = []
        self.draft_items: list[WorldImportDraftItem] = []
        self.source_keys: list[WorldSourceKey] = []

    def add(self, obj):
        now = datetime.now(timezone.utc)
        if isinstance(obj, WorldImportJob):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            if getattr(obj, "created_at", None) is None:
                obj.created_at = now
            if getattr(obj, "updated_at", None) is None:
                obj.updated_at = now
            self.jobs.append(obj)
        elif isinstance(obj, WorldImportDraftItem):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            if getattr(obj, "created_at", None) is None:
                obj.created_at = now
            if getattr(obj, "updated_at", None) is None:
                obj.updated_at = now
            self.draft_items.append(obj)
        elif isinstance(obj, WorldSourceKey):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            if getattr(obj, "created_at", None) is None:
                obj.created_at = now
            if getattr(obj, "updated_at", None) is None:
                obj.updated_at = now
            self.source_keys.append(obj)

    def commit(self):
        return None

    def refresh(self, obj):
        return None

    def get(self, model, pk):
        if model is WorldImportJob:
            for j in self.jobs:
                if j.id == pk:
                    return j
        return None

    def scalar(self, stmt):  # noqa: ANN001
        # Heuristic lookups used by world_import service.
        target = getattr(self, "_scalar_target", None)
        return target

    def scalars(self, stmt):  # noqa: ANN001
        class _Result:
            def __init__(self, rows):
                self._rows = rows

            def all(self):
                return list(self._rows)

        # Сервис для apply/list draft items всегда ходит через scalars —
        # в этих тестах возвращаем строки черновика (пусто до первого разбора).
        return _Result(list(self.draft_items))


def _svc(lobby, setting, monkeypatch):
    db = FakeDB()
    svc = WorldImportService(db)
    svc.lobbies = FakeLobbies(lobby, setting)

    def _require_wiki(_db, _lobby, user):
        if user.id != lobby.owner_id:
            raise AppError("Нет прав", code="lobby_wiki_required", status_code=403)

    monkeypatch.setattr(roles, "require_can_edit_wiki", _require_wiki)

    def fake_upsert(setting_id, *, source_path, source_slug):
        for sk in db.source_keys:
            if sk.setting_id == setting_id and sk.source_path == source_path:
                if source_slug and sk.source_slug != source_slug:
                    conflict = any(
                        other.setting_id == setting_id
                        and other.source_slug == source_slug
                        and other.id != sk.id
                        for other in db.source_keys
                    )
                    if not conflict:
                        sk.source_slug = source_slug
                return
        slug_to_set = source_slug
        if slug_to_set and any(
            sk.setting_id == setting_id and sk.source_slug == slug_to_set for sk in db.source_keys
        ):
            slug_to_set = None
        db.add(
            WorldSourceKey(
                setting_id=setting_id,
                source_path=source_path,
                source_slug=slug_to_set,
            )
        )

    svc._upsert_source_key = fake_upsert  # type: ignore[method-assign]

    # Draft-item lookup for re-ingest: scalars() already returns draft_items.
    # Idempotency for create_job: mimic W-API-01 helper.
    original_create = svc.create_job

    def create_job_with_idem(user, setting_id, payload=None, *, idempotency_key=None):
        key = (idempotency_key or "").strip() or None
        if key:
            for job in db.jobs:
                if job.setting_id == setting.id and job.idempotency_key == key:
                    db._idempotency_hit = job
                    break
            else:
                db._idempotency_hit = None
        else:
            db._idempotency_hit = None
        return original_create(user, setting_id, payload, idempotency_key=idempotency_key)

    svc.create_job = create_job_with_idem  # type: ignore[method-assign]

    def smart_scalar(stmt):  # noqa: ANN001
        return getattr(db, "_idempotency_hit", None)

    db.scalar = smart_scalar  # type: ignore[method-assign]
    return svc, db


# --- pure parser ---


def test_classify_who_paths():
    assert classify_vault_path("world/locations/lunnyy-most.md") == "location"
    assert classify_vault_path("world/npcs/elessar-i.md") == "npc"
    assert classify_vault_path("world/factions/khvost-skorpiona.md") == "faction"
    assert classify_vault_path("world/lore/artefacts-kardian.md") == "note"
    assert classify_vault_path("world/history/epochs.md") == "note"
    assert (
        classify_vault_path("world/player-books/chapters/Ledyanye-rasteniya-12-08.md")
        == "book_chapter"
    )
    assert classify_vault_path("campaign/sessions/01-lunnyy-most-start.md") == "session_journal"
    assert classify_vault_path("campaign/party/characters/kavil.md") == "pending_character"
    assert classify_vault_path("rules/encounters/01-dragonborn-vanguard.md") == "combat"
    assert classify_vault_path("campaign/plot/arcs.md") == "note"
    assert classify_vault_path("world/locations/README.md") is None
    assert classify_vault_path("world/history/README.md") is None
    assert classify_vault_path("drafts/imports/qwen-fake-chat.json") is None
    assert classify_vault_path("templates/location.md") is None
    assert classify_vault_path("CANON.md") is None


def test_split_frontmatter_as_is():
    text = FIXTURE_ROOT.joinpath("world/locations/lunnyy-most.md").read_text(encoding="utf-8")
    fm, body = split_frontmatter(text)
    assert fm["title"] == "Лунный Мост"
    assert fm["status"] == "canon"
    assert "tags" in fm
    assert body.lstrip().startswith("# Лунный Мост")


def test_fixture_vault_types_and_keys():
    files = load_vault_dir(FIXTURE_ROOT)
    result = parse_vault_files(files)

    by_key = {it.source_key: it for it in result.items}
    assert "world/locations/lunnyy-most.md" in by_key
    assert by_key["world/locations/lunnyy-most.md"].item_type == "location"
    assert by_key["world/locations/lunnyy-most.md"].source_slug == "lunnyy-most"

    assert by_key["world/npcs/elessar-i.md"].item_type == "npc"
    assert by_key["world/factions/khvost-skorpiona.md"].item_type == "faction"
    assert by_key["world/lore/artefacts-kardian.md"].item_type == "note"
    # Один файл «шесть артефактов» — одна заметка лора (нарезка — W-API-06).
    assert by_key["world/lore/artefacts-kardian.md"].proposal["title"] == "Артефакты Кардиана"
    assert "Шесть" in by_key["world/lore/artefacts-kardian.md"].proposal["body"]

    assert by_key["campaign/sessions/01-lunnyy-most-start.md"].item_type == "session_journal"
    assert by_key["rules/encounters/01-dragonborn-vanguard.md"].item_type == "combat"
    assert by_key["campaign/party/characters/kavil.md"].item_type == "pending_character"
    assert (
        by_key["campaign/party/characters/kavil.md"].proposal["parse_status"]
        == "pending_character"
    )

    # Книга попала в черновик как группа + глава.
    assert "world/player-books" in by_key
    assert by_key["world/player-books"].item_type == "book"
    chapter_key = "world/player-books/chapters/Ledyanye-rasteniya-12-08.md"
    assert chapter_key in by_key
    assert by_key[chapter_key].item_type == "book_chapter"
    assert by_key[chapter_key].proposal["book_group_key"] == "world/player-books"
    assert any(
        c["source_key"] == chapter_key
        for c in by_key["world/player-books"].proposal["chapters"]
    )

    skipped_paths = {s["path"] for s in result.skipped}
    assert "world/locations/README.md" in skipped_paths
    assert "world/history/README.md" in skipped_paths
    assert "drafts/imports/qwen-fake-chat.json" in skipped_paths
    assert "templates/location.md" in skipped_paths

    # README / JSON чата не стали локациями.
    assert all(it.item_type != "location" or "README" not in it.source_key for it in result.items)
    assert not any(it.source_key.endswith(".json") for it in result.items)


def test_parse_idempotent_same_files_twice():
    files = load_vault_dir(FIXTURE_ROOT)
    first = parse_vault_files(files)
    second = parse_vault_files(files)
    assert sorted(it.source_key for it in first.items) == sorted(
        it.source_key for it in second.items
    )
    assert len(first.items) == len({it.source_key for it in first.items})


def test_zip_roundtrip_same_keys():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in FIXTURE_ROOT.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(FIXTURE_ROOT).as_posix()
            if rel == "README.md":
                continue
            zf.writestr(rel, path.read_bytes())
    data = buf.getvalue()
    files = extract_zip_to_files(data)
    result = parse_vault_files(files)
    assert "world/locations/lunnyy-most.md" in {it.source_key for it in result.items}
    assert "world/player-books" in {it.source_key for it in result.items}


def test_bad_zip_raises():
    with pytest.raises(AppError) as ei:
        extract_zip_to_files(b"not-a-zip")
    assert ei.value.code == "bad_zip"


def test_bad_encoding_raises():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("world/locations/bad.md", b"\xff\xfe\x00 not utf-8")
    with pytest.raises(AppError) as ei:
        extract_zip_to_files(buf.getvalue())
    assert ei.value.code == "bad_encoding"


def test_path_traversal_rejected():
    with pytest.raises(AppError) as ei:
        parse_vault_files([VaultFile(path="../secret.md", content="# x")])
    assert ei.value.code == "vault_path_rejected"


# --- service: draft upsert, rules_edition, no setting_pages ---


def test_ingest_creates_draft_items_not_wiki(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)

    job = svc.create_job(owner, setting.id, WorldImportCreateRequest(source_kind="api"))
    files = load_vault_dir(FIXTURE_ROOT)
    payload = WorldVaultParseRequest(
        files=[{"path": f.path, "content": f.content} for f in files]
    )
    out = svc.ingest_vault_files(owner, setting.id, job.id, payload)

    assert out.job.status == "ready_for_review"
    assert out.created_count >= 8
    keys = {it.source_key for it in out.items}
    assert "world/locations/lunnyy-most.md" in keys
    assert "world/player-books" in keys
    assert "world/lore/artefacts-kardian.md" in keys
    # README / json не в черновике
    assert "world/locations/README.md" not in keys
    assert "drafts/imports/qwen-fake-chat.json" not in keys
    # Канон вики не трогали — у ключей источника page_id пуст.
    assert db.source_keys
    assert all(sk.page_id is None for sk in db.source_keys)
    assert all(sk.artifact_id is None for sk in db.source_keys)
    assert all(sk.character_id is None for sk in db.source_keys)


def test_reingest_same_vault_updates_no_duplicate_keys(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)

    job = svc.create_job(owner, setting.id, WorldImportCreateRequest())
    files = load_vault_dir(FIXTURE_ROOT)
    payload = WorldVaultParseRequest(
        files=[{"path": f.path, "content": f.content} for f in files]
    )
    first = svc.ingest_vault_files(owner, setting.id, job.id, payload)
    n_items = len(db.draft_items)
    n_keys = len({(sk.setting_id, sk.source_path) for sk in db.source_keys})

    second = svc.ingest_vault_files(owner, setting.id, job.id, payload)
    assert second.updated_count >= first.created_count
    assert second.created_count == 0
    assert len(db.draft_items) == n_items
    assert len({(sk.setting_id, sk.source_path) for sk in db.source_keys}) == n_keys


def test_ingest_rejects_rules_edition_2024(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)

    job = svc.create_job(owner, setting.id, WorldImportCreateRequest())
    with pytest.raises(AppError) as ei:
        svc.ingest_vault_files(
            owner,
            setting.id,
            job.id,
            WorldVaultParseRequest(
                rules_edition="2024",
                files=[{"path": "world/locations/x.md", "content": "# X\n"}],
            ),
        )
    assert ei.value.code == "rules_edition_unsupported"
    # После отказа статус failed (проверка редакции до разбора, но job уже мог уйти в parsing
    # только после успешной проверки — у нас проверка до parsing).
    assert len(db.draft_items) == 0


def test_ingest_zip_sets_source_kind(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)
    job = svc.create_job(owner, setting.id, WorldImportCreateRequest())

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "world/locations/lunnyy-most.md",
            FIXTURE_ROOT.joinpath("world/locations/lunnyy-most.md").read_bytes(),
        )
    out = svc.ingest_vault_zip(owner, setting.id, job.id, buf.getvalue())
    assert out.job.source_kind == "zip"
    assert out.job.status == "ready_for_review"
    assert any(it.source_key == "world/locations/lunnyy-most.md" for it in out.items)
