"""P24-M02-rogue: 2024 rogue tables, Cunning Strike, PHB subclasses."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_class_options as opt
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_subclasses as sub24

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"

# level -> (sneak_dice, weapon_mastery)
ROGUE_TABLE = {
    1: (1, 2),
    3: (2, 2),
    5: (3, 2),
    7: (4, 2),
    11: (6, 2),
    20: (10, 2),
}

ROGUE_FEATURE_NAMES_RU = {
    "expertise": "Компетентность",
    "sneak-attack": "Скрытая атака",
    "thieves-cant": "Воровской жаргон",
    "weapon-mastery": "Оружейное мастерство",
    "cunning-action": "Хитрое действие",
    "rogue-subclass": "Подкласс плута",
    "steady-aim": "Точное прицеливание",
    "cunning-strike": "Хитрый удар",
    "uncanny-dodge": "Невероятное уклонение",
    "reliable-talent": "Надёжный талант",
    "evasion": "Увёртливость",
    "improved-cunning-strike": "Улучшенный Хитрый удар",
    "devious-strikes": "Бесчестные удары",
    "slippery-mind": "Скользкий ум",
    "elusive": "Неуловимость",
    "stroke-of-luck": "Удача",
}

PHB_ROGUE_SUBCLASSES = {
    "rogue__thief": "Вор",
    "rogue__assassin": "Убийца",
    "rogue__arcane-trickster": "Мистический ловкач",
    "rogue__soulknife": "Клинок душ",
}

OUT_OF_PACK_ROGUE_SUBCLASSES = {
    "rogue__phantom",
    "rogue__scion-of-the-three",
    "rogue__swashbuckler",
    "rogue__inquisitive",
    "rogue__mastermind",
    "rogue__scout",
}

THIEF_FEATURE_NAMES_RU = {
    "fast-hands": "Быстрые руки",
    "second-story-work": "Работа на высоте",
    "supreme-sneak": "Превосходная скрытность",
    "use-magic-device": "Использование магических устройств",
    "thiefs-reflexes": "Рефлексы вора",
}

ASSASSIN_FEATURE_NAMES_RU = {
    "assassinate": "Убийство",
    "assassins-tools": "Инструменты убийцы",
    "infiltration-expertise": "Мастерство внедрения",
    "envenom-weapon": "Покрытое ядом оружие",
    "death-strike": "Смертельный удар",
}

AT_FEATURE_NAMES_RU = {
    "spellcasting": "Сотворение заклинаний",
    "mage-hand-legerdemain": "Ловкость волшебной руки",
    "magical-ambush": "Магическая засада",
    "versatile-trickster": "Универсальный ловкач",
    "spell-thief": "Похититель заклинаний",
}

SOULKNIFE_FEATURE_NAMES_RU = {
    "psionic-power": "Псионическая сила",
    "psychic-blades": "Психические клинки",
    "soul-blades": "Клинки души",
    "psychic-veil": "Психическая завеса",
    "rend-mind": "Разрыв разума",
}

CUNNING_OPTION_NAMES = {
    "poison": "Отравление",
    "trip": "Подсечка",
    "withdraw": "Отступление",
    "daze": "Шок",
    "knock-out": "Нокаут",
    "obscure": "Ослепление",
    "supreme-sneak": "Скрытная атака",
}

_ABILITIES = {"str": 10, "dex": 16, "con": 14, "int": 12, "wis": 10, "cha": 10}


def _rogue_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["rogue"]["data"]
    out: dict[str, dict] = {}
    for row in data["levels"]:
        for feat in row.get("features") or []:
            out[feat["id"]] = feat
    return out


def _subclass_features(slug: str) -> dict[str, dict]:
    data = e24.load_subclass_catalog()[slug]["data"]
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


def _sneak_dice(level: int) -> int:
    return min(10, (level + 1) // 2)


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("level", sorted(ROGUE_TABLE))
def test_rogue_progression_table(level: int):
    sneak, wm = ROGUE_TABLE[level]
    snap = e24.compute_progression(
        [{"slug": "rogue", "level": level}],
        abilities=_ABILITIES,
    )
    assert snap.proficiency_bonus == e24.proficiency_bonus_for_level(level)
    assert snap.scales.get("rogue:sneak_attack") == f"{sneak}d6"
    assert snap.scales.get("rogue:weapon_mastery") == wm
    assert _sneak_dice(level) == sneak


def test_rogue_feature_names_ru():
    feats = _rogue_features()
    for fid, name in ROGUE_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid


@pytest.mark.parametrize(
    "level,present,absent",
    [
        (
            1,
            {"Компетентность", "Скрытая атака", "Оружейное мастерство", "Воровской жаргон"},
            {"Хитрое действие", "Подкласс плута", "Точное прицеливание"},
        ),
        (2, {"Хитрое действие"}, {"Точное прицеливание", "Хитрый удар"}),
        (3, {"Точное прицеливание"}, {"Хитрый удар", "Надёжный талант"}),
        (5, {"Хитрый удар", "Невероятное уклонение"}, {"Надёжный талант"}),
        (7, {"Надёжный талант", "Увёртливость"}, {"Улучшенный Хитрый удар"}),
        (11, {"Улучшенный Хитрый удар"}, {"Бесчестные удары"}),
        (14, {"Бесчестные удары"}, {"Скользкий ум"}),
        (15, {"Скользкий ум"}, {"Неуловимость"}),
        (18, {"Неуловимость"}, {"Удача"}),
        (20, {"Удача"}, set()),
    ],
)
def test_rogue_features_by_level(level: int, present: set[str], absent: set[str]):
    names = {
        f.name_ru for f in e24.compute_progression([{"slug": "rogue", "level": level}]).features
    }
    assert present <= names
    assert not (absent & names)


def test_reliable_talent_at_7_not_waiting_for_11():
    snap7 = e24.compute_progression([{"slug": "rogue", "level": 7}])
    assert any(f.id == "reliable_talent" for f in snap7.features)
    snap6 = e24.compute_progression([{"slug": "rogue", "level": 6}])
    assert not any(f.id == "reliable_talent" for f in snap6.features)
    # Catalog places it at 7 (2014 pack keeps 11 — separate path).
    assert _rogue_features()["reliable-talent"]["name_ru"] == "Надёжный талант"


def test_expertise_totals_two_then_four():
    snap1 = e24.compute_progression([{"slug": "rogue", "level": 1}])
    exp = [f for f in snap1.features if f.id in {"expertise", "expertise_6"}]
    assert len(exp) == 1 and exp[0].id == "expertise"
    snap6 = e24.compute_progression([{"slug": "rogue", "level": 6}])
    ids = [f.id for f in snap6.features if f.id in {"expertise", "expertise_6"}]
    assert ids.count("expertise") == 1
    assert ids.count("expertise_6") == 1


def test_slippery_mind_summary_wis_and_cha():
    summary = _rogue_features()["slippery-mind"]["summary_ru"].lower()
    assert "мудр" in summary or "wis" in summary
    assert "харизм" in summary or "cha" in summary


def test_stroke_of_luck_name_and_pool():
    assert _rogue_features()["stroke-of-luck"]["name_ru"] == "Удача"
    snap = e24.compute_progression(
        [{"slug": "rogue", "level": 20}],
        abilities=_ABILITIES,
    )
    assert _pool_max(snap, "stroke_of_luck") == 1
    pool = next(r for r in snap.resources if r.pool_id == "stroke_of_luck")
    assert pool.reset == "short"
    assert pool.name_ru == "Удача"


def test_phb_rogue_subclasses_present_and_named():
    names: dict[str, str] = {}
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        for e in data["entries"]:
            if e["slug"] in PHB_ROGUE_SUBCLASSES:
                names[e["slug"]] = e["name_ru"]
    assert names == PHB_ROGUE_SUBCLASSES


def test_out_of_pack_not_in_phb_picker_set():
    assert PHB_ROGUE_SUBCLASSES.keys().isdisjoint(OUT_OF_PACK_ROGUE_SUBCLASSES)


@pytest.mark.parametrize(
    "slug,names",
    [
        ("rogue__thief", THIEF_FEATURE_NAMES_RU),
        ("rogue__assassin", ASSASSIN_FEATURE_NAMES_RU),
        ("rogue__arcane-trickster", AT_FEATURE_NAMES_RU),
        ("rogue__soulknife", SOULKNIFE_FEATURE_NAMES_RU),
    ],
)
def test_subclass_feature_names_ru(slug: str, names: dict[str, str]):
    feats = _subclass_features(slug)
    for fid, name in names.items():
        assert feats[fid]["name_ru"] == name, f"{slug}:{fid}"


def test_assassin_2024_no_autocrit_named_ubijstvo():
    bonuses = sub24.build_permanent_bonuses("rogue__assassin", 3)
    row = next(b for b in bonuses if b.feature_id == "assassinate")
    assert row.name_ru == "Убийство"
    assert row.value.get("crit_vs_surprised") is False
    inf = sub24.build_permanent_bonuses("rogue__assassin", 9)
    assert any(b.feature_id == "infiltration-expertise" for b in inf)


def test_soulknife_psi_dice_table():
    # 4d6 / 6d8 / 8d8 / 8d10 / 10d10 / 12d12
    expected = {
        3: (4, "d6"),
        5: (6, "d8"),
        9: (8, "d8"),
        11: (8, "d10"),
        13: (10, "d10"),
        17: (12, "d12"),
    }
    for level, (count, die) in expected.items():
        snap = e24.compute_progression(
            [{"slug": "rogue", "level": level, "subclass_slug": "rogue__soulknife"}],
            abilities=_ABILITIES,
        )
        pool = next(r for r in snap.resources if r.pool_id == "psionic_energy_dice")
        assert pool.max == count, level
        assert pool.meta.get("die") == die, level
    snap17 = e24.compute_progression(
        [{"slug": "rogue", "level": 17, "subclass_slug": "rogue__soulknife"}],
        abilities=_ABILITIES,
    )
    assert _pool_max(snap17, "psychic_veil") == 1
    assert _pool_max(snap17, "rend_mind") == 1


def test_cunning_strike_option_names():
    by_id = {r.id: r.name_ru for r in opt.CUNNING_STRIKE_2024}
    assert by_id == CUNNING_OPTION_NAMES
    ok = opt.resolve_cunning_strike(
        option_ids=["supreme-sneak"],
        rogue_level=9,
        sneak_attack_dice=5,
        dex_mod=4,
        proficiency_bonus=4,
        subclass_slug="rogue__thief",
    )
    assert ok["effects"][0]["name_ru"] == "Скрытная атака"
    with pytest.raises(e24.Edition2024ClassError) as exc:
        opt.resolve_cunning_strike(
            option_ids=["supreme-sneak"],
            rogue_level=9,
            sneak_attack_dice=5,
            dex_mod=4,
            proficiency_bonus=4,
            subclass_slug="rogue__assassin",
        )
    assert exc.value.code == "cunning_subclass"


def test_arcane_trickster_2024_prepared_wizard_no_school_lock():
    third = sub24.third_caster_block("rogue__arcane-trickster", 3)
    assert third is not None
    assert third["prepare_mode"] == "prepared"
    assert third["spell_list"] == "wizard"
    assert third["prepared_spells"] > 0
    assert third.get("school_restriction") is None


def test_multiclass_rogue_dex_13():
    ok, _ = e24.check_multiclass_prerequisites(
        current_classes=["fighter"],
        new_class="rogue",
        abilities={"str": 16, "dex": 13, "con": 14, "int": 10, "wis": 10, "cha": 10},
    )
    assert ok is True
    bad, msg = e24.check_multiclass_prerequisites(
        current_classes=["fighter"],
        new_class="rogue",
        abilities={"str": 16, "dex": 12, "con": 14, "int": 10, "wis": 10, "cha": 10},
    )
    assert bad is False
    assert "13" in msg


def test_frontend_catalog_mirrors_backend_names():
    fe = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"
    be_feats = _rogue_features()
    data = json.loads((fe / "classes_srd.json").read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["slug"] == "rogue")
    fe_feats = {
        f["id"]: f
        for row in entry["data"]["levels"]
        for f in row.get("features") or []
    }
    for fid, name in ROGUE_FEATURE_NAMES_RU.items():
        assert fe_feats[fid]["name_ru"] == name == be_feats[fid]["name_ru"]


def test_create_rogue_expertise_need_helpers():
    assert create24._rogue_expertise_need_2024(1) == 2
    assert create24._rogue_expertise_need_2024(5) == 2
    assert create24._rogue_expertise_need_2024(6) == 4
    assert create24._weapon_mastery_limit("rogue") == 2


def test_use_magic_device_note_is_phb_2024_not_charge_floor():
    bonuses = sub24.build_permanent_bonuses(
        "rogue__thief",
        13,
        abilities=_ABILITIES,
    )
    umd = next(b for b in bonuses if b.feature_id == "use-magic-device")
    note = str(umd.note_ru or "")
    assert "charge floor" not in note.lower()
    assert "при 0 зарядов" not in note
    assert "четыре" in note.lower() or "4" in note
    assert "1к6" in note or "1d6" in note.lower()
    calc = umd.value if isinstance(umd.value, dict) else {}
    assert calc.get("attunement_slots") == 4
    assert "charge_floor" not in calc


def test_third_caster_at_create_requires_mage_hand_and_prepared():
    payload = create24.Create2024Payload(
        name="AT",
        class_slug="rogue",
        background_slug="soldier",
        species_slug="dwarf",
        ability_method="standard",
        base_abilities=_ABILITIES,
        background_asi_mode="+2/+1",
        background_asi={"dex": 2, "con": 1},
        language_ids=["common", "dwarvish"],
        class_skill_ids=["stealth", "sleight_of_hand", "perception", "acrobatics"],
        weapon_mastery_ids=["shortsword", "dagger"],
        class_option_picks={"expertise": ["stealth", "perception"]},
        subclass_slug="rogue__arcane-trickster",
        cantrip_ids=["mage-hand", "ray-of-frost", "minor-illusion"],
        prepared_spell_ids=["shield", "magic-missile", "disguise-self", "silent-image"],
        class_levels=[{"slug": "rogue", "level": 5, "subclass_slug": "rogue__arcane-trickster"}],
    )
    create24._validate_third_caster_spells_2024(
        payload,
        subclass_slug="rogue__arcane-trickster",
        class_level=5,
    )
    bad = create24.Create2024Payload(
        **{
            **payload.__dict__,
            "cantrip_ids": ["ray-of-frost", "minor-illusion", "prestidigitation"],
        }
    )
    with pytest.raises(create24.Create2024Error) as exc:
        create24._validate_third_caster_spells_2024(
            bad,
            subclass_slug="rogue__arcane-trickster",
            class_level=5,
        )
    assert "Волшебная рука" in str(exc.value)
