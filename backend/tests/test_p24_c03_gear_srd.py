"""P24-C03: SRD 2024 weapons, armor, equipment catalog seed."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path

from app.services.edition_2024_catalog_seed import (
    EDITION_2024_CATALOG_WAVES,
    WEAPON_MASTERY_IDS,
    apply_edition_2024_catalog_seed,
    load_wave_rows,
    load_weapon_mastery_dictionary,
    normalize_armor_data,
    normalize_item_data,
    normalize_weapon_data,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCES = REPO_ROOT / "docs" / "edition-2024" / "sources"
LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
GEAR_2014 = REPO_ROOT / "backend" / "data" / "srd" / "2014"

# Fingerprints of 2014 gear waves — must stay byte-identical in this pack.
GEAR_2014_FILES = (
    "catalog.json",
    "gear_backfill_v1.json",
    "gear_tools_mounts_v1.json",
)


def _srd_ids(category: str) -> set[str]:
    path = SOURCES / f"{category}.csv"
    with path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return {r["id"] for r in rows if str(r.get("srd", "")).lower() == "true"}


def _rows(kind: str):
    return [r for r in load_wave_rows() if r["kind"] == kind]


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_reference_srd_gear_counts_match_official_equipment():
    """Layer 1: srd=true rows match SRD 5.2.1 Equipment (after C03 corrections)."""
    weapons = _srd_ids("weapons")
    armor = _srd_ids("armor")
    equipment = _srd_ids("equipment")

    assert len(weapons) == 38
    assert len(armor) == 13  # 12 armor + shield
    assert len(equipment) == 134  # PH24 SRD gear; FRHoF stays false
    assert "musket" in weapons and "pistol" in weapons
    assert "shield" in armor and "plate-armor" in armor
    assert "padded-armor" in armor
    # Heuristic P24-00 left armor/equipment almost all false — corrected here.
    assert "leather-armor" in armor
    assert "thieves-tools" in equipment
    assert "burglars-pack" in equipment
    assert "alchemists-fire" in equipment
    # Book-only Faerûn gear must not be flagged SRD.
    all_eq = {
        r["id"]: r
        for r in csv.DictReader((SOURCES / "equipment.csv").open(encoding="utf-8"))
    }
    assert all_eq["bandore"]["srd"] == "false"
    assert all_eq["bandore"]["book"] == "FRHoF"
    # Potion / spell scrolls live in magic_items for later packs.
    assert "potion-of-healing" not in equipment


def test_live_gear_waves_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "weapons_srd.json" in names
    assert "armor_srd.json" in names
    assert "equipment_srd.json" in names
    assert (LIVE / "weapons_srd.json").is_file()
    assert (LIVE / "armor_srd.json").is_file()
    assert (LIVE / "equipment_srd.json").is_file()
    assert (LIVE / "weapon_mastery_srd.json").is_file()

    assert {r["slug"] for r in _rows("weapon")} == _srd_ids("weapons")
    assert {r["slug"] for r in _rows("armor")} == _srd_ids("armor")
    mundane = {
        r["slug"]
        for r in _rows("item")
        if (r.get("data") or {}).get("equipment_group") != "magic_item"
        and str(r.get("source") or "").startswith("srd")
    }
    assert mundane == _srd_ids("equipment")
    assert len(_rows("weapon")) == len(_srd_ids("weapons"))
    assert len(_rows("armor")) == len(_srd_ids("armor"))
    assert len(mundane) == len(_srd_ids("equipment"))
    # P24-C17: FRHoF mundane gear lives in equipment_frhof.json
    frhof_gear = {
        r["slug"]
        for r in _rows("item")
        if r.get("source") == "frhof"
        and (r.get("data") or {}).get("equipment_group") != "magic_item"
    }
    assert len(frhof_gear) == 12
    assert "bandore" in frhof_gear


def test_weapon_mastery_dictionary_has_eight_entries():
    mastery = load_weapon_mastery_dictionary()
    assert {m["id"] for m in mastery} == WEAPON_MASTERY_IDS
    assert len(mastery) == 8
    for m in mastery:
        assert m.get("name_ru")
        assert m.get("name_en")
        assert m.get("summary_ru")


def test_each_srd_weapon_has_allowed_mastery_and_fields():
    for row in _rows("weapon"):
        data = row["data"]
        assert data.get("mastery") in WEAPON_MASTERY_IDS, row["slug"]
        assert data.get("category") in {"simple", "martial"}
        assert data.get("range_kind") in {"melee", "ranged"}
        assert data.get("damage")
        assert data.get("damage_type")
        assert "cost" in data
        assert "weight_lb" in data
        assert isinstance(data.get("properties"), list)
        # Mastery must not leak into properties tokens.
        for prop in data["properties"]:
            token = str(prop).lower()
            assert not token.startswith("mastery")
            assert token not in WEAPON_MASTERY_IDS
        assert data.get("content_layer") == "srd"
        assert row["rules_edition"] == "2024"
        assert row["source"].startswith("srd")


def test_each_armor_has_ac_rules_and_don_doff():
    for row in _rows("armor"):
        data = row["data"]
        kind = data.get("armor_kind")
        assert kind in {"light", "medium", "heavy", "shield"}, row["slug"]
        assert data.get("base_ac") is not None
        assert data.get("dex_bonus") in {"full", "max2", "none"}
        assert isinstance(data.get("stealth_disadvantage"), bool)
        assert "weight_lb" in data
        assert "cost" in data
        if kind == "shield":
            assert data.get("base_ac") == 2
        else:
            assert data.get("don_time")
            assert data.get("doff_time")
        assert data.get("content_layer") == "srd"


def test_equipment_cards_have_group_and_optional_utilize():
    for row in _rows("item"):
        data = row["data"]
        if data.get("equipment_group") == "magic_item":
            continue  # P24-C06 / C17 magic
        if row.get("source") == "frhof":
            assert data.get("equipment_group") in {
                "equipment",
                "musical_instrument",
                "toolkit",
            }, row["slug"]
            assert data.get("content_layer") == "community_ref"
            continue
        assert data.get("equipment_group") in {
            "equipment",
            "toolkit",
            "artisan_tool",
            "ammunition",
            "spellcasting_focus",
            "item_pack",
        }, row["slug"]
        assert data.get("content_layer") == "srd"
        assert row["kind"] == "item"
        # utilize_ru is data-only (no combat automation in this pack).
        if data.get("utilize_ru"):
            assert isinstance(data["utilize_ru"], str)


def test_names_match_reference_csv():
    for category, kind in (
        ("weapons", "weapon"),
        ("armor", "armor"),
        ("equipment", "item"),
    ):
        ref = {
            r["id"]: r
            for r in csv.DictReader((SOURCES / f"{category}.csv").open(encoding="utf-8"))
            if r["srd"] == "true"
        }
        for row in _rows(kind):
            if kind == "item" and (row.get("data") or {}).get("equipment_group") == "magic_item":
                continue  # P24-C06 — names checked against magic_items.csv there
            if not str(row.get("source") or "").startswith("srd"):
                continue  # P24-C17 FRHoF gear — names vs FRHoF CSV in C17 tests
            assert row["name_ru"] == ref[row["slug"]]["name_ru"]
            assert row["name_en"] == ref[row["slug"]]["name_en"]


def test_normalize_helpers_defaults():
    w = normalize_weapon_data({"properties": ["light", "mastery:nick"]})
    assert w["mastery"] == "nick"
    assert "mastery:nick" not in w["properties"]

    a = normalize_armor_data({})
    assert a["armor_kind"] is None
    assert a["stealth_disadvantage"] is False

    i = normalize_item_data({})
    assert i["equipment_group"] is None
    assert i["utilize_ru"] is None


def test_counts_json_gear_totals_match_csv():
    counts = json.loads((SOURCES / "counts.json").read_text(encoding="utf-8"))
    for cat in ("weapons", "armor", "equipment"):
        rows = list(csv.DictReader((SOURCES / f"{cat}.csv").open(encoding="utf-8")))
        assert counts["by_category"][cat] == len(rows)


def test_2014_gear_catalog_files_unchanged():
    """2014 weapon/armor/item seed files must not be rewritten by this pack."""

    def _wave_items(payload: object) -> list:
        if isinstance(payload, list):
            return payload
        if not isinstance(payload, dict):
            return []
        if isinstance(payload.get("entries"), list):
            return list(payload["entries"])
        items: list = []
        for key in ("updates", "inserts"):
            chunk = payload.get(key)
            if isinstance(chunk, list):
                items.extend(chunk)
        return items

    for name in GEAR_2014_FILES:
        path = GEAR_2014 / name
        assert path.is_file(), name
        payload = json.loads(path.read_text(encoding="utf-8"))
        items = _wave_items(payload)
        assert items, name
        for item in items:
            if not isinstance(item, dict):
                continue
            ed = item.get("rules_edition")
            if ed is not None:
                assert ed == "2014", f"{name} {item.get('slug')}"
    # Cross-check: live 2024 plan never claims 2014.
    for row in load_wave_rows():
        if row["kind"] in {"weapon", "armor", "item"}:
            assert row["rules_edition"] == "2024"


def test_2014_create_pipeline_still_pins_edition():
    path = (
        REPO_ROOT
        / "frontend"
        / "src"
        / "features"
        / "createPipeline"
        / "pipelineApply.ts"
    )
    text = path.read_text(encoding="utf-8")
    assert "edition: '2014'" in text
    gear = (
        REPO_ROOT
        / "frontend"
        / "src"
        / "features"
        / "createPipeline"
        / "createPipelineGear.ts"
    )
    assert "rules_edition: '2014'" in gear.read_text(encoding="utf-8")


def test_apply_seed_includes_gear_idempotent():
    store: dict[tuple[str, str], dict] = {}

    class FakeResult:
        def __init__(self, row=None, rowcount=0):
            self._row = row
            self.rowcount = rowcount

        def first(self):
            return self._row

    class FakeConn:
        def execute(self, statement, params=None):
            sql = str(statement)
            params = params or {}
            if "UPDATE catalog_entries" in sql and "is_active = false" in sql:
                return FakeResult(rowcount=0)
            if "SELECT id FROM catalog_entries" in sql:
                key = (params["kind"], params["slug"])
                assert params["edition"] == "2024"
                existing = store.get(key)
                return FakeResult(row=(existing["id"],) if existing else None)
            if "INSERT INTO catalog_entries" in sql:
                assert params["edition"] == "2024"
                key = (params["kind"], params["slug"])
                store[key] = dict(params)
                return FakeResult(rowcount=1)
            if "UPDATE catalog_entries SET" in sql:
                assert params["edition"] == "2024"
                key = (params["kind"], params["slug"])
                store[key] = dict(params)
                return FakeResult(rowcount=1)
            raise AssertionError(f"unexpected SQL: {sql[:200]}")

    conn = FakeConn()
    planned = len(load_wave_rows())
    stats1 = apply_edition_2024_catalog_seed(conn)  # type: ignore[arg-type]
    stats2 = apply_edition_2024_catalog_seed(conn)  # type: ignore[arg-type]
    assert stats1.upserted == planned
    assert planned >= 215
    assert stats2.upserted == planned
    assert {k[1] for k in store if k[0] == "weapon"} == _srd_ids("weapons")
    assert {k[1] for k in store if k[0] == "armor"} == _srd_ids("armor")
    # Mundane C03 SRD gear only (P24-C06 magic_item; P24-C17 FRHoF gear).
    mundane_items = set()
    for key, params in store.items():
        if key[0] != "item":
            continue
        data = params["data"]
        if isinstance(data, str):
            data = json.loads(data)
        if data.get("equipment_group") == "magic_item":
            continue
        if not str(params.get("source") or "").startswith("srd"):
            continue
        mundane_items.add(key[1])
    assert mundane_items == _srd_ids("equipment")
    # Never write 2014 edition.
    for params in store.values():
        assert params["edition"] == "2024"


def test_alembic_single_head_includes_p24_c03():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one alembic head, got {heads}"
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "p24c03gear01" in ancestor_ids
    assert "p24c02feats01" in ancestor_ids


def test_no_who_or_faerun_book_gear_in_live_wave():
    """C03 SRD wave still excludes FRHoF; C17 seeds them under source=frhof."""
    srd_mundane = {
        r["slug"]
        for r in _rows("item")
        if str(r.get("source") or "").startswith("srd")
        and (r.get("data") or {}).get("equipment_group") != "magic_item"
    }
    assert "bandore" not in srd_mundane
    assert "bright-fungal-cloak" not in srd_mundane
    assert "yarting" not in srd_mundane
    frhof = {r["slug"] for r in _rows("item") if r.get("source") == "frhof"}
    assert {"bandore", "bright-fungal-cloak", "yarting"} <= frhof
