"""PHB alignment catalog (9 + unaligned) and sheet-text migration.

``identity.alignment`` becomes a catalog slug. Text that does not match a
known name, abbreviation, or slug is kept in ``identity.alignment_text``.
A second run writes nothing.
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import sqlalchemy as sa

logger = logging.getLogger(__name__)
_migration_logger = logging.getLogger("alembic.runtime.migration")

CATALOG_NAMESPACE = uuid.NAMESPACE_URL

# PHB order. Slugs match the existing catalog rows.
ALIGNMENTS: tuple[tuple[str, str, str, int], ...] = (
    ("lawful_good", "Законно-добрый", "Lawful Good", 10),
    ("neutral_good", "Нейтрально-добрый", "Neutral Good", 20),
    ("chaotic_good", "Хаотично-добрый", "Chaotic Good", 30),
    ("lawful_neutral", "Законно-нейтральный", "Lawful Neutral", 40),
    ("neutral", "Нейтральный", "Neutral", 50),
    ("chaotic_neutral", "Хаотично-нейтральный", "Chaotic Neutral", 60),
    ("lawful_evil", "Законно-злой", "Lawful Evil", 70),
    ("neutral_evil", "Нейтрально-злой", "Neutral Evil", 80),
    ("chaotic_evil", "Хаотично-злой", "Chaotic Evil", 90),
    ("unaligned", "Без мировоззрения", "Unaligned", 100),
)

ALIGNMENT_SLUGS = frozenset(row[0] for row in ALIGNMENTS)

_EXTRA_PHRASES = {
        "законопослушный добрый": "lawful_good",
        "законопослушно добрый": "lawful_good",
        "нейтральный добрый": "neutral_good",
        "хаотический добрый": "chaotic_good",
        "хаотичный добрый": "chaotic_good",
        "законопослушный нейтральный": "lawful_neutral",
        "законопослушно нейтральный": "lawful_neutral",
        "истинно нейтральный": "neutral",
        "истинный нейтральный": "neutral",
        "true neutral": "neutral",
        "хаотический нейтральный": "chaotic_neutral",
        "хаотичный нейтральный": "chaotic_neutral",
        "законопослушный злой": "lawful_evil",
        "законопослушно злой": "lawful_evil",
        "нейтральный злой": "neutral_evil",
        "хаотический злой": "chaotic_evil",
        "хаотичный злой": "chaotic_evil",
        "без мировоззрения": "unaligned",
        "нет мировоззрения": "unaligned",
        "неприсоединившийся": "unaligned",
}

# Whole-string abbreviations only (punctuation stripped, length ≤ 3).
_ABBREV = {
    "lg": "lawful_good",
    "зд": "lawful_good",
    "ng": "neutral_good",
    "нд": "neutral_good",
    "cg": "chaotic_good",
    "хд": "chaotic_good",
    "ln": "lawful_neutral",
    "зн": "lawful_neutral",
    "n": "neutral",
    "tn": "neutral",
    "ин": "neutral",
    "cn": "chaotic_neutral",
    "хн": "chaotic_neutral",
    "le": "lawful_evil",
    "зз": "lawful_evil",
    "ne": "neutral_evil",
    "нз": "neutral_evil",
    "ce": "chaotic_evil",
    "хз": "chaotic_evil",
}


@dataclass
class AlignmentSeedStats:
    inserted: int = 0
    updated: int = 0
    unchanged: int = 0


@dataclass
class AlignmentMigrationStats:
    characters: int = 0
    recognized: int = 0
    kept_text: int = 0


def normalize_alignment_text(value: str) -> str:
    text = value.strip().lower().replace("ё", "е")
    text = text.replace("—", " ").replace("–", " ").replace("-", " ").replace("_", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _phrase_table() -> dict[str, str]:
    table: dict[str, str] = {}
    for slug, name_ru, name_en, _sort in ALIGNMENTS:
        table[normalize_alignment_text(name_ru)] = slug
        table[normalize_alignment_text(name_en)] = slug
        table[normalize_alignment_text(slug)] = slug
    for phrase, slug in _EXTRA_PHRASES.items():
        table[normalize_alignment_text(phrase)] = slug
    return table


_PHRASES = _phrase_table()


def recognize_alignment(value: str | None) -> str | None:
    """Return a catalog slug, or None when the text must be kept as-is."""
    if not isinstance(value, str):
        return None
    raw = value.strip()
    if not raw:
        return None
    if raw in ALIGNMENT_SLUGS:
        return raw
    phrase = normalize_alignment_text(raw)
    if phrase in _PHRASES:
        return _PHRASES[phrase]
    compact = re.sub(r"[^a-zа-я0-9]", "", phrase)
    if compact in _ABBREV and len(compact) <= 3:
        return _ABBREV[compact]
    return None


def migrate_sheet_alignment(sheet: dict[str, Any]) -> tuple[dict[str, Any], str]:
    """Return the sheet and a tag: unchanged | recognized | kept.

    Recognized text becomes ``identity.alignment`` slug and clears
    ``alignment_text``. Unknown text moves to ``alignment_text`` and the slug
    is cleared. The original wording is not deleted.
    """
    identity = sheet.get("identity")
    if not isinstance(identity, dict):
        return sheet, "unchanged"
    raw = identity.get("alignment")
    stored_text = identity.get("alignment_text")
    text = stored_text.strip() if isinstance(stored_text, str) else ""
    source = raw.strip() if isinstance(raw, str) else ""

    if source in ALIGNMENT_SLUGS and not text:
        return sheet, "unchanged"

    slug = recognize_alignment(source)
    next_identity = dict(identity)
    if slug:
        if source == slug and not text:
            return sheet, "unchanged"
        next_identity["alignment"] = slug
        next_identity["alignment_text"] = None
        tag = "recognized"
    elif source or text:
        kept = source or text
        if raw is None and text == kept:
            return sheet, "unchanged"
        next_identity["alignment"] = None
        next_identity["alignment_text"] = kept
        tag = "kept"
    else:
        return sheet, "unchanged"

    if next_identity == identity:
        return sheet, "unchanged"
    updated = dict(sheet)
    updated["identity"] = next_identity
    return updated, tag


def _data_dir() -> Path:
    here = Path(__file__).resolve()
    candidates = [
        here.parents[2] / "data" / "srd" / "2014",
        Path.cwd() / "data" / "srd" / "2014",
        Path.cwd() / "backend" / "data" / "srd" / "2014",
    ]
    for path in candidates:
        if (path / "catalog.json").is_file():
            return path
    raise FileNotFoundError(f"2014 catalog not found; tried {candidates}")


def _alignment_id(slug: str, explicit: str | None) -> str:
    if explicit:
        return str(explicit).lower()
    return str(uuid.uuid5(CATALOG_NAMESPACE, f"dvarf:catalog:alignment:2014:{slug}"))


def apply_alignment_catalog(conn: sa.Connection) -> AlignmentSeedStats:
    """Upsert the 10 alignment rows from catalog.json. Repeat writes nothing."""
    payload = json.loads((_data_dir() / "catalog.json").read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise RuntimeError("catalog.json must be a list")
    wanted = [
        row
        for row in payload
        if isinstance(row, dict) and row.get("kind") == "alignment" and row.get("rules_edition") in (None, "2014", "both")
    ]
    existing = {
        str(row["slug"]): row
        for row in conn.execute(
            sa.text(
                """
                SELECT id::text AS id, slug, name_ru, name_en, sort_order, is_active, source
                FROM catalog_entries
                WHERE kind::text = 'alignment'
                  AND rules_edition::text IN ('2014', 'both')
                """
            )
        ).mappings()
    }
    stats = AlignmentSeedStats()
    for row in wanted:
        slug = str(row["slug"])
        name_ru = str(row.get("name_ru") or slug)
        name_en = row.get("name_en") if isinstance(row.get("name_en"), str) else None
        sort_order = int(row.get("sort_order") or 0)
        is_active = bool(row.get("is_active", True))
        source = row.get("source") if isinstance(row.get("source"), str) else "srd-5.1"
        current = existing.get(slug)
        if current is None:
            new_id = _alignment_id(slug, str(row["id"]) if row.get("id") else None)
            conn.execute(
                sa.text(
                    """
                    INSERT INTO catalog_entries (
                        id, kind, slug, name_ru, name_en, rules_edition,
                        parent_id, source, external_ref, data, sort_order, is_active
                    ) VALUES (
                        CAST(:id AS uuid),
                        CAST('alignment' AS catalog_kind),
                        :slug,
                        :name_ru,
                        :name_en,
                        CAST('2014' AS catalog_rules_edition),
                        NULL,
                        :source,
                        CAST(:external_ref AS jsonb),
                        CAST('{}' AS jsonb),
                        :sort_order,
                        :is_active
                    )
                    """
                ),
                {
                    "id": new_id,
                    "slug": slug,
                    "name_ru": name_ru,
                    "name_en": name_en,
                    "source": source,
                    "external_ref": json.dumps(row["external_ref"], ensure_ascii=False)
                    if row.get("external_ref")
                    else None,
                    "sort_order": sort_order,
                    "is_active": is_active,
                },
            )
            stats.inserted += 1
            continue
        same = (
            str(current["name_ru"] or "") == name_ru
            and (current["name_en"] or None) == name_en
            and int(current["sort_order"] or 0) == sort_order
            and bool(current["is_active"]) == is_active
        )
        if same:
            stats.unchanged += 1
            continue
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET
                    name_ru = :name_ru,
                    name_en = :name_en,
                    sort_order = :sort_order,
                    is_active = :is_active,
                    updated_at = NOW()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "id": current["id"],
                "name_ru": name_ru,
                "name_en": name_en,
                "sort_order": sort_order,
                "is_active": is_active,
            },
        )
        stats.updated += 1
    message = "мировоззрения: вставлено=%s обновлено=%s без изменений=%s"
    logger.info(message, stats.inserted, stats.updated, stats.unchanged)
    _migration_logger.info(message, stats.inserted, stats.updated, stats.unchanged)
    return stats


def migrate_character_alignments(conn: sa.Connection) -> AlignmentMigrationStats:
    """Rewrite alignment text on every sheet. Repeat invocation changes nothing."""
    result = conn.execute(sa.text("SELECT id::text AS id, sheet FROM characters"))
    stats = AlignmentMigrationStats()
    for raw in result.mappings():
        sheet = raw["sheet"]
        if isinstance(sheet, str):
            try:
                sheet = json.loads(sheet)
            except json.JSONDecodeError:
                continue
        if not isinstance(sheet, dict):
            continue
        updated, tag = migrate_sheet_alignment(sheet)
        if tag == "unchanged":
            continue
        conn.execute(
            sa.text(
                """
                UPDATE characters
                SET
                    sheet = CAST(:sheet AS jsonb),
                    sheet_version = sheet_version + 1,
                    updated_at = NOW()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": raw["id"], "sheet": json.dumps(updated, ensure_ascii=False)},
        )
        stats.characters += 1
        if tag == "recognized":
            stats.recognized += 1
        elif tag == "kept":
            stats.kept_text += 1
    message = "мировоззрение листов: персонажей=%s распознано=%s сохранено текстом=%s"
    logger.info(message, stats.characters, stats.recognized, stats.kept_text)
    _migration_logger.info(message, stats.characters, stats.recognized, stats.kept_text)
    return stats
