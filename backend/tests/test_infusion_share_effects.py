"""Ally infusion marks: replace on sync, keep AC on the effect."""

from app.services.sheet_effects import replace_infusion_effects


def test_sync_replaces_infusion_and_keeps_other_effects():
    effects = [
        {
            "id": "1",
            "name": "Усиленная защита · +1 КД",
            "source_character_id": "art",
            "source_name": "Изобретатель",
            "linked_concentration": False,
        },
        {
            "id": "2",
            "name": "Благословение",
            "source_character_id": "art",
            "source_name": "Изобретатель",
            "linked_concentration": True,
        },
    ]
    nxt = replace_infusion_effects(
        effects,
        "art",
        [
            {
                "id": "3",
                "name": "Усиленная защита · +2 КД",
                "source_character_id": "art",
                "source_name": "Изобретатель",
                "linked_concentration": False,
                "origin": "infusion",
                "ac_bonus": 2,
            }
        ],
    )
    assert [row["id"] for row in nxt] == ["2", "3"]
    assert nxt[1]["ac_bonus"] == 2


def test_sync_with_no_rows_removes_the_infusion():
    effects = [
        {
            "id": "1",
            "name": "Усиленная защита · +1 КД",
            "source_character_id": "art",
            "linked_concentration": False,
            "origin": "infusion",
            "ac_bonus": 1,
        }
    ]
    assert replace_infusion_effects(effects, "art", []) == []
