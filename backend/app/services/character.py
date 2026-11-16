from __future__ import annotations

import copy
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ConflictError
from app.models.character import Character, RulesEdition
from app.models.user import User
from app.repositories.character import CharacterRepository
from app.repositories.lobby import LobbyRepository
from app.schemas.character import (
    ApplyEffectsRequest,
    ApplyEffectsResponse,
    CharacterCreateRequest,
    CharacterDetail,
    CharacterSummary,
    CharacterUpdateRequest,
    ClearConcentrationEffectsResponse,
)
from app.services.sheet_effects import (
    append_effect,
    broadcast_sheet_effects_changed,
    clear_caster_concentration,
    clear_linked_effects_for_caster,
    concentration_from_sheet,
)
from app.services.avatar import (
    delete_character_avatar_file,
    is_uploaded_character_avatar_url,
    save_character_avatar_image,
)
from app.services.artifact_apply import hydrate_legacy_artifact_sheet
from app.services.character_sheet import empty_character_sheet, extract_summary_from_sheet


def to_summary(character: Character) -> CharacterSummary:
    data = CharacterSummary.model_validate(character).model_dump()
    sheet = character.sheet if isinstance(character.sheet, dict) else {}
    from_sheet = extract_summary_from_sheet(sheet)
    # LOBBY-FIX E: не отдавать «без класса» / HP —, если на листе есть данные
    if not data.get("class_name") and from_sheet.get("class_name"):
        data["class_name"] = from_sheet["class_name"]
    if not data.get("race_name") and from_sheet.get("race_name"):
        data["race_name"] = from_sheet["race_name"]
    if (data.get("hp_max") is None or data.get("hp_current") is None) and from_sheet.get(
        "hp_max"
    ) is not None:
        if data.get("hp_max") is None:
            data["hp_max"] = from_sheet.get("hp_max")
        if data.get("hp_current") is None:
            data["hp_current"] = from_sheet.get("hp_current", from_sheet.get("hp_max"))
    if (not data.get("level") or data.get("level") == 1) and from_sheet.get("level"):
        # не занижать: если колонка 1, а на листе сумма классов выше — взять лист
        sheet_level = from_sheet["level"]
        if isinstance(sheet_level, int) and sheet_level > int(data.get("level") or 1):
            data["level"] = sheet_level
        elif not data.get("class_name") and isinstance(sheet_level, int):
            data["level"] = sheet_level
    return CharacterSummary.model_validate(data)


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
    lobby_id = None
    campaign_rules = None
    open_session_id = None
    if db is not None:
        from app.models.lobby import Lobby as LobbyModel
        from app.repositories.lobby import LobbyRepository
        from app.services.campaign_rules import migrate_inspiration_from_visibility

        repo = LobbyRepository(db)
        membership = repo.get_membership_by_character(character.id)
        if membership is not None:
            lobby = db.get(LobbyModel, membership.lobby_id)
            if lobby is not None:
                lobby_id = lobby.id
                campaign_rules = migrate_inspiration_from_visibility(
                    getattr(lobby, "campaign_rules", None) or {},
                    lobby.visibility_profile or {},
                )
        open_ids = repo.list_open_session_ids_for_character(character.id)
        if open_ids:
            open_session_id = open_ids[0]
    updates: dict = {
        "can_edit": can_edit,
        "lobby_id": lobby_id,
        "campaign_rules": campaign_rules,
        "open_session_id": open_session_id,
    }
    if sheet is not data.sheet:
        updates["sheet"] = sheet
    return data.model_copy(update=updates)


