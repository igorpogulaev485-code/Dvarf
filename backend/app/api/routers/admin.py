"""API админ-панели (ADM-01/02/03/04/05). При выключенном флаге — 404."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.admin import (
    AdminAccountItem,
    AdminAccountsPage,
    AdminDangerPasswordRequest,
    AdminDeleteAccountRequest,
    AdminEmailChangeRequest,
    AdminEmailChangeResponse,
    AdminMessageResponse,
    AdminMetricsResponse,
    AdminOAuthUnlinkRequest,
    AdminPasswordChangeRequest,
    AdminPasswordConfirmRequest,
    AdminPasswordOkResponse,
    AdminPasswordSetupRequest,
    AdminSessionsResponse,
    AdminStatusResponse,
)
from app.schemas.admin_catalog import (
    AdminCatalogDetail,
    AdminCatalogDraftRequest,
    AdminCatalogNameFeedbackPage,
    AdminCatalogPage,
)
from app.schemas.feedback import (
    AdminFeedbackItem,
    AdminFeedbackPage,
    AdminFeedbackPatchRequest,
)
from app.services.admin import AdminService, require_panel_enabled
from app.services.admin_catalog import AdminCatalogService
from app.services.feedback import FeedbackService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/status", response_model=AdminStatusResponse)
def admin_status(current_user: CurrentUser, db: DbSession) -> AdminStatusResponse:
    require_panel_enabled()
    return AdminService(db).status(current_user)


@router.get("/metrics", response_model=AdminMetricsResponse)
def admin_metrics(
    current_user: CurrentUser,
    db: DbSession,
    period: int = Query(default=7, ge=1, le=30),
) -> AdminMetricsResponse:
    """Сводка метрик. period: 1, 7 или 30 (иначе 7). Только числа."""
    require_panel_enabled()
    if period not in (1, 7, 30):
        period = 7
    return AdminService(db).get_metrics(current_user, period=period)


@router.get("/feedback", response_model=AdminFeedbackPage)
def list_feedback(
    current_user: CurrentUser,
    db: DbSession,
    status: str | None = Query(default=None, max_length=32),
    topic: str | None = Query(default=None, max_length=32),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> AdminFeedbackPage:
    require_panel_enabled()
    return FeedbackService(db).list_for_admin(
        current_user,
        status=status,
        topic=topic,
        page=page,
        page_size=page_size,
    )


@router.get("/feedback/{feedback_id}", response_model=AdminFeedbackItem)
def get_feedback(
    feedback_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminFeedbackItem:
    require_panel_enabled()
    return FeedbackService(db).get_for_admin(current_user, feedback_id)


@router.patch("/feedback/{feedback_id}", response_model=AdminFeedbackItem)
def patch_feedback(
    feedback_id: UUID,
    payload: AdminFeedbackPatchRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminFeedbackItem:
    require_panel_enabled()
    note_provided = "admin_note" in payload.model_fields_set
    return FeedbackService(db).patch_for_admin(
        current_user,
        feedback_id,
        status=payload.status,
        admin_note=payload.admin_note,
        note_provided=note_provided,
    )


@router.get("/catalog", response_model=AdminCatalogPage)
def list_admin_catalog(
    current_user: CurrentUser,
    db: DbSession,
    q: str | None = Query(default=None, max_length=200),
    kind: str | None = Query(default=None, max_length=32),
    edition: str | None = Query(default=None, max_length=16),
    source: str | None = Query(default=None, max_length=80),
    layer: str | None = Query(default=None, max_length=32),
    has_pending: bool | None = Query(default=None),
    include_inactive: bool = Query(default=True),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> AdminCatalogPage:
    require_panel_enabled()
    return AdminCatalogService(db).list_entries(
        current_user,
        q=q,
        kind=kind,
        edition=edition,
        source=source,
        layer=layer,
        has_pending=has_pending,
        include_inactive=include_inactive,
        page=page,
        page_size=page_size,
    )


@router.get("/catalog/name-feedback", response_model=AdminCatalogNameFeedbackPage)
def list_catalog_name_feedback(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
) -> AdminCatalogNameFeedbackPage:
    """Сообщения «Название в справочнике» — без почты, для раздела справочников."""
    require_panel_enabled()
    return AdminCatalogService(db).list_name_feedback(
        current_user,
        page=page,
        page_size=page_size,
    )


@router.get("/catalog/{entry_id}", response_model=AdminCatalogDetail)
def get_admin_catalog_entry(
    entry_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminCatalogDetail:
    require_panel_enabled()
    return AdminCatalogService(db).get_entry(current_user, entry_id)


@router.put("/catalog/{entry_id}/draft", response_model=AdminCatalogDetail)
def upsert_catalog_draft(
    entry_id: UUID,
    payload: AdminCatalogDraftRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminCatalogDetail:
    require_panel_enabled()
    return AdminCatalogService(db).upsert_draft(current_user, entry_id, payload)


@router.delete("/catalog/{entry_id}/draft", response_model=AdminCatalogDetail)
def withdraw_catalog_draft(
    entry_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminCatalogDetail:
    require_panel_enabled()
    return AdminCatalogService(db).withdraw_draft(current_user, entry_id)


@router.post("/catalog/{entry_id}/accept", response_model=AdminCatalogDetail)
def accept_catalog_draft(
    entry_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminCatalogDetail:
    require_panel_enabled()
    return AdminCatalogService(db).accept(current_user, entry_id)


@router.post("/catalog/{entry_id}/reject", response_model=AdminCatalogDetail)
def reject_catalog_draft(
    entry_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminCatalogDetail:
    require_panel_enabled()
    return AdminCatalogService(db).reject(current_user, entry_id)


@router.post("/catalog/{entry_id}/revisions/{revision_id}/rollback", response_model=AdminCatalogDetail)
def rollback_catalog_revision(
    entry_id: UUID,
    revision_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminCatalogDetail:
    require_panel_enabled()
    return AdminCatalogService(db).rollback(current_user, entry_id, revision_id)


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


@router.get("/accounts/{user_id}", response_model=AdminAccountItem)
def get_account(
    user_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminAccountItem:
    require_panel_enabled()
    return AdminService(db).get_account(current_user, user_id)


@router.get("/accounts/{user_id}/sessions", response_model=AdminSessionsResponse)
def list_account_sessions(
    user_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminSessionsResponse:
    require_panel_enabled()
    return AdminService(db).list_user_sessions(current_user, user_id)


@router.post("/accounts/{user_id}/email/change", response_model=AdminEmailChangeResponse)
def admin_email_change(
    user_id: UUID,
    payload: AdminEmailChangeRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminEmailChangeResponse:
    require_panel_enabled()
    return AdminService(db).request_email_change(
        current_user,
        user_id,
        new_email=payload.new_email,
        new_email_confirm=payload.new_email_confirm,
        admin_password=payload.admin_password,
    )


@router.post("/accounts/{user_id}/email/resend-verification", response_model=AdminMessageResponse)
def admin_resend_verification(
    user_id: UUID,
    payload: AdminDangerPasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminMessageResponse:
    require_panel_enabled()
    return AdminService(db).resend_verification(
        current_user,
        user_id,
        admin_password=payload.admin_password,
    )


@router.post("/accounts/{user_id}/email/mark-verified", response_model=AdminMessageResponse)
def admin_mark_email_verified(
    user_id: UUID,
    payload: AdminDangerPasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminMessageResponse:
    require_panel_enabled()
    return AdminService(db).mark_email_verified(
        current_user,
        user_id,
        admin_password=payload.admin_password,
    )


@router.post("/accounts/{user_id}/password/reset", response_model=AdminMessageResponse)
def admin_password_reset(
    user_id: UUID,
    payload: AdminDangerPasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminMessageResponse:
    require_panel_enabled()
    return AdminService(db).send_password_reset(
        current_user,
        user_id,
        admin_password=payload.admin_password,
    )


@router.post(
    "/accounts/{user_id}/sessions/{session_id}/revoke",
    response_model=AdminMessageResponse,
)
def admin_revoke_session(
    user_id: UUID,
    session_id: UUID,
    payload: AdminDangerPasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminMessageResponse:
    require_panel_enabled()
    return AdminService(db).revoke_session(
        current_user,
        user_id,
        session_id,
        admin_password=payload.admin_password,
    )


@router.post("/accounts/{user_id}/sessions/revoke-all", response_model=AdminMessageResponse)
def admin_revoke_all_sessions(
    user_id: UUID,
    payload: AdminDangerPasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminMessageResponse:
    require_panel_enabled()
    return AdminService(db).revoke_all_sessions(
        current_user,
        user_id,
        admin_password=payload.admin_password,
    )


@router.post("/accounts/{user_id}/oauth/unlink", response_model=AdminMessageResponse)
def admin_unlink_oauth(
    user_id: UUID,
    payload: AdminOAuthUnlinkRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminMessageResponse:
    require_panel_enabled()
    return AdminService(db).unlink_oauth(
        current_user,
        user_id,
        provider=payload.provider,
        admin_password=payload.admin_password,
    )


@router.post("/accounts/{user_id}/block", response_model=AdminMessageResponse)
def admin_block_user(
    user_id: UUID,
    payload: AdminDangerPasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminMessageResponse:
    require_panel_enabled()
    return AdminService(db).block_user(
        current_user,
        user_id,
        admin_password=payload.admin_password,
    )


@router.post("/accounts/{user_id}/unblock", response_model=AdminMessageResponse)
def admin_unblock_user(
    user_id: UUID,
    payload: AdminDangerPasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminMessageResponse:
    require_panel_enabled()
    return AdminService(db).unblock_user(
        current_user,
        user_id,
        admin_password=payload.admin_password,
    )


@router.post("/accounts/{user_id}/delete", response_model=AdminMessageResponse)
def admin_delete_user(
    user_id: UUID,
    payload: AdminDeleteAccountRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AdminMessageResponse:
    require_panel_enabled()
    return AdminService(db).delete_user(
        current_user,
        user_id,
        confirm=payload.confirm,
        admin_password=payload.admin_password,
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
