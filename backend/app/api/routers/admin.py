"""API админ-панели (ADM-01). При выключенном флаге — 404."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.admin import (
    AdminAccountsPage,
    AdminPasswordChangeRequest,
    AdminPasswordConfirmRequest,
    AdminPasswordOkResponse,
    AdminPasswordSetupRequest,
    AdminStatusResponse,
)
from app.services.admin import AdminService, require_panel_enabled

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/status", response_model=AdminStatusResponse)
def admin_status(current_user: CurrentUser, db: DbSession) -> AdminStatusResponse:
    require_panel_enabled()
    return AdminService(db).status(current_user)


@router.get("/accounts", response_model=AdminAccountsPage)
def list_accounts(
    current_user: CurrentUser,
    db: DbSession,
    q: str | None = Query(default=None, max_length=200),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> AdminAccountsPage:
    require_panel_enabled()
    return AdminService(db).list_accounts(
        current_user,
        q=q,
        page=page,
        page_size=page_size,
    )


@router.post("/password/setup", response_model=AdminPasswordOkResponse)
def setup_admin_password(
    payload: AdminPasswordSetupRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminPasswordOkResponse:
    require_panel_enabled()
    return AdminService(db).setup_password(
        current_user,
        payload.password,
        payload.password_confirm,
    )


@router.post("/password/change", response_model=AdminPasswordOkResponse)
def change_admin_password(
    payload: AdminPasswordChangeRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminPasswordOkResponse:
    require_panel_enabled()
    return AdminService(db).change_password(
        current_user,
        payload.current_password,
        payload.new_password,
        payload.new_password_confirm,
    )


@router.post("/password/confirm", response_model=AdminPasswordOkResponse)
def confirm_admin_password(
    payload: AdminPasswordConfirmRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminPasswordOkResponse:
    require_panel_enabled()
    return AdminService(db).confirm_password(current_user, payload.password)
