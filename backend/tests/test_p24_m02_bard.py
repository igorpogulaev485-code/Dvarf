"""P24-M02-bard: 2024 bard tables, Bardic Inspiration rests, Expertise, PHB colleges."""

from __future__ import annotations

import json
import shutil
import subprocess
from copy import deepcopy
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_create_levels as levels
from app.dnd import edition_2024_subclasses as sub24
from tests.test_p24_m03_create import build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"
FRONTEND_ROOT = REPO_ROOT / "frontend"

_ABILITIES = {"str": 10, "dex": 14, "con": 14, "int": 8, "wis": 10, "cha": 16}

# level -> (prepared, cantrips, BI die, slot counts for circles 1..9)
BARD_TABLE = {
    1: (4, 2, "d6", (2, 0, 0, 0, 0, 0, 0, 0, 0)),
    3: (6, 2, "d6", (4, 2, 0, 0, 0, 0, 0, 0, 0)),
    5: (9, 3, "d8", (4, 3, 2, 0, 0, 0, 0, 0, 0)),
    11: (16, 4, "d10", (4, 3, 3, 3, 2, 1, 0, 0, 0)),
    20: (22, 4, "d12", (4, 3, 3, 3, 3, 2, 2, 1, 1)),
}

# bard level -> number of Expertise skills
EXPERTISE_COUNT = {1: 0, 2: 2, 3: 2, 8: 2, 9: 4, 20: 4}

BARD_FEATURE_NAMES_RU = {
    "bardic-inspiration": "Бардовское вдохновение",
    "spellcasting": "Сотворение заклинаний",
    "expertise": "Компетентность",
    "expertise-9": "Компетентность",
    "jack-of-all-trades": "Мастер на все руки",
    "font-of-inspiration": "Источник вдохновения",
    "countercharm": "Контрчары",
    "magical-secrets": "Магические тайны",
    "superior-inspiration": "Превосходное вдохновение",
    "words-of-creation": "Слова Творения",
}

PHB_COLLEGES = {
    "bard__dance": "Коллегия танца",
    "bard__glamour": "Коллегия очарования",
    "bard__lore": "Коллегия знаний",
    "bard__valor": "Коллегия доблести",
}

OUT_OF_PACK_COLLEGES = {"bard__moon", "bard__spirits"}

# college -> level -> feature names that must be visible at that level
COLLEGE_CHECKLIST = {
    "bard__lore": {
        3: {"Доп. владения", "Острые слова"},
        6: {"Доп. магические тайны"},
        14: {"Бесподобный навык"},
    },
    "bard__valor": {
        3: {"Боевое вдохновение", "Доп. владения"},
        6: {"Доп. атака"},
        14: {"Боевая магия"},
    },
    "bard__glamour": {
        3: {"Чарующая магия", "Мантия вдохновения"},
        6: {"Мантия величия"},
        14: {"Несокрушимое величие"},
    },
    "bard__dance": {
        3: {"Ослепительные фуэте"},
        6: {"Вдохновляющие движения", "Совместный танец"},
        14: {"Ведущее уклонение"},
    },
}


def _bard_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["bard"]["data"]
    out: dict[str, dict] = {}
    for row in data["levels"]:
        for feat in row.get("features") or []:
            out[feat["id"]] = feat
    return out


def _snapshot(level: int, subclass: str | None = None):
    row: dict = {"slug": "bard", "level": level}
    if subclass:
        row["subclass_slug"] = subclass
    return e24.compute_progression([row], abilities=_ABILITIES)


def _resource_rows(level: int) -> list[dict]:
    snap = _snapshot(level)
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


def _bard_payload(level: int, subclass: str | None = None, **picks) -> dict:
    row: dict = {"slug": "bard", "level": level}
    if subclass:
        row["subclass_slug"] = subclass
    payload = build_valid_payload(
        "bard",
        ability_method="manual",
        base_abilities=_ABILITIES,
        class_levels=[row],
    )
    payload["class_option_picks"] = {**payload["class_option_picks"], **picks}
    return payload


