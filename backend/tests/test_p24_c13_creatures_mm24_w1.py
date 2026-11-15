"""P24-C13: MM 2024 bestiary beyond SRD — wave 1 (before Kuo-toa Archpriest)."""

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
    normalize_bestiary_data,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCES = REPO_ROOT / "docs" / "edition-2024" / "sources"
LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"

CUTOFF = "Kuo-toa Archpriest"
MM24_W1_COUNT = 86
PLANNED_TOTAL = 863 + 235 + 95 + 1 + 12 + 36 + 58 + 69 + 196 + MM24_W1_COUNT

ABILITIES = ("str", "dex", "con", "int", "wis", "cha")


def _csv_wave1() -> list[dict[str, str]]:
    with (SOURCES / "creatures.csv").open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return sorted(
        [
            r
            for r in rows
            if r.get("book") == "MM24"
            and str(r.get("srd", "")).lower() == "false"
            and r["name_en"] < CUTOFF
        ],
        key=lambda r: r["name_en"],
    )


def _mm_rows():
    return [
        r
        for r in load_wave_rows()
        if r["kind"] == "bestiary" and r.get("source") == "mm24"
    ]


def test_reference_wave1_count_and_cutoff():
    wave = _csv_wave1()
    assert len(wave) == MM24_W1_COUNT
    assert wave[0]["name_en"] == "Aarakocra Aeromancer"
    assert wave[-1]["name_en"] == "Kuo-toa"
    assert all(r["name_en"] < CUTOFF for r in wave)
    # rest of MM24 srd=false starts at cutoff
    with (SOURCES / "creatures.csv").open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    rest = [
        r
        for r in rows
        if r.get("book") == "MM24"
        and str(r.get("srd", "")).lower() == "false"
        and r["name_en"] >= CUTOFF
    ]
    assert len(rest) == 87
    assert min(r["name_en"] for r in rest) == CUTOFF


def test_live_mm24_w1_wave_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "creatures_mm24_w1.json" in names
    assert (LIVE / "creatures_mm24_w1.json").is_file()
    live = _mm_rows()
    assert len(live) == MM24_W1_COUNT
    assert {r["slug"] for r in live} == {r["id"] for r in _csv_wave1()}
    for row in live:
        assert row["rules_edition"] == "2024"
        assert row["source"] == "mm24"
        assert row["data"].get("content_layer") == "community_ref"
        assert row["data"].get("source_book") == "MM24"
        assert row["data"].get("srd_section") == "monsters"


def test_each_mm24_card_has_required_2024_fields():
    for row in _mm_rows():
        data = row["data"]
        assert isinstance(data.get("ac"), int), row["slug"]
        assert isinstance(data.get("hp_average"), int), row["slug"]
        assert data.get("hp_formula"), row["slug"]
        assert data.get("cr") not in (None, ""), row["slug"]
        assert isinstance(data.get("proficiency_bonus"), int), row["slug"]
        assert isinstance(data.get("xp"), int), row["slug"]
        init = data.get("initiative") or {}
        assert isinstance(init.get("mod"), int), row["slug"]
        assert isinstance(init.get("score"), int), row["slug"]
        abilities = data.get("abilities") or {}
        mods = data.get("ability_mods") or {}
        saves = data.get("ability_saves") or {}
        for ab in ABILITIES:
            assert isinstance(abilities.get(ab), int), f"{row['slug']} {ab}"
            assert isinstance(mods.get(ab), int), f"{row['slug']} mod {ab}"
            assert isinstance(saves.get(ab), int), f"{row['slug']} save {ab}"
        assert data.get("size"), row["slug"]
        assert data.get("type"), row["slug"]
        assert data.get("type_ru"), row["slug"]
        assert isinstance(data.get("speed"), dict), row["slug"]
        senses = data.get("senses") or {}
        assert isinstance(senses.get("passive_perception"), int), row["slug"]
        assert row["name_ru"] and row["name_en"]
        assert data.get("summary_ru"), row["slug"]
        assert data.get("actions"), row["slug"]


def test_spell_and_gear_refs_resolve():
    spell_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "spell"}
    gear_slugs = {
        r["slug"]
        for r in load_wave_rows()
        if r["kind"] in {"weapon", "armor", "item"}
    }
    assert spell_slugs and gear_slugs
    for row in _mm_rows():
        for sid in row["data"].get("spell_refs") or []:
            assert sid in spell_slugs, f"{row['slug']} -> missing spell {sid}"
        for gid in row["data"].get("gear_refs") or []:
            assert gid in gear_slugs, f"{row['slug']} -> missing gear {gid}"


def test_no_overlap_with_srd_bestiary():
    srd = {
        r["slug"]
        for r in load_wave_rows()
        if r["kind"] == "bestiary" and r.get("source", "").startswith("srd")
    }
    mm = {r["slug"] for r in _mm_rows()}
    assert mm.isdisjoint(srd)


def test_cr_and_type_distribution():
    by_type = Counter(r["data"]["type"] for r in _mm_rows())
    by_cr = Counter(r["data"]["cr"] for r in _mm_rows())
    assert sum(by_type.values()) == MM24_W1_COUNT
    assert sum(by_cr.values()) == MM24_W1_COUNT
    assert by_type["aberration"] >= 10
    assert by_type["undead"] >= 10
    assert "kuo-toa" in {r["slug"] for r in _mm_rows()}
    assert "kuo-toa-archpriest" not in {r["slug"] for r in _mm_rows()}


def test_normalize_bestiary_defaults():
    m = normalize_bestiary_data({})
    assert m["schema_version"] == 1
    assert m["gear_refs"] == []
    assert m["spell_refs"] == []


def test_2014_bestiary_untouched_and_isolation():
    path = REPO_ROOT / "backend" / "data" / "srd" / "2014" / "bestiary_mm_v1.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    items = payload if isinstance(payload, list) else payload.get("entries") or []
    assert len(items) >= 400
    for row in _mm_rows():
        assert row["rules_edition"] == "2024"
        assert row["id"] == entry_id(kind="bestiary", slug=row["slug"])
        assert "initiative" in row["data"]
        assert "ability_saves" in row["data"]


def test_apply_seed_includes_mm24_w1_idempotent():
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
    mm = sum(1 for p in store.values() if p["kind"] == "bestiary" and p.get("source") == "mm24")
    assert mm == MM24_W1_COUNT


def test_alembic_single_head_includes_p24_c13():
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
    assert "p24c13mmw101" in ancestor_ids
    assert "p24c11dmg01" in ancestor_ids
    assert heads[0] == "p24c13mmw101"
