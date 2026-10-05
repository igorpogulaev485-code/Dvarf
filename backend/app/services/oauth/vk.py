from __future__ import annotations

from urllib.parse import urlencode

from app.core.config import settings
from app.core.exceptions import NotConfiguredError
from app.models.user import AuthProvider
from app.services.oauth.base import OAuthProfile, OAuthProvider


class VkOAuthProvider(OAuthProvider):
    provider = AuthProvider.vk

    def is_configured(self) -> bool:
        return bool(settings.vk_client_id and settings.vk_client_secret)

    def get_authorize_url(self, state: str) -> str:
        self.require_configured()
        query = urlencode(
            {
                "response_type": "code",
                "client_id": settings.vk_client_id,
                "redirect_uri": settings.vk_redirect_uri,
                "state": state,
                "code_challenge_method": "S256",
                # PKCE challenge will be generated on the real frontend/backend flow later.
                "code_challenge": "stub_code_challenge",
            }
        )
        return f"https://id.vk.ru/authorize?{query}"

    async def exchange_code(self, code: str) -> OAuthProfile:
        # Stub: real OAuth 2.1 + PKCE exchange will be wired when secrets are ready.
        self.require_configured()
        raise NotConfiguredError(
            "Обмен кода VK ID пока в заглушке. Добавьте секреты и включим реальный поток."
        )
