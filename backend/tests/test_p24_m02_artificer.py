"""P24-M02-artificer: 2024 EFA Artificer tables, names, pools, subclasses."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from tests.test_p24_m03_create import build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

# level -> (prepared, cantrips, slots 1..5, plans_known|None, magic_items|None)
ARTIFICER_TABLE = {
    1: (2, 2, (2, 0, 0, 0, 0), None, None),
    2: (3, 2, (2, 0, 0, 0, 0), 4, 2),  # L2 1st slots = 2 (not 3)
    3: (4, 2, (3, 0, 0, 0, 0), 4, 2),
    5: (6, 2, (4, 2, 0, 0, 0), 4, 2),
    11: (10, 3, (4, 3, 3, 0, 0), 6, 4),
    20: (15, 4, (4, 3, 3, 3, 2), 8, 6),
}

ARTIFICER_FEATURE_NAMES_RU = {
    "spellcasting": "Сотворение заклинаний",
    "magic-of-making": "Магия вещей",
    "replicate-magic-item": "Реплики магических предметов",
    "artificer-subclass": "Подкласс артефактора",
    "magic-item-tinker": "Магический мастеровой",
    "flash-of-genius": "Вспышка гениальности",
    "magic-item-adept": "Адепт магических предметов",
    "spell-storing-item": "Предмет, хранящий заклинание",
    "magic-item-savant": "Изобретательность",
    "magic-item-master": "Мастер магических предметов",
    "soul-of-artifice": "Душа творения",
}

FORBIDDEN_FEATURE_NAME_FRAGMENTS = ("Проблеск", "Искусник")

EFA_ARTIFICER_SUBCLASSES = {
    "artificer__alchemist": "Алхимик",
    "artificer__armorer": "Бронник",
    "artificer__artillerist": "Артиллерист",
    "artificer__battle-smith": "Боевой кузнец",
    "artificer__cartographer": "Картограф",
}

OUT_OF_PACK_ARTIFICER_SUBCLASSES = {
    "artificer__reanimator",
}

_ABILITIES = {"str": 10, "dex": 12, "con": 14, "int": 16, "wis": 10, "cha": 8}


def _artificer_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["artificer"]["data"]
    out: dict[str, dict] = {}
    for row in data["levels"]:
        for feat in row.get("features") or []:
            out[feat["id"]] = feat
    return out


def _alchemist_subclass_features() -> dict[str, dict]:
    data = e24.load_subclass_catalog()["artificer__alchemist"]["data"]
    out: dict[str, dict] = {}
    for block in data.get("features") or []:
        for feat in block.get("features") or []:
            out[feat["id"]] = feat
    return out


def _pool_max(snap, pool_id: str) -> int | None:
    for r in snap.resources:
        if r.pool_id == pool_id:
            return int(r.max)
    return None


def _snap(level: int, *, subclass: str | None = "artificer__alchemist", abilities=_ABILITIES):
    row: dict = {"slug": "artificer", "level": level}
    if level >= 3 and subclass:
        row["subclass_slug"] = subclass
    return e24.compute_progression([row], abilities=abilities)


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


def test_artificer_class_name_ru():
    row = e24.load_class_catalog()["artificer"]
    assert row["name_ru"] == "Артефактор"


def test_artificer_feature_names_ru_final_list():
    feats = _artificer_features()
    for fid, name in ARTIFICER_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid
    blob = json.dumps(feats, ensure_ascii=False)
    for forbidden in FORBIDDEN_FEATURE_NAME_FRAGMENTS:
        assert forbidden not in blob


@pytest.mark.parametrize("level", sorted(ARTIFICER_TABLE))
def test_artificer_progression_table(level: int):
    prepared, cantrips, slots, plans, items = ARTIFICER_TABLE[level]
    snap = e24.compute_progression(
        [{"slug": "artificer", "level": level}],
        abilities=_ABILITIES,
    )
    assert snap.proficiency_bonus == e24.proficiency_bonus_for_level(level)
    block = snap.spellcasting[0]
    assert block.prepared_spells == prepared
    assert block.cantrips == cantrips
    assert tuple(int(snap.multiclass_slots.get(str(c), 0)) for c in range(1, 6)) == slots
    assert snap.scales.get("artificer:replicate_plans_known") == plans
    assert snap.scales.get("artificer:replicate_magic_items") == items


def test_artificer_l2_first_circle_slots_are_two_not_three():
    snap = e24.compute_progression([{"slug": "artificer", "level": 2}], abilities=_ABILITIES)
    assert snap.multiclass_slots["1"] == 2
    assert snap.spellcasting[0].slots["1"] == 2


def test_magic_of_making_and_flash_of_genius_int_mod_pools():
    snap1 = _snap(1, subclass=None)
    assert _pool_max(snap1, "magic_of_making") == 3  # INT 16 → +3
    assert _pool_max(snap1, "flash_of_genius") is None

    snap6 = _snap(6, subclass=None)
    assert _pool_max(snap6, "magic_of_making") == 3
    assert _pool_max(snap6, "flash_of_genius") is None

    snap7 = _snap(7, subclass=None)
    assert _pool_max(snap7, "magic_of_making") == 3
    assert _pool_max(snap7, "flash_of_genius") == 3

    low_int = {**_ABILITIES, "int": 12}  # +1
    snap7_low = e24.compute_progression(
        [{"slug": "artificer", "level": 7}],
        abilities=low_int,
    )
    assert _pool_max(snap7_low, "magic_of_making") == 1
    assert _pool_max(snap7_low, "flash_of_genius") == 1


def test_mending_always_prepared_not_counted_in_cantrip_column():
    for level in (1, 2, 5, 11, 20):
        snap = e24.compute_progression(
            [{"slug": "artificer", "level": level}],
            abilities=_ABILITIES,
        )
        block = snap.spellcasting[0]
        assert "mending" in block.always_prepared
        assert block.cantrips == ARTIFICER_TABLE[level][1]
        # Mending is free / always prepared — not an extra cantrip column tick.
        row = e24.class_level_row("artificer", level)
        assert int((row.get("spellcasting") or {}).get("cantrips") or 0) == block.cantrips


def test_efa_artificer_subclasses_present_and_named():
    names: dict[str, str] = {}
    data = json.loads((BACKEND_LIVE / "subclasses_efa.json").read_text(encoding="utf-8"))
    for e in data["entries"]:
        if e["slug"].startswith("artificer__"):
            names[e["slug"]] = e["name_ru"]
    assert names == EFA_ARTIFICER_SUBCLASSES


def test_reanimator_not_in_subclasses_efa_catalog():
    data = json.loads((BACKEND_LIVE / "subclasses_efa.json").read_text(encoding="utf-8"))
    efa_slugs = {e["slug"] for e in data["entries"]}
    assert "artificer__reanimator" not in efa_slugs
    for slug in OUT_OF_PACK_ARTIFICER_SUBCLASSES:
        assert slug not in efa_slugs
        # May live in another pack (e.g. RTW) but must not be treated as EFA create set.
        assert slug not in EFA_ARTIFICER_SUBCLASSES


def test_alchemist_experimental_elixir_and_restorative_reagents():
    snap3 = e24.compute_progression(
        [{"slug": "artificer", "level": 3, "subclass_slug": "artificer__alchemist"}],
        abilities=_ABILITIES,
    )
    assert _pool_max(snap3, "experimental_elixir") == 2
    assert _pool_max(snap3, "restorative_reagents") is None

    snap9 = e24.compute_progression(
        [{"slug": "artificer", "level": 9, "subclass_slug": "artificer__alchemist"}],
        abilities=_ABILITIES,
    )
    assert _pool_max(snap9, "restorative_reagents") == 3  # INT 16 → +3
    reagents = _alchemist_subclass_features()["restorative-reagents"]
    blob = json.dumps(reagents, ensure_ascii=False).lower()
    # 2024 EFA: no 2014-style temporary-HP wording on Restorative Reagents.
    for needle in ("временн", "temp hp", "temporary hit", "временные хиты"):
        assert needle not in blob


def test_multiclass_proficiencies_and_half_up_caster():
    prof = e24.multiclass_proficiencies_for("artificer")
    assert prof["skills"] == 1
    assert prof["tools"] == ["tinkers_tools"]
    assert prof["weapons"] == []
    assert prof["armor"] == ["light", "medium", "shields"]

    assert e24.CASTER_PROGRESSION["artificer"] == "half_up"
    assert e24.multiclass_caster_level([("artificer", 1)]) == 1
    assert e24.multiclass_caster_level([("artificer", 2)]) == 1
    assert e24.multiclass_caster_level([("artificer", 3)]) == 2
    assert e24.multiclass_caster_level([("artificer", 5)]) == 3

    snap = e24.compute_progression(
        [
            {"slug": "artificer", "level": 5, "subclass_slug": "artificer__alchemist"},
            {"slug": "wizard", "level": 2},
        ],
        abilities=_ABILITIES,
    )
    assert e24.multiclass_caster_level([("artificer", 5), ("wizard", 2)]) == 5
    assert snap.multiclass_slots["1"] == 4
    assert snap.multiclass_slots["2"] == 3
    assert snap.multiclass_slots["3"] == 2


@pytest.mark.parametrize("name", ["classes_efa.json", "subclasses_efa.json"])
def test_frontend_efa_catalog_copy_is_byte_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def test_homunculus_servant_spell_in_spells_efa():
    data = json.loads((BACKEND_LIVE / "spells_efa.json").read_text(encoding="utf-8"))
    slugs = {e["slug"] for e in data["entries"]}
    assert "homunculus-servant" in slugs
    spell = next(e for e in data["entries"] if e["slug"] == "homunculus-servant")
    classes = (spell.get("data") or {}).get("classes") or []
    assert "artificer" in classes
    # Also on the Artificer class spell list.
    art = e24.load_class_catalog()["artificer"]["data"]
    assert "homunculus-servant" in art["spell_list"]


def test_create_artificer_alchemist_at_3():
    payload = build_valid_payload(
        "artificer",
        ability_method="manual",
        base_abilities=_ABILITIES,
        subclass_slug="artificer__alchemist",
        class_levels=[{"slug": "artificer", "level": 3, "subclass_slug": "artificer__alchemist"}],
    )
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert sheet["classes"][0]["name_ru"] == "Артефактор"
    assert sheet["classes"][0]["subclass_slug"] == "artificer__alchemist"
    plans = (sheet.get("class_options_2024") or {}).get("replicate_plans") or []
    assert len(plans) == 4
    resources = (sheet.get("class_progress_2024") or {}).get("resources") or []
    elixir = next(r for r in resources if r.get("pool_id") == "experimental_elixir")
    assert elixir["max"] == 2
    mom = next(r for r in resources if r.get("pool_id") == "magic_of_making")
    assert mom["max"] == 3


def test_create_artificer_plans_and_ssi_at_11():
    plans = [
        "bag-of-holding",
        "sending-stones",
        "cap-of-water-breathing",
        "goggles-of-night",
        "alchemy-jug",
        "lantern-of-revealing",
    ]
    payload = build_valid_payload(
        "artificer",
        ability_method="manual",
        base_abilities=_ABILITIES,
        subclass_slug="artificer__alchemist",
        class_levels=[{"slug": "artificer", "level": 11, "subclass_slug": "artificer__alchemist"}],
    )
    payload["class_option_picks"] = {
        **(payload.get("class_option_picks") or {}),
        "replicate_plans": plans,
        "spell_storing_spell": "cure-wounds",
    }
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    opts = sheet.get("class_options_2024") or {}
    assert opts.get("replicate_plans") == plans
    assert opts.get("spell_storing_spell") == "cure-wounds"
    values = (sheet.get("feature_picks") or {}).get("values") or {}
    assert any(str(v) == "cure-wounds" for k, v in values.items() if "spell_stor" in k)


def test_artillerist_summary_ru_uses_approved_firearm_name():
    data = json.loads((BACKEND_LIVE / "subclasses_efa.json").read_text(encoding="utf-8"))
    row = next(e for e in data["entries"] if e["slug"] == "artificer__artillerist")
    summary = (row.get("data") or {}).get("summary_ru") or ""
    assert "Магическое огнестрельное" in summary
    assert "магострельн" not in summary.lower()
