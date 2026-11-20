"""P24-C12: DMG 2024 Bastions catalog (community_ref) + C17 display fixes."""

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

BASTION_BASIC = 6
BASTION_SPECIAL = 29
BASTION_ORDERS = 7
BASTION_RULES = 1
BASTION_TOTAL = BASTION_BASIC + BASTION_SPECIAL + BASTION_ORDERS + BASTION_RULES  # 43
FRHOF_TOTAL = 93
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
    + FRHOF_TOTAL
    + BASTION_TOTAL
    + 111 + 95  # +C18 FRAiF/ABH/LFL/NsF +C20 RTW
 + 166  # +C21 AU/AUD
)

SPECIAL_TOTALS = {5: 2, 9: 4, 13: 5, 17: 6}

EN_DICE_RE = re.compile(r"(?<![A-Za-zА-Яа-яёЁ])(\d+)d(\d+)(?![A-Za-z])")
GLUE_RE = re.compile(r"\.;")

FRHOF_DISPLAY_FILES = (
    "subclasses_frhof.json",
    "backgrounds_frhof.json",
    "feats_frhof.json",
    "spells_frhof.json",
    "equipment_frhof.json",
    "magic_items_frhof.json",
)


def _entries(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    return payload.get("entries") or []


def _bastion_rows():
    return [r for r in load_wave_rows() if r["kind"] == "bastion"]


def test_reference_bastions_csv_counts():
    with (SOURCES / "bastions.csv").open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    assert len(rows) == BASTION_BASIC + BASTION_SPECIAL
    basic = [r for r in rows if r.get("facility_kind") == "basic"]
    special = [r for r in rows if r.get("facility_kind") == "special"]
    assert len(basic) == BASTION_BASIC
    assert len(special) == BASTION_SPECIAL
    assert all(r.get("book") == "DMG24" for r in rows)
    assert all(r.get("srd") == "false" for r in rows)
    levels = {int(r["level"]) for r in special}
    assert levels == {5, 9, 13, 17}


def test_counts_json_bastions():
    counts = json.loads((SOURCES / "counts.json").read_text(encoding="utf-8"))
    assert counts["by_category"]["bastions"] == BASTION_BASIC + BASTION_SPECIAL
    assert counts["by_category_book"]["bastions"] == {"DMG24": BASTION_BASIC + BASTION_SPECIAL}


def test_live_bastion_wave_registered():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "bastions_dmg24.json" in names
    assert (LIVE / "bastions_dmg24.json").is_file()
    rows = _bastion_rows()
    assert len(rows) == BASTION_TOTAL
    by_kind: dict[str, int] = {}
    for r in rows:
        fk = (r["data"] or {}).get("facility_kind")
        by_kind[fk] = by_kind.get(fk, 0) + 1
    assert by_kind == {
        "basic": BASTION_BASIC,
        "special": BASTION_SPECIAL,
        "order": BASTION_ORDERS,
        "rules": BASTION_RULES,
    }


def test_community_ref_edition_and_pending():
    for row in _bastion_rows():
        assert row["rules_edition"] == "2024"
        assert row["source"] == "dmg24"
        assert row["data"].get("content_layer") == "community_ref"
        assert row["id"] == entry_id(kind="bastion", slug=row["slug"])
        fk = row["data"]["facility_kind"]
        if fk in {"basic", "special", "order"}:
            assert row["data"].get("name_ru_pending") is False  # cleared by names-decisions-17-11
        if row["slug"] == "war-room":
            assert row["name_ru"] == "Штаб"
        assert isinstance(row["data"].get("text_ru_pending"), bool)
        assert row["data"].get("summary_ru")


def test_special_facility_totals_and_orders():
    rules = next(r for r in _bastion_rows() if r["slug"] == "bastion-rules")
    totals = rules["data"]["special_facility_totals_by_level"]
    assert {int(k): int(v) for k, v in totals.items()} == SPECIAL_TOTALS
    assert rules["data"]["bastion_turn_days"] == 7
    assert rules["data"]["space_squares"] == {"cramped": 4, "roomy": 16, "vast": 36}

    order_slugs = {r["slug"] for r in _bastion_rows() if r["data"]["facility_kind"] == "order"}
    assert order_slugs == {
        "order-craft",
        "order-empower",
        "order-harvest",
        "order-maintain",
        "order-recruit",
        "order-research",
        "order-trade",
    }

    specials = [r for r in _bastion_rows() if r["data"]["facility_kind"] == "special"]
    for row in specials:
        assert 5 <= int(row["data"]["level"]) <= 17
        assert row["data"].get("orders")
        assert row["data"].get("hirelings")
        assert row["data"].get("order_effects_ru")


def test_csv_slugs_match_live_facilities():
    with (SOURCES / "bastions.csv").open(encoding="utf-8", newline="") as f:
        csv_ids = {r["id"] for r in csv.DictReader(f)}
    live_ids = {
        r["slug"]
        for r in _bastion_rows()
        if r["data"]["facility_kind"] in {"basic", "special"}
    }
    assert csv_ids == live_ids


def test_no_stub_needles_in_bastion_file():
    text = (LIVE / "bastions_dmg24.json").read_text(encoding="utf-8")
    for needle in (
        "Предложено: Способность",
        "Краткая механика",
        "по справочнику",
        "(см. список)",
        "в карточке (ссылки",
    ):
        assert needle not in text


def test_c17_rarity_and_damage_ru():
    magic = {e["slug"]: e for e in _entries(LIVE / "magic_items_frhof.json")}
    assert magic["adventurers-ring"]["data"]["rarity_ru"] == "обычный"
    assert magic["windskiff"]["data"]["rarity_ru"] == "редкий"

    for entry in _entries(LIVE / "spells_frhof.json"):
        dmg = (entry.get("data") or {}).get("damage")
        if not dmg:
            continue
        assert "к" in dmg
        assert EN_DICE_RE.search(dmg) is None
        assert re.fullmatch(r"\d+к\d+ \S+", dmg), dmg


def test_c17_no_english_dice_or_glue_in_display():
    failures: list[str] = []
    for name in FRHOF_DISPLAY_FILES:
        payload = json.loads((LIVE / name).read_text(encoding="utf-8"))
        blob = json.dumps(payload, ensure_ascii=False)
        if GLUE_RE.search(blob):
            failures.append(f"{name}: has .;")
        for entry in _entries(LIVE / name):
            data = entry.get("data") or {}
            for key in ("damage", "summary_ru", "traits_text", "text_ru", "description"):
                val = data.get(key)
                if isinstance(val, str) and EN_DICE_RE.search(val):
                    failures.append(f"{name} {entry.get('slug')} {key}: {val!r}")
            # nested damage tables
            for table_key in ("damage_at_character_level", "damage_at_slot_level"):
                table = data.get(table_key)
                if isinstance(table, dict):
                    for k, v in table.items():
                        if isinstance(v, str) and EN_DICE_RE.search(v):
                            failures.append(f"{name} {entry.get('slug')} {table_key}.{k}: {v!r}")
    assert not failures, "\n".join(failures[:40])


def test_apply_seed_includes_bastions_idempotent():
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
    bastions = sum(1 for p in store.values() if p.get("kind") == "bastion")
    assert bastions == BASTION_TOTAL


def test_2014_isolation():
    for row in _bastion_rows():
        assert row["rules_edition"] == "2024"


def test_alembic_single_head_includes_p24_c12():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one alembic head, got {heads}"
    assert heads[0] in {
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
    assert "p24c12bast01" in ancestor_ids
    assert "p24c18fraif01" in ancestor_ids
    assert "p24c17frh01" in ancestor_ids
    assert "p24c15efa01" in ancestor_ids
