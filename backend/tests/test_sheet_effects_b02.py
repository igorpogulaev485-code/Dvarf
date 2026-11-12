"""B-02: hp_max / temp_hp apply and revert on effect append/clear."""

from types import SimpleNamespace
from unittest.mock import patch

from app.services.sheet_effects import (
    append_effect,
    clear_linked_effects_on_character,
    normalize_effect_payload,
)


def _char(hp_max=44, hp_current=30, hp_temp=0):
    return SimpleNamespace(
        sheet={
            "combat": {
                "hp_max": hp_max,
                "hp_current": hp_current,
                "hp_temp": hp_temp,
                "effects": [],
            }
        },
        sheet_version=1,
        hp_max=hp_max,
        hp_current=hp_current,
    )


@patch("app.services.sheet_effects.flag_modified")
def test_aid_raises_hp_max_and_current(_flag):
    character = _char()
    row = normalize_effect_payload(
        {
            "name": "Подмога",
            "slug": "aid",
            "kind": "spell",
            "mods": [{"target": "hp_max", "op": "add", "value": 10}],
            "duration": {"unit": "hours", "value": 8},
        }
    )
    append_effect(
        character,
        name="Подмога",
        source_character_id="cleric",
        source_name="Жрец",
        linked_concentration=False,
        effect=row,
    )
    combat = character.sheet["combat"]
    assert combat["hp_max"] == 54
    assert combat["hp_current"] == 40
    assert character.hp_max == 54


@patch("app.services.sheet_effects.flag_modified")
def test_clear_linked_reverts_hp_and_temp(_flag):
    character = _char(hp_max=54, hp_current=50, hp_temp=50)
    character.sheet["combat"]["effects"] = [
        {
            "id": "t1",
            "name": "Трансформация Тензера",
            "slug": "tensers_transformation",
            "source_character_id": "wiz",
            "linked_concentration": True,
            "mods": [
                {
                    "target": "temp_hp",
                    "op": "set",
                    "value": 50,
                    "condition": "clear_on_end",
                },
            ],
        },
        {
            "id": "a1",
            "name": "Подмога",
            "slug": "aid",
            "source_character_id": "cleric",
            "linked_concentration": False,
            "mods": [{"target": "hp_max", "op": "add", "value": 10}],
        },
    ]
    removed = clear_linked_effects_on_character(character, "wiz")
    assert removed == 1
    combat = character.sheet["combat"]
    assert combat["hp_temp"] == 0
    # Aid remains — max stays 54
    assert combat["hp_max"] == 54
    assert len(combat["effects"]) == 1
