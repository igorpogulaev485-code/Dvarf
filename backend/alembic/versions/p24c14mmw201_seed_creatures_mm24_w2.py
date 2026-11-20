"""P24-C14: seed MM 2024 bestiary beyond SRD (wave 2) + C07 display fix.

Revision ID: p24c14mmw201
Revises: p24c13mmw101
Create Date: 2026-11-15

Idempotent upsert via edition_2024_catalog_seed (wave creatures_mm24_w2 +
prior C01–C13, including refreshed creatures_srd summary/spell_refs).
source=mm24 → content_layer community_ref. Alphabet cut:
name_en >= «Kuo-toa Archpriest». Does not touch rules_edition=2014.
Does not enable the 2024 create flag. C12 (bastions) skipped.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c14mmw201"
down_revision: Union[str, Sequence[str], None] = "p24c13mmw101"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """Deactivate 2024 MM24 wave-2 bestiary rows inserted by this pack."""
    import sqlalchemy as sa
    from alembic import op

    conn = op.get_bind()
    # Wave-2 slugs only (do not deactivate wave 1).
    slugs = (
        "kuo-toa-archpriest",
        "kuo-toa-monitor",
        "kuo-toa-whip",
        "lacedon-ghoul",
        "larva",
        "lizardfolk-geomancer",
        "lizardfolk-sovereign",
        "mage-apprentice",
        "manes",
        "manes-vaporspawn",
        "marid",
        "merfolk-wavebender",
        "mezzoloth",
        "mind-flayer",
        "mind-flayer-arcanist",
        "modron-duodrone",
        "modron-monodrone",
        "modron-pentadrone",
        "modron-quadrone",
        "modron-tridrone",
        "mud-mephit",
        "myconid-adult",
        "myconid-sovereign",
        "myconid-spore-servant",
        "myconid-sprout",
        "needle-blight",
        "noble-prodigy",
        "nothic",
        "nycaloth",
        "ogrillon-ogre",
        "performer",
        "performer-legend",
        "performer-maestro",
        "peryton",
        "piercer",
        "pirate-admiral",
        "pixie",
        "pixie-wonderbringer",
        "poltergeist",
        "primeval-owlbear",
        "psychic-gray-ooze",
        "quaggoth",
        "quaggoth-thonot",
        "questing-knight",
        "red-slaad",
        "revenant",
        "sahuagin-baron",
        "sahuagin-priest",
        "salamander-fire-snake",
        "salamander-inferno-master",
        "satyr-revelmaster",
        "scarecrow",
        "scout-captain",
        "shadow-demon",
        "shadow-dragon",
        "slaad-tadpole",
        "smoke-mephit",
        "spectator",
        "sphinx-of-secrets",
        "spined-devil",
        "spy-master",
        "swarm-of-dretches",
        "swarm-of-larvae",
        "swarm-of-lemures",
        "swarm-of-stirges",
        "thri-kreen-marauder",
        "thri-kreen-psion",
        "tree-blight",
        "troglodyte",
        "twig-blight",
        "ultroloth",
        "umber-hulk",
        "vampire-nightbringer",
        "vampire-umbral-lord",
        "vine-blight",
        "violet-fungus-necrohulk",
        "warrior-commander",
        "water-weird",
        "winged-kobold",
        "yeti",
        "yochlol",
        "young-remorhaz",
        "yuan-ti-abomination",
        "yuan-ti-infiltrator",
        "yuan-ti-malison-type-1",
        "yuan-ti-malison-type-2",
        "yuan-ti-malison-type-3",
    )
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE rules_edition::text = '2024'
              AND source = 'mm24'
              AND kind::text = 'bestiary'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": list(slugs)},
    )
