"""W-API-01: эндпоинты токенов и заданий импорта мира (отдельный роутер)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Header

from app.api.deps import CurrentUser, DbSession
from app.schemas.world_import import (
    WorldApiTokenCreated,
    WorldApiTokenCreateRequest,
    WorldApiTokenOut,
    WorldImportCreateRequest,
    WorldImportJobOut,
)
from app.services.world_api_tokens import WorldApiTokenService
from app.services.world_import import WorldImportService

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
