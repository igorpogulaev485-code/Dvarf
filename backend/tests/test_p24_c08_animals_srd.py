"""P24-C08: SRD 2024 Animals (bestiary) catalog seed."""

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
PLANNED_TOTAL = 863 + SRD_MONSTER_COUNT + SRD_ANIMAL_COUNT + 1 + 12 + 36  # + C09

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


def _animal_rows():
    return [
        r
        for r in load_wave_rows()
        if r["kind"] == "bestiary" and r["data"].get("srd_section") == "animals"
    ]


def _monster_rows():
    return [
        r
        for r in load_wave_rows()
        if r["kind"] == "bestiary" and r["data"].get("srd_section") == "monsters"
    ]


def test_reference_animal_count_and_no_slug_overlap():
    animals = _animal_ids()
    monsters = _monster_ids()
    assert len(animals) == SRD_ANIMAL_COUNT
    assert len(monsters) == SRD_MONSTER_COUNT
    assert animals.isdisjoint(monsters)
    assert "wolf" in animals
    assert "axe-beak" in monsters
    assert "aboleth" in monsters


def test_live_animals_wave_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "animals_srd.json" in names
    assert "creatures_srd.json" in names
    assert (LIVE / "animals_srd.json").is_file()
    live = _animal_rows()
    assert len(live) == SRD_ANIMAL_COUNT
    assert {r["slug"] for r in live} == _animal_ids()
    assert {r["slug"] for r in live}.isdisjoint({r["slug"] for r in _monster_rows()})
    for row in live:
        assert row["rules_edition"] == "2024"
        assert row["data"].get("content_layer") == "srd"
        assert row["data"].get("srd_section") == "animals"
        assert isinstance(row["data"].get("beast_tags"), list)


def test_each_animal_has_required_2024_fields():
    for row in _animal_rows():
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
        assert "beast_tags" in data


def test_spell_and_gear_refs_resolve_for_animals():
    spell_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "spell"}
    gear_slugs = {
        r["slug"]
        for r in load_wave_rows()
        if r["kind"] in {"weapon", "armor", "item"}
    }
    assert spell_slugs and gear_slugs
    for row in _animal_rows():
        for sid in row["data"].get("spell_refs") or []:
            assert sid in spell_slugs, f"{row['slug']} -> missing spell {sid}"
        for gid in row["data"].get("gear_refs") or []:
            assert gid in gear_slugs, f"{row['slug']} -> missing gear {gid}"


def test_beast_tags_wild_shape_and_mount():
    by_slug = {r["slug"]: r for r in _animal_rows()}
    wolf = by_slug["wolf"]["data"]
    assert "wild_shape_ok" in wolf["beast_tags"]
    assert wolf["type"] == "beast"
    assert wolf["cr"] == "1/4"

    horse = by_slug["riding-horse"]["data"]
    assert "mount" in horse["beast_tags"]
    assert "wild_shape_ok" in horse["beast_tags"]

    # High-CR beast is not wild_shape_ok (max CR 1 in SRD Wild Shape table).
    ape = by_slug["giant-ape"]["data"]
    assert ape["type"] == "beast"
    assert "wild_shape_ok" not in ape["beast_tags"]

    # Celestial animals are not wild shape beasts.
    eagle = by_slug["giant-eagle"]["data"]
    assert eagle["type"] == "celestial"
    assert "wild_shape_ok" not in eagle["beast_tags"]

    # Swarm bats: fly marker, not wild_shape_ok.
    bats = by_slug["swarm-of-bats"]["data"]
    assert "has_fly" in bats["beast_tags"]
    assert "wild_shape_ok" not in bats["beast_tags"]

    wild = sum(
        1 for r in _animal_rows() if "wild_shape_ok" in (r["data"].get("beast_tags") or [])
    )
    mounts = sum(
        1 for r in _animal_rows() if "mount" in (r["data"].get("beast_tags") or [])
    )
    assert wild >= 50
    assert mounts == 7


def test_cr_and_type_distribution_animals():
    by_type = Counter(r["data"]["type"] for r in _animal_rows())
    by_cr = Counter(r["data"]["cr"] for r in _animal_rows())
    assert by_type["beast"] == 90
    assert by_type["celestial"] == 3
    assert by_type["monstrosity"] == 2
    assert sum(by_cr.values()) == SRD_ANIMAL_COUNT
    assert by_cr["0"] == 24
    assert by_cr["1/4"] == 19


def test_normalize_bestiary_defaults_beast_tags():
    m = normalize_bestiary_data({"srd_section": "animals"})
    assert m["schema_version"] == 1
    assert m["beast_tags"] == []
    assert m["srd_section"] == "animals"


def test_2014_bestiary_untouched_wolf_differs():
    path = REPO_ROOT / "backend" / "data" / "srd" / "2014" / "bestiary_mm_v1.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    items = payload if isinstance(payload, list) else payload.get("entries") or []
    assert len(items) >= 400
    sample = next(i for i in items if i.get("slug") == "wolf" or i.get("name_en") == "Wolf")
    row_2024 = next(r for r in _animal_rows() if r["slug"] == "wolf")
    d14 = sample.get("data") or {}
    d24 = row_2024["data"]
    # 2024 wolf STR 14 vs 2014 STR 12 — must not copy 2014
    a14 = (d14.get("abilities") or {}).get("str")
    a24 = (d24.get("abilities") or {}).get("str")
    assert a14 == 12
    assert a24 == 14
    assert d24.get("initiative")
    assert "ability_saves" in d24
    assert "beast_tags" in d24
    for row in _animal_rows():
        assert row["rules_edition"] == "2024"
        assert row["id"] == entry_id(kind="bestiary", slug=row["slug"])


def test_apply_seed_includes_animals_idempotent():
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
    animals = 0
    for p in store.values():
        if p["kind"] != "bestiary":
            continue
        data = json.loads(p["data"]) if isinstance(p["data"], str) else p["data"]
        if (data or {}).get("srd_section") == "animals":
            animals += 1
    assert animals == SRD_ANIMAL_COUNT


def test_alembic_single_head_includes_p24_c08():
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
    assert "p24c08anim01" in ancestor_ids
    assert "p24c07best01" in ancestor_ids
    # Head advances with later packs (C09+); C08 must stay on the single lineage.
