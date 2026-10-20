"""D1: артефакты сеттинга со способностями (библиотека мастера)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SettingArtifact(Base):
    """Предмет мира: создаётся в сеттинге, выдаётся через лут сессии."""

    __tablename__ = "setting_artifacts"

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
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="Новый артефакт")
    rarity: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    requires_attunement: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # abilities: list[{id, kind, name, text, bonus_target?, bonus_value?, ...}]
    abilities: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list)
    # optional attack line when granted (weapon-like)
    attack_damage: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    attack_damage_type: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    attack_ability: Mapped[str] = mapped_column(String(8), nullable=False, default="str")
    attack_range_kind: Mapped[str] = mapped_column(String(16), nullable=False, default="melee")
    weight_lb: Mapped[float | None] = mapped_column(Float, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
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

    setting = relationship("Setting", back_populates="artifacts")
