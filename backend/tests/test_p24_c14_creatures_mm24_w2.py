"""P24-C14: MM 2024 bestiary beyond SRD — wave 2 (from Kuo-toa Archpriest)."""

from __future__ import annotations

import csv
import json
import re
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
MM24_W2_COUNT = 87
PLANNED_TOTAL = 863 + 235 + 95 + 1 + 12 + 36 + 58 + 69 + 196 + MM24_W1_COUNT + MM24_W2_COUNT + 66 + 93  # +C15 EFA +C17 FRHoF

ABILITIES = ("str", "dex", "con", "int", "wis", "cha")


def _csv_wave2() -> list[dict[str, str]]:
    with (SOURCES / "creatures.csv").open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return sorted(
        [
            r
            for r in rows
            if r.get("book") == "MM24"
            and str(r.get("srd", "")).lower() == "false"
            and r["name_en"] >= CUTOFF
        ],
        key=lambda r: r["name_en"],
    )


def _mm_w2_rows():
    return [
        r
        for r in load_wave_rows()
        if r["kind"] == "bestiary"
        and r.get("source") == "mm24"
        and r["slug"] in {c["id"] for c in _csv_wave2()}
    ]


def _mm_all_rows():
    return [
        r
        for r in load_wave_rows()
        if r["kind"] == "bestiary" and r.get("source") == "mm24"
    ]


def test_reference_wave2_count_and_cutoff():
    wave = _csv_wave2()
    assert len(wave) == MM24_W2_COUNT
    assert wave[0]["name_en"] == CUTOFF
    assert wave[-1]["name_en"] == "Yuan-ti Malison (Type 3)"
    assert all(r["name_en"] >= CUTOFF for r in wave)
    with (SOURCES / "creatures.csv").open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    w1 = [
        r
        for r in rows
        if r.get("book") == "MM24"
        and str(r.get("srd", "")).lower() == "false"
        and r["name_en"] < CUTOFF
    ]
    assert len(w1) == MM24_W1_COUNT
    assert len(w1) + len(wave) == 173


def test_live_mm24_w2_wave_registered_and_complete():
    names = {w.filename for w in EDITION_2024_CATALOG_WAVES}
    assert "creatures_mm24_w2.json" in names
    assert (LIVE / "creatures_mm24_w2.json").is_file()
    live = _mm_w2_rows()
    assert len(live) == MM24_W2_COUNT
    assert {r["slug"] for r in live} == {r["id"] for r in _csv_wave2()}
    for row in live:
        assert row["rules_edition"] == "2024"
        assert row["source"] == "mm24"
        assert row["data"].get("content_layer") == "community_ref"
        assert row["data"].get("source_book") == "MM24"
        assert row["data"].get("srd_section") == "monsters"


def test_each_mm24_w2_card_has_required_2024_fields():
    for row in _mm_w2_rows():
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
    for row in _mm_w2_rows():
        for sid in row["data"].get("spell_refs") or []:
            assert sid in spell_slugs, f"{row['slug']} -> missing spell {sid}"
        for gid in row["data"].get("gear_refs") or []:
            assert gid in gear_slugs, f"{row['slug']} -> missing gear {gid}"


_SPELLCASTING_NAME = ("сотворение заклинаний", "колдовство", "spellcasting")


def _has_spellcasting_feature(data: dict) -> bool:
    for bucket in ("traits", "actions", "bonus_actions", "reactions"):
        for feat in data.get(bucket) or []:
            name = str(feat.get("name_ru") or "").strip().lower()
            en = str(feat.get("name_en") or "").strip().lower()
            if name.startswith(_SPELLCASTING_NAME) or en.startswith("spellcasting"):
                return True
    return False


def test_spell_refs_only_from_spellcasting_block():
    with_spells = 0
    for row in _mm_w2_rows():
        refs = row["data"].get("spell_refs") or []
        summary = row["data"].get("summary_ru") or ""
        has_cast = _has_spellcasting_feature(row["data"])
        if refs:
            with_spells += 1
            assert has_cast, f"{row['slug']} has spell_refs without Spellcasting"
            assert "есть заклинания" in summary, row["slug"]
        else:
            assert "есть заклинания" not in summary, row["slug"]
    assert with_spells == 25


def test_no_space_before_punctuation_in_display_ru():
    bad_punct = re.compile(r"\s+[.,:;]")
    typo = re.compile(r"спабросок", re.I)
    failures: list[str] = []
    leaves = {
        "text_ru",
        "summary_ru",
        "name_ru",
        "legendary_actions_note_ru",
        "alignment",
        "size_ru",
        "type_ru",
    }

    def walk(obj, path: str = ""):
        if isinstance(obj, dict):
            for key, value in obj.items():
                yield from walk(value, f"{path}.{key}" if path else key)
        elif isinstance(obj, list):
            for idx, value in enumerate(obj):
                yield from walk(value, f"{path}[{idx}]")
        elif isinstance(obj, str):
            yield path, obj

    for row in _mm_w2_rows():
        for field_path, value in walk(row["data"]):
            leaf = field_path.split(".")[-1].split("[")[0]
            if leaf not in leaves:
                continue
            if bad_punct.search(value):
                failures.append(f"{row['slug']} {field_path}: {value!r}")
            if typo.search(value):
                failures.append(f"{row['slug']} typo {field_path}: {value!r}")
    assert not failures, "bad punctuation/typo:\n" + "\n".join(failures[:30])


