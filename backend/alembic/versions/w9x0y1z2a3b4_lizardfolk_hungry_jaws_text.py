"""Fix lizardfolk Hungry Jaws RU name + Volo copy in catalog.

Revision ID: w9x0y1z2a3b4
Revises: v8w9x0y1z2a3
Create Date: 2026-10-19

Catalog had a literal «Голодные челюсти» MotM paraphrase; official RU is
«Голодная пасть» with the Volo short/long-rest Con-mod wording.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "w9x0y1z2a3b4"
down_revision: Union[str, Sequence[str], None] = "v8w9x0y1z2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/mpmm_race_catalog_spec.json")
TARGET_SLUG = "lizardfolk"
PATCH_KEYS = ("trait_cards", "traits_text")


def _load_lizardfolk() -> dict[str, Any]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    path = next((p for p in candidates if p.is_file()), None)
    if path is None:
        raise FileNotFoundError(f"MPMM race catalog spec not found; tried {candidates}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    for race in payload.get("races") or []:
        if race.get("slug") == TARGET_SLUG:
            return race
    raise RuntimeError(f"{TARGET_SLUG} missing from {path}")


def upgrade() -> None:
    conn = op.get_bind()
    race = _load_lizardfolk()
    patch = {key: race[key] for key in PATCH_KEYS if key in race and race[key] is not None}
    if not patch.get("trait_cards"):
        raise RuntimeError("lizardfolk trait_cards missing in spec")
    hungry = next(
        (card for card in patch["trait_cards"] if card.get("id") == "hungry_jaws"),
        None,
    )
    if not hungry or hungry.get("name_ru") != "Голодная пасть":
        raise RuntimeError("hungry_jaws card missing or still misnamed in spec")

    row = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = :slug
            """
        ),
        {"slug": TARGET_SLUG},
    ).mappings().first()
    if row is None:
        raise RuntimeError(f"catalog race {TARGET_SLUG} not found")

    data = dict(row["data"] or {})
    data.update(patch)
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


def downgrade() -> None:
    conn = op.get_bind()
    row = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = :slug
            """
        ),
        {"slug": TARGET_SLUG},
    ).mappings().first()
    if row is None:
        return
    data = dict(row["data"] or {})
    cards = list(data.get("trait_cards") or [])
    for i, card in enumerate(cards):
        if not isinstance(card, dict) or card.get("id") != "hungry_jaws":
            continue
        cards[i] = {
            **card,
            "name_ru": "Голодные челюсти",
            "summary_ru": (
                "Бонусным действием совершите атаку укусом. При попадании получаете "
                "временные хиты, равные бонусу мастерства. Число использований = бонус "
                "мастерства, все восстанавливаются после продолжительного отдыха."
            ),
        }
        break
    data["trait_cards"] = cards
    data["traits_text"] = (
        "Людоящер (MPMM + Volo): ASI гибкий. Скорость 30, плавание 30. "
        "Укус (1к6+СИЛ рубящий). Голодные челюсти: бонусным действием укус; "
        "при попадании — временные хиты = БМ (число раз = БМ / долгий отдых). "
        "Задержка дыхания 15 мин. Умелый ремесленник (Volo): за короткий отдых "
        "из останков твари — дубинка, метательное копьё, щит или 1к4 дротиков. "
        "Природный доспех (13+Лов, щит можно). Природная интуиция: 2 навыка из списка."
    )
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
