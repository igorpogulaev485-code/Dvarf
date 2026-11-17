"""P24-M02-paladin: 2024 paladin tables, Lay on Hands, Channel Divinity, PHB oaths."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_subclasses as sub24
from tests.test_p24_m03_create import build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

# level -> (prepared, channel_divinity max, lay_on_hands max, slot counts 1..5)
PALADIN_TABLE = {
    1: (2, 0, 5, (2, 0, 0, 0, 0)),
    2: (3, 0, 10, (2, 0, 0, 0, 0)),
    3: (4, 2, 15, (3, 0, 0, 0, 0)),
    5: (6, 2, 25, (4, 2, 0, 0, 0)),
    6: (6, 2, 30, (4, 2, 0, 0, 0)),
    9: (9, 2, 45, (4, 3, 2, 0, 0)),
    10: (9, 2, 50, (4, 3, 2, 0, 0)),
    11: (10, 3, 55, (4, 3, 3, 0, 0)),
    14: (11, 3, 70, (4, 3, 3, 1, 0)),
    17: (14, 3, 85, (4, 3, 3, 3, 1)),
    18: (14, 3, 90, (4, 3, 3, 3, 1)),
    19: (15, 3, 95, (4, 3, 3, 3, 2)),
    20: (15, 3, 100, (4, 3, 3, 3, 2)),
}

PALADIN_FEATURE_NAMES_RU = {
    "lay-on-hands": "Возложение рук",
    "spellcasting": "Сотворение заклинаний",
    "weapon-mastery": "Оружейное мастерство",
    "fighting-style": "Боевой стиль",
    "paladins-smite": "Кара паладина",
    "channel-divinity": "Проведение божественности",
    "paladin-subclass": "Подкласс Паладина",
    "extra-attack": "Дополнительная атака",
    "faithful-steed": "Верный скакун",
    "aura-of-protection": "Аура защиты",
    "abjure-foes": "Порицание врагов",
    "aura-of-courage": "Аура отваги",
    "radiant-strikes": "Сияющие удары",
    "restoring-touch": "Восстанавливающее касание",
    "aura-expansion": "Расширение ауры",
    "epic-boon": "Эпический дар",
}

PHB_OATHS = {
    "paladin__oath-of-devotion": "Клятва преданности",
    "paladin__oath-of-glory": "Клятва славы",
    "paladin__oath-of-the-ancients": "Клятва древних",
    "paladin__oath-of-vengeance": "Клятва мести",
}

OUT_OF_PACK_OATHS = {
    "paladin__oath-of-the-noble-genies",
}

OATH_SPELLS_L3 = {
    "paladin__oath-of-devotion": {"protection-from-evil-and-good", "shield-of-faith"},
    "paladin__oath-of-glory": {"heroism", "guiding-bolt"},
    "paladin__oath-of-the-ancients": {"ensnaring-strike", "speak-with-animals"},
    "paladin__oath-of-vengeance": {"hunters-mark", "bane"},
}

_ABILITIES = {"str": 16, "dex": 10, "con": 14, "int": 8, "wis": 10, "cha": 16}


def _paladin_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["paladin"]["data"]
    out: dict[str, dict] = {}
    for row in data["levels"]:
        for feat in row.get("features") or []:
            out[feat["id"]] = feat
    return out


def _resource_rows(level: int, *, subclass: str | None = None) -> list[dict]:
    levels = [{"slug": "paladin", "level": level}]
    if subclass:
        levels[0]["subclass_slug"] = subclass
    snap = e24.compute_progression(levels, abilities=_ABILITIES)
    return [
        {
            "id": r.id,
            "pool_id": r.pool_id,
            "max": r.max,
            "used": r.max,
            "reset": r.reset,
            "short_rest_regain": r.short_rest_regain,
            "name": r.name_ru,
        }
        for r in snap.resources
    ]


def _opts(pool_meta: dict) -> list[str]:
    return list(pool_meta.get("channel_options") or [])


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("level", sorted(PALADIN_TABLE))
def test_paladin_progression_table(level: int):
    prepared, channel, loh, slots = PALADIN_TABLE[level]
    snap = e24.compute_progression([{"slug": "paladin", "level": level}], abilities=_ABILITIES)
    block = snap.spellcasting[0]
    assert block.prepared_spells == prepared
    assert block.cantrips == 0
    assert tuple(int(snap.multiclass_slots.get(str(c), 0)) for c in range(1, 6)) == slots
    pools = {r.pool_id: r for r in snap.resources}
    assert pools["lay_on_hands_hp"].max == loh
    assert pools["lay_on_hands_hp"].name_ru == "Возложение рук"
    assert pools["lay_on_hands_hp"].reset == "long"
    assert pools["lay_on_hands_hp"].short_rest_regain is None
    if channel:
        assert pools["channel_divinity"].max == channel
        assert pools["channel_divinity"].name_ru == "Проведение божественности"
        assert pools["channel_divinity"].short_rest_regain == 1
    else:
        assert "channel_divinity" not in pools


def test_paladin_feature_names_ru():
    feats = _paladin_features()
    for fid, name in PALADIN_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid


@pytest.mark.parametrize(
    "level,present,absent",
    [
        (
            1,
            {"Возложение рук", "Сотворение заклинаний", "Оружейное мастерство"},
            {"Проведение божественности", "Божественное чувство", "Божественное здоровье"},
        ),
        (
            2,
            {"Боевой стиль", "Кара паладина"},
            {"Проведение божественности", "Божественное чувство"},
        ),
        (
            3,
            {"Проведение божественности"},
            {"Порицание врагов", "Аура защиты", "Сияющие удары"},
        ),
        (5, {"Дополнительная атака", "Верный скакун"}, {"Аура защиты"}),
        (6, {"Аура защиты"}, {"Аура отваги", "Порицание врагов"}),
        (9, {"Порицание врагов"}, {"Аура отваги"}),
        (10, {"Аура отваги"}, {"Сияющие удары"}),
        (11, {"Сияющие удары"}, {"Восстанавливающее касание"}),
        (14, {"Восстанавливающее касание"}, {"Расширение ауры"}),
        (18, {"Расширение ауры"}, set()),
        (19, {"Эпический дар"}, set()),
    ],
)
def test_paladin_features_by_level(level: int, present: set[str], absent: set[str]):
    names = {
        f.name_ru for f in e24.compute_progression([{"slug": "paladin", "level": level}]).features
    }
    assert present <= names
    assert not (absent & names)


def test_paladin_has_weapon_mastery_two():
    data = e24.load_class_catalog()["paladin"]["data"]
    assert data["weapon_mastery"]["enabled"] is True
    assert create24._weapon_mastery_limit("paladin") == 2
    snap = e24.compute_progression([{"slug": "paladin", "level": 1}])
    assert snap.scales.get("paladin:weapon_mastery") == 2


def test_paladin_subclass_level_is_3():
    assert e24.load_class_catalog()["paladin"]["data"]["subclass_level"] == 3


def test_phb_oaths_present_and_named():
    names: dict[str, str] = {}
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        for e in data["entries"]:
            if e["slug"] in PHB_OATHS:
                names[e["slug"]] = e["name_ru"]
    assert names == PHB_OATHS


def test_out_of_pack_oaths_not_in_phb_files():
    catalog = e24.load_subclass_catalog()
    for slug in OUT_OF_PACK_OATHS:
        assert slug in catalog
        assert slug not in PHB_OATHS
    in_phb_files: set[str] = set()
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        in_phb_files |= {
            e["slug"] for e in data["entries"] if e["slug"].startswith("paladin__")
        }
    assert in_phb_files == set(PHB_OATHS)


def test_no_divine_sense_pool_or_l1_feature():
    snap1 = e24.compute_progression([{"slug": "paladin", "level": 1}], abilities=_ABILITIES)
    assert all(r.pool_id not in {"divine_sense", "divine-sense"} for r in snap1.resources)
    assert all("чувство" not in f.name_ru.lower() for f in snap1.features)
    snap3 = e24.compute_progression(
        [{"slug": "paladin", "level": 3, "subclass_slug": "paladin__oath-of-devotion"}],
        abilities=_ABILITIES,
    )
    cd = next(r for r in snap3.resources if r.pool_id == "channel_divinity")
    opts = _opts(cd.meta)
    assert "divine-sense" in opts or "divine_sense" in opts
    assert "abjure-foes" not in opts and "abjure_foes" not in opts


def test_abjure_foes_channel_option_from_9():
    snap8 = e24.compute_progression(
        [{"slug": "paladin", "level": 8, "subclass_slug": "paladin__oath-of-devotion"}],
        abilities=_ABILITIES,
    )
    opts8 = _opts(next(r for r in snap8.resources if r.pool_id == "channel_divinity").meta)
    assert "abjure-foes" not in opts8 and "abjure_foes" not in opts8
    snap9 = e24.compute_progression(
        [{"slug": "paladin", "level": 9, "subclass_slug": "paladin__oath-of-devotion"}],
        abilities=_ABILITIES,
    )
    opts9 = _opts(next(r for r in snap9.resources if r.pool_id == "channel_divinity").meta)
    assert "abjure-foes" in opts9 or "abjure_foes" in opts9


def test_channel_divinity_short_rest_regains_one_not_all():
    rows = _resource_rows(11)
    channel = next(r for r in rows if r["pool_id"] == "channel_divinity")
    assert channel["max"] == 3
    assert channel["short_rest_regain"] == 1
    assert channel["reset"] == "long"

    after_short = e24.apply_short_rest_to_resources(rows)
    ch_short = next(r for r in after_short if r["pool_id"] == "channel_divinity")
    assert ch_short["used"] == 2
    loh_short = next(r for r in after_short if r["pool_id"] == "lay_on_hands_hp")
    assert loh_short["used"] == loh_short["max"]

    after_long = e24.apply_long_rest_to_resources(rows)
    ch_long = next(r for r in after_long if r["pool_id"] == "channel_divinity")
    assert ch_long["used"] == 0
    loh_long = next(r for r in after_long if r["pool_id"] == "lay_on_hands_hp")
    assert loh_long["used"] == 0


def test_free_smite_and_steed_pools():
    snap1 = e24.compute_progression([{"slug": "paladin", "level": 1}], abilities=_ABILITIES)
    assert all(r.pool_id != "paladin_free_smite" for r in snap1.resources)
    snap2 = e24.compute_progression([{"slug": "paladin", "level": 2}], abilities=_ABILITIES)
    smite = next(r for r in snap2.resources if r.pool_id == "paladin_free_smite")
    assert smite.max == 1 and smite.reset == "long"
    assert all(r.pool_id != "paladin_free_steed" for r in snap2.resources)
    assert "divine-smite" in snap2.spellcasting[0].always_prepared

    snap5 = e24.compute_progression([{"slug": "paladin", "level": 5}], abilities=_ABILITIES)
    steed = next(r for r in snap5.resources if r.pool_id == "paladin_free_steed")
    assert steed.max == 1
    always = snap5.spellcasting[0].always_prepared
    assert "divine-smite" in always and "find-steed" in always

    rows = _resource_rows(5)
    after_short = e24.apply_short_rest_to_resources(rows)
    assert next(r for r in after_short if r["pool_id"] == "paladin_free_smite")["used"] == 1
    after_long = e24.apply_long_rest_to_resources(rows)
    assert next(r for r in after_long if r["pool_id"] == "paladin_free_smite")["used"] == 0
    assert next(r for r in after_long if r["pool_id"] == "paladin_free_steed")["used"] == 0


@pytest.mark.parametrize("subclass", sorted(PHB_OATHS))
def test_oath_always_prepared_and_features(subclass: str):
    snap3 = e24.compute_progression(
        [{"slug": "paladin", "level": 3, "subclass_slug": subclass}],
        abilities=_ABILITIES,
    )
    always3 = set(snap3.spellcasting[0].always_prepared)
    assert OATH_SPELLS_L3[subclass] <= always3
    assert "divine-smite" in always3

    snap7 = e24.compute_progression(
        [{"slug": "paladin", "level": 7, "subclass_slug": subclass}],
        abilities=_ABILITIES,
    )
    names7 = {f.name_ru for f in snap7.features}
    assert "Аура защиты" in names7

    snap15 = e24.compute_progression(
        [{"slug": "paladin", "level": 15, "subclass_slug": subclass}],
        abilities=_ABILITIES,
    )
    snap20 = e24.compute_progression(
        [{"slug": "paladin", "level": 20, "subclass_slug": subclass}],
        abilities=_ABILITIES,
    )
    assert snap15.spellcasting[0].prepared_spells == 12
    assert snap20.spellcasting[0].prepared_spells == 15
    always20 = snap20.spellcasting[0].always_prepared
    for spell in sub24.always_prepared_for_subclass(subclass, 17):
        assert spell in always20


def test_glory_inspiring_smite_name_and_glorious_defense_pool():
    opts = {o.feature_id: o for o in sub24.shared_options_for_subclass("paladin__oath-of-glory", 3)}
    assert opts["inspiring-smite"].name_ru == "Воодушевляющая кара"
    assert opts["peerless-athlete"].name_ru == "Непревзойдённый атлет"
    pools = {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            "paladin__oath-of-glory", 15, total_level=15, abilities=_ABILITIES
        )
    }
    assert pools["glorious_defense"].max == 3  # CHA 16 → +3
    assert pools["glorious_defense"].reset == "long"


def test_ancients_undying_sentinel_and_warding_summary():
    pools = {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            "paladin__oath-of-the-ancients", 15, total_level=15, abilities=_ABILITIES
        )
    }
    assert pools["undying_sentinel"].max == 1
    sub = e24.load_subclass_catalog()["paladin__oath-of-the-ancients"]
    warding = None
    for block in sub["data"]["features"]:
        for feat in block.get("features") or []:
            if feat.get("id") == "aura-of-warding":
                warding = feat
    assert warding is not None
    assert "некротическ" in warding["summary_ru"].lower()
    assert "заклинаний" not in warding["summary_ru"].lower()


def test_aura_radius_from_protection_level_6():
    snap5 = e24.compute_progression(
        [{"slug": "paladin", "level": 5, "subclass_slug": "paladin__oath-of-devotion"}]
    )
    assert "paladin:aura_radius_ft" not in snap5.scales
    snap6 = e24.compute_progression(
        [{"slug": "paladin", "level": 6, "subclass_slug": "paladin__oath-of-devotion"}]
    )
    assert snap6.scales["paladin:aura_radius_ft"] == 10
    snap18 = e24.compute_progression(
        [{"slug": "paladin", "level": 18, "subclass_slug": "paladin__oath-of-devotion"}]
    )
    assert snap18.scales["paladin:aura_radius_ft"] == 30


def test_half_up_multiclass_slots():
    # Paladin 5 → 3 caster levels (round up)
    assert e24.multiclass_caster_level([("paladin", 5)]) == 3
    snap = e24.compute_progression(
        [
            {"slug": "paladin", "level": 5, "subclass_slug": "paladin__oath-of-devotion"},
            {"slug": "cleric", "level": 2, "subclass_slug": "cleric__life-domain"},
        ],
        abilities={**_ABILITIES, "wis": 16},
    )
    assert e24.multiclass_caster_level([("paladin", 5), ("cleric", 2)]) == 5
    assert snap.multiclass_slots["1"] == 4
    assert snap.multiclass_slots["2"] == 3
    assert snap.multiclass_slots["3"] == 2


def test_multiclass_paladin_no_heavy_armor():
    prof = e24.multiclass_proficiencies_for("paladin")
    assert "martial" in (prof.get("weapons") or [])
    armor = prof.get("armor") or []
    assert "light" in armor and "medium" in armor and "shields" in armor
    assert "heavy" not in armor


def test_primary_paladin_has_heavy_armor_in_catalog():
    data = e24.load_class_catalog()["paladin"]["data"]
    assert "heavy" in (data.get("armor") or [])


def test_create_paladin_at_1_no_fighting_style_required():
    payload = build_valid_payload("paladin", ability_method="manual", base_abilities=_ABILITIES)
    payload["fighting_style_slug"] = None
    payload["level"] = 1
    # Weapon mastery still required at L1.
    assert len(payload.get("weapon_mastery_ids") or []) == 2
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert sheet["classes"][0]["level"] == 1
    loh = next(
        r
        for r in (sheet.get("class_progress_2024") or {}).get("resources") or []
        if r.get("pool_id") == "lay_on_hands_hp" or "lay_on_hands" in str(r.get("id"))
    )
    assert loh["max"] == 5


def test_create_paladin_fighting_style_from_level_2():
    payload = build_valid_payload("paladin", ability_method="manual", base_abilities=_ABILITIES)
    payload["level"] = 2
    payload["fighting_style_slug"] = "defense"
    # May need prepared spells bump — rely on build_valid_payload defaults + override.
    result = create24.validate_create_2024(create24.payload_from_dict(payload))
    assert result.sheet is not None


def test_create_paladin_blessed_warrior_allowed():
    payload = build_valid_payload("paladin", ability_method="manual", base_abilities=_ABILITIES)
    payload["level"] = 2
    payload["fighting_style_slug"] = "blessed-warrior"
    payload["class_option_picks"] = {
        **(payload.get("class_option_picks") or {}),
        "blessed_warrior_cantrips": ["guidance", "sacred-flame"],
    }
    result = create24.validate_create_2024(create24.payload_from_dict(payload))
    assert result.sheet is not None


@pytest.mark.parametrize(
    "name",
    ["classes_srd.json", "subclasses_srd.json", "subclasses_ph24.json"],
)
def test_frontend_catalog_copy_is_byte_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def test_no_divine_health_on_2024_sheet_features():
    for level in (1, 3, 5, 11, 20):
        names = {
            f.name_ru
            for f in e24.compute_progression(
                [
                    {
                        "slug": "paladin",
                        "level": level,
                        "subclass_slug": "paladin__oath-of-devotion",
                    }
                ]
            ).features
        }
        assert "Божественное здоровье" not in names
        assert "Очищающее касание" not in names
        assert "Улучшенная божественная кара" not in names


def test_l20_capstone_pools():
    for subclass, feat_id in (
        ("paladin__oath-of-devotion", "holy_nimbus"),
        ("paladin__oath-of-glory", "living_legend"),
        ("paladin__oath-of-the-ancients", "elder_champion"),
        ("paladin__oath-of-vengeance", "avenging_angel"),
    ):
        pools = {
            p.pool_id: p
            for p in sub24.build_subclass_resources(
                subclass, 20, total_level=20, abilities=_ABILITIES
            )
        }
        assert pools[feat_id].max == 1
        assert pools[feat_id].reset == "long"


def _snap(level: int, *, subclass: str | None = "paladin__oath-of-devotion"):
    row: dict = {"slug": "paladin", "level": level}
    if level >= 3 and subclass:
        row["subclass_slug"] = subclass
    return e24.compute_progression([row], abilities=_ABILITIES)


def _pool_max(snap, pool_id: str) -> int | None:
    for r in snap.resources:
        if r.pool_id == pool_id:
            return int(r.max)
    return None


def _feature_names(snap) -> set[str]:
    return {f.name_ru for f in snap.features}


def _always(snap) -> set[str]:
    if not snap.spellcasting:
        return set()
    return set(snap.spellcasting[0].always_prepared)


def test_rollback_3_to_2_drops_channel_and_oath_spells_keeps_smite():
    """3→2: channel + subclass always-prepared oath spells gone; Paladin's Smite remains."""
    hi = _snap(3)
    lo = _snap(2)
    assert _pool_max(hi, "channel_divinity") == 2
    assert _pool_max(lo, "channel_divinity") is None
    oath_l3 = OATH_SPELLS_L3["paladin__oath-of-devotion"]
    assert oath_l3 <= _always(hi)
    assert not (oath_l3 & _always(lo))
    assert "divine-smite" in _always(lo)
    assert _pool_max(lo, "paladin_free_smite") == 1
    names_hi, names_lo = _feature_names(hi), _feature_names(lo)
    assert "Проведение божественности" in names_hi
    assert "Проведение божественности" not in names_lo
    assert "Кара паладина" in names_lo
    assert "Священное оружие" in names_hi
    assert "Священное оружие" not in names_lo


