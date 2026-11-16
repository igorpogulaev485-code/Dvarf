"""P24-C11: DMG 2024 magic items beyond SRD (community_ref)."""

from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path

from app.services.edition_2024_catalog_seed import (
    EDITION_2024_CATALOG_WAVES,
    apply_edition_2024_catalog_seed,
    entry_id,
    load_wave_rows,
    normalize_item_data,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCES = REPO_ROOT / "docs" / "edition-2024" / "sources"
LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"

DMG24_COUNT = 196
PLANNED_TOTAL = 863 + 235 + 95 + 1 + 12 + 36 + 58 + 69 + DMG24_COUNT + 86 + 87 + 66 + 93 + 43 + 111 + 95  # +C13 MM24 w1 +C14 MM24 w2 +C15 EFA +C17 FRHoF +C12 bastions +C18 +C20 RTW

SRD_ALIASES = {
    "apparatus-of-kwalish": "apparatus-of-the-crab",
    "orb-of-dragonkind": "dragon-orb",
    "quaals-feather-token": "feather-token",
    "hewards-handy-haversack": "handy-haversack",
    "daerns-instant-fortress": "instant-fortress",
    "iron-bands-of-bilarro": "iron-bands",
    "nolzurs-marvelous-pigments": "marvelous-pigments",
    "deck-of-many-things": "mysterious-deck",
    "quiver-of-ehlonna": "efficient-quiver",
    "potion-of-healing__dmg24": "potion-of-healing",
}

MAGIC_TYPES = {
    "armor",
    "weapon",
    "wand",
    "ring",
    "potion",
    "scroll",
    "staff",
    "rod",
    "wondrous",
}
RARITIES = {
    "common",
    "uncommon",
    "rare",
    "very_rare",
    "legendary",
    "artifact",
    "varies",
}


def _dmg24_ids() -> set[str]:
    path = SOURCES / "magic_items.csv"
    with path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return {
        r["id"]
        for r in rows
        if r.get("book") == "DMG24" and str(r.get("srd", "")).lower() == "false"
    }


def _srd_ids() -> set[str]:
    path = SOURCES / "magic_items.csv"
    with path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return {r["id"] for r in rows if str(r.get("srd", "")).lower() == "true"}


def _dmg_rows():
    return [
        r
        for r in load_wave_rows()
        if r["kind"] == "item"
        and r.get("source") == "dmg24"
        and (r.get("data") or {}).get("equipment_group") == "magic_item"
    ]


def _c03_token_map() -> dict[str, set[str]]:
    weapons = json.loads((LIVE / "weapons_srd.json").read_text(encoding="utf-8"))[
        "entries"
    ]
    armor = json.loads((LIVE / "armor_srd.json").read_text(encoding="utf-8"))["entries"]
    equipment = json.loads((LIVE / "equipment_srd.json").read_text(encoding="utf-8"))[
        "entries"
    ]
    out: dict[str, set[str]] = {}
    for w in weapons:
        cat = w["data"].get("category")
        rk = w["data"].get("range_kind")
        for key in (
            f"weapon:{cat}",
            f"weapon:{rk}",
            "weapon:any",
            f"weapon:{cat}:{rk}",
            w["slug"],
        ):
            out.setdefault(key, set()).add(w["slug"])
    for a in armor:
        kind = a["data"].get("armor_kind")
        out.setdefault(f"armor:{kind}", set()).add(a["slug"])
        out.setdefault(a["slug"], set()).add(a["slug"])
        if kind != "shield":
            out.setdefault("armor:any", set()).add(a["slug"])
    for e in equipment:
        if e["slug"] in {
            "arrows",
            "crossbow-bolts",
            "sling-bullets",
            "needles",
            "firearm-bullets",
            "ammunition",
        } or e["data"].get("equipment_group") == "ammunition":
            out.setdefault("ammunition", set()).add(e["slug"])
    out.setdefault("plate-armor", set()).add("plate-armor")
    return out


def test_reference_dmg24_beyond_srd_count():
    ids = _dmg24_ids()
    assert len(ids) == DMG24_COUNT
    assert "alchemy-jug" in ids
    assert "blackrazor" in ids
    assert "apparatus-of-kwalish" in ids
    assert "apparatus-of-the-crab" in _srd_ids()
    assert "apparatus-of-the-crab" not in ids


def test_live_dmg24_wave_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "magic_items_dmg24.json" in names
    assert (LIVE / "magic_items_dmg24.json").is_file()
    live = _dmg_rows()
    assert len(live) == DMG24_COUNT
    assert {r["slug"] for r in live} == _dmg24_ids()
    for row in live:
        assert row["rules_edition"] == "2024"
        assert row["data"].get("content_layer") == "community_ref"
        assert row["source"] == "dmg24"


def test_no_slug_overlap_with_srd_magic_wave():
    assert {r["slug"] for r in _dmg_rows()}.isdisjoint(_srd_ids())


def test_each_dmg_item_has_required_fields():
    for row in _dmg_rows():
        data = row["data"]
        assert data.get("magic_item_type") in MAGIC_TYPES, row["slug"]
        assert data.get("magic_item_type_ru"), row["slug"]
        assert data.get("rarity") in RARITIES, row["slug"]
        assert data.get("rarity_ru"), row["slug"]
        assert isinstance(data.get("requires_attunement"), bool)
        if data["requires_attunement"] and data.get("attunement_restriction_ru"):
            assert isinstance(data["attunement_restriction_ru"], str)
        assert isinstance(data.get("cursed"), bool)
        assert isinstance(data.get("sentient"), bool)
        assert data.get("summary_ru"), row["slug"]
        assert row["name_ru"] and row["name_en"]
        assert isinstance(data.get("name_ru_pending"), bool)
        assert isinstance(data.get("text_ru_pending"), bool)


def test_named_items_linked_via_srd_alias():
    srd_slugs = {
        r["slug"]
        for r in load_wave_rows()
        if r["kind"] == "item"
        and str(r.get("source", "")).startswith("srd")
        and (r.get("data") or {}).get("equipment_group") == "magic_item"
    }
    by_slug = {r["slug"]: r for r in _dmg_rows()}
    for named, alias in SRD_ALIASES.items():
        row = by_slug[named]
        assert row["data"].get("srd_alias") == alias
        assert alias in srd_slugs
        assert named != alias
        assert row["id"] != entry_id(kind="item", slug=alias)


def test_spell_refs_resolve():
    spell_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "spell"}
    for row in _dmg_rows():
        for sid in row["data"].get("spell_refs") or []:
            assert sid in spell_slugs, f"{row['slug']} → {sid}"