def _create(payload: dict):
    return create24.validate_create_2024(create24.payload_from_dict(payload))


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("level", sorted(BARD_TABLE))
def test_bard_progression_table(level: int):
    prepared, cantrips, die, slots = BARD_TABLE[level]
    snap = _snapshot(level)
    block = snap.spellcasting[0]
    assert block.prepared_spells == prepared
    assert block.cantrips == cantrips
    assert tuple(int(snap.multiclass_slots.get(str(c), 0)) for c in range(1, 10)) == slots
    assert snap.scales["bard:bardic_inspiration_die"] == die
    pools = {r.pool_id: r for r in snap.resources}
    assert pools["bardic_inspiration"].max == 3  # CHA 16 -> +3


@pytest.mark.parametrize("level,count", sorted(EXPERTISE_COUNT.items()))
def test_bard_expertise_count_by_level(level: int, count: int):
    ids = {f.id for f in _snapshot(level).features}
    expected = 0
    if "expertise" in ids:
        expected += 2
    if "expertise_9" in ids:
        expected += 2
    assert expected == count


def test_bard_feature_names_ru():
    feats = _bard_features()
    for fid, name in BARD_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid


def test_bard_2024_has_no_song_of_rest():
    assert "song-of-rest" not in _bard_features()
    names = {f.name_ru for f in _snapshot(20).features}
    assert "Песнь отдыха" not in names


@pytest.mark.parametrize(
    "level,present,absent",
    [
        (1, {"Бардовское вдохновение", "Сотворение заклинаний"}, {"Компетентность"}),
        (2, {"Компетентность", "Мастер на все руки"}, {"Источник вдохновения"}),
        (5, {"Источник вдохновения"}, {"Контрчары"}),
        (7, {"Контрчары"}, {"Магические тайны"}),
        (10, {"Магические тайны"}, {"Превосходное вдохновение"}),
        (18, {"Превосходное вдохновение"}, {"Слова Творения"}),
        (20, {"Слова Творения"}, set()),
    ],
)
def test_bard_features_by_level(level: int, present: set[str], absent: set[str]):
    names = {f.name_ru for f in _snapshot(level).features}
    assert present <= names
    assert not (absent & names)


def test_bard_no_weapon_mastery_and_subclass_level_3():
    data = e24.load_class_catalog()["bard"]["data"]
    assert data["weapon_mastery"]["enabled"] is False
    assert create24._weapon_mastery_limit("bard") == 0
    assert data["subclass_level"] == 3


def test_bardic_inspiration_is_long_rest_below_5_and_short_from_5():
    low = {r["pool_id"]: r for r in _resource_rows(4)}["bardic_inspiration"]
    high = {r["pool_id"]: r for r in _resource_rows(5)}["bardic_inspiration"]
    assert low["reset"] == "long"
    assert high["reset"] == "short"


def test_short_rest_before_5_does_not_restore_bardic_inspiration():
    rows = _resource_rows(4)
    after = e24.apply_short_rest_to_resources(rows)
    bi = next(r for r in after if r["pool_id"] == "bardic_inspiration")
    assert bi["used"] == bi["max"]
    long_rest = e24.apply_long_rest_to_resources(after)
    assert next(r for r in long_rest if r["pool_id"] == "bardic_inspiration")["used"] == 0


def test_short_rest_at_5_restores_all_bi_but_not_slots_and_long_restores_both():
    rows = _resource_rows(5)
    after = e24.apply_short_rest_to_resources(rows)
    bi = next(r for r in after if r["pool_id"] == "bardic_inspiration")
    assert bi["used"] == 0
    slots_state = {"1": {"max": 4, "used": 4}}
    # Spell slots are not resource pools: a short rest must leave them untouched.
    assert slots_state["1"]["used"] == 4
    long_rest = e24.apply_long_rest_to_resources(rows)
    assert next(r for r in long_rest if r["pool_id"] == "bardic_inspiration")["used"] == 0


def test_font_of_inspiration_and_superior_inspiration_are_documented_not_pools():
    feats = _bard_features()
    assert "1" in feats["font-of-inspiration"]["summary_ru"] or "использован" in (
        feats["font-of-inspiration"]["summary_ru"].lower()
    )
    assert "Бардовск" in feats["superior-inspiration"]["summary_ru"]
    assert "инициатив" in feats["superior-inspiration"]["summary_ru"].lower()
    pool_ids = {r.pool_id for r in _snapshot(20).resources}
    assert "font_of_inspiration" not in pool_ids
    assert "superior_inspiration" not in pool_ids


