"""ADM-05: очередь правок русских/английских названий справочника.

Принятая правка живёт отдельно от catalog_entries — сиды name_ru не затирают.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CatalogNameRevisionStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    rolled_back = "rolled_back"


class CatalogNameRevision(Base):
    __tablename__ = "catalog_name_revisions"
    __table_args__ = (
        Index(
            "uq_catalog_name_revisions_one_pending",
            "catalog_entry_id",
            unique=True,
            postgresql_where=text("status = 'pending'"),
        ),
        Index(
            "ix_catalog_name_revisions_entry_status",
            "catalog_entry_id",
            "status",
        ),
        Index(
            "ix_catalog_name_revisions_created_at",
            "created_at",
        ),
        Index(
            "ix_catalog_name_revisions_reviewed_at",
            "reviewed_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    catalog_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("catalog_entries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name_ru: Mapped[str] = mapped_column(String(160), nullable=False)
    name_en: Mapped[str | None] = mapped_column(String(160), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Имена, которые были «живыми» до принятия (для отката).
    previous_name_ru: Mapped[str | None] = mapped_column(String(160), nullable=True)
    previous_name_en: Mapped[str | None] = mapped_column(String(160), nullable=True)
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
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
