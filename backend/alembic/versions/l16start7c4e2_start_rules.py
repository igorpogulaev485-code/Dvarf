"""L-16: lobby_members.start_rules_ok / start_rules_waived + start key backfill.

Revision ID: l16start7c4e2
Revises: l08rules9f2a1
Create Date: 2026-11-13

- Columns on lobby_members for «не по правилам старта» mark and manual waive.
- Optional JSON backfill of campaign_rules.start defaults (normalize still fills gaps).
- No catalog seed ids (B-08).
"""

from __future__ import annotations

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "l16start7c4e2"
down_revision: Union[str, Sequence[str], None] = "l08rules9f2a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OK_COL = "start_rules_ok"
WAIVE_COL = "start_rules_waived"

_DEFAULT_START = {
    "level": 1,
    "ability_method": "any",
    "allowed_sources": ["phb"],
    "starting_kit": {"mode": "class_equipment"},
    "banned_races": [],
    "banned_classes": [],
}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    member_cols = {c["name"] for c in inspector.get_columns("lobby_members")}

    if OK_COL not in member_cols:
        op.add_column(
            "lobby_members",
            sa.Column(
                OK_COL,
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("true"),
            ),
        )
    if WAIVE_COL not in member_cols:
        op.add_column(
            "lobby_members",
            sa.Column(
                WAIVE_COL,
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    lobby_cols = {c["name"] for c in inspector.get_columns("lobbies")}
    if "campaign_rules" not in lobby_cols:
        return

    rows = bind.execute(sa.text("SELECT id, campaign_rules FROM lobbies")).fetchall()
    for row in rows:
        lobby_id = row[0]
        raw = row[1] if isinstance(row[1], dict) else {}
        if not isinstance(raw, dict):
            raw = {}
        if isinstance(raw.get("start"), dict):
            continue
        next_rules = dict(raw)
        next_rules["start"] = json.loads(json.dumps(_DEFAULT_START))
        bind.execute(
            sa.text(
                "UPDATE lobbies SET campaign_rules = CAST(:rules AS jsonb) WHERE id = :id"
            ),
            {"rules": json.dumps(next_rules, ensure_ascii=False), "id": str(lobby_id)},
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    member_cols = {c["name"] for c in inspector.get_columns("lobby_members")}
    if WAIVE_COL in member_cols:
        op.drop_column("lobby_members", WAIVE_COL)
    if OK_COL in member_cols:
        op.drop_column("lobby_members", OK_COL)

    lobby_cols = {c["name"] for c in inspector.get_columns("lobbies")}
    if "campaign_rules" not in lobby_cols:
        return
    rows = bind.execute(sa.text("SELECT id, campaign_rules FROM lobbies")).fetchall()
    for row in rows:
        lobby_id = row[0]
        raw = row[1] if isinstance(row[1], dict) else {}
        if not isinstance(raw, dict) or "start" not in raw:
            continue
        next_rules = dict(raw)
        next_rules.pop("start", None)
        bind.execute(
            sa.text(
                "UPDATE lobbies SET campaign_rules = CAST(:rules AS jsonb) WHERE id = :id"
            ),
            {"rules": json.dumps(next_rules, ensure_ascii=False), "id": str(lobby_id)},
        )
