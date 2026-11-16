"""Сообщения обратной связи от игроков (ADM-04)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FeedbackTopic(str, enum.Enum):
    bug = "bug"
    question = "question"
    idea = "idea"
    name = "name"


class FeedbackStatus(str, enum.Enum):
    new = "new"
    in_progress = "in_progress"
    closed = "closed"
    not_bug = "not_bug"


FEEDBACK_TOPIC_LABELS: dict[str, str] = {
    FeedbackTopic.bug.value: "Ошибка",
    FeedbackTopic.question.value: "Вопрос",
    FeedbackTopic.idea.value: "Идея",
    FeedbackTopic.name.value: "Название в справочнике",
}

FEEDBACK_STATUS_LABELS: dict[str, str] = {
    FeedbackStatus.new.value: "Новое",
    FeedbackStatus.in_progress.value: "В работе",
    FeedbackStatus.closed.value: "Закрыто",
    FeedbackStatus.not_bug.value: "Не ошибка",
}


class FeedbackMessage(Base):
    """Сообщение игрока. Автор скрыт, если is_anonymous (user_id пуст)."""

    __tablename__ = "feedback_messages"
    __table_args__ = (
        Index("ix_feedback_messages_status_created_at", "status", "created_at"),
        Index("ix_feedback_messages_topic_created_at", "topic", "created_at"),
        Index("ix_feedback_messages_rate_created_at", "rate_account_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    topic: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Всегда аккаунт отправителя — только для лимита частоты, в API админки не отдаём.
    rate_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Без FK: удаление персонажа/лобби не стирает сообщение.
    character_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    lobby_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    page_path: Mapped[str | None] = mapped_column(String(300), nullable=True)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=FeedbackStatus.new.value,
        index=True,
    )
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
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