def test_base_item_categories_resolve_to_c03():
    tokens = _c03_token_map()
    checked = 0
    for row in _dmg_rows():
        for tok in row["data"].get("base_item_categories") or []:
            if tok.startswith("armor:exclude:"):
                continue
            if tok in tokens:
                assert tokens[tok], tok
                checked += 1
            elif tok in {
                r["slug"]
                for r in load_wave_rows()
                if r["kind"] in {"weapon", "armor", "item"}
            }:
                checked += 1
            else:
                raise AssertionError(f"{row['slug']}: unresolved base token {tok}")
    assert checked >= 20


def test_type_and_rarity_distribution():
    types = Counter(r["data"]["magic_item_type"] for r in _dmg_rows())
    rares = Counter(r["data"]["rarity"] for r in _dmg_rows())
    assert types["wondrous"] >= 80
    assert types["weapon"] >= 15
    assert rares["common"] >= 30
    assert rares["artifact"] >= 8


def test_names_match_reference_csv():
    ref = {
        r["id"]: r
        for r in csv.DictReader((SOURCES / "magic_items.csv").open(encoding="utf-8"))
        if r["book"] == "DMG24" and r["srd"] == "false"
    }
    for row in _dmg_rows():
        assert row["name_ru"] == ref[row["slug"]]["name_ru"]
        assert row["name_en"] == ref[row["slug"]]["name_en"]


def test_normalize_magic_item_defaults_include_sentient_and_alias():
    m = normalize_item_data({"equipment_group": "magic_item"})
    assert m["requires_attunement"] is False
    assert m["cursed"] is False
    assert m["sentient"] is False
    assert m["srd_alias"] is None
    assert m["text_ru_pending"] is False


def test_2014_magic_gear_untouched_and_pickers_pin_2014():
    gear_dir = REPO_ROOT / "backend" / "data" / "srd" / "2014"
    for name in ("gear_wondrous_srd_v1.json", "gear_spell_scrolls_4_9_v1.json"):
        path = gear_dir / name
        if not path.is_file():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        items = payload.get("inserts") or payload.get("entries") or payload
        assert items
        for item in items[:30]:
            if isinstance(item, dict) and item.get("rules_edition") is not None:
                assert item["rules_edition"] == "2014", name
    for row in _dmg_rows():
        assert row["rules_edition"] == "2024"
        assert row["id"] == entry_id(kind="item", slug=row["slug"])
    pipeline = (
        REPO_ROOT
        / "frontend"
        / "src"
        / "features"
        / "createPipeline"
        / "pipelineApply.ts"
    )
    text = pipeline.read_text(encoding="utf-8")
    assert "edition: '2014'" in text


def test_apply_seed_includes_dmg24_idempotent():
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
    assert stats1.upserted == planned == PLANNED_TOTAL
    assert stats2.upserted == planned
    dmg = {
        k[1]
        for k, v in store.items()
        if k[0] == "item" and v["source"] == "dmg24"
    }
    assert dmg == _dmg24_ids()


def test_alembic_single_head_includes_p24_c11():
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
    assert "p24c10phb01" in ancestor_ids
    assert "p24c11dmg01" in ancestor_ids
    assert "p24c13mmw101" in ancestor_ids
