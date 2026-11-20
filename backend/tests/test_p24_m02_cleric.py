"""P24-M02-cleric: 2024 cleric tables, Channel Divinity, Divine Order, PHB domains."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_subclasses as sub24
from tests.test_p24_m03_create import _spell_pick, build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

# level -> (prepared, cantrips, channel_divinity max, slot counts for circles 1..9)
CLERIC_TABLE = {
    1: (4, 3, 0, (2, 0, 0, 0, 0, 0, 0, 0, 0)),
    2: (5, 3, 2, (3, 0, 0, 0, 0, 0, 0, 0, 0)),
    3: (6, 3, 2, (4, 2, 0, 0, 0, 0, 0, 0, 0)),
    5: (9, 4, 2, (4, 3, 2, 0, 0, 0, 0, 0, 0)),
    6: (10, 4, 3, (4, 3, 3, 0, 0, 0, 0, 0, 0)),
    7: (11, 4, 3, (4, 3, 3, 1, 0, 0, 0, 0, 0)),
    10: (15, 5, 3, (4, 3, 3, 3, 2, 0, 0, 0, 0)),
    11: (16, 5, 3, (4, 3, 3, 3, 2, 1, 0, 0, 0)),
    14: (17, 5, 3, (4, 3, 3, 3, 2, 1, 1, 0, 0)),
    17: (19, 5, 3, (4, 3, 3, 3, 2, 1, 1, 1, 1)),
    18: (20, 5, 4, (4, 3, 3, 3, 3, 1, 1, 1, 1)),
    20: (22, 5, 4, (4, 3, 3, 3, 3, 2, 2, 1, 1)),
}

CLERIC_FEATURE_NAMES_RU = {
    "spellcasting": "Сотворение заклинаний",
    "divine-order": "Божественный орден",
    "channel-divinity": "Проведение божественности",
    "sear-undead": "Испепеление нежити",
    "blessed-strikes": "Благословленные удары",
    "improved-blessed-strikes": "Улучшенные Благословленные удары",
    "divine-intervention": "Божественное вмешательство",
    "greater-divine-intervention": "Великое божественное вмешательство",
}

PHB_DOMAINS = {
    "cleric__life-domain": "Домен жизни",
    "cleric__light-domain": "Домен света",
    "cleric__trickery-domain": "Домен обмана",
    "cleric__war-domain": "Домен войны",
}

OUT_OF_PACK_DOMAINS = {
    "cleric__knowledge-domain",
    "cleric__arcana-domain",
    "cleric__grave-domain",
}

_ABILITIES = {"str": 10, "dex": 12, "con": 14, "int": 8, "wis": 16, "cha": 10}


def _cleric_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["cleric"]["data"]
    out: dict[str, dict] = {}
    for row in data["levels"]:
        for feat in row.get("features") or []:
            out[feat["id"]] = feat
    return out


def _pools(slug: str, level: int) -> dict[str, object]:
    return {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            slug, level, total_level=level, abilities=_ABILITIES
        )
    }


def _resource_rows(level: int, *, subclass: str | None = None) -> list[dict]:
    levels = [{"slug": "cleric", "level": level}]
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


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("level", sorted(CLERIC_TABLE))
def test_cleric_progression_table(level: int):
    prepared, cantrips, channel, slots = CLERIC_TABLE[level]
    snap = e24.compute_progression([{"slug": "cleric", "level": level}])
    block = snap.spellcasting[0]
    assert block.prepared_spells == prepared
    assert block.cantrips == cantrips
    assert tuple(int(snap.multiclass_slots.get(str(c), 0)) for c in range(1, 10)) == slots
    pools = {r.pool_id: r for r in snap.resources}
    if channel:
        assert pools["channel_divinity"].max == channel
    else:
        assert "channel_divinity" not in pools


def test_cleric_feature_names_ru():
    feats = _cleric_features()
    for fid, name in CLERIC_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid


@pytest.mark.parametrize(
    "level,present,absent",
    [
        (1, {"Сотворение заклинаний", "Божественный орден"}, {"Проведение божественности"}),
        (4, {"Проведение божественности"}, {"Испепеление нежити"}),
        (5, {"Испепеление нежити"}, {"Благословленные удары"}),
        (7, {"Благословленные удары"}, {"Божественное вмешательство"}),
        (10, {"Божественное вмешательство"}, {"Улучшенные Благословленные удары"}),
        (14, {"Улучшенные Благословленные удары"}, {"Великое божественное вмешательство"}),
        (20, {"Великое божественное вмешательство"}, set()),
    ],
)
def test_cleric_features_by_level(level: int, present: set[str], absent: set[str]):
    names = {f.name_ru for f in e24.compute_progression([{"slug": "cleric", "level": level}]).features}
    assert present <= names
    assert not (absent & names)


def test_cleric_no_weapon_mastery():
    data = e24.load_class_catalog()["cleric"]["data"]
    assert data["weapon_mastery"]["enabled"] is False
    assert create24._weapon_mastery_limit("cleric") == 0


def test_cleric_subclass_level_is_3():
    assert e24.load_class_catalog()["cleric"]["data"]["subclass_level"] == 3
    snap = e24.compute_progression(
        [{"slug": "cleric", "level": 3, "subclass_slug": "cleric__life-domain"}]
    )
    assert snap.subclass_level == 3


def test_phb_domains_present_and_named():
    names: dict[str, str] = {}
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        for e in data["entries"]:
            if e["slug"] in PHB_DOMAINS:
                names[e["slug"]] = e["name_ru"]
    assert names == PHB_DOMAINS


def test_out_of_pack_domains_exist_in_catalog_but_not_in_pack_list():
    catalog = e24.load_subclass_catalog()
    phb_pack = set(PHB_DOMAINS)
    for slug in OUT_OF_PACK_DOMAINS:
        assert slug not in phb_pack
        assert slug in catalog
        assert catalog[slug]["data"]["parent_class"] == "cleric"
    for slug in phb_pack:
        assert catalog[slug]["data"]["parent_class"] == "cleric"
    in_phb_files = set()
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        in_phb_files |= {e["slug"] for e in data["entries"] if e["slug"].startswith("cleric__")}
    assert in_phb_files == phb_pack
    assert not (OUT_OF_PACK_DOMAINS & in_phb_files)


def test_channel_divinity_short_rest_regains_one_not_all():
    rows = _resource_rows(6)
    channel = next(r for r in rows if r["pool_id"] == "channel_divinity")
    assert channel["max"] == 3
    assert channel["short_rest_regain"] == 1
    assert channel["reset"] == "long"

    after_short = e24.apply_short_rest_to_resources(rows)
    ch_short = next(r for r in after_short if r["pool_id"] == "channel_divinity")
    assert ch_short["used"] == 2

    after_long = e24.apply_long_rest_to_resources(rows)
    ch_long = next(r for r in after_long if r["pool_id"] == "channel_divinity")
    assert ch_long["used"] == 0


def test_divine_intervention_pool_from_level_10():
    for level in (2, 7, 9):
        snap = e24.compute_progression([{"slug": "cleric", "level": level}])
        assert all(r.pool_id != "divine_intervention" for r in snap.resources)
    for level in (10, 14, 20):
        snap = e24.compute_progression([{"slug": "cleric", "level": level}])
        pool = next(r for r in snap.resources if r.pool_id == "divine_intervention")
        assert pool.max == 1
        assert pool.reset == "long"
        assert pool.name_ru == "Божественное вмешательство"
    rows = _resource_rows(10)
    di_short = next(
        r for r in e24.apply_short_rest_to_resources(rows) if r["pool_id"] == "divine_intervention"
    )
    assert di_short["used"] == di_short["max"]
    di_long = next(
        r for r in e24.apply_long_rest_to_resources(rows) if r["pool_id"] == "divine_intervention"
    )
    assert di_long["used"] == 0


def test_channel_options_include_divine_spark_and_turn_undead():
    snap = e24.compute_progression([{"slug": "cleric", "level": 2}])
    pool = next(r for r in snap.resources if r.pool_id == "channel_divinity")
    assert pool.meta["channel_options"][:2] == ["divine-spark", "turn-undead"]

    snap3 = e24.compute_progression(
        [{"slug": "cleric", "level": 3, "subclass_slug": "cleric__life-domain"}],
        abilities=_ABILITIES,
    )
    pool3 = next(r for r in snap3.resources if r.pool_id == "channel_divinity")
    opts = pool3.meta["channel_options"]
    assert "divine-spark" in opts and "turn-undead" in opts
    assert "preserve_life" in opts or "preserve-life" in opts


def test_light_domain_warding_flare_and_corona():
    flare3 = _pools("cleric__light-domain", 3)["warding_flare"]
    assert flare3.reset == "long"
    flare6 = _pools("cleric__light-domain", 6)["warding_flare"]
    assert flare6.reset == "short"
    assert flare6.max == 3
    assert "corona_of_light" not in _pools("cleric__light-domain", 16)
    corona = _pools("cleric__light-domain", 17)["corona_of_light"]
    assert corona.name_ru == "Корона света"
    assert corona.max == 3
    assert corona.reset == "long"


def test_war_domain_war_priest_pool():
    pool = _pools("cleric__war-domain", 3)["war_priest"]
    assert pool.name_ru == "Боевой священник"
    assert pool.max == 3
    assert pool.reset == "short"


def test_war_domain_always_prepared_has_guiding_bolt_not_divine_favor():
    prepared = sub24.always_prepared_for_subclass("cleric__war-domain", 3)
    assert "guiding-bolt" in prepared
    assert "divine-favor" not in prepared
    assert set(prepared) == {"guiding-bolt", "shield-of-faith", "magic-weapon", "spiritual-weapon"}
    data = json.loads((BACKEND_LIVE / "subclasses_ph24.json").read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["slug"] == "cleric__war-domain")
    block3 = next(b for b in entry["data"]["spell_list"] if b["level"] == 3)
    assert "guiding-bolt" in block3["spells"]
    assert "divine-favor" not in block3["spells"]


def test_subclass_shared_option_kinds():
    war = {o.feature_id: o for o in sub24.shared_options_for_subclass("cleric__war-domain", 6)}
    assert war["war-gods-blessing"].kind == "action"
    assert war["guided-strike"].kind == "reaction"
    assert "war-gods-blessing" not in {
        o.feature_id for o in sub24.shared_options_for_subclass("cleric__war-domain", 5)
    }
    trick = {o.feature_id: o for o in sub24.shared_options_for_subclass("cleric__trickery-domain", 3)}
    assert trick["invoke-duplicity"].kind == "bonus"


def test_frontend_shared_option_kinds_match_backend():
    src = (
        REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "edition2024Subclasses.ts"
    ).read_text(encoding="utf-8")
    for sub_slug in PHB_DOMAINS:
        for opt in sub24.shared_options_for_subclass(sub_slug, 20):
            line = next(
                (ln for ln in src.splitlines() if f"feature_id: '{opt.feature_id}'" in ln),
                None,
            )
            assert line is not None, opt.feature_id
            assert f"kind: '{opt.kind}'" in line, (opt.feature_id, opt.kind, line)
            assert f"min_level: {opt.min_level}" in line, (opt.feature_id, line)
    wgb = next(ln for ln in src.splitlines() if "feature_id: 'war-gods-blessing'" in ln)
    dup = next(ln for ln in src.splitlines() if "feature_id: 'invoke-duplicity'" in ln)
    assert "kind: 'action'" in wgb
    assert "kind: 'bonus'" in dup


@pytest.mark.parametrize(
    "name",
    ["classes_srd.json", "subclasses_srd.json", "subclasses_ph24.json"],
)
def test_frontend_catalog_copy_is_byte_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def test_frontend_cleric_catalog_names_and_war_spell_list_identical():
    be_classes = json.loads((BACKEND_LIVE / "classes_srd.json").read_text(encoding="utf-8"))
    fe_classes = json.loads((FRONTEND_COPY / "classes_srd.json").read_text(encoding="utf-8"))

    def cleric_names(doc: dict) -> list[tuple[str, str]]:
        entry = next(e for e in doc["entries"] if e["slug"] == "cleric")
        return [
            (f["id"], f["name_ru"])
            for row in entry["data"]["levels"]
            for f in row.get("features") or []
        ]

    assert cleric_names(be_classes) == cleric_names(fe_classes)
    names = dict(cleric_names(be_classes))
    for fid, name in CLERIC_FEATURE_NAMES_RU.items():
        assert names[fid] == name

    def war_list(path: Path) -> list:
        doc = json.loads(path.read_text(encoding="utf-8"))
        entry = next(e for e in doc["entries"] if e["slug"] == "cleric__war-domain")
        return entry["data"]["spell_list"]

    be_war = war_list(BACKEND_LIVE / "subclasses_ph24.json")
    assert be_war == war_list(FRONTEND_COPY / "subclasses_ph24.json")
    assert "guiding-bolt" in be_war[0]["spells"]


def test_create_cleric_protector_gets_martial_and_heavy():
    payload = build_valid_payload("cleric", ability_method="manual", base_abilities=_ABILITIES)
    assert payload["class_option_picks"]["divine_order"] == "protector"
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    prof = sheet["proficiency"]
    assert prof["weapons"].get("martial") is True
    assert prof["armor"]["heavy"] is True
    assert prof["armor"]["medium"] is True and prof["armor"]["shields"] is True


def test_create_cleric_thaumaturge_extra_cantrip_and_no_heavy():
    base = build_valid_payload("cleric", ability_method="manual", base_abilities=_ABILITIES)
    table_cantrips = len(base["cantrip_ids"])
    assert table_cantrips == CLERIC_TABLE[1][1]
    picks = {**base["class_option_picks"], "divine_order": "thaumaturge"}

    with pytest.raises(create24.Create2024Error):
        create24.validate_create_2024(
            create24.payload_from_dict({**base, "class_option_picks": picks})
        )

    extra = [s for s in _spell_pick("cleric", 0, table_cantrips + 1) if s not in base["cantrip_ids"]]
    payload = {
        **base,
        "class_option_picks": picks,
        "cantrip_ids": [*base["cantrip_ids"], extra[0]],
    }
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    prof = sheet["proficiency"]
    assert prof["armor"]["heavy"] is False
    assert prof["weapons"].get("martial") is not True
    assert len(payload["cantrip_ids"]) == CLERIC_TABLE[1][1] + 1


def test_create_cleric_at_5_and_11_life_domain():
    for level in (5, 11):
        payload = build_valid_payload(
            "cleric",
            ability_method="manual",
            base_abilities=_ABILITIES,
            class_levels=[
                {"slug": "cleric", "level": level, "subclass_slug": "cleric__life-domain"}
            ],
        )
        if level >= 7:
            payload["class_option_picks"] = {
                **payload["class_option_picks"],
                "blessed_strikes": "divine_strike",
            }
        result = create24.validate_create_2024(create24.payload_from_dict(payload))
        assert sum(int(r["level"]) for r in result.sheet["classes"]) == level
        assert result.sheet["classes"][0]["subclass_slug"] == "cleric__life-domain"
        prog = e24.compute_progression(
            [{"slug": "cleric", "level": level, "subclass_slug": "cleric__life-domain"}],
            abilities=_ABILITIES,
        )
        prepared, cantrips, channel, _slots = CLERIC_TABLE[level]
        assert prog.spellcasting[0].prepared_spells == prepared
        assert prog.spellcasting[0].cantrips == cantrips
        assert next(r for r in prog.resources if r.pool_id == "channel_divinity").max == channel
        weapons = (result.sheet.get("proficiency") or {}).get("weapons") or {}
        assert weapons.get("martial") is True


@pytest.mark.parametrize("pick", ["divine_strike", "potent_spellcasting"])
def test_create_cleric_at_11_persists_blessed_strikes(pick: str):
    payload = build_valid_payload(
        "cleric",
        ability_method="manual",
        base_abilities=_ABILITIES,
        class_levels=[{"slug": "cleric", "level": 11, "subclass_slug": "cleric__life-domain"}],
    )
    payload["class_option_picks"] = {**payload["class_option_picks"], "blessed_strikes": pick}
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert sheet["class_options_2024"]["blessed_strikes"] == pick
    entry_id = sheet["classes"][0]["id"]
    assert entry_id == "class-cleric"
    values = sheet["feature_picks"]["values"]
    assert values["class-cleric:blessed_strikes"] == pick
    assert values["class-cleric:blessed-strikes"] == pick


def test_create_cleric_at_11_requires_blessed_strikes():
    payload = build_valid_payload(
        "cleric",
        ability_method="manual",
        base_abilities=_ABILITIES,
        class_levels=[{"slug": "cleric", "level": 11, "subclass_slug": "cleric__life-domain"}],
    )
    payload["class_option_picks"] = {**payload["class_option_picks"], "blessed_strikes": ""}
    with pytest.raises(create24.Create2024Error):
        create24.validate_create_2024(create24.payload_from_dict(payload))


def test_create_cleric_at_5_ignores_blessed_strikes():
    payload = build_valid_payload(
        "cleric",
        ability_method="manual",
        base_abilities=_ABILITIES,
        class_levels=[{"slug": "cleric", "level": 5, "subclass_slug": "cleric__life-domain"}],
    )
    payload["class_option_picks"] = {
        **payload["class_option_picks"],
        "blessed_strikes": "divine_strike",
    }
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert "blessed_strikes" not in sheet["class_options_2024"]
    # create-at may still allocate feature_picks for other mirrors; Blessed Strikes
    # must not be persisted below the unlock level.
    values = ((sheet.get("feature_picks") or {}).get("values") or {})
    assert "class-cleric:blessed_strikes" not in values
    assert "class-cleric:blessed-strikes" not in values


def test_class_options_validator_keeps_blessed_strikes_for_cleric_7_plus():
    from app.dnd import edition_2024_class_options as opt

    sheet11 = {"classes": [{"slug": "cleric", "level": 11}]}
    out = opt.validate_class_options_update(
        rules_edition="2024",
        previous={"divine_order": "protector"},
        incoming={"blessed_strikes": "Potent_Spellcasting"},
        sheet=sheet11,
    )
    assert out["blessed_strikes"] == "potent_spellcasting"
    assert out["divine_order"] == "protector"
    kept = opt.validate_class_options_update(
        rules_edition="2024", previous=out, incoming={}, sheet=sheet11
    )
    assert kept["blessed_strikes"] == "potent_spellcasting"
    low = opt.validate_class_options_update(
        rules_edition="2024",
        previous={},
        incoming={"blessed_strikes": "divine_strike"},
        sheet={"classes": [{"slug": "cleric", "level": 5}]},
    )
    assert "blessed_strikes" not in low
    bogus = opt.validate_class_options_update(
        rules_edition="2024",
        previous={},
        incoming={"blessed_strikes": "nope"},
        sheet=sheet11,
    )
    assert "blessed_strikes" not in bogus


def test_create_cleric_rollback_thresholds():
    from app.dnd import edition_2024_create_levels as levels

    payload = build_valid_payload(
        "cleric",
        ability_method="manual",
        base_abilities=_ABILITIES,
        class_levels=[
            {"slug": "cleric", "level": 3, "subclass_slug": "cleric__war-domain"}
        ],
    )
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert sheet["classes"][0].get("subclass_slug") == "cleric__war-domain"
    levels.rollback_last_level_gain(sheet)
    assert sum(int(r["level"]) for r in sheet["classes"]) == 2
    assert not sheet["classes"][0].get("subclass_slug")


def test_level_rollback_thresholds_for_features_and_pools():
    def pools(level: int) -> set[str]:
        return {
            r.pool_id for r in e24.compute_progression([{"slug": "cleric", "level": level}]).resources
        }

    def names(level: int) -> set[str]:
        return {
            f.name_ru for f in e24.compute_progression([{"slug": "cleric", "level": level}]).features
        }

    assert "divine_intervention" in pools(10) and "divine_intervention" not in pools(9)
    assert "channel_divinity" in pools(2) and "channel_divinity" not in pools(1)
    assert "Великое божественное вмешательство" in names(20)
    assert "Великое божественное вмешательство" not in names(19)
    assert "Эпический дар" in names(19)
    ch = lambda lv: next(  # noqa: E731
        r.max
        for r in e24.compute_progression([{"slug": "cleric", "level": lv}]).resources
        if r.pool_id == "channel_divinity"
    )
    assert (ch(17), ch(18), ch(5), ch(6)) == (3, 4, 2, 3)


def test_multiclass_cleric_protector_wizard_heavy_armor():
    multi_abilities = {**_ABILITIES, "int": 13}
    payload = build_valid_payload(
        "cleric",
        ability_method="manual",
        base_abilities=multi_abilities,
        class_levels=[
            {"slug": "cleric", "level": 1},
            {"slug": "wizard", "level": 1},
        ],
    )
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert [r["slug"] for r in sheet["classes"]] == ["cleric", "wizard"]
    armor = sheet["proficiency"]["armor"]
    assert "heavy" in armor
    assert sheet["proficiency"]["weapons"].get("martial") is True


def test_multiclass_cleric_3_wizard_2_slots():
    snap = e24.compute_progression(
        [
            {"slug": "cleric", "level": 3, "subclass_slug": "cleric__life-domain"},
            {"slug": "wizard", "level": 2},
        ],
        abilities=_ABILITIES,
    )
    # Full caster levels 3 + 2 = 5 -> 4/3/2.
    assert snap.multiclass_slots["1"] == 4
    assert snap.multiclass_slots["2"] == 3
    assert snap.multiclass_slots["3"] == 2
    assert int(snap.multiclass_slots.get("4", 0)) == 0
    assert not snap.multiclass_pact
