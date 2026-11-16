"""P24-M03c: create-at-N, multiclass slots, prerequisites, rollback, equivalence."""

from __future__ import annotations

from copy import deepcopy

import pytest

from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_create_levels as levels
from tests.test_p24_m03_create import build_valid_payload


def _base_wizard(**overrides):
    return build_valid_payload("wizard", **overrides)


def _base_fighter(**overrides):
    return build_valid_payload("fighter", **overrides)


def _with_int_for_wizard(payload: dict) -> dict:
    """Ensure INT ≥ 13 after background ASI so wizard multiclass is legal."""
    base = dict(payload["base_abilities"])
    # Keep standard array multiset; put 15 into INT.
    scores = sorted(base.values(), reverse=True)
    ordered_keys = ["int", "dex", "con", "wis", "cha", "str"]
    base = {k: scores[i] for i, k in enumerate(ordered_keys)}
    payload = {**payload, "base_abilities": base}
    # Background ASI must stay on the three allowed abilities — leave as built.
    return payload


def test_multiclass_spell_slot_table_cases():
    # Wizard 3 / Cleric 2 → full caster 5
    snap = e24.compute_progression(
        [
            {"slug": "wizard", "level": 3, "subclass_slug": "wizard__evoker"},
            {"slug": "cleric", "level": 2, "subclass_slug": "cleric__life-domain"},
        ]
    )
    assert e24.multiclass_caster_level([("wizard", 3), ("cleric", 2)]) == 5
    assert snap.multiclass_slots["1"] == 4
    assert snap.multiclass_slots["2"] == 3
    assert snap.multiclass_slots["3"] == 2

    # Paladin 5 (half → 2) / Warlock 3 (pact separate) → caster 2 + pact
    snap2 = e24.compute_progression(
        [
            {"slug": "paladin", "level": 5, "subclass_slug": "paladin__oath-of-devotion"},
            {"slug": "warlock", "level": 3, "subclass_slug": "warlock__fiend-patron"},
        ]
    )
    assert e24.multiclass_caster_level([("paladin", 5), ("warlock", 3)]) == 2
    assert snap2.multiclass_slots["1"] == 3
    assert snap2.multiclass_pact is not None
    assert snap2.multiclass_pact["count"] >= 2

    # Fighter 3 EK (third → 1) / Wizard 2 → caster 3
    snap3 = e24.compute_progression(
        [
            {"slug": "fighter", "level": 3, "subclass_slug": "fighter__eldritch-knight"},
            {"slug": "wizard", "level": 2},
        ]
    )
    assert e24.multiclass_caster_level([("fighter", 3), ("wizard", 2)]) == 2
    # third caster adds fighter_level // 3
    caster = e24.multiclass_caster_level([("fighter", 3), ("wizard", 2)]) + 3 // 3
    assert caster == 3
    assert snap3.multiclass_slots["1"] == 4
    assert snap3.multiclass_slots["2"] == 2

    # Artificer 3 (half_up → 2) / Wizard 1 → caster 3
    snap4 = e24.compute_progression(
        [
            {"slug": "artificer", "level": 3},
            {"slug": "wizard", "level": 1},
        ]
    )
    assert e24.multiclass_caster_level([("artificer", 3), ("wizard", 1)]) == 3
    assert snap4.multiclass_slots["1"] == 4
    assert snap4.multiclass_slots["2"] == 2


def test_multiclass_requirements_ge_13():
    ok, _ = e24.check_multiclass_prerequisites(
        current_classes=["fighter"],
        new_class="wizard",
        abilities={"str": 15, "dex": 10, "con": 12, "int": 14, "wis": 10, "cha": 10},
    )
    assert ok is True

    ok2, reason = e24.check_multiclass_prerequisites(
        current_classes=["fighter"],
        new_class="wizard",
        abilities={"str": 15, "dex": 10, "con": 12, "int": 10, "wis": 10, "cha": 10},
    )
    assert ok2 is False
    assert "Интеллект" in reason
    assert "INT" not in reason

    # Both old and new primaries required
    ok3, reason3 = e24.check_multiclass_prerequisites(
        current_classes=["wizard"],
        new_class="fighter",
        abilities={"str": 10, "dex": 10, "con": 12, "int": 15, "wis": 10, "cha": 10},
    )
    assert ok3 is False
    assert "Сила" in reason3 or "Ловкость" in reason3
    assert "STR" not in reason3 and "INT" not in reason3


