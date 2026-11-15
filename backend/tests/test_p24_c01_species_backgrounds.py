"""P24-C01: SRD 2024 species + backgrounds catalog seed."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from app.services.edition_2024_catalog_seed import (
    EDITION_2024_CATALOG_WAVES,
    apply_edition_2024_catalog_seed,
    entry_id,
    load_wave_rows,
    normalize_entry_payload,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCES = REPO_ROOT / "docs" / "edition-2024" / "sources"
LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"

SRD_SPECIES_EXPECTED = {
    "dragonborn",
    "dwarf",
    "elf",
    "gnome",
    "goliath",
    "halfling",
    "human",
    "orc",
    "tiefling",
}
SRD_BACKGROUNDS_EXPECTED = {"acolyte", "criminal", "sage", "soldier"}


def _srd_ids(category: str) -> set[str]:
    path = SOURCES / f"{category}.csv"
    with path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return {r["id"] for r in rows if str(r.get("srd", "")).lower() == "true"}


def test_reference_srd_counts_match_official_origins():
    """Layer 1: srd=true rows match SRD 5.2.1 Character Origins (9 + 4)."""
    assert _srd_ids("species") == SRD_SPECIES_EXPECTED
    assert _srd_ids("backgrounds") == SRD_BACKGROUNDS_EXPECTED
    # Guard/Noble are PHB-only; must not be flagged srd after P24-C01 correction.
    all_bg = {
        r["id"]
        for r in csv.DictReader((SOURCES / "backgrounds.csv").open(encoding="utf-8"))
    }
    assert "guard" in all_bg and "noble" in all_bg
    assert "guard" not in _srd_ids("backgrounds")
    assert "noble" not in _srd_ids("backgrounds")


def test_live_waves_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "species_srd.json" in names
    assert "backgrounds_srd.json" in names
    assert (LIVE / "species_srd.json").is_file()
    assert (LIVE / "backgrounds_srd.json").is_file()

    planned = load_wave_rows()
    races = [r for r in planned if r["kind"] == "race"]
    bgs = [r for r in planned if r["kind"] == "background"]
    assert {r["slug"] for r in races} == SRD_SPECIES_EXPECTED
    assert {r["slug"] for r in bgs} == SRD_BACKGROUNDS_EXPECTED
    assert len(races) == len(_srd_ids("species"))
    assert len(bgs) == len(_srd_ids("backgrounds"))
    # Feats wave is owned by P24-C02; C01 only asserts species/backgrounds stay present.


def test_species_have_empty_asi_and_short_card():
    for row in load_wave_rows():
        if row["kind"] != "race":
            continue
        data = row["data"]
        assert data.get("ability_bonuses") == {}
        assert data.get("creature_type") == "humanoid"
        assert data.get("speed")
        assert data.get("size") or data.get("size_options")
        assert data.get("traits_text")
        assert data.get("content_layer") == "srd"
        # No languages granted by 2024 species.
        assert data.get("languages") in ([], None) or data.get("languages") == []


def test_backgrounds_have_asi_and_origin_feat_ref():
    for row in load_wave_rows():
        if row["kind"] != "background":
            continue
        data = row["data"]
        asi = data.get("asi")
        assert isinstance(asi, dict)
        assert len(asi.get("abilities") or []) == 3
        assert "+2/+1" in (asi.get("options") or [])
        feat = data.get("origin_feat")
        assert isinstance(feat, dict)
        assert feat.get("id")
        assert feat.get("name_ru")
        assert feat.get("name_en")
        skills = data.get("skill_proficiencies") or []
        assert len(skills) == 2
        equip = data.get("equipment_or_gold") or {}
        assert equip.get("gold_alternative_gp") == 50
        assert data.get("content_layer") == "srd"


def test_names_match_reference_csv():
    species_csv = {
        r["id"]: r
        for r in csv.DictReader((SOURCES / "species.csv").open(encoding="utf-8"))
        if r["srd"] == "true"
    }
    bg_csv = {
        r["id"]: r
        for r in csv.DictReader((SOURCES / "backgrounds.csv").open(encoding="utf-8"))
        if r["srd"] == "true"
    }
    for row in load_wave_rows():
        if row["kind"] == "race":
            ref = species_csv[row["slug"]]
        elif row["kind"] == "background":
            ref = bg_csv[row["slug"]]
        else:
            continue
        assert row["name_ru"] == ref["name_ru"]
        assert row["name_en"] == ref["name_en"]


def test_no_book_species_in_this_pack():
    """Aasimar and other PHB-extra species belong to C09, not C01."""
    slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "race"}
    assert "aasimar" not in slugs
    assert "half-elf" not in slugs
    assert "half-orc" not in slugs


def test_origin_feat_missing_catalog_does_not_break_normalize():
    """Background card normalizes with origin_feat id+name even without looking up the feat row."""
    payload = normalize_entry_payload(
        {
            "kind": "background",
            "slug": "acolyte",
            "name_ru": "Послушник",
            "name_en": "Acolyte",
            "source": "srd-5.2",
            "data": {
                "asi": {"abilities": ["int", "wis", "cha"], "options": ["+2/+1"]},
                "origin_feat": {
                    "id": "magic-initiate",
                    "name_ru": "Посвящённый в магию",
                    "name_en": "Magic Initiate",
                },
                "skill_proficiencies": ["insight", "religion"],
                "traits_text": "test",
            },
        }
    )
    assert payload is not None
    assert payload["data"]["origin_feat"]["id"] == "magic-initiate"


def test_deterministic_ids():
    assert entry_id(kind="race", slug="human") == entry_id(kind="race", slug="human")
    assert entry_id(kind="race", slug="human") != entry_id(kind="background", slug="human")


def test_counts_json_still_aligned():
    """P24-00 integrity: category totals unchanged by srd-flag fix."""
    counts = json.loads((SOURCES / "counts.json").read_text(encoding="utf-8"))
    for category in ("species", "backgrounds"):
        rows = list(csv.DictReader((SOURCES / f"{category}.csv").open(encoding="utf-8")))
        assert counts["by_category"][category] == len(rows)


def test_seed_rows_are_edition_2024_only():
    """Seed plan never writes rules_edition=2014 — 2014 catalog stays untouched by construction."""
    for row in load_wave_rows():
        assert row["rules_edition"] == "2024"
        assert row["kind"] in {
            "race",
            "background",
            "feat",
            "weapon",
            "armor",
            "item",
            "spell",
            "class",
            "subclass",
        }
        assert row["source"].startswith("srd")


def test_apply_seed_idempotent_with_fake_conn():
    """Two applies upsert the same keys; SQL never targets edition 2014."""
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
                assert "rules_edition = '2024'" in sql or ":edition" in sql or "2024" in sql
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
    snapshot = {k: dict(v) for k, v in store.items()}
    stats2 = apply_edition_2024_catalog_seed(conn)  # type: ignore[arg-type]

    # Live waves grow with later C-packs; assert against the planned row count.
    planned = len(load_wave_rows())
    assert stats1.upserted == planned
    assert stats2.upserted == planned
    assert set(store) == set(snapshot)
    assert {"race", "background", "feat"}.issubset({k[0] for k in store})
    assert {k[1] for k in store if k[0] == "race"} == SRD_SPECIES_EXPECTED
    assert {k[1] for k in store if k[0] == "background"} == SRD_BACKGROUNDS_EXPECTED
    assert len({k[1] for k in store if k[0] == "feat"}) == 17
    for params in store.values():
        data = json.loads(params["data"])
        if params["kind"] == "race":
            assert data.get("ability_bonuses") == {}
        elif params["kind"] == "background":
            assert len((data.get("asi") or {}).get("abilities") or []) == 3
            assert (data.get("origin_feat") or {}).get("id")
        elif params["kind"] == "feat":
            assert data.get("category") in {
                "origin",
                "general",
                "fighting_style",
                "epic_boon",
            }
    # No statement may filter or write rules_edition 2014.
    joined = "\n".join(executed)
    assert "'2014'" not in joined
    assert "2014" not in joined.replace("srd-5.2.1", "")


def test_create_pipeline_hardcodes_2014_catalog_edition():
    """2014 create wizard must not show 2024 cards (edition pinned in pipelineApply)."""
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
    assert "listCatalogEntries" in text


def test_race_species_label_2024_is_vid():
    from app.dnd.race_species_label import race_species_label, race_species_label_title

    assert race_species_label("2024") == "вид"
    assert race_species_label_title("2024") == "Вид"
    assert race_species_label("2014") == "раса"
