"""C2/C6: направленные связи (semantic + mention из текста)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SettingPageLink(Base):
    """Ребро графа: from_page → to_page внутри одного сеттинга."""

    __tablename__ = "setting_page_links"
    __table_args__ = (
        UniqueConstraint(
            "from_page_id",
            "to_page_id",
            "kind",
            name="uq_setting_page_links_from_to_kind",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    from_page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("setting_pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    to_page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("setting_pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    label: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    # C6: semantic (ручная) | mention (из @ / [[…]] в тексте)
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default="semantic", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    from_page = relationship(
        "SettingPage",
        foreign_keys=[from_page_id],
        back_populates="outgoing_links",
    )
    to_page = relationship(
        "SettingPage",
        foreign_keys=[to_page_id],
        back_populates="incoming_links",
    )