def test_rollback_11_to_10_drops_radiant_strikes_and_channel_max():
    """11→10: Radiant Strikes gone; channel max 3→2."""
    hi = _snap(11)
    lo = _snap(10)
    assert _pool_max(hi, "channel_divinity") == 3
    assert _pool_max(lo, "channel_divinity") == 2
    names_hi, names_lo = _feature_names(hi), _feature_names(lo)
    assert "Сияющие удары" in names_hi
    assert "Сияющие удары" not in names_lo
    assert "Аура отваги" in names_lo


def test_rollback_20_to_19_drops_l20_capstone_pool():
    """20→19: L20 capstone pool/feature gone (Holy Nimbus for Devotion)."""
    hi = _snap(20)
    lo = _snap(19)
    assert _pool_max(hi, "holy_nimbus") == 1
    assert _pool_max(lo, "holy_nimbus") is None
    names_hi, names_lo = _feature_names(hi), _feature_names(lo)
    assert "Священный нимб" in names_hi
    assert "Священный нимб" not in names_lo
    assert "Эпический дар" in names_lo
    # Other oaths drop their own capstone pools the same way.
    for subclass, pool_id, name_ru in (
        ("paladin__oath-of-glory", "living_legend", "Живая легенда"),
        ("paladin__oath-of-the-ancients", "elder_champion", "Древний чемпион"),
        ("paladin__oath-of-vengeance", "avenging_angel", "Ангел возмездия"),
    ):
        hi_o = _snap(20, subclass=subclass)
        lo_o = _snap(19, subclass=subclass)
        assert _pool_max(hi_o, pool_id) == 1
        assert _pool_max(lo_o, pool_id) is None
        assert name_ru in _feature_names(hi_o)
        assert name_ru not in _feature_names(lo_o)


def test_rollback_2_to_1_keeps_spellcasting_loses_free_smite():
    """2→1: spellcasting remains; free smite / fighting style / Paladin's Smite gone."""
    hi = _snap(2)
    lo = _snap(1)
    assert lo.spellcasting and lo.spellcasting[0].prepared_spells == 2
    assert "Сотворение заклинаний" in _feature_names(lo)
    assert _pool_max(hi, "paladin_free_smite") == 1
    assert _pool_max(lo, "paladin_free_smite") is None
    assert "divine-smite" in _always(hi)
    assert "divine-smite" not in _always(lo)
    names_hi, names_lo = _feature_names(hi), _feature_names(lo)
    assert "Кара паладина" in names_hi
    assert "Кара паладина" not in names_lo
    assert "Боевой стиль" in names_hi
    assert "Боевой стиль" not in names_lo
    assert "Возложение рук" in names_lo
