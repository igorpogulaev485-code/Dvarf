"""P24-C05: SRD 2024 spells catalog seed."""

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
    normalize_spell_data,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCES = REPO_ROOT / "docs" / "edition-2024" / "sources"
LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"

SRD_SPELL_COUNT = 339
CASTER_CLASSES = {
    "bard",
    "cleric",
    "druid",
    "paladin",
    "ranger",
    "sorcerer",
    "warlock",
    "wizard",
}
NON_CASTERS = {"barbarian", "fighter", "monk", "rogue"}
# C01–C09 + P24-C10 (58 feats + 69 spells PHB beyond SRD)
PLANNED_TOTAL = (
    215
    + 12
    + 12
    + SRD_SPELL_COUNT
    + 285
    + 235
    + 95
    + 1
    + 12
    + 36
    + 58
    + 69
)  # +C07+C08+C09+C10

SRD_RENAMES = {
    "acid-arrow",
    "arcane-hand",
    "arcane-sword",
    "arcanists-magic-aura",
    "black-tentacles",
    "faithful-hound",
    "floating-disk",
    "freezing-sphere",
    "hideous-laughter",
    "instant-summons",
    "irresistible-dance",
    "magnificent-mansion",
    "private-sanctum",
    "resilient-sphere",
    "secret-chest",
    "telepathic-bond",
    "tiny-hut",
}
FALSE_NEGATIVES_FIXED = {
    "commune",
    "counterspell",
    "haste",
    "lightning-bolt",
}


def _srd_ids(category: str) -> set[str]:
    path = SOURCES / f"{category}.csv"
    with path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return {r["id"] for r in rows if str(r.get("srd", "")).lower() == "true"}


def _rows(kind: str, *, srd_only: bool = False):
    rows = [r for r in load_wave_rows() if r["kind"] == kind]
    if srd_only:
        rows = [r for r in rows if str(r.get("source", "")).startswith("srd")]
    return rows


def _spell_rows_srd():
    return _rows("spell", srd_only=True)


def test_reference_srd_spell_count_matches_srd():
    """Layer 1: srd=true rows match SRD 5.2.1 after C05 corrections."""
    srd = _srd_ids("spells")
    assert len(srd) == SRD_SPELL_COUNT
    assert SRD_RENAMES <= srd
    assert FALSE_NEGATIVES_FIXED <= srd
    # Prefixed PHB eponyms stay non-SRD rows (SRD uses unprefixed names).
    all_rows = {
        r["id"]: r
        for r in csv.DictReader((SOURCES / "spells.csv").open(encoding="utf-8"))
    }
    assert all_rows["melfs-acid-arrow"]["srd"] == "false"
    assert all_rows["bigbys-hand"]["srd"] == "false"
    assert all_rows["acid-arrow"]["srd"] == "true"
    assert all_rows["counterspell"]["srd"] == "true"


def test_live_spell_wave_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "spells_srd.json" in names
    assert (LIVE / "spells_srd.json").is_file()
    live = _spell_rows_srd()
    assert len(live) == SRD_SPELL_COUNT
    assert {r["slug"] for r in live} == _srd_ids("spells")
    for row in live:
        assert row["rules_edition"] == "2024"
        assert row["data"].get("content_layer") == "srd"


def test_each_spell_has_required_fields():
    for row in _spell_rows_srd():
        data = row["data"]
        assert data.get("level") in range(0, 10), row["slug"]
        assert data.get("school")
        ct = data.get("casting_time")
        assert isinstance(ct, dict) and ct.get("unit"), row["slug"]
        comps = data.get("components")
        assert isinstance(comps, dict)
        assert "v" in comps and "s" in comps
        assert isinstance(data.get("classes"), list)
        for c in data["classes"]:
            assert c in CASTER_CLASSES, (row["slug"], c)
        if ct.get("unit") == "action":
            assert data.get("magic_action") is True, row["slug"]
        else:
            assert data.get("magic_action") is False, row["slug"]
        assert data.get("summary_ru")
        assert row["name_ru"] and row["name_en"]


