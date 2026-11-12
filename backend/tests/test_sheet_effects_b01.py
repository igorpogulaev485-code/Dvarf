"""B-01: parse_effects duration/mods + linked clear includes caster."""

from app.services.sheet_effects import (
    normalize_effect_payload,
    parse_effects,
    replace_infusion_effects,
)


def test_parse_effects_keeps_legacy_and_mods():
    rows = parse_effects(
        [
            {
                "id": "1",
                "name": "Улучшенная защита · +1 КД",
                "source_character_id": "art",
                "linked_concentration": False,
                "ac_bonus": 1,
            },
            {
                "id": "2",
                "name": "Щит веры",
                "kind": "spell",
                "slug": "shield_of_faith",
                "source_character_id": "cleric",
                "source_name": "Жрец",
                "linked_concentration": True,
                "duration": {"unit": "minutes", "value": 10},
                "mods": [{"target": "ac", "op": "add", "value": 2}],
            },
        ]
    )
    assert rows[0]["ac_bonus"] == 1
    assert rows[1]["slug"] == "shield_of_faith"
    assert rows[1]["mods"][0]["value"] == 2
    assert rows[1]["duration"]["remaining_rounds"] == 100


def test_normalize_effect_payload_defaults_started_at():
    row = normalize_effect_payload(
        {
            "name": "Благословение",
            "slug": "bless",
            "kind": "spell",
            "linked_concentration": True,
            "mods": [{"target": "attack_save", "op": "roll_die", "dice": "1d4"}],
            "duration": {"unit": "minutes", "value": 1},
        }
    )
    assert row["duration"]["remaining_rounds"] == 10
    assert "started_at" in row["duration"]


def test_infusion_replace_keeps_bless():
    effects = [
        {
            "id": "1",
            "name": "Улучшенная защита · +1 КД",
            "source_character_id": "art",
            "origin": "infusion",
            "ac_bonus": 1,
            "linked_concentration": False,
        },
        {
            "id": "2",
            "name": "Благословение",
            "source_character_id": "art",
            "linked_concentration": True,
        },
    ]
    nxt = replace_infusion_effects(
        effects,
        "art",
        [
            {
                "id": "3",
                "name": "Улучшенная защита",
                "source_character_id": "art",
                "origin": "infusion",
                "kind": "infusion",
                "slug": "enhanced_defense",
                "ac_bonus": 2,
                "mods": [{"target": "ac", "op": "add", "value": 2}],
                "linked_concentration": False,
            }
        ],
    )
    assert [row["id"] for row in nxt] == ["2", "3"]
    assert nxt[1]["mods"][0]["value"] == 2
