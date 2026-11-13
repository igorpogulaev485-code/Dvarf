"""W-04: сеты артефактов сеттинга (пороги 2 / 3 / 4+, бонусы складываются)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SettingArtifactSet(Base):
    """Сет из нескольких артефактов одного сеттинга."""

    __tablename__ = "setting_artifact_sets"

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
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="Новый сет")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # thresholds: list[{pieces: 2|3|4, abilities: [...], player_text: str}]
    thresholds: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list)
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

    setting = relationship("Setting", back_populates="artifact_sets")
    members: Mapped[list["SettingArtifactSetMember"]] = relationship(
        "SettingArtifactSetMember",
        back_populates="artifact_set",
        cascade="all, delete-orphan",
        order_by="SettingArtifactSetMember.sort_order",
    )


class SettingArtifactSetMember(Base):
    """Часть сета. Один артефакт — не более чем в одном сете."""

    __tablename__ = "setting_artifact_set_members"
    __table_args__ = (
        UniqueConstraint("artifact_id", name="uq_setting_artifact_set_members_artifact"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("setting_artifact_sets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    artifact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("setting_artifacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    artifact_set = relationship("SettingArtifactSet", back_populates="members")
    artifact = relationship("SettingArtifact")
