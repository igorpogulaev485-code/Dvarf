from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RulesEdition(str, enum.Enum):
    edition_2014 = "2014"
    edition_2024 = "2024"


class Character(Base):
    __tablename__ = "characters"
    __table_args__ = (
        Index(
            "ix_characters_user_id_deleted_at_updated_at",
            "user_id",
            "deleted_at",
            "updated_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="Новый персонаж")
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    class_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    race_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    hp_current: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hp_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rules_edition: Mapped[RulesEdition] = mapped_column(
        Enum(
            RulesEdition,
            name="rules_edition",
            native_enum=True,
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
    )
    sheet: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    sheet_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
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
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", backref="characters")
