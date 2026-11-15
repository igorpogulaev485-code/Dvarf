"""P24-C10: PHB 2024 feats + spells beyond SRD (community_ref)."""

from __future__ import annotations

import csv
import json
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

PH24_FEATS = 58
PH24_SPELLS = 69
PLANNED_TOTAL = 863 + 235 + 95 + 1 + 12 + 36 + PH24_FEATS + PH24_SPELLS + 196 + 86 + 87  # +C11 DMG24 +C13 MM24 w1 +C14 MM24 w2

ORIGIN_FEATS_C09 = {
    "crafter",
    "musician",
    "tough",
    "healer",
    "lucky",
    "tavern-brawler",
}

SRD_ALIASES = {
    "melfs-acid-arrow": "acid-arrow",
    "bigbys-hand": "arcane-hand",
    "mordenkainens-sword": "arcane-sword",
    "nystuls-magic-aura": "arcanists-magic-aura",
    "evards-black-tentacles": "black-tentacles",
    "mordenkainens-faithful-hound": "faithful-hound",
    "tensers-floating-disk": "floating-disk",
    "otilukes-freezing-sphere": "freezing-sphere",
    "tashas-hideous-laughter": "hideous-laughter",
    "drawmijs-instant-summons": "instant-summons",
    "ottos-irresistible-dance": "irresistible-dance",
    "mordenkainens-magnificent-mansion": "magnificent-mansion",
    "mordenkainens-private-sanctum": "private-sanctum",
    "otilukes-resilient-sphere": "resilient-sphere",
    "leomunds-secret-chest": "secret-chest",
    "rarys-telepathic-bond": "telepathic-bond",
    "leomunds-tiny-hut": "tiny-hut",
}

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


def _ph24_ids(category: str) -> set[str]:
    path = SOURCES / f"{category}.csv"
    with path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return {
        r["id"]
        for r in rows
        if r.get("book") == "PH24" and str(r.get("srd", "")).lower() == "false"
    }


def _srd_ids(category: str) -> set[str]:
    path = SOURCES / f"{category}.csv"
    with path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return {r["id"] for r in rows if str(r.get("srd", "")).lower() == "true"}


def _rows(kind: str, *, source: str | None = None):
    out = [r for r in load_wave_rows() if r["kind"] == kind]
    if source is not None:
        out = [r for r in out if r["source"] == source]
    return out


def test_reference_ph24_beyond_srd_counts():
    assert len(_ph24_ids("feats")) == PH24_FEATS
    assert len(_ph24_ids("spells")) == PH24_SPELLS
    assert _ph24_ids("equipment") == set()
    assert _ph24_ids("magic_items") == set()
    assert ORIGIN_FEATS_C09 <= _ph24_ids("feats")
    assert "melfs-acid-arrow" in _ph24_ids("spells")
    assert "acid-arrow" in _srd_ids("spells")


def test_live_ph24_waves_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "feats_ph24.json" in names
    assert "spells_ph24.json" in names
    assert (LIVE / "feats_ph24.json").is_file()
    assert (LIVE / "spells_ph24.json").is_file()

    feats = _rows("feat", source="ph24")
    spells = _rows("spell", source="ph24")
    assert {r["slug"] for r in feats} == _ph24_ids("feats")
    assert {r["slug"] for r in spells} == _ph24_ids("spells")
    assert len(feats) == PH24_FEATS
    assert len(spells) == PH24_SPELLS


def test_no_slug_overlap_with_srd_waves():
    assert {r["slug"] for r in _rows("feat", source="ph24")}.isdisjoint(
        _srd_ids("feats")
    )
    assert {r["slug"] for r in _rows("spell", source="ph24")}.isdisjoint(
        _srd_ids("spells")
    )


def test_feats_category_community_ref_and_summary():
    for row in _rows("feat", source="ph24"):
        data = row["data"]
        assert data.get("category") in {
            "origin",
            "general",
            "fighting_style",
            "epic_boon",
        }, row["slug"]
        assert isinstance(data.get("prerequisites"), dict)
        assert isinstance(data.get("repeatable"), bool)
        assert data.get("summary_ru")
        assert data.get("traits_text")
        assert data.get("content_layer") == "community_ref"
        assert row["rules_edition"] == "2024"
        assert row["name_ru"] and row["name_en"]


def test_origin_feats_from_all_backgrounds_resolve():
    feat_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "feat"}
    assert ORIGIN_FEATS_C09 <= feat_slugs
    for row in load_wave_rows():
        if row["kind"] != "background":
            continue
        origin = (row["data"] or {}).get("origin_feat") or {}
        feat_id = origin.get("id") or origin.get("slug")
        assert feat_id, row["slug"]
        assert feat_id in feat_slugs, f"{row['slug']} → {feat_id}"
        assert entry_id(kind="feat", slug=feat_id)


