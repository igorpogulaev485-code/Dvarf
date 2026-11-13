"""C-02: _parse_companions reads stats.hp/ac and preserves sheet writeback shape."""

from app.services.lobby import (
    _parse_companions,
    _set_companion_vitals,
    _sheet_companions_raw,
)


def test_parse_companions_reads_stats_hp_ac_and_dex():
    raw = [
        {
            "id": "wf1",
            "name": "Искра",
            "kind": "ally",
            "active": True,
            "initiativeMode": "with_master",
            "commandCost": "bonus",
            "stats": {"hp": 30, "hp_max": 30, "ac": 13, "dex": 14},
        }
    ]
    out = _parse_companions(raw)
    assert len(out) == 1
    row = out[0]
    assert row["hp_current"] == 30
    assert row["hp_max"] == 30
    assert row["ac"] == 13
    assert row["dex_mod"] == 2
    assert row["initiative_mode"] == "with_master"
    assert row["command_cost"] == "bonus"


def test_parse_companions_root_fallback():
    raw = [{"id": "x", "name": "Старый", "hp_current": 7, "hp_max": 10, "ac": 12}]
    out = _parse_companions(raw)
    assert out[0]["hp_current"] == 7
    assert out[0]["hp_max"] == 10
    assert out[0]["ac"] == 12


def test_set_companion_vitals_writes_both_root_and_stats():
    item = {
        "id": "c1",
        "name": "Волк",
        "stats": {"hp": 11, "hp_max": 11, "ac": 13},
    }
    _set_companion_vitals(item, hp_current=4, ac=14)
    assert item["hp_current"] == 4
    assert item["stats"]["hp"] == 4
    assert item["ac"] == 14
    assert item["stats"]["ac"] == 14


def test_sheet_companions_raw_preserves_extra_fields():
    sheet = {
        "companions": [
            {
                "id": "c1",
                "name": "Волк",
                "story": True,
                "stats": {"hp": 11, "hp_max": 11},
                "notes": "keep me",
            }
        ]
    }
    raw = _sheet_companions_raw(sheet)
    assert raw[0]["story"] is True
    assert raw[0]["notes"] == "keep me"
