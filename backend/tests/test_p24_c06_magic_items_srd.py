"""P24-C06: SRD 2024 magic items catalog seed."""

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

SRD_MAGIC_COUNT = 285
# C01–C05 catalog rows + magic items
PLANNED_TOTAL = 215 + 12 + 12 + 339 + SRD_MAGIC_COUNT + 235 + 95 + 1 + 12 + 36 + 58 + 69 + 196 + 86  # C11 DMG items + C13 MM24 w1

SRD_RENAMES = {
    "apparatus-of-the-crab",
    "dragon-orb",
    "efficient-quiver",
    "feather-token",
    "handy-haversack",
    "instant-fortress",
    "iron-bands",
    "marvelous-pigments",
    "mysterious-deck",
}
EPONYMS_FALSE = {
    "apparatus-of-kwalish",
    "orb-of-dragonkind",
    "quaals-feather-token",
    "hewards-handy-haversack",
    "daerns-instant-fortress",
    "iron-bands-of-bilarro",
    "nolzurs-marvelous-pigments",
    "deck-of-many-things",
}
HEALING = {
    "potion-of-healing",
    "potion-of-greater-healing",
    "potion-of-superior-healing",
    "potion-of-supreme-healing",
}
SCROLLS = {f"spell-scroll-level-{n}" for n in range(1, 10)} | {"spell-scroll-cantrip"}

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


def _srd_ids(category: str) -> set[str]:
    path = SOURCES / f"{category}.csv"
    with path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return {r["id"] for r in rows if str(r.get("srd", "")).lower() == "true"}


def _magic_rows():
    """SRD magic-item wave only (C06). DMG beyond SRD lives in C11."""
    return [
        r
        for r in load_wave_rows()
        if r["kind"] == "item"
        and str(r.get("source", "")).startswith("srd")
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


def test_reference_srd_magic_item_count_matches_srd():
    srd = _srd_ids("magic_items")
    assert len(srd) == SRD_MAGIC_COUNT
    assert SRD_RENAMES <= srd
    assert HEALING <= srd
    assert SCROLLS <= srd
    all_rows = {
        r["id"]: r
        for r in csv.DictReader((SOURCES / "magic_items.csv").open(encoding="utf-8"))
    }
    for eid in EPONYMS_FALSE:
        assert all_rows[eid]["srd"] == "false", eid
    assert all_rows["apparatus-of-the-crab"]["srd"] == "true"
    assert all_rows["potion-of-healing"]["srd"] == "true"


def test_live_magic_item_wave_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "magic_items_srd.json" in names
    assert (LIVE / "magic_items_srd.json").is_file()
    live = _magic_rows()
    assert len(live) == SRD_MAGIC_COUNT
    assert {r["slug"] for r in live} == _srd_ids("magic_items")
    for row in live:
        assert row["rules_edition"] == "2024"
        assert row["data"].get("content_layer") == "srd"


def test_each_magic_item_has_required_fields():
    for row in _magic_rows():
        data = row["data"]
        assert data.get("magic_item_type") in MAGIC_TYPES, row["slug"]
        assert data.get("magic_item_type_ru"), row["slug"]
        assert data.get("rarity") in RARITIES, row["slug"]
        assert data.get("rarity_ru"), row["slug"]
        assert isinstance(data.get("requires_attunement"), bool)
        if data["requires_attunement"] and data.get("attunement_restriction_ru"):
            assert isinstance(data["attunement_restriction_ru"], str)
        assert isinstance(data.get("cursed"), bool)
        assert data.get("summary_ru"), row["slug"]
        assert row["name_ru"] and row["name_en"]


def test_spell_refs_resolve_to_c05():
    spell_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "spell"}
    assert spell_slugs
    with_spells = 0
    for row in _magic_rows():
        refs = row["data"].get("spell_refs") or []
        assert isinstance(refs, list)
        for sid in refs:
            assert sid in spell_slugs, f"{row['slug']} -> missing spell {sid}"
        if refs:
            with_spells += 1
    assert with_spells >= 20


def test_base_item_categories_resolve_to_c03():
    tokens = _c03_token_map()
    checked = 0
    for row in _magic_rows():
        cats = row["data"].get("base_item_categories") or []
        for tok in cats:
            if tok.startswith("armor:exclude:"):
                continue
            if tok in tokens:
                assert tokens[tok], tok
                checked += 1
            elif tok in {r["slug"] for r in load_wave_rows() if r["kind"] in {"weapon", "armor", "item"}}:
                checked += 1
            else:
                raise AssertionError(f"{row['slug']}: unresolved base token {tok}")
    assert checked >= 10


def test_type_and_rarity_distribution():
    types = Counter(r["data"]["magic_item_type"] for r in _magic_rows())
    rares = Counter(r["data"]["rarity"] for r in _magic_rows())
    assert types["potion"] >= 20
    assert types["scroll"] == 10
    assert types["wondrous"] >= 100
    assert rares["uncommon"] >= 50
    assert rares["legendary"] >= 20


def test_normalize_magic_item_defaults():
    m = normalize_item_data({"equipment_group": "magic_item"})
    assert m["requires_attunement"] is False
    assert m["cursed"] is False
    assert m["spell_refs"] == []
    mundane = normalize_item_data({"equipment_group": "toolkit"})
    assert "magic_item_type" not in mundane or mundane.get("magic_item_type") is None


def test_2014_magic_gear_untouched_and_isolation():
    gear_dir = REPO_ROOT / "backend" / "data" / "srd" / "2014"
    samples = [
        "gear_wondrous_srd_v1.json",
        "gear_spell_scrolls_4_9_v1.json",
    ]
    for name in samples:
        path = gear_dir / name
        if not path.is_file():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        items = payload.get("inserts") or payload.get("entries") or payload
        assert items
        for item in items[:30]:
            if isinstance(item, dict) and item.get("rules_edition") is not None:
                assert item["rules_edition"] == "2014", name
    for row in _magic_rows():
        assert row["rules_edition"] == "2024"
        assert row["id"] == entry_id(kind="item", slug=row["slug"])


def test_apply_seed_includes_magic_items_idempotent():
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
    magic = 0
    for params in store.values():
        assert params["edition"] == "2024"
        if params["kind"] == "item" and str(params.get("source", "")).startswith("srd"):
            data = json.loads(params["data"]) if isinstance(params["data"], str) else params["data"]
            if data.get("equipment_group") == "magic_item":
                magic += 1
    assert magic == SRD_MAGIC_COUNT


def test_alembic_single_head_includes_p24_c06():
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
    assert "p24c06magic01" in ancestor_ids
    assert "p24c05spell01" in ancestor_ids
    # Head advances with later catalog packs (C07+); C06 must remain an ancestor.
    assert (
        heads[0] in {"p24c06magic01", "p24c07best01", "p24c08anim01"}
        or "p24c06magic01" in ancestor_ids
    )
