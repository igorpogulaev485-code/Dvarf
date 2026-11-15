"""W-API-01: задание импорта мира, черновик сверки, ключи источника."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

WorldImportStatus = Literal[
    "received",
    "parsing",
    "ready_for_review",
    "confirmed",
    "cancelled",
    "failed",
]
WORLD_IMPORT_STATUSES: frozenset[str] = frozenset(
    {
        "received",
        "parsing",
        "ready_for_review",
        "confirmed",
        "cancelled",
        "failed",
    }
)

WorldImportSourceKind = Literal["api", "zip", "git", "mcp"]
WORLD_IMPORT_SOURCE_KINDS: frozenset[str] = frozenset({"api", "zip", "git", "mcp"})

SUPPORTED_RULES_EDITION = "2014"

WorldImportDraftItemStatus = Literal[
    "proposed",
    "accepted",
    "rejected",
    "deferred",
    "conflict",
]
WORLD_IMPORT_DRAFT_ITEM_STATUSES: frozenset[str] = frozenset(
    {"proposed", "accepted", "rejected", "deferred", "conflict"}
)


class WorldImportJob(Base):
    """Задание заливки мира в черновик сверки (разбор — в следующих пачках)."""

    __tablename__ = "world_import_jobs"
    __table_args__ = (
        UniqueConstraint(
            "setting_id",
            "idempotency_key",
            name="uq_world_import_jobs_setting_idempotency",
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
    lobby_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lobbies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="received")
    rules_edition: Mapped[str] = mapped_column(String(16), nullable=False, default="2014")
    source_kind: Mapped[str] = mapped_column(String(16), nullable=False, default="api")
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    source_ref: Mapped[str | None] = mapped_column(Text, nullable=True)
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

    draft_items: Mapped[list[WorldImportDraftItem]] = relationship(
        "WorldImportDraftItem",
        back_populates="job",
        cascade="all, delete-orphan",
    )


class WorldImportDraftItem(Base):
    """Строка черновика сверки (наполнение — W-API-02…06)."""

    __tablename__ = "world_import_draft_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("world_import_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_type: Mapped[str] = mapped_column(String(64), nullable=False, default="unknown")
    source_key: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="proposed")
    proposal: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
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

    job: Mapped[WorldImportJob] = relationship("WorldImportJob", back_populates="draft_items")


class WorldSourceKey(Base):
    """Ключ источника → внутренний id (страница/артефакт/персонаж пока nullable)."""

    __tablename__ = "world_source_keys"
    __table_args__ = (
        UniqueConstraint(
            "setting_id",
            "source_path",
            name="uq_world_source_keys_setting_path",
        ),
        UniqueConstraint(
            "setting_id",
            "source_slug",
            name="uq_world_source_keys_setting_slug",
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
    source_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    source_slug: Mapped[str | None] = mapped_column(String(128), nullable=True)
    page_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("setting_pages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    artifact_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("setting_artifacts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    character_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("characters.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
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
