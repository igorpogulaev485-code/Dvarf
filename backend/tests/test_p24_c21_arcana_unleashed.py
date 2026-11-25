"""P24-C21: Arcana Unleashed (AU) + Deadfall (AUD) catalog."""

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

C21_COUNTS = {
    "au": {
        "subclass": 8,
        "background": 10,
        "feat": 29,
        "spell": 33,
        "item": 47,
        "bestiary": 19,
    },
    "aud": {
        "item": 14,
        "bestiary": 6,
    },
}
C21_TOTAL = 8 + 10 + 29 + 33 + 47 + 19 + 14 + 6  # 166
PLANNED_TOTAL = (
    863
    + 235
    + 95
    + 1
    + 12
    + 36
    + 58
    + 69
    + 196
    + 86
    + 87
    + 66
    + 93
    + 43
    + 111
    + 95
    + C21_TOTAL
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
RARITY_RU_ALLOWED = frozenset(
    {
        "обычный",
        "необычный",
        "редкий",
        "очень редкий",
        "легендарный",
        "артефакт",
        "редкость различается",
        "редкость варьируется",
    }
)

C21_WAVE_FILES = (
    "subclasses_au.json",
    "backgrounds_au.json",
    "feats_au.json",
    "spells_au.json",
    "magic_items_au.json",
    "creatures_au.json",
    "magic_items_aud.json",
    "creatures_aud.json",
)

ABILITIES = ("str", "dex", "con", "int", "wis", "cha")
_SPELLCASTING_NAME = ("сотворение заклинаний", "колдовство", "spellcasting")
FEAT_CATEGORIES = {"origin", "general", "fighting_style", "epic_boon"}


def _csv_ids(category: str, book: str) -> set[str]:
    path = SOURCES / f"{category}.csv"
    with path.open(encoding="utf-8", newline="") as f:
        return {r["id"] for r in csv.DictReader(f) if r.get("book") == book}


def _rows(*, source: str | None = None, kind: str | None = None):
    out = [r for r in load_wave_rows() if r.get("source") in {"au", "aud"}]
    if source is not None:
        out = [r for r in out if r.get("source") == source]
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
    assert len(_csv_ids("subclasses", "AU")) == 8
    assert len(_csv_ids("backgrounds", "AU")) == 10
    assert len(_csv_ids("feats", "AU")) == 29
    assert len(_csv_ids("spells", "AU")) == 33
    assert len(_csv_ids("magic_items", "AU")) == 47
    assert len(_csv_ids("creatures", "AU")) == 19
    assert len(_csv_ids("magic_items", "AUD")) == 14
    assert len(_csv_ids("creatures", "AUD")) == 6
    assert len(_csv_ids("species", "AU")) == 0
    assert len(_csv_ids("species", "AUD")) == 0


def test_live_waves_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    for name in C21_WAVE_FILES:
        assert name in names
        assert (LIVE / name).is_file()

    assert {r["slug"] for r in _rows(source="au", kind="subclass")} == _csv_ids(
        "subclasses", "AU"
    )
    assert {r["slug"] for r in _rows(source="au", kind="background")} == _csv_ids(
        "backgrounds", "AU"
    )
    assert {r["slug"] for r in _rows(source="au", kind="feat")} == _csv_ids(
        "feats", "AU"
    )
    assert {r["slug"] for r in _rows(source="au", kind="spell")} == _csv_ids(
        "spells", "AU"
    )
    assert {r["slug"] for r in _rows(source="au", kind="item")} == _csv_ids(
        "magic_items", "AU"
    )
    assert {r["slug"] for r in _rows(source="au", kind="bestiary")} == _csv_ids(
        "creatures", "AU"
    )
    assert {r["slug"] for r in _rows(source="aud", kind="item")} == _csv_ids(
        "magic_items", "AUD"
    )
    assert {r["slug"] for r in _rows(source="aud", kind="bestiary")} == _csv_ids(
        "creatures", "AUD"
    )
    assert len(_rows()) == C21_TOTAL


def test_community_ref_and_edition():
    for row in _rows():
        assert row["rules_edition"] == "2024"
        assert row["source"] in {"au", "aud"}
        assert row["data"].get("content_layer") == "community_ref"
        book = (row.get("external_ref") or {}).get("book")
        assert book == ("AU" if row["source"] == "au" else "AUD")


def test_backgrounds_origin_feats_resolve():
    feat_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "feat"}
    for row in _rows(kind="background"):
        data = row["data"]
        asi = data["asi"]
        assert len(asi["abilities"]) == 3
        assert "+2/+1" in asi["options"]
        feat = data["origin_feat"]
        assert feat["id"] in feat_slugs, row["slug"]
        assert len(data["skill_proficiencies"]) == 2
        assert (data.get("equipment_or_gold") or {}).get("gold_alternative_gp") == 50


