"""P24-M01: Weapon Mastery on sheet + combat resolution (2024 only)."""

from __future__ import annotations

import pytest

from app.core.config import settings
from app.dnd import weapon_mastery as wm
from app.services.edition_2024_catalog_seed import WEAPON_MASTERY_IDS, load_weapon_mastery_dictionary


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


def test_dictionary_eight_russian_names():
    rows = load_weapon_mastery_dictionary()
    assert {r["id"] for r in rows} == WEAPON_MASTERY_IDS
    by_id = {r["id"]: r["name_ru"] for r in rows}
    assert by_id["cleave"] == "Рассечение"
    assert by_id["graze"] == "Касание"
    assert by_id["nick"] == "Засечка"
    assert by_id["push"] == "Толчок"
    assert by_id["sap"] == "Ослабление"
    assert by_id["slow"] == "Замедление"
    assert by_id["topple"] == "Опрокидывание"
    assert by_id["vex"] == "Смущение"


def test_class_limits_fighter_barbarian_fixed():
    rules = wm.load_class_weapon_mastery_rules()
    assert rules["fighter"].enabled
    assert wm.mastery_limit_for_class(rules["fighter"], 1) == 3
    assert wm.mastery_limit_for_class(rules["fighter"], 4) == 4
    assert wm.mastery_limit_for_class(rules["fighter"], 10) == 5
    assert wm.mastery_limit_for_class(rules["fighter"], 16) == 6
    assert rules["fighter"].change_after_long_rest == 1

    assert rules["barbarian"].melee_only is True
    assert wm.mastery_limit_for_class(rules["barbarian"], 1) == 2
    assert wm.mastery_limit_for_class(rules["barbarian"], 4) == 3
    assert wm.mastery_limit_for_class(rules["barbarian"], 10) == 4

    for slug in ("paladin", "ranger", "rogue"):
        assert rules[slug].enabled
        assert wm.mastery_limit_for_class(rules[slug], 1) == 2
        assert wm.mastery_limit_for_class(rules[slug], 20) == 2
        assert rules[slug].change_after_long_rest == "all"

    for slug in ("wizard", "bard", "cleric", "druid", "monk", "sorcerer", "warlock"):
        assert rules[slug].enabled is False
        assert wm.mastery_limit_for_class(rules[slug], 20) == 0


def test_multiclass_uses_one_class_budget_not_sum():
    # Fighter 1 (3) + Rogue 1 (2) → only one class; pick highest → 3.
    rule, limit = wm.resolve_active_mastery_budget(
        [("fighter", 1), ("rogue", 1)],
    )
    assert rule is not None
    assert rule.slug == "fighter"
    assert limit == 3

    rule2, limit2 = wm.resolve_active_mastery_budget(
        [("fighter", 1), ("rogue", 1)],
        source_class="rogue",
    )
    assert rule2 is not None
    assert rule2.slug == "rogue"
    assert limit2 == 2


def test_2014_rejects_mastery_picks():
    with pytest.raises(wm.WeaponMasteryValidationError) as exc:
        wm.validate_weapon_mastery_update(
            rules_edition="2014",
            previous=None,
            incoming={"known": ["longsword"]},
            sheet={"classes": [{"name": "Воин", "level": 1}]},
        )
    assert exc.value.code == "weapon_mastery_edition_2014"


def test_2014_strip_helper():
    sheet = {"weapon_mastery": {"known": ["dagger"]}, "weapons": []}
    cleaned = wm.strip_weapon_mastery_from_sheet_for_2014(sheet)
    assert "weapon_mastery" not in cleaned
    assert sheet["weapon_mastery"]["known"] == ["dagger"]  # original untouched copy-on-write


def test_validate_limit_fighter_level_1():
    sheet = {"classes": [{"name": "fighter", "level": 1}]}
    ok = wm.validate_weapon_mastery_update(
        rules_edition="2024",
        previous=None,
        incoming={"known": ["longsword", "battleaxe", "longbow"]},
        sheet=sheet,
    )
    assert ok is not None
    assert ok.known == ("longsword", "battleaxe", "longbow")
    assert ok.source_class == "fighter"

    with pytest.raises(wm.WeaponMasteryValidationError) as exc:
        wm.validate_weapon_mastery_update(
            rules_edition="2024",
            previous=None,
            incoming={"known": ["longsword", "battleaxe", "longbow", "dagger"]},
            sheet=sheet,
        )
    assert exc.value.code == "weapon_mastery_limit"


def test_barbarian_melee_only_rejects_longbow():
    sheet = {"classes": [{"name": "barbarian", "level": 1}]}
    with pytest.raises(wm.WeaponMasteryValidationError) as exc:
        wm.validate_weapon_mastery_update(
            rules_edition="2024",
            previous=None,
            incoming={"known": ["greataxe", "longbow"]},
            sheet=sheet,
        )
    assert exc.value.code == "weapon_mastery_weapon_not_allowed"


def test_swap_locked_without_long_rest():
    sheet = {"classes": [{"name": "fighter", "level": 1}]}
    prev = {
        "known": ["longsword", "battleaxe", "dagger"],
        "baseline": ["longsword", "battleaxe", "dagger"],
        "source_class": "fighter",
        "swap_available": False,
    }
    with pytest.raises(wm.WeaponMasteryValidationError) as exc:
        wm.validate_weapon_mastery_update(
            rules_edition="2024",
            previous=prev,
            incoming={
                "known": ["longsword", "battleaxe", "shortsword"],
                "source_class": "fighter",
                "swap_available": False,
            },
            sheet=sheet,
        )
    assert exc.value.code == "weapon_mastery_swap_locked"


