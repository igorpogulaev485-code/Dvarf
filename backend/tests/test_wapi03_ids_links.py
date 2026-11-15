"""W-API-03: стабильные ключи, алиасы имён и предложенные связи черновика."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory

from app.core.exceptions import AppError
from app.dnd.setting_mentions import extract_mention_titles
from app.models.world_import import (
    WorldImportDraftItem,
    WorldImportDraftLink,
    WorldImportJob,
    WorldSourceAlias,
    WorldSourceKey,
)
from app.schemas.world_import import WorldImportCreateRequest, WorldVaultParseRequest
from app.services import lobby_roles as roles
from app.services.world_import import WorldImportService
from app.services.world_import_links import (
    build_alias_and_link_graph,
    collect_aliases_for_item,
    extract_md_file_links,
    normalize_alias_key,
    resolve_md_href,
)
from app.services.world_vault_parse import load_vault_dir, parse_vault_files

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
        self.aliases: list[WorldSourceAlias] = []
        self.draft_links: list[WorldImportDraftLink] = []
        self._scalar_mode = "auto"

    def add(self, obj):
        now = datetime.now(timezone.utc)
        if isinstance(obj, WorldImportJob):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            obj.created_at = getattr(obj, "created_at", None) or now
            obj.updated_at = getattr(obj, "updated_at", None) or now
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
        return getattr(self, "_idempotency_hit", None)

    def scalars(self, stmt):  # noqa: ANN001
        class _Result:
            def __init__(self, rows):
                self._rows = rows

            def all(self):
                return list(self._rows)

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
                return sk
        if source_slug:
            for sk in db.source_keys:
                if sk.setting_id == setting_id and sk.source_slug == source_slug:
                    path_taken = any(
                        other.setting_id == setting_id
                        and other.source_path == source_path
                        and other.id != sk.id
                        for other in db.source_keys
                    )
                    if not path_taken:
                        sk.source_path = source_path
                    return sk
        row = WorldSourceKey(
            setting_id=setting_id,
            source_path=source_path,
            source_slug=source_slug,
        )
        db.add(row)
        return row

    def fake_upsert_aliases(setting_id, source_key_row, alias_pairs):
        stored = []
        for display, norm in alias_pairs:
            hit = next(
                (
                    a
                    for a in db.aliases
                    if a.setting_id == setting_id and a.alias_norm == norm
                ),
                None,
            )
            if hit is not None:
                if hit.source_key_id == source_key_row.id:
                    stored.append(hit.alias)
                continue
            db.add(
                WorldSourceAlias(
                    setting_id=setting_id,
                    source_key_id=source_key_row.id,
                    alias=display,
                    alias_norm=norm,
                )
            )
            stored.append(display)
        return stored

    svc._upsert_source_key = fake_upsert  # type: ignore[method-assign]
    svc._upsert_aliases = fake_upsert_aliases  # type: ignore[method-assign]
    return svc, db


# --- pure helpers ---


def test_normalize_alias_collapses_case_and_spaces():
    assert normalize_alias_key("  Тандил  ") == normalize_alias_key("тандил")
    assert normalize_alias_key("Капитан_Тандил") == normalize_alias_key("капитан тандил")


def test_tandil_title_aliases_include_short_name():
    bundle = collect_aliases_for_item(
        title="Капитан Тандил → мэр",
        slug="tandil",
        body="# Тандил\n\nТекст.\n",
        frontmatter={"title": "Капитан Тандил → мэр"},
    )
    norms = {n for _d, n in bundle.norms}
    assert "тандил" in norms
    assert "капитан тандил → мэр" in norms or "капитан тандил" in norms


def test_md_link_from_elessar_to_konstantin():
    elessar = FIXTURE_ROOT.joinpath("world/npcs/elessar-i.md").read_text(encoding="utf-8")
    links = extract_md_file_links("world/npcs/elessar-i.md", elessar)
    targets = {t for _label, t in links}
    assert "world/npcs/konstantin-iii.md" in targets
    assert resolve_md_href("world/npcs/elessar-i.md", "konstantin-iii.md") == (
        "world/npcs/konstantin-iii.md"
    )


def test_reuses_setting_mentions_extractor():
    body = "См. [[Тандил]] и @Элессар_I в тексте."
    titles = extract_mention_titles(body)
    assert "Тандил" in titles
    assert "Элессар I" in titles


def test_fixture_graph_unique_keys_and_links():
    files = load_vault_dir(FIXTURE_ROOT)
    result = parse_vault_files(files)
    keys = [it.source_key for it in result.items]
    assert len(keys) == len(set(keys))
    assert keys.count("world/locations/lunnyy-most.md") == 1
    assert keys.count("world/npcs/elessar-i.md") == 1
    assert "world/npcs/tandil.md" in keys
    assert "world/npcs/konstantin-iii.md" in keys

    _aliases, links = build_alias_and_link_graph(result.items)
    edges = {(lnk.from_source_key, lnk.to_source_key, lnk.confidence) for lnk in links}

    assert (
        "world/npcs/elessar-i.md",
        "world/npcs/konstantin-iii.md",
        "explicit",
    ) in edges

    # Жирное «Тандил» во фракции → suggested, если tandil в пакете
    assert (
        "world/factions/khvost-skorpiona.md",
        "world/npcs/tandil.md",
        "suggested",
    ) in edges


def test_title_rename_same_path_no_duplicate_key(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)

    job = svc.create_job(owner, setting.id, WorldImportCreateRequest())
    first = WorldVaultParseRequest(
        files=[
            {
                "path": "world/npcs/elessar-i.md",
                "content": "---\ntitle: Элессар I\n---\n# Элессар I\n",
            }
        ]
    )
    svc.ingest_vault_files(owner, setting.id, job.id, first)
    n_keys = len(db.source_keys)

    second = WorldVaultParseRequest(
        files=[
            {
                "path": "world/npcs/elessar-i.md",
                "content": "---\ntitle: Король Элессар\n---\n# Король Элессар\n",
            }
        ]
    )
    out = svc.ingest_vault_files(owner, setting.id, job.id, second)
    assert out.created_count == 0
    assert out.updated_count == 1
    assert len(db.source_keys) == n_keys
    assert len(db.draft_items) == 1
    assert db.draft_items[0].proposal["title"] == "Король Элессар"


def test_file_move_same_slug_updates_path(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)

    job = svc.create_job(owner, setting.id, WorldImportCreateRequest())
    svc.ingest_vault_files(
        owner,
        setting.id,
        job.id,
        WorldVaultParseRequest(
            files=[
                {
                    "path": "world/npcs/old/tandil.md",
                    "content": "---\ntitle: Тандил\n---\n# Тандил\n",
                }
            ]
        ),
    )
    assert len(db.source_keys) == 1
    assert db.source_keys[0].source_slug == "tandil"

    svc.ingest_vault_files(
        owner,
        setting.id,
        job.id,
        WorldVaultParseRequest(
            files=[
                {
                    "path": "world/npcs/tandil.md",
                    "content": "---\ntitle: Тандил\n---\n# Тандил\n",
                }
            ]
        ),
    )
    # Ярлык тот же — один ключ, путь обновлён (старый draft-item по старому path
    # остаётся отдельной строкой job, но WorldSourceKey не плодится).
    slugs = [sk.source_slug for sk in db.source_keys]
    assert slugs.count("tandil") == 1
    by_slug = next(sk for sk in db.source_keys if sk.source_slug == "tandil")
    assert by_slug.source_path == "world/npcs/tandil.md"


def test_ingest_who_fixture_links_and_no_wiki(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)

    job = svc.create_job(owner, setting.id, WorldImportCreateRequest())
    files = load_vault_dir(FIXTURE_ROOT)
    payload = WorldVaultParseRequest(
        files=[{"path": f.path, "content": f.content} for f in files]
    )
    out = svc.ingest_vault_files(owner, setting.id, job.id, payload)

    keys = {it.source_key for it in out.items}
    assert "world/locations/lunnyy-most.md" in keys
    assert "world/npcs/elessar-i.md" in keys
    assert "world/npcs/tandil.md" in keys

    # Алиасы Тандила зарегистрированы без дубля по norm
    tandil_norms = [
        a.alias_norm
        for a in db.aliases
        if any(
            sk.id == a.source_key_id and sk.source_slug == "tandil" for sk in db.source_keys
        )
    ]
    assert "тандил" in tandil_norms
    assert len(tandil_norms) == len(set(tandil_norms))

    edge_pairs = {(lnk.from_source_key, lnk.to_source_key) for lnk in out.links}
    assert ("world/npcs/elessar-i.md", "world/npcs/konstantin-iii.md") in edge_pairs
    assert ("world/factions/khvost-skorpiona.md", "world/npcs/tandil.md") in edge_pairs

    # Канон вики не трогали
    assert all(sk.page_id is None for sk in db.source_keys)
    assert out.links_count == len(out.links) > 0


def test_reingest_no_duplicate_keys_or_links(monkeypatch):
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
    n_keys = len({(sk.setting_id, sk.source_path) for sk in db.source_keys})
    n_alias_norms = len({(a.setting_id, a.alias_norm) for a in db.aliases})
    n_links = first.links_count

    second = svc.ingest_vault_files(owner, setting.id, job.id, payload)
    assert second.created_count == 0
    assert len({(sk.setting_id, sk.source_path) for sk in db.source_keys}) == n_keys
    assert len({(a.setting_id, a.alias_norm) for a in db.aliases}) == n_alias_norms
    assert second.links_count == n_links


def test_rules_edition_2024_still_rejected(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, _db = _svc(lobby, setting, monkeypatch)
    job = svc.create_job(owner, setting.id, WorldImportCreateRequest())
    with pytest.raises(AppError) as ei:
        svc.ingest_vault_files(
            owner,
            setting.id,
            job.id,
            WorldVaultParseRequest(
                rules_edition="2024",
                files=[{"path": "world/npcs/x.md", "content": "# X\n"}],
            ),
        )
    assert ei.value.code == "rules_edition_unsupported"


def test_alembic_single_head_contains_wapi03():
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "wapi03idslnk01" in ancestor_ids
    assert "wapi01impfnd01" in ancestor_ids
