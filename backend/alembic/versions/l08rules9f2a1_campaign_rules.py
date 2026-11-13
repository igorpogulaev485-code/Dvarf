"""L-08: lobby campaign_rules JSONB + backfill from visibility inspiration.

Revision ID: l08rules9f2a1
Revises: l07whisp5d9e3
Create Date: 2026-11-13

- Column lobbies.campaign_rules (JSONB).
- Existing rows get L-08 defaults; inspiration_after_roll copied from
  visibility_profile when present.
- No seed catalog ids (B-08). Downgrade drops only this column.
"""

from __future__ import annotations

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "l08rules9f2a1"
down_revision: Union[str, Sequence[str], None] = "l07whisp5d9e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

COLUMN = "campaign_rules"

_DEFAULT = {
    "edition_2014": {
        "feats_instead_of_asi": True,
        "multiclass": True,
        "hp_on_level_up": "average",
    },
    "homebrew": {
        "potion_bonus_self": False,
        "inspiration_stack": False,
        "inspiration_stack_max": 3,
        "flanking_advantage": False,
        "gunpowder_exploding": False,
        "hidden_death_saves": True,
        "fumble_on_1": False,
        "group_initiative": False,
        "reroll_initiative_each_round": False,
        "gritty_rest": False,
        "feat_at_level_1": False,
        "encumbrance": False,
    },
    "progression": {"mode": "xp"},
    "inspiration_after_roll": False,
    "enemies_ac_visible": False,
    "custom_rules": [],
}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("lobbies")}
    if COLUMN in cols:
        return

    op.add_column(
        "lobbies",
        sa.Column(
            COLUMN,
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )

    # Backfill defaults + migrate S-03 inspiration_after_roll from visibility_profile.
    rows = bind.execute(
        sa.text("SELECT id, visibility_profile FROM lobbies")
    ).fetchall()
    for row in rows:
        lobby_id = row[0]
        profile = row[1] if isinstance(row[1], dict) else {}
        rules = json.loads(json.dumps(_DEFAULT))
        if isinstance(profile, dict) and "inspiration_after_roll" in profile:
            rules["inspiration_after_roll"] = bool(profile.get("inspiration_after_roll"))
        bind.execute(
            sa.text(
                "UPDATE lobbies SET campaign_rules = CAST(:rules AS jsonb) WHERE id = :id"
            ),
            {"rules": json.dumps(rules, ensure_ascii=False), "id": str(lobby_id)},
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("lobbies")}
    if COLUMN not in cols:
        return
    op.drop_column("lobbies", COLUMN)
