"""P24-C17: Forgotten Realms Heroes of Faerûn — full FRHoF catalog wave."""

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

FRHOF_COUNTS = {
    "subclass": 8,
    "background": 18,
    "feat": 34,
    "spell": 19,
    "item_equipment": 12,
    "item_magic": 2,
}
FRHOF_TOTAL = 8 + 18 + 34 + 19 + 12 + 2  # 93
PLANNED_TOTAL = 863 + 235 + 95 + 1 + 12 + 36 + 58 + 69 + 196 + 86 + 87 + 66 + FRHOF_TOTAL + 43 + 111  # +C18 FRAiF/ABH/LFL/NsF

STUB_NEEDLES = (
    "Предложено: Способность",
    "Краткая механика",
    "по справочнику",
    "(см. список)",
    "в карточке (ссылки",
)

FRHOF_WAVE_FILES = (
    "subclasses_frhof.json",
    "backgrounds_frhof.json",
    "feats_frhof.json",
    "spells_frhof.json",
    "equipment_frhof.json",
    "magic_items_frhof.json",
)


def _frhof_ids(category: str) -> set[str]:
    path = SOURCES / f"{category}.csv"
    with path.open(encoding="utf-8", newline="") as f:
        return {r["id"] for r in csv.DictReader(f) if r.get("book") == "FRHoF"}


def _rows(kind: str, *, source: str | None = "frhof"):
    out = [r for r in load_wave_rows() if r["kind"] == kind]
    if source is not None:
        out = [r for r in out if r["source"] == source]
    return out


def _frhof_items(*, magic: bool) -> list[dict]:
    rows = _rows("item")
    out = []
    for r in rows:
        group = (r["data"] or {}).get("equipment_group")
        is_magic = group == "magic_item"
        if magic and is_magic:
            out.append(r)
        elif not magic and not is_magic:
            out.append(r)
    return out


def test_reference_frhof_counts():
    assert len(_frhof_ids("subclasses")) == 8
    assert len(_frhof_ids("backgrounds")) == 18
    assert len(_frhof_ids("feats")) == 34
    assert len(_frhof_ids("spells")) == 19
    assert len(_frhof_ids("equipment")) == 12
    assert len(_frhof_ids("magic_items")) == 2
    assert _frhof_ids("species") == set()
    assert _frhof_ids("creatures") == set()


def test_live_frhof_waves_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    for name in FRHOF_WAVE_FILES:
        assert name in names
        assert (LIVE / name).is_file()

    assert {r["slug"] for r in _rows("subclass")} == _frhof_ids("subclasses")
    assert {r["slug"] for r in _rows("background")} == _frhof_ids("backgrounds")
    assert {r["slug"] for r in _rows("feat")} == _frhof_ids("feats")
    assert {r["slug"] for r in _rows("spell")} == _frhof_ids("spells")
    assert {r["slug"] for r in _frhof_items(magic=False)} == _frhof_ids("equipment")
    assert {r["slug"] for r in _frhof_items(magic=True)} == _frhof_ids("magic_items")
    assert (
        len(_rows("subclass"))
        + len(_rows("background"))
        + len(_rows("feat"))
        + len(_rows("spell"))
        + len(_frhof_items(magic=False))
        + len(_frhof_items(magic=True))
        == FRHOF_TOTAL
    )


def test_community_ref_and_edition():
    for kind in ("subclass", "background", "feat", "spell"):
        for row in _rows(kind):
            assert row["rules_edition"] == "2024"
            assert row["source"] == "frhof"
            assert row["data"].get("content_layer") == "community_ref"
            assert (row.get("external_ref") or {}).get("book") == "FRHoF"
    for row in _frhof_items(magic=False) + _frhof_items(magic=True):
        assert row["rules_edition"] == "2024"
        assert row["source"] == "frhof"
        assert row["data"].get("content_layer") == "community_ref"
        assert (row.get("external_ref") or {}).get("book") == "FRHoF"


def test_subclasses_parent_classes_resolve():
    class_slugs = {
        r["slug"] for r in load_wave_rows() if r["kind"] == "class"
    }
    for row in _rows("subclass"):
        parent = row["data"]["parent_class"]
        assert parent in class_slugs
        assert row["parent_id"] == entry_id(kind="class", slug=parent)
        assert row["data"]["features"]
        levels = {block["level"] for block in row["data"]["features"]}
        assert 3 in levels


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
    assert "origin" in cats
    assert "general" in cats
    assert "epic_boon" in cats
    for row in _rows("feat"):
        assert row["data"].get("summary_ru")
        assert row["data"].get("traits_text")


def test_spells_on_class_lists():
    spells = _rows("spell")
    assert len(spells) == 19
    by_class: dict[str, set[str]] = {}
    for row in spells:
        assert row["data"].get("summary_ru")
        assert 1 <= int(row["data"]["level"]) <= 9
        for c in row["data"].get("classes") or []:
            by_class.setdefault(c, set()).add(row["slug"])

    class_rows = {
        r["slug"]: r
        for r in load_wave_rows()
        if r["kind"] == "class"
    }
    for cls, slugs in by_class.items():
        assert cls in class_rows, cls
        spell_list = set(class_rows[cls]["data"].get("spell_list") or [])
        missing = slugs - spell_list
        assert not missing, f"{cls} missing {missing}"


def test_equipment_and_magic_shape():
    for row in _frhof_items(magic=False):
        data = row["data"]
        assert data["equipment_group"] in {"equipment", "musical_instrument", "toolkit"}
        assert data.get("summary_ru")
    for row in _frhof_items(magic=True):
        data = row["data"]
        assert data["equipment_group"] == "magic_item"
        assert data.get("rarity")
        assert data.get("summary_ru")


def test_no_stub_needles_in_frhof_files():
    for name in FRHOF_WAVE_FILES:
        text = (LIVE / name).read_text(encoding="utf-8")
        for needle in STUB_NEEDLES:
            assert needle not in text, f"{name}: {needle}"


def test_2014_catalog_isolation():
    for row in load_wave_rows():
        if row["source"] == "frhof":
            assert row["rules_edition"] == "2024"
            assert row["id"] == entry_id(kind=row["kind"], slug=row["slug"])


def test_apply_seed_includes_frhof_idempotent():
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
    frhof = sum(1 for p in store.values() if p.get("source") == "frhof")
    assert frhof == FRHOF_TOTAL


def test_alembic_single_head_includes_p24_c17():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one alembic head, got {heads}"
    assert heads[0] in {"p24c17frh01", "p24c12bast01", "p24c18fraif01"}
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "p24c17frh01" in ancestor_ids
    assert "p24c15efa01" in ancestor_ids
    assert "p24c07rbest01" in ancestor_ids
