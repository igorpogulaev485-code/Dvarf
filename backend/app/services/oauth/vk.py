from __future__ import annotations

from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.oauth_urls import effective_vk_redirect_uri
from app.models.user import AuthProvider
from app.services.oauth.base import OAuthProfile, OAuthProvider


class VkOAuthProvider(OAuthProvider):
    provider = AuthProvider.vk

    def is_configured(self) -> bool:
        return bool(settings.vk_client_id and settings.vk_client_secret)

    def get_authorize_url(self, state: str, *, code_challenge: str | None = None) -> str:
        self.require_configured()
        if not code_challenge:
            raise AppError(
                "Для VK ID нужен PKCE code_challenge",
                code="vk_pkce_missing",
                status_code=500,
            )
        query = urlencode(
            {
                "response_type": "code",
                "client_id": settings.vk_client_id,
                "redirect_uri": effective_vk_redirect_uri(),
                "state": state,
                "code_challenge": code_challenge,
                "code_challenge_method": "S256",
                "scope": "email",
            }
        )
        # VK ID authorize host (docs: id.vk.ru)
        return f"https://id.vk.ru/authorize?{query}"

    async def exchange_code(
        self,
        code: str,
        *,
        device_id: str | None = None,
        code_verifier: str | None = None,
        state: str | None = None,
    ) -> OAuthProfile:
        self.require_configured()
        if not code_verifier:
            raise AppError(
                "Нет PKCE code_verifier для VK ID",
                code="vk_pkce_missing",
                status_code=400,
            )
        if not device_id:
            raise AppError(
                "VK ID не вернул device_id",
                code="vk_device_id_missing",
                status_code=400,
            )

        redirect_uri = effective_vk_redirect_uri()
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "code_verifier": code_verifier,
            "client_id": settings.vk_client_id,
            "device_id": device_id,
            "redirect_uri": redirect_uri,
            "state": state or "",
        }
        # Confidential apps may use service token / client_secret depending on app type.
        if settings.vk_service_token:
            data["client_secret"] = settings.vk_service_token
        elif settings.vk_client_secret:
            data["client_secret"] = settings.vk_client_secret

        async with httpx.AsyncClient(timeout=20) as client:
            token_response = await client.post(
                "https://id.vk.ru/oauth2/auth",
                data=data,
            )
            if token_response.status_code >= 400:
                raise AppError(
                    "Не удалось получить токен VK ID",
                    code="vk_token_error",
                    status_code=400,
                )
            token_payload = token_response.json()
            if token_payload.get("error"):
                raise AppError(
                    f"VK ID: {token_payload.get('error_description') or token_payload.get('error')}",
                    code="vk_token_error",
                    status_code=400,
                )

            access_token = token_payload.get("access_token")
            user_id = str(token_payload.get("user_id") or "").strip()
            if not access_token:
                raise AppError(
                    "VK ID не вернул access_token",
                    code="vk_token_missing",
                    status_code=400,
                )

            info_response = await client.post(
                "https://id.vk.ru/oauth2/user_info",
                data={
                    "client_id": settings.vk_client_id,
                    "access_token": access_token,
                },
            )
            email = None
            display_name = None
            full_name = None
            avatar_url = None
            if info_response.status_code < 400:
                info = info_response.json()
                user = info.get("user") if isinstance(info, dict) else None
                if isinstance(user, dict):
                    email = user.get("email") or None
                    first = str(user.get("first_name") or "").strip()
                    last = str(user.get("last_name") or "").strip()
                    full_name = f"{first} {last}".strip() or None
                    display_name = full_name or user.get("email") or None
                    avatar_url = user.get("avatar") or None
                    if not user_id:
                        user_id = str(user.get("user_id") or "").strip()

        if not user_id:
            raise AppError(
                "VK ID не вернул идентификатор пользователя",
                code="vk_id_missing",
                status_code=400,
            )

        return OAuthProfile(
            provider=AuthProvider.vk,
            provider_user_id=user_id,
            email=email,
            display_name=display_name,
            full_name=full_name,
            avatar_url=avatar_url,
        )
