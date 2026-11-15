"""W-API-08: персонажи партии (md+txt+PDF) → лист 2014, идемпотентность, undo, reject 2024."""

from __future__ import annotations

import base64
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.models.character import Character, RulesEdition
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
from app.schemas.world_import import WorldImportUpsertRequest, WorldVaultFileIn
from app.services import lobby_roles as roles
from app.services.character_sheet import empty_character_sheet
from app.services.media import LobbyMediaService, LobbyMediaUsage
from app.services.world_import import WorldImportService
from app.services.world_import_auth import WorldImportActor
from app.services.world_import_characters import (
    enrich_party_characters,
    parse_party_character_card,
)
from app.services.world_import_confirm import WorldImportConfirmService
from app.services.world_import_diff import build_diff
from app.services.world_import_undo import WorldImportUndoService
from app.services.world_vault_parse import VaultFile, parse_vault_files

FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "who_vault"
KAVIL_MD = "campaign/party/characters/kavil.md"
VIRRA_MD = "campaign/party/characters/virra.md"
KAVIL_TXT = "assets/character-sheets/kavil.txt"
KAVIL_PDF = "assets/character-sheets/kavil.pdf"


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
            self.confirmations.append(obj)
        elif isinstance(obj, SettingPage):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            self.pages.append(obj)
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
        if isinstance(obj, WorldImportAttachment):
            self.attachments = [a for a in self.attachments if a.id != obj.id]
        elif isinstance(obj, SettingCreature):
            self.creatures = [c for c in self.creatures if c.id != obj.id]
        elif isinstance(obj, SettingArtifact):
            self.artifacts = [a for a in self.artifacts if a.id != obj.id]

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
            # Lookup by import_key / setting — вернём последнего подходящего.
            for ch in reversed(self.characters):
                if ch.deleted_at is None:
                    return ch
            return None
        if entity is WorldImportAttachment:
            return self.attachments[-1] if self.attachments else None
        if entity is SettingCreature:
            return self.creatures[-1] if self.creatures else None
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
            Character: self.characters,
            WorldImportAttachment: self.attachments,
            WorldImportJob: self.jobs,
            WorldImportConfirmation: self.confirmations,
        }
        if entity in mapping:
            return _Result(list(mapping[entity]))
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


def _load_text(*rels: str) -> list[WorldVaultFileIn]:
    out: list[WorldVaultFileIn] = []
    for r in rels:
        path = FIXTURE_ROOT / r
        if r.lower().endswith(".pdf"):
            out.append(
                WorldVaultFileIn(
                    path=r,
                    content="",
                    content_base64=base64.b64encode(path.read_bytes()).decode("ascii"),
                )
            )
        else:
            out.append(WorldVaultFileIn(path=r, content=path.read_text(encoding="utf-8")))
    return out


def _prepare(import_svc, actor, setting, files):
    return import_svc.upsert_package(
        actor,
        setting.id,
        WorldImportUpsertRequest(files=files, rules_edition="2014"),
    )


def test_parse_kavil_card_fields():
    md = (FIXTURE_ROOT / KAVIL_MD).read_text(encoding="utf-8")
    txt = (FIXTURE_ROOT / KAVIL_TXT).read_text(encoding="utf-8")
    # split frontmatter roughly
    body = md.split("---", 2)[-1]
    fm = {"title": "Кавил МакАндрик", "sheet": "assets/character-sheets/kavil.pdf"}
    parsed = parse_party_character_card(
        source_key=KAVIL_MD,
        title="Кавил МакАндрик",
        frontmatter=fm,
        body=body,
        txt_content=txt,
        pdf_bytes=(FIXTURE_ROOT / KAVIL_PDF).read_bytes(),
    )
    assert parsed.name == "Кавил МакАндрик"
    assert parsed.race_name == "Человек"
    assert parsed.class_name == "Друид"
    assert parsed.subclass_name == "Круг дикого огня"
    assert parsed.level == 8
    assert parsed.ac == 17
    assert parsed.hp_max == 52
    assert parsed.rules_edition == "2014"
    assert not parsed.deferred_homebrew
    assert parsed.sheet["combat"]["ac"] == 17
    assert parsed.sheet["combat"]["hp_max"] == 52
    assert "identity" in parsed.sheet
    assert parsed.pdf_base64


