"""W-API-04: существо сеттинга (приватный статблок 2014, не общий бестиарий)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

CreatureSource = Literal["master", "extracted"]
CREATURE_SOURCES: frozenset[str] = frozenset({"master", "extracted"})

SUPPORTED_CREATURE_RULES_EDITION = "2014"


class SettingCreature(Base):
    """Свой монстр мира мастера: только внутри setting_id, не catalog_entries."""

    __tablename__ = "setting_creatures"
    __table_args__ = (
        UniqueConstraint(
            "setting_id",
            "import_key",
            name="uq_setting_creatures_setting_import_key",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    setting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("settings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    # Стабильный ключ импорта / slug внутри сеттинга (не глобальный каталог).
    import_key: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    rules_edition: Mapped[str] = mapped_column(String(16), nullable=False, default="2014")
    # master = ввёл мастер; extracted = извлечено из хранилища (W-API-06).
    source: Mapped[str] = mapped_column(String(16), nullable=False, default="master")
    # JSON по канону бестиария 2014 (размер, тип, КД, хиты, скорость, 6 хар-к, …).
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    incomplete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    incompleteness_notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
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

    setting = relationship("Setting", back_populates="creatures")