def test_cantrips_have_level_growth_when_damaging():
    cans = [r for r in _spell_rows_srd() if r["data"]["level"] == 0]
    assert len(cans) == 27
    damaging = [r for r in cans if r["data"].get("damage")]
    assert damaging
    for row in damaging:
        table = row["data"].get("damage_at_character_level") or {}
        assert "5" in table and "11" in table and "17" in table, row["slug"]


def test_class_spell_lists_resolve_to_cards():
    # Include PHB-beyond spells (C10) so class lists stay complete.
    spell_slugs = {r["slug"] for r in _rows("spell")}
    for row in _rows("class"):
        data = row["data"]
        slugs = data.get("spell_list") or []
        if row["slug"] in NON_CASTERS:
            assert slugs == []
        else:
            assert row["slug"] in CASTER_CLASSES
            assert slugs, row["slug"]
            for sid in slugs:
                assert sid in spell_slugs, f"{row['slug']} -> missing {sid}"
            # Every spell that lists this class appears in the class list
            # (ignore Artificer-only refs until the Artificer pack).
            expected = {
                r["slug"]
                for r in _rows("spell")
                if row["slug"] in (r["data"].get("classes") or [])
            }
            assert set(slugs) == expected


def test_subclass_spell_lists_resolve_when_present():
    spell_slugs = {r["slug"] for r in _rows("spell")}
    life = next(r for r in _rows("subclass") if r["slug"] == "cleric__life-domain")
    blocks = life["data"]["spell_list"]
    assert isinstance(blocks, list) and blocks
    flat: set[str] = set()
    for block in blocks:
        for sid in block["spells"]:
            assert sid in spell_slugs
            flat.add(sid)
    assert {"aid", "bless", "cure-wounds"} <= flat


def test_levels_distribution_and_renames_present():
    levels = Counter(r["data"]["level"] for r in _spell_rows_srd())
    assert levels[0] == 27
    assert sum(levels.values()) == SRD_SPELL_COUNT
    slugs = {r["slug"] for r in _spell_rows_srd()}
    assert SRD_RENAMES <= slugs
    # Distinct 2024 card even if 2014 has same EN name.
    for slug in ("fireball", "counterspell", "wish"):
        row = next(r for r in _spell_rows_srd() if r["slug"] == slug)
        assert row["id"] == entry_id(kind="spell", slug=slug)
        assert row["rules_edition"] == "2024"


def test_normalize_spell_defaults():
    s = normalize_spell_data({"casting_time": {"unit": "action", "amount": 1}})
    assert s["magic_action"] is True
    assert s["concentration"] is False
    assert s["schema_version"] == 1


def test_2014_spell_catalog_untouched_and_isolation():
    enriched = REPO_ROOT / "backend" / "data" / "srd" / "2014" / "spells_enriched_v1.json"
    assert enriched.is_file()
    payload = json.loads(enriched.read_text(encoding="utf-8"))
    entries = payload if isinstance(payload, list) else payload.get("entries") or []
    assert len(entries) >= 500
    for e in entries[:20]:
        assert e.get("rules_edition") in {None, "2014", "both"}
    for row in _rows("spell"):
        assert row["rules_edition"] == "2024"
        assert row["rules_edition"] != "2014"
    # Bundled FE 2014 mirror still 2014-only.
    bundled = REPO_ROOT / "frontend" / "public" / "spells-2014.json"
    if bundled.is_file():
        sample = json.loads(bundled.read_text(encoding="utf-8"))
        items = sample if isinstance(sample, list) else sample.get("entries") or []
        assert items
        assert all(i.get("rules_edition") == "2014" for i in items[:50])


def test_apply_seed_includes_spells_idempotent():
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
    spell_rows = [v for k, v in store.items() if k[0] == "spell"]
    assert len(spell_rows) == SRD_SPELL_COUNT + 69  # + PHB beyond (C10)
    assert sum(1 for v in spell_rows if str(v.get("source", "")).startswith("srd")) == (
        SRD_SPELL_COUNT
    )
    for params in store.values():
        assert params["edition"] == "2024"


def test_alembic_single_head_includes_p24_c05():
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
    assert "p24c05spell01" in ancestor_ids
    assert "p24c04class01" in ancestor_ids
    assert "p24c06magic01" in ancestor_ids
    assert "p24c06magic01" in ancestor_ids  # head may advance (C07+)
