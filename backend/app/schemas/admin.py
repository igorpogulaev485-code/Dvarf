from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator


class AdminAccountStats(BaseModel):
    id: UUID
    email: str | None = None
    display_name: str | None = None
    email_verified: bool
    created_at: datetime
    characters_2014: int
    characters_2024: int
    characters_total: int
    lobbies_owned: int
    lobbies_as_player: int


class AdminAccountListResponse(BaseModel):
    items: list[AdminAccountStats]
    total: int
    limit: int
    offset: int


class AdminChangeEmailRequest(BaseModel):
    new_email: EmailStr
    confirm_new_email: EmailStr
    admin_password: str = Field(min_length=1, max_length=128)

    @model_validator(mode="after")
    def emails_must_match(self) -> AdminChangeEmailRequest:
        if self.new_email.strip().lower() != self.confirm_new_email.strip().lower():
            raise ValueError("Новый email и подтверждение не совпадают")
        return self


class AdminChangeEmailResponse(BaseModel):
    message: str
    stub: bool = False
    debug_confirm_url: str | None = None