class CharacterService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.characters = CharacterRepository(db)
        self.lobbies = LobbyRepository(db)

    def list_mine(self, user: User) -> list[CharacterSummary]:
        return [to_summary(item) for item in self.characters.list_for_user(user.id)]

    def create(self, user: User, payload: CharacterCreateRequest) -> CharacterDetail:
        # P24-01: флаг RULES_EDITION_2024_OPEN (по умолчанию выкл.). Открытие — P24-M06.
        from app.core.config import settings

        edition = payload.rules_edition
        if edition == RulesEdition.edition_2024 or edition == "2024":
            if not settings.rules_edition_2024_open:
                raise AppError(
                    "Редакция 2024 ещё не открыта",
                    code="rules_edition_closed",
                    status_code=400,
                )
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

    async def update(
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
        # P24-01: редакция фиксируется при создании; PATCH её не меняет.
        if payload.rules_edition is not None:
            current = character.rules_edition
            incoming = payload.rules_edition
            current_val = current.value if isinstance(current, RulesEdition) else str(current)
            incoming_val = incoming.value if isinstance(incoming, RulesEdition) else str(incoming)
            if incoming_val != current_val:
                raise AppError(
                    "Редакцию персонажа нельзя сменить после создания",
                    code="rules_edition_locked",
                    status_code=400,
                )
        if payload.is_draft is not None:
            character.is_draft = payload.is_draft

        if payload.sheet is not None:
            # L-21: владелец не может снять отметки мастера / блок неожиданности
            # через updateCharacter — мержим turn_economy.
            from app.services import session_turn_economy as stec
            from app.dnd.weapon_mastery import (
                WeaponMasteryValidationError,
                strip_weapon_mastery_from_sheet_for_2014,
                validate_weapon_mastery_update,
                weapon_mastery_to_sheet,
            )

            prev_sheet = character.sheet if isinstance(character.sheet, dict) else {}
            prev_combat = (
                prev_sheet.get("combat")
                if isinstance(prev_sheet.get("combat"), dict)
                else {}
            )
            next_sheet = (
                dict(payload.sheet) if isinstance(payload.sheet, dict) else payload.sheet
            )
            if isinstance(next_sheet, dict):
                next_combat = (
                    dict(next_sheet.get("combat") or {})
                    if isinstance(next_sheet.get("combat"), dict)
                    or next_sheet.get("combat") is None
                    else {}
                )
                if "turn_economy" in next_combat or isinstance(
                    prev_combat.get("turn_economy"), dict
                ):
                    next_combat["turn_economy"] = stec.merge_owner_turn_economy_write(
                        prev_combat.get("turn_economy"),
                        next_combat.get("turn_economy"),
                    )
                    next_sheet["combat"] = next_combat

                # P24-M01: weapon mastery picks — 2024 only; validated server-side.
                edition_val = character.rules_edition
                edition_s = (
                    edition_val.value
                    if isinstance(edition_val, RulesEdition)
                    else str(edition_val or "2014")
                )
                if edition_s != "2024":
                    next_sheet = strip_weapon_mastery_from_sheet_for_2014(next_sheet)
                elif "weapon_mastery" in next_sheet or prev_sheet.get("weapon_mastery"):
                    prof = (
                        next_sheet.get("proficiency")
                        if isinstance(next_sheet.get("proficiency"), dict)
                        else {}
                    )
                    weapons_prof = (
                        prof.get("weapons") if isinstance(prof.get("weapons"), dict) else {}
                    )
                    try:
                        wm_state = validate_weapon_mastery_update(
                            rules_edition=edition_s,
                            previous=prev_sheet.get("weapon_mastery"),
                            incoming=next_sheet.get("weapon_mastery"),
                            sheet=next_sheet,
                            has_simple_prof=bool(weapons_prof.get("simple")),
                            has_martial_prof=bool(weapons_prof.get("martial")),
                        )
                    except WeaponMasteryValidationError as exc:
                        raise AppError(
                            str(exc),
                            code=exc.code,
                            status_code=400,
                        ) from exc
                    if wm_state is None or (
                        not wm_state.known
                        and not wm_state.source_class
                        and not wm_state.swap_available
                    ):
                        next_sheet.pop("weapon_mastery", None)
                    else:
                        next_sheet["weapon_mastery"] = weapon_mastery_to_sheet(wm_state)

                character.sheet = next_sheet
            else:
                character.sheet = payload.sheet
            summary = extract_summary_from_sheet(
                character.sheet if isinstance(character.sheet, dict) else payload.sheet
            )
            # Only sync column HP when combat explicitly carries a number.
            # Print-settings sheet patches often omit combat.hp_* — must not null columns.
            if payload.hp_current is None and summary.get("hp_current") is not None:
                character.hp_current = summary["hp_current"]
            if payload.hp_max is None and summary.get("hp_max") is not None:
                character.hp_max = summary["hp_max"]

        character.sheet_version += 1
        # L-16: пересчёт пометки «не по правилам старта» если герой в лобби.
        self._recompute_start_rules_mark(character)
        self.db.commit()
        self.db.refresh(character)
        # L08: стол подтягивает хиты/имя/КД через session_changed → pullSession.
        await self._broadcast_seated_sessions_changed(character.id)
        return to_detail(character, db=self.db)

    def _recompute_start_rules_mark(self, character: Character) -> None:
        from app.services.start_rules import start_rules_ok

        membership = self.lobbies.get_membership_by_character(character.id)
        if membership is None:
            return
        if getattr(membership, "start_rules_waived", False):
            membership.start_rules_ok = True
            return
        lobby = self.lobbies.get(membership.lobby_id)
        if lobby is None:
            return
        ok = start_rules_ok(
            character=character,
            campaign_rules=getattr(lobby, "campaign_rules", None),
        )
        membership.start_rules_ok = ok
        if ok:
            membership.start_rules_waived = False

    async def _broadcast_seated_sessions_changed(self, character_id: UUID) -> None:
        from app.realtime.hub import session_hub

        session_ids = self.lobbies.list_open_session_ids_for_character(character_id)
        for session_id in session_ids:
            await session_hub.broadcast(
                session_id,
                {"type": "session_changed", "session_id": str(session_id)},
            )

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

    def _can_target_effect(
        self,
        *,
        user: User,
        source: Character,
        target: Character,
    ) -> bool:
        """Р25: own character or same lobby as source."""
        if target.user_id == user.id:
            return True
        return self.lobbies.share_lobby_ids(source.id, target.id)

    async def apply_effects(
        self,
        user: User,
        source_character_id: UUID,
        payload: ApplyEffectsRequest,
    ) -> ApplyEffectsResponse:
        source = self.characters.get_for_user(source_character_id, user.id)
        if source is None:
            raise AppError("Персонаж не найден", code="character_not_found", status_code=404)

        linked = (
            bool(payload.linked_concentration)
            if payload.linked_concentration is not None
            else bool(payload.effect.linked_concentration)
        )
        if linked and not concentration_from_sheet(source.sheet):
            linked = False

        effect_body = payload.effect.model_dump(exclude_none=True)
        effect_body["source_character_id"] = str(source.id)
        effect_body["source_name"] = source.name
        effect_body["linked_concentration"] = linked

        applied = 0
        touched: list[UUID] = []
        seen: set[UUID] = set()
        for target_id in payload.target_character_ids:
            if target_id in seen:
                continue
            seen.add(target_id)
            target = self.characters.get_active(target_id)
            if target is None:
                raise AppError(
                    "Цель не найдена",
                    code="character_not_found",
                    status_code=404,
                )
            if not self._can_target_effect(user=user, source=source, target=target):
                raise AppError(
                    "Нельзя наложить эффект на этого персонажа",
                    code="effect_target_forbidden",
                    status_code=403,
                )
            append_effect(
                target,
                name=payload.effect.name,
                source_character_id=str(source.id),
                source_name=source.name,
                linked_concentration=linked,
                effect=effect_body,
            )
            applied += 1
            touched.append(target_id)

        self.db.commit()
        await broadcast_sheet_effects_changed(self.lobbies, touched)
        return ApplyEffectsResponse(applied=applied, character_ids=touched)

    async def clear_concentration_effects(
        self,
        user: User,
        character_id: UUID,
        *,
        clear_concentration: bool = True,
    ) -> ClearConcentrationEffectsResponse:
        character = self.characters.get_for_user(character_id, user.id)
        if character is None:
            raise AppError("Персонаж не найден", code="character_not_found", status_code=404)
        if clear_concentration:
            removed = clear_caster_concentration(character, self.lobbies)
        else:
            removed = clear_linked_effects_for_caster(self.lobbies, character_id)
        self.db.commit()
        await broadcast_sheet_effects_changed(self.lobbies, [character_id])
        return ClearConcentrationEffectsResponse(removed=removed)
