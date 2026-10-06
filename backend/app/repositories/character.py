from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.character import Character, RulesEdition


class CharacterRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_user(self, user_id: UUID) -> list[Character]:
        return list(
            self.db.scalars(
                select(Character)
                .where(
                    Character.user_id == user_id,
                    Character.deleted_at.is_(None),
                )
                .order_by(Character.updated_at.desc())
            ).all()
        )

    def get_for_user(self, character_id: UUID, user_id: UUID) -> Character | None:
        return self.db.scalar(
            select(Character).where(
                Character.id == character_id,
                Character.user_id == user_id,
                Character.deleted_at.is_(None),
            )
        )

    def create(
        self,
        *,
        user_id: UUID,
        rules_edition: RulesEdition,
        name: str,
        sheet: dict,
    ) -> Character:
        character = Character(
            user_id=user_id,
            name=name,
            rules_edition=rules_edition,
            sheet=sheet,
            level=1,
        )
        self.db.add(character)
        self.db.flush()
        return character

    def soft_delete(self, character: Character) -> None:
        character.deleted_at = datetime.now(UTC)
        self.db.flush()
