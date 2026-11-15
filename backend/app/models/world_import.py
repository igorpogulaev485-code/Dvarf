"""W-API-01/03/05: задание импорта мира, черновик сверки, ключи, алиасы, связи, журнал confirm."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
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
    # W-API-05: снимок канона «до confirm» (для undo в W-API-07).
    confirm_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    last_confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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

    draft_items: Mapped[list[WorldImportDraftItem]] = relationship(
        "WorldImportDraftItem",
        back_populates="job",
        cascade="all, delete-orphan",
    )
    confirmations: Mapped[list["WorldImportConfirmation"]] = relationship(
        "WorldImportConfirmation",
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
    creature_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("setting_creatures.id", ondelete="SET NULL"),
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

    aliases: Mapped[list["WorldSourceAlias"]] = relationship(
        "WorldSourceAlias",
        back_populates="source_key",
        cascade="all, delete-orphan",
    )


class WorldSourceAlias(Base):
    """Алиас имени → ключ источника внутри сеттинга (регистр/пробелы не плодят дубль)."""

    __tablename__ = "world_source_aliases"
    __table_args__ = (
        UniqueConstraint(
            "setting_id",
            "alias_norm",
            name="uq_world_source_aliases_setting_norm",
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
    source_key_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("world_source_keys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alias: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    alias_norm: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    source_key: Mapped[WorldSourceKey] = relationship(
        "WorldSourceKey", back_populates="aliases"
    )


class WorldImportDraftLink(Base):
    """Предложенное ребро черновика (канон SettingPageLink — только на confirm).

    Должность («занимает должность») хранится здесь: у SettingPageLink нет
    полей office_title / преемства / tenure.
    """

    __tablename__ = "world_import_draft_links"
    __table_args__ = (
        UniqueConstraint(
            "job_id",
            "from_source_key",
            "to_source_key",
            "kind",
            "label",
            "confidence",
            "office_title",
            "succession_order",
            name="uq_world_import_draft_links_edge",
        ),
    )

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
    from_source_key: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    to_source_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    to_alias: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # Как у SettingPageLink: semantic | mention
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default="mention")
    # Подпись из LINK_PRESETS («живёт в», «член») или «занимает должность»
    label: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    # explicit = md/[[]]/@ / явная должность; suggested = кандидат
    confidence: Mapped[str] = mapped_column(String(16), nullable=False, default="explicit")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="proposed")
    # Поля должности (пусто для обычных рёбер)
    office_title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    office_holder_status: Mapped[str | None] = mapped_column(String(16), nullable=True)
    succession_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tenure_from: Mapped[str | None] = mapped_column(String(200), nullable=True)
    tenure_to: Mapped[str | None] = mapped_column(String(200), nullable=True)
    hint: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


WorldImportConfirmActorKind = Literal["user", "ai_token"]
WORLD_IMPORT_CONFIRM_ACTOR_KINDS: frozenset[str] = frozenset({"user", "ai_token"})


class WorldImportConfirmation(Base):
    """Журнал подтверждений импорта: кто (мастер / ИИ-токен) и когда.

    Undo последнего confirm — W-API-07; здесь храним снимок и undone_at.
    """

    __tablename__ = "world_import_confirmations"

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
    actor_kind: Mapped[str] = mapped_column(String(16), nullable=False, default="user")
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    actor_token_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("world_api_tokens.id", ondelete="SET NULL"),
        nullable=True,
    )
    item_ids: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list)
    snapshot_before: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    confirmed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    undone_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    job: Mapped[WorldImportJob] = relationship(
        "WorldImportJob", back_populates="confirmations"
    )