def test_feats_categories_and_shape():
    cats = set()
    for row in _rows(kind="feat"):
        cat = row["data"].get("category")
        assert cat in FEAT_CATEGORIES, row["slug"]
        cats.add(cat)
        assert row["data"].get("summary_ru")
        assert row["data"].get("traits_text")
    assert "origin" in cats
    assert "general" in cats


def test_spells_required_fields():
    for row in _rows(kind="spell"):
        data = row["data"]
        assert isinstance(data.get("level"), int)
        assert data.get("school")
        assert data.get("school_ru")
        assert data.get("casting_time")
        assert data.get("components")
        assert data.get("duration")
        assert isinstance(data.get("concentration"), bool)
        assert isinstance(data.get("ritual"), bool)
        assert data.get("classes")
        assert data.get("summary_ru")
        assert data.get("description")
        if data.get("damage"):
            assert "к" in data["damage"]
            assert not re.search(r"\d+d\d+", data["damage"])


def test_subclasses_parent_features_and_spell_refs():
    class_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "class"}
    spell_slugs = {r["slug"] for r in load_wave_rows() if r["kind"] == "spell"}
    for row in _rows(kind="subclass"):
        parent = row["data"]["parent_class"]
        assert parent in class_slugs, row["slug"]
        assert row["parent_id"] == entry_id(kind="class", slug=parent)
        assert row["data"].get("subclass_level") == 3
        feats = row["data"].get("features") or []
        levels = {b["level"] for b in feats}
        assert 3 in levels, row["slug"]
        assert row["data"].get("summary_ru")
        for bucket in row["data"].get("spell_list") or []:
            for sid in bucket.get("spells") or []:
                assert sid in spell_slugs, f"{row['slug']} -> {sid}"


def test_magic_items_shape_and_rarity():
    for row in _rows(kind="item"):
        data = row["data"]
        assert data.get("equipment_group") == "magic_item"
        assert data.get("rarity")
        assert (data.get("rarity_ru") or "").lower() in RARITY_RU_ALLOWED, row["slug"]
        assert data.get("summary_ru")
        assert isinstance(data.get("sentient"), bool)
        assert isinstance(data.get("artifact"), bool)


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
        assert data.get("source_book") in {"AU", "AUD"}, row["slug"]
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


def test_no_stub_glue_or_en_dice():
    for name in C21_WAVE_FILES:
        payload = json.loads((LIVE / name).read_text(encoding="utf-8"))
        for e in payload.get("entries") or []:
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
        "description",
        "higher_levels",
        "higher_levels_ru",
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


def test_apply_seed_includes_c21_idempotent():
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
    c21 = sum(1 for p in store.values() if p.get("source") in {"au", "aud"})
    assert c21 == C21_TOTAL


def test_alembic_single_head_includes_p24_c21():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one alembic head, got {heads}"
    assert heads[0] in {"p24c21rau01", "p24n01names01", "p24n01r01", "p24m03pr01", "p24int01merge", "p24fixenum01", "p24n01r02", "p24n01r03", "i10sunf9a2c", "j11sunfwep01", "k12tolldead01", "k13harenhop01", "k14diplbg01"}
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "p24n01r01" in ancestor_ids or "p24n01names01" in ancestor_ids
    assert "p24c21rau01" in ancestor_ids
    assert "p24c21au01" in ancestor_ids
    assert "p24c19ddbd01" in ancestor_ids
    assert "p24c20rtw01" in ancestor_ids
