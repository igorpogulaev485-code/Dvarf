"""P24-C04: SRD 2024 classes and subclasses catalog seed."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from app.services.edition_2024_catalog_seed import (
    EDITION_2024_CATALOG_WAVES,
    WEAPON_MASTERY_IDS,
    apply_edition_2024_catalog_seed,
    entry_id,
    load_wave_rows,
    normalize_class_data,
    normalize_subclass_data,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCES = REPO_ROOT / "docs" / "edition-2024" / "sources"
LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"

SRD_CLASSES = {
    "barbarian",
    "bard",
    "cleric",
    "druid",
    "fighter",
    "monk",
    "paladin",
    "ranger",
    "rogue",
    "sorcerer",
    "warlock",
    "wizard",
}
SRD_SUBCLASSES = {
    "barbarian__berserker",
    "bard__lore",
    "cleric__life-domain",
    "druid__land",
    "fighter__champion",
    "monk__warrior-of-the-hand",
    "paladin__oath-of-devotion",
    "ranger__hunter-ranger",
    "rogue__thief",
    "sorcerer__draconic-sorcery",
    "warlock__fiend-patron",
    "wizard__evoker",
}
WM_CLASSES = {"barbarian", "fighter", "paladin", "ranger", "rogue"}
# C01–C09 + C10 (58 feats + 69 spells PHB beyond SRD).
PLANNED_TOTAL = 215 + 12 + 12 + 339 + 285 + 235 + 95 + 1 + 12 + 36 + 58 + 69 + 196 + 86 + 87 + 66 + 93 + 43 + 111  # +C11 DMG24 +C13 MM24 w1 +C14 MM24 w2 +C15 EFA +C17 FRHoF +C12 bastions +C18


def _srd_ids(category: str) -> set[str]:
    path = SOURCES / f"{category}.csv"
    with path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return {r["id"] for r in rows if str(r.get("srd", "")).lower() == "true"}


def _rows(kind: str, *, srd_only: bool = False):
    rows = [r for r in load_wave_rows() if r["kind"] == kind]
    if srd_only:
        rows = [r for r in rows if str(r["source"]).startswith("srd")]
    return rows


def _gear_ids() -> set[str]:
    ids: set[str] = set()
    for kind in ("weapon", "armor", "item"):
        for row in _rows(kind):
            ids.add(row["slug"])
    return ids


def test_reference_srd_class_subclass_counts_match_srd():
    """Layer 1: srd=true rows match SRD 5.2.1 (after C04 corrections)."""
    classes = _srd_ids("classes")
    subclasses = _srd_ids("subclasses")
    assert classes == SRD_CLASSES
    assert subclasses == SRD_SUBCLASSES
    assert len(classes) == 12
    assert len(subclasses) == 12
    assert "artificer" not in classes
    # False positives cleared; true SRD open-hand / devotion / draconic set.
    all_sub = {
        r["id"]: r
        for r in csv.DictReader((SOURCES / "subclasses.csv").open(encoding="utf-8"))
    }
    assert all_sub["cleric__light-domain"]["srd"] == "false"
    assert all_sub["monk__warrior-of-shadow"]["srd"] == "false"
    assert all_sub["rogue__assassin"]["srd"] == "false"
    assert all_sub["monk__warrior-of-the-hand"]["srd"] == "true"
    assert all_sub["paladin__oath-of-devotion"]["srd"] == "true"
    assert all_sub["sorcerer__draconic-sorcery"]["srd"] == "true"


def test_live_class_waves_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "classes_srd.json" in names
    assert "subclasses_srd.json" in names
    assert (LIVE / "classes_srd.json").is_file()
    assert (LIVE / "subclasses_srd.json").is_file()

    assert {r["slug"] for r in _rows("class", srd_only=True)} == SRD_CLASSES == _srd_ids("classes")
    srd_subs = _rows("subclass", srd_only=True)
    assert {r["slug"] for r in srd_subs} == SRD_SUBCLASSES == _srd_ids("subclasses")
    assert len(_rows("class", srd_only=True)) == 12
    assert len(srd_subs) == 12
    assert len(_rows("subclass")) >= 12


def test_each_class_has_full_level_table_and_subclass_at_3():
    for row in _rows("class", srd_only=True):
        data = row["data"]
        assert data.get("hit_die") in {6, 8, 10, 12}, row["slug"]
        assert data.get("subclass_level") == 3
        assert data.get("epic_boon_level") == 19
        assert 4 in (data.get("feat_levels") or [])
        levels = data.get("levels") or []
        assert len(levels) == 20, row["slug"]
        assert [lv["level"] for lv in levels] == list(range(1, 21))
        for lv in levels:
            assert lv["proficiency_bonus"] == (
                2
                if lv["level"] < 5
                else 3
                if lv["level"] < 9
                else 4
                if lv["level"] < 13
                else 5
                if lv["level"] < 17
                else 6
            )
            assert isinstance(lv.get("features"), list)
        # Subclass feature appears at level 3.
        lv3_ids = {f["id"] for f in levels[2]["features"]}
        assert any("subclass" in fid for fid in lv3_ids), row["slug"]
        assert isinstance(data.get("spell_list"), list)
        # Casters filled in P24-C05; non-casters stay empty.
        if row["slug"] in {"barbarian", "fighter", "monk", "rogue"}:
            assert data.get("spell_list") == []
        else:
            assert data.get("spell_list"), row["slug"]
        assert data.get("content_layer") == "srd"
        assert row["rules_edition"] == "2024"


def test_weapon_mastery_by_class_matches_srd():
    for row in _rows("class", srd_only=True):
        wm = row["data"].get("weapon_mastery") or {}
        if row["slug"] in WM_CLASSES:
            assert wm.get("enabled") is True, row["slug"]
            by_level = wm.get("by_level") or {}
            assert by_level.get("1") is not None
            if row["slug"] == "fighter":
                assert by_level["1"] == 3
                assert by_level["16"] == 6
            elif row["slug"] == "barbarian":
                assert by_level["1"] == 2
                assert by_level["10"] == 4
                assert wm.get("melee_only") is True
            else:
                assert by_level["1"] == 2
                assert by_level["20"] == 2
            assert wm.get("dictionary") == "weapon_mastery_srd"
        else:
            assert wm.get("enabled") is False, row["slug"]


def test_starting_equipment_and_mastery_links_resolve():
    gear = _gear_ids()
    for row in _rows("class", srd_only=True):
        for opt in row["data"].get("starting_equipment") or []:
            if opt.get("id") == "gold":
                assert opt.get("coins_gp")
                continue
            for it in opt.get("items") or []:
                iid = it.get("id")
                if not iid:
                    # Spellbook / tool choice without C03 card.
                    assert it.get("name_ru") or it.get("choice") or it.get("missing_in_c03")
                    continue
                assert iid in gear, f"{row['slug']} missing gear id {iid}"
        wm = row["data"].get("weapon_mastery") or {}
        if wm.get("enabled"):
            assert wm.get("dictionary") == "weapon_mastery_srd"
            assert WEAPON_MASTERY_IDS  # dictionary exists


def test_subclass_cards_link_parent_and_features():
    class_ids = {row["slug"]: row["id"] for row in _rows("class")}
    for row in _rows("subclass"):
        if not str(row["source"]).startswith("srd"):
            continue
        data = row["data"]
        parent = data.get("parent_class")
        assert parent in SRD_CLASSES, row["slug"]
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
        assert data.get("content_layer") == "srd"


def test_names_match_reference_csv():
    for category, kind in (("classes", "class"), ("subclasses", "subclass")):
        ref = {
            r["id"]: r
            for r in csv.DictReader((SOURCES / f"{category}.csv").open(encoding="utf-8"))
            if r["srd"] == "true"
        }
        for row in _rows(kind, srd_only=True):
            assert row["name_ru"] == ref[row["slug"]]["name_ru"]
            assert row["name_en"] == ref[row["slug"]]["name_en"]


def test_normalize_helpers_defaults():
    c = normalize_class_data({})
    assert c["subclass_level"] == 3
    assert c["spell_list"] == []
    assert c["weapon_mastery"]["enabled"] is False
    s = normalize_subclass_data({})
    assert s["subclass_level"] == 3
    assert s["features"] == []


def test_2014_class_catalog_untouched_and_isolation():
    """2014 class cards stay 2014; live 2024 plan never claims 2014."""
    spec = REPO_ROOT / "backend" / "data" / "classes" / "phb2014_class_catalog_spec.json"
    assert spec.is_file()
    payload = json.loads(spec.read_text(encoding="utf-8"))
    assert payload.get("meta", {}).get("edition_tag") == "2014"
    for row in load_wave_rows():
        if row["kind"] in {"class", "subclass"}:
            assert row["rules_edition"] == "2024"
    # Create pipeline still pins 2014.
    path = (
        REPO_ROOT
        / "frontend"
        / "src"
        / "features"
        / "createPipeline"
        / "pipelineApply.ts"
    )
    assert "edition: '2014'" in path.read_text(encoding="utf-8")


def test_apply_seed_includes_classes_idempotent():
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
    srd_classes = {
        k[1]
        for k, v in store.items()
        if k[0] == "class" and str(v.get("source", "")).startswith("srd")
    }
    assert srd_classes == SRD_CLASSES
    assert "artificer" in {k[1] for k in store if k[0] == "class"}
    srd_subs = {
        k[1]
        for k, v in store.items()
        if k[0] == "subclass" and str(v.get("source", "")).startswith("srd")
    }
    assert srd_subs == SRD_SUBCLASSES
    assert SRD_SUBCLASSES.issubset({k[1] for k in store if k[0] == "subclass"})
    for params in store.values():
        assert params["edition"] == "2024"


def test_alembic_single_head_includes_p24_c04():
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
    assert "p24c04class01" in ancestor_ids
    assert "p24c03gear01" in ancestor_ids
    assert "p24c05spell01" in ancestor_ids
    assert "p24c06magic01" in ancestor_ids
    assert "p24c06magic01" in ancestor_ids  # head may advance (C07+)


def test_no_artificer_in_srd_class_wave():
    """Artificer is EFA (C15), not SRD C04."""
    srd_classes = {
        r["slug"] for r in _rows("class") if str(r["source"]).startswith("srd")
    }
    assert "artificer" not in srd_classes
    srd_slugs = {
        r["slug"] for r in _rows("subclass") if str(r["source"]).startswith("srd")
    }
    assert "cleric__light-domain" not in srd_slugs
    assert "rogue__assassin" not in srd_slugs
    assert "monk__warrior-of-shadow" not in srd_slugs
