"""C1/C5: страницы вики сеттинга (дерево + типы/шаблоны)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SettingPage(Base):
    """Страница сеттинга. Корень — parent_id IS NULL. world_notes мигрирует в первую."""

    __tablename__ = "setting_pages"

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
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("setting_pages.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="Мир")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # C7: свободный блок только для мастера (даже на revealed-странице)
    gm_body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # C3: раскрытие игрокам
    revealed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # C5: тип + шаблон + значения полей
    page_kind: Mapped[str] = mapped_column(String(32), nullable=False, default="note", index=True)
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("setting_page_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    fields: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    quest_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
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

    setting = relationship("Setting", back_populates="pages")
    parent = relationship("SettingPage", remote_side=[id], backref="children")
    # Удаление рёбер — через FK ON DELETE CASCADE; cascade на обеих сторонах ломает ORM.
    outgoing_links = relationship(
        "SettingPageLink",
        foreign_keys="SettingPageLink.from_page_id",
        back_populates="from_page",
    )
    incoming_links = relationship(
        "SettingPageLink",
        foreign_keys="SettingPageLink.to_page_id",
        back_populates="to_page",
    )
