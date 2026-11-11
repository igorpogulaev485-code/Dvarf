"""Re-upsert feats with fixed/partial spell grants.

Revision ID: j6e7f8a9b0c1
Revises: i5d6e7f8a9b0
Create Date: 2026-10-07 17:00:00.000000
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j6e7f8a9b0c1"
down_revision: Union[str, Sequence[str], None] = "i5d6e7f8a9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BACKEND_ROOT = Path(__file__).resolve().parents[2]

WAVE_SPECS: list[tuple[str, str]] = [
    ("data/feats/phb2014_feat_catalog_spec.json", "phb"),
    ("data/feats/xge2014_feat_catalog_spec.json", "xge"),
    ("data/feats/tce2014_feat_catalog_spec.json", "tce"),
    ("data/feats/ftd2014_feat_catalog_spec.json", "ftd"),
    ("data/feats/erlw2014_feat_catalog_spec.json", "erlw"),
    ("data/feats/scc2014_feat_catalog_spec.json", "scc"),
    ("data/feats/sdq2014_feat_catalog_spec.json", "sdq"),
    ("data/feats/bpgg2014_feat_catalog_spec.json", "bpgg"),
    ("data/feats/pam2014_feat_catalog_spec.json", "pam"),
    ("data/feats/bmt2014_feat_catalog_spec.json", "bmt"),
]

# Re-upsert rows that gained grants.spells and/or spell_one picks.
SPELL_GRANT_SLUGS = {
    "fey_teleportation",
    "svirfneblin_magic",
    "telekinetic",
    "telepathic",
    "drow_high_magic",
    "gift_of_the_metallic_dragon",
    "outlands_envoy",
    "fey_touched",
    "shadow_touched",
    "wood_elf_magic",
    "magic_initiate",
    "artificer_initiate",
    "strixhaven_initiate",
    "strixhaven_mascot",
    "ritual_caster",
    "spell_sniper",
    "aberrant_dragonmark",
    "cartomancer",
    "rune_shaper",
    "divinely_favored",
    "initiate_of_high_sorcery",
    "adept_of_the_black_robes",
    "adept_of_the_red_robes",
    "adept_of_the_white_robes",
    "scion_of_the_outer_planes",
}


def _load_feats(rel: str) -> list[dict[str, Any]]:
    candidates = [
        Path.cwd() / rel,
        Path.cwd() / "backend" / rel,
        BACKEND_ROOT / rel,
    ]
    for path in candidates:
        if path.is_file():
            return list(json.loads(path.read_text(encoding="utf-8")).get("feats") or [])
    raise FileNotFoundError(rel)


def _upsert(conn: sa.Connection, rows: list[dict[str, Any]], wave: str) -> None:
    for row in rows:
        slug = row["slug"]
        if slug not in SPELL_GRANT_SLUGS:
            continue
        data = dict(row.get("data") or {})
        data["source"] = row.get("source") or data.get("source") or wave
        data["wave"] = wave
        existing = (
            conn.execute(
                sa.text(
                    """
                    SELECT id, data FROM catalog_entries
                    WHERE kind = 'feat' AND slug = :slug AND rules_edition = '2014'
                    LIMIT 1
                    """
                ),
                {"slug": slug},
            )
            .mappings()
            .first()
        )
        if existing:
            merged = dict(existing["data"] or {})
            merged.update(data)
            conn.execute(
                sa.text(
                    """
                    UPDATE catalog_entries
                    SET name_ru = :name_ru, name_en = :name_en, source = :source,
                        data = CAST(:data AS jsonb), sort_order = :sort_order,
                        is_active = true, updated_at = now()
                    WHERE id = :id
                    """
                ),
                {
                    "id": str(existing["id"]),
                    "name_ru": row["name_ru"],
                    "name_en": row.get("name_en"),
                    "source": row.get("source") or wave,
                    "data": json.dumps(merged, ensure_ascii=False),
                    "sort_order": int(row.get("sort_order") or 999),
                },
            )
            continue
        entry_id = row.get("id") or str(
            uuid.uuid5(uuid.NAMESPACE_URL, f"dvarf:feat:2014:{slug}")
        )
        conn.execute(
            sa.text(
                """
                INSERT INTO catalog_entries (
                    id, kind, slug, name_ru, name_en, rules_edition,
                    parent_id, source, external_ref, data, sort_order, is_active
                ) VALUES (
                    CAST(:id AS uuid), 'feat', :slug, :name_ru, :name_en, '2014',
                    NULL, :source, NULL, CAST(:data AS jsonb), :sort_order, true
                )
                """
            ),
            {
                "id": str(entry_id),
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row.get("name_en"),
                "source": row.get("source") or wave,
                "data": json.dumps(data, ensure_ascii=False),
                "sort_order": int(row.get("sort_order") or 999),
            },
        )


def upgrade() -> None:
    conn = op.get_bind()
    for rel, wave in WAVE_SPECS:
        _upsert(conn, _load_feats(rel), wave)


def downgrade() -> None:
    # Spell grants live in JSON; no destructive downgrade.
    pass
