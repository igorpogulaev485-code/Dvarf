"""Add size_choices (Medium/Small) to race catalog rows.

Revision ID: h7c8d9e0f1a2
Revises: g6b7c8d9e0f1
Create Date: 2026-10-07 05:40:00.000000

"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "g6b7c8d9e0f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_RELS = (
    Path("data/races/mpmm_race_catalog_spec.json"),
    Path("data/races/setting_race_catalog_spec.json"),
)

SIZE_CHOICE_SLUGS = (
    "changeling",
    "harengon",
    "kenku",
    "tortle",
    "yuan_ti",
    "hadozee",
    "plasmoid",
    "thri_kreen",
    "dhampir",
    "hexblood",
    "reborn",
    "owlin",
    "verdan",
)


def _load_size_choices_by_slug() -> dict[str, list[str]]:
    by_slug: dict[str, list[str]] = {}
    for rel in SPEC_RELS:
        candidates = [
            Path.cwd() / rel,
            Path.cwd() / "backend" / rel,
            Path(__file__).resolve().parents[2] / rel,
        ]
        path = next((p for p in candidates if p.is_file()), None)
        if path is None:
            raise FileNotFoundError(f"Race catalog spec not found; tried {candidates}")
        payload = json.loads(path.read_text(encoding="utf-8"))
        for race in payload.get("races") or []:
            slug = race.get("slug")
            choices = race.get("size_choices")
            if slug in SIZE_CHOICE_SLUGS and isinstance(choices, list) and choices:
                by_slug[str(slug)] = [str(item) for item in choices]
    missing = [slug for slug in SIZE_CHOICE_SLUGS if slug not in by_slug]
    if missing:
        raise RuntimeError(f"size_choices missing in specs for: {missing}")
    return by_slug


def upgrade() -> None:
    conn = op.get_bind()
    by_slug = _load_size_choices_by_slug()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, slug, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": list(SIZE_CHOICE_SLUGS)},
    ).mappings()

    updated = 0
    for row in rows:
        slug = str(row["slug"])
        choices = by_slug.get(slug)
        if not choices:
            continue
        data = dict(row["data"] or {})
        data["size_choices"] = choices
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb), updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data, ensure_ascii=False)},
        )
        updated += 1

    if updated < len(SIZE_CHOICE_SLUGS):
        raise RuntimeError(
            f"Expected to patch {len(SIZE_CHOICE_SLUGS)} races, updated {updated}"
        )


def downgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": list(SIZE_CHOICE_SLUGS)},
    ).mappings()
    for row in rows:
        data = dict(row["data"] or {})
        if "size_choices" not in data:
            continue
        data.pop("size_choices", None)
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb), updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data, ensure_ascii=False)},
        )
