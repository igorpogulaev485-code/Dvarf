from app.services.oauth.base import OAuthProfile, OAuthProvider
from app.services.oauth.vk import VkOAuthProvider
from app.services.oauth.yandex import YandexOAuthProvider

__all__ = [
    "OAuthProfile",
    "OAuthProvider",
    "VkOAuthProvider",
    "YandexOAuthProvider",
]
