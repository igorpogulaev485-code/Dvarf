"""Effective OAuth redirect URIs (empty env → derive from APP_PUBLIC_URL)."""

from __future__ import annotations

from app.core.config import settings


def _public_base() -> str:
    return (settings.app_public_url or "https://creed20.tech").rstrip("/")


def effective_yandex_redirect_uri() -> str:
    explicit = (settings.yandex_redirect_uri or "").strip()
    if explicit:
        return explicit
    return f"{_public_base()}/auth/oauth/yandex/callback"


def effective_vk_redirect_uri() -> str:
    explicit = (settings.vk_redirect_uri or "").strip()
    if explicit:
        return explicit
    return f"{_public_base()}/auth/oauth/vk/callback"
