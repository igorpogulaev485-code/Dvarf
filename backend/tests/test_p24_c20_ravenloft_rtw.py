"""P24-C20: Ravenloft: The Horrors Within (RTW) catalog."""

from __future__ import annotations

import csv
import json
import re
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

C20_COUNTS = {
    "race": 4,
    "background": 4,
    "feat": 11,
    "subclass": 7,
    "item": 1,
    "bestiary": 68,
}
C20_TOTAL = 4 + 4 + 11 + 7 + 1 + 68  # 95
PLANNED_TOTAL = (
    863 + 235 + 95 + 1 + 12 + 36 + 58 + 69 + 196 + 86 + 87 + 66 + 93 + 43 + 111 + C20_TOTAL
 + 166  # +C21 AU/AUD
)

STUB_NEEDLES = (
    "Предложено: Способность",
    "Краткая механика",
    "по справочнику",
    "(см. список)",
    "в карточке (ссылки",
)
GLUE_RE = re.compile(r"\.;")
EN_DICE_RE = re.compile(r"(?<![A-Za-zА-Яа-яёЁ0-9-])(\d+)d(\d+)(?![A-Za-z0-9-])")
BAD_PUNCT_RE = re.compile(r"\s+[.,:;]")

C20_WAVE_FILES = (
    "species_rtw.json",
    "backgrounds_rtw.json",
    "feats_rtw.json",
    "subclasses_rtw.json",
    "magic_items_rtw.json",
    "creatures_rtw.json",
)

ABILITIES = ("str", "dex", "con", "int", "wis", "cha")
_SPELLCASTING_NAME = ("сотворение заклинаний", "колдовство", "spellcasting")
ORIGIN_FEATS = {
    "haunted-one": "survivor",
    "investigator": "sharp-eye",
    "mist-wanderer": "mist-walker",
    "spirit-medium": "gathered-whispers",
}


def _csv_ids(category: str, book: str = "RTW") -> set[str]:
    path = SOURCES / f"{category}.csv"
    with path.open(encoding="utf-8", newline="") as f:
        return {r["id"] for r in csv.DictReader(f) if r.get("book") == book}


def _rows(*, kind: str | None = None):
    out = [r for r in load_wave_rows() if r.get("source") == "rtw"]
    if kind is not None:
        out = [r for r in out if r["kind"] == kind]
    return out


def _has_spellcasting(data: dict) -> bool:
    for bucket in ("traits", "actions", "bonus_actions", "reactions"):
        for feat in data.get(bucket) or []:
            name = str(feat.get("name_ru") or "").strip().lower()
            en = str(feat.get("name_en") or "").strip().lower()
            if name.startswith(_SPELLCASTING_NAME) or en.startswith("spellcasting"):
                return True
    return False


def test_reference_csv_counts():
    assert len(_csv_ids("species")) == 4
    assert len(_csv_ids("backgrounds")) == 4
    assert len(_csv_ids("feats")) == 11
    assert len(_csv_ids("subclasses")) == 7
    assert len(_csv_ids("magic_items")) == 1
    assert len(_csv_ids("creatures")) == 68


def test_live_waves_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    for name in C20_WAVE_FILES:
        assert name in names
        assert (LIVE / name).is_file()

    assert {r["slug"] for r in _rows(kind="race")} == _csv_ids("species")
    assert {r["slug"] for r in _rows(kind="background")} == _csv_ids("backgrounds")
    assert {r["slug"] for r in _rows(kind="feat")} == _csv_ids("feats")
    assert {r["slug"] for r in _rows(kind="subclass")} == _csv_ids("subclasses")
    assert {r["slug"] for r in _rows(kind="item")} == _csv_ids("magic_items")
    assert {r["slug"] for r in _rows(kind="bestiary")} == _csv_ids("creatures")
    assert len(_rows()) == C20_TOTAL


def test_community_ref_and_edition():
    for row in _rows():
        assert row["rules_edition"] == "2024"
        assert row["source"] == "rtw"
        assert row["data"].get("content_layer") == "community_ref"
        assert (row.get("external_ref") or {}).get("book") == "RTW"


def test_creatures_required_fields_and_refs():
    spell_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "spell"}
    gear_slugs = {
        r["slug"]
        for r in load_wave_rows()
        if r["kind"] in {"weapon", "armor", "item"}
    }
    for row in _rows(kind="bestiary"):
        data = row["data"]
        assert isinstance(data.get("ac"), int), row["slug"]
        assert isinstance(data.get("hp_average"), int), row["slug"]
        assert data.get("hp_formula") and "к" in data["hp_formula"], row["slug"]
        assert data.get("cr") not in (None, ""), row["slug"]
        assert isinstance(data.get("proficiency_bonus"), int), row["slug"]
        assert isinstance(data.get("xp"), int), row["slug"]
        init = data.get("initiative") or {}
        assert isinstance(init.get("mod"), int), row["slug"]
        assert isinstance(init.get("score"), int), row["slug"]
        for ab in ABILITIES:
            assert isinstance((data.get("abilities") or {}).get(ab), int), row["slug"]
            assert isinstance((data.get("ability_mods") or {}).get(ab), int), row["slug"]
            assert isinstance((data.get("ability_saves") or {}).get(ab), int), row["slug"]
        assert (
            data.get("actions")
            or data.get("traits")
            or data.get("bonus_actions")
            or data.get("reactions")
        ), row["slug"]
        assert data.get("summary_ru"), row["slug"]
        assert data.get("source_book") == "RTW", row["slug"]
        for sid in data.get("spell_refs") or []:
            assert sid in spell_slugs, f"{row['slug']} -> missing spell {sid}"
        for gid in data.get("gear_refs") or []:
            assert gid in gear_slugs, f"{row['slug']} -> missing gear {gid}"
        refs = data.get("spell_refs") or []
        has_cast = _has_spellcasting(data)
        if refs:
            assert has_cast, row["slug"]
            assert "есть заклинания" in data["summary_ru"], row["slug"]
        else:
            assert "есть заклинания" not in data["summary_ru"], row["slug"]


