"""W-API-07: повторная заливка без дублей, conflict, missing_in_source, должности."""

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
from app.schemas.world_import import (
    WorldImportConflictResolutionIn,
    WorldImportUpsertRequest,
    WorldVaultFileIn,
)
from app.services import lobby_roles as roles
from app.services.media import LobbyMediaService, LobbyMediaUsage
from app.services.world_api_tokens import _hash_secret
from app.services.world_import import WorldImportService
from app.services.world_import_auth import WorldImportActor
from app.services.world_import_confirm import WorldImportConfirmService
from app.services.world_import_diff import build_diff
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
            obj.undone_at = getattr(obj, "undone_at", None)
            self.confirmations.append(obj)
        elif isinstance(obj, SettingPage):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            self.pages.append(obj)
        elif isinstance(obj, SettingPageLink):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            self.page_links.append(obj)
        elif isinstance(obj, CampaignJournalEntry):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            self.journal.append(obj)

    def commit(self):
        return None

    def flush(self):
        return None

    def refresh(self, obj):
        return None

    def delete(self, obj):
        for pool in (
            self.pages,
            self.page_links,
            self.creatures,
            self.artifacts,
            self.journal,
            self.confirmations,
            self.draft_items,
            self.draft_links,
            self.source_keys,
            self.jobs,
        ):
            if obj in pool:
                pool.remove(obj)
                return

    def execute(self, stmt):  # noqa: ANN001
        self.draft_links = []
        return None

    def get(self, model, pk):
        pools = {
            WorldImportJob: self.jobs,
            SettingPage: self.pages,
            SettingCreature: self.creatures,
            SettingArtifact: self.artifacts,
            WorldImportConfirmation: self.confirmations,
            SettingPageLink: self.page_links,
            CampaignJournalEntry: self.journal,
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
        if entity is SettingCreature:
            return self.creatures[-1] if self.creatures else None
        if entity is SettingArtifact:
            return self.artifacts[-1] if self.artifacts else None
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
            SettingPage: [p for p in self.pages if getattr(p, "deleted_at", None) is None],
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


def test_two_confirms_same_zip_no_duplicate_pages(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, db, _ = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)
    files = _load("world/locations/lunnyy-most.md", "world/npcs/elessar-i.md")

    _prepare_job(import_svc, db, actor, setting, files)
    job = db.jobs[0]
    out1 = confirm_svc.confirm(actor, setting.id, job.id)
    assert len(out1.created_page_ids) >= 2
    pages_after_first = len([p for p in db.pages if p.deleted_at is None])

    # Повторная заливка того же zip.
    _prepare_job(import_svc, db, actor, setting, files)
    job = db.jobs[0]
    # Восстановить source_key.page_id после re-parse (FakeDB upsert).
    for sk in db.source_keys:
        for p in db.pages:
            if p.deleted_at is None and sk.page_id is None:
                # привязка уже была на confirm; не трогаем если уже есть
                pass
    out2 = confirm_svc.confirm(actor, setting.id, job.id)
    pages_after_second = len([p for p in db.pages if p.deleted_at is None])
    assert pages_after_second == pages_after_first
    titles = [p.title for p in db.pages if p.deleted_at is None]
    assert titles.count("Лунный Мост") == 1


def test_conflict_keep_ours_preserves_master_edit(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, db, _ = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)
    path = "world/locations/lunnyy-most.md"
    original = (FIXTURE_ROOT / path).read_text(encoding="utf-8")

    _prepare_job(
        import_svc, db, actor, setting, [WorldVaultFileIn(path=path, content=original)]
    )
    job = db.jobs[0]
    confirm_svc.confirm(actor, setting.id, job.id)

    page = next(p for p in db.pages if p.title == "Лунный Мост")
    page.body = "Правка мастера в КриD20 — не затирать"
    page.title = "Лунный Мост"

    changed = original.replace(
        "Священный град, духовный центр",
        "ИЗМЕНЁННЫЙ ИСТОЧНИК: священный град",
    )
    assert changed != original
    _prepare_job(
        import_svc, db, actor, setting, [WorldVaultFileIn(path=path, content=changed)]
    )
    job = db.jobs[0]
    # source_key → page
    for sk in db.source_keys:
        if sk.source_path == path:
            sk.page_id = page.id

    diff = build_diff(db, job)
    loc = next(e for e in diff.entries if e.source_key == path)
    assert loc.status == "conflict"

    draft_id = loc.draft_item_id
    assert draft_id is not None

    with pytest.raises(AppError) as ei:
        confirm_svc.confirm(actor, setting.id, job.id)
    assert ei.value.code == "conflict_needs_review"

    out = confirm_svc.confirm(
        actor,
        setting.id,
        job.id,
        conflict_resolutions=[
            WorldImportConflictResolutionIn(draft_item_id=draft_id, resolution="keep_ours")
        ],
    )
    assert out.confirmation_id
    page2 = next(p for p in db.pages if p.id == page.id)
    assert page2.body == "Правка мастера в КриD20 — не затирать"


def test_missing_in_source_does_not_delete(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, db, _ = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)

    files = _load("world/locations/lunnyy-most.md", "world/npcs/elessar-i.md")
    _prepare_job(import_svc, db, actor, setting, files)
    job = db.jobs[0]
    confirm_svc.confirm(actor, setting.id, job.id)
    page_npc = next(p for p in db.pages if "Elessar" in p.title or "Элессар" in p.title or p.page_kind == "npc")
    # второй zip без npc
    only_loc = _load("world/locations/lunnyy-most.md")
    _prepare_job(import_svc, db, actor, setting, only_loc)
    job = db.jobs[0]
    for sk in db.source_keys:
        if sk.page_id is None:
            for p in db.pages:
                if p.deleted_at is None and p.page_kind == "location" and "lunnyy" in (sk.source_path or ""):
                    sk.page_id = p.id
                if p.id == page_npc.id and "npc" in (sk.source_path or ""):
                    sk.page_id = p.id

    # Явно восстановить привязку npc source key
    for sk in db.source_keys:
        if "elessar" in (sk.source_path or ""):
            sk.page_id = page_npc.id

    diff = build_diff(db, job)
    missing = [e for e in diff.entries if e.status == "missing_in_source"]
    assert missing, "ожидали missing_in_source для НПС"
    assert all(e.page_id is not None for e in missing if e.item_type == "npc" or e.page_id)
    assert page_npc.deleted_at is None
    assert any(p.id == page_npc.id and p.deleted_at is None for p in db.pages)


def test_token_without_toggle_still_cannot_confirm(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, db, _ = _svc(lobby, setting, monkeypatch)
    master = WorldImportActor(kind="user", user=owner)
    _prepare_job(import_svc, db, master, setting, _load("world/locations/lunnyy-most.md"))
    job = db.jobs[0]
    token = WorldApiToken(
        id=uuid4(),
        token_hash=_hash_secret("wapi07_token"),
        token_prefix="wapi07_",
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


def test_office_holder_change_preserves_history(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, db, _ = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)
    path = "world/locations/lunnyy-most.md"
    original = (FIXTURE_ROOT / path).read_text(encoding="utf-8")
    _prepare_job(
        import_svc, db, actor, setting, [WorldVaultFileIn(path=path, content=original)]
    )
    job = db.jobs[0]
    confirm_svc.confirm(actor, setting.id, job.id)

    holders_before = [
        p
        for p in db.pages
        if isinstance(p.fields, dict) and p.fields.get("offices")
    ]
    assert holders_before
    offices_flat = []
    for p in holders_before:
        offices_flat.extend(p.fields["offices"])
    assert any(o.get("office_holder_status") == "former" for o in offices_flat)
    assert any(o.get("office_holder_status") == "current" for o in offices_flat)
    orders_before = sorted(
        o.get("succession_order")
        for o in offices_flat
        if o.get("succession_order") is not None
    )

    # Новый мэр в источнике (order 3), прежние остаются в YAML как former.
    new_yaml = original.replace(
        "      - name: Тандил\n        status: current\n        order: 2\n"
        "        tenure_from: после гибели Маэстро (глашатай)\n",
        "      - name: Тандил\n        status: former\n        order: 2\n"
        "        tenure_from: после гибели Маэстро (глашатай)\n"
        "        tenure_to: ушёл в отставку\n"
        "      - name: Новый Мэр\n        status: current\n        order: 3\n"
        "        tenure_from: сейчас\n",
    )
    _prepare_job(
        import_svc, db, actor, setting, [WorldVaultFileIn(path=path, content=new_yaml)]
    )
    job = db.jobs[0]
    for sk in db.source_keys:
        if sk.source_path == path:
            loc = next(p for p in db.pages if p.title == "Лунный Мост" and p.deleted_at is None)
            sk.page_id = loc.id
    confirm_svc.confirm(actor, setting.id, job.id)

    offices_after = []
    for p in db.pages:
        if isinstance(p.fields, dict) and p.fields.get("offices"):
            offices_after.extend(p.fields["offices"])
    orders_after = sorted(
        o.get("succession_order")
        for o in offices_after
        if o.get("succession_order") is not None
    )
    # История не затёрта: старые порядки на месте, появился 3.
    for o in orders_before:
        assert o in orders_after
    assert 3 in orders_after
    assert any(
        o.get("office_holder_status") == "former" and o.get("succession_order") == 2
        for o in offices_after
    )
    assert any(
        o.get("office_holder_status") == "current" and o.get("succession_order") == 3
        for o in offices_after
    )
    assert any(lnk.label == OFFICE_LINK_LABEL for lnk in db.draft_links)


def test_rejected_ai_suggestion_not_reset_on_reimport(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, db, _ = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)
    path = "world/lore/artefacts-kardian.md"
    files = _load(path)
    _prepare_job(import_svc, db, actor, setting, files)
    ai_items = [it for it in db.draft_items if it.item_type == "ai_suggestion" or (it.proposal or {}).get("ai_extracted")]
    if not ai_items:
        pytest.skip("нет ai_suggestion в фикстуре кардиана")
    target = ai_items[0]
    target.status = "rejected"
    key = target.source_key

    _prepare_job(import_svc, db, actor, setting, files)
    again = next(it for it in db.draft_items if it.source_key == key)
    assert again.status == "rejected"
    diff = build_diff(db, db.jobs[0])
    entry = next(e for e in diff.entries if e.source_key == key)
    assert entry.status in {"ai_suggestion", "unchanged"}
    assert "отклонил" in entry.message.lower() or "отклон" in entry.message.lower()
