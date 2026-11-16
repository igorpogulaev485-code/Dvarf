"""Обратная связь игроков (ADM-04): приём, лимит частоты, очередь админки."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError
from app.models.character import Character
from app.models.feedback import (
    FEEDBACK_STATUS_LABELS,
    FEEDBACK_TOPIC_LABELS,
    FeedbackMessage,
    FeedbackStatus,
    FeedbackTopic,
)
from app.models.lobby import Lobby, LobbyMember
from app.models.user import User
from app.schemas.feedback import (
    AdminFeedbackAuthor,
    AdminFeedbackItem,
    AdminFeedbackPage,
    FeedbackCreateResponse,
)
from app.services.admin import AdminService, raise_if_blocked
from app.services.mail import MailError, send_email

logger = logging.getLogger(__name__)

RATE_LIMIT_BURST = 5
RATE_LIMIT_BURST_MINUTES = 10
RATE_LIMIT_DAY = 30
FEEDBACK_MAIL_TO = "info@creed20.tech"

ACTION_FEEDBACK_STATUS = "admin_feedback_status"
ACTION_FEEDBACK_NOTE = "admin_feedback_note"


def _topic_label(topic: str) -> str:
    return FEEDBACK_TOPIC_LABELS.get(topic, topic)


def _status_label(status: str) -> str:
    return FEEDBACK_STATUS_LABELS.get(status, status)


class FeedbackService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _count_recent(self, account_id: UUID, *, since: datetime) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(FeedbackMessage)
                .where(
                    FeedbackMessage.rate_account_id == account_id,
                    FeedbackMessage.created_at >= since,
                )
            )
            or 0
        )

    def _ensure_rate_limit(self, user: User) -> None:
        now = datetime.now(UTC)
        burst = self._count_recent(
            user.id, since=now - timedelta(minutes=RATE_LIMIT_BURST_MINUTES)
        )
        if burst >= RATE_LIMIT_BURST:
            raise AppError(
                "Слишком много сообщений за короткое время. Подождите немного и попробуйте снова.",
                code="feedback_rate_limited",
                status_code=429,
            )
        daily = self._count_recent(user.id, since=now - timedelta(days=1))
        if daily >= RATE_LIMIT_DAY:
            raise AppError(
                "Достигнут дневной лимит сообщений. Напишите снова завтра или на info@creed20.tech.",
                code="feedback_rate_limited",
                status_code=429,
            )

    def _resolve_character(
        self, user: User, character_id: UUID | None
    ) -> UUID | None:
        if character_id is None:
            return None
        row = self.db.scalar(
            select(Character.id).where(
                Character.id == character_id,
                Character.user_id == user.id,
                Character.deleted_at.is_(None),
            )
        )
        if row is None:
            raise AppError(
                "Можно указать только своего персонажа",
                code="feedback_character_forbidden",
                status_code=422,
            )
        return character_id

    def _resolve_lobby(self, user: User, lobby_id: UUID | None) -> UUID | None:
        if lobby_id is None:
            return None
        lobby = self.db.get(Lobby, lobby_id)
        if lobby is None:
            raise AppError(
                "Можно указать только своё лобби",
                code="feedback_lobby_forbidden",
                status_code=422,
            )
        if lobby.owner_id == user.id:
            return lobby_id
        member = self.db.scalar(
            select(LobbyMember.id).where(
                LobbyMember.lobby_id == lobby_id,
                LobbyMember.user_id == user.id,
            )
        )
        if member is None:
            raise AppError(
                "Можно указать только своё лобби",
                code="feedback_lobby_forbidden",
                status_code=422,
            )
        return lobby_id

    def _notify_mail(
        self,
        *,
        topic: str,
        body: str,
        created_at: datetime,
        author_email: str | None,
        is_anonymous: bool,
    ) -> None:
        topic_ru = _topic_label(topic)
        lines = [
            f"Тема: {topic_ru}",
            f"Дата: {created_at.isoformat()}",
            "",
            body,
        ]
        if not is_anonymous and author_email:
            lines.insert(2, f"Автор (почта): {author_email}")
        try:
            send_email(
                to=FEEDBACK_MAIL_TO,
                subject=f"КриD20 — обратная связь: {topic_ru}",
                text_body="\n".join(lines),
            )
        except MailError:
            logger.exception("Не удалось отправить копию обратной связи на почту")
        except Exception:  # noqa: BLE001
            logger.exception("Неожиданная ошибка при отправке копии обратной связи")

    def create(
        self,
        user: User,
        *,
        topic: FeedbackTopic | str,
        body: str,
        is_anonymous: bool = False,
        character_id: UUID | None = None,
        lobby_id: UUID | None = None,
        page_path: str | None = None,
    ) -> FeedbackCreateResponse:
        raise_if_blocked(user)
        self._ensure_rate_limit(user)

        topic_value = topic.value if isinstance(topic, FeedbackTopic) else str(topic)
        if topic_value not in {t.value for t in FeedbackTopic}:
            raise AppError("Неизвестная тема", code="feedback_bad_topic", status_code=422)

        # Аноним: не сохраняем персонажа/лобби — по ним легко вычислить автора.
        # page_path оставляем; rate_account_id — только для лимита, в API не отдаём.
        if is_anonymous:
            resolved_character = None
            resolved_lobby = None
        else:
            resolved_character = self._resolve_character(user, character_id)
            resolved_lobby = self._resolve_lobby(user, lobby_id)

        msg = FeedbackMessage(
            id=uuid.uuid4(),
            topic=topic_value,
            body=body,
            user_id=None if is_anonymous else user.id,
            rate_account_id=user.id,
            is_anonymous=bool(is_anonymous),
            character_id=resolved_character,
            lobby_id=resolved_lobby,
            page_path=page_path,
            status=FeedbackStatus.new.value,
            admin_note=None,
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)

        self._notify_mail(
            topic=msg.topic,
            body=msg.body,
            created_at=msg.created_at,
            author_email=user.email,
            is_anonymous=bool(is_anonymous),
        )

        return FeedbackCreateResponse(id=msg.id, message="Сообщение принято")

    def _character_name(self, character_id: UUID | None) -> str | None:
        if character_id is None:
            return None
        return self.db.scalar(select(Character.name).where(Character.id == character_id))

    def _lobby_name(self, lobby_id: UUID | None) -> str | None:
        if lobby_id is None:
            return None
        return self.db.scalar(select(Lobby.name).where(Lobby.id == lobby_id))

    def _serialize(self, row: FeedbackMessage) -> AdminFeedbackItem:
        author: AdminFeedbackAuthor | None = None
        if not row.is_anonymous and row.user_id is not None:
            user = self.db.get(User, row.user_id)
            if user is not None:
                author = AdminFeedbackAuthor(
                    id=user.id,
                    email=user.email,
                    display_name=user.display_name,
                )
        return AdminFeedbackItem(
            id=row.id,
            topic=row.topic,
            topic_label=_topic_label(row.topic),
            status=row.status,
            status_label=_status_label(row.status),
            body=row.body,
            is_anonymous=bool(row.is_anonymous),
            author=author,
            character_id=row.character_id,
            character_name=self._character_name(row.character_id),
            lobby_id=row.lobby_id,
            lobby_name=self._lobby_name(row.lobby_id),
            page_path=row.page_path,
            admin_note=row.admin_note,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def new_count(self) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(FeedbackMessage)
                .where(FeedbackMessage.status == FeedbackStatus.new.value)
            )
            or 0
        )

    def list_for_admin(
        self,
        actor: User,
        *,
        status: str | None = None,
        topic: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> AdminFeedbackPage:
        admin = AdminService(self.db)
        admin.require_full_admin(actor)

        filters = []
        if status:
            if status not in {s.value for s in FeedbackStatus}:
                raise AppError("Неизвестный статус", code="feedback_bad_status", status_code=422)
            filters.append(FeedbackMessage.status == status)
        if topic:
            if topic not in {t.value for t in FeedbackTopic}:
                raise AppError("Неизвестная тема", code="feedback_bad_topic", status_code=422)
            filters.append(FeedbackMessage.topic == topic)

        page = max(1, int(page))
        page_size = min(max(1, int(page_size)), 100)
        total = int(
            self.db.scalar(
                select(func.count()).select_from(FeedbackMessage).where(*filters)
            )
            or 0
        )
        offset = max(0, (page - 1) * page_size)
        rows = list(
            self.db.scalars(
                select(FeedbackMessage)
                .where(*filters)
                .order_by(FeedbackMessage.created_at.desc())
                .offset(offset)
                .limit(page_size)
            ).all()
        )
        return AdminFeedbackPage(
            items=[self._serialize(row) for row in rows],
            total=total,
            page=page,
            page_size=page_size,
            new_count=self.new_count(),
        )

    def get_for_admin(self, actor: User, feedback_id: UUID) -> AdminFeedbackItem:
        AdminService(self.db).require_full_admin(actor)
        row = self.db.get(FeedbackMessage, feedback_id)
        if row is None:
            raise NotFoundError("Сообщение не найдено")
        return self._serialize(row)

    def patch_for_admin(
        self,
        actor: User,
        feedback_id: UUID,
        *,
        status: FeedbackStatus | str | None = None,
        admin_note: str | None = None,
        note_provided: bool = False,
    ) -> AdminFeedbackItem:
        admin = AdminService(self.db)
        admin.require_full_admin(actor)
        row = self.db.get(FeedbackMessage, feedback_id)
        if row is None:
            raise NotFoundError("Сообщение не найдено")

        if status is not None:
            status_value = status.value if isinstance(status, FeedbackStatus) else str(status)
            if status_value not in {s.value for s in FeedbackStatus}:
                raise AppError(
                    "Неизвестный статус",
                    code="feedback_bad_status",
                    status_code=422,
                )
            if row.status != status_value:
                old = row.status
                row.status = status_value
                self.db.commit()
                admin.write_audit(
                    actor_id=actor.id,
                    action=ACTION_FEEDBACK_STATUS,
                    target_type="feedback",
                    target_id=str(row.id),
                    meta={"from": old, "to": status_value},
                )

        if note_provided:
            row.admin_note = admin_note
            self.db.commit()
            admin.write_audit(
                actor_id=actor.id,
                action=ACTION_FEEDBACK_NOTE,
                target_type="feedback",
                target_id=str(row.id),
                meta={"has_note": bool(admin_note)},
            )

        self.db.refresh(row)
        return self._serialize(row)