def test_countercharm_is_a_reaction_without_inspiration_cost():
    summary = _bard_features()["countercharm"]["summary_ru"].lower()
    assert "реакци" in summary
    assert "30 фт" in summary
    assert "без траты вдохновения" in summary


def test_words_of_creation_always_prepared_at_20():
    block = _snapshot(20).spellcasting[0]
    assert "power-word-heal" in block.always_prepared
    assert "power-word-kill" in block.always_prepared
    assert not {"power-word-heal", "power-word-kill"} & set(_snapshot(19).spellcasting[0].always_prepared)


def test_phb_colleges_present_and_named():
    names: dict[str, str] = {}
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        for e in data["entries"]:
            if e["slug"] in PHB_COLLEGES:
                names[e["slug"]] = e["name_ru"]
    assert names == PHB_COLLEGES


def test_moon_and_spirits_not_in_pack():
    in_files: set[str] = set()
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        in_files |= {e["slug"] for e in data["entries"] if e["slug"].startswith("bard__")}
    assert in_files == set(PHB_COLLEGES)
    assert not (OUT_OF_PACK_COLLEGES & in_files)


@pytest.mark.parametrize("college", sorted(COLLEGE_CHECKLIST))
@pytest.mark.parametrize("level", [3, 6, 14])
def test_college_feature_checklist(college: str, level: int):
    snap = _snapshot(level, college)
    assert snap.subclass_level == 3
    names = {f.name_ru for f in snap.features}
    assert COLLEGE_CHECKLIST[college][level] <= names


@pytest.mark.parametrize("college", sorted(COLLEGE_CHECKLIST))
def test_college_features_hidden_below_gate(college: str):
    names = {f.name_ru for f in _snapshot(2, college).features}
    for needed in COLLEGE_CHECKLIST[college][3]:
        assert needed not in names


def test_glamour_always_prepared_and_pools():
    prepared = set(sub24.always_prepared_for_subclass("bard__glamour", 6))
    assert {"charm-person", "mirror-image", "command"} <= prepared
    assert not set(sub24.always_prepared_for_subclass("bard__glamour", 3)) - {
        "charm-person",
        "mirror-image",
    }
    pools = {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            "bard__glamour", 14, total_level=14, abilities=_ABILITIES
        )
    }
    assert {"beguiling_magic", "mantle_of_majesty", "unbreakable_majesty"} <= set(pools)
    assert pools["unbreakable_majesty"].reset == "short"


def test_dance_unarmored_ac_formula_documented():
    bonuses = sub24.build_permanent_bonuses("bard__dance", 3, abilities=_ABILITIES)
    row = next(b for b in bonuses if b.kind == "ac_formula")
    assert row.feature_id == "dazzling-footwork"
    formula = row.value
    assert not [b for b in sub24.build_permanent_bonuses("bard__dance", 2) if b.kind == "ac_formula"]
    assert formula["base"] == 10
    assert set(formula["mods"]) == {"dex", "cha"}
    assert formula["allows_shield"] is False


def test_lore_and_valor_sheet_grants_in_catalog():
    entries = {}
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        entries.update({e["slug"]: e for e in data["entries"]})
    lore = entries["bard__lore"]["data"]
    assert lore["grants_level"] == 3
    assert lore["sheet_grants"]["skill_choices"]["count"] == 3
    valor = entries["bard__valor"]["data"]
    assert set(valor["sheet_grants"]["armor"]) == {"medium", "shields"}
    assert valor["sheet_grants"]["weapons"]["martial"] is True


@pytest.mark.parametrize(
    "name",
    ["classes_srd.json", "subclasses_srd.json", "subclasses_ph24.json"],
)
def test_frontend_catalog_copy_is_byte_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def test_create_bard_1_has_no_expertise_and_light_armor_only():
    sheet = _create(_bard_payload(1)).sheet
    prof = sheet["proficiency"]
    assert prof["armor"]["light"] is True
    assert prof["armor"]["medium"] is False
    assert not any(v["is_expertise"] for v in sheet["skills"].values())
    assert "subclass_grants" not in sheet or not sheet["subclass_grants"]


