"""P24-M02B-monk: AU Мистический воин — third-caster, names, checkpoints, rollbacks."""

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
from tests.test_p24_m03_create import build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

MYSTIC = "monk__warrior-of-the-mystic-arts"
CHECKPOINT_LEVELS = (3, 5, 6, 10, 11, 17, 20)

_ABILITIES = {"str": 8, "dex": 16, "con": 14, "int": 10, "wis": 16, "cha": 10}

FORBIDDEN_NAMES = ("Арканный воин", "Мистический фокус", "Сосредоточенный удар")


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


def test_book_catalog_be_fe_identical():
    assert (BACKEND_LIVE / "subclasses_au.json").read_bytes() == (
        FRONTEND_COPY / "subclasses_au.json"
    ).read_bytes()


def _feat_map(slug: str) -> dict[str, dict]:
    data = json.loads((BACKEND_LIVE / "subclasses_au.json").read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["slug"] == slug)
    return {
        feat["id"]: feat
        for block in entry["data"]["features"]
        for feat in block["features"]
    }


def test_mystic_arts_catalog_names_and_focus_table():
    data = json.loads((BACKEND_LIVE / "subclasses_au.json").read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["slug"] == MYSTIC)
    assert entry["name_ru"] == "Мистический воин"
    for bad in FORBIDDEN_NAMES:
        assert bad not in json.dumps(entry, ensure_ascii=False)

    by_id = _feat_map(MYSTIC)
    assert by_id["spellcasting"]["name_ru"] == "Сотворение заклинаний"
    assert by_id["mystic-fighting-style"]["name_ru"] == "Стиль мистического воина"
    assert by_id["mystic-focus"]["name_ru"] == "Мистическая сосредоточенность"
    assert by_id["focused-strike"]["name_ru"] == "Сфокусированный удар"
    assert by_id["improved-mystic-fighting-style"]["name_ru"] == (
        "Улучшенный стиль мистического воина"
    )

    focus = by_id["mystic-focus"]["summary_ru"]
    assert "Феноменальный метаболизм" in focus
    assert "Очки сосредоточенности" in focus
    # Table costs from next.dnd.su / book.
    assert "1 2 6" in focus or ("1" in focus and "2" in focus and "6" in focus)
    assert "2 3 7" in focus
    assert "3 5 13" in focus
    assert "4 6 19" in focus
    assert "5-го" in focus or "5‑го" in focus or "5-го уровня" in focus
    assert "…" not in focus


@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_mystic_arts_checkpoints(level: int):
    snap = e24.compute_progression(
        [{"slug": "monk", "level": level, "subclass_slug": MYSTIC}],
        abilities=_ABILITIES,
    )
    assert snap.total_level == level
    if level >= 3:
        assert any(f.source == "subclass" for f in snap.features)
        third = [b for b in snap.spellcasting if b.progression == "third"]
        assert third
        assert third[0].ability == "wis"
        assert int(third[0].prepared_spells or 0) > 0
        assert not third[0].spells_known
        block = sub24.third_caster_block(MYSTIC, level)
        assert block is not None
        assert block["spell_list"] == "sorcerer"
        assert block["prepare_mode"] == "prepared"
        assert int(third[0].prepared_spells or 0) == int(block["prepared_spells"])
        assert int(third[0].cantrips or 0) == int(block["cantrips"])
    else:
        assert not any(f.source == "subclass" for f in snap.features)


def test_mystic_arts_feature_gates():
    def ids(level: int) -> set[str]:
        snap = e24.compute_progression(
            [{"slug": "monk", "level": level, "subclass_slug": MYSTIC}],
            abilities=_ABILITIES,
        )
        return {str(f.id).replace("_", "-") for f in snap.features if f.source == "subclass"}

    assert "spellcasting" in ids(3)
    assert "mystic-focus" not in ids(5)
    assert "mystic-focus" in ids(6)
    assert "mystic-fighting-style" in ids(6)
    assert "focused-strike" not in ids(10)
    assert "focused-strike" in ids(11)
    assert "improved-mystic-fighting-style" not in ids(16)
    assert "improved-mystic-fighting-style" in ids(17)


