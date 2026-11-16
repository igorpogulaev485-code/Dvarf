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
PLANNED_TOTAL = 863 + 235 + 95 + 1 + 12 + 36 + 58 + 69 + 196 + MM24_W1_COUNT + 87 + 66 + 93  # +C14 MM24 w2 +C15 EFA +C17 FRHoF

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
    """Wave-1 MM24 cards only (C14 adds wave 2 under the same source)."""
    w1 = {r["id"] for r in _csv_wave1()}
    return [
        r
        for r in load_wave_rows()
        if r["kind"] == "bestiary" and r.get("source") == "mm24" and r["slug"] in w1
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
    """Incidental /spells/ links (sunlight, antimagic cone, wish-on-remains) are not refs."""
    with_spells = 0
    for row in _mm_rows():
        refs = row["data"].get("spell_refs") or []
        summary = row["data"].get("summary_ru") or ""
        has_cast = _has_spellcasting_feature(row["data"])
        if refs:
            with_spells += 1
            assert has_cast, f"{row['slug']} has spell_refs without Spellcasting"
            assert "есть заклинания" in summary, row["slug"]
        else:
            assert "есть заклинания" not in summary, row["slug"]
            if row["slug"] in {"kuo-toa", "beholder", "death-tyrant", "demilich"}:
                assert not has_cast
                assert refs == []
    assert with_spells == 38


def test_no_space_before_punctuation_in_display_ru():
    import re

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

    for row in _mm_rows():
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
    import re

    # «средняя аберрация» / «средний гуманоид» — type lowercased inside phrase
    pat = re.compile(
        r"^(крошечн|маленьк|средн|больш|огромн|гигантск)\w+\s+([а-яё])",
        re.I,
    )
    for row in _mm_rows():
        summary = row["data"]["summary_ru"]
        m = pat.match(summary)
        assert m, f"{row['slug']}: {summary}"
        assert m.group(2).islower() or m.group(2) == m.group(2).lower(), row["slug"]
        # no «средний Аберрация»
        assert not re.search(
            r"\b(средний|большой|маленький|огромный|крошечный|гигантский)\s+[А-ЯЁ]",
            summary,
        ), summary


def test_beholder_eye_rays_and_legendary_blocks():
    by_slug = {r["slug"]: r for r in _mm_rows()}
    beh = by_slug["beholder"]["data"]
    action_names = [a["name_ru"] for a in beh.get("actions") or []]
    assert "Лучи из глаз" in action_names
    rays = [n for n in action_names if n.startswith("Луч ")]
    assert len(rays) == 10, rays
    assert beh.get("legendary_actions_uses") == 3
    assert beh.get("legendary_actions_uses_lair") == 4
    assert len(beh.get("legendary_actions") or []) >= 2
    # Antimagic cone is a bonus action, not a spell_ref
    bonus = [a["name_ru"] for a in beh.get("bonus_actions") or []]
    assert any("антимаг" in n.lower() for n in bonus)
    assert not (beh.get("spell_refs") or [])

    for slug in (
        "death-tyrant",
        "dracolich",
        "demilich",
        "death-knight",
        "arch-hag",
        "animal-lord",
        "empyrean",
        "colossus",
    ):
        data = by_slug[slug]["data"]
        assert isinstance(data.get("legendary_actions_uses"), int), slug
        assert data["legendary_actions_uses"] >= 1, slug
        assert data.get("legendary_actions"), slug

    dt = by_slug["death-tyrant"]["data"]
    assert len([n for n in [a["name_ru"] for a in dt["actions"]] if n.startswith("Луч ")]) == 10


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
    assert mm == MM24_W1_COUNT + 87  # wave 1 + wave 2


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
    assert "p24c14mmw201" in ancestor_ids or heads[0] == "p24c13mmw101"
    # Head advances with C14; C13 stays on the single lineage.