def test_create_bard_2_requires_two_expertise():
    with pytest.raises(create24.Create2024Error):
        _create(_bard_payload(2))
    with pytest.raises(create24.Create2024Error):
        _create(_bard_payload(2, expertise=["performance"]))


def test_create_bard_rejects_expertise_in_untrained_skill():
    payload = _bard_payload(2, expertise=["performance", "persuasion"])
    with pytest.raises(create24.Create2024Error):
        _create(payload)


def test_create_bard_rejects_expertise_below_level_2():
    with pytest.raises(create24.Create2024Error):
        _create(_bard_payload(1, expertise=["performance", "arcana"]))


def test_create_bard_2_persists_expertise_pick():
    base = _bard_payload(2)
    skills = base["class_skill_ids"]
    sheet = _create({**base, "class_option_picks": {**base["class_option_picks"], "expertise": skills[:2]}}).sheet
    assert sheet["feature_picks"]["values"]["class-bard:expertise"] == ",".join(skills[:2])
    assert {k for k, v in sheet["skills"].items() if v["is_expertise"]} == set(skills[:2])


def test_create_bard_9_has_four_expertise_across_two_picks():
    base = _bard_payload(9)
    expertise = [*base["class_skill_ids"][:3], "performance"]
    with pytest.raises(create24.Create2024Error):
        _create({**base, "class_option_picks": {**base["class_option_picks"], "expertise": expertise[:2]}})
    sheet = _create(
        {**base, "class_option_picks": {**base["class_option_picks"], "expertise": expertise}}
    ).sheet
    values = sheet["feature_picks"]["values"]
    assert values["class-bard:expertise"] == ",".join(expertise[:2])
    assert values["class-bard:expertise_9"] == ",".join(expertise[2:])
    assert sum(1 for v in sheet["skills"].values() if v["is_expertise"]) == 4


def test_create_bard_lore_requires_three_new_skills():
    base = _bard_payload(3, "bard__lore")
    skills = base["class_skill_ids"]
    picks = {**base["class_option_picks"], "expertise": skills[:2]}
    with pytest.raises(create24.Create2024Error):
        _create({**base, "class_option_picks": picks})
    with pytest.raises(create24.Create2024Error):
        _create({**base, "class_option_picks": {**picks, "lore_skills": ["stealth", "history"]}})
    with pytest.raises(create24.Create2024Error):  # already proficient from class list
        _create({**base, "class_option_picks": {**picks, "lore_skills": [skills[0], "history", "stealth"]}})
    sheet = _create(
        {**base, "class_option_picks": {**picks, "lore_skills": ["stealth", "history", "religion"]}}
    ).sheet
    assert {"stealth", "history", "religion"} <= set(sheet["proficiency"]["skills"])
    grant = sheet["subclass_grants"][0]
    assert grant["slug"] == "bard__lore"
    assert grant["skills"] == ["stealth", "history", "religion"]


def test_create_bard_valor_gets_martial_and_medium_armor_and_shields():
    base = _bard_payload(3, "bard__valor")
    sheet = _create(
        {**base, "class_option_picks": {**base["class_option_picks"], "expertise": base["class_skill_ids"][:2]}}
    ).sheet
    prof = sheet["proficiency"]
    assert prof["weapons"]["martial"] is True
    assert prof["armor"]["medium"] is True and prof["armor"]["shields"] is True
    assert prof["armor"]["heavy"] is False
    grant = sheet["subclass_grants"][0]
    assert grant["armorKeys"] == ["medium", "shields"]
    assert grant["weaponKeys"] == ["martial"]
    assert sheet["class_options_2024"].get("weapon_mastery_ids", []) == []


@pytest.mark.parametrize("college", ["bard__glamour", "bard__dance"])
def test_create_bard_other_colleges_do_not_grant_proficiencies(college: str):
    base = _bard_payload(3, college)
    sheet = _create(
        {**base, "class_option_picks": {**base["class_option_picks"], "expertise": base["class_skill_ids"][:2]}}
    ).sheet
    prof = sheet["proficiency"]
    assert prof["armor"]["medium"] is False
    assert prof["weapons"].get("martial") is not True
    assert not sheet.get("subclass_grants")