def test_backgrounds_origin_feats_resolve():
    feat_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "feat"}
    for row in _rows(kind="background"):
        data = row["data"]
        asi = data["asi"]
        assert len(asi["abilities"]) == 3
        assert "+2/+1" in asi["options"]
        feat = data["origin_feat"]
        assert feat["id"] in feat_slugs, row["slug"]
        assert feat["id"] == ORIGIN_FEATS[row["slug"]], row["slug"]
        assert len(data["skill_proficiencies"]) == 2
        assert (data.get("equipment_or_gold") or {}).get("gold_alternative_gp") == 50


def test_species_rtw_no_asi_languages():
    for row in _rows(kind="race"):
        data = row["data"]
        assert data.get("ability_bonuses") in ({}, None)
        assert data.get("languages") in ([], None)
        assert data.get("languages_choose") in (0, None)
        assert data.get("traits"), row["slug"]
        assert data.get("traits_text"), row["slug"]
        assert all(t != "trait" for t in data["traits"]), row["slug"]
        assert "Равенлофт" in data["traits_text"] or "Ужасы" in data["traits_text"]


def test_feats_categories_and_shape():
    cats = set()
    for row in _rows(kind="feat"):
        cat = row["data"].get("category")
        assert cat in {"origin", "dark_gift"}, row["slug"]
        cats.add(cat)
        assert row["data"].get("summary_ru")
        assert row["data"].get("traits_text")
    assert cats == {"origin", "dark_gift"}
    assert sum(1 for r in _rows(kind="feat") if r["data"]["category"] == "origin") == 2
    assert sum(1 for r in _rows(kind="feat") if r["data"]["category"] == "dark_gift") == 9


def test_subclasses_parent_and_features():
    class_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "class"}
    for row in _rows(kind="subclass"):
        parent = row["data"]["parent_class"]
        assert parent in class_slugs, row["slug"]
        assert row["parent_id"] == entry_id(kind="class", slug=parent)
        assert row["data"].get("subclass_level") == 3
        feats = row["data"].get("features") or []
        levels = {b["level"] for b in feats}
        assert 3 in levels, row["slug"]
        assert row["data"].get("summary_ru")


def test_magic_item_shape():
    rows = _rows(kind="item")
    assert len(rows) == 1
    row = rows[0]
    assert row["slug"] == "ebonbane"
    data = row["data"]
    assert data.get("equipment_group") == "magic_item"
    assert data.get("rarity")
    assert data.get("summary_ru")


def test_no_stub_glue_or_en_dice():
    for name in C20_WAVE_FILES:
        payload = json.loads((LIVE / name).read_text(encoding="utf-8"))
        for e in payload.get("entries") or []:
            # Scan data only — parent_id UUIDs can contain NdN hex segments.
            blob = json.dumps(e.get("data") or {}, ensure_ascii=False)
            for needle in STUB_NEEDLES:
                assert needle not in blob, f"{name}/{e.get('slug')}: {needle}"
            assert not GLUE_RE.search(blob), f"{name}/{e.get('slug')}"
            assert not EN_DICE_RE.search(blob), f"{name}/{e.get('slug')}"


def test_no_space_before_punctuation_in_display_ru():
    leaves = {
        "text_ru",
        "summary_ru",
        "name_ru",
        "legendary_actions_note_ru",
        "alignment",
        "size_ru",
        "type_ru",
        "traits_text",
    }
    failures: list[str] = []

    def walk(obj, path: str = ""):
        if isinstance(obj, dict):
            for key, value in obj.items():
                yield from walk(value, f"{path}.{key}" if path else key)
        elif isinstance(obj, list):
            for idx, value in enumerate(obj):
                yield from walk(value, f"{path}[{idx}]")
        elif isinstance(obj, str):
            yield path, obj

    for row in _rows():
        for field_path, value in walk(row["data"]):
            leaf = field_path.split(".")[-1].split("[")[0]
            if leaf not in leaves:
                continue
            if BAD_PUNCT_RE.search(value):
                failures.append(f"{row['slug']} {field_path}: {value!r}")
    assert not failures, "bad punctuation:\n" + "\n".join(failures[:30])


def test_2014_isolation():
    for row in _rows():
        assert row["rules_edition"] == "2024"
        assert row["id"] == entry_id(kind=row["kind"], slug=row["slug"])


def test_apply_seed_includes_c20_idempotent():
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
    c20 = sum(1 for p in store.values() if p.get("source") == "rtw")
    assert c20 == C20_TOTAL


def test_alembic_single_head_includes_p24_c20():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one alembic head, got {heads}"
    assert heads[0] in {"p24c20rfull01", "p24c19ddbd01", "p24c21au01", "p24c21rau01",
        "p24n01names01"}
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "p24c20rtw01" in ancestor_ids
    assert "p24c20rfull01" in ancestor_ids
    assert "p24c18fraif01" in ancestor_ids
