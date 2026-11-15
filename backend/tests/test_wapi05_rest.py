"""W-API-05: validate / upsert / diff / settings / rules_edition / чужой токен."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.models.setting_page import SettingPage
from app.models.world_api_token import WorldApiToken
from app.models.world_import import (
    WorldImportDraftItem,
    WorldImportDraftLink,
    WorldImportJob,
    WorldSourceAlias,
    WorldSourceKey,
)
from app.schemas.world_import import (
    WorldImportSettingsPatch,
    WorldImportUpsertRequest,
    WorldImportValidateRequest,
    WorldVaultFileIn,
)
from app.services import lobby_roles as roles
from app.services.media import LobbyMediaService, LobbyMediaUsage
from app.services.world_api_tokens import _hash_secret
from app.services.world_import import WorldImportService
from app.services.world_import_auth import WorldImportActor
from app.services.world_import_diff import build_diff

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
        self.pages: list[SettingPage] = []

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
        self.pages: list[SettingPage] = []
        self._idempotency_hit = None
        self._scalar_queue: list[object | None] = []

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
        if model is SettingPage:
            for p in self.pages:
                if p.id == pk:
                    return p
        return None

    def scalar(self, stmt):  # noqa: ANN001
        if self._scalar_queue:
            return self._scalar_queue.pop(0)
        if self._idempotency_hit is not None:
            return self._idempotency_hit
        # active parse check
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
        if entity is WorldSourceKey:
            return _Result(list(self.source_keys))
        if entity is WorldSourceAlias:
            return _Result(list(self.aliases))
        if entity is WorldImportJob:
            return _Result(list(self.jobs))
        if entity is SettingPage:
            return _Result(list(self.pages))
        if entity is WorldImportDraftItem:
            return _Result(list(self.draft_items))
        # creatures / artifacts и пр. в этом FakeDB не храним
        if entity is not None and entity is not WorldImportDraftItem:
            return _Result([])
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
    monkeypatch.setattr(
        LobbyMediaService,
        "usage",
        lambda self, lobby_id: LobbyMediaUsage(used_bytes=0, free_bytes=200 * 1024 * 1024),
    )

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

    def smart_scalar(stmt):  # noqa: ANN001
        key_hit = getattr(db, "_idempotency_hit", None)
        if key_hit is not None:
            return key_hit
        for j in db.jobs:
            if j.status == "parsing":
                return j
        return None

    db.scalar = smart_scalar  # type: ignore[method-assign]
    return svc, db, fake_lobbies


def _load_fixture_files(*rel_paths: str) -> list[WorldVaultFileIn]:
    files: list[WorldVaultFileIn] = []
    for rel in rel_paths:
        path = FIXTURE_ROOT / rel
        files.append(WorldVaultFileIn(path=rel, content=path.read_text(encoding="utf-8")))
    return files


def test_validate_does_not_touch_wiki(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db, fake_lobbies = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)

    out = svc.validate_package(
        actor,
        setting.id,
        WorldImportValidateRequest(
            files=_load_fixture_files(
                "world/locations/lunnyy-most.md",
                "world/npcs/elessar-i.md",
            ),
            rules_edition="2014",
        ),
    )
    assert out.ok is True
    assert out.type_counts.get("location", 0) >= 1
    assert out.type_counts.get("npc", 0) >= 1
    assert fake_lobbies.pages == []
    assert db.jobs == []
    assert db.draft_items == []


def test_validate_rejects_2024(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, _db, _fake = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)
    with pytest.raises(AppError) as ei:
        svc.validate_package(
            actor,
            setting.id,
            WorldImportValidateRequest(
                files=_load_fixture_files("world/locations/lunnyy-most.md"),
                rules_edition="2024",
            ),
        )
    assert ei.value.code == "rules_edition_unsupported"


def test_upsert_and_diff_who_fixture(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db, _fake = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)

    files = _load_fixture_files(
        "world/locations/lunnyy-most.md",
        "world/npcs/elessar-i.md",
    )
    result = svc.upsert_package(
        actor,
        setting.id,
        WorldImportUpsertRequest(files=files, rules_edition="2014"),
        idempotency_key="who-upsert-1",
    )
    assert result.job.status == "ready_for_review"
    keys = {it.source_key for it in result.items}
    assert "world/locations/lunnyy-most.md" in keys
    assert "world/npcs/elessar-i.md" in keys

    # Идемпотентный повтор
    db._idempotency_hit = db.jobs[0]
    again = svc.upsert_package(
        actor,
        setting.id,
        WorldImportUpsertRequest(files=[], rules_edition="2014"),
        idempotency_key="who-upsert-1",
    )
    assert again.job.id == result.job.id

    diff = build_diff(db, db.jobs[0])
    diff_keys = {e.source_key for e in diff.entries}
    assert "world/locations/lunnyy-most.md" in diff_keys
    assert "world/npcs/elessar-i.md" in diff_keys
    assert diff.counts.get("new", 0) >= 2


def test_upsert_rejects_2024(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, _db, _fake = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)
    with pytest.raises(AppError) as ei:
        svc.upsert_package(
            actor,
            setting.id,
            WorldImportUpsertRequest(
                files=_load_fixture_files("world/locations/lunnyy-most.md"),
                rules_edition="2024",
            ),
        )
    assert ei.value.code == "rules_edition_unsupported"


def test_patch_ai_can_confirm_token_forbidden(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, _db, _fake = _svc(lobby, setting, monkeypatch)
    token = WorldApiToken(
        token_hash=_hash_secret("wapi_test_secret_token_value_xxx"),
        token_prefix="wapi_tes",
        lobby_id=lobby.id,
        setting_id=setting.id,
        owner_id=owner.id,
        can_read=True,
        can_write=True,
    )
    actor = WorldImportActor(kind="ai_token", token=token)
    with pytest.raises(AppError) as ei:
        svc.patch_import_settings(
            actor, setting.id, WorldImportSettingsPatch(ai_can_confirm=True)
        )
    assert ei.value.code == "master_session_required"
    assert setting.ai_can_confirm is False


def test_patch_ai_can_confirm_master_ok(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, _db, _fake = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)
    out = svc.patch_import_settings(
        actor, setting.id, WorldImportSettingsPatch(ai_can_confirm=True)
    )
    assert out.ai_can_confirm is True
    assert setting.ai_can_confirm is True


def test_foreign_token_forbidden_setting(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    other_setting = _setting(lobby.id, name="Чужой")
    svc, db, _fake = _svc(lobby, setting, monkeypatch)
    token = WorldApiToken(
        token_hash=_hash_secret("wapi_other"),
        token_prefix="wapi_oth",
        lobby_id=lobby.id,
        setting_id=other_setting.id,
        owner_id=owner.id,
        can_read=True,
        can_write=True,
    )
    actor = WorldImportActor(kind="ai_token", token=token)

    # assert_token_scope is called after lobby/setting mismatch check in authorize
    with pytest.raises(AppError) as ei:
        svc.get_import_settings(actor, setting.id)
    assert ei.value.code == "forbidden_setting"
