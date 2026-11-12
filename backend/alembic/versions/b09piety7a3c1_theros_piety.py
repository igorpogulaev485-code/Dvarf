"""B-09: Theros piety catalog (gods/rewards/gifts) + leonin/verdan race patches.

Revision ID: b09piety7a3c1
Revises: b08race9f4c2
Create Date: 2026-11-12

- Upsert MOT piety feats from data/theros/catalog_spec.json by (kind, edition, slug).
- New rows get uuid5(slug) — never hardcoded ids (lesson from B-08 UniqueViolation).
- Patch leonin (Hunter's Instincts) and verdan (Black Blood Healing) race rows.
- Downgrade deletes only B-09 feat slugs; races are left (patched fields stay).
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b09piety7a3c1"
down_revision: Union[str, Sequence[str], None] = "b08race9f4c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

THEROS_SPEC = Path("data/theros/catalog_spec.json")
SETTING_SPEC = Path("data/races/setting_race_catalog_spec.json")

_ENTRY_ID_NS = uuid.UUID("b091e709-7a3c-41d0-9b09-0cafe70b0901")

# Fake collision block for tests — never insert these as our own ids.
LEGACY_HARDCODED_IDS: tuple[str, ...] = tuple(
    f"11111111-1111-4111-8111-11111111130{i}" for i in range(8)
)

RACE_PATCH_SLUGS = ("leonin", "verdan")

RACE_PATCH_KEYS = (
    "speed",
    "size",
    "size_choices",
    "darkvision",
    "ability_bonuses",
    "ability_bonus_choices",
    "languages",
    "languages_choose",
    "skill_proficiencies",
    "skill_choices",
    "tool_proficiencies",
    "tool_choices",
    "weapon_proficiencies",
    "armor_proficiencies",
    "movement",
    "damage_resistances",
    "natural_armor",
    "natural_weapons",
    "racial_spells",
    "trait_cards",
    "traits_text",
    "selectable",
    "subrace_required",
    "source",
    "content_layer",
)


def new_entry_id(kind: str, slug: str, edition: str = "2014") -> str:
    """Deterministic uuid5 — stable across reruns, independent of LEGACY block."""
    return str(uuid.uuid5(_ENTRY_ID_NS, f"{kind}:{edition}:{slug}"))


def _find_spec(rel: Path) -> Path:
    candidates = [
        Path.cwd() / rel,
        Path.cwd() / "backend" / rel,
        Path(__file__).resolve().parents[2] / rel,
    ]
    for path in candidates:
        if path.is_file():
            return path
    raise FileNotFoundError(f"spec not found; tried {candidates}")


def _load_theros_entries() -> list[dict[str, Any]]:
    payload = json.loads(_find_spec(THEROS_SPEC).read_text(encoding="utf-8"))
    entries = payload.get("entries") or []
    out: list[dict[str, Any]] = []
    for row in entries:
        slug = row.get("slug")
        if isinstance(slug, str) and slug:
            out.append(row)
    return out


def _load_setting_races() -> dict[str, dict[str, Any]]:
    payload = json.loads(_find_spec(SETTING_SPEC).read_text(encoding="utf-8"))
    out: dict[str, dict[str, Any]] = {}
    for race in payload.get("races") or []:
        slug = race.get("slug")
        if isinstance(slug, str) and slug in RACE_PATCH_SLUGS:
            out[slug] = race
    return out


def lookup_entry_id(conn: Any, kind: str, slug: str, edition: str = "2014") -> str | None:
    row = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind = :kind
              AND rules_edition = :edition
              AND slug = :slug
            """
        ),
        {"kind": kind, "edition": edition, "slug": slug},
    ).mappings().first()
    return str(row["id"]) if row else None


