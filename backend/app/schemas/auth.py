from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserResponse


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


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


class DeleteAccountRequest(BaseModel):
    confirm_email: EmailStr
    password: str | None = Field(default=None, max_length=128)


class DeleteAccountResponse(BaseModel):
    message: str
