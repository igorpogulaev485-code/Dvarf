"""W-API-06: извлечение предложений из прозы (stub, без платного ИИ)."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.models.setting_artifact import SettingArtifact
from app.models.setting_creature import SettingCreature
from app.models.setting_page import SettingPage
from app.models.world_import import (
    WorldImportDraftItem,
    WorldImportDraftLink,
    WorldImportJob,
    WorldSourceAlias,
    WorldSourceKey,
)
from app.core.exceptions import AppError
from app.schemas.world_import import WorldImportUpsertRequest, WorldVaultFileIn
from app.services import lobby_roles as roles
from app.services.media import LobbyMediaService, LobbyMediaUsage
from app.services.world_import import WorldImportService
from app.services.world_import_ai_provider import (
    StubWorldImportAiProvider,
    get_world_import_ai_provider,
    run_heuristic_extract,
    set_world_import_ai_provider,
    slugify_ru,
)
from app.services.world_import_auth import WorldImportActor
from app.services.world_import_confirm import WorldImportConfirmService
from app.services.world_import_diff import build_diff
from app.services.world_import_extract import enrich_parsed_with_ai
from app.services.world_vault_parse import VaultFile, parse_vault_files

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
        self.creatures: list[SettingCreature] = []
        self.artifacts: list[SettingArtifact] = []
        self.sets: list = []
        self.members: list = []

    def get(self, lobby_id):
        return self.lobby if self.lobby.id == lobby_id else None

    def get_setting(self, setting_id):
        return self.setting if self.setting.id == setting_id else None

    def list_setting_artifacts(self, setting_id):
        return [a for a in self.artifacts if a.setting_id == setting_id]

    def create_setting_artifact(self, **kwargs):
        row = SettingArtifact(id=uuid4(), **kwargs)
        if getattr(row, "created_at", None) is None:
            row.created_at = datetime.now(timezone.utc)
        if getattr(row, "updated_at", None) is None:
            row.updated_at = datetime.now(timezone.utc)
        self.artifacts.append(row)
        return row

    def list_setting_artifact_sets(self, setting_id):
        return [s for s in self.sets if s.setting_id == setting_id]

    def create_setting_artifact_set(self, **kwargs):
        row = SimpleNamespace(id=uuid4(), members=[], **kwargs)
        self.sets.append(row)
        return row

    def clear_artifact_set_members(self, set_id):
        self.members = [m for m in self.members if m.set_id != set_id]

    def add_artifact_set_member(self, *, set_id, artifact_id, sort_order=0):
        m = SimpleNamespace(set_id=set_id, artifact_id=artifact_id, sort_order=sort_order)
        self.members.append(m)
        return m

    def find_artifact_set_membership(self, artifact_id):
        for m in self.members:
            if m.artifact_id == artifact_id:
                return m
        return None


class FakeDB:
    def __init__(self):
        self.jobs: list[WorldImportJob] = []
        self.draft_items: list[WorldImportDraftItem] = []
        self.source_keys: list[WorldSourceKey] = []
        self.aliases: list[WorldSourceAlias] = []
        self.draft_links: list[WorldImportDraftLink] = []
        self.pages: list[SettingPage] = []
        self.creatures: list[SettingCreature] = []
        self.artifacts: list[SettingArtifact] = []
        self.confirmations: list = []
        self._scalar_queue: list[object | None] = []

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
        else:
            if getattr(obj, "id", None) is None and hasattr(obj, "id"):
                try:
                    obj.id = uuid4()
                except Exception:
                    pass
            if hasattr(obj, "confirmed_at") and getattr(obj, "confirmed_at", None) is None:
                obj.confirmed_at = now
            self.confirmations.append(obj)

    def flush(self):
        return None

    def commit(self):
        return None

    def refresh(self, obj):
        return None

    def get(self, model, pk):
        if model is WorldImportJob:
            return next((j for j in self.jobs if j.id == pk), None)
        if model is SettingCreature:
            return next((c for c in self.creatures if c.id == pk), None)
        return None

    def execute(self, stmt):
        # delete(WorldImportDraftLink)
        self.draft_links.clear()
        return SimpleNamespace(rowcount=0)

    def scalar(self, stmt):
        if self._scalar_queue:
            return self._scalar_queue.pop(0)
        return None

    def scalars(self, stmt):
        entity = None
        try:
            entity = stmt.column_descriptions[0]["entity"]
        except Exception:
            entity = None
        if entity is WorldImportDraftItem:
            rows = list(self.draft_items)
        elif entity is WorldImportDraftLink:
            rows = list(self.draft_links)
        elif entity is WorldSourceKey:
            rows = list(self.source_keys)
        elif entity is SettingPage:
            rows = list(self.pages)
        elif entity is SettingCreature:
            rows = list(self.creatures)
        elif entity is SettingArtifact:
            rows = list(self.artifacts)
        elif entity is WorldImportJob:
            rows = list(self.jobs)
        else:
            # fallback по тексту
            text = str(stmt).lower()
            if "draft_item" in text:
                rows = list(self.draft_items)
            elif "draft_link" in text:
                rows = list(self.draft_links)
            elif "source_key" in text:
                rows = list(self.source_keys)
            elif "setting_creature" in text:
                rows = list(self.creatures)
            elif "setting_artifact" in text:
                rows = list(self.artifacts)
            elif "setting_page" in text:
                rows = list(self.pages)
            else:
                rows = list(self.draft_items)
        return SimpleNamespace(all=lambda: rows)


def _svc(lobby, setting, monkeypatch):
    db = FakeDB()
    fake_lobbies = FakeLobbies(lobby, setting)
    svc = WorldImportService(db)
    svc.lobbies = fake_lobbies  # type: ignore[assignment]
    svc.access.lobbies = fake_lobbies  # type: ignore[assignment]
    confirm = WorldImportConfirmService(db)
    confirm.lobbies = fake_lobbies  # type: ignore[assignment]
    confirm.access.lobbies = fake_lobbies  # type: ignore[assignment]

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
        existing = next(
            (s for s in db.source_keys if s.source_path == source_path), None
        )
        if existing:
            return existing
        row = WorldSourceKey(
            setting_id=setting_id,
            source_path=source_path,
            source_slug=source_slug,
        )
        db.add(row)
        return row

    svc._upsert_source_key = fake_upsert  # type: ignore[method-assign]
    svc._upsert_aliases = lambda *a, **k: []  # type: ignore[method-assign]
    return svc, confirm, db, fake_lobbies


def _load(*rels: str) -> list[WorldVaultFileIn]:
    return [
        WorldVaultFileIn(path=r, content=(FIXTURE_ROOT / r).read_text(encoding="utf-8"))
        for r in rels
    ]


@pytest.fixture(autouse=True)
def _stub_provider():
    set_world_import_ai_provider(StubWorldImportAiProvider())
    yield
    set_world_import_ai_provider(None)


def test_slugify_ru_basic():
    assert slugify_ru("Маска знаний") == "maska-znaniy"
    assert slugify_ru("Горвакс Крепкий Клык").startswith("gorvak")


def test_stub_kardian_six_items_and_set_keeps_lore_note():
    text = (FIXTURE_ROOT / "world/lore/artefacts-kardian.md").read_text(encoding="utf-8")
    parsed = parse_vault_files([VaultFile(path="world/lore/artefacts-kardian.md", content=text)])
    assert any(i.item_type == "note" and "artefacts-kardian" in i.source_key for i in parsed.items)

    enriched = enrich_parsed_with_ai(parsed, rules_edition="2014")
    note = next(i for i in enriched.items if i.source_key == "world/lore/artefacts-kardian.md")
    assert note.item_type == "note"
    assert "Шесть" in note.proposal["body"]

    items = [i for i in enriched.items if i.item_type == "setting_item"]
    sets = [i for i in enriched.items if i.item_type == "artifact_set"]
    assert len(items) == 6
    assert len(sets) == 1
    titles = {i.proposal["title"] for i in items}
    assert "Маска знаний" in titles
    assert "Медальон призыва" in titles
    assert all(i.proposal.get("ai_extracted") for i in items)
    assert sets[0].proposal["member_import_keys"]
    assert len(sets[0].proposal["member_import_keys"]) == 6


def test_gorvax_ac_hp_cr_or_incomplete_not_global_catalog():
    text = (FIXTURE_ROOT / "rules/encounters/01-dragonborn-vanguard.md").read_text(
        encoding="utf-8"
    )
    parsed = parse_vault_files(
        [VaultFile(path="rules/encounters/01-dragonborn-vanguard.md", content=text)]
    )
    result = run_heuristic_extract(parsed.items, mode="stub")
    creatures = [i for i in result.items if i.item_type == "setting_creature"]
    assert creatures
    gorvax = next(c for c in creatures if "Горвакс" in c.proposal["title"])
    data = gorvax.proposal["data"]
    assert data.get("ac") == 18
    assert data.get("hp_average") == 75
    # CR 4 либо флаг неполноты
    assert str(data.get("cr") or "") == "4" or gorvax.proposal.get("incomplete") is True
    # Не пишем в общий каталог — только proposal черновика
    assert gorvax.proposal.get("ai_extracted") is True
    assert "bestiary" not in (gorvax.proposal.get("source") or "")


def test_military_quests_split_as_quest_suggestions():
    rel = "world/locations/rozaliya/military-quests.md"
    text = (FIXTURE_ROOT / rel).read_text(encoding="utf-8")
    parsed = parse_vault_files([VaultFile(path=rel, content=text)])
    enriched = enrich_parsed_with_ai(parsed, rules_edition="2014")
    quests = [i for i in enriched.items if i.item_type == "quest"]
    assert len(quests) >= 3
    assert all(q.proposal.get("ai_extracted") for q in quests)
    titles = " ".join(q.proposal["title"] for q in quests)
    assert "Око" in titles or "Сердце" in titles


def test_no_provider_key_completes_without_500(monkeypatch):
    set_world_import_ai_provider(None)
    monkeypatch.setattr(
        "app.services.world_import_ai_provider.settings.world_import_ai_api_key", ""
    )
    monkeypatch.setattr(
        "app.services.world_import_ai_provider.settings.world_import_ai_base_url", ""
    )
    monkeypatch.setattr(
        "app.services.world_import_ai_provider.settings.world_import_ai_provider", "auto"
    )
    provider = get_world_import_ai_provider()
    text = (FIXTURE_ROOT / "world/lore/artefacts-kardian.md").read_text(encoding="utf-8")
    parsed = parse_vault_files([VaultFile(path="world/lore/artefacts-kardian.md", content=text)])
    result = provider.extract(parsed.items, rules_edition="2014")
    assert result.mode == "unconfigured"
    assert "эвристик" in result.message.lower() or "ключ" in result.message.lower()
    # Не падает; предложения от эвристик допустимы
    assert isinstance(result.items, list)


def test_upsert_extract_visible_in_diff_and_job_status(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, _confirm, db, _fake = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)

    out = svc.upsert_package(
        actor,
        setting.id,
        WorldImportUpsertRequest(
            files=_load(
                "world/lore/artefacts-kardian.md",
                "rules/encounters/01-dragonborn-vanguard.md",
            ),
            rules_edition="2014",
        ),
    )
    assert out.job.status == "ready_for_review"
    assert out.extract_mode in {"stub", "heuristic", "unconfigured"}
    assert out.extract_message

    items = [i for i in out.items if i.item_type == "setting_item"]
    assert len(items) == 6
    assert any(i.item_type == "artifact_set" for i in out.items)
    assert any(i.item_type == "note" for i in out.items)
    creatures = [i for i in out.items if i.item_type == "setting_creature"]
    assert any("Горвакс" in (i.proposal.get("title") or "") for i in creatures)

    diff = build_diff(db, db.jobs[0])
    ai_entries = [e for e in diff.entries if e.status == "ai_suggestion"]
    assert ai_entries
    assert any(e.item_type == "setting_item" for e in ai_entries)


def test_extract_does_not_write_canon_without_confirm(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, confirm, db, fake = _svc(lobby, setting, monkeypatch)
    actor = WorldImportActor(kind="user", user=owner)

    out = svc.upsert_package(
        actor,
        setting.id,
        WorldImportUpsertRequest(
            files=_load("world/lore/artefacts-kardian.md"),
            rules_edition="2014",
        ),
    )
    assert out.job.status == "ready_for_review"
    assert fake.artifacts == []
    assert db.creatures == []
    assert fake.pages == []

    # Confirm через API 05 пишет предметы
    job = db.jobs[0]
    item_ids = [i.id for i in db.draft_items if i.item_type == "setting_item"]
    confirmed = confirm.confirm(actor, setting.id, job.id, item_ids=item_ids)
    assert len(confirmed.created_artifact_ids) == 6
    assert len(fake.artifacts) == 6


def test_office_word_not_auto_bound_to_person():
    """ИИ-извлечение не привязывает «мэр» к человеку — только ai_suggestion."""
    body = (
        "# Город\n\nВ городе есть **мэр**, его зовут кто-то. "
        "Должность меняется — решает мастер.\n"
    )
    parsed = parse_vault_files(
        [
            VaultFile(
                path="world/locations/test-city.md",
                content="---\ntitle: Тест\nstatus: draft\n---\n" + body,
            )
        ]
    )
    result = run_heuristic_extract(parsed.items, mode="stub")
    office_hints = [
        i
        for i in result.items
        if i.item_type == "ai_suggestion"
        and (i.proposal or {}).get("suggestion_kind") == "office"
    ]
    assert office_hints
    assert "мастера" in (office_hints[0].proposal.get("hint") or "").lower() or "вручную" in (
        office_hints[0].proposal.get("hint") or ""
    ).lower()
    # Нет рёбер — extract возвращает только items, не links
    assert all(i.item_type != "npc" for i in result.items)
