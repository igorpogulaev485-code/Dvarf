"""W-API-09: импорт из git → тот же разбор, что zip (мок сети, фикстура Who)."""

from __future__ import annotations

import io
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest

from app.core.exceptions import AppError
from app.models.world_import import (
    WorldImportDraftItem,
    WorldImportDraftLink,
    WorldImportJob,
    WorldSourceAlias,
    WorldSourceKey,
)
from app.schemas.world_import import WorldImportFromGitRequest
from app.services import lobby_roles as roles
from app.services.world_import import WorldImportService
from app.services.world_import_auth import WorldImportActor
from app.services.world_import_git import (
    extract_git_archive_to_files,
    fetch_vault_files_from_git_url,
    validate_git_url,
)
from app.services.world_vault_parse import load_vault_dir

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
        ai_can_confirm=False,
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
        self.aliases: list[WorldSourceAlias] = []
        self.draft_links: list[WorldImportDraftLink] = []
        self._idempotency_hit = None

    def add(self, obj):
        now = datetime.now(timezone.utc)
        if isinstance(obj, WorldImportJob):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            obj.created_at = getattr(obj, "created_at", None) or now
            obj.updated_at = getattr(obj, "updated_at", None) or now
            if not hasattr(obj, "last_confirmed_at"):
                obj.last_confirmed_at = None
            if not hasattr(obj, "confirm_snapshot"):
                obj.confirm_snapshot = None
            self.jobs.append(obj)
        elif isinstance(obj, WorldImportDraftItem):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            obj.created_at = getattr(obj, "created_at", None) or now
            obj.updated_at = getattr(obj, "updated_at", None) or now
            self.draft_items.append(obj)
        elif isinstance(obj, WorldSourceKey):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            obj.created_at = getattr(obj, "created_at", None) or now
            obj.updated_at = getattr(obj, "updated_at", None) or now
            self.source_keys.append(obj)
        elif isinstance(obj, WorldSourceAlias):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            obj.created_at = getattr(obj, "created_at", None) or now
            self.aliases.append(obj)
        elif isinstance(obj, WorldImportDraftLink):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            obj.created_at = getattr(obj, "created_at", None) or now
            self.draft_links.append(obj)

    def commit(self):
        return None

    def flush(self):
        return None

    def refresh(self, obj):
        return None

    def execute(self, stmt):  # noqa: ANN001
        self.draft_links = []
        return None

    def get(self, model, pk):
        if model is WorldImportJob:
            for j in self.jobs:
                if j.id == pk:
                    return j
        return None

    def scalar(self, stmt):  # noqa: ANN001
        if self._idempotency_hit is not None:
            return self._idempotency_hit
        for j in self.jobs:
            if j.status == "parsing":
                return j
        return None

    def scalars(self, stmt):  # noqa: ANN001
        class _Result:
            def __init__(self, rows):
                self._rows = rows

            def all(self):
                return list(self._rows)

        entity = None
        try:
            entity = stmt.column_descriptions[0]["entity"]
        except Exception:
            entity = None
        if entity is WorldImportDraftLink:
            return _Result(list(self.draft_links))
        if entity is WorldImportDraftItem:
            return _Result(list(self.draft_items))
        if entity is WorldImportJob:
            return _Result(list(self.jobs))
        return _Result(list(self.draft_items))


def _svc(lobby, setting, monkeypatch):
    db = FakeDB()
    svc = WorldImportService(db)
    fake_lobbies = FakeLobbies(lobby, setting)
    svc.lobbies = fake_lobbies
    svc.access.lobbies = fake_lobbies

    def _require_wiki(_db, _lobby, user):
        if user.id != lobby.owner_id:
            raise AppError("Нет прав", code="lobby_wiki_required", status_code=403)

    monkeypatch.setattr(roles, "require_can_edit_wiki", _require_wiki)

    def fake_upsert(setting_id, *, source_path, source_slug):
        for sk in db.source_keys:
            if sk.setting_id == setting_id and sk.source_path == source_path:
                return sk
        row = WorldSourceKey(
            setting_id=setting_id,
            source_path=source_path,
            source_slug=source_slug,
        )
        db.add(row)
        return row

    svc._upsert_source_key = fake_upsert  # type: ignore[method-assign]

    def fake_upsert_aliases(setting_id, source_key_row, alias_pairs):
        return [d for d, _n in alias_pairs]

    svc._upsert_aliases = fake_upsert_aliases  # type: ignore[method-assign]
    return svc, db


