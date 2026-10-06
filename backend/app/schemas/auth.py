from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import UserResponse


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=2, max_length=128)

    @field_validator("display_name")
    @classmethod
    def strip_display_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Укажите никнейм не короче 2 символов")
        return cleaned


class RegisterResponse(BaseModel):
    message: str
    stub: bool = True
    debug_verify_url: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str


class OAuthStartResponse(BaseModel):
    provider: str
    configured: bool
    authorize_url: str | None = None
    message: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    stub: bool = True
    # Only for email stub mode — remove when real mail is connected.
    debug_reset_url: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=256)
    password: str = Field(min_length=8, max_length=128)


class ResetPasswordResponse(BaseModel):
    message: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordResponse(BaseModel):
    message: str


class EmailChangeRequest(BaseModel):
    new_email: EmailStr


class EmailChangeRequestResponse(BaseModel):
    message: str
    stub: bool = True
    # Stub only — confirmation link as if mailed to the CURRENT email.
    debug_confirm_url: str | None = None


class EmailChangeConfirmRequest(BaseModel):
    token: str = Field(min_length=10, max_length=256)


class EmailChangeConfirmResponse(BaseModel):
    message: str
    user: UserResponse


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=10, max_length=256)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ResendVerificationResponse(BaseModel):
    message: str
    stub: bool = True
    debug_verify_url: str | None = None


class DeleteAccountRequest(BaseModel):
    confirm_email: EmailStr
    password: str | None = Field(default=None, max_length=128)


class DeleteAccountResponse(BaseModel):
    message: str


class AuthSessionResponse(BaseModel):
    id: UUID
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    user_agent: str | None = None
    ip_address: str | None = None
    current: bool = False


class AuthSessionListResponse(BaseModel):
    items: list[AuthSessionResponse]


class RevokeSessionsResponse(BaseModel):
    message: str
    revoked: int

