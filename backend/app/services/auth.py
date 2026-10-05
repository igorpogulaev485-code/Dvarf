from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import AuthProvider, User
from app.repositories.user import UserRepository
from app.schemas.auth import TokenResponse
from app.schemas.user import UserResponse
from app.services.oauth.base import OAuthProfile


def serialize_user(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        login=user.login,
        display_name=user.display_name,
        full_name=user.full_name,
        phone=user.phone,
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


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

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

    def login_with_oauth_profile(self, profile: OAuthProfile) -> TokenResponse:
        existing = self.users.get_by_identity(profile.provider, profile.provider_user_id)
        if existing is not None:
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
