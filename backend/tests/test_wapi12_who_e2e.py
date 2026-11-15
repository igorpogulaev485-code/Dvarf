"""W-API-12: сквозной прогон Who (zip → validate → upsert → diff → confirm →
повтор без дублей → missing → undo) и git на моке. Имена учебного мира — только
в фикстурах/тестах, не в продуктовых текстах."""

from __future__ import annotations

import base64
import io
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.models.character import Character
from app.models.journal import CampaignJournalEntry
from app.models.setting_artifact import SettingArtifact
from app.models.setting_creature import SettingCreature
from app.models.setting_page import SettingPage
from app.models.setting_page_link import SettingPageLink
from app.models.world_import import (
    WorldImportConfirmation,
    WorldImportDraftItem,
    WorldImportDraftLink,
    WorldImportJob,
    WorldSourceKey,
)
from app.models.world_import_attachment import WorldImportAttachment
from app.schemas.world_import import (
    WorldImportFromGitRequest,
    WorldImportUpsertRequest,
    WorldImportValidateRequest,
    WorldVaultFileIn,
)
from app.services import lobby_roles as roles
from app.services.media import LobbyMediaService, LobbyMediaUsage
from app.services.world_import import WorldImportService
from app.services.world_import_auth import WorldImportActor
from app.services.world_import_confirm import WorldImportConfirmService
from app.services.world_import_diff import build_diff
from app.services.world_import_undo import WorldImportUndoService
from app.services.world_vault_parse import extract_zip_to_files, load_vault_dir

FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "who_vault"

