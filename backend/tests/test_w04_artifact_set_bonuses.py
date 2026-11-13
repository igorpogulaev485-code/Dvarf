"""W-04: сложение бонусов сета 2 / 3 / 4+ на листе."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

from app.services.artifact_apply import (
    apply_artifact_to_sheet,
    count_active_set_pieces,
    recompute_set_bonuses,
    set_def_from_row,
)


def _piece(name: str, *, ac: int = 0, requires: bool = False):
    return SimpleNamespace(
        id=uuid4(),
        name=name,
        rarity="редкий",
        description=f"Часть {name}",
        requires_attunement=requires,
        abilities=[
            {
                "kind": "passive",
                "name": f"+{ac} КД" if ac else "черта",
                "bonus_target": "ac",
                "bonus_value": ac,
            }
        ]
        if ac
        else [{"kind": "trait", "name": "часть", "text": name}],
        attack_damage="",
        attack_damage_type="",
        attack_ability="str",
        attack_range_kind="melee",
        weight_lb=None,
    )


def _set_def(member_ids: list, *, name: str = "Сет бури"):
    return {
        "id": str(uuid4()),
        "name": name,
        "member_ids": [str(x) for x in member_ids],
        "thresholds": [
            {
                "pieces": 2,
                "abilities": [
                    {
                        "kind": "passive",
                        "name": "за 2",
                        "bonus_target": "ac",
                        "bonus_value": 1,
                    }
                ],
                "player_text": "Две части",
            },
            {
                "pieces": 3,
                "abilities": [
                    {
                        "kind": "passive",
                        "name": "за 3",
                        "bonus_target": "attack",
                        "bonus_value": 1,
                    }
                ],
                "player_text": "Три части",
            },
        ],
    }


def _set_bonus_items(sheet: dict) -> list[dict]:
    items = (sheet.get("inventory") or {}).get("items") or []
    return [i for i in items if isinstance(i, dict) and i.get("artifact_set_bonus")]


def test_set_bonuses_stack_and_rollback():
    a = _piece("Кольцо", ac=1)
    b = _piece("Амулет", ac=1)
    c = _piece("Пояс", ac=0)
    sdef = _set_def([a.id, b.id, c.id])

    sheet: dict = {"inventory": {"items": [], "coins": {}}, "attunements": []}
    apply_artifact_to_sheet(sheet, artifact=a)
    apply_artifact_to_sheet(sheet, artifact=b)
    recompute_set_bonuses(sheet, [sdef])

    bonuses = _set_bonus_items(sheet)
    assert len(bonuses) == 1
    assert bonuses[0]["threshold_pieces"] == 2
    assert any(e.get("type") == "ac_bonus" and e.get("value") == 1 for e in bonuses[0]["effects"])

    apply_artifact_to_sheet(sheet, artifact=c)
    recompute_set_bonuses(sheet, [sdef])
    bonuses = _set_bonus_items(sheet)
    assert {b["threshold_pieces"] for b in bonuses} == {2, 3}

    # Снять одну часть (unequip)
    for item in sheet["inventory"]["items"]:
        if item.get("setting_artifact_id") == str(c.id):
            item["equipped"] = False
            break
    recompute_set_bonuses(sheet, None)
    bonuses = _set_bonus_items(sheet)
    assert len(bonuses) == 1
    assert bonuses[0]["threshold_pieces"] == 2


def test_attunement_required_piece_not_counted_until_attuned():
    a = _piece("Клинок", ac=1, requires=True)
    b = _piece("Щит", ac=1, requires=False)
    sdef = _set_def([a.id, b.id])

    sheet: dict = {"inventory": {"items": [], "coins": {}}, "attunements": []}
    # requires_attunement=True → apply пытается аттюнить если есть слот
    # Заполним 3 слота заранее, чтобы a не аттюнился
    sheet["attunements"] = [
        {"id": "1", "item_id": "x", "name": "A"},
        {"id": "2", "item_id": "y", "name": "B"},
        {"id": "3", "item_id": "z", "name": "C"},
    ]
    apply_artifact_to_sheet(sheet, artifact=a)
    apply_artifact_to_sheet(sheet, artifact=b)
    recompute_set_bonuses(sheet, [sdef])
    assert count_active_set_pieces(sheet, sdef["member_ids"]) == 1
    assert _set_bonus_items(sheet) == []

    # Аттюним a вручную (освободим слот)
    sheet["attunements"] = [{"id": "1", "item_id": sheet["inventory"]["items"][0]["id"], "name": a.name}]
    for item in sheet["inventory"]["items"]:
        if item.get("setting_artifact_id") == str(a.id):
            item["equipped"] = True
    recompute_set_bonuses(sheet, None)
    assert count_active_set_pieces(sheet, sdef["member_ids"]) == 2
    assert len(_set_bonus_items(sheet)) == 1


def test_set_def_from_orm_like_row():
    aid = uuid4()
    row = SimpleNamespace(
        id=uuid4(),
        name="Сет",
        members=[SimpleNamespace(artifact_id=aid, sort_order=0)],
        thresholds=[{"pieces": 2, "abilities": [{"kind": "trait", "name": "x"}], "player_text": ""}],
    )
    out = set_def_from_row(row)
    assert out["member_ids"] == [str(aid)]
    assert out["thresholds"][0]["pieces"] == 2


def test_multiple_abilities_on_artifact_preserved():
    art = SimpleNamespace(
        id=uuid4(),
        name="Двойной",
        rarity="",
        description="",
        requires_attunement=False,
        abilities=[
            {"kind": "passive", "name": "+1 КД", "bonus_target": "ac", "bonus_value": 1},
            {
                "kind": "companion",
                "companion_name": "Волк",
                "hp_max": 11,
                "ac": 13,
                "name": "Призыв",
            },
        ],
        attack_damage="",
        attack_damage_type="",
        attack_ability="str",
        attack_range_kind="melee",
        weight_lb=None,
    )
    sheet: dict = {"inventory": {"items": [], "coins": {}}, "attunements": [], "companions": [], "resources": []}
    apply_artifact_to_sheet(sheet, artifact=art)
    item = sheet["inventory"]["items"][0]
    kinds = {e.get("type") for e in item["effects"]}
    assert "ac_bonus" in kinds
    assert "companion" in kinds
    assert len(item["artifact_snapshot"]["abilities"]) == 2
