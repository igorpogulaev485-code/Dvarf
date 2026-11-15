"""W-API-01…09: токены, задания, zip/git, validate/upsert/diff/confirm/cancel, PDF."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, Form, Header, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.core.exceptions import AppError, NotFoundError
from app.models.world_import_attachment import WorldImportAttachment
from app.schemas.world_import import (
    WorldApiTokenCreated,
    WorldApiTokenCreateRequest,
    WorldApiTokenOut,
    WorldImportCancelOut,
    WorldImportConfirmationOut,
    WorldImportConfirmOut,
    WorldImportConfirmRequest,
    WorldImportCreateRequest,
    WorldImportDiffOut,
    WorldImportDraftItemOut,
    WorldImportDraftLinkOut,
    WorldImportFromGitRequest,
    WorldImportJobOut,
    WorldImportSettingsOut,
    WorldImportSettingsPatch,
    WorldImportUndoOut,
    WorldImportUpsertRequest,
    WorldImportValidateOut,
    WorldImportValidateRequest,
    WorldVaultParseRequest,
    WorldVaultParseResultOut,
)
from app.services.world_api_tokens import WorldApiTokenService
from app.services.world_import import WorldImportService
from app.services.world_import_auth import resolve_world_import_actor
from app.services.world_import_confirm import WorldImportConfirmService
from app.services.world_import_diff import build_diff
from app.services.world_import_undo import WorldImportUndoService
from app.services.world_vault_parse import MAX_ZIP_BYTES

router = APIRouter(tags=["world-imports"])

AuthorizationHeader = Annotated[str | None, Header()]


def _actor(db: DbSession, authorization: str | None):
    return resolve_world_import_actor(db, authorization)


# --- Токены: только сессия мастера ---


@router.post(
    "/lobbies/{lobby_id}/settings/{setting_id}/world-api-tokens",
    response_model=WorldApiTokenCreated,
    status_code=201,
)
def create_world_api_token(
    lobby_id: UUID,
    setting_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    payload: WorldApiTokenCreateRequest | None = None,
) -> WorldApiTokenCreated:
    return WorldApiTokenService(db).create(current_user, lobby_id, setting_id, payload)


@router.get(
    "/lobbies/{lobby_id}/settings/{setting_id}/world-api-tokens",
    response_model=list[WorldApiTokenOut],
)
def list_world_api_tokens(
    lobby_id: UUID,
    setting_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[WorldApiTokenOut]:
    return WorldApiTokenService(db).list(current_user, lobby_id, setting_id)


@router.delete(
    "/lobbies/{lobby_id}/settings/{setting_id}/world-api-tokens/{token_id}",
    response_model=WorldApiTokenOut,
)
def revoke_world_api_token(
    lobby_id: UUID,
    setting_id: UUID,
    token_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> WorldApiTokenOut:
    return WorldApiTokenService(db).revoke(current_user, lobby_id, setting_id, token_id)


# --- W-API-05: настройки импорта (тумблер) ---


@router.get(
    "/settings/{setting_id}/world-import-settings",
    response_model=WorldImportSettingsOut,
)
def get_world_import_settings(
    setting_id: UUID,
    db: DbSession,
    authorization: AuthorizationHeader = None,
) -> WorldImportSettingsOut:
    actor = _actor(db, authorization)
    return WorldImportService(db).get_import_settings(actor, setting_id)


@router.patch(
    "/settings/{setting_id}/world-import-settings",
    response_model=WorldImportSettingsOut,
)
def patch_world_import_settings(
    setting_id: UUID,
    payload: WorldImportSettingsPatch,
    db: DbSession,
    authorization: AuthorizationHeader = None,
) -> WorldImportSettingsOut:
    actor = _actor(db, authorization)
    return WorldImportService(db).patch_import_settings(actor, setting_id, payload)


# --- W-API-05: validate ---


@router.post(
    "/settings/{setting_id}/world-imports/validate",
    response_model=WorldImportValidateOut,
)
def validate_world_import(
    setting_id: UUID,
    payload: WorldImportValidateRequest,
    db: DbSession,
    authorization: AuthorizationHeader = None,
) -> WorldImportValidateOut:
    actor = _actor(db, authorization)
    return WorldImportService(db).validate_package(actor, setting_id, payload)


# --- Задания: create (сессия) + upsert (сессия/токен) ---


@router.post(
    "/settings/{setting_id}/world-imports",
    response_model=WorldVaultParseResultOut,
    status_code=201,
)
def upsert_world_import(
    setting_id: UUID,
    db: DbSession,
    payload: WorldImportUpsertRequest | None = None,
    authorization: AuthorizationHeader = None,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> WorldVaultParseResultOut:
    """W-API-05: upsert файлов в черновик (Idempotency-Key). Канон не трогаем."""
    actor = _actor(db, authorization)
    body = payload or WorldImportUpsertRequest()
    return WorldImportService(db).upsert_package(
        actor, setting_id, body, idempotency_key=idempotency_key
    )


@router.post(
    "/settings/{setting_id}/world-imports/jobs",
    response_model=WorldImportJobOut,
    status_code=201,
)
def create_world_import_job(
    setting_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    payload: WorldImportCreateRequest | None = None,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> WorldImportJobOut:
    """W-API-01 совместимость: создать пустое задание сессией мастера."""
    return WorldImportService(db).create_job(
        current_user,
        setting_id,
        payload,
        idempotency_key=idempotency_key,
    )


@router.post(
    "/settings/{setting_id}/world-imports/from-git",
    response_model=WorldVaultParseResultOut,
    status_code=201,
)
def import_world_from_git(
    setting_id: UUID,
    payload: WorldImportFromGitRequest,
    db: DbSession,
    authorization: AuthorizationHeader = None,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> WorldVaultParseResultOut:
    """W-API-09: публичная HTTPS git-ссылка → черновик сверки (как zip)."""
    actor = _actor(db, authorization)
    return WorldImportService(db).ingest_from_git(
        actor,
        setting_id,
        payload,
        idempotency_key=idempotency_key,
    )


@router.get(
    "/settings/{setting_id}/world-imports",
    response_model=list[WorldImportJobOut],
)
def list_world_imports(
    setting_id: UUID,
    db: DbSession,
    authorization: AuthorizationHeader = None,
) -> list[WorldImportJobOut]:
    actor = _actor(db, authorization)
    return WorldImportService(db).list_jobs_for_actor(actor, setting_id)


@router.get(
    "/settings/{setting_id}/world-imports/{job_id}",
    response_model=WorldImportJobOut,
)
def get_world_import(
    setting_id: UUID,
    job_id: UUID,
    db: DbSession,
    authorization: AuthorizationHeader = None,
) -> WorldImportJobOut:
    actor = _actor(db, authorization)
    return WorldImportService(db).get_job_for_actor(actor, setting_id, job_id)


@router.get(
    "/settings/{setting_id}/world-imports/{job_id}/diff",
    response_model=WorldImportDiffOut,
)
def get_world_import_diff(
    setting_id: UUID,
    job_id: UUID,
    db: DbSession,
    authorization: AuthorizationHeader = None,
) -> WorldImportDiffOut:
    actor = _actor(db, authorization)
    svc = WorldImportService(db)
    setting = svc.access.require_setting(setting_id)
    svc.access.authorize(actor, setting, need_write=False, allow_ai=True)
    job = svc._require_job(setting, job_id)
    return build_diff(db, job)


@router.post(
    "/settings/{setting_id}/world-imports/{job_id}/confirm",
    response_model=WorldImportConfirmOut,
)
def confirm_world_import(
    setting_id: UUID,
    job_id: UUID,
    db: DbSession,
    payload: WorldImportConfirmRequest | None = None,
    authorization: AuthorizationHeader = None,
) -> WorldImportConfirmOut:
    actor = _actor(db, authorization)
    body = payload or WorldImportConfirmRequest()
    return WorldImportConfirmService(db).confirm(
        actor,
        setting_id,
        job_id,
        item_ids=body.item_ids,
        conflict_resolutions=body.conflict_resolutions,
    )


@router.post(
    "/settings/{setting_id}/world-imports/{job_id}/cancel",
    response_model=WorldImportCancelOut,
)
def cancel_world_import(
    setting_id: UUID,
    job_id: UUID,
    db: DbSession,
    authorization: AuthorizationHeader = None,
) -> WorldImportCancelOut:
    actor = _actor(db, authorization)
    return WorldImportConfirmService(db).cancel(actor, setting_id, job_id)


@router.post(
    "/settings/{setting_id}/world-imports/{job_id}/undo",
    response_model=WorldImportUndoOut,
)
def undo_world_import(
    setting_id: UUID,
    job_id: UUID,
    db: DbSession,
    authorization: AuthorizationHeader = None,
) -> WorldImportUndoOut:
    """W-API-07: откат последнего confirm; черновик по-прежнему cancel."""
    actor = _actor(db, authorization)
    return WorldImportUndoService(db).undo(actor, setting_id, job_id)


@router.get(
    "/settings/{setting_id}/world-imports/{job_id}/draft-items",
    response_model=list[WorldImportDraftItemOut],
)
def list_world_import_draft_items(
    setting_id: UUID,
    job_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[WorldImportDraftItemOut]:
    return WorldImportService(db).list_draft_items(current_user, setting_id, job_id)


@router.get(
    "/settings/{setting_id}/world-imports/{job_id}/draft-links",
    response_model=list[WorldImportDraftLinkOut],
)
def list_world_import_draft_links(
    setting_id: UUID,
    job_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[WorldImportDraftLinkOut]:
    """Предложенные рёбра черновика (не канон SettingPageLink)."""
    return WorldImportService(db).list_draft_links(current_user, setting_id, job_id)


@router.post(
    "/settings/{setting_id}/world-imports/{job_id}/draft-items/{item_id}/reject",
    response_model=WorldImportDraftItemOut,
)
def reject_world_import_draft_item(
    setting_id: UUID,
    job_id: UUID,
    item_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> WorldImportDraftItemOut:
    """W-API-11: отклонить предложение (обычно ИИ) без записи в канон."""
    return WorldImportService(db).reject_draft_item(
        current_user, setting_id, job_id, item_id
    )


@router.get(
    "/settings/{setting_id}/world-imports/{job_id}/confirmations",
    response_model=list[WorldImportConfirmationOut],
)
def list_world_import_confirmations(
    setting_id: UUID,
    job_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[WorldImportConfirmationOut]:
    """Журнал «кто подтвердил» для экрана сверки."""
    return WorldImportService(db).list_confirmations(current_user, setting_id, job_id)


@router.post(
    "/settings/{setting_id}/world-imports/{job_id}/vault",
    response_model=WorldVaultParseResultOut,
)
def parse_world_import_vault_json(
    setting_id: UUID,
    job_id: UUID,
    payload: WorldVaultParseRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> WorldVaultParseResultOut:
    """Разбор набора {path, content} в строки черновика (без записи в вики)."""
    return WorldImportService(db).ingest_vault_files(
        current_user, setting_id, job_id, payload
    )


@router.post(
    "/settings/{setting_id}/world-imports/{job_id}/vault-zip",
    response_model=WorldVaultParseResultOut,
)
async def parse_world_import_vault_zip(
    setting_id: UUID,
    job_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(...),
    rules_edition: str | None = Form(default=None),
) -> WorldVaultParseResultOut:
    """Разбор zip-хранилища в строки черновика сверки."""
    data = await file.read()
    if len(data) > MAX_ZIP_BYTES:
        raise AppError(
            "Архив слишком большой",
            code="file_too_large",
            status_code=400,
            data={"hint": f"Zip не больше {MAX_ZIP_BYTES} байт"},
        )
    return WorldImportService(db).ingest_vault_zip(
        current_user,
        setting_id,
        job_id,
        data,
        rules_edition=rules_edition,
    )


@router.get("/lobbies/{lobby_id}/world-import-attachments/{attachment_id}/file")
def download_world_import_attachment(
    lobby_id: UUID,
    attachment_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> FileResponse:
    """Отдаёт PDF-вложение импорта (не через LobbyMedia/WebP)."""
    from app.repositories.lobby import LobbyRepository
    from app.services import lobby_roles as roles

    lobby = LobbyRepository(db).get(lobby_id)
    if lobby is None:
        raise NotFoundError("Лобби не найдено", code="lobby_not_found")
    roles.require_view(db, lobby, current_user)
    row = db.get(WorldImportAttachment, attachment_id)
    if row is None or row.lobby_id != lobby_id:
        raise NotFoundError("Вложение не найдено", code="attachment_not_found")
    path = Path(settings.uploads_dir) / row.storage_relpath
    if not path.is_file():
        raise NotFoundError("Файл вложения отсутствует на диске", code="attachment_file_missing")
    return FileResponse(
        path,
        media_type=row.content_type or "application/pdf",
        filename=row.original_filename or "sheet.pdf",
    )
