"""W-API-01/02/03: эндпоинты токенов, заданий, разбора и связей черновика."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, File, Form, Header, UploadFile

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import AppError
from app.schemas.world_import import (
    WorldApiTokenCreated,
    WorldApiTokenCreateRequest,
    WorldApiTokenOut,
    WorldImportCreateRequest,
    WorldImportDraftItemOut,
    WorldImportDraftLinkOut,
    WorldImportJobOut,
    WorldVaultParseRequest,
    WorldVaultParseResultOut,
)
from app.services.world_api_tokens import WorldApiTokenService
from app.services.world_import import WorldImportService
from app.services.world_vault_parse import MAX_ZIP_BYTES

router = APIRouter(tags=["world-imports"])


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


@router.post(
    "/settings/{setting_id}/world-imports",
    response_model=WorldImportJobOut,
    status_code=201,
)
def create_world_import(
    setting_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    payload: WorldImportCreateRequest | None = None,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> WorldImportJobOut:
    return WorldImportService(db).create_job(
        current_user,
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
    current_user: CurrentUser,
    db: DbSession,
) -> list[WorldImportJobOut]:
    return WorldImportService(db).list_jobs(current_user, setting_id)


@router.get(
    "/settings/{setting_id}/world-imports/{job_id}",
    response_model=WorldImportJobOut,
)
def get_world_import(
    setting_id: UUID,
    job_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> WorldImportJobOut:
    return WorldImportService(db).get_job(current_user, setting_id, job_id)


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
