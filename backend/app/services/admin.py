from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from app.core.security import verify_password
from app.models.user import User
from app.repositories.admin import AdminRepository
from app.repositories.email_change import EmailChangeRepository
from app.repositories.user import UserRepository
from app.schemas.admin import (
    AdminAccountListResponse,
    AdminChangeEmailResponse,
)

logger = logging.getLogger(__name__)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.admin_repo = AdminRepository(db)
        self.users = UserRepository(db)
        self.email_changes = EmailChangeRepository(db)

    def list_accounts(self, *, limit: int, offset: int) -> AdminAccountListResponse:
        limit = max(1, min(limit, 200))
        offset = max(0, offset)
        items = self.admin_repo.list_account_stats(limit=limit, offset=offset)
        total = self.admin_repo.count_users()
        return AdminAccountListResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
        )

    def request_email_change(
        self,
        *,
        admin: User,
        target_user_id: UUID,
        new_email: str,
        admin_password: str,
    ) -> AdminChangeEmailResponse:
        """Admin edge-case: confirm link goes to the NEW email (old may be lost)."""
        from app.services.mail import MailError, send_admin_email_change_confirm, smtp_configured

        if not admin.password_hash or not verify_password(admin_password, admin.password_hash):
            raise ForbiddenError(
                "Неверный пароль администратора",
                code="admin_password_invalid",
            )

        target = self.users.get_by_id(target_user_id)
        if target is None:
            raise NotFoundError("Аккаунт не найден", code="user_not_found")

        normalized = new_email.strip().lower()
        if target.email and normalized == target.email.lower():
            raise AppError(
                "Новый email совпадает с текущим",
                code="email_unchanged",
                status_code=400,
            )

        existing = self.users.get_by_email(normalized)
        if existing is not None and existing.id != target.id:
            raise ConflictError("Этот email уже занят", code="email_taken")

        self.email_changes.invalidate_active_for_user(target.id)
        raw_token = secrets.token_urlsafe(32)
        self.email_changes.create(
            user_id=target.id,
            new_email=normalized,
            token_hash=_hash_token(raw_token),
            expires_at=datetime.now(UTC)
            + timedelta(minutes=settings.email_change_ttl_minutes),
        )
        self.db.commit()

        confirm_url = (
            f"{settings.app_public_url.rstrip('/')}/confirm-email?token={raw_token}"
        )

        if settings.auth_email_stub or not smtp_configured():
            logger.info(
                "Admin email change stub user=%s → %s: %s",
                target.id,
                normalized,
                confirm_url,
            )
            message = (
                f"Ссылка подтверждения для смены email на {normalized} готова "
                "(режим разработки — письмо не отправлялось). "
                "Email сменится только после перехода по ссылке."
            )
            debug_url = confirm_url if settings.auth_email_stub else None
        else:
            try:
                send_admin_email_change_confirm(
                    to=normalized,
                    current_email=target.email,
                    confirm_url=confirm_url,
                )
            except MailError as exc:
                raise AppError(
                    "Не удалось отправить письмо на новый адрес. Попробуйте позже.",
                    code="mail_send_failed",
                    status_code=502,
                ) from exc
            message = (
                f"Письмо со ссылкой отправлено на {normalized}. "
                "Email сменится только после перехода по ссылке."
            )
            debug_url = None

        return AdminChangeEmailResponse(
            message=message,
            stub=settings.auth_email_stub,
            debug_confirm_url=debug_url,
        )
