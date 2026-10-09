from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CatalogKind(str, enum.Enum):
    race = "race"
    class_ = "class"
    subclass = "subclass"
    background = "background"
    alignment = "alignment"
    skill = "skill"
    feat = "feat"
    spell = "spell"
    weapon = "weapon"
    armor = "armor"
    item = "item"
    condition = "condition"
    bestiary = "bestiary"


class CatalogRulesEdition(str, enum.Enum):
    edition_2014 = "2014"
    edition_2024 = "2024"
    both = "both"


class CatalogEntry(Base):
    __tablename__ = "catalog_entries"
    __table_args__ = (
        UniqueConstraint(
            "kind",
            "slug",
            "rules_edition",
            name="uq_catalog_entries_kind_slug_edition",
        ),
        Index(
            "ix_catalog_entries_kind_edition_active",
            "kind",
            "rules_edition",
            "is_active",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    kind: Mapped[CatalogKind] = mapped_column(
        Enum(
            CatalogKind,
            name="catalog_kind",
            native_enum=True,
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
    )
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    name_ru: Mapped[str] = mapped_column(String(160), nullable=False)
    name_en: Mapped[str | None] = mapped_column(String(160), nullable=True)
    rules_edition: Mapped[CatalogRulesEdition] = mapped_column(
        Enum(
            CatalogRulesEdition,
            name="catalog_rules_edition",
            native_enum=True,
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("catalog_entries.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source: Mapped[str | None] = mapped_column(String(80), nullable=True)
    external_ref: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    parent = relationship("CatalogEntry", remote_side="CatalogEntry.id", uselist=False)
