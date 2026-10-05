from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.core.exceptions import NotConfiguredError
from app.models.user import AuthProvider


@dataclass(frozen=True)
class OAuthProfile:
    provider: AuthProvider
    provider_user_id: str
    email: str | None = None
    display_name: str | None = None
    full_name: str | None = None


class OAuthProvider(ABC):
    provider: AuthProvider

    @abstractmethod
    def is_configured(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def get_authorize_url(self, state: str) -> str:
        raise NotImplementedError

    @abstractmethod
    async def exchange_code(self, code: str) -> OAuthProfile:
        raise NotImplementedError

    def require_configured(self) -> None:
        if not self.is_configured():
            raise NotConfiguredError(
                f"{self.provider.value} OAuth is not configured yet (stub)."
            )
