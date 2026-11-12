from __future__ import annotations

import copy
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ConflictError
from app.models.character import Character
from app.models.user import User
from app.repositories.character import CharacterRepository
from app.repositories.lobby import LobbyRepository
from app.schemas.character import (
    CharacterCreateRequest,
    CharacterDetail,
    CharacterSummary,
    CharacterUpdateRequest,
)
from app.services.avatar import (
    delete_character_avatar_file,
    is_uploaded_character_avatar_url,
    save_character_avatar_image,
)
from app.services.artifact_apply import hydrate_legacy_artifact_sheet
from app.services.character_sheet import empty_character_sheet, extract_summary_from_sheet


def to_summary(character: Character) -> CharacterSummary:
    return CharacterSummary.model_validate(character)


def _legacy_artifact_ids(sheet: dict) -> list[str]:
    inventory = sheet.get("inventory")
    if not isinstance(inventory, dict):
        return []
    items = inventory.get("items")
    if not isinstance(items, list):
        return []
    ids: list[str] = []
    for item in items:
        if not isinstance(item, dict) or item.get("artifact_live") is True:
            continue
        snap = item.get("artifact_snapshot") if isinstance(item.get("artifact_snapshot"), dict) else {}
        abilities = snap.get("abilities") if isinstance(snap, dict) else None
        if isinstance(abilities, list) and abilities:
            continue
        sid = str(item.get("setting_artifact_id") or snap.get("artifact_id") or "")
        if sid:
            ids.append(sid)
    return ids


def _needs_artifact_hydrate(sheet: dict) -> bool:
    inventory = sheet.get("inventory")
    if not isinstance(inventory, dict):
        return False
    items = inventory.get("items")
    if not isinstance(items, list):
        return False
    for item in items:
        if not isinstance(item, dict) or item.get("artifact_live") is True:
            continue
        if item.get("artifact_snapshot") or item.get("setting_artifact_id"):
            return True
        if item.get("item_kind") == "magic" and isinstance(item.get("magic_mods"), dict):
            return True
    return False


def sheet_for_client(sheet: dict | None, db: Session | None) -> dict | None:
    """Live artifact effects for sheets granted before item.effects existed."""
    if not isinstance(sheet, dict) or db is None or not _needs_artifact_hydrate(sheet):
        return sheet
    cloned = copy.deepcopy(sheet)
    artifacts: dict = {}
    raw_ids = _legacy_artifact_ids(cloned)
    if raw_ids:
        from app.models.setting_artifact import SettingArtifact

        uuids = []
        for raw in raw_ids:
            try:
                uuids.append(UUID(str(raw)))
            except ValueError:
                continue
        if uuids:
            rows = db.query(SettingArtifact).filter(SettingArtifact.id.in_(uuids)).all()
            artifacts = {str(row.id): row for row in rows}
    return hydrate_legacy_artifact_sheet(cloned, artifacts)


def to_detail(
    character: Character,
    *,
    can_edit: bool = True,
    db: Session | None = None,
) -> CharacterDetail:
    data = CharacterDetail.model_validate(character)
    sheet = sheet_for_client(data.sheet if isinstance(data.sheet, dict) else None, db)
    if sheet is data.sheet:
        return data.model_copy(update={"can_edit": can_edit})
    return data.model_copy(update={"can_edit": can_edit, "sheet": sheet})


class CharacterService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.characters = CharacterRepository(db)
        self.lobbies = LobbyRepository(db)

    def list_mine(self, user: User) -> list[CharacterSummary]:
        return [to_summary(item) for item in self.characters.list_for_user(user.id)]

    def create(self, user: User, payload: CharacterCreateRequest) -> CharacterDetail:
        name = (payload.name or "Новый персонаж").strip() or "Новый персонаж"
        character = self.characters.create(
            user_id=user.id,
            rules_edition=payload.rules_edition,
            name=name,
            sheet=empty_character_sheet(),
            is_draft=bool(getattr(payload, 'is_draft', False)),
        )
        self.db.commit()
        self.db.refresh(character)
        return to_detail(character, db=self.db)

    def get_mine(self, user: User, character_id: UUID) -> CharacterDetail:
        """Владелец — полный доступ; мастер лобби с этим персонажем — только просмотр."""
        character = self.characters.get_for_user(character_id, user.id)
        if character is not None:
            return to_detail(character, can_edit=True, db=self.db)

        character = self.characters.get_active(character_id)
        if character is None:
            raise AppError("Персонаж не найден", code="character_not_found", status_code=404)

        if self.lobbies.is_owner_of_character_lobby(
            owner_id=user.id,
            character_id=character_id,
        ):
            return to_detail(character, can_edit=False, db=self.db)

        raise AppError("Персонаж не найден", code="character_not_found", status_code=404)

    def update(
        self,
        user: User,
        character_id: UUID,
        payload: CharacterUpdateRequest,
    ) -> CharacterDetail:
        character = self.characters.get_for_user(character_id, user.id)
        if character is None:
            active = self.characters.get_active(character_id)
            if active is not None and self.lobbies.is_owner_of_character_lobby(
                owner_id=user.id,
                character_id=character_id,
            ):
                raise AppError(
                    "Мастер может только смотреть лист, не редактировать",
                    code="character_edit_forbidden",
                    status_code=403,
                )
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
        if payload.is_draft is not None:
            character.is_draft = payload.is_draft

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
        return to_detail(character, db=self.db)

    def upload_avatar(
        self,
        user: User,
        character_id: UUID,
        data: bytes,
        content_type: str | None,
    ) -> CharacterDetail:
        character = self.characters.get_for_user(character_id, user.id)
        if character is None:
            raise AppError("Персонаж не найден", code="character_not_found", status_code=404)
        character.avatar_url = save_character_avatar_image(
            character_id=character.id,
            data=data,
            content_type=content_type,
        )
        self.db.commit()
        self.db.refresh(character)
        return to_detail(character, db=self.db)

    def delete_avatar(self, user: User, character_id: UUID) -> CharacterDetail:
        character = self.characters.get_for_user(character_id, user.id)
        if character is None:
            raise AppError("Персонаж не найден", code="character_not_found", status_code=404)
        if is_uploaded_character_avatar_url(character.avatar_url):
            delete_character_avatar_file(character.id)
        character.avatar_url = None
        self.db.commit()
        self.db.refresh(character)
        return to_detail(character, db=self.db)

    def delete_mine(self, user: User, character_id: UUID) -> None:
        character = self.characters.get_for_user(character_id, user.id)
        if character is None:
            raise AppError("Персонаж не найден", code="character_not_found", status_code=404)
        if is_uploaded_character_avatar_url(character.avatar_url):
            delete_character_avatar_file(character.id)
        self.characters.soft_delete(character)
        self.db.commit()
