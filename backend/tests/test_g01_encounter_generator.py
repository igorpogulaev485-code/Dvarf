"""G-01: стили, эскалация, летуны с предупреждением, крючок вики, без loot_chest."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory

from app.core.exceptions import AppError
from app.dnd.encounter_budget import EncounterDifficulty, budget_base
from app.dnd.encounter_calib import load_encounter_calib, party_power_clip
from app.dnd.encounter_compose import compose_encounter
from app.dnd.encounter_pool import BestiaryMonsterRef, monster_has_spellcasting
from app.dnd.sheet_signals import PartyMemberSnapshot, analyze_party
from app.schemas.lobby import EncounterGenerateRequest
from app.services.lobby import LobbyService


def _melee_sheet() -> dict:
    return {
        "combat": {"ac": 16},
        "weapons": [{"name": "Длинный меч", "damage": "1d8+3", "range_kind": "melee"}],
        "spells": {"slots": {}, "known": []},
        "resources": [],
        "attunements": [],
        "inventory": {"items": []},
        "companions": [],
    }


def _ranged_sheet() -> dict:
    return {
        "combat": {"ac": 15},
        "weapons": [
            {"name": "Длинный лук", "damage": "1d8+3", "range_kind": "ranged"}
        ],
        "spells": {"slots": {}, "known": []},
        "resources": [],
        "attunements": [],
        "inventory": {"items": []},
        "companions": [],
    }


def _pool() -> list[BestiaryMonsterRef]:
    return [
        BestiaryMonsterRef(
            "orc-war", "Вождь орков", "4", 1100, "humanoid", "орк", ("холмы",), False, False
        ),
        BestiaryMonsterRef(
            "orc", "Орк", "1/2", 100, "humanoid", "орк", ("холмы",), False, False
        ),
        BestiaryMonsterRef(
            "goblin", "Гоблин", "1/4", 50, "humanoid", "гоблиноид", ("холмы",), False, False
        ),
        BestiaryMonsterRef(
            "orc-eye",
            "Глаз Груумша",
            "2",
            450,
            "humanoid",
            "орк",
            ("холмы",),
            False,
            True,
        ),
        BestiaryMonsterRef(
            "wyvern", "Виверна", "6", 2300, "dragon", None, ("горы", "холмы"), True, False
        ),
        BestiaryMonsterRef(
            "hippogriff", "Гиппогриф", "1", 200, "monstrosity", None, ("холмы",), True, False
        ),
    ]


def test_calib_loaded_and_clip():
    calib = load_encounter_calib()
    assert calib["version"] == 1
    lo, hi = party_power_clip()
    assert lo == 0.85 and hi == 2.2
    assert "mixed" in calib["composition"]
    assert "exhaustion_penalty_last" in calib["wave_profile"]["escalation"]


def test_horde_has_no_mandatory_boss():
    members = [
        PartyMemberSnapshot(level=3, hp_max=22, sheet=_ranged_sheet()) for _ in range(4)
    ]
    prop = compose_encounter(
        members=members,
        monsters=_pool(),
        difficulty=EncounterDifficulty.medium,
        theme_ids=["orc"],
        similar=True,
        environments=["холмы"],
        waves=1,
        composition="horde",
    )
    wave = prop.waves[0]
    assert wave.boss is None
    assert wave.pack is not None
    assert wave.pack.options
    assert wave.pack.suggested_count >= 1


def test_boss_style_without_mandatory_pack():
    members = [
        PartyMemberSnapshot(level=5, hp_max=40, sheet=_ranged_sheet()) for _ in range(4)
    ]
    prop = compose_encounter(
        members=members,
        monsters=_pool(),
        difficulty=EncounterDifficulty.hard,
        theme_ids=["orc"],
        similar=True,
        environments=["холмы"],
        waves=1,
        composition="boss",
    )
    wave = prop.waves[0]
    assert wave.boss is not None
    assert wave.boss.options
    assert wave.pack is None


def test_escalation_last_wave_stronger_but_damped():
    members = [
        PartyMemberSnapshot(level=5, hp_max=40, sheet=_ranged_sheet()) for _ in range(4)
    ]
    prop = compose_encounter(
        members=members,
        monsters=_pool(),
        difficulty=EncounterDifficulty.medium,
        theme_ids=["orc"],
        similar=True,
        environments=["холмы"],
        waves=3,
        composition="mixed",
        wave_profile="escalation",
    )
    assert len(prop.waves) == 3
    first, mid, last = prop.waves
    assert last.budget_xp > first.budget_xp
    # не три полных средних боя: сумма ≈ один скорректированный бюджет
    base = budget_base(prop.waves and (5, 5, 5, 5), EncounterDifficulty.medium)
    assert prop.budget_total <= int(base * prop.party_power * 1.05) + 3
    assert last.budget_xp < first.budget_xp * 3


def test_flyers_auto_suppresses_when_ranged_weak():
    members = [
        PartyMemberSnapshot(level=2, hp_max=16, sheet=_melee_sheet()) for _ in range(4)
    ]
    analysis = analyze_party(members)
    assert analysis.anti_air_ok is False
    assert analysis.ranged_band == "low"
    prop = compose_encounter(
        members=members,
        monsters=_pool(),
        difficulty=EncounterDifficulty.medium,
        theme_ids=["orc"],
        similar=True,
        environments=["холмы"],
        waves=1,
        flyers="auto",
        party_analysis=analysis,
    )
    assert "flyers_auto_suppressed" in prop.notes
    assert prop.flyers_warning is False
    for w in prop.waves:
        for role in (w.boss, w.pack):
            if role:
                assert all(not o.fly for o in role.options)


def test_flyers_want_warns_when_ranged_weak():
    members = [
        PartyMemberSnapshot(level=2, hp_max=16, sheet=_melee_sheet()) for _ in range(4)
    ]
    prop = compose_encounter(
        members=members,
        monsters=_pool(),
        difficulty=EncounterDifficulty.medium,
        theme_ids=["beast"] if False else ["orc"],
        similar=True,
        environments=["холмы"],
        waves=1,
        flyers="want",
        composition="horde",
    )
    assert prop.flyers_warning is True
    assert "flyers_weak_ranged_warning" in prop.notes


def test_spellcasting_heuristic():
    assert monster_has_spellcasting(
        {"traits": [{"name_ru": "Использование заклинаний", "name_en": "Spellcasting"}]}
    )
    assert not monster_has_spellcasting({"traits": [{"name_ru": "Тонкий нюх"}]})


def test_request_rejects_unknown_enemy_casters_name():
    with pytest.raises(Exception):
        EncounterGenerateRequest(
            theme_ids=["orc"],
            enemy_casters="some",  # type: ignore[arg-type]
        )


def test_generate_wiki_hook_and_no_loot(monkeypatch):
    """save_to_wiki → 400; fill_loot_chest не вызывается."""
    session_id = uuid4()
    user = SimpleNamespace(id=uuid4())
    lobby = SimpleNamespace(id=uuid4(), campaign_rules={"homebrew": {}})
    session = SimpleNamespace(
        id=session_id,
        lobby=lobby,
        closed_at=None,
        seats=[SimpleNamespace(character_id=uuid4())],
        combatants=[],
        combat={"active": False},
    )
    char = SimpleNamespace(
        level=3,
        hp_max=20,
        hp_current=20,
        sheet=_ranged_sheet(),
        race_name="Человек",
        class_name="Следопыт",
    )

    svc = LobbyService(MagicMock())
    svc._require_session_owner = MagicMock(return_value=(session, lobby))
    svc.lobbies = MagicMock()
    svc.lobbies.get_characters_map.return_value = {session.seats[0].character_id: char}
    svc.catalog = MagicMock()
    svc.catalog.list_bestiary_for_generator.return_value = [
        SimpleNamespace(
            slug="orc",
            name_ru="Орк",
            data={
                "cr": "1/2",
                "type": "humanoid",
                "subtype": "орк",
                "environment": ["холмы"],
                "speed": {"walk": 30},
                "hp_average": 15,
                "ac": 13,
            },
        )
    ]

    loot_calls: list[object] = []
    monkeypatch.setattr(
        "app.services.session_rewards.fill_loot_chest",
        lambda *a, **k: loot_calls.append(1) or ({}, {}),
    )

    with pytest.raises(AppError) as exc:
        svc.generate_encounter(
            user,
            session_id,
            EncounterGenerateRequest(theme_ids=["orc"], save_to_wiki=True),
        )
    assert exc.value.status_code == 400
    assert exc.value.code == "wiki_combat_not_ready"

    result = svc.generate_encounter(
        user,
        session_id,
        EncounterGenerateRequest(
            theme_ids=["orc"],
            composition="horde",
            flyers="auto",
            enemy_casters="any",
            waves=1,
        ),
    )
    assert result.wiki_save_available is False
    assert result.party is not None
    assert result.composition == "horde"
    assert loot_calls == []


def test_alembic_single_head_no_g01_migration():
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    # голова цепочки W-02; G-01 миграций не добавлял
    assert any(
        rev.revision == "w02wiki0a2e0f"
        for rev in script.walk_revisions()
    )
