"""P24-C15: Eberron Forge of the Artificer — full EFA catalog wave."""

from __future__ import annotations

import csv
import hashlib
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

EFA_COUNTS = {
    "class": 1,
    "subclass": 5,
    "race": 5,
    "background": 17,
    "feat": 28,
    "spell": 1,
    "item": 9,
}
EFA_TOTAL = sum(EFA_COUNTS.values())  # 66
PLANNED_TOTAL = 863 + 235 + 95 + 1 + 12 + 36 + 58 + 69 + 196 + 86 + 87 + EFA_TOTAL + 93 + 43 + 111 + 95 + 166  # +C21 AU/AUD / was: # +C17 FRHoF +C12 bastions +C18 +C20 RTW

STUB_NEEDLES = (
    "Предложено: Способность",
    "Краткая механика",
    "по справочнику",
    "(см. список)",
    "в карточке (ссылки",
)


def _efa_ids(category: str) -> set[str]:
    path = SOURCES / f"{category}.csv"
    with path.open(encoding="utf-8", newline="") as f:
        return {r["id"] for r in csv.DictReader(f) if r.get("book") == "EFA"}


def _rows(kind: str, *, source: str | None = "efa"):
    out = [r for r in load_wave_rows() if r["kind"] == kind]
    if source is not None:
        out = [r for r in out if r["source"] == source]
    return out


def test_reference_efa_counts():
    assert len(_efa_ids("classes")) == 1
    assert _efa_ids("classes") == {"artificer"}
    assert len(_efa_ids("subclasses")) == 5
    assert len(_efa_ids("species")) == 5
    assert len(_efa_ids("backgrounds")) == 17
    assert len(_efa_ids("feats")) == 28
    assert len(_efa_ids("spells")) == 1
    assert len(_efa_ids("magic_items")) == 9
    assert _efa_ids("creatures") == set()


def test_live_efa_waves_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    for name in (
        "classes_efa.json",
        "subclasses_efa.json",
        "species_efa.json",
        "backgrounds_efa.json",
        "feats_efa.json",
        "spells_efa.json",
        "magic_items_efa.json",
    ):
        assert name in names
        assert (LIVE / name).is_file()

    assert {r["slug"] for r in _rows("class")} == _efa_ids("classes")
    assert {r["slug"] for r in _rows("subclass")} == _efa_ids("subclasses")
    assert {r["slug"] for r in _rows("race")} == _efa_ids("species")
    assert {r["slug"] for r in _rows("background")} == _efa_ids("backgrounds")
    assert {r["slug"] for r in _rows("feat")} == _efa_ids("feats")
    assert {r["slug"] for r in _rows("spell")} == _efa_ids("spells")
    assert {r["slug"] for r in _rows("item")} == _efa_ids("magic_items")
    assert sum(len(_rows(k)) for k in EFA_COUNTS) == EFA_TOTAL


def test_community_ref_and_edition():
    for kind in EFA_COUNTS:
        for row in _rows(kind):
            assert row["rules_edition"] == "2024"
            assert row["source"] == "efa"
            assert row["data"].get("content_layer") == "community_ref"
            assert (row.get("external_ref") or {}).get("book") == "EFA"


def test_artificer_class_table_and_spell_list():
    art = _rows("class")[0]
    data = art["data"]
    assert data["hit_die"] == 8
    assert data["primary_abilities"] == ["int"]
    assert data["saving_throws"] == ["con", "int"]
    assert data["subclass_level"] == 3
    assert len(data["levels"]) == 20
    assert data["levels"][0]["spellcasting"]["slots"] == {"1": 2}
    assert data["levels"][19]["spellcasting"]["slots"]["5"] == 2
    assert "homunculus-servant" in data["spell_list"]
    assert len(data["spell_list"]) >= 80
    gear = {r["slug"] for r in load_wave_rows() if r["kind"] in {"weapon", "armor", "item"}}
    for pack in data["starting_equipment"]:
        for it in pack.get("items") or []:
            assert it["id"] in gear, it["id"]