def _upsert_feat_entry(
    conn: Any,
    entry: dict[str, Any],
    id_by_slug: dict[str, str],
) -> str:
    """Upsert kind=feat by (kind, rules_edition, slug). New id = uuid5."""
    slug = entry["slug"]
    kind = str(entry.get("kind") or "feat")
    edition = "2014"
    parent_slug = entry.get("parent_slug")
    parent_id = None
    if parent_slug:
        parent_id = id_by_slug.get(parent_slug) or lookup_entry_id(
            conn, kind, parent_slug, edition
        )
        if parent_id:
            id_by_slug[parent_slug] = parent_id

    data = dict(entry.get("data") or {})
    existing_id = id_by_slug.get(slug) or lookup_entry_id(conn, kind, slug, edition)
    if existing_id:
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    name_ru = COALESCE(:name_ru, name_ru),
                    name_en = COALESCE(:name_en, name_en),
                    parent_id = CAST(:parent_id AS uuid),
                    source = COALESCE(:source, source),
                    sort_order = COALESCE(:sort_order, sort_order),
                    is_active = true,
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "id": existing_id,
                "data": json.dumps(data, ensure_ascii=False),
                "name_ru": entry.get("name_ru"),
                "name_en": entry.get("name_en"),
                "parent_id": parent_id,
                "source": entry.get("source") or "mot",
                "sort_order": int(entry.get("sort_order") or 999),
            },
        )
        id_by_slug[slug] = existing_id
        return existing_id

    entry_id = new_entry_id(kind, slug, edition)
    conn.execute(
        sa.text(
            """
            INSERT INTO catalog_entries (
                id, kind, slug, name_ru, name_en, rules_edition,
                parent_id, source, external_ref, data, sort_order, is_active
            ) VALUES (
                CAST(:id AS uuid),
                :kind,
                :slug,
                :name_ru,
                :name_en,
                :edition,
                CAST(:parent_id AS uuid),
                :source,
                NULL,
                CAST(:data AS jsonb),
                :sort_order,
                true
            )
            """
        ),
        {
            "id": entry_id,
            "kind": kind,
            "slug": slug,
            "name_ru": entry.get("name_ru") or slug,
            "name_en": entry.get("name_en"),
            "edition": edition,
            "parent_id": parent_id,
            "source": entry.get("source") or "mot",
            "data": json.dumps(data, ensure_ascii=False),
            "sort_order": int(entry.get("sort_order") or 999),
        },
    )
    id_by_slug[slug] = entry_id
    return entry_id


def _race_catalog_data(race: dict[str, Any]) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for key in RACE_PATCH_KEYS:
        if key in race and race[key] is not None:
            data[key] = race[key]
    data.setdefault("selectable", True)
    data.setdefault("source", race.get("source") or "mot")
    return data


def _patch_race(conn: Any, race: dict[str, Any]) -> None:
    slug = race["slug"]
    row = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race' AND rules_edition = '2014' AND slug = :slug
            """
        ),
        {"slug": slug},
    ).mappings().first()
    if row is None:
        return
    data = dict(row["data"] or {})
    for key, value in _race_catalog_data(race).items():
        data[key] = value
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = CAST(:data AS jsonb),
                name_ru = COALESCE(:name_ru, name_ru),
                name_en = COALESCE(:name_en, name_en),
                source = COALESCE(:source, source),
                updated_at = now()
            WHERE id = CAST(:id AS uuid)
            """
        ),
        {
            "id": row["id"],
            "data": json.dumps(data, ensure_ascii=False),
            "name_ru": race.get("name_ru"),
            "name_en": race.get("name_en"),
            "source": race.get("source"),
        },
    )


def theros_feat_slugs() -> list[str]:
    return [e["slug"] for e in _load_theros_entries()]


def upgrade() -> None:
    conn = op.get_bind()
    id_by_slug: dict[str, str] = {}
    # Parents first: gods/gifts before rewards (entries are already ordered in spec).
    for entry in _load_theros_entries():
        _upsert_feat_entry(conn, entry, id_by_slug)

    races = _load_setting_races()
    for slug in RACE_PATCH_SLUGS:
        race = races.get(slug)
        if race:
            _patch_race(conn, race)


def downgrade() -> None:
    conn = op.get_bind()
    for slug in theros_feat_slugs():
        conn.execute(
            sa.text(
                """
                DELETE FROM catalog_entries
                WHERE kind = 'feat'
                  AND rules_edition = '2014'
                  AND slug = :slug
                """
            ),
            {"slug": slug},
        )
