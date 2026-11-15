"""W-API-04: существа/предметы сеттинга 2014 — изоляция, валидация, не в каталог."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError, NotFoundError
from app.dnd import wiki_combat as wc
from app.models.catalog import CatalogEntry, CatalogKind
from app.models.setting_artifact import SettingArtifact
from app.models.setting_creature import SettingCreature
from app.models.world_import import WorldImportDraftItem, WorldImportJob
from app.schemas.setting_creature import (
    SettingCreatureCreateRequest,
    SettingItemCreateRequest,
)
from app.services.setting_creatures import (
    SettingCreatureService,
    validate_creature_statblock,
)

FIXTURE = (
    Path(__file__).resolve().parent
    / "fixtures/who_vault/rules/encounters/gorvax_statblock_structured.json"
)


def _gorvax() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def _setting(name="Мир"):
    return SimpleNamespace(
        id=uuid4(),
        lobby_id=uuid4(),
        name=name,
        world_notes="",
        is_extra=False,
        deleted_at=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


class FakeLobbies:
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
        if getattr(row, "created_at", None) is None:
            row.created_at = datetime.now(timezone.utc)
        if getattr(row, "updated_at", None) is None:
            row.updated_at = datetime.now(timezone.utc)
        if getattr(row, "sort_order", None) is None:
            row.sort_order = 0
        if getattr(row, "abilities", None) is None:
            row.abilities = []
        self.artifacts.append(row)
        return row


class FakeDB:
    def __init__(self):
        self.creatures: list[SettingCreature] = []
        self.artifacts: list[SettingArtifact] = []
        self.draft_items: list[WorldImportDraftItem] = []
        self.jobs: list[WorldImportJob] = []
        self.catalog: list[CatalogEntry] = []
        self.added: list[object] = []

    def add(self, obj):
        self.added.append(obj)
        if isinstance(obj, SettingCreature):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            now = datetime.now(timezone.utc)
            if getattr(obj, "created_at", None) is None:
                obj.created_at = now
            if getattr(obj, "updated_at", None) is None:
                obj.updated_at = now
            self.creatures.append(obj)
        elif isinstance(obj, SettingArtifact):
            self.artifacts.append(obj)
        elif isinstance(obj, WorldImportDraftItem):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            now = datetime.now(timezone.utc)
            if getattr(obj, "created_at", None) is None:
                obj.created_at = now
            if getattr(obj, "updated_at", None) is None:
                obj.updated_at = now
            self.draft_items.append(obj)
        elif isinstance(obj, CatalogEntry):
            self.catalog.append(obj)

    def commit(self):
        return None

    def refresh(self, obj):
        return None

    def get(self, model, pk):
        if model is SettingCreature:
            for c in self.creatures:
                if c.id == pk:
                    return c
        if model is WorldImportJob:
            for j in self.jobs:
                if j.id == pk:
                    return j
        if model is CatalogEntry:
            for e in self.catalog:
                if e.id == pk:
                    return e
        return None

    def scalar(self, stmt):  # noqa: ANN001
        entity = None
        try:
            entity = stmt.column_descriptions[0]["entity"]
        except Exception:
            entity = None
        criteria = getattr(stmt, "_where_criteria", ()) or ()
        setting_id = None
        import_key = None
        for crit in criteria:
            left = getattr(crit, "left", None)
            right = getattr(crit, "right", None)
            key = getattr(left, "key", None) or getattr(left, "name", None)
            val = getattr(right, "value", right)
            if key == "setting_id":
                setting_id = val
            if key == "import_key":
                import_key = val
        entity_name = getattr(entity, "__name__", "")
        if entity is SettingCreature or entity_name == "SettingCreature":
            for c in self.creatures:
                if setting_id is not None and c.setting_id != setting_id:
                    continue
                if import_key is not None and c.import_key != import_key:
                    continue
                return c
            return None
        if entity is SettingArtifact or entity_name == "SettingArtifact":
            for a in self.artifacts:
                if setting_id is not None and a.setting_id != setting_id:
                    continue
                if import_key is not None and a.import_key != import_key:
                    continue
                return a
            return None
        return None

    def scalars(self, stmt):  # noqa: ANN001
        entity = None
        try:
            entity = stmt.column_descriptions[0]["entity"]
        except Exception:
            entity = None
        criteria = getattr(stmt, "_where_criteria", ()) or ()
        setting_id = None
        for crit in criteria:
            left = getattr(crit, "left", None)
            right = getattr(crit, "right", None)
            key = getattr(left, "key", None) or getattr(left, "name", None)
            val = getattr(right, "value", right)
            if key == "setting_id":
                setting_id = val

        rows: list = []
        if entity is SettingCreature or (
            hasattr(entity, "__name__") and str(getattr(entity, "__name__", "")) == "SettingCreature"
        ):
            rows = [
                c
                for c in self.creatures
                if setting_id is None or c.setting_id == setting_id
            ]
        elif entity is SettingArtifact:
            rows = [
                a
                for a in self.artifacts
                if setting_id is None or a.setting_id == setting_id
            ]

        class _Result:
            def __init__(self, items):
                self._items = items

            def all(self):
                return list(self._items)

        return _Result(rows)


def _service(settings: list[SimpleNamespace]) -> tuple[SettingCreatureService, FakeDB, FakeLobbies]:
    db = FakeDB()
    lobbies = FakeLobbies(*settings)
    svc = SettingCreatureService(db)
    svc.lobbies = lobbies
    # Keep artifact lists in sync for create_item path
    original_create = lobbies.create_setting_artifact

    def _create(**kwargs):
        row = original_create(**kwargs)
        db.artifacts.append(row)
        return row

    lobbies.create_setting_artifact = _create  # type: ignore[method-assign]
    return svc, db, lobbies


def test_validate_gorvax_structured_passes():
    g = _gorvax()
    result = validate_creature_statblock(g["data"], rules_edition="2014")
    assert result.valid
    assert not result.incomplete
    assert result.normalized_data["ac"] == 18
    assert result.normalized_data["hp_average"] == 75
    assert result.normalized_data["abilities"]["str"] == 20
    assert result.normalized_data["cr"] == "4"
    assert result.normalized_data["xp"] == 1100


def test_incomplete_statblock_saves_with_flag():
    setting = _setting("А")
    svc, db, _ = _service([setting])
    out = svc.create_creature(
        setting.id,
        SettingCreatureCreateRequest(
            name="Черновик зверя",
            import_key="draft-beast",
            data={"size": "large", "type": "beast"},
            source="master",
        ),
    )
    assert out.incomplete is True
    assert "ac" in out.incompleteness_notes
    assert "hp_average" in out.incompleteness_notes
    assert len(db.creatures) == 1
    assert db.creatures[0].incomplete is True


def test_ability_out_of_range_rejected():
    result = validate_creature_statblock(
        {
            "size": "medium",
            "type": "humanoid",
            "ac": 10,
            "hp_average": 10,
            "speed": {"walk": 30},
            "cr": "1",
            "abilities": {"str": 99, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10},
        }
    )
    assert result.valid is False
    assert any(e.code == "ability_out_of_range" for e in result.errors)


def test_rules_edition_2024_rejected_for_creature():
    setting = _setting()
    svc, db, _ = _service([setting])
    with pytest.raises(AppError) as ei:
        svc.create_creature(
            setting.id,
            SettingCreatureCreateRequest(
                name="X",
                import_key="x",
                data={"ac": 10, "hp_average": 10},
                rules_edition="2024",
            ),
        )
    assert ei.value.code == "rules_edition_unsupported"
    assert len(db.creatures) == 0


def test_cr_xp_mismatch_rejected():
    result = validate_creature_statblock(
        {
            "size": "medium",
            "type": "humanoid",
            "ac": 18,
            "hp_average": 75,
            "speed": {"walk": 30},
            "cr": "4",
            "xp": 999,
            "abilities": {"str": 20, "dex": 10, "con": 16, "int": 12, "wis": 14, "cha": 16},
        }
    )
    assert result.valid is False
    assert any(e.code == "cr_xp_mismatch" for e in result.errors)


def test_creature_isolated_between_settings_and_not_in_catalog():
    a = _setting("А")
    b = _setting("Б")
    svc, db, _ = _service([a, b])
    g = _gorvax()
    created = svc.create_creature(
        a.id,
        SettingCreatureCreateRequest(
            name=g["name"],
            import_key=g["import_key"],
            data=g["data"],
            source="master",
        ),
    )
    assert created.setting_id == a.id
    assert created.incomplete is False

    in_a = svc.list_creatures(a.id)
    in_b = svc.list_creatures(b.id)
    assert len(in_a) == 1
    assert in_a[0].import_key == g["import_key"]
    assert in_b == []

    with pytest.raises(NotFoundError):
        svc.get_creature(b.id, created.id)

    # Ни одна запись CatalogEntry не создавалась.
    assert not any(isinstance(x, CatalogEntry) for x in db.added)
    assert db.catalog == []
    assert CatalogKind.bestiary.value == "bestiary"


def test_item_ordinary_2014_not_catalog():
    setting = _setting()
    svc, db, lobbies = _service([setting])
    item = svc.create_item(
        setting.id,
        SettingItemCreateRequest(
            name="Кинжал разведчика",
            item_kind="ordinary",
            rarity="",
            description="Обычный кинжал мира",
            import_key="scout-dagger",
            rules_edition="2014",
        ),
    )
    assert item.item_kind == "ordinary"
    assert item.rules_edition == "2014"
    assert item.import_key == "scout-dagger"
    assert len(lobbies.artifacts) == 1
    assert not any(isinstance(x, CatalogEntry) for x in db.added)


def test_item_rules_edition_2024_rejected():
    setting = _setting()
    svc, _, _ = _service([setting])
    with pytest.raises(AppError) as ei:
        svc.create_item(
            setting.id,
            SettingItemCreateRequest(
                name="Меч",
                item_kind="magic",
                rules_edition="2024",
            ),
        )
    assert ei.value.code == "rules_edition_unsupported"


def test_draft_can_reference_setting_creature():
    setting = _setting()
    svc, db, _ = _service([setting])
    g = _gorvax()
    creature = svc.create_creature(
        setting.id,
        SettingCreatureCreateRequest(
            name=g["name"],
            import_key=g["import_key"],
            data=g["data"],
        ),
    )
    job = WorldImportJob(
        id=uuid4(),
        setting_id=setting.id,
        lobby_id=setting.lobby_id,
        author_id=uuid4(),
        status="ready_for_review",
        rules_edition="2014",
        source_kind="api",
    )
    db.jobs.append(job)
    draft = svc.attach_creature_to_draft(
        job_id=job.id,
        creature_id=creature.id,
        source_key="rules/encounters/01-dragonborn-vanguard.md#gorvax",
    )
    assert draft.item_type == "setting_creature"
    assert draft.proposal["setting_creature_id"] == str(creature.id)
    assert draft.proposal["import_key"] == g["import_key"]


def test_wiki_combatant_can_link_setting_creature():
    cid = str(uuid4())
    row = wc.normalize_wave_combatant(
        {
            "setting_creature_id": cid,
            "name": "Горвакс Крепкий Клык",
            "count": 1,
            "custom": True,
        }
    )
    assert row is not None
    assert row["setting_creature_id"] == cid
    assert row["custom"] is True
    assert row["slug"] is None
    assert row["catalog_id"] is None


def test_alembic_single_head_mentions_wapi04():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "wapi04setcrt01" in ancestor_ids
