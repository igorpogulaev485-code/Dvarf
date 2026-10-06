from __future__ import annotations

from urllib.parse import urlencode

from fastapi import APIRouter, Response
from fastapi.responses import RedirectResponse

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.core.exceptions import AppError
from app.models.user import AuthProvider
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    OAuthStartResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TokenResponse,
)
from app.schemas.user import UserResponse, UserUpdateRequest
from app.services.auth import AuthService, serialize_user
from app.services.oauth import VkOAuthProvider, YandexOAuthProvider
from app.services.oauth.state import consume_oauth_state, issue_oauth_state

router = APIRouter(prefix="/auth", tags=["auth"])


def _provider(provider: AuthProvider):
    if provider == AuthProvider.yandex:
        return YandexOAuthProvider()
    if provider == AuthProvider.vk:
        return VkOAuthProvider()
    raise AppError(
        "Неподдерживаемый OAuth-провайдер",
        code="unsupported_provider",
        status_code=400,
    )


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: DbSession) -> TokenResponse:
    return AuthService(db).register(payload.email, payload.password)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    return AuthService(db).login(payload.email, payload.password)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: DbSession) -> TokenResponse:
    return AuthService(db).refresh(payload.refresh_token)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: DbSession) -> ForgotPasswordResponse:
    return AuthService(db).forgot_password(payload.email)


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(payload: ResetPasswordRequest, db: DbSession) -> ResetPasswordResponse:
    return AuthService(db).reset_password(payload.token, payload.password)


@router.post("/logout", status_code=204)
def logout() -> Response:
    # Access/refresh JWTs are client-held for now; cabinet/session revoke comes later.
    return Response(status_code=204)


@router.get("/me", response_model=UserResponse)
def me(current_user: CurrentUser) -> UserResponse:
    return serialize_user(current_user)


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> UserResponse:
    return AuthService(db).update_me(current_user.id, payload)


@router.get("/oauth/{provider}/start", response_model=OAuthStartResponse)
def oauth_start(provider: AuthProvider) -> OAuthStartResponse:
    if provider not in {AuthProvider.yandex, AuthProvider.vk}:
        raise AppError(
            "Неподдерживаемый OAuth-провайдер",
            code="unsupported_provider",
            status_code=400,
        )

    oauth = _provider(provider)
    labels = {AuthProvider.yandex: "Яндекс", AuthProvider.vk: "VK ID"}
    if not oauth.is_configured():
        return OAuthStartResponse(
            provider=provider.value,
            configured=False,
            authorize_url=None,
            message=(
                f"Вход через {labels[provider]} не настроен: "
                "добавьте client id/secret в env."
            ),
        )

    state = issue_oauth_state()
    message = (
        "Готово к входу через Яндекс."
        if provider == AuthProvider.yandex
        else "Ссылка авторизации сформирована. Обмен кода VK пока в заглушке."
    )
    return OAuthStartResponse(
        provider=provider.value,
        configured=True,
        authorize_url=oauth.get_authorize_url(state),
        message=message,
    )


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: AuthProvider,
    db: DbSession,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    if provider not in {AuthProvider.yandex, AuthProvider.vk}:
        raise AppError(
            "Неподдерживаемый OAuth-провайдер",
            code="unsupported_provider",
            status_code=400,
        )

    if error:
        raise AppError(
            f"Провайдер вернул ошибку: {error}",
            code="oauth_provider_error",
            status_code=400,
        )

    if not code:
        raise AppError("Не передан код OAuth", code="missing_code", status_code=400)

    if not consume_oauth_state(state):
        raise AppError(
            "Некорректный или просроченный state OAuth",
            code="invalid_oauth_state",
            status_code=400,
        )

    oauth = _provider(provider)
    profile = await oauth.exchange_code(code)
    tokens = AuthService(db).login_with_oauth_profile(profile)

    query = urlencode(
        {
            "oauth": provider.value,
            "access_token": tokens.access_token,
            "refresh_token": tokens.refresh_token,
        }
    )
    return RedirectResponse(url=f"{settings.app_public_url}/?{query}", status_code=302)
