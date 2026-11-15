"""W-API-01: скелет заданий импорта мира (без разбора файлов)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError
from app.models.lobby import Lobby, Setting
from app.models.user import User
from app.models.world_import import (
    SUPPORTED_RULES_EDITION,
    WORLD_IMPORT_SOURCE_KINDS,
    WorldImportJob,
)
from app.repositories.lobby import LobbyRepository
from app.schemas.world_import import WorldImportCreateRequest, WorldImportJobOut
from app.services import lobby_roles as roles

RULES_EDITION_UNSUPPORTED_MESSAGE = (
    "В этой версии импорта мира доступна только редакция 2014"
)


def normalize_rules_edition(value: str | None) -> str:
    """Нет поля или 2014 — ок; иначе понятная ошибка без тихой подмены."""
    if value is None or str(value).strip() == "":
        return SUPPORTED_RULES_EDITION
    edition = str(value).strip()
    if edition == SUPPORTED_RULES_EDITION:
        return SUPPORTED_RULES_EDITION
    raise AppError(
        RULES_EDITION_UNSUPPORTED_MESSAGE,
        code="rules_edition_unsupported",
        status_code=400,
        data={"field": "rules_edition", "hint": "Укажите rules_edition=2014 или опустите поле"},
    )


class WorldImportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.lobbies = LobbyRepository(db)

    def _require_lobby(self, lobby_id: UUID) -> Lobby:
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        return lobby

    def _require_setting(self, setting_id: UUID) -> Setting:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        return setting

    def _require_master_for_setting(self, user: User, setting: Setting) -> Lobby:
        lobby = self._require_lobby(setting.lobby_id)
        roles.require_can_edit_wiki(self.db, lobby, user)
        return lobby

    def create_job(
        self,
        user: User,
        setting_id: UUID,
        payload: WorldImportCreateRequest | None = None,
        *,
        idempotency_key: str | None = None,
    ) -> WorldImportJobOut:
        setting = self._require_setting(setting_id)
        lobby = self._require_master_for_setting(user, setting)
        body = payload or WorldImportCreateRequest()

        # Сначала проверка редакции — до любой записи в БД.
        rules_edition = normalize_rules_edition(body.rules_edition)

        source_kind = body.source_kind or "api"
        if source_kind not in WORLD_IMPORT_SOURCE_KINDS:
            raise AppError(
                "Неизвестный вид источника импорта",
                code="world_import_source_kind_bad",
                status_code=400,
                data={"field": "source_kind"},
            )

        key = (idempotency_key or "").strip() or None
        if key:
            existing = self.db.scalar(
                select(WorldImportJob)
                .where(
                    WorldImportJob.setting_id == setting.id,
                    WorldImportJob.idempotency_key == key,
                )
                .limit(1)
            )
            if existing is not None:
                return WorldImportJobOut.model_validate(existing)

        job = WorldImportJob(
            setting_id=setting.id,
            lobby_id=lobby.id,
            author_id=user.id,
            status="received",
            rules_edition=rules_edition,
            source_kind=source_kind,
            idempotency_key=key,
            source_ref=body.source_ref,
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return WorldImportJobOut.model_validate(job)

    def list_jobs(self, user: User, setting_id: UUID) -> list[WorldImportJobOut]:
        setting = self._require_setting(setting_id)
        self._require_master_for_setting(user, setting)
        rows = list(
            self.db.scalars(
                select(WorldImportJob)
                .where(WorldImportJob.setting_id == setting.id)
                .order_by(WorldImportJob.created_at.desc())
            ).all()
        )
        return [WorldImportJobOut.model_validate(r) for r in rows]

    def get_job(self, user: User, setting_id: UUID, job_id: UUID) -> WorldImportJobOut:
        setting = self._require_setting(setting_id)
        self._require_master_for_setting(user, setting)
        job = self.db.get(WorldImportJob, job_id)
        if job is None or job.setting_id != setting.id:
            raise NotFoundError("Задание импорта не найдено", code="world_import_not_found")
        return WorldImportJobOut.model_validate(job)