def test_named_spells_linked_via_srd_alias():
    srd_slugs = {r["slug"] for r in _rows("spell") if str(r["source"]).startswith("srd")}
    by_slug = {r["slug"]: r for r in _rows("spell", source="ph24")}
    for named, alias in SRD_ALIASES.items():
        row = by_slug[named]
        assert row["data"].get("srd_alias") == alias
        assert alias in srd_slugs
        # Separate cards — not merged.
        assert named != alias
        assert row["id"] != entry_id(kind="spell", slug=alias)


def test_spells_required_fields_and_community_ref():
    allowed_classes = CASTER_CLASSES | {"artificer"}
    for row in _rows("spell", source="ph24"):
        data = row["data"]
        assert data.get("level") in range(0, 10), row["slug"]
        assert data.get("school")
        ct = data.get("casting_time")
        assert isinstance(ct, dict) and ct.get("unit"), row["slug"]
        comps = data.get("components")
        assert isinstance(comps, dict)
        assert "v" in comps and "s" in comps
        assert isinstance(data.get("classes"), list) and data["classes"]
        for c in data["classes"]:
            assert c in allowed_classes, (row["slug"], c)
        assert data.get("summary_ru")
        assert data.get("content_layer") == "community_ref"
        assert row["rules_edition"] == "2024"


def test_class_and_subclass_spell_lists_include_ph24():
    spell_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "spell"}
    # Class lists contain PHB-beyond slugs.
    wizard = next(r for r in _rows("class") if r["slug"] == "wizard")
    assert "melfs-acid-arrow" in (wizard["data"].get("spell_list") or [])
    warlock = next(r for r in _rows("class") if r["slug"] == "warlock")
    assert "armor-of-agathys" in (warlock["data"].get("spell_list") or [])

    for row in _rows("class"):
        for sid in row["data"].get("spell_list") or []:
            assert sid in spell_slugs, f"{row['slug']} → {sid}"

    # C09 subclass lists that referenced C10 spells now resolve.
    for row in load_wave_rows():
        if row["kind"] != "subclass":
            continue
        for block in row["data"].get("spell_list") or []:
            if not isinstance(block, dict):
                continue
            for sid in block.get("spells") or []:
                assert sid in spell_slugs, f"{row['slug']} → {sid}"


def test_names_match_reference_csv():
    feat_csv = {
        r["id"]: r
        for r in csv.DictReader((SOURCES / "feats.csv").open(encoding="utf-8"))
        if r["book"] == "PH24" and r["srd"] == "false"
    }
    spell_csv = {
        r["id"]: r
        for r in csv.DictReader((SOURCES / "spells.csv").open(encoding="utf-8"))
        if r["book"] == "PH24" and r["srd"] == "false"
    }
    for row in _rows("feat", source="ph24"):
        ref = feat_csv[row["slug"]]
        assert row["name_ru"] == ref["name_ru"]
        assert row["name_en"] == ref["name_en"]
    for row in _rows("spell", source="ph24"):
        ref = spell_csv[row["slug"]]
        assert row["name_ru"] == ref["name_ru"]
        assert row["name_en"] == ref["name_en"]


def test_normalize_spell_defaults_include_srd_alias():
    empty = normalize_spell_data({})
    assert empty.get("srd_alias") is None


def test_2014_catalog_unchanged_and_pickers_pin_2014():
    """2014 create pipeline stays pinned; 2024 waves do not claim edition 2014."""
    for row in load_wave_rows():
        if row["kind"] in {"feat", "spell"} and row["source"] == "ph24":
            assert row["rules_edition"] == "2024"
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
    # Bundled 2014 spell mirror (if present) stays 2014-only.
    bundled = REPO_ROOT / "frontend" / "public" / "spells-2014.json"
    if bundled.is_file():
        sample = json.loads(bundled.read_text(encoding="utf-8"))
        items = sample if isinstance(sample, list) else sample.get("entries") or []
        assert items
        assert all(i.get("rules_edition") == "2014" for i in items[:50])


def test_apply_seed_includes_ph24_idempotent():
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
    assert {
        k[1] for k, v in store.items() if k[0] == "feat" and v["source"] == "ph24"
    } == _ph24_ids("feats")
    assert {
        k[1] for k, v in store.items() if k[0] == "spell" and v["source"] == "ph24"
    } == _ph24_ids("spells")


def test_alembic_single_head_includes_p24_c10():
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
    assert "p24c09phb01" in ancestor_ids
    assert "p24c10phb01" in ancestor_ids
    # Head advances with later catalog packs (C11+); C10 must remain an ancestor.
    assert heads[0] in {"p24c10phb01", "p24c11dmg01"} or "p24c10phb01" in ancestor_ids
