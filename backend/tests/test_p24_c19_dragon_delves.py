"""P24-C19: Dragon Delves (DDBD) — no exclusive catalog cards."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from app.services.edition_2024_catalog_seed import (
    EDITION_2024_CATALOG_WAVES,
    apply_edition_2024_catalog_seed,
    load_wave_rows,
)

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "edition-2024" / "sources"
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
LAYER3 = SOURCES / "P24-C19-layer3-review.md"

# Same planned total as C20 tip — C19 adds zero exclusive rows.
PLANNED_TOTAL = (
    863 + 235 + 95 + 1 + 12 + 36 + 58 + 69 + 196 + 86 + 87 + 66 + 93 + 43 + 111 + 95
 + 166  # +C21 AU/AUD
)


def test_no_ddbd_rows_in_reference_csvs():
    cats = (
        "species",
        "classes",
        "subclasses",
        "backgrounds",
        "feats",
        "spells",
        "weapons",
        "armor",
        "equipment",
        "magic_items",
        "creatures",
        "bastions",
        "glossary",
    )
    for name in cats:
        path = SOURCES / f"{name}.csv"
        with path.open(encoding="utf-8", newline="") as f:
            rows = list(csv.DictReader(f))
        ddbd = [r for r in rows if (r.get("book") or "").strip() == "DDBD"]
        assert ddbd == [], f"{name}.csv unexpectedly has DDBD rows: {ddbd}"


def test_counts_json_documents_ddbd_zero():
    counts = json.loads((SOURCES / "counts.json").read_text(encoding="utf-8"))
    notes = "\n".join(counts.get("notes") or [])
    assert "DDBD" in notes
    assert "P24-C19" in notes
    assert "0" in notes
    # Zeros stay out of by_category_book (non-zero books only).
    for book_map in (counts.get("by_category_book") or {}).values():
        assert "DDBD" not in book_map


def test_gaps_md_marks_own_translation_zero():
    text = (SOURCES / "gaps.md").read_text(encoding="utf-8")
    assert "P24-C19" in text
    assert "свой перевод" in text.lower() or "своим" in text.lower()
    assert "0" in text


def test_layer3_review_exists_and_states_zero():
    assert LAYER3.is_file()
    text = LAYER3.read_text(encoding="utf-8")
    assert "0" in text
    assert "DDBD" in text
    assert "дубль" in text.lower() or "MM24" in text


def test_no_ddbd_live_wave_files():
    names = [w.filename for w in EDITION_2024_CATALOG_WAVES]
    assert not any("ddbd" in n.lower() for n in names)
    assert not list(LIVE.glob("*ddbd*"))


def test_live_rows_have_no_source_ddbd():
    rows = [r for r in load_wave_rows() if (r.get("source") or "").lower() == "ddbd"]
    assert rows == []


def test_planned_total_unchanged_by_c19():
    assert len(load_wave_rows()) == PLANNED_TOTAL


def test_apply_seed_idempotent_still_no_ddbd():
    store: dict[tuple[str, str], dict] = {}

    class FakeResult:
        def __init__(self, row=None, rowcount=0):
            self._row = row
            self.rowcount = rowcount

        def first(self):
            return self._row

    class FakeConn:
        def execute(self, statement, params=None):  # noqa: ANN001
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
    assert sum(1 for p in store.values() if p.get("source") == "ddbd") == 0


def test_alembic_single_head_is_p24_c19():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one alembic head, got {heads}"
    assert heads[0] in {"p24c19ddbd01", "p24c21au01", "p24c21rau01",
        "p24n01names01", "p24n01r01", "p24m03pr01", "p24int01merge", "p24fixenum01", "p24n01r02", "p24n01r03", "i10sunf9a2c", "j11sunfwep01", "k12tolldead01", "k13harenhop01", "k14diplbg01", "k15luckbow01", "k16bracers01", "k17braceammo01", "k18bardtce01"}
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "p24c20rfull01" in ancestor_ids
    assert "p24c20rtw01" in ancestor_ids
    assert "p24c18fraif01" in ancestor_ids
