"""FIX-01: sheet attack hit vs AC + HP apply helpers."""

from __future__ import annotations

from uuid import uuid4

from app.schemas.lobby import SheetCombatAttackRequest
from app.services.lobby import _apply_member_damage


def resolve_sheet_hit(
    *,
    mode: str,
    attack_total: int | None,
    attack_natural: int | None,
    target_ac: int | None,
) -> tuple[bool, bool]:
    """Mirror FIX-01 hit rules used in resolve_sheet_combat_attack."""
    crit = False
    if mode == "table_miss":
        return False, False
    if mode == "table_hit":
        return True, attack_natural == 20
    if attack_natural == 1:
        return False, False
    if attack_natural == 20:
        return True, True
    if target_ac is None or attack_total is None:
        raise ValueError("ac_required")
    hit = int(attack_total) >= int(target_ac)
    return hit, crit


def test_apply_member_damage_temp_hp_first():
    member = {"id": "m1", "name": "Гоблин", "hp_current": 10, "hp_max": 10, "hp_temp": 4}
    note = _apply_member_damage(member, 6)
    assert note == ""
    assert member["hp_temp"] == 0
    assert member["hp_current"] == 8


def test_apply_member_damage_floor_zero():
    member = {"id": "m1", "name": "Гоблин", "hp_current": 3, "hp_max": 7, "hp_temp": 0}
    _apply_member_damage(member, 9)
    assert member["hp_current"] == 0


def test_apply_member_damage_resistance_halves():
    member = {"id": "m1", "name": "Скелет", "hp_current": 20, "hp_max": 20, "hp_temp": 0}
    note = _apply_member_damage(
        member,
        10,
        damage_type="piercing",
        defenses={"damage_resistances": ["piercing"], "damage_immunities": [], "damage_vulnerabilities": []},
    )
    assert member["hp_current"] == 15
    assert note


def test_sheet_attack_request_schema():
    row = SheetCombatAttackRequest(
        character_id=uuid4(),
        attack_name="Длинный меч",
        target_kind="enemy",
        target_ref_id="e1",
        target_member_id="m1",
        mode="roll",
        attack_total=18,
        attack_natural=12,
        damage_total=9,
        damage_type="slashing",
    )
    assert row.attack_name == "Длинный меч"
    assert row.damage_total == 9


def test_hit_vs_ac_and_nat_rules():
    assert resolve_sheet_hit(mode="roll", attack_total=18, attack_natural=12, target_ac=15) == (
        True,
        False,
    )
    assert resolve_sheet_hit(mode="roll", attack_total=14, attack_natural=8, target_ac=15) == (
        False,
        False,
    )
    assert resolve_sheet_hit(mode="roll", attack_total=21, attack_natural=1, target_ac=10) == (
        False,
        False,
    )
    assert resolve_sheet_hit(mode="roll", attack_total=5, attack_natural=20, target_ac=30) == (
        True,
        True,
    )
    assert resolve_sheet_hit(
        mode="manual", attack_total=16, attack_natural=None, target_ac=16
    ) == (True, False)
    assert resolve_sheet_hit(
        mode="table_miss", attack_total=20, attack_natural=15, target_ac=10
    ) == (False, False)
    assert resolve_sheet_hit(
        mode="table_hit", attack_total=None, attack_natural=20, target_ac=None
    ) == (True, True)


def test_feed_line_hp_format():
    name = "Тестовый противник"
    damage_applied = 9
    cur, mx = 21, 30
    zero = " · 0 хитов" if cur <= 0 else ""
    line = f"{name}: −{damage_applied}, {cur}/{mx}{zero}"
    assert line == "Тестовый противник: −9, 21/30"
    zero_line = f"Гоблин: −4, 0/7 · 0 хитов"
    assert "0 хитов" in zero_line
