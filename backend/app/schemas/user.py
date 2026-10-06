from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def normalize_phone(value: str | None) -> str | None:
    """Accept masked RU input; store as +7XXXXXXXXXX or None."""
    cleaned = _blank_to_none(value)
    if cleaned is None:
        return None

    digits = "".join(ch for ch in cleaned if ch.isdigit())
    if digits.startswith("8") and len(digits) == 11:
        digits = "7" + digits[1:]
    if digits.startswith("7") and len(digits) == 11:
        return f"+{digits}"
    if len(digits) == 10:
        return f"+7{digits}"

    raise ValueError("Укажите телефон в формате +7 (XXX) XXX-XX-XX")


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str | None = None
    login: str | None = None
    display_name: str | None = None
    full_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    email_verified_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    providers: list[str] = Field(default_factory=list)


class UserUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)

    @field_validator("display_name", "full_name", mode="before")
    @classmethod
    def empty_string_to_none(cls, value: object) -> object:
        if isinstance(value, str):
            return _blank_to_none(value)
        return value

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone_field(cls, value: object) -> object:
        if value is None or isinstance(value, str):
            return normalize_phone(value)
        return value