WHO_PACK = (
    "world/locations/lunnyy-most.md",
    "world/npcs/elessar-i.md",
    "world/factions/khvost-skorpiona.md",
    "world/lore/artefacts-kardian.md",
    "campaign/sessions/01-lunnyy-most-start.md",
    "world/player-books/chapters/Ledyanye-rasteniya-12-08.md",
    "campaign/party/characters/kavil.md",
    "assets/character-sheets/kavil.txt",
    "assets/character-sheets/kavil.pdf",
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
        self.characters: list[Character] = []
        self.attachments: list[WorldImportAttachment] = []
        self.journal: list[CampaignJournalEntry] = []
        self.confirmations: list[WorldImportConfirmation] = []
        self._idempotency_hit = None
        self._scalar_overrides: list[object | None] = []
        self.catalog_entries: list = []

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
        elif isinstance(obj, Character):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            obj.created_at = getattr(obj, "created_at", None) or now
            obj.updated_at = getattr(obj, "updated_at", None) or now
            obj.deleted_at = getattr(obj, "deleted_at", None)
            obj.sheet_version = getattr(obj, "sheet_version", None) or 1
            self.characters.append(obj)
        elif isinstance(obj, WorldImportAttachment):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            obj.created_at = getattr(obj, "created_at", None) or now
            self.attachments.append(obj)
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
        elif isinstance(obj, SettingCreature):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            self.creatures.append(obj)
        elif isinstance(obj, SettingArtifact):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            self.artifacts.append(obj)
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
            self.characters,
            self.attachments,
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
            Character: self.characters,
            WorldImportAttachment: self.attachments,
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
        if entity is Character:
            for ch in reversed(self.characters):
                if ch.deleted_at is None:
                    return ch
            return None
        if entity is SettingCreature:
            return self.creatures[-1] if self.creatures else None
        if entity is SettingArtifact:
            return self.artifacts[-1] if self.artifacts else None
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

            def first(self):
                return self._rows[0] if self._rows else None

        entity = None
        try:
            entity = stmt.column_descriptions[0]["entity"]
        except Exception:
            entity = None
        job_id = self._where_value(stmt, "job_id")
        setting_id = self._where_value(stmt, "setting_id")
        mapping = {
            WorldImportDraftItem: self.draft_items,
            WorldImportDraftLink: self.draft_links,
            WorldSourceKey: self.source_keys,
            SettingPage: [p for p in self.pages if getattr(p, "deleted_at", None) is None],
            SettingPageLink: self.page_links,
            SettingCreature: self.creatures,
            SettingArtifact: self.artifacts,
            Character: self.characters,
            WorldImportAttachment: self.attachments,
            WorldImportJob: self.jobs,
            WorldImportConfirmation: self.confirmations,
        }
        if entity in mapping:
            rows = list(mapping[entity])
            if entity in (
                WorldImportDraftItem,
                WorldImportDraftLink,
                WorldImportConfirmation,
            ) and job_id is not None:
                rows = [r for r in rows if r.job_id == job_id]
            if entity is WorldImportConfirmation:
                # undone_at IS NULL — приближение: только неотменённые
                rows = [r for r in rows if getattr(r, "undone_at", None) is None]
                rows = sorted(
                    rows,
                    key=lambda r: getattr(r, "confirmed_at", None) or datetime.min.replace(tzinfo=timezone.utc),
                    reverse=True,
                )
            if entity is WorldSourceKey and setting_id is not None:
                rows = [r for r in rows if r.setting_id == setting_id]
            if entity is WorldImportJob and setting_id is not None:
                rows = [r for r in rows if r.setting_id == setting_id]
            if entity is SettingCreature and setting_id is not None:
                rows = [r for r in rows if r.setting_id == setting_id]
            return _Result(rows)
        return _Result([])


def _svc(lobby, setting, monkeypatch, tmp_path=None):
    db = FakeDB()
    fake_lobbies = FakeLobbies(lobby, setting, db)
    import_svc = WorldImportService(db)
    import_svc.lobbies = fake_lobbies
    import_svc.access.lobbies = fake_lobbies
    confirm_svc = WorldImportConfirmService(db)
    confirm_svc.lobbies = fake_lobbies
    confirm_svc.access.lobbies = fake_lobbies
    undo_svc = WorldImportUndoService(db)
    undo_svc.lobbies = fake_lobbies
    undo_svc.access.lobbies = fake_lobbies

    def _require_wiki(_db, _lobby, user):
        if user.id != lobby.owner_id:
            raise AppError("Нет прав", code="lobby_wiki_required", status_code=403)

    monkeypatch.setattr(roles, "require_can_edit_wiki", _require_wiki)
    monkeypatch.setattr(
        LobbyMediaService,
        "usage",
        lambda self, lobby_id: LobbyMediaUsage(used_bytes=0, free_bytes=200 * 1024 * 1024),
    )
    if tmp_path is not None:
        monkeypatch.setattr(
            "app.core.config.settings.uploads_dir",
            str(tmp_path / "uploads"),
        )
        monkeypatch.setattr(
            "app.services.world_import_attachments.settings.uploads_dir",
            str(tmp_path / "uploads"),
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
    return import_svc, confirm_svc, undo_svc, db


def _who_zip_bytes(paths: tuple[str, ...] = WHO_PACK) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for rel in paths:
            zf.writestr(rel, (FIXTURE_ROOT / rel).read_bytes())
    return buf.getvalue()


def _files_from_zip(data: bytes) -> list[WorldVaultFileIn]:
    vault = extract_zip_to_files(data)
    out: list[WorldVaultFileIn] = []
    for vf in vault:
        if vf.binary is not None:
            out.append(
                WorldVaultFileIn(
                    path=vf.path,
                    content="",
                    content_base64=base64.b64encode(vf.binary).decode("ascii"),
                )
            )
        else:
            out.append(WorldVaultFileIn(path=vf.path, content=vf.content or ""))
    return out


def _rebind_source_keys(db: FakeDB) -> None:
    """После повторного upsert FakeDB сохраняет source_key; привяжем page/character."""
    for sk in db.source_keys:
        if sk.page_id is None:
            for p in db.pages:
                if p.deleted_at is not None:
                    continue
                # грубая привязка по path ↔ kind
                if "locations/" in (sk.source_path or "") and p.page_kind == "location":
                    sk.page_id = p.id
                elif "npcs/" in (sk.source_path or "") and p.page_kind == "npc":
                    sk.page_id = p.id
                elif "factions/" in (sk.source_path or "") and p.page_kind == "faction":
                    sk.page_id = p.id
                elif "lore/" in (sk.source_path or "") and p.page_kind in {"lore", "note", "artifact"}:
                    sk.page_id = p.id
                elif "sessions/" in (sk.source_path or "") and p.page_kind in {"session", "note"}:
                    sk.page_id = p.id
                elif "player-books" in (sk.source_path or "") and p.page_kind in {"book", "note"}:
                    sk.page_id = p.id
        if sk.character_id is None and "characters/" in (sk.source_path or ""):
            for ch in db.characters:
                if ch.deleted_at is None and ch.import_key:
                    sk.character_id = ch.id
                    break


def test_who_zip_e2e_validate_upsert_diff_confirm_reupsert_missing_undo(monkeypatch, tmp_path):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, undo_svc, db = _svc(lobby, setting, monkeypatch, tmp_path)
    actor = WorldImportActor(kind="user", user=owner)

    zip_bytes = _who_zip_bytes()
    files = _files_from_zip(zip_bytes)
    assert any(f.path.endswith("lunnyy-most.md") for f in files)
    assert any(f.path.endswith("kavil.md") for f in files)

    # 1) validate — без записи в канон
    validated = import_svc.validate_package(
        actor,
        setting.id,
        WorldImportValidateRequest(files=files, rules_edition="2014"),
    )
    assert validated.ok is True
    assert validated.type_counts.get("location", 0) >= 1
    assert validated.type_counts.get("npc", 0) >= 1
    assert validated.type_counts.get("faction", 0) >= 1
    assert db.jobs == []
    assert db.pages == []

    # 2) upsert → черновик
    first = import_svc.upsert_package(
        actor,
        setting.id,
        WorldImportUpsertRequest(files=files, rules_edition="2014", source_kind="zip"),
        idempotency_key="wapi12-who-1",
    )
    assert first.job.status == "ready_for_review"
    assert first.job.source_kind == "zip"
    types = {it.item_type for it in first.items}
    assert "location" in types
    assert "npc" in types
    assert "faction" in types
    assert "lore" in types or "note" in types
    assert "session" in types or "note" in types
    assert "book" in types or any("player-books" in (it.source_key or "") for it in first.items)
    assert "party_character" in types

    # 3) diff — есть локации, НПС, фракции, лор, сессия, книга, Кавил
    diff = build_diff(db, first.job)
    keys = {e.source_key for e in diff.entries}
    assert "world/locations/lunnyy-most.md" in keys
    assert "world/npcs/elessar-i.md" in keys
    assert "world/factions/khvost-skorpiona.md" in keys
    assert "world/lore/artefacts-kardian.md" in keys
    assert "campaign/sessions/01-lunnyy-most-start.md" in keys
    assert any("player-books" in k for k in keys)
    assert "campaign/party/characters/kavil.md" in keys
    assert diff.counts.get("new", 0) >= 5

    # 4) confirm выбранного (локация + персонаж)
    loc_item = next(i for i in db.draft_items if i.source_key == "world/locations/lunnyy-most.md")
    char_item = next(i for i in db.draft_items if i.item_type == "party_character")
    confirmed = confirm_svc.confirm(
        actor, setting.id, first.job.id, item_ids=[loc_item.id, char_item.id]
    )
    assert loc_item.id in confirmed.confirmed_item_ids
    assert char_item.id in confirmed.confirmed_item_ids
    assert confirmed.created_page_ids
    assert confirmed.created_character_ids
    assert len(db.characters) == 1
    assert db.characters[0].is_draft is True
    pages_after = len([p for p in db.pages if p.deleted_at is None])

    # 5) повторный upsert того же zip — без дублей страниц/персонажей
    again = import_svc.upsert_package(
        actor,
        setting.id,
        WorldImportUpsertRequest(files=files, rules_edition="2014", source_kind="zip"),
        idempotency_key="wapi12-who-2",
    )
    _rebind_source_keys(db)
    again_loc = next(
        i
        for i in db.draft_items
        if i.job_id == again.job.id and i.source_key == loc_item.source_key
    )
    again_char = next(
        i for i in db.draft_items if i.job_id == again.job.id and i.item_type == "party_character"
    )
    confirm_svc.confirm(
        actor, setting.id, again.job.id, item_ids=[again_loc.id, again_char.id]
    )
    assert len([p for p in db.pages if p.deleted_at is None]) == pages_after
    assert len([c for c in db.characters if c.deleted_at is None]) == 1

    # 6) missing file → помечается, не удаляется
    npc_job = import_svc.upsert_package(
        actor,
        setting.id,
        WorldImportUpsertRequest(files=files, rules_edition="2014"),
        idempotency_key="wapi12-who-3",
    )
    npc_draft = next(
        i
        for i in db.draft_items
        if i.job_id == npc_job.job.id and i.source_key == "world/npcs/elessar-i.md"
    )
    confirm_svc.confirm(actor, setting.id, npc_job.job.id, item_ids=[npc_draft.id])
    npc_page = next(p for p in db.pages if p.page_kind == "npc" and p.deleted_at is None)
    for sk in db.source_keys:
        if "elessar" in (sk.source_path or ""):
            sk.page_id = npc_page.id

    reduced_paths = tuple(
        p for p in WHO_PACK if "elessar" not in p and not p.startswith("world/npcs/")
    )
    reduced_files = _files_from_zip(_who_zip_bytes(reduced_paths))
    missing_job = import_svc.upsert_package(
        actor,
        setting.id,
        WorldImportUpsertRequest(files=reduced_files, rules_edition="2014"),
        idempotency_key="wapi12-who-4",
    )
    _rebind_source_keys(db)
    for sk in db.source_keys:
        if "elessar" in (sk.source_path or ""):
            sk.page_id = npc_page.id
    missing_diff = build_diff(db, missing_job.job)
    missing = [e for e in missing_diff.entries if e.status == "missing_in_source"]
    assert missing, "ожидали missing_in_source для отсутствующего НПС"
    assert npc_page.deleted_at is None

    # 7) undo confirm НПС
    conf = next(c for c in reversed(db.confirmations) if c.job_id == npc_job.job.id)
    undo = undo_svc.undo(actor, setting.id, npc_job.job.id)
    assert conf.undone_at is not None
    assert undo.confirmation_id == conf.id
    assert undo.journal_entry_id is not None
    assert (
        undo.trashed_page_ids
        or undo.restored_page_ids
        or undo.removed_character_ids
        or undo.removed_creature_ids
    ), "undo должен откатить хотя бы одну сущность"


def test_who_git_mock_same_fixture(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, _confirm, _undo, db = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)
    fixture_files = load_vault_dir(FIXTURE_ROOT)

    out = import_svc.ingest_from_git(
        actor,
        setting.id,
        WorldImportFromGitRequest(
            url="https://github.com/igorpogulaev485-code/Who",
            rules_edition="2014",
        ),
        fetch_files=lambda _url: fixture_files,
    )
    assert out.job.source_kind == "git"
    keys = {it.source_key for it in out.items}
    assert "world/locations/lunnyy-most.md" in keys
    assert "campaign/party/characters/kavil.md" in keys
    assert len(db.jobs) == 1
