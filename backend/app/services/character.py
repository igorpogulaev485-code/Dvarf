from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ConflictError
from app.models.character import Character
from app.models.user import User
from app.repositories.character import CharacterRepository
from app.schemas.character import (
    CharacterCreateRequest,
    CharacterDetail,
    CharacterSummary,
    CharacterUpdateRequest,
)
from app.services.character_sheet import empty_character_sheet, extract_summary_from_sheet


def to_summary(character: Character) -> CharacterSummary:
    return CharacterSummary.model_validate(character)


def to_detail(character: Character) -> CharacterDetail:
    return CharacterDetail.model_validate(character)


class CharacterService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.characters = CharacterRepository(db)

    def list_mine(self, user: User) -> list[CharacterSummary]:
        return [to_summary(item) for item in self.characters.list_for_user(user.id)]

    def create(self, user: User, payload: CharacterCreateRequest) -> CharacterDetail:
        name = (payload.name or "Новый персонаж").strip() or "Новый персонаж"
        character = self.characters.create(
            user_id=user.id,
            rules_edition=payload.rules_edition,
            name=name,
            sheet=empty_character_sheet(),
        )
        self.db.commit()
        self.db.refresh(character)
        return to_detail(character)

    def get_mine(self, user: User, character_id: UUID) -> CharacterDetail:
        character = self.characters.get_for_user(character_id, user.id)
        if character is None:
            raise AppError("Персонаж не найден", code="character_not_found", status_code=404)
        return to_detail(character)

    def update(
        self,
        user: User,
        character_id: UUID,
        payload: CharacterUpdateRequest,
    ) -> CharacterDetail:
        character = self.characters.get_for_user(character_id, user.id)
        if character is None:
            raise AppError("Персонаж не найден", code="character_not_found", status_code=404)

        if payload.sheet_version != character.sheet_version:
            raise ConflictError(
                "Персонаж был изменён в другой вкладке. Обновите страницу.",
                code="sheet_version_conflict",
            )

        if payload.name is not None:
            character.name = payload.name.strip() or "Новый персонаж"
        if payload.avatar_url is not None:
            character.avatar_url = payload.avatar_url
        if payload.level is not None:
            character.level = payload.level
        if payload.class_name is not None:
            character.class_name = payload.class_name
        if payload.race_name is not None:
            character.race_name = payload.race_name
        if payload.hp_current is not None:
            character.hp_current = payload.hp_current
        if payload.hp_max is not None:
            character.hp_max = payload.hp_max
        if payload.rules_edition is not None:
            character.rules_edition = payload.rules_edition

        if payload.sheet is not None:
            character.sheet = payload.sheet
            summary = extract_summary_from_sheet(payload.sheet)
            if payload.hp_current is None and "hp_current" in summary:
                character.hp_current = summary["hp_current"]
            if payload.hp_max is None and "hp_max" in summary:
                character.hp_max = summary["hp_max"]

        character.sheet_version += 1
        self.db.commit()
        self.db.refresh(character)
        return to_detail(character)

    def delete_mine(self, user: User, character_id: UUID) -> None:
        character = self.characters.get_for_user(character_id, user.id)
        if character is None:
            raise AppError("Персонаж не найден", code="character_not_found", status_code=404)
        self.characters.soft_delete(character)
        self.db.commit()
