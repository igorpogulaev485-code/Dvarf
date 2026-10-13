"""Rename race language Водяной to Акван (Aquan).

Revision ID: z5i6j7k8l9m0
Revises: y4h5i6j7k8l9
Create Date: 2026-10-13 13:10:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "z5i6j7k8l9m0"
down_revision: Union[str, Sequence[str], None] = "y4h5i6j7k8l9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
                  data,
                  '{languages}',
                  (
                    SELECT COALESCE(
                      jsonb_agg(
                        to_jsonb(
                          CASE WHEN elem = 'Водяной' THEN 'Акван' ELSE elem END
                        )
                        ORDER BY ord
                      ),
                      '[]'::jsonb
                    )
                    FROM jsonb_array_elements_text(data->'languages')
                      WITH ORDINALITY AS langs(elem, ord)
                  ),
                  true
                ),
                updated_at = now()
            WHERE kind = 'race'
              AND jsonb_typeof(data->'languages') = 'array'
              AND data->'languages' ? 'Водяной'
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
                  data,
                  '{languages}',
                  (
                    SELECT COALESCE(
                      jsonb_agg(
                        to_jsonb(
                          CASE
                            WHEN elem = 'Акван' AND slug = 'sea_elf' THEN 'Водяной'
                            ELSE elem
                          END
                        )
                        ORDER BY ord
                      ),
                      '[]'::jsonb
                    )
                    FROM jsonb_array_elements_text(data->'languages')
                      WITH ORDINALITY AS langs(elem, ord)
                  ),
                  true
                ),
                updated_at = now()
            WHERE kind = 'race'
              AND slug = 'sea_elf'
              AND jsonb_typeof(data->'languages') = 'array'
              AND data->'languages' ? 'Акван'
            """
        )
    )
