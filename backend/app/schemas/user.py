from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str | None = None
    login: str | None = None
    display_name: str | None = None
    full_name: str | None = None
    phone: str | None = None
    created_at: datetime
    updated_at: datetime
    providers: list[str] = Field(default_factory=list)
