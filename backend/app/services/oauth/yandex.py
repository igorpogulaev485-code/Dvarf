from __future__ import annotations

from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import AppError
from app.models.user import AuthProvider
from app.services.oauth.base import OAuthProfile, OAuthProvider


class YandexOAuthProvider(OAuthProvider):
    provider = AuthProvider.yandex

    def is_configured(self) -> bool:
        return bool(settings.yandex_client_id and settings.yandex_client_secret)

    def get_authorize_url(self, state: str) -> str:
        self.require_configured()
        query = urlencode(
            {
                "response_type": "code",
                "client_id": settings.yandex_client_id,
                "redirect_uri": settings.yandex_redirect_uri,
                "state": state,
                "scope": "login:info login:email",
            }
        )
        return f"https://oauth.yandex.ru/authorize?{query}"

    async def exchange_code(self, code: str) -> OAuthProfile:
        self.require_configured()

        async with httpx.AsyncClient(timeout=20) as client:
            token_response = await client.post(
                "https://oauth.yandex.ru/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": settings.yandex_client_id,
                    "client_secret": settings.yandex_client_secret,
                },
            )
            if token_response.status_code >= 400:
                raise AppError(
                    "Не удалось получить токен Яндекс ID",
                    code="yandex_token_error",
                    status_code=400,
                )

            token_payload = token_response.json()
            access_token = token_payload.get("access_token")
            if not access_token:
                raise AppError(
                    "Яндекс ID не вернул access_token",
                    code="yandex_token_missing",
                    status_code=400,
                )

            info_response = await client.get(
                "https://login.yandex.ru/info",
                params={"format": "json"},
                headers={"Authorization": f"OAuth {access_token}"},
            )
            if info_response.status_code >= 400:
                raise AppError(
                    "Не удалось получить профиль Яндекс ID",
                    code="yandex_profile_error",
                    status_code=400,
                )

            info = info_response.json()

        provider_user_id = str(info.get("id") or "").strip()
        if not provider_user_id:
            raise AppError(
                "Яндекс ID не вернул идентификатор пользователя",
                code="yandex_id_missing",
                status_code=400,
            )

        email = info.get("default_email") or None
        display_name = info.get("display_name") or info.get("login") or None
        full_name = info.get("real_name") or None

        return OAuthProfile(
            provider=AuthProvider.yandex,
            provider_user_id=provider_user_id,
            email=email,
            display_name=display_name,
            full_name=full_name,
        )
