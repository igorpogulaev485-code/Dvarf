"""P24-C09: PHB 2024 species / backgrounds / subclasses beyond SRD."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from app.services.edition_2024_catalog_seed import (
    EDITION_2024_CATALOG_WAVES,
    apply_edition_2024_catalog_seed,
    entry_id,
    load_wave_rows,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCES = REPO_ROOT / "docs" / "edition-2024" / "sources"
LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"

PH24_EXTRA = 1 + 12 + 36
# C10 adds 58 feats + 69 spells on top of C01–C09 baseline.
PLANNED_TOTAL = 863 + 235 + 95 + PH24_EXTRA + 58 + 69 + 196 + 86 + 87  # +C11 DMG24 +C13 MM24 w1 +C14 MM24 w2

SRD_ORIGIN_FEATS = {"alert", "magic-initiate", "savage-attacker", "skilled"}


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
    """Layer 1: PH24 srd=false rows match seed targets."""
    assert _ph24_ids("species") == {"aasimar"}
    assert len(_ph24_ids("backgrounds")) == 12
    assert len(_ph24_ids("subclasses")) == 36
    assert "guard" in _ph24_ids("backgrounds")
    assert "noble" in _ph24_ids("backgrounds")
    assert "goliath" not in _ph24_ids("species")  # already SRD / C01
    assert "orc" not in _ph24_ids("species")
    assert "artificer__alchemist" not in _ph24_ids("subclasses")


def test_live_ph24_waves_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "species_ph24.json" in names
    assert "backgrounds_ph24.json" in names
    assert "subclasses_ph24.json" in names
    for name in (
        "species_ph24.json",
        "backgrounds_ph24.json",
        "subclasses_ph24.json",
    ):
        assert (LIVE / name).is_file()

    races = _rows("race", source="ph24")
    bgs = _rows("background", source="ph24")
    subs = _rows("subclass", source="ph24")
    assert {r["slug"] for r in races} == _ph24_ids("species")
    assert {r["slug"] for r in bgs} == _ph24_ids("backgrounds")
    assert {r["slug"] for r in subs} == _ph24_ids("subclasses")
    assert len(races) == 1
    assert len(bgs) == 12
    assert len(subs) == 36


def test_no_slug_overlap_with_c01_c04_srd():
    ph_races = {r["slug"] for r in _rows("race", source="ph24")}
    ph_bgs = {r["slug"] for r in _rows("background", source="ph24")}
    ph_subs = {r["slug"] for r in _rows("subclass", source="ph24")}
    assert ph_races.isdisjoint(_srd_ids("species"))
    assert ph_bgs.isdisjoint(_srd_ids("backgrounds"))
    assert ph_subs.isdisjoint(_srd_ids("subclasses"))


def test_species_empty_asi_community_ref():
    for row in _rows("race", source="ph24"):
        data = row["data"]
        assert data.get("ability_bonuses") == {}
        assert data.get("creature_type") == "humanoid"
        assert data.get("speed")
        assert data.get("size") or data.get("size_options")
        assert data.get("traits_text")
        assert data.get("content_layer") == "community_ref"
        assert data.get("languages") in ([], None) or data.get("languages") == []
        assert row["rules_edition"] == "2024"
        assert (row.get("external_ref") or {}).get("book") == "PH24"


def test_backgrounds_asi_origin_feat_and_community_ref():
    for row in _rows("background", source="ph24"):
        data = row["data"]
        asi = data.get("asi")
        assert isinstance(asi, dict)
        assert len(asi.get("abilities") or []) == 3
        assert "+2/+1" in (asi.get("options") or [])
        feat = data.get("origin_feat")
        assert isinstance(feat, dict)
        assert feat.get("id") and feat.get("name_ru") and feat.get("name_en")
        assert len(data.get("skill_proficiencies") or []) == 2
        equip = data.get("equipment_or_gold") or {}
        assert equip.get("gold_alternative_gp") == 50
        assert data.get("content_layer") == "community_ref"
        assert row["rules_edition"] == "2024"


def test_origin_feats_resolve_after_c10():
    """All C09 background origin_feat ids resolve once feats_ph24 (C10) is loaded."""
    feat_slugs = {
        r["slug"] for r in load_wave_rows() if r["kind"] == "feat"
    }
    required = {
        "crafter",
        "musician",
        "tough",
        "healer",
        "lucky",
        "tavern-brawler",
    }
    assert required <= feat_slugs
    for row in _rows("background", source="ph24"):
        fid = (row["data"].get("origin_feat") or {}).get("id")
        assert fid, row["slug"]
        assert fid in feat_slugs, f"{row['slug']} → {fid}"


def test_subclass_parent_and_features():
    class_ids = {r["slug"]: r["id"] for r in _rows("class")}
    for row in _rows("subclass", source="ph24"):
        data = row["data"]
        parent = data.get("parent_class")
        assert parent in class_ids, row["slug"]
        assert row.get("parent_id") == class_ids[parent] == entry_id(
            kind="class", slug=parent
        )
        assert data.get("subclass_level") == 3
        feats = data.get("features") or []
        assert feats
        assert feats[0]["level"] == 3
        for block in feats:
            assert block["level"] >= 3
            assert block.get("features")
            for f in block["features"]:
                assert f.get("id") and f.get("name_ru") and f.get("summary_ru")
        assert isinstance(data.get("spell_list"), list)
        assert data.get("content_layer") == "community_ref"
        assert (row.get("external_ref") or {}).get("book") == "PH24"


def test_names_match_reference_csv():
    for category, kind in (
        ("species", "race"),
        ("backgrounds", "background"),
        ("subclasses", "subclass"),
    ):
        ref = {
            r["id"]: r
            for r in csv.DictReader((SOURCES / f"{category}.csv").open(encoding="utf-8"))
            if r["book"] == "PH24" and r["srd"] == "false"
        }
        for row in _rows(kind, source="ph24"):
            assert row["name_ru"] == ref[row["slug"]]["name_ru"]
            assert row["name_en"] == ref[row["slug"]]["name_en"]


def test_2014_catalog_untouched_and_create_pipeline_pinned():
    spec = REPO_ROOT / "backend" / "data" / "classes" / "phb2014_class_catalog_spec.json"
    assert spec.is_file()
    payload = json.loads(spec.read_text(encoding="utf-8"))
    assert payload.get("meta", {}).get("edition_tag") == "2014"
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
    assert {k[1] for k, v in store.items() if k[0] == "race" and v["source"] == "ph24"} == {
        "aasimar"
    }
    assert (
        len(
            {
                k[1]
                for k, v in store.items()
                if k[0] == "background" and v["source"] == "ph24"
            }
        )
        == 12
    )
    assert (
        len(
            {
                k[1]
                for k, v in store.items()
                if k[0] == "subclass" and v["source"] == "ph24"
            }
        )
        == 36
    )
    for params in store.values():
        assert params["edition"] == "2024"
        assert "'2014'" not in json.dumps(params)


def test_alembic_single_head_includes_p24_c09():
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
    assert "p24c08anim01" in ancestor_ids
    assert "p24c01speci01" in ancestor_ids
    assert "p24c04class01" in ancestor_ids
    # C10 may become the tip; C09 must remain an ancestor.


def test_no_who_or_artificer_in_this_pack():
    for row in load_wave_rows():
        assert "who" not in row["slug"].lower()
        assert not row["slug"].startswith("artificer")
