"""QA 2026-10-22: spell class tags + Artillerist always-prepared.

Revision ID: c8d9e0f1a2b3
Revises: b4c5d6e7f8a9
Create Date: 2026-10-22

- Add artificer to 5 missing PHB spells; fix druid/cleric base tags.
- Upsert Artillerist always_prepared_spells from subclass seed.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, Sequence[str], None] = "b4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/classes/subclass_catalog_seed_2014.json")

ARTIFICER_STABLE_ID = "22222222-2222-4222-8222-222222222201"
ARTILLERIST_SLUG = "artillerist"

ADD_ARTIFICER: tuple[str, ...] = (
    "dancing_lights",
    "create_food_and_water",
    "dispel_magic",
    "secret_chest",
    "stoneskin",
)

# slug → class to remove from base list (domain access stays via subclass grants)
REMOVE_CLASS: dict[str, str] = {
    "create_food_and_water": "druid",
    "arcane_eye": "cleric",
}

ADD_CLASS: dict[str, str] = {
    "meld_into_stone": "druid",
    "divination": "cleric",
}


def _stable_subclass_id(slug: str) -> str:
    digest = hashlib.md5(f"dvarf-subclass-2014-{slug}".encode("utf-8")).hexdigest()
    return f"33333333-3333-4333-a333-{digest[:12]}"


def _load_artillerist() -> tuple[int, dict[str, Any]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            for cls in payload.get("classes") or []:
                if cls.get("parent_slug") == "artificer":
                    grants_level = int(cls.get("grants_level") or 3)
                    for sub in cls.get("subclasses") or []:
                        if sub.get("slug") == ARTILLERIST_SLUG:
                            return grants_level, sub
            raise ValueError("artillerist not found under artificer in subclass seed")
    raise FileNotFoundError(f"Subclass seed not found; tried {candidates}")


def _catalog_data(grants_level: int, sub: dict[str, Any]) -> dict[str, Any]:
    return {
        "parent_slug": "artificer",
        "grants_level": grants_level,
        "source": sub.get("source") or "tasha",
        "source_books": sub.get("source_books"),
        "sheet_grants": sub.get("sheet_grants") or {},
        "choices": sub.get("choices") or [],
        "notes_ru": sub.get("notes_ru"),
        "always_prepared_spells": sub.get("always_prepared_spells") or [],
        "features_by_level": sub.get("features_by_level") or {},
        "detail_status": sub.get("detail_status"),
    }


def _resolve_artificer_id(conn: Any) -> str | None:
    row = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE id = CAST(:id AS uuid)
              AND kind = 'class'
              AND rules_edition = '2014'
            LIMIT 1
            """
        ),
        {"id": ARTIFICER_STABLE_ID},
    ).first()
    if row:
        return str(row[0])
    row = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind = 'class'
              AND slug = 'artificer'
              AND rules_edition = '2014'
              AND is_active = true
            ORDER BY sort_order ASC
            LIMIT 1
            """
        )
    ).first()
    return str(row[0]) if row else ARTIFICER_STABLE_ID


def _read_spell_data(conn: Any, slug: str) -> tuple[str, dict[str, Any]] | None:
    row = conn.execute(
        text(
            """
            SELECT id, data
            FROM catalog_entries
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = :slug
            LIMIT 1
            """
        ),
        {"slug": slug},
    ).mappings().first()
    if not row:
        return None
    raw = row["data"]
    if isinstance(raw, str):
        data = json.loads(raw)
    elif isinstance(raw, dict):
        data = dict(raw)
    else:
        data = {}
    return str(row["id"]), data


def _write_spell_data(conn: Any, entry_id: str, data: dict[str, Any]) -> None:
    conn.execute(
        text(
            """
            UPDATE catalog_entries
            SET data = CAST(:data AS jsonb),
                updated_at = now()
            WHERE id = CAST(:id AS uuid)
            """
        ),
        {"id": entry_id, "data": json.dumps(data, ensure_ascii=False)},
    )


def _add_class_tag(conn: Any, slug: str, class_slug: str) -> None:
    loaded = _read_spell_data(conn, slug)
    if not loaded:
        return
    entry_id, data = loaded
    classes = [c for c in (data.get("classes") or []) if isinstance(c, str)]
    if class_slug in classes:
        return
    classes.append(class_slug)
    data["classes"] = classes
    _write_spell_data(conn, entry_id, data)


def _remove_class_tag(conn: Any, slug: str, class_slug: str) -> None:
    loaded = _read_spell_data(conn, slug)
    if not loaded:
        return
    entry_id, data = loaded
    classes = [c for c in (data.get("classes") or []) if isinstance(c, str)]
    if class_slug not in classes:
        return
    data["classes"] = [c for c in classes if c != class_slug]
    _write_spell_data(conn, entry_id, data)


def upgrade() -> None:
    conn = op.get_bind()

    for slug in ADD_ARTIFICER:
        _add_class_tag(conn, slug, "artificer")
    for slug, class_slug in ADD_CLASS.items():
        _add_class_tag(conn, slug, class_slug)
    for slug, class_slug in REMOVE_CLASS.items():
        _remove_class_tag(conn, slug, class_slug)

    grants_level, sub = _load_artillerist()
    parent_id = _resolve_artificer_id(conn)
    data = _catalog_data(grants_level, sub)
    entry_id = _stable_subclass_id(ARTILLERIST_SLUG)
    existing = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind = 'subclass'
              AND slug = :slug
              AND rules_edition = '2014'
            LIMIT 1
            """
        ),
        {"slug": ARTILLERIST_SLUG},
    ).mappings().first()

    params = {
        "name_ru": sub["name_ru"],
        "name_en": sub.get("name_en"),
        "parent_id": parent_id,
        "source": sub.get("source") or "tasha",
        "data": json.dumps(data, ensure_ascii=False),
        "sort_order": 3100,
    }

    if existing:
        # Merge always_prepared_spells into existing data (preserve other keys).
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET name_ru = :name_ru,
                    name_en = :name_en,
                    parent_id = CAST(:parent_id AS uuid),
                    source = :source,
                    data = COALESCE(data, '{}'::jsonb) || CAST(:data AS jsonb),
                    sort_order = :sort_order,
                    is_active = true,
                    updated_at = now()
                WHERE id = :id
                """
            ),
            {**params, "id": str(existing["id"])},
        )
        return

    conn.execute(
        sa.text(
            """
            INSERT INTO catalog_entries (
                id, kind, slug, name_ru, name_en, rules_edition,
                parent_id, source, external_ref, data, sort_order, is_active
            ) VALUES (
                CAST(:id AS uuid),
                'subclass',
                :slug,
                :name_ru,
                :name_en,
                '2014',
                CAST(:parent_id AS uuid),
                :source,
                NULL,
                CAST(:data AS jsonb),
                :sort_order,
                true
            )
            """
        ),
        {**params, "id": entry_id, "slug": ARTILLERIST_SLUG},
    )


def downgrade() -> None:
    conn = op.get_bind()
    for slug in ADD_ARTIFICER:
        _remove_class_tag(conn, slug, "artificer")
    for slug, class_slug in ADD_CLASS.items():
        _remove_class_tag(conn, slug, class_slug)
    for slug, class_slug in REMOVE_CLASS.items():
        _add_class_tag(conn, slug, class_slug)