def test_virra_homebrew_race_marked():
    md = (FIXTURE_ROOT / VIRRA_MD).read_text(encoding="utf-8")
    body = md.split("---", 2)[-1]
    parsed = parse_party_character_card(
        source_key=VIRRA_MD,
        title="Вирра",
        frontmatter={"title": "Вирра"},
        body=body,
    )
    assert parsed.class_name == "Жрец"
    assert any("раса" in x.lower() for x in parsed.deferred_homebrew)
    assert "Отложено до хоумбрю" in parsed.sheet["features_text"]["feats"]


def test_reject_rules_edition_2024_on_character_card():
    with pytest.raises(AppError) as exc:
        parse_party_character_card(
            source_key=KAVIL_MD,
            title="X",
            frontmatter={},
            body="| Раса | Человек |\n",
            rules_edition="2024",
        )
    assert exc.value.code == "rules_edition_unsupported"


def test_enrich_party_characters_from_vault():
    files = [
        VaultFile(
            path=KAVIL_MD,
            content=(FIXTURE_ROOT / KAVIL_MD).read_text(encoding="utf-8"),
        ),
        VaultFile(
            path=KAVIL_TXT,
            content=(FIXTURE_ROOT / KAVIL_TXT).read_text(encoding="utf-8"),
        ),
        VaultFile(
            path=KAVIL_PDF,
            content="",
            binary=(FIXTURE_ROOT / KAVIL_PDF).read_bytes(),
        ),
    ]
    result = parse_vault_files(files)
    result = enrich_party_characters(result, files)
    item = next(i for i in result.items if i.source_key == KAVIL_MD)
    assert item.item_type == "party_character"
    assert item.proposal["import_key"] == "kavil"
    assert item.proposal["level"] == 8
    assert item.proposal["ac"] == 17
    assert item.proposal["sheet"]["combat"]["hp_max"] == 52


def test_confirm_creates_2014_character_with_pdf(monkeypatch, tmp_path):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, _undo, db = _svc(lobby, setting, monkeypatch, tmp_path)
    actor = WorldImportActor(kind="user", user=owner)

    _prepare(import_svc, actor, setting, _load_text(KAVIL_MD, KAVIL_TXT, KAVIL_PDF))
    job = db.jobs[0]
    char_items = [i for i in db.draft_items if i.item_type == "party_character"]
    assert char_items
    assert char_items[0].proposal.get("level") == 8

    out = confirm_svc.confirm(actor, setting.id, job.id, item_ids=[char_items[0].id])
    assert out.created_character_ids
    assert len(db.characters) == 1
    ch = db.characters[0]
    assert ch.user_id == owner.id
    assert ch.rules_edition == RulesEdition.edition_2014
    assert ch.name == "Кавил МакАндрик"
    assert ch.race_name == "Человек"
    assert ch.class_name == "Друид"
    assert ch.level == 8
    assert ch.hp_max == 52
    assert ch.import_key == "kavil"
    assert ch.imported_setting_id == setting.id
    assert ch.is_draft is True
    # Лист полный: ключи empty_character_sheet
    empty_keys = set(empty_character_sheet().keys())
    assert empty_keys <= set(ch.sheet.keys())
    assert ch.sheet["combat"]["ac"] == 17
    assert ch.sheet["identity"]["subclass_name"] == "Круг дикого огня"

    assert out.created_attachment_ids
    assert len(db.attachments) == 1
    att = db.attachments[0]
    assert att.content_type == "application/pdf"
    assert att.character_id == ch.id
    disk = tmp_path / "uploads" / att.storage_relpath
    assert disk.is_file()
    assert disk.read_bytes().startswith(b"%PDF")

    # source key связан
    sk = next(s for s in db.source_keys if s.source_path == KAVIL_MD)
    assert sk.character_id == ch.id