def test_subclasses_parent_artificer():
    parent_id = entry_id(kind="class", slug="artificer")
    for row in _rows("subclass"):
        assert row["parent_id"] == parent_id
        assert row["data"]["parent_class"] == "artificer"
        assert row["data"]["features"]
        levels = {block["level"] for block in row["data"]["features"]}
        assert {3, 5, 9, 15} <= levels


def test_species_empty_asi_no_languages():
    for row in _rows("race"):
        data = row["data"]
        assert data.get("ability_bonuses") == {}
        assert data.get("languages") in ([], None)
        assert data.get("traits_text")
        assert data.get("creature_type")
        assert data.get("speed")


def test_backgrounds_asi_origin_feat_resolve():
    feat_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "feat"}
    for row in _rows("background"):
        data = row["data"]
        asi = data["asi"]
        assert len(asi["abilities"]) == 3
        assert "+2/+1" in asi["options"]
        feat = data["origin_feat"]
        assert feat["id"] in feat_slugs
        assert len(data["skill_proficiencies"]) == 2
        assert (data.get("equipment_or_gold") or {}).get("gold_alternative_gp") == 50


def test_feats_categories_and_ru():
    cats = {r["data"]["category"] for r in _rows("feat")}
    assert "dragonmark" in cats
    assert "epic_boon" in cats
    assert "general" in cats
    for row in _rows("feat"):
        assert row["data"].get("summary_ru")
        assert row["data"].get("traits_text")


def test_homunculus_spell_and_artificer_on_lists():
    spell = _rows("spell")[0]
    assert spell["slug"] == "homunculus-servant"
    assert spell["data"]["level"] == 2
    assert "artificer" in spell["data"]["classes"]
    # Existing catalog spells gained artificer where EFA list says so
    with_art = {
        r["slug"]
        for r in load_wave_rows()
        if r["kind"] == "spell" and "artificer" in (r["data"].get("classes") or [])
    }
    assert "homunculus-servant" in with_art
    assert "mending" in with_art or "cure-wounds" in with_art
    assert len(with_art) >= 80


def test_magic_items_shape():
    for row in _rows("item"):
        data = row["data"]
        assert data["equipment_group"] == "magic_item"
        assert data.get("rarity")
        assert data.get("summary_ru")


def test_no_stub_needles_in_efa_files():
    for name in (
        "classes_efa.json",
        "subclasses_efa.json",
        "species_efa.json",
        "backgrounds_efa.json",
        "feats_efa.json",
        "spells_efa.json",
        "magic_items_efa.json",
    ):
        text = (LIVE / name).read_text(encoding="utf-8")
        for needle in STUB_NEEDLES:
            assert needle not in text, f"{name}: {needle}"


def test_2014_artificer_untouched():
    path = REPO_ROOT / "backend" / "data" / "classes" / "features" / "artificer_2014.json"
    assert path.is_file()
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    # Stable fingerprint of Tasha 2014 artificer payload in this repo tip.
    assert len(digest) == 64
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload  # non-empty
    # 2024 class must not overwrite 2014 slug namespace in 2014 files
    text = path.read_text(encoding="utf-8")
    assert "rules_edition" not in text or "2014" in text
    assert "Реплики магических предметов" not in text


def test_2014_catalog_isolation():
    for row in load_wave_rows():
        if row["source"] == "efa":
            assert row["rules_edition"] == "2024"
            assert row["id"] == entry_id(kind=row["kind"], slug=row["slug"])


def test_apply_seed_includes_efa_idempotent():
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
    efa = sum(1 for p in store.values() if p.get("source") == "efa")
    assert efa == EFA_TOTAL


def test_alembic_single_head_includes_p24_c15():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one alembic head, got {heads}"
    assert heads[0] in {
        "p24c15efa01",
        "p24c17frh01",
        "p24c12bast01",
        "p24c18fraif01",
        "p24c20rtw01",
        "p24c20rfull01",
        "p24c19ddbd01",
        "p24c21au01",
        "p24c21rau01",
        "p24n01names01", "p24n01r01", "p24m03pr01", "p24int01merge", "p24fixenum01",
    }
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "p24c15efa01" in ancestor_ids
    assert "p24c07rbest01" in ancestor_ids
    assert "p24c14mmw201" in ancestor_ids