def _fixture_as_github_zip(*, prefix: str = "Who-main") -> bytes:
    """Собирает zip как у codeload.github.com: корневая папка Who-main/."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in FIXTURE_ROOT.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(FIXTURE_ROOT).as_posix()
            zf.writestr(f"{prefix}/{rel}", path.read_bytes())
    return buf.getvalue()


def test_extract_git_archive_strips_top_folder_and_finds_lunnyy_most():
    data = _fixture_as_github_zip()
    files = extract_git_archive_to_files(data)
    keys = {f.path for f in files}
    assert "world/locations/lunnyy-most.md" in keys
    assert not any(p.startswith("Who-main/") for p in keys)


def test_mock_git_import_diff_has_lunnyy_most(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)

    fixture_files = load_vault_dir(FIXTURE_ROOT)

    def fake_fetch(_url: str):
        return fixture_files

    out = svc.ingest_from_git(
        actor,
        setting.id,
        WorldImportFromGitRequest(
            url="https://github.com/igorpogulaev485-code/Who",
            rules_edition="2014",
        ),
        fetch_files=fake_fetch,
    )

    assert out.job.source_kind == "git"
    assert out.job.status == "ready_for_review"
    assert out.job.source_ref == "https://github.com/igorpogulaev485-code/Who"
    keys = {it.source_key for it in out.items}
    assert "world/locations/lunnyy-most.md" in keys
    assert out.created_count >= 1


def test_git_import_rejects_rules_edition_2024_before_fetch(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)

    called = {"n": 0}

    def boom(_url: str):
        called["n"] += 1
        raise AssertionError("сеть не должна вызываться")

    with pytest.raises(AppError) as ei:
        svc.ingest_from_git(
            actor,
            setting.id,
            WorldImportFromGitRequest(
                url="https://github.com/igorpogulaev485-code/Who",
                rules_edition="2024",
            ),
            fetch_files=boom,
        )
    assert ei.value.code == "rules_edition_unsupported"
    assert called["n"] == 0
    assert len(db.jobs) == 0


def test_git_import_rejects_bad_url_before_fetch(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)

    with pytest.raises(AppError) as ei:
        svc.ingest_from_git(
            actor,
            setting.id,
            WorldImportFromGitRequest(url="http://127.0.0.1/repo"),
            fetch_files=lambda u: [],
        )
    assert ei.value.code == "git_url_rejected"
    assert len(db.jobs) == 0


def test_network_mock_download_then_parse():
    """Узкий интеграционный тест: httpx-мок отдаёт zip фикстуры → lunnyy-most."""
    data = _fixture_as_github_zip()
    parsed = validate_git_url("https://github.com/igorpogulaev485-code/Who")
    req = httpx.Request("GET", parsed.archive_url)

    class FakeStreamResp:
        status_code = 200
        headers = {"content-length": str(len(data))}

        def iter_bytes(self):
            yield data

    class FakeStream:
        def __enter__(self):
            return FakeStreamResp()

        def __exit__(self, *args):
            return False

    class FakeClient:
        def stream(self, method, url):  # noqa: ANN001
            assert method == "GET"
            assert "codeload.github.com" in url
            return FakeStream()

        def close(self):
            return None

    got_parsed, files = fetch_vault_files_from_git_url(
        "https://github.com/igorpogulaev485-code/Who",
        client=FakeClient(),  # type: ignore[arg-type]
        resolve_host=lambda h: None,
    )
    assert got_parsed.repo == "Who"
    assert any(f.path == "world/locations/lunnyy-most.md" for f in files)


def test_same_fixture_git_matches_zip_keys():
    """Разбор совпадает с zip на одной фикстуре (набор source_key)."""
    from app.services.world_vault_parse import extract_zip_to_files, parse_vault_files

    plain = io.BytesIO()
    with zipfile.ZipFile(plain, "w") as zf:
        for path in FIXTURE_ROOT.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(FIXTURE_ROOT).as_posix()
            if rel.lower().endswith((".md", ".json", ".txt", ".html", ".yml", ".yaml", ".pdf")):
                zf.writestr(rel, path.read_bytes())
    zip_files = extract_zip_to_files(plain.getvalue())
    git_files = extract_git_archive_to_files(_fixture_as_github_zip())

    zip_keys = {i.source_key for i in parse_vault_files(zip_files).items}
    git_keys = {i.source_key for i in parse_vault_files(git_files).items}
    assert "world/locations/lunnyy-most.md" in zip_keys
    assert zip_keys == git_keys
