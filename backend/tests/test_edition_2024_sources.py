"""P24-00: validate edition-2024 reference source lists (no product seed)."""

from __future__ import annotations

import csv
import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCES = REPO_ROOT / "docs" / "edition-2024" / "sources"

CATEGORIES = [
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
]


def _read_csv(name: str) -> list[dict[str, str]]:
    path = SOURCES / f"{name}.csv"
    assert path.is_file(), f"missing {path}"
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


@pytest.fixture(scope="module")
def counts() -> dict:
    path = SOURCES / "counts.json"
    assert path.is_file()
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.mark.parametrize("category", CATEGORIES)
def test_unique_ids(category: str) -> None:
    rows = _read_csv(category)
    ids = [r["id"] for r in rows]
    assert len(ids) == len(set(ids)), f"duplicate id in {category}.csv"


@pytest.mark.parametrize("category", CATEGORIES)
def test_book_and_source_link(category: str) -> None:
    rows = _read_csv(category)
    for row in rows:
        assert (row.get("book") or "").strip(), f"{category}/{row.get('id')}: empty book"
        has_link = bool((row.get("url_dndsu") or "").strip() or (row.get("url_ttg") or "").strip())
        assert has_link, f"{category}/{row.get('id')}: need url_dndsu or url_ttg"


def test_counts_match_files(counts: dict) -> None:
    by_cat = counts["by_category"]
    by_book = counts["by_category_book"]
    assert set(by_cat) == set(CATEGORIES)
    assert set(by_book) == set(CATEGORIES)

    for category in CATEGORIES:
        rows = _read_csv(category)
        assert by_cat[category] == len(rows), f"{category}: counts.json={by_cat[category]} file={len(rows)}"

        actual: dict[str, int] = {}
        for row in rows:
            book = row["book"]
            actual[book] = actual.get(book, 0) + 1

        expected = {k: v for k, v in by_book[category].items() if v}
        assert actual == expected, f"{category}: book counts mismatch\n actual={actual}\n expected={expected}"


def test_glossary_ru_exists_and_aligned() -> None:
    gloss = _read_csv("glossary_ru")
    assert gloss, "glossary_ru.csv must not be empty"
    # Every category row (except empty bastions) should appear in the flat glossary.
    for category in CATEGORIES:
        rows = _read_csv(category)
        if not rows:
            continue
        keys = {(r["id"], category) for r in rows}
        gloss_keys = {(r["id"], r["category"]) for r in gloss if r["category"] == category}
        missing = keys - gloss_keys
        assert not missing, f"glossary_ru missing {len(missing)} rows for {category}: {list(missing)[:5]}"