def test_shared_option_names_final():
    opts = {o.feature_id: o for o in sub24.shared_options_for_subclass(MYSTIC, 11)}
    assert opts["mystic-focus"].name_ru == "Мистическая сосредоточенность"
    assert opts["focused-strike"].name_ru == "Сфокусированный удар"
    assert opts["mystic-focus"].cost == 0
    assert opts["focused-strike"].cost == 0


def test_phb_monk_paths_intact():
    for slug in (
        "monk__warrior-of-the-hand",
        "monk__warrior-of-shadow",
        "monk__warrior-of-mercy",
        "monk__warrior-of-the-elements",
    ):
        snap = e24.compute_progression(
            [{"slug": "monk", "level": 11, "subclass_slug": slug}],
            abilities=_ABILITIES,
        )
        assert any(f.source == "subclass" for f in snap.features)
        assert not [b for b in snap.spellcasting if b.progression == "third"]


def test_third_caster_ek_at_still_wizard():
    for slug in ("fighter__eldritch-knight", "rogue__arcane-trickster"):
        block = sub24.third_caster_block(slug, 3)
        assert block is not None
        assert block["spell_list"] == "wizard"
        assert block["ability"] == "int"


def _spell_picks(level: int) -> tuple[list[str], list[str]]:
    block = sub24.third_caster_block(MYSTIC, level)
    assert block is not None
    cantrip_n = int(block["cantrips"])
    prep_n = int(block["prepared_spells"])
    # Prefer recommended / safe SRD sorcerer list.
    cantrips = ["blade-ward", "thunderclap", "fire-bolt"][:cantrip_n]
    prepared = [
        "magic-missile",
        "jump",
        "shield",
        "mage-armor",
        "thunderwave",
        "chromatic-orb",
        "misty-step",
        "invisibility",
        "scorching-ray",
        "hold-person",
        "mirror-image",
        "web",
        "fireball",
    ][:prep_n]
    return cantrips, prepared


@pytest.mark.parametrize("level", (3, 5, 6, 10, 11, 17, 20))
def test_create_at_mystic_arts(level: int):
    cantrips, prepared = _spell_picks(level)
    payload = build_valid_payload(
        "monk",
        ability_method="manual",
        base_abilities={"str": 8, "dex": 15, "con": 13, "int": 10, "wis": 14, "cha": 12},
        class_levels=[{"slug": "monk", "level": level, "subclass_slug": MYSTIC}],
        cantrip_ids=cantrips,
        prepared_spell_ids=prepared,
    )
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert sum(int(r["level"]) for r in sheet["classes"]) == level
    assert sheet["classes"][0].get("subclass_slug") == MYSTIC
    slots = (sheet.get("spells") or {}).get("slots") or {}
    assert int((slots.get("1") or {}).get("max") or 0) >= 2


@pytest.mark.parametrize(
    "from_level,to_level",
    [(3, 2), (11, 10), (17, 16), (20, 19)],
)
def test_mystic_arts_rollback(from_level: int, to_level: int):
    cantrips, prepared = _spell_picks(from_level)
    payload = build_valid_payload(
        "monk",
        ability_method="manual",
        base_abilities={"str": 8, "dex": 15, "con": 13, "int": 10, "wis": 14, "cha": 12},
        class_levels=[{"slug": "monk", "level": from_level, "subclass_slug": MYSTIC}],
        cantrip_ids=cantrips,
        prepared_spell_ids=prepared,
    )
    sheet = deepcopy(
        create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    )
    levels.rollback_last_level_gain(sheet)
    assert sum(int(r["level"]) for r in sheet["classes"]) == to_level
    if to_level < 3:
        assert not sheet["classes"][0].get("subclass_slug")
    else:
        assert sheet["classes"][0].get("subclass_slug") == MYSTIC
    # Slots follow new budget (no leftover high-circle max without table support).
    slots = (sheet.get("spells") or {}).get("slots") or {}
    if to_level < 3:
        assert int((slots.get("1") or {}).get("max") or 0) == 0
    else:
        block = sub24.third_caster_block(MYSTIC, to_level)
        assert block is not None
        assert int((slots.get("1") or {}).get("max") or 0) == int(block["slots"]["1"])