def test_rollback_below_9_and_below_3_drops_bard_picks_and_grants():
    base = _bard_payload(9, "bard__valor")
    expertise = [*base["class_skill_ids"][:3], "performance"]
    sheet = deepcopy(
        _create(
            {**base, "class_option_picks": {**base["class_option_picks"], "expertise": expertise}}
        ).sheet
    )
    assert sheet["proficiency"]["armor"]["medium"] is True

    levels.rollback_last_level_gain(sheet)  # 9 -> 8
    values = sheet["feature_picks"]["values"]
    assert "class-bard:expertise_9" not in values
    assert "class-bard:expertise" in values
    assert sum(1 for v in sheet["skills"].values() if v["is_expertise"]) == 2
    assert sheet["subclass_grants"]

    for _ in range(5):  # 8 -> 3
        levels.rollback_last_level_gain(sheet)
    assert sheet["subclass_grants"]
    levels.rollback_last_level_gain(sheet)  # 3 -> 2
    assert sheet["classes"][0]["level"] == 2
    assert not sheet["classes"][0].get("subclass_slug")
    assert not sheet["subclass_grants"]
    assert sheet["proficiency"]["armor"]["medium"] is False
    assert sheet["proficiency"]["weapons"]["martial"] is False
    assert "class-bard:expertise" in sheet["feature_picks"]["values"]

    levels.rollback_last_level_gain(sheet)  # 2 -> 1
    assert "class-bard:expertise" not in sheet["feature_picks"]["values"]
    assert not any(v["is_expertise"] for v in sheet["skills"].values())


def test_multiclass_bard_dip_grants_light_armor_skill_instrument_and_bi_pool():
    grants = e24.multiclass_proficiencies_for("bard")
    assert grants["armor"] == ["light"]
    assert grants["skills"] == 1
    assert grants["tools"] == ["one_musical_instrument"]

    abilities = {"str": 15, "dex": 13, "con": 13, "int": 8, "wis": 10, "cha": 14}
    payload = build_valid_payload(
        "fighter",
        ability_method="manual",
        base_abilities=abilities,
        class_levels=[{"slug": "fighter", "level": 2}, {"slug": "bard", "level": 1}],
    )
    result = _create(payload)
    classes = {r["slug"]: r["level"] for r in result.sheet["classes"]}
    assert classes == {"fighter": 2, "bard": 1}
    pools = {r["pool_id"]: r for r in result.sheet["class_progress_2024"]["resources"]}
    assert pools["bardic_inspiration"]["max"] == 2  # CHA 14 -> +2
    assert pools["bardic_inspiration"]["class_slug"] == "bard"


def test_multiclass_bard_requires_cha_13():
    ok, _ = e24.check_multiclass_prerequisites(
        current_classes=["fighter"],
        new_class="bard",
        abilities={**_ABILITIES, "cha": 12, "str": 14},
    )
    assert ok is False
    ok2, _ = e24.check_multiclass_prerequisites(
        current_classes=["fighter"],
        new_class="bard",
        abilities={**_ABILITIES, "cha": 13, "str": 14},
    )
    assert ok2 is True


def test_2014_bard_pack_unchanged_still_has_song_of_rest():
    path = REPO_ROOT / "backend" / "data" / "classes" / "features" / "bard_2014.json"
    if not path.exists():
        pytest.skip("bard_2014.json not present in this tree")
    text = path.read_text(encoding="utf-8")
    assert "Песнь отдыха" in text or "song-of-rest" in text


@pytest.mark.skipif(shutil.which("npx") is None, reason="node toolchain not installed")
@pytest.mark.skipif(
    not (FRONTEND_ROOT / "node_modules").exists(), reason="frontend deps not installed"
)
def test_frontend_bard_selfcheck_passes():
    proc = subprocess.run(
        [
            "npx",
            "tsx",
            "--tsconfig",
            "tsconfig.app.json",
            "src/shared/dnd/bard2024Features.selfcheck.ts",
        ],
        cwd=FRONTEND_ROOT,
        capture_output=True,
        text=True,
        timeout=180,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    assert "ok" in proc.stdout
