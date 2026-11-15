"""W-API-08: PDF и прочие не-картиночные вложения импорта мира.

Не идёт через LobbyMedia (там только JPEG/PNG/WebP → WebP).
Учитывается в общем бюджете медиа лобби (200 МБ).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WorldImportAttachment(Base):
    """Файл-вложение импорта (PDF листа и т.п.) без width/height."""

    __tablename__ = "world_import_attachments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    lobby_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lobbies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    setting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("settings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    character_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("characters.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source_path: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False, default="file.pdf")
    content_type: Mapped[str] = mapped_column(String(128), nullable=False, default="application/pdf")
    bytes_on_disk: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Относительный путь от uploads_dir, напр. lobbies/<id>/attachments/<uuid>.pdf
    storage_relpath: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
