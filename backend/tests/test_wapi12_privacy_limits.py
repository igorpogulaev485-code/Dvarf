"""W-API-12: приватность (чужой лобби/каталог/игрок), лимиты, отказ 2024 на входах."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest

from app.core.exceptions import AppError, NotFoundError
from app.mcp.rest_bridge import WorldImportRestBridge
from app.mcp.world_import import create_world_import_mcp
from app.models.catalog import CatalogEntry, CatalogKind
from app.models.setting_artifact import SettingArtifact
from app.models.setting_creature import SettingCreature
from app.models.world_api_token import WorldApiToken
from app.models.world_import import (
    WorldImportDraftItem,
    WorldImportDraftLink,
    WorldImportJob,
    WorldSourceKey,
)
from app.schemas.setting_creature import (
    SettingCreatureCreateRequest,
    SettingItemCreateRequest,
)
from app.schemas.world_import import (
    WorldImportFromGitRequest,
    WorldImportUpsertRequest,
    WorldImportValidateRequest,
    WorldVaultFileIn,
)
from app.services import lobby_roles as roles
from app.services.media import LobbyMediaService, LobbyMediaUsage
from app.services.setting_creatures import SettingCreatureService
from app.services.world_api_tokens import _hash_secret
from app.services.world_import import WorldImportService
from app.services.world_import_auth import WorldImportActor
from app.services.world_import_git import validate_git_url
from app.services.world_vault_parse import MAX_FILE_COUNT, MAX_SINGLE_FILE_BYTES, parse_vault_files
from app.services.world_vault_parse import VaultFile

FIXTURE = (
    Path(__file__).resolve().parent
    / "fixtures/who_vault/rules/encounters/gorvax_statblock_structured.json"
)
LOC = (
    Path(__file__).resolve().parent
    / "fixtures/who_vault/world/locations/lunnyy-most.md"
)


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


def _setting(lobby_id=None, name="Мир"):
    return SimpleNamespace(
        id=uuid4(),
        lobby_id=lobby_id or uuid4(),
        name=name,
        world_notes="",
        is_extra=False,
        deleted_at=None,
        ai_can_confirm=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


class CreatureFakeLobbies:
    def __init__(self, *settings: SimpleNamespace):
        self.settings = {s.id: s for s in settings}
        self.artifacts: list[SettingArtifact] = []

    def get_setting(self, setting_id):
        return self.settings.get(setting_id)

    def list_setting_artifacts(self, setting_id):
        return [a for a in self.artifacts if a.setting_id == setting_id]

    def create_setting_artifact(self, **kwargs):
        row = SettingArtifact(**kwargs)
        if getattr(row, "id", None) is None:
            row.id = uuid4()
        row.created_at = datetime.now(timezone.utc)
        row.updated_at = datetime.now(timezone.utc)
        row.sort_order = getattr(row, "sort_order", None) or 0
        row.abilities = getattr(row, "abilities", None) or []
        self.artifacts.append(row)
        return row


class CreatureFakeDB:
    def __init__(self):
        self.creatures: list[SettingCreature] = []
        self.artifacts: list[SettingArtifact] = []
        self.added: list[object] = []
        self.catalog: list[CatalogEntry] = []

    def add(self, obj):
        self.added.append(obj)
        if isinstance(obj, SettingCreature):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            now = datetime.now(timezone.utc)
            obj.created_at = getattr(obj, "created_at", None) or now
            obj.updated_at = getattr(obj, "updated_at", None) or now
            self.creatures.append(obj)
        elif isinstance(obj, SettingArtifact):
            self.artifacts.append(obj)
        elif isinstance(obj, CatalogEntry):
            self.catalog.append(obj)

    def commit(self):
        return None

    def flush(self):
        return None

    def refresh(self, obj):
        return None

    def _setting_id_from(self, stmt):  # noqa: ANN001
        criteria = getattr(stmt, "_where_criteria", ()) or ()
        for crit in criteria:
            left = getattr(crit, "left", None)
            right = getattr(crit, "right", None)
            key = getattr(left, "key", None) or getattr(left, "name", None)
            if key == "setting_id":
                return getattr(right, "value", right)
        return None

    def scalar(self, stmt):  # noqa: ANN001
        entity = None
        try:
            entity = stmt.column_descriptions[0]["entity"]
        except Exception:
            entity = None
        setting_id = self._setting_id_from(stmt)
        if entity is SettingCreature:
            for c in self.creatures:
                if setting_id is not None and c.setting_id != setting_id:
                    continue
                return c
            return None
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
        setting_id = self._setting_id_from(stmt)
        if entity is SettingCreature:
            rows = [
                c
                for c in self.creatures
                if setting_id is None or c.setting_id == setting_id
            ]
            return _Result(rows)
        return _Result([])

    def get(self, model, pk):
        if model is SettingCreature:
            for c in self.creatures:
                if c.id == pk:
                    return c
        return None


class ImportFakeLobbies:
    def __init__(self, lobby, setting):
        self.lobby = lobby
        self.setting = setting

    def get(self, lobby_id):
        return self.lobby if self.lobby.id == lobby_id else None

    def get_setting(self, setting_id):
        return self.setting if self.setting.id == setting_id else None


class ImportFakeDB:
    def __init__(self):
        self.jobs: list[WorldImportJob] = []
        self.draft_items: list[WorldImportDraftItem] = []
        self.source_keys: list[WorldSourceKey] = []
        self.draft_links: list[WorldImportDraftLink] = []
        self._idempotency_hit = None

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

    def _where_value(self, stmt, key: str):  # noqa: ANN001
        criteria = getattr(stmt, "_where_criteria", ()) or ()
        for crit in criteria:
            left = getattr(crit, "left", None)
            right = getattr(crit, "right", None)
            k = getattr(left, "key", None) or getattr(left, "name", None)
            if k == key:
                return getattr(right, "value", right)
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
        job_id = self._where_value(stmt, "job_id")
        setting_id = self._where_value(stmt, "setting_id")
        if entity is WorldImportDraftItem:
            rows = list(self.draft_items)
            if job_id is not None:
                rows = [r for r in rows if r.job_id == job_id]
            return _Result(rows)
        if entity is WorldImportJob:
            rows = list(self.jobs)
            if setting_id is not None:
                rows = [r for r in rows if r.setting_id == setting_id]
            return _Result(rows)
        return _Result([])


def _import_svc(lobby, setting, monkeypatch):
    db = ImportFakeDB()
    svc = WorldImportService(db)
    fake = ImportFakeLobbies(lobby, setting)
    svc.lobbies = fake
    svc.access.lobbies = fake

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
    svc._upsert_aliases = lambda *a, **k: []  # type: ignore[method-assign]
    return svc, db


def test_creature_and_item_private_not_in_other_setting_or_catalog():
    a = _setting(name="А")
    b = _setting(name="Б")
    db = CreatureFakeDB()
    lobbies = CreatureFakeLobbies(a, b)
    svc = SettingCreatureService(db)
    svc.lobbies = lobbies
    g = json.loads(FIXTURE.read_text(encoding="utf-8"))

    creature = svc.create_creature(
        a.id,
        SettingCreatureCreateRequest(
            name=g["name"],
            import_key=g["import_key"],
            data=g["data"],
            source="master",
        ),
    )
    item = svc.create_item(
        a.id,
        SettingItemCreateRequest(
            name="Кинжал разведчика",
            item_kind="ordinary",
            description="Обычный кинжал мира",
            import_key="scout-dagger",
            rules_edition="2014",
        ),
    )
    assert creature.setting_id == a.id
    assert item.setting_id == a.id
    assert svc.list_creatures(b.id) == []
    assert svc.list_items(b.id) == []
    with pytest.raises(NotFoundError):
        svc.get_creature(b.id, creature.id)
    assert not any(isinstance(x, CatalogEntry) for x in db.added)
    assert db.catalog == []
    assert CatalogKind.bestiary.value == "bestiary"


def test_player_cannot_see_import_draft_job(monkeypatch):
    owner = _user("Мастер")
    player = _user("Игрок")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _import_svc(lobby, setting, monkeypatch)
    master = WorldImportActor(kind="user", user=owner)
    files = [WorldVaultFileIn(path="world/locations/x.md", content=LOC.read_text(encoding="utf-8"))]
    result = svc.upsert_package(
        master,
        setting.id,
        WorldImportUpsertRequest(files=files, rules_edition="2014"),
    )
    assert result.job.status == "ready_for_review"
    assert len(db.jobs) == 1

    player_actor = WorldImportActor(kind="user", user=player)
    with pytest.raises(AppError) as ei:
        svc.list_jobs_for_actor(player_actor, setting.id)
    assert ei.value.code == "lobby_wiki_required"
    with pytest.raises(AppError) as ei2:
        svc.get_job_for_actor(player_actor, setting.id, result.job.id)
    assert ei2.value.code == "lobby_wiki_required"


def test_foreign_token_cannot_read_other_setting(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    other = _setting(lobby.id, name="Чужой")
    svc, _db = _import_svc(lobby, setting, monkeypatch)
    token = WorldApiToken(
        token_hash=_hash_secret("wapi_foreign_setting_token_xxx"),
        token_prefix="wapi_for",
        lobby_id=lobby.id,
        setting_id=other.id,
        owner_id=owner.id,
        can_read=True,
        can_write=True,
    )
    actor = WorldImportActor(kind="ai_token", token=token)
    with pytest.raises(AppError) as ei:
        svc.get_import_settings(actor, setting.id)
    assert ei.value.code == "forbidden_setting"


def test_rules_edition_2024_rejected_on_validate_upsert_git(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _import_svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)
    files = [WorldVaultFileIn(path="world/locations/x.md", content="# X\n")]

    with pytest.raises(AppError) as e1:
        svc.validate_package(
            actor,
            setting.id,
            WorldImportValidateRequest(files=files, rules_edition="2024"),
        )
    assert e1.value.code == "rules_edition_unsupported"
    assert e1.value.status_code == 400

    with pytest.raises(AppError) as e2:
        svc.upsert_package(
            actor,
            setting.id,
            WorldImportUpsertRequest(files=files, rules_edition="2024"),
        )
    assert e2.value.code == "rules_edition_unsupported"

    called = {"n": 0}

    def boom(_url: str):
        called["n"] += 1
        raise AssertionError("сеть не должна вызываться")

    with pytest.raises(AppError) as e3:
        svc.ingest_from_git(
            actor,
            setting.id,
            WorldImportFromGitRequest(
                url="https://github.com/example/world",
                rules_edition="2024",
            ),
            fetch_files=boom,
        )
    assert e3.value.code == "rules_edition_unsupported"
    assert called["n"] == 0
    assert db.jobs == []


def test_rules_edition_2024_rejected_on_mcp():
    setting_id = str(uuid4())

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            400,
            json={
                "detail": "в этой версии импорта мира доступна только редакция 2014",
                "code": "rules_edition_unsupported",
                "data": {"hint": "Укажите rules_edition=2014 или опустите поле"},
            },
        )

    async def _run() -> dict:
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(handler), base_url="http://test"
        ) as client:
            bridge = WorldImportRestBridge(client=client, base_url="http://test")
            mcp = create_world_import_mcp(rest=bridge)
            result = await mcp.call_tool(
                "upsert_world_files",
                {
                    "setting_id": setting_id,
                    "files": [],
                    "rules_edition": "2024",
                    "authorization": "Bearer wapi_test_secret_never_commit",
                },
            )
            blocks = result[0] if isinstance(result, tuple) else result
            return json.loads(blocks[0].text)

    payload = asyncio.run(_run())
    assert payload["code"] == "rules_edition_unsupported"
    assert payload.get("status_code", 400) in {400, None} or "2014" in payload["message"]


def test_quota_exceeded_and_file_too_large_are_coded_not_500():
    too_many = [
        VaultFile(path=f"world/locations/x{i}.md", content="# x\n")
        for i in range(MAX_FILE_COUNT + 1)
    ]
    with pytest.raises(AppError) as e1:
        parse_vault_files(too_many)
    assert e1.value.code == "quota_exceeded"
    assert e1.value.status_code == 400

    huge = "a" * (MAX_SINGLE_FILE_BYTES + 1)
    with pytest.raises(AppError) as e2:
        parse_vault_files([VaultFile(path="world/locations/big.md", content=huge)])
    assert e2.value.code == "file_too_large"
    assert e2.value.status_code == 400


def test_bad_git_url_rejected_not_500(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _import_svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)

    with pytest.raises(AppError) as ei:
        svc.ingest_from_git(
            actor,
            setting.id,
            WorldImportFromGitRequest(url="http://127.0.0.1/repo"),
            fetch_files=lambda u: [],
        )
    assert ei.value.code == "git_url_rejected"
    assert ei.value.status_code == 400
    assert db.jobs == []

    with pytest.raises(AppError) as e2:
        validate_git_url("file:///tmp/world.git")
    assert e2.value.code == "git_url_rejected"


def test_docs_exist_and_have_no_who_proper_names():
    """Документация для мастера/ИИ — нейтральные примеры, без имён учебного мира."""
    root = Path(__file__).resolve().parents[2]
    main_doc = root / "docs" / "world-import.md"
    mcp_doc = root / "docs" / "world-import-mcp.md"
    assert main_doc.is_file()
    assert mcp_doc.is_file()
    text = main_doc.read_text(encoding="utf-8") + "\n" + mcp_doc.read_text(encoding="utf-8")
    forbidden = (
        "Кавил",
        "Элессар",
        "Тандил",
        "Лунный Мост",
        "Хвост Скорпиона",
        "Горвакс",
        "Вирра",
        "Who",
        "Эхо рассвета",
    )
    for name in forbidden:
        assert name not in text, f"в документации не должно быть «{name}»"
    assert "rules_edition" in text
    assert "2014" in text
    assert "частн" in text.lower() or "приват" in text.lower() or "только внутри" in text.lower()
    assert "MCP" in text
    assert "chatgpt" not in text.lower() or "не публик" in text.lower()
