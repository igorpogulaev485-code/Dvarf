"""Pack 10: real companions and fighter subclass forks.

Revision ID: r3d10a8b9c0d
Revises: q2c06e7f8a9b
Create Date: 2026-11-11

Steel defender and the beast master's companion are naparniki.
Cavalier and samurai no longer require both a skill and a language.
Rune Knight runes are chosen on the feature card (Hill and Storm from 7).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "r3d10a8b9c0d"
down_revision: Union[str, Sequence[str], None] = "q2c06e7f8a9b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/classes/subclass_catalog_seed_2014.json")
SLUGS = (
    "battle_smith",
    "beast_master",
    "cavalier",
    "samurai",
    "rune_knight",
)


def _seed_subclasses() -> dict[str, dict]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    path = next((item for item in candidates if item.is_file()), None)
    if path is None:
        raise FileNotFoundError(f"Subclass seed not found; tried {candidates}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    found: dict[str, dict] = {}
    for cls in payload.get("classes") or []:
        for sub in cls.get("subclasses") or []:
            slug = sub.get("slug")
            if slug in SLUGS:
                found[slug] = sub
    missing = [slug for slug in SLUGS if slug not in found]
    if missing:
        raise ValueError(f"subclass seed missing {missing}")
    return found


def upgrade() -> None:
    conn = op.get_bind()
    subclasses = _seed_subclasses()
    for slug, sub in subclasses.items():
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = jsonb_set(
                      jsonb_set(
                        jsonb_set(
                          jsonb_set(
                            COALESCE(data, '{}'::jsonb),
                            '{choices}',
                            CAST(:choices AS jsonb),
                            true
                          ),
                          '{sheet_grants}',
                          CAST(:grants AS jsonb),
                          true
                        ),
                        '{notes_ru}',
                        to_jsonb(CAST(:notes AS text)),
                        true
                      ),
                      '{features_by_level}',
                      CAST(:features AS jsonb),
                      true
                    ),
                    updated_at = now()
                WHERE kind = 'subclass'
                  AND slug = :slug
                  AND rules_edition = '2014'
                """
            ),
            {
                "slug": slug,
                "choices": json.dumps(sub.get("choices") or [], ensure_ascii=False),
                "grants": json.dumps(sub.get("sheet_grants") or {}, ensure_ascii=False),
                "notes": sub.get("notes_ru") or "",
                "features": json.dumps(sub.get("features_by_level") or {}, ensure_ascii=False),
            },
        )


def downgrade() -> None:
    pass
