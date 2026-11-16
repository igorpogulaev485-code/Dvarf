"""P24-N02: Igor RU name fixes — Beholder, Artificer 2024, Fighter display."""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA_2014 = REPO / "backend" / "data" / "srd" / "2014"
DATA_2024 = REPO / "backend" / "data" / "srd" / "2024"
LIVE_2024 = DATA_2024 / "live"
FE_2024 = REPO / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"


def _walk_json_texts(root: Path) -> list[tuple[Path, str]]:
    out: list[tuple[Path, str]] = []
    for path in sorted(root.rglob("*.json")):
        out.append((path, path.read_text(encoding="utf-8")))
    return out


def test_no_zloboglaz_or_sozertsatel_in_2014_2024_data():
    """Ban: злобоглаз / Созерцатель-as-Beholder gone from edition data."""
    bad: list[str] = []
    for root in (DATA_2014, DATA_2024):
        for path, text in _walk_json_texts(root):
            if re.search(r"злобоглаз", text, re.IGNORECASE):
                bad.append(str(path.relative_to(REPO)))
            # subtype / name «Созерцатель» as Beholder — ban the stem in data
            if re.search(r"созерцател", text, re.IGNORECASE):
                bad.append(str(path.relative_to(REPO)))
    assert bad == [], f"forbidden Beholder RU leftovers: {bad}"


def test_2024_artificer_class_name_is_artefactor():
    for path in (
        LIVE_2024 / "classes_efa.json",
        FE_2024 / "classes_efa.json",
    ):
        payload = json.loads(path.read_text(encoding="utf-8"))
        art = next(e for e in payload["entries"] if e.get("slug") == "artificer")
        assert art["name_ru"] == "Артефактор", path.name
        # Magic Item Savant feature label stays (not the class name)
        flat = [
            row.get("name_ru")
            for lv in ((art.get("data") or {}).get("levels") or [])
            for row in (lv.get("features") or [])
        ]
        assert "Изобретательность" in flat


def test_2024_data_has_no_inventor_as_class_name():
    """Ban: «Изобретатель» must not appear as 2024 class name_ru / (Изобретатель) tags."""
    for path, text in _walk_json_texts(LIVE_2024):
        assert '"name_ru": "Изобретатель"' not in text, path.name
        assert "(Изобретатель)" not in text, path.name


def test_2014_artificer_stays_inventor():
    catalog = REPO / "backend" / "data" / "classes" / "phb2014_class_catalog_spec.json"
    payload = json.loads(catalog.read_text(encoding="utf-8"))
    rows = payload["classes"]
    art = next(r for r in rows if r.get("slug") == "artificer")
    assert art["name_ru"] == "Изобретатель"

    feat_pack = REPO / "backend" / "data" / "classes" / "features" / "artificer_2014.json"
    pack = json.loads(feat_pack.read_text(encoding="utf-8"))
    blob = json.dumps(pack, ensure_ascii=False)
    assert "изобретател" in blob.lower()


def test_fighter_is_voin_in_both_editions():
    for path in (
        DATA_2014 / "catalog.json",
        DATA_2024 / "catalog.json",
        LIVE_2024 / "classes_srd.json",
        FE_2024 / "classes_srd.json",
    ):
        payload = json.loads(path.read_text(encoding="utf-8"))
        rows = payload if isinstance(payload, list) else payload.get("entries") or []
        fighter = next(
            r
            for r in rows
            if isinstance(r, dict)
            and r.get("slug") == "fighter"
            and (r.get("kind") in {None, "class"})
        )
        assert fighter["name_ru"] == "Воин", path.name


def test_beholder_display_names():
    rows = json.loads((DATA_2014 / "bestiary_mm_v1.json").read_text(encoding="utf-8"))
    by_slug = {r["slug"]: r for r in rows if isinstance(r, dict) and r.get("slug")}
    assert by_slug["beholder"]["name_ru"] == "Бехолдер"
    assert by_slug["beholder_zombie"]["name_ru"] == "Бехолдер-зомби"

    w1 = json.loads((LIVE_2024 / "creatures_mm24_w1.json").read_text(encoding="utf-8"))
    entries = {e["slug"]: e for e in w1["entries"]}
    assert entries["beholder"]["name_ru"] == "Бехолдер"
    assert entries["beholder-zombie"]["name_ru"] == "Бехолдер-зомби"


def test_n02_aliases_resolve():
    from app.dnd.edition_2024_classes import CLASS_SLUG_ALIASES

    assert CLASS_SLUG_ALIASES["изобретатель"] == "artificer"
    assert CLASS_SLUG_ALIASES["артефактор"] == "artificer"
    assert CLASS_SLUG_ALIASES["боец"] == "fighter"
    assert CLASS_SLUG_ALIASES["воин"] == "fighter"


def test_alembic_still_single_head():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one alembic head, got {heads}"