def test_create_wizard_5_equivalence():
    """create@5 == create@1 then four level gains (same average HP path)."""
    book_extra = ["invisibility", "misty-step", "web", "scorching-ray"]
    direct = create24.validate_create_2024(
        create24.payload_from_dict(
            _base_wizard(
                subclass_slug="wizard__evoker",
                class_levels=[{"slug": "wizard", "level": 5, "subclass_slug": "wizard__evoker"}],
                asi_choices=[
                    {
                        "class_slug": "wizard",
                        "class_level": 4,
                        "kind": "asi_plus2",
                        "abilities": {"int": 2},
                    }
                ],
                level_gains=[
                    {"class_slug": "wizard", "hp_mode": "average", "add_spellbook": book_extra[0:2]},
                    {
                        "class_slug": "wizard",
                        "hp_mode": "average",
                        "subclass_slug": "wizard__evoker",
                        "add_spellbook": book_extra[2:4],
                    },
                    {
                        "class_slug": "wizard",
                        "hp_mode": "average",
                        "asi": {
                            "class_slug": "wizard",
                            "class_level": 4,
                            "kind": "asi_plus2",
                            "abilities": {"int": 2},
                        },
                    },
                    {"class_slug": "wizard", "hp_mode": "average"},
                ],
            )
        )
    )
    assert direct.level == 5

    sequential = create24.validate_create_2024(create24.payload_from_dict(_base_wizard()))
    sheet = deepcopy(sequential.sheet)
    primary = "wizard"
    steps = [
        levels.LevelGainStep(class_slug="wizard", hp_mode="average", add_spellbook=book_extra[0:2]),
        levels.LevelGainStep(
            class_slug="wizard",
            hp_mode="average",
            subclass_slug="wizard__evoker",
            add_spellbook=book_extra[2:4],
        ),
        levels.LevelGainStep(
            class_slug="wizard",
            hp_mode="average",
            asi=levels.AsiChoicePlan(
                class_slug="wizard",
                class_level=4,
                kind="asi_plus2",
                abilities={"int": 2},
            ),
        ),
        levels.LevelGainStep(class_slug="wizard", hp_mode="average"),
    ]
    for step in steps:
        levels.apply_level_gain_2024(sheet, step, primary_slug=primary)

    a = levels.normalize_sheet_for_equivalence(direct.sheet)
    b = levels.normalize_sheet_for_equivalence(sheet)
    assert a == b
    # Base + background ASI + level-4 УХ (+2 INT).
    assert a["abilities"]["int"] >= 17
    assert a["slots"]["3"] == 2


def test_create_fighter4_wizard1_equivalence():
    base = _with_int_for_wizard(_base_fighter())
    # Manual method so we can force INT 14 for wizard MC while keeping high STR/CON.
    base["ability_method"] = "manual"
    base["base_abilities"] = {"str": 15, "dex": 13, "con": 14, "int": 14, "wis": 10, "cha": 8}
    plan = {
        "class_levels": [
            {"slug": "fighter", "level": 4, "subclass_slug": "fighter__champion"},
            {"slug": "wizard", "level": 1},
        ],
        "asi_choices": [
            {
                "class_slug": "fighter",
                "class_level": 4,
                "kind": "asi_plus2",
                "abilities": {"str": 2},
            }
        ],
    }
    direct = create24.validate_create_2024(create24.payload_from_dict({**base, **plan}))
    assert direct.level == 5
    slugs = {
        e24.normalize_class_slug(str(r.get("slug") or r.get("name") or "")): int(r.get("level") or 0)
        for r in direct.sheet["classes"]
    }
    assert slugs["fighter"] == 4
    assert slugs["wizard"] == 1

    sequential = create24.validate_create_2024(create24.payload_from_dict(base))
    sheet = deepcopy(sequential.sheet)
    for step in levels.expand_level_gains(
        levels.CreateLevelsPlan(
            class_levels=[
                levels.ClassLevelPlan(slug="fighter", level=4, subclass_slug="fighter__champion"),
                levels.ClassLevelPlan(slug="wizard", level=1),
            ],
            asi_choices=[
                levels.AsiChoicePlan(
                    class_slug="fighter",
                    class_level=4,
                    kind="asi_plus2",
                    abilities={"str": 2},
                )
            ],
        )
    ):
        levels.apply_level_gain_2024(sheet, step, primary_slug="fighter")

    assert levels.normalize_sheet_for_equivalence(direct.sheet) == levels.normalize_sheet_for_equivalence(
        sheet
    )


def test_create_paladin2_warlock3():
    payload = build_valid_payload(
        "paladin",
        ability_method="manual",
        base_abilities={"str": 15, "dex": 10, "con": 13, "int": 8, "wis": 12, "cha": 14},
        class_levels=[
            {"slug": "paladin", "level": 2},
            {"slug": "warlock", "level": 3, "subclass_slug": "warlock__fiend-patron"},
        ],
    )
    result = create24.validate_create_2024(create24.payload_from_dict(payload))
    assert result.level == 5
    progress = result.sheet["class_progress_2024"]
    assert progress["multiclass_pact"] is not None
    assert progress["multiclass_slots"]["1"] >= 2


def test_rollback_removes_last_gain_only():
    result = create24.validate_create_2024(
        create24.payload_from_dict(
            _base_wizard(
                class_levels=[{"slug": "wizard", "level": 3, "subclass_slug": "wizard__evoker"}],
            )
        )
    )
    sheet = deepcopy(result.sheet)
    assert sum(int(r["level"]) for r in sheet["classes"]) == 3
    levels.rollback_last_level_gain(sheet)
    assert sum(int(r["level"]) for r in sheet["classes"]) == 2
    # Subclass should be cleared below gate
    row = sheet["classes"][0]
    assert not row.get("subclass_slug")
    levels.rollback_last_level_gain(sheet)
    assert sum(int(r["level"]) for r in sheet["classes"]) == 1
    with pytest.raises(create24.Create2024Error) as exc:
        levels.rollback_last_level_gain(sheet)
    assert exc.value.code == "create_2024_rollback"


def test_multiclass_blocked_without_ability():
    payload = _base_fighter(
        class_levels=[
            {"slug": "fighter", "level": 1},
            {"slug": "wizard", "level": 1},
        ],
    )
    # Ensure INT stays below 13 after ASI.
    payload["ability_method"] = "manual"
    payload["base_abilities"] = {"str": 15, "dex": 13, "con": 14, "int": 8, "wis": 10, "cha": 12}
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert exc.value.code == "create_2024_multiclass"


def test_level1_path_unchanged():
    result = create24.validate_create_2024(create24.payload_from_dict(_base_fighter()))
    assert result.level == 1
    assert len(result.sheet["classes"]) == 1
    assert result.sheet["classes"][0]["level"] == 1
