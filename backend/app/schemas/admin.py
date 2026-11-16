"""Схемы API админки (ADM-01). Без ФИО, телефона, паролей и токенов."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AdminStatusResponse(BaseModel):
    panel_enabled: bool = True
    is_full_admin: bool
    admin_password_set: bool
    display_name: str | None = None


class AdminPasswordSetupRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)
    password_confirm: str = Field(min_length=8, max_length=128)

    @field_validator("password", "password_confirm")
    @classmethod
    def strip_password(cls, value: str) -> str:
        return value


class AdminPasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    new_password_confirm: str = Field(min_length=8, max_length=128)


class AdminPasswordConfirmRequest(BaseModel):
    """Повторный ввод пароля админки для опасного действия (каркас)."""

    password: str = Field(min_length=1, max_length=128)


class AdminPasswordOkResponse(BaseModel):
    message: str
    admin_password_set: bool = True


class AdminAccountLoginMethods(BaseModel):
    """Способы входа — только флаги, без секретов и без ключа password."""

    has_password: bool = False
    yandex: bool = False
    vk: bool = False


class AdminAccountCharacterStats(BaseModel):
    total: int = 0
    edition_2014: int = 0
    edition_2024: int = 0
    drafts: int = 0


class AdminAccountLobbyStats(BaseModel):
    owned: int = 0
    as_player: int = 0


class AdminAccountItem(BaseModel):
    id: UUID
    email: str | None = None
    email_verified: bool = False
    display_name: str | None = None
    created_at: datetime
    last_seen_at: datetime | None = None
    login_methods: AdminAccountLoginMethods
    characters: AdminAccountCharacterStats
    lobbies: AdminAccountLobbyStats


class AdminAccountsPage(BaseModel):
    items: list[AdminAccountItem]
    total: int
    page: int
    page_size: int