def test_summary_ru_size_type_agreement():
    pat = re.compile(
        r"^(крошечн|маленьк|средн|больш|огромн|гигантск)\w+\s+([а-яё])",
        re.I,
    )
    for row in _mm_w2_rows():
        summary = row["data"]["summary_ru"]
        m = pat.match(summary)
        assert m, f"{row['slug']}: {summary}"
        assert m.group(2).islower() or m.group(2) == m.group(2).lower(), row["slug"]
        assert not re.search(
            r"\b(средний|большой|маленький|огромный|крошечный|гигантский)\s+[А-ЯЁ]",
            summary,
        ), summary


def test_legendary_blocks_filled_when_present():
    by_slug = {r["slug"]: r for r in _mm_w2_rows()}
    for slug in ("shadow-dragon", "vampire-umbral-lord"):
        data = by_slug[slug]["data"]
        assert isinstance(data.get("legendary_actions_uses"), int), slug
        assert data["legendary_actions_uses"] >= 1, slug
        assert data.get("legendary_actions_uses_lair") == 4, slug
        assert data.get("legendary_actions"), slug


def test_no_overlap_with_srd_or_wave1():
    srd = {
        r["slug"]
        for r in load_wave_rows()
        if r["kind"] == "bestiary" and r.get("source", "").startswith("srd")
    }
    w1 = {
        r["slug"]
        for r in load_wave_rows()
        if r["kind"] == "bestiary"
        and r.get("source") == "mm24"
        and r["slug"] not in {c["id"] for c in _csv_wave2()}
    }
    w2 = {r["slug"] for r in _mm_w2_rows()}
    assert w2.isdisjoint(srd)
    assert w2.isdisjoint(w1)
    assert len(w1) == MM24_W1_COUNT
    assert "kuo-toa-archpriest" in w2
    assert "kuo-toa" in w1
    assert "aarakocra-aeromancer" not in w2


def test_cr_and_type_distribution():
    by_type = Counter(r["data"]["type"] for r in _mm_w2_rows())
    by_cr = Counter(r["data"]["cr"] for r in _mm_w2_rows())
    assert sum(by_type.values()) == MM24_W2_COUNT
    assert sum(by_cr.values()) == MM24_W2_COUNT
    assert by_type["monstrosity"] >= 10
    assert by_type["fiend"] >= 10
    assert "yuan-ti-malison-type-3" in {r["slug"] for r in _mm_w2_rows()}


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
    for row in _mm_w2_rows():
        assert row["rules_edition"] == "2024"
        assert row["id"] == entry_id(kind="bestiary", slug=row["slug"])
        assert "initiative" in row["data"]
        assert "ability_saves" in row["data"]


def test_c07_display_fix_summary_and_spell_refs():
    """C07 fix shipped in this pack: agreement + strip non-Spellcasting refs."""
    c07 = [
        r
        for r in load_wave_rows()
        if r["kind"] == "bestiary"
        and str(r.get("source", "")).startswith("srd")
        and (r.get("data") or {}).get("srd_section") == "monsters"
    ]
    assert len(c07) == 235
    pat = re.compile(
        r"\b(средний|большой|маленький|огромный|крошечный|гигантский)\s+[А-ЯЁ]"
    )
    stripped_expected = {
        "adult-white-dragon",
        "ancient-white-dragon",
        "black-pudding",
        "chuul",
        "cloaker",
        "doppelganger",
        "drider",
        "dust-mephit",
        "ghost",
        "gray-ooze",
        "ice-devil",
        "ice-mephit",
        "imp",
        "lemure",
        "quasit",
        "rust-monster",
        "sea-hag",
        "sprite",
        "stone-golem",
        "succubus",
        "vampire",
    }
    with_spells = 0
    for row in c07:
        summary = row["data"].get("summary_ru") or ""
        assert not pat.search(summary), f"{row['slug']}: {summary}"
        refs = row["data"].get("spell_refs") or []
        if refs:
            with_spells += 1
            assert _has_spellcasting_feature(row["data"]), row["slug"]
            assert "есть заклинания" in summary, row["slug"]
        else:
            assert "есть заклинания" not in summary, row["slug"]
        if row["slug"] in stripped_expected:
            assert refs == [], row["slug"]
    # C07R rebuild: pit-fiend and other true Spellcasting blocks restored → 48.
    assert with_spells == 48
    # aboleth agreement sample
    abo = next(r for r in c07 if r["slug"] == "aboleth")
    assert abo["data"]["summary_ru"].startswith("большая аберрация")


def test_apply_seed_includes_mm24_w2_idempotent():
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
    mm = sum(
        1 for p in store.values() if p["kind"] == "bestiary" and p.get("source") == "mm24"
    )
    assert mm == MM24_W1_COUNT + MM24_W2_COUNT


def test_alembic_single_head_includes_p24_c14():
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
    assert "p24c14mmw201" in ancestor_ids
    assert "p24c13mmw101" in ancestor_ids
    # Head advances with later packs (C07R+); C14 stays on the single lineage.
    assert heads[0] in {"p24c14mmw201", "p24c07rbest01"} or "p24c14mmw201" in ancestor_ids
