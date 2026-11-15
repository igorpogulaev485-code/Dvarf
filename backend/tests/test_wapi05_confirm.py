"""W-API-05: confirm / cancel / тумблер ИИ / идемпотентность / должности / существа."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.models.journal import CampaignJournalEntry
from app.models.setting_artifact import SettingArtifact
from app.models.setting_creature import SettingCreature
from app.models.setting_page import SettingPage
from app.models.setting_page_link import SettingPageLink
from app.models.world_api_token import WorldApiToken
from app.models.world_import import (
    WorldImportConfirmation,
    WorldImportDraftItem,
    WorldImportDraftLink,
    WorldImportJob,
    WorldSourceKey,
)
from app.schemas.world_import import WorldImportUpsertRequest, WorldVaultFileIn
from app.services import lobby_roles as roles
from app.services.media import LobbyMediaService, LobbyMediaUsage
from app.services.world_api_tokens import _hash_secret
from app.services.world_import import WorldImportService
from app.services.world_import_auth import WorldImportActor
from app.services.world_import_confirm import WorldImportConfirmService
from app.services.world_import_links import OFFICE_LINK_LABEL

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
    def __init__(self, lobby, setting, db: "FakeDB"):
        self.lobby = lobby
        self.setting = setting
        self.db = db

    def get(self, lobby_id):
        return self.lobby if self.lobby.id == lobby_id else None

    def get_setting(self, setting_id):
        return self.setting if self.setting.id == setting_id else None

    def create_setting_page(self, **kwargs):
        page = SettingPage(**kwargs)
        if getattr(page, "id", None) is None:
            page.id = uuid4()
        page.revealed = False
        page.deleted_at = None
        page.fields = kwargs.get("fields") or {}
        now = datetime.now(timezone.utc)
        page.created_at = now
        page.updated_at = now
        self.db.pages.append(page)
        return page

    def list_setting_artifacts(self, setting_id):
        return [a for a in self.db.artifacts if a.setting_id == setting_id]

    def create_setting_artifact(self, **kwargs):
        row = SettingArtifact(**kwargs)
        if getattr(row, "id", None) is None:
            row.id = uuid4()
        now = datetime.now(timezone.utc)
        row.created_at = now
        row.updated_at = now
        self.db.artifacts.append(row)
        return row

    def add_journal_entry(self, entry):
        if getattr(entry, "id", None) is None:
            entry.id = uuid4()
        self.db.journal.append(entry)
        return entry

    def create_setting_page_link(self, **kwargs):
        link = SettingPageLink(**kwargs)
        if getattr(link, "id", None) is None:
            link.id = uuid4()
        link.created_at = datetime.now(timezone.utc)
        self.db.page_links.append(link)
        return link


class FakeDB:
    def __init__(self):
        self.jobs: list[WorldImportJob] = []
        self.draft_items: list[WorldImportDraftItem] = []
        self.source_keys: list[WorldSourceKey] = []
        self.draft_links: list[WorldImportDraftLink] = []
        self.pages: list[SettingPage] = []
        self.page_links: list[SettingPageLink] = []
        self.creatures: list[SettingCreature] = []
        self.artifacts: list[SettingArtifact] = []
        self.journal: list[CampaignJournalEntry] = []
        self.confirmations: list[WorldImportConfirmation] = []
        self._idempotency_hit = None
        self._scalar_overrides: list[object | None] = []

    def add(self, obj):
        now = datetime.now(timezone.utc)
        if isinstance(obj, WorldImportJob):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            obj.created_at = getattr(obj, "created_at", None) or now
            obj.updated_at = getattr(obj, "updated_at", None) or now
            obj.last_confirmed_at = getattr(obj, "last_confirmed_at", None)
            obj.confirm_snapshot = getattr(obj, "confirm_snapshot", None)
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
        elif isinstance(obj, SettingCreature):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            obj.created_at = getattr(obj, "created_at", None) or now
            obj.updated_at = getattr(obj, "updated_at", None) or now
            self.creatures.append(obj)
        elif isinstance(obj, SettingArtifact):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            self.artifacts.append(obj)
        elif isinstance(obj, WorldImportConfirmation):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            obj.confirmed_at = getattr(obj, "confirmed_at", None) or now
            self.confirmations.append(obj)
        elif isinstance(obj, SettingPage):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            self.pages.append(obj)
        elif isinstance(obj, SettingPageLink):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            self.page_links.append(obj)

    def commit(self):
        return None

    def flush(self):
        return None

    def refresh(self, obj):
        return None

    def execute(self, stmt):  # noqa: ANN001
        # delete draft links on re-parse
        self.draft_links = [lnk for lnk in self.draft_links if False]
        return None

    def get(self, model, pk):
        pools = {
            WorldImportJob: self.jobs,
            SettingPage: self.pages,
            SettingCreature: self.creatures,
            SettingArtifact: self.artifacts,
            WorldImportConfirmation: self.confirmations,
            SettingPageLink: self.page_links,
        }
        for row in pools.get(model, []):
            if row.id == pk:
                return row
        return None

    def scalar(self, stmt):  # noqa: ANN001
        if self._scalar_overrides:
            return self._scalar_overrides.pop(0)
        if self._idempotency_hit is not None:
            hit, self._idempotency_hit = self._idempotency_hit, None
            return hit
        for j in self.jobs:
            if j.status == "parsing":
                return j
        entity = None
        try:
            entity = stmt.column_descriptions[0]["entity"]
        except Exception:
            entity = None
        # Upsert по import_key: если существо/предмет уже есть — вернём первое
        # (в тестах W-API-05 на ключ обычно одна запись).
        if entity is SettingCreature:
            return self.creatures[-1] if self.creatures else None
        if entity is SettingArtifact:
            return self.artifacts[-1] if self.artifacts else None
        # Остальные lookup'и — пусто (создаём заново / нет конфликта).
        return None

    def scalars(self, stmt):  # noqa: ANN001
        class _Result:
            def __init__(self, rows):
                self._rows = rows

            def all(self):
                return list(self._rows)

            def first(self):
                return self._rows[0] if self._rows else None

        entity = None
        try:
            entity = stmt.column_descriptions[0]["entity"]
        except Exception:
            entity = None
        mapping = {
            WorldImportDraftItem: self.draft_items,
            WorldImportDraftLink: self.draft_links,
            WorldSourceKey: self.source_keys,
            SettingPage: self.pages,
            SettingPageLink: self.page_links,
            SettingCreature: self.creatures,
            SettingArtifact: self.artifacts,
            WorldImportJob: self.jobs,
            WorldImportConfirmation: self.confirmations,
        }
        if entity in mapping:
            return _Result(list(mapping[entity]))
        return _Result([])


def _svc(lobby, setting, monkeypatch):
    db = FakeDB()
    fake_lobbies = FakeLobbies(lobby, setting, db)
    import_svc = WorldImportService(db)
    import_svc.lobbies = fake_lobbies
    import_svc.access.lobbies = fake_lobbies
    confirm_svc = WorldImportConfirmService(db)
    confirm_svc.lobbies = fake_lobbies
    confirm_svc.access.lobbies = fake_lobbies

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

    import_svc._upsert_source_key = fake_upsert  # type: ignore[method-assign]
    import_svc._upsert_aliases = lambda *a, **k: []  # type: ignore[method-assign]

    return import_svc, confirm_svc, db, fake_lobbies


def _load(*rels: str) -> list[WorldVaultFileIn]:
    return [
        WorldVaultFileIn(path=r, content=(FIXTURE_ROOT / r).read_text(encoding="utf-8"))
        for r in rels
    ]


def _prepare_job(import_svc, db, actor, setting, files):
    result = import_svc.upsert_package(
        actor,
        setting.id,
        WorldImportUpsertRequest(files=files, rules_edition="2014"),
    )
    # После apply draft_links лежат в db; _replace_draft_links вызывал execute→очистку.
    # В реальном сервисе links добавляются после execute. Перечитаем из result.
    for link_out in result.links:
        # links уже в db.draft_links если execute не стёр после add —
        # FakeDB.execute чистит все links. Восстановим из result.
        pass
    # Восстановим links из ответа (execute очистил список)
    if not db.draft_links and result.links:
        for lo in result.links:
            db.draft_links.append(
                WorldImportDraftLink(
                    id=lo.id,
                    job_id=result.job.id,
                    from_source_key=lo.from_source_key,
                    to_source_key=lo.to_source_key,
                    to_alias=lo.to_alias,
                    kind=lo.kind,
                    label=lo.label,
                    confidence=lo.confidence,
                    status=lo.status,
                    office_title=lo.office_title,
                    office_holder_status=lo.office_holder_status,
                    succession_order=lo.succession_order,
                    tenure_from=lo.tenure_from,
                    tenure_to=lo.tenure_to,
                    hint=lo.hint,
                    created_at=lo.created_at,
                )
            )
    return result



def test_confirm_creates_pages_and_is_idempotent(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, db, _fake = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)

    _prepare_job(
        import_svc,
        db,
        actor,
        setting,
        _load("world/locations/lunnyy-most.md", "world/npcs/elessar-i.md"),
    )
    job = db.jobs[0]
    assert job.status == "ready_for_review"
    assert len(db.draft_items) >= 2

    out1 = confirm_svc.confirm(actor, setting.id, job.id, item_ids=None)
    assert out1.actor_kind == "user"
    assert len(out1.created_page_ids) >= 2
    assert all(p.revealed is False for p in db.pages)
    assert db.confirmations
    assert db.confirmations[0].actor_kind == "user"
    assert job.status == "confirmed"

    pages_before = len(db.pages)
    out2 = confirm_svc.confirm(actor, setting.id, job.id, item_ids=None)
    assert len(db.pages) == pages_before
    assert out2.updated_page_ids or out2.created_page_ids is not None


def test_confirm_ai_disabled_and_enabled(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, db, _fake = _svc(lobby, setting, monkeypatch)
    master = WorldImportActor(kind="user", user=owner)

    _prepare_job(
        import_svc,
        db,
        master,
        setting,
        _load("world/locations/lunnyy-most.md"),
    )
    job = db.jobs[0]
    token = WorldApiToken(
        id=uuid4(),
        token_hash=_hash_secret("wapi_ai_confirm_token"),
        token_prefix="wapi_ai_",
        lobby_id=lobby.id,
        setting_id=setting.id,
        owner_id=owner.id,
        can_read=True,
        can_write=True,
    )
    ai = WorldImportActor(kind="ai_token", token=token)

    with pytest.raises(AppError) as ei:
        confirm_svc.confirm(ai, setting.id, job.id)
    assert ei.value.code == "confirm_ai_disabled"

    setting.ai_can_confirm = True

    def fake_assert(*, token_hash, lobby_id, setting_id, need_write=False):
        return token

    monkeypatch.setattr(confirm_svc.access.tokens, "assert_token_scope", fake_assert)

    out = confirm_svc.confirm(ai, setting.id, job.id)
    assert out.actor_kind == "ai_token"
    assert db.confirmations[-1].actor_kind == "ai_token"
    assert db.confirmations[-1].actor_token_id == token.id


def test_confirm_selected_items_only(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, db, _fake = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)
    _prepare_job(
        import_svc,
        db,
        actor,
        setting,
        _load("world/locations/lunnyy-most.md", "world/npcs/elessar-i.md"),
    )
    job = db.jobs[0]
    loc = next(i for i in db.draft_items if "lunnyy-most" in i.source_key)
    out = confirm_svc.confirm(actor, setting.id, job.id, item_ids=[loc.id])
    assert loc.id in out.confirmed_item_ids
    assert len(out.confirmed_item_ids) == 1
    assert len(out.created_page_ids) == 1


def test_confirm_creature_by_import_key(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    _import_svc, confirm_svc, db, _fake = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)

    job = WorldImportJob(
        setting_id=setting.id,
        lobby_id=lobby.id,
        author_id=owner.id,
        status="ready_for_review",
        rules_edition="2014",
        source_kind="api",
    )
    db.add(job)
    item = WorldImportDraftItem(
        job_id=job.id,
        item_type="setting_creature",
        source_key="rules/encounters/gorvax",
        status="proposed",
        proposal={
            "title": "Горвакс",
            "import_key": "gorvax",
            "slug": "gorvax",
            "data": {
                "size": "medium",
                "type": "humanoid",
                "ac": 18,
                "hp_average": 75,
                "speed": {"walk": 30},
                "abilities": {
                    "str": 20,
                    "dex": 10,
                    "con": 16,
                    "int": 12,
                    "wis": 14,
                    "cha": 16,
                },
                "cr": "4",
            },
            "rules_edition": "2014",
        },
    )
    db.add(item)

    out = confirm_svc.confirm(actor, setting.id, job.id)
    assert out.created_creature_ids
    assert db.creatures[0].import_key == "gorvax"
    assert db.creatures[0].name == "Горвакс"

    out2 = confirm_svc.confirm(actor, setting.id, job.id)
    assert len(db.creatures) == 1
    assert out2.updated_creature_ids or out2.created_creature_ids


def test_confirm_office_link_not_alias(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, db, _fake = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)

    _prepare_job(
        import_svc,
        db,
        actor,
        setting,
        _load(
            "world/locations/lunnyy-most.md",
            "world/npcs/tandil.md",
            "world/npcs/maestro-kelebrim.md",
        ),
    )
    job = db.jobs[0]
    office_links = [lnk for lnk in db.draft_links if lnk.label == OFFICE_LINK_LABEL]
    assert office_links, "ожидали рёбра должности из фикстуры Who"

    out = confirm_svc.confirm(actor, setting.id, job.id)
    assert out.created_page_ids
    holders_with_office = [
        p for p in db.pages if isinstance(p.fields, dict) and p.fields.get("offices")
    ]
    assert holders_with_office, "ожидали offices в fields страниц НПС"
    meta = holders_with_office[0].fields["offices"][0]
    assert meta.get("office_title")


def test_cancel_does_not_touch_canon(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, db, _fake = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)
    _prepare_job(
        import_svc,
        db,
        actor,
        setting,
        _load("world/locations/lunnyy-most.md"),
    )
    job = db.jobs[0]
    out = confirm_svc.cancel(actor, setting.id, job.id)
    assert out.job.status == "cancelled"
    assert db.pages == []
