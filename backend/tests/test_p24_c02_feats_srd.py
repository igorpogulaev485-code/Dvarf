"""P24-C02: SRD 2024 feats catalog seed."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from app.services.edition_2024_catalog_seed import (
    EDITION_2024_CATALOG_WAVES,
    apply_edition_2024_catalog_seed,
    entry_id,
    load_wave_rows,
    normalize_feat_data,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCES = REPO_ROOT / "docs" / "edition-2024" / "sources"
LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"

SRD_FEATS_EXPECTED = {
    "alert",
    "magic-initiate",
    "savage-attacker",
    "skilled",
    "ability-score-improvement",
    "grappler",
    "archery",
    "defense",
    "great-weapon-fighting",
    "two-weapon-fighting",
    "boon-of-combat-prowess",
    "boon-of-dimensional-travel",
    "boon-of-fate",
    "boon-of-irresistible-offense",
    "boon-of-spell-recall",
    "boon-of-the-night-spirit",
    "boon-of-truesight",
}

ORIGIN_FEATS = {"alert", "magic-initiate", "savage-attacker", "skilled"}
GENERAL_FEATS = {"ability-score-improvement", "grappler"}
FIGHTING_STYLE_FEATS = {
    "archery",
    "defense",
    "great-weapon-fighting",
    "two-weapon-fighting",
}
EPIC_BOONS = {
    "boon-of-combat-prowess",
    "boon-of-dimensional-travel",
    "boon-of-fate",
    "boon-of-irresistible-offense",
    "boon-of-spell-recall",
    "boon-of-the-night-spirit",
    "boon-of-truesight",
}

CATEGORY_BY_SLUG = {
    **{s: "origin" for s in ORIGIN_FEATS},
    **{s: "general" for s in GENERAL_FEATS},
    **{s: "fighting_style" for s in FIGHTING_STYLE_FEATS},
    **{s: "epic_boon" for s in EPIC_BOONS},
}


def _srd_ids(category: str) -> set[str]:
    path = SOURCES / f"{category}.csv"
    with path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return {r["id"] for r in rows if str(r.get("srd", "")).lower() == "true"}


def _feat_rows():
    """SRD feat wave only (PHB-beyond feats live in C10 / source=ph24)."""
    return [
        r
        for r in load_wave_rows()
        if r["kind"] == "feat" and str(r.get("source", "")).startswith("srd")
    ]


def test_reference_srd_feats_match_official_list():
    """Layer 1: srd=true rows match SRD 5.2.1 Feats (17). Tough is PHB-only."""
    assert _srd_ids("feats") == SRD_FEATS_EXPECTED
    assert len(SRD_FEATS_EXPECTED) == 17
    all_feats = {
        r["id"]
        for r in csv.DictReader((SOURCES / "feats.csv").open(encoding="utf-8"))
    }
    assert "tough" in all_feats
    assert "tough" not in _srd_ids("feats")
    assert "skilled" in _srd_ids("feats")


def test_live_feats_wave_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "feats_srd.json" in names
    assert (LIVE / "feats_srd.json").is_file()

    feats = _feat_rows()
    assert {r["slug"] for r in feats} == SRD_FEATS_EXPECTED
    assert len(feats) == len(_srd_ids("feats"))


def test_each_feat_has_category_and_prerequisites():
    for row in _feat_rows():
        data = row["data"]
        assert data.get("category") == CATEGORY_BY_SLUG[row["slug"]], row["slug"]
        assert "prerequisites" in data
        prereq = data["prerequisites"]
        assert isinstance(prereq, dict)
        assert data.get("content_layer") == "srd"
        assert data.get("summary_ru") or data.get("traits_text")
        assert isinstance(data.get("repeatable"), bool)

        if data["category"] == "general":
            assert prereq.get("level") == 4
        elif data["category"] == "fighting_style":
            assert prereq.get("fighting_style_feature") is True
        elif data["category"] == "epic_boon":
            assert prereq.get("level") == 19
        elif data["category"] == "origin":
            assert prereq.get("level") in (None, 0) or "level" not in prereq


def test_asi_and_repeatable_fields():
    by_slug = {r["slug"]: r["data"] for r in _feat_rows()}

    asi = by_slug["ability-score-improvement"]
    assert asi["repeatable"] is True
    bump = asi["ability_score_increase"]
    assert bump["cap"] == 20
    assert any(o.get("amount") == 2 for o in bump["options"])

    assert by_slug["magic-initiate"]["repeatable"] is True
    assert by_slug["skilled"]["repeatable"] is True
    assert by_slug["alert"]["repeatable"] is False

    grappler = by_slug["grappler"]
    assert grappler["ability_score_increase"]["cap"] == 20
    assert set(grappler["ability_score_increase"]["from"]) == {"str", "dex"}

    for slug in EPIC_BOONS:
        bump = by_slug[slug]["ability_score_increase"]
        assert bump is not None
        assert bump["cap"] == 30
        assert bump.get("amount") == 1

    assert by_slug["boon-of-spell-recall"]["prerequisites"].get("spellcasting_feature")


def test_names_match_reference_csv():
    feat_csv = {
        r["id"]: r
        for r in csv.DictReader((SOURCES / "feats.csv").open(encoding="utf-8"))
        if r["srd"] == "true"
    }
    for row in _feat_rows():
        ref = feat_csv[row["slug"]]
        assert row["name_ru"] == ref["name_ru"]
        assert row["name_en"] == ref["name_en"]


def test_background_origin_feats_resolve_to_catalog_cards():
    """SRD (C01) backgrounds reference origin feats by id — cards must exist after C02.

    PHB-beyond backgrounds (C09) are covered by P24-C10 once feats_ph24 lands.
    """
    feat_slugs = {r["slug"] for r in _feat_rows()}
    for row in load_wave_rows():
        if row["kind"] != "background":
            continue
        if not str(row["source"]).startswith("srd"):
            continue
        origin = (row["data"] or {}).get("origin_feat") or {}
        feat_id = origin.get("id") or origin.get("slug")
        assert feat_id, row["slug"]
        assert feat_id in feat_slugs, f"{row['slug']} → {feat_id}"
        # Deterministic catalog id matches seed entry id scheme.
        assert entry_id(kind="feat", slug=feat_id) == entry_id(
            kind="feat", slug=feat_id
        )


def test_normalize_feat_defaults():
    empty = normalize_feat_data({})
    assert empty["category"] is None
    assert empty["prerequisites"] == {}
    assert empty["repeatable"] is False
    assert empty["ability_score_increase"] is None


def test_no_tough_or_phb_only_in_live_wave():
    slugs = {r["slug"] for r in _feat_rows()}
    assert "tough" not in slugs
    assert "actor" not in slugs
    assert "boon-of-skill" not in slugs


def test_counts_json_feats_total_unchanged():
    counts = json.loads((SOURCES / "counts.json").read_text(encoding="utf-8"))
    rows = list(csv.DictReader((SOURCES / "feats.csv").open(encoding="utf-8")))
    assert counts["by_category"]["feats"] == len(rows)


def test_seed_plan_edition_2024_only_for_feats():
    for row in _feat_rows():
        assert row["rules_edition"] == "2024"
        assert row["kind"] == "feat"
        assert row["source"].startswith("srd")


def test_apply_seed_includes_feats_idempotent():
    store: dict[tuple[str, str], dict] = {}
    executed: list[str] = []

    class FakeResult:
        def __init__(self, row=None, rowcount=0):
            self._row = row
            self.rowcount = rowcount

        def first(self):
            return self._row

    class FakeConn:
        def execute(self, statement, params=None):
            sql = str(statement)
            executed.append(sql)
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
    stats1 = apply_edition_2024_catalog_seed(conn)  # type: ignore[arg-type]
    stats2 = apply_edition_2024_catalog_seed(conn)  # type: ignore[arg-type]

    # Live waves grow with later C-packs; assert against the planned row count.
    planned = len(load_wave_rows())
    assert stats1.upserted == planned
    assert stats2.upserted == planned
    srd_feat_slugs = {
        k[1]
        for k, v in store.items()
        if k[0] == "feat" and str(v.get("source", "")).startswith("srd")
    }
    assert srd_feat_slugs == SRD_FEATS_EXPECTED
    joined = "\n".join(executed)
    assert "'2014'" not in joined


def test_create_pipeline_still_pins_2014_for_pickers():
    """2014 create wizard must not see 2024 feat cards (edition pinned)."""
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


def test_alembic_single_head_includes_p24_c02():
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
    assert "p24c02feats01" in ancestor_ids
    assert "p24c01speci01" in ancestor_ids
    # C03 may become the tip; C02 must remain an ancestor.
    assert "p24c02feats01" in ancestor_ids