def test_fighter_long_rest_swap_one_weapon():
    sheet = {"classes": [{"name": "fighter", "level": 1}]}
    prev = {
        "known": ["longsword", "battleaxe", "dagger"],
        "baseline": ["longsword", "battleaxe", "dagger"],
        "source_class": "fighter",
        "swap_available": True,
    }
    ok = wm.validate_weapon_mastery_update(
        rules_edition="2024",
        previous=prev,
        incoming={
            "known": ["longsword", "battleaxe", "shortsword"],
            "source_class": "fighter",
            "swap_available": True,
        },
        sheet=sheet,
    )
    assert ok is not None
    assert ok.known == ("longsword", "battleaxe", "shortsword")
    assert ok.swap_available is False
    assert ok.baseline == ok.known

    with pytest.raises(wm.WeaponMasteryValidationError) as exc:
        wm.validate_weapon_mastery_update(
            rules_edition="2024",
            previous=prev,
            incoming={
                "known": ["rapier", "scimitar", "shortsword"],
                "source_class": "fighter",
                "swap_available": True,
            },
            sheet=sheet,
        )
    assert exc.value.code == "weapon_mastery_swap_limit"


def test_rogue_long_rest_can_swap_all():
    sheet = {
        "classes": [{"name": "rogue", "level": 1}],
        "proficiency": {"weapons": {"simple": True, "martial": False}},
    }
    prev = {
        "known": ["dagger", "shortsword"],
        "baseline": ["dagger", "shortsword"],
        "source_class": "rogue",
        "swap_available": True,
    }
    # shortsword is martial — rogue has martial? typically yes for shortsword.
    # Use dagger + scimitar with martial prof.
    sheet["proficiency"]["weapons"]["martial"] = True
    ok = wm.validate_weapon_mastery_update(
        rules_edition="2024",
        previous=prev,
        incoming={
            "known": ["rapier", "scimitar"],
            "source_class": "rogue",
            "swap_available": True,
        },
        sheet=sheet,
        has_simple_prof=True,
        has_martial_prof=True,
    )
    assert ok is not None
    assert set(ok.known) == {"rapier", "scimitar"}


def test_mark_long_rest_opens_swap():
    state = wm.read_weapon_mastery_state(
        {"known": ["longsword"], "baseline": ["longsword"], "swap_available": False}
    )
    nxt = wm.mark_long_rest_swap(state)
    assert nxt.swap_available is True
    assert nxt.baseline == ("longsword",)


def test_resolve_property_requires_known_weapon():
    assert (
        wm.resolve_effective_mastery_property(
            weapon_slug="greataxe",
            known=["longsword"],
        )
        is None
    )
    assert (
        wm.resolve_effective_mastery_property(
            weapon_slug="greataxe",
            known=["greataxe"],
        )
        == "cleave"
    )


def test_tactical_master_substitute():
    assert (
        wm.resolve_effective_mastery_property(
            weapon_slug="greataxe",
            known=["greataxe"],
            tactical_master=True,
            substitute="push",
        )
        == "push"
    )
    # Without tactical master, substitute ignored.
    assert (
        wm.resolve_effective_mastery_property(
            weapon_slug="greataxe",
            known=["greataxe"],
            tactical_master=False,
            substitute="push",
        )
        == "cleave"
    )
    assert wm.has_tactical_master([("fighter", 9)]) is True
    assert wm.has_tactical_master([("fighter", 8)]) is False


@pytest.mark.parametrize(
    "pid,kwargs,expect_applied",
    [
        ("cleave", {"hit": True}, True),
        ("graze", {"hit": False, "attack_ability_mod": 3}, True),
        ("graze", {"hit": True, "attack_ability_mod": 3}, False),
        ("nick", {"hit": True}, True),
        ("push", {"hit": True}, True),
        ("sap", {"hit": True}, True),
        ("slow", {"hit": True, "damage_dealt": True}, True),
        ("slow", {"hit": True, "damage_dealt": False}, False),
        ("topple", {"hit": True, "attack_ability_mod": 4, "proficiency_bonus": 3}, True),
        ("vex", {"hit": True, "damage_dealt": True}, True),
        ("vex", {"hit": True, "damage_dealt": False}, False),
    ],
)
def test_each_mastery_property(pid, kwargs, expect_applied):
    result = wm.apply_mastery_property(pid, **kwargs)
    assert result.applied is expect_applied
    assert result.name_ru
    if pid == "graze" and expect_applied:
        assert result.effects["graze_damage"] == 3
    if pid == "topple" and expect_applied:
        assert result.effects["save"]["dc"] == 8 + 4 + 3
        assert result.effects["condition_on_fail"] == "prone"
    if pid == "nick" and expect_applied:
        assert result.effects["consumes_bonus_action"] is False


def test_nick_does_not_spend_bonus_and_once_per_turn():
    first = wm.apply_mastery_property("nick", hit=True)
    assert first.applied
    assert first.effects["consumes_bonus_action"] is False
    second = wm.apply_mastery_property("nick", hit=True, nick_already_used=True)
    assert second.applied is False


def test_class_levels_from_sheet_russian_names():
    levels = wm.class_levels_from_sheet(
        {"classes": [{"name": "Воин", "level": 5}, {"name": "Плут", "level": 2}]}
    )
    assert levels == [("fighter", 5), ("rogue", 2)]
