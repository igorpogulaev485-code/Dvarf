"""P24-M02B-paladin: FRHoF Noble Genies — pools, names, create-at, rollbacks, PHB intact."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_create_levels as levels
from app.dnd import edition_2024_subclasses as sub24
from tests.test_p24_m03_create import _spell_pick, build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

GENIES = "paladin__oath-of-the-noble-genies"
CHECKPOINT_LEVELS = (3, 5, 7, 11, 15, 20)

_ABILITIES = {"str": 15, "dex": 12, "con": 14, "int": 8, "wis": 10, "cha": 16}

FEATURE_NAMES = {
    "elemental-smite": "Стихийная кара",
    "genie-spells": "Заклинания гениев",
    "genies-splendor": "Великолепие гения",
    "aura-of-elemental-shielding": "Аура стихийной защиты",
    "elemental-rebuke": "Стихийное возмездие",
    "noble-scion": "Благородный гений",
}


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


def test_book_catalog_be_fe_identical():
    name = "subclasses_frhof.json"
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def _entry(slug: str) -> dict:
    data = json.loads((BACKEND_LIVE / "subclasses_frhof.json").read_text(encoding="utf-8"))
    return next(e for e in data["entries"] if e["slug"] == slug)


def _feat_map(slug: str) -> dict[str, dict]:
    entry = _entry(slug)
    return {
        feat["id"]: feat
        for block in entry["data"]["features"]
        for feat in block["features"]
    }


def test_genies_catalog_names_and_full_summaries():
    entry = _entry(GENIES)
    assert entry["name_ru"] == "Клятва благородных гениев"
    by_id = _feat_map(GENIES)
    for fid, name in FEATURE_NAMES.items():
        assert by_id[fid]["name_ru"] == name
        summary = by_id[fid]["summary_ru"]
        assert "…" not in summary, fid
        assert len(summary) > 120, fid
    smite = by_id["elemental-smite"]["summary_ru"]
    for token in ("Всплеск марида", "Давление дао", "Побег джинна", "Ярость ифрита"):
        assert token in smite
    spells = by_id["genie-spells"]["summary_ru"]
    assert "Цветной шарик" in spells
    assert "Призыв духа стихии" in spells
    assert "Связь с иным миром" in spells
    assert "Хроматический шар" not in spells
    assert "Вызов элементаля" not in spells
    assert "Связь с иным планом" not in spells
    splendor = by_id["genies-splendor"]["summary_ru"]
    assert "Щит" in splendor or "щит" in splendor.lower()
    assert "Акробатика" in splendor
    noble = by_id["noble-scion"]["summary_ru"]
    assert "Полёт" in noble
    assert "Малое желание" in noble


def _pools(level: int) -> dict[str, object]:
    return {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            GENIES, level, total_level=level, abilities=_ABILITIES
        )
    }


def test_elemental_rebuke_and_noble_scion_pools():
    assert _pools(14).get("elemental_rebuke") is None
    rebuke = _pools(15)["elemental_rebuke"]
    assert rebuke.name_ru == "Стихийное возмездие"
    assert rebuke.max == 3  # CHA 16
    assert rebuke.reset == "long"
    assert _pools(19).get("noble_scion") is None
    scion = _pools(20)["noble_scion"]
    assert scion.name_ru == "Благородный гений"
    assert scion.max == 1
    assert scion.reset == "long"


def test_shared_elemental_smite_option():
    opts = {o.feature_id: o for o in sub24.shared_options_for_subclass(GENIES, 3)}
    assert opts["elemental-smite"].name_ru == "Стихийная кара"
    assert opts["elemental-smite"].spend_pool == "channel_divinity"


def test_genies_splendor_ac_allows_shield():
    bonuses = sub24.build_permanent_bonuses(GENIES, 3, abilities=_ABILITIES)
    ac = next(b for b in bonuses if b.kind == "ac_formula")
    assert ac.feature_id == "genies-splendor"
    assert ac.value["allows_shield"] is True
    assert ac.value["requires_no_armor"] is True
    assert ac.value["mods"] == ["dex", "cha"]


def test_always_prepared_thresholds():
    assert set(sub24.always_prepared_for_subclass(GENIES, 3)) >= {
        "thunderous-smite",
        "chromatic-orb",
        "elementalism",
    }
    assert "phantasmal-force" not in sub24.always_prepared_for_subclass(GENIES, 4)
    assert "phantasmal-force" in sub24.always_prepared_for_subclass(GENIES, 5)
    assert "fly" in sub24.always_prepared_for_subclass(GENIES, 9)
    assert "summon-elemental" in sub24.always_prepared_for_subclass(GENIES, 13)
    assert "contact-other-plane" in sub24.always_prepared_for_subclass(GENIES, 17)


@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_book_subclass_checkpoints(level: int):
    snap = e24.compute_progression(
        [{"slug": "paladin", "level": level, "subclass_slug": GENIES}],
        abilities=_ABILITIES,
    )
    assert snap.total_level == level
    feat_ids = {f.id for f in snap.features if f.source == "subclass"}
    if level >= 3:
        assert "elemental-smite" in feat_ids or "elemental_smite" in {
            x.replace("-", "_") for x in feat_ids
        } or any("elemental" in x for x in feat_ids)
        assert any(f.source == "subclass" for f in snap.features)
    if level >= 7:
        assert any("elemental-shielding" in f.id or "elemental_shielding" in f.id for f in snap.features)
    if level >= 15:
        assert "elemental_rebuke" in _pools(level)
    if level >= 20:
        assert "noble_scion" in _pools(level)


def _spells_for(level: int) -> list[str]:
    snap = e24.compute_progression(
        [{"slug": "paladin", "level": level}],
        abilities=_ABILITIES,
    )
    block = snap.spellcasting[0]
    need = int(block.prepared_spells or 0)
    prepared: list[str] = []
    for circle in range(9, 0, -1):
        for slug in _spell_pick("paladin", circle, 40):
            if slug not in prepared:
                prepared.append(slug)
            if len(prepared) >= need:
                break
        if len(prepared) >= need:
            break
    return prepared[:need]


def _paladin_payload(level: int) -> dict:
    prepared = _spells_for(level)
    payload = build_valid_payload(
        "paladin",
        ability_method="manual",
        base_abilities=dict(_ABILITIES),
        class_levels=[
            {
                "slug": "paladin",
                "level": level,
                "subclass_slug": GENIES if level >= 3 else None,
            }
        ],
        prepared_spell_ids=prepared,
        fighting_style_slug="defense",
    )
    picks = dict(payload.get("class_option_picks") or {})
    if level >= 3:
        picks["genies_splendor_skill"] = "persuasion"
    if level >= 7:
        picks["elemental_shielding_type"] = "fire"
    payload["class_option_picks"] = picks
    return payload


@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_create_at_genies(level: int):
    payload = _paladin_payload(level)
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert sum(int(r["level"]) for r in sheet["classes"]) == level
    if level >= 3:
        assert sheet["classes"][0].get("subclass_slug") == GENIES
        picks = (sheet.get("feature_picks") or {}).get("values") or {}
        assert picks.get("class-paladin:genies_splendor_skill") == "persuasion"
        assert sheet["skills"]["persuasion"]["is_proficient"] is True
        free = sub24.always_prepared_for_subclass(GENIES, level)
        assert "thunderous-smite" in free
        assert "chromatic-orb" in free
    if level >= 5:
        assert "phantasmal-force" in sub24.always_prepared_for_subclass(GENIES, level)
    if level >= 7:
        picks = (sheet.get("feature_picks") or {}).get("values") or {}
        assert picks.get("class-paladin:elemental_shielding_type") == "fire"
    if level >= 15:
        assert "elemental_rebuke" in _pools(level)
    if level >= 20:
        assert "noble_scion" in _pools(level)


@pytest.mark.parametrize(
    "from_level,to_level",
    [(3, 2), (7, 6), (11, 10), (15, 14), (20, 19)],
)
def test_genies_rollbacks(from_level: int, to_level: int):
    payload = _paladin_payload(from_level)
    sheet = deepcopy(create24.validate_create_2024(create24.payload_from_dict(payload)).sheet)
    assert sum(int(r["level"]) for r in sheet["classes"]) == from_level
    levels.rollback_last_level_gain(sheet)
    assert sum(int(r["level"]) for r in sheet["classes"]) == to_level
    picks = (sheet.get("feature_picks") or {}).get("values") or {}
    if to_level < 3:
        assert not sheet["classes"][0].get("subclass_slug")
        assert "class-paladin:genies_splendor_skill" not in picks
        assert "class-paladin:elemental_shielding_type" not in picks
    else:
        assert sheet["classes"][0].get("subclass_slug") == GENIES
        assert picks.get("class-paladin:genies_splendor_skill") == "persuasion"
    if to_level < 7:
        assert "class-paladin:elemental_shielding_type" not in picks
    if from_level == 15 and to_level == 14:
        assert "elemental_rebuke" not in _pools(to_level)
    if from_level == 20 and to_level == 19:
        assert "noble_scion" not in _pools(to_level)


def test_finish_disabled_without_genies_skill():
    payload = _paladin_payload(3)
    payload["class_option_picks"] = {
        k: v for k, v in (payload.get("class_option_picks") or {}).items() if k != "genies_splendor_skill"
    }
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert "Великолепия гения" in str(exc.value)


def test_phb_paladin_oaths_intact():
    for slug, fid in (
        ("paladin__oath-of-devotion", "sacred-weapon"),
        ("paladin__oath-of-glory", "inspiring-smite"),
        ("paladin__oath-of-the-ancients", "natures-wrath"),
        ("paladin__oath-of-vengeance", "vow-of-enmity"),
    ):
        opts = {o.feature_id: o for o in sub24.shared_options_for_subclass(slug, 3)}
        assert fid in opts
    glory = {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            "paladin__oath-of-glory", 15, total_level=15, abilities=_ABILITIES
        )
    }
    assert glory["glorious_defense"].max == 3
