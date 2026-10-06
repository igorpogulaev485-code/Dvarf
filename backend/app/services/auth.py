from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppError, ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import AuthProvider, User
from app.repositories.email_change import EmailChangeRepository
from app.repositories.password_reset import PasswordResetRepository
from app.repositories.user import UserRepository
from app.schemas.auth import (
    ChangePasswordResponse,
    EmailChangeConfirmResponse,
    EmailChangeRequestResponse,
    ForgotPasswordResponse,
    ResetPasswordResponse,
    TokenResponse,
)
from app.schemas.user import UserResponse, UserUpdateRequest
from app.services.oauth.base import OAuthProfile

logger = logging.getLogger(__name__)


def serialize_user(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        login=user.login,
        display_name=user.display_name,
        full_name=user.full_name,
        phone=user.phone,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        updated_at=user.updated_at,
        providers=[identity.provider.value for identity in user.identities],
    )


def issue_tokens(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=serialize_user(user),
    )


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.password_resets = PasswordResetRepository(db)
        self.email_changes = EmailChangeRepository(db)

    def register(self, email: str, password: str) -> TokenResponse:
        if self.users.get_by_email(email):
            raise ConflictError("Такой email уже зарегистрирован", code="email_taken")

        user = self.users.create_user(
            email=email,
            password_hash=hash_password(password),
            display_name=email.split("@")[0],
        )
        self.users.add_identity(
            user=user,
            provider=AuthProvider.password,
            provider_user_id=str(user.id),
        )
        self.db.commit()
        self.db.refresh(user)
        # Reload with identities
        loaded = self.users.get_by_id(user.id)
        assert loaded is not None
        return issue_tokens(loaded)

    def login(self, email: str, password: str) -> TokenResponse:
        user = self.users.get_by_email(email)
        if user is None or not user.password_hash:
            raise UnauthorizedError("Неверный email или пароль")
        if not verify_password(password, user.password_hash):
            raise UnauthorizedError("Неверный email или пароль")

        loaded = self.users.get_by_id(user.id)
        assert loaded is not None
        return issue_tokens(loaded)

    def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token)
        except Exception as exc:  # noqa: BLE001
            raise UnauthorizedError("Недействительный refresh-токен") from exc

        if payload.get("type") != "refresh":
            raise UnauthorizedError("Недействительный refresh-токен")

        user = self.users.get_by_id(UUID(payload["sub"]))
        if user is None:
            raise UnauthorizedError("Пользователь не найден")
        return issue_tokens(user)

    def get_me(self, user_id: UUID) -> UserResponse:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise UnauthorizedError("Пользователь не найден")
        return serialize_user(user)

    def update_me(self, user_id: UUID, payload: UserUpdateRequest) -> UserResponse:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise UnauthorizedError("Пользователь не найден")

        self.users.update_profile(
            user,
            display_name=payload.display_name,
            full_name=payload.full_name,
            phone=payload.phone,
        )
        self.db.commit()
        loaded = self.users.get_by_id(user_id)
        assert loaded is not None
        return serialize_user(loaded)

    def login_with_oauth_profile(self, profile: OAuthProfile) -> TokenResponse:
        existing = self.users.get_by_identity(profile.provider, profile.provider_user_id)
        if existing is not None:
            if profile.avatar_url and not existing.avatar_url:
                existing.avatar_url = profile.avatar_url
                self.db.commit()
                loaded = self.users.get_by_id(existing.id)
                assert loaded is not None
                return issue_tokens(loaded)
            return issue_tokens(existing)

        if profile.email:
            email_owner = self.users.get_by_email(profile.email)
            if email_owner is not None:
                raise ConflictError(
                    "Этот email уже занят другим аккаунтом. Войдите и привяжите способ входа позже в личном кабинете.",
                    code="email_taken",
                )

        user = self.users.create_user(
            email=profile.email,
            display_name=profile.display_name,
            full_name=profile.full_name,
            avatar_url=profile.avatar_url,
        )
        self.users.add_identity(
            user=user,
            provider=profile.provider,
            provider_user_id=profile.provider_user_id,
        )
        self.db.commit()
        loaded = self.users.get_by_id(user.id)
        assert loaded is not None
        return issue_tokens(loaded)

    def forgot_password(self, email: str) -> ForgotPasswordResponse:
        """Always returns the same message; email sending is stubbed for now."""
        public_message = (
            "Если аккаунт с таким email существует, мы отправим инструкции по восстановлению. "
            "Сейчас почта ещё не подключена — это заглушка."
        )
        user = self.users.get_by_email(email)
        debug_reset_url: str | None = None

        if user is not None and user.password_hash:
            raw_token = secrets.token_urlsafe(32)
            self.password_resets.create(
                user_id=user.id,
                token_hash=_hash_reset_token(raw_token),
                expires_at=datetime.now(UTC)
                + timedelta(minutes=settings.password_reset_ttl_minutes),
            )
            self.db.commit()

            reset_url = f"{settings.app_public_url.rstrip('/')}/reset-password?token={raw_token}"
            # Stub instead of sending email.
            logger.info("Password reset stub for %s: %s", user.email, reset_url)
            if settings.auth_email_stub:
                debug_reset_url = reset_url

        return ForgotPasswordResponse(
            message=public_message,
            stub=settings.auth_email_stub,
            debug_reset_url=debug_reset_url,
        )

    def reset_password(self, token: str, password: str) -> ResetPasswordResponse:
        record = self.password_resets.get_active_by_hash(_hash_reset_token(token))
        if record is None or record.user is None:
            raise AppError(
                "Ссылка или код восстановления недействительны",
                code="invalid_reset_token",
                status_code=400,
            )

        user = record.user
        user.password_hash = hash_password(password)
        self.password_resets.mark_used(record)
        self.db.commit()
        return ResetPasswordResponse(message="Пароль успешно обновлён. Теперь можно войти.")

    def change_password(
        self,
        user_id: UUID,
        current_password: str,
        new_password: str,
    ) -> ChangePasswordResponse:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise UnauthorizedError("Пользователь не найден")

        if not user.password_hash:
            raise AppError(
                "У аккаунта нет пароля. Сначала войдите через email/пароль или задайте пароль позже.",
                code="password_not_set",
                status_code=400,
            )

        if not verify_password(current_password, user.password_hash):
            raise AppError(
                "Текущий пароль неверный",
                code="wrong_current_password",
                status_code=400,
            )

        if current_password == new_password:
            raise AppError(
                "Новый пароль должен отличаться от текущего",
                code="password_unchanged",
                status_code=400,
            )

        user.password_hash = hash_password(new_password)
        self.db.commit()
        return ChangePasswordResponse(message="Пароль изменён")

    def upload_avatar(self, user_id: UUID, data: bytes, content_type: str | None) -> UserResponse:
        from app.services.avatar import save_avatar_image

        user = self.users.get_by_id(user_id)
        if user is None:
            raise UnauthorizedError("Пользователь не найден")

        avatar_url = save_avatar_image(user_id=user_id, data=data, content_type=content_type)
        self.users.set_avatar_url(user, avatar_url)
        self.db.commit()
        loaded = self.users.get_by_id(user_id)
        assert loaded is not None
        return serialize_user(loaded)

    def delete_avatar(self, user_id: UUID) -> UserResponse:
        from app.services.avatar import delete_avatar_file, is_uploaded_avatar_url

        user = self.users.get_by_id(user_id)
        if user is None:
            raise UnauthorizedError("Пользователь не найден")

        if is_uploaded_avatar_url(user.avatar_url):
            delete_avatar_file(user_id)
        self.users.set_avatar_url(user, None)
        self.db.commit()
        loaded = self.users.get_by_id(user_id)
        assert loaded is not None
        return serialize_user(loaded)

    def request_email_change(self, user_id: UUID, new_email: str) -> EmailChangeRequestResponse:
        """Send confirmation to CURRENT email (stub). Change applies only after confirm."""
        user = self.users.get_by_id(user_id)
        if user is None:
            raise UnauthorizedError("Пользователь не найден")
        if not user.email:
            raise AppError(
                "У аккаунта нет текущей почты — сменить email нельзя",
                code="email_missing",
                status_code=400,
            )

        normalized = new_email.strip().lower()
        if normalized == user.email.lower():
            raise AppError(
                "Новый email совпадает с текущим",
                code="email_unchanged",
                status_code=400,
            )

        existing = self.users.get_by_email(normalized)
        if existing is not None and existing.id != user.id:
            raise ConflictError("Этот email уже занят", code="email_taken")

        self.email_changes.invalidate_active_for_user(user.id)
        raw_token = secrets.token_urlsafe(32)
        self.email_changes.create(
            user_id=user.id,
            new_email=normalized,
            token_hash=_hash_reset_token(raw_token),
            expires_at=datetime.now(UTC)
            + timedelta(minutes=settings.email_change_ttl_minutes),
        )
        self.db.commit()

        confirm_url = (
            f"{settings.app_public_url.rstrip('/')}/confirm-email?token={raw_token}"
        )
        # Stub: real mailer will send confirm_url to user.email (OLD address).
        logger.info(
            "Email change stub for %s → %s: %s",
            user.email,
            normalized,
            confirm_url,
        )

        return EmailChangeRequestResponse(
            message=(
                f"Мы отправили ссылку подтверждения на текущую почту {user.email}. "
                "Смена email произойдёт только после перехода по ссылке. "
                "Сейчас почта ещё не подключена — это заглушка."
            ),
            stub=settings.auth_email_stub,
            debug_confirm_url=confirm_url if settings.auth_email_stub else None,
        )

    def confirm_email_change(self, token: str) -> EmailChangeConfirmResponse:
        record = self.email_changes.get_active_by_hash(_hash_reset_token(token))
        if record is None or record.user is None:
            raise AppError(
                "Ссылка подтверждения недействительна или устарела",
                code="invalid_email_change_token",
                status_code=400,
            )

        user = record.user
        new_email = record.new_email.lower()
        owner = self.users.get_by_email(new_email)
        if owner is not None and owner.id != user.id:
            raise ConflictError("Этот email уже занят", code="email_taken")

        self.users.set_email(user, new_email)
        self.email_changes.mark_used(record)
        self.db.commit()
        loaded = self.users.get_by_id(user.id)
        assert loaded is not None
        return EmailChangeConfirmResponse(
            message="Email успешно изменён",
            user=serialize_user(loaded),
        )
