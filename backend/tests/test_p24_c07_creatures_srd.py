"""P24-C07: SRD 2024 Monsters (bestiary) catalog seed — without Animals."""

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

SRD_MONSTER_COUNT = 235
SRD_ANIMAL_COUNT = 95
# C01–C06 catalog rows + monsters + animals (C08)
PLANNED_TOTAL = 863 + SRD_MONSTER_COUNT + SRD_ANIMAL_COUNT + 1 + 12 + 36 + 58 + 69 + 196 + 86  # C11 DMG items + C13 MM24 w1

ABILITIES = ("str", "dex", "con", "int", "wis", "cha")


def _creature_rows() -> list[dict[str, str]]:
    with (SOURCES / "creatures.csv").open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _monster_ids() -> set[str]:
    return {
        r["id"]
        for r in _creature_rows()
        if str(r.get("srd", "")).lower() == "true"
        and r.get("srd_section") == "monsters"
    }


def _animal_ids() -> set[str]:
    return {
        r["id"]
        for r in _creature_rows()
        if str(r.get("srd", "")).lower() == "true"
        and r.get("srd_section") == "animals"
    }


def _bestiary_rows():
    """SRD Monsters only — Animals live in animals_srd (C08); MM beyond SRD in C13+."""
    return [
        r
        for r in load_wave_rows()
        if r["kind"] == "bestiary"
        and r["data"].get("srd_section") == "monsters"
        and str(r.get("source") or "").startswith("srd")
    ]


def test_reference_srd_monster_count_matches_srd():
    monsters = _monster_ids()
    animals = _animal_ids()
    assert len(monsters) == SRD_MONSTER_COUNT
    assert len(animals) == SRD_ANIMAL_COUNT
    assert monsters.isdisjoint(animals)
    # Beasts in Monsters stay in C07 (e.g. axe-beak), not all beasts → animals
    assert "axe-beak" in monsters
    assert "wolf" in animals
    assert "aboleth" in monsters


def test_live_creature_wave_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "creatures_srd.json" in names
    assert (LIVE / "creatures_srd.json").is_file()
    live = _bestiary_rows()
    assert len(live) == SRD_MONSTER_COUNT
    assert {r["slug"] for r in live} == _monster_ids()
    assert {r["slug"] for r in live}.isdisjoint(_animal_ids())
    for row in live:
        assert row["rules_edition"] == "2024"
        assert row["data"].get("content_layer") == "srd"
        assert row["data"].get("srd_section") == "monsters"


def test_each_monster_has_required_2024_fields():
    for row in _bestiary_rows():
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


def test_spell_and_gear_refs_resolve():
    spell_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "spell"}
    gear_slugs = {
        r["slug"]
        for r in load_wave_rows()
        if r["kind"] in {"weapon", "armor", "item"}
    }
    assert spell_slugs and gear_slugs
    with_spells = 0
    with_gear = 0
    for row in _bestiary_rows():
        for sid in row["data"].get("spell_refs") or []:
            assert sid in spell_slugs, f"{row['slug']} -> missing spell {sid}"
        if row["data"].get("spell_refs"):
            with_spells += 1
        for gid in row["data"].get("gear_refs") or []:
            assert gid in gear_slugs, f"{row['slug']} -> missing gear {gid}"
        if row["data"].get("gear_refs"):
            with_gear += 1
    assert with_spells >= 20
    assert with_gear >= 20


def test_cr_and_type_distribution():
    by_type = Counter(r["data"]["type"] for r in _bestiary_rows())
    by_cr = Counter(r["data"]["cr"] for r in _bestiary_rows())
    assert by_type["dragon"] == 45
    assert by_type["humanoid"] >= 20
    assert sum(by_cr.values()) == SRD_MONSTER_COUNT
    # Animals not seeded
    assert "wolf" not in {r["slug"] for r in _bestiary_rows()}


def test_normalize_bestiary_defaults():
    m = normalize_bestiary_data({})
    assert m["schema_version"] == 1
    assert m["gear_refs"] == []
    assert m["spell_refs"] == []
    assert m["name_ru_pending"] is False
    assert m["srd_section"] == "monsters"


def test_2014_bestiary_untouched_and_isolation():
    path = REPO_ROOT / "backend" / "data" / "srd" / "2014" / "bestiary_mm_v1.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    items = payload if isinstance(payload, list) else payload.get("entries") or []
    assert len(items) >= 400
    sample = next(i for i in items if i.get("slug") == "aboleth" or i.get("name_en") == "Aboleth")
    # 2014 aboleth stats must differ from 2024 card (do not copy)
    row_2024 = next(r for r in _bestiary_rows() if r["slug"] == "aboleth")
    d14 = sample.get("data") or {}
    d24 = row_2024["data"]
    # Initiative is a 2024 field — 2014 cards lack it
    assert "initiative" not in d14 or d14.get("initiative") != d24.get("initiative")
    assert d24.get("initiative")
    assert "ability_saves" in d24
    for row in _bestiary_rows():
        assert row["rules_edition"] == "2024"
        assert row["id"] == entry_id(kind="bestiary", slug=row["slug"])


def test_apply_seed_includes_creatures_idempotent():
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
    bestiary = sum(1 for p in store.values() if p["kind"] == "bestiary")
    assert bestiary == SRD_MONSTER_COUNT + SRD_ANIMAL_COUNT + 86  # +C13 MM24 w1
    mm24 = 0
    for p in store.values():
        if p["kind"] != "bestiary":
            continue
        data = p["data"]
        if isinstance(data, str):
            data = json.loads(data)
        if p.get("source") == "mm24":
            mm24 += 1
    assert mm24 == 86
    monsters = 0
    animals = 0
    for p in store.values():
        if p["kind"] != "bestiary":
            continue
        if not str(p.get("source") or "").startswith("srd"):
            continue
        data = p["data"]
        if isinstance(data, str):
            data = json.loads(data)
        sec = (data or {}).get("srd_section")
        if sec == "monsters":
            monsters += 1
        elif sec == "animals":
            animals += 1
    assert monsters == SRD_MONSTER_COUNT
    assert animals == SRD_ANIMAL_COUNT


def test_alembic_single_head_includes_p24_c07():
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
    assert "p24c07best01" in ancestor_ids
    assert "p24c06magic01" in ancestor_ids
    assert "p24c08anim01" in ancestor_ids
    # Head advances with later packs (C09+); C07/C08 stay on the single lineage.
