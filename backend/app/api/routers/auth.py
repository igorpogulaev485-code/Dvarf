from __future__ import annotations

import secrets

from fastapi import APIRouter, Response

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import AppError, NotConfiguredError
from app.models.user import AuthProvider
from app.schemas.auth import (
    LoginRequest,
    OAuthStartResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services.auth import AuthService, serialize_user
from app.services.oauth import VkOAuthProvider, YandexOAuthProvider

router = APIRouter(prefix="/auth", tags=["auth"])


def _provider(provider: AuthProvider):
    if provider == AuthProvider.yandex:
        return YandexOAuthProvider()
    if provider == AuthProvider.vk:
        return VkOAuthProvider()
    raise AppError("Неподдерживаемый OAuth-провайдер", code="unsupported_provider", status_code=400)


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: DbSession) -> TokenResponse:
    return AuthService(db).register(payload.email, payload.password)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    return AuthService(db).login(payload.email, payload.password)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: DbSession) -> TokenResponse:
    return AuthService(db).refresh(payload.refresh_token)


@router.post("/logout", status_code=204)
def logout() -> Response:
    # Access/refresh JWTs are client-held for now; cabinet/session revoke comes later.
    return Response(status_code=204)


@router.get("/me", response_model=UserResponse)
def me(current_user: CurrentUser) -> UserResponse:
    return serialize_user(current_user)


@router.get("/oauth/{provider}/start", response_model=OAuthStartResponse)
def oauth_start(provider: AuthProvider) -> OAuthStartResponse:
    if provider not in {AuthProvider.yandex, AuthProvider.vk}:
        raise AppError("Неподдерживаемый OAuth-провайдер", code="unsupported_provider", status_code=400)

    oauth = _provider(provider)
    labels = {AuthProvider.yandex: "Яндекс", AuthProvider.vk: "VK ID"}
    if not oauth.is_configured():
        return OAuthStartResponse(
            provider=provider.value,
            configured=False,
            authorize_url=None,
            message=f"Вход через {labels[provider]} пока в заглушке: добавьте client id/secret в env.",
        )

    state = secrets.token_urlsafe(16)
    return OAuthStartResponse(
        provider=provider.value,
        configured=True,
        authorize_url=oauth.get_authorize_url(state),
        message="Ссылка авторизации сформирована. Обмен кода пока в заглушке.",
    )


@router.get("/oauth/{provider}/callback")
async def oauth_callback(provider: AuthProvider, code: str | None = None, state: str | None = None):
    if provider not in {AuthProvider.yandex, AuthProvider.vk}:
        raise AppError("Неподдерживаемый OAuth-провайдер", code="unsupported_provider", status_code=400)

    oauth = _provider(provider)
    if not code:
        raise AppError("Не передан код OAuth", code="missing_code", status_code=400)

    # Intentionally stubbed until provider secrets are wired.
    await oauth.exchange_code(code)
    return {"provider": provider.value, "state": state}