def test_reimport_same_key_no_duplicate(monkeypatch, tmp_path):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, _undo, db = _svc(lobby, setting, monkeypatch, tmp_path)
    actor = WorldImportActor(kind="user", user=owner)

    files = _load_text(KAVIL_MD, KAVIL_TXT, KAVIL_PDF)
    _prepare(import_svc, actor, setting, files)
    job = db.jobs[0]
    item = next(i for i in db.draft_items if i.item_type == "party_character")
    confirm_svc.confirm(actor, setting.id, job.id, item_ids=[item.id])
    assert len(db.characters) == 1
    first_id = db.characters[0].id

    # Повторный upsert+confirm — тот же персонаж
    job.status = "ready_for_review"
    _prepare(import_svc, actor, setting, files)
    item2 = next(i for i in db.draft_items if i.source_key == KAVIL_MD)
    out = confirm_svc.confirm(actor, setting.id, job.id, item_ids=[item2.id])
    assert len([c for c in db.characters if c.deleted_at is None]) == 1
    assert db.characters[0].id == first_id
    assert out.updated_character_ids or out.created_character_ids == []


def test_confirm_rejects_2024_in_proposal(monkeypatch, tmp_path):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, _undo, db = _svc(lobby, setting, monkeypatch, tmp_path)
    actor = WorldImportActor(kind="user", user=owner)
    _prepare(import_svc, actor, setting, _load_text(KAVIL_MD, KAVIL_TXT))
    job = db.jobs[0]
    item = next(i for i in db.draft_items if i.item_type == "party_character")
    item.proposal = dict(item.proposal or {})
    item.proposal["rules_edition"] = "2024"
    with pytest.raises(AppError) as exc:
        confirm_svc.confirm(actor, setting.id, job.id, item_ids=[item.id])
    assert exc.value.code == "rules_edition_unsupported"
    assert db.characters == []


def test_no_catalog_entries_created(monkeypatch, tmp_path):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, _undo, db = _svc(lobby, setting, monkeypatch, tmp_path)
    actor = WorldImportActor(kind="user", user=owner)
    _prepare(import_svc, actor, setting, _load_text(VIRRA_MD))
    item = next(i for i in db.draft_items if i.item_type == "party_character")
    confirm_svc.confirm(actor, setting.id, db.jobs[0].id, item_ids=[item.id])
    assert db.catalog_entries == []
    assert db.characters[0].race_name.startswith("Зайцегон")


def test_undo_removes_created_character(monkeypatch, tmp_path):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, confirm_svc, undo_svc, db = _svc(lobby, setting, monkeypatch, tmp_path)
    actor = WorldImportActor(kind="user", user=owner)
    _prepare(import_svc, actor, setting, _load_text(KAVIL_MD, KAVIL_TXT, KAVIL_PDF))
    item = next(i for i in db.draft_items if i.item_type == "party_character")
    confirm_svc.confirm(actor, setting.id, db.jobs[0].id, item_ids=[item.id])
    assert db.characters[0].deleted_at is None
    assert db.attachments

    out = undo_svc.undo(actor, setting.id, db.jobs[0].id)
    assert out.removed_character_ids
    assert db.characters[0].deleted_at is not None
    assert out.removed_attachment_ids
    assert db.attachments == []
    assert db.jobs[0].status == "ready_for_review"


def test_diff_shows_new_party_character(monkeypatch, tmp_path):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    import_svc, _c, _u, db = _svc(lobby, setting, monkeypatch, tmp_path)
    actor = WorldImportActor(kind="user", user=owner)
    _prepare(import_svc, actor, setting, _load_text(KAVIL_MD, KAVIL_TXT))
    diff = build_diff(db, db.jobs[0])
    entry = next(e for e in diff.entries if e.source_key == KAVIL_MD)
    assert entry.status == "new"
    assert entry.item_type == "party_character"


def test_empty_sheet_keys_survive_render_shape():
    """Импортированный лист содержит все ключи empty_character_sheet (печать 2014)."""
    sheet = empty_character_sheet()
    md = (FIXTURE_ROOT / KAVIL_MD).read_text(encoding="utf-8")
    body = md.split("---", 2)[-1]
    parsed = parse_party_character_card(
        source_key=KAVIL_MD,
        title="Кавил МакАндрик",
        frontmatter={},
        body=body,
        txt_content=(FIXTURE_ROOT / KAVIL_TXT).read_text(encoding="utf-8"),
    )
    for key in sheet:
        assert key in parsed.sheet
