from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentAdmin, DbSession
from app.schemas.admin import (
    AdminAccountListResponse,
    AdminChangeEmailRequest,
    AdminChangeEmailResponse,
)
from app.services.admin import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=AdminAccountListResponse)
def list_users(
    _admin: CurrentAdmin,
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AdminAccountListResponse:
    return AdminService(db).list_accounts(limit=limit, offset=offset)


@router.post("/users/{user_id}/email", response_model=AdminChangeEmailResponse)
def admin_change_email(
    user_id: UUID,
    payload: AdminChangeEmailRequest,
    admin: CurrentAdmin,
    db: DbSession,
) -> AdminChangeEmailResponse:
    return AdminService(db).request_email_change(
        admin=admin,
        target_user_id=user_id,
        new_email=str(payload.new_email),
        admin_password=payload.admin_password,
    )
