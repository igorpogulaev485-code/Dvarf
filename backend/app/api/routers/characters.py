from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Response

from app.api.deps import CurrentUser, DbSession
from app.schemas.character import (
    CharacterCreateRequest,
    CharacterDetail,
    CharacterSummary,
    CharacterUpdateRequest,
)
from app.services.character import CharacterService

router = APIRouter(prefix="/characters", tags=["characters"])


@router.get("", response_model=list[CharacterSummary])
def list_characters(current_user: CurrentUser, db: DbSession) -> list[CharacterSummary]:
    return CharacterService(db).list_mine(current_user)


@router.post("", response_model=CharacterDetail, status_code=201)
def create_character(
    payload: CharacterCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> CharacterDetail:
    return CharacterService(db).create(current_user, payload)


@router.get("/{character_id}", response_model=CharacterDetail)
def get_character(
    character_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> CharacterDetail:
    return CharacterService(db).get_mine(current_user, character_id)


@router.patch("/{character_id}", response_model=CharacterDetail)
def update_character(
    character_id: UUID,
    payload: CharacterUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> CharacterDetail:
    return CharacterService(db).update(current_user, character_id, payload)


@router.delete("/{character_id}", status_code=204)
def delete_character(
    character_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    CharacterService(db).delete_mine(current_user, character_id)
    return Response(status_code=204)
