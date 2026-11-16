"""P24-M02-wizard: 2024 wizard tables, RU names, arcane recovery, declension."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

WIZARD_PREPARED = {1: 4, 3: 6, 5: 9, 11: 16, 20: 25}

WIZARD_FEATURE_NAMES_RU = {
    "spellcasting": "Сотворение заклинаний",
    "ritual-adept": "Знаток ритуалов",
    "arcane-recovery": "Магическое восстановление",
    "scholar": "Академические знания",
    "spell-mastery": "Мастерство заклинателя",
}


def _wizard_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["wizard"]["data"]
    out: dict[str, dict] = {}
    for row in data["levels"]:
        for feat in row.get("features") or []:
            out[feat["id"]] = feat
    return out


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("level,prepared", sorted(WIZARD_PREPARED.items()))
def test_wizard_prepared_table(level: int, prepared: int):
    snap = e24.compute_progression([{"slug": "wizard", "level": level}])
    assert snap.spellcasting[0].prepared_spells == prepared


def test_wizard_slots_follow_full_caster_table():
    snap = e24.compute_progression([{"slug": "wizard", "level": 5}])
    assert snap.multiclass_slots["3"] == 2
    assert "4" not in snap.multiclass_slots or snap.multiclass_slots["4"] == 0


def test_arcane_recovery_pool_is_named_in_russian():
    snap = e24.compute_progression([{"slug": "wizard", "level": 1}])
    pool = next(r for r in snap.resources if r.pool_id == "arcane_recovery")
    assert pool.name_ru == "Магическое восстановление"
    assert pool.max == 1
    assert pool.reset == "long"
    assert e24.RESOURCE_META["arcane_recovery"]["name_ru"] == "Магическое восстановление"


def test_wizard_subclass_comes_at_level_3():
    assert e24.load_class_catalog()["wizard"]["data"]["subclass_level"] == 3
    snap = e24.compute_progression(
        [{"slug": "wizard", "level": 3, "subclass_slug": "wizard__evoker"}]
    )
    assert snap.subclass_level == 3


def test_wizard_feature_names_ru():
    feats = _wizard_features()
    for fid, name in WIZARD_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid


def test_scholar_is_a_level_2_feature():
    levels = {
        row["level"]: [f["id"] for f in row.get("features") or []]
        for row in e24.load_class_catalog()["wizard"]["data"]["levels"]
    }
    assert "scholar" in levels[2]
    assert "arcane-recovery" in levels[1]


def test_evoker_subclass_names_ru():
    subs = e24.load_subclass_catalog()["wizard__evoker"]["data"]["features"]
    names = {f["id"]: f["name_ru"] for block in subs for f in block["features"]}
    assert names["evocation-savant"] == "Учёный-Воплотитель"
    assert names["potent-cantrip"] == "Мощные заговоры"
    assert names["sculpt-spells"] == "Построение заклинаний"
    assert names["overchannel"] == "Перегрузка"
    savant = next(
        f["summary_ru"] for block in subs for f in block["features"] if f["id"] == "evocation-savant"
    )
    assert "бесплатно" in savant
    assert "полцены" not in savant and "½" not in savant


@pytest.mark.parametrize(
    "name",
    [
        "classes_srd.json",
        "subclasses_srd.json",
        "subclasses_ph24.json",
    ],
)
def test_frontend_catalog_copy_is_byte_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def test_ph24_savants_do_not_halve_cost():
    data = json.loads((BACKEND_LIVE / "subclasses_ph24.json").read_text(encoding="utf-8"))
    for entry in data["entries"]:
        if entry["slug"] not in {
            "wizard__abjurer",
            "wizard__diviner",
            "wizard__illusionist",
        }:
            continue
        for block in entry["data"]["features"]:
            for feat in block["features"]:
                if feat["id"].endswith("-savant"):
                    assert "бесплатно" in feat["summary_ru"], feat["id"]
                    assert "дешевле" not in feat["summary_ru"]


def test_ru_plural_prepared_phrase():
    forms = ("подготовленное заклинание", "подготовленных заклинания", "подготовленных заклинаний")
    plural = create24._ru_plural
    got = {n: f"{n} {plural(n, *forms)}" for n in (1, 2, 4, 5, 6, 11, 21, 22, 25)}
    assert got[4] == "4 подготовленных заклинания"
    assert got[1] == "1 подготовленное заклинание"
    assert got[11] == "11 подготовленных заклинаний"
    assert got[21] == "21 подготовленное заклинание"
    assert got[22] == "22 подготовленных заклинания"
    assert got[25] == "25 подготовленных заклинаний"


def test_multiclass_into_wizard_needs_intelligence_13():
    low = {"str": 15, "dex": 10, "con": 12, "int": 12, "wis": 10, "cha": 10}
    ok, reason = e24.check_multiclass_prerequisites(
        current_classes=["fighter"], new_class="wizard", abilities=low
    )
    assert ok is False and reason
    ok, _ = e24.check_multiclass_prerequisites(
        current_classes=["fighter"], new_class="wizard", abilities={**low, "int": 13}
    )
    assert ok is True


# --- Subclass automation (Evoker, Abjurer, Diviner, Illusionist) ---------------------

from app.dnd import edition_2024_subclasses as sub24  # noqa: E402

_ABILITIES = {"str": 8, "dex": 14, "con": 14, "int": 18, "wis": 10, "cha": 10}


def _pools(slug: str, level: int) -> dict[str, object]:
    return {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            slug, level, total_level=level, abilities=_ABILITIES
        )
    }


def _bonuses(slug: str, level: int) -> dict[str, object]:
    return {
        b.feature_id: b
        for b in sub24.build_permanent_bonuses(slug, level, abilities=_ABILITIES)
        if b.min_level <= level
    }


def test_sculpt_spells_is_not_always_prepared():
    for has_calc in (False, True):
        mode = sub24.feature_automation_mode(
            feature_id="sculpt-spells",
            subclass_slug="wizard__evoker",
            has_resource=False,
            has_calc=has_calc,
        )
        assert mode != "always_prepared"
    assert (
        sub24.feature_automation_mode(
            feature_id="sculpt_spells",
            subclass_slug="wizard__evoker",
            has_resource=False,
            has_calc=True,
        )
        == "calc"
    )


def test_evoker_calc_and_overchannel_meta():
    bonuses = _bonuses("wizard__evoker", 10)
    assert {"potent-cantrip", "sculpt-spells", "empowered-evocation"} <= set(bonuses)
    assert "overchannel" not in _pools("wizard__evoker", 13)
    meta = _pools("wizard__evoker", 14)["overchannel"].meta
    assert meta["first_use_free"] is True
    assert meta["repeat_necrotic_die"] == "d12"
    assert meta["repeat_dice_per_slot_level_start"] == 2
    assert meta["repeat_dice_step"] == 1
    assert meta["max_slot_level"] == 5


def test_abjurer_ward_spell_breaker_and_spell_list():
    pools = _pools("wizard__abjurer", 3)
    ward = pools["arcane_ward"]
    assert ward.track == "stock"
    assert ward.meta["restore_on_abjuration_slot"] == "2*slot_level"
    assert ward.meta["repair_bonus_action_slot"] == "2*slot_level"
    bonuses = _bonuses("wizard__abjurer", 14)
    assert {"projected-ward", "spell-breaker", "spell-resistance"} <= set(bonuses)
    assert bonuses["spell-breaker"].value["dispel_bonus_action"] is True
    assert sub24.always_prepared_for_subclass("wizard__abjurer", 9) == []
    assert sub24.always_prepared_for_subclass("wizard__abjurer", 10) == [
        "counterspell",
        "dispel-magic",
    ]


def test_diviner_portent_stock_and_third_eye():
    p3 = _pools("wizard__diviner", 3)["portent"]
    assert p3.track == "stock" and p3.max == 2 and p3.reset == "long"
    assert p3.meta["decide_before_roll"] is True and p3.meta["once_per_turn"] is True
    assert _pools("wizard__diviner", 14)["portent"].max == 3
    assert "the_third_eye" not in _pools("wizard__diviner", 9)
    eye = _pools("wizard__diviner", 10)["the_third_eye"]
    assert eye.reset == "short" and eye.max == 1
    assert "expert-divination" in _bonuses("wizard__diviner", 6)


def test_illusionist_features():
    assert "illusory_self" not in _pools("wizard__illusionist", 9)
    assert _pools("wizard__illusionist", 10)["illusory_self"].max == 1
    bonuses = _bonuses("wizard__illusionist", 14)
    assert {"improved-illusions", "phantasmal-creatures", "illusory-reality"} <= set(bonuses)
    assert bonuses["improved-illusions"].value["minor_illusion_bonus_action"] is True
    assert sub24.always_prepared_for_subclass("wizard__illusionist", 5) == []
    assert sub24.always_prepared_for_subclass("wizard__illusionist", 6) == [
        "summon-beast",
        "summon-fey",
    ]


def test_wizard_subclass_ru_names_present():
    catalog = sub24.load_subclass_catalog()
    names = {}
    for slug in (
        "wizard__evoker",
        "wizard__abjurer",
        "wizard__diviner",
        "wizard__illusionist",
    ):
        for block in catalog[slug]["data"]["features"]:
            for feat in block["features"]:
                names[feat["id"]] = feat["name_ru"]
    assert names["potent-cantrip"] == "Мощные заговоры"
    assert names["sculpt-spells"] == "Построение заклинаний"
    assert names["spell-breaker"] == "Разрушитель заклинаний"
    assert names["the-third-eye"] == "Третий глаз"
    assert names["phantasmal-creatures"] == "Призрачные существа"
