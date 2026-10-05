from __future__ import annotations

from urllib.parse import urlencode

from app.core.config import settings
from app.core.exceptions import NotConfiguredError
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
            }
        )
        return f"https://oauth.yandex.ru/authorize?{query}"

    async def exchange_code(self, code: str) -> OAuthProfile:
        # Stub: real token + /info exchange will be wired when secrets are ready.
        self.require_configured()
        raise NotConfiguredError(
            "Yandex OAuth callback exchange is stubbed. Configure secrets and enable the real flow next."
        )
