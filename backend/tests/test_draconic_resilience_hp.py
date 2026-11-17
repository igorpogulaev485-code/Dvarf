"""PHB 2014 Draconic Resilience / Dwarven Toughness max-HP averages.

Mirrors frontend `buildMaxHpByLevels` + passive bonuses (source of truth is TS;
this locks the prod formula for sorcerer 1/8/20, multiclass, and hill dwarf).
"""

from __future__ import annotations


def _hit_die_sides(die: str) -> int:
    return int(die.lstrip("dD"))


def _average_face(die: str) -> int:
    return _hit_die_sides(die) // 2 + 1


def build_max_hp(
    *,
    classes: list[tuple[str, int, str]],
    constitution_mod: int,
    draconic_resilience: bool = False,
    dwarven_toughness: bool = False,
) -> int:
    """classes: (name, level, hit_die). First class level 1 uses max die."""
    total = 0
    for class_index, (name, level, die) in enumerate(classes):
        is_sorcerer = "чародей" in name.lower() or "sorcerer" in name.lower()
        for lvl in range(1, level + 1):
            dragon = 1 if draconic_resilience and is_sorcerer else 0
            dwarf = 1 if dwarven_toughness else 0
            if class_index == 0 and lvl == 1:
                gain = _hit_die_sides(die) + constitution_mod + dragon + dwarf
            else:
                gain = _average_face(die) + constitution_mod + dragon + dwarf
            total += max(1, gain)
    return total


def test_draconic_sorcerer_levels_1_8_20_con14() -> None:
    con = 2  # CON 14
    assert (
        build_max_hp(
            classes=[("Чародей", 1, "d6")],
            constitution_mod=con,
            draconic_resilience=True,
        )
        == 9
    )
    assert (
        build_max_hp(
            classes=[("Чародей", 8, "d6")],
            constitution_mod=con,
            draconic_resilience=True,
        )
        == 58
    )
    assert (
        build_max_hp(
            classes=[("Чародей", 8, "d6")],
            constitution_mod=con,
            draconic_resilience=False,
        )
        == 50
    )
    assert (
        build_max_hp(
            classes=[("Чародей", 20, "d6")],
            constitution_mod=con,
            draconic_resilience=True,
        )
        == 142
    )


def test_draconic_multiclass_only_sorcerer_levels() -> None:
    # Sorc 3 / Fighter 2, CON +2 → 9+7+7 + 8+8 = 39
    assert (
        build_max_hp(
            classes=[("Чародей", 3, "d6"), ("Воин", 2, "d10")],
            constitution_mod=2,
            draconic_resilience=True,
        )
        == 39
    )


def test_hill_dwarf_plus_draconic() -> None:
    # Fighter 5 hill dwarf: 13 + 9×4 = 49
    assert (
        build_max_hp(
            classes=[("Воин", 5, "d10")],
            constitution_mod=2,
            dwarven_toughness=True,
        )
        == 49
    )
    # Sorcerer 8 both: 50 + 8 + 8 = 66
    assert (
        build_max_hp(
            classes=[("Чародей", 8, "d6")],
            constitution_mod=2,
            draconic_resilience=True,
            dwarven_toughness=True,
        )
        == 66
    )
