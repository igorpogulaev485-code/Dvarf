from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, File, Response, UploadFile

from app.api.deps import CurrentUser, DbSession
from app.schemas.character import (
    ApplyEffectsRequest,
    ApplyEffectsResponse,
    CharacterCreateRequest,
    CharacterDetail,
    CharacterSummary,
    CharacterUpdateRequest,
    ClearConcentrationEffectsRequest,
    ClearConcentrationEffectsResponse,
)
from app.schemas.character_create_2024 import (
    CharacterCreate2024Request,
    CharacterCreate2024ValidateResponse,
    Languages2024Response,
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


@router.get("/create-2024/languages", response_model=Languages2024Response)
def list_create_2024_languages(current_user: CurrentUser) -> Languages2024Response:
    """P24-M03: language catalog for the 2024 create wizard (Common + 2 picks)."""
    from app.dnd.edition_2024_create import (
        class_special_languages_payload,
        languages_catalog_payload,
    )
    from app.dnd.edition_2024_languages import COMMON_LANGUAGE_ID, LANGUAGE_CHOICE_COUNT

    _ = current_user
    return Languages2024Response(
        common_id=COMMON_LANGUAGE_ID,
        choice_count=LANGUAGE_CHOICE_COUNT,
        languages=languages_catalog_payload(),
        class_special=class_special_languages_payload(),
    )


@router.post(
    "/create-2024/validate",
    response_model=CharacterCreate2024ValidateResponse,
)
def validate_create_character_2024(
    payload: CharacterCreate2024Request,
    current_user: CurrentUser,
    db: DbSession,
) -> CharacterCreate2024ValidateResponse:
    """Validate a full 2024 level-1 create payload without persisting."""
    _ = current_user
    return CharacterService(db).validate_create_2024(payload)


@router.post("/create-2024", response_model=CharacterDetail, status_code=201)
def create_character_2024(
    payload: CharacterCreate2024Request,
    current_user: CurrentUser,
    db: DbSession,
) -> CharacterDetail:
    """Create a finished 2024 level-1 character (preview flag or open edition)."""
    return CharacterService(db).create_2024(current_user, payload)


@router.get("/{character_id}", response_model=CharacterDetail)
def get_character(
    character_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> CharacterDetail:
    return CharacterService(db).get_mine(current_user, character_id)


@router.patch("/{character_id}", response_model=CharacterDetail)
async def update_character(
    character_id: UUID,
    payload: CharacterUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> CharacterDetail:
    return await CharacterService(db).update(current_user, character_id, payload)


@router.post("/{character_id}/avatar", response_model=CharacterDetail)
async def upload_character_avatar(
    character_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(...),
) -> CharacterDetail:
    data = await file.read()
    return CharacterService(db).upload_avatar(
        current_user,
        character_id,
        data,
        file.content_type,
    )


@router.delete("/{character_id}/avatar", response_model=CharacterDetail)
def delete_character_avatar(
    character_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> CharacterDetail:
    return CharacterService(db).delete_avatar(current_user, character_id)


@router.delete("/{character_id}", status_code=204)
def delete_character(
    character_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    CharacterService(db).delete_mine(current_user, character_id)
    return Response(status_code=204)


@router.post(
    "/{character_id}/effects/apply",
    response_model=ApplyEffectsResponse,
)
async def apply_character_effects(
    character_id: UUID,
    payload: ApplyEffectsRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ApplyEffectsResponse:
    """B-01 / Р25: наложить эффект на цели (лобби + свои персонажи)."""
    return await CharacterService(db).apply_effects(current_user, character_id, payload)


@router.post(
    "/{character_id}/effects/clear-concentration",
    response_model=ClearConcentrationEffectsResponse,
)
async def clear_character_concentration_effects(
    character_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    payload: ClearConcentrationEffectsRequest | None = None,
) -> ClearConcentrationEffectsResponse:
    """Снять связанные эффекты; по умолчанию также концентрацию на кастере."""
    body = payload or ClearConcentrationEffectsRequest()
    return await CharacterService(db).clear_concentration_effects(
        current_user,
        character_id,
        clear_concentration=body.clear_concentration,
    )
