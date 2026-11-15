"""W-API-01/02/03: задания импорта, разбор хранилища, ключи/алиасы/связи."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError
from app.models.lobby import Lobby, Setting
from app.models.user import User
from app.models.world_import import (
    SUPPORTED_RULES_EDITION,
    WORLD_IMPORT_SOURCE_KINDS,
    WorldImportDraftItem,
    WorldImportDraftLink,
    WorldImportJob,
    WorldSourceAlias,
    WorldSourceKey,
)
from app.repositories.lobby import LobbyRepository
from app.schemas.world_import import (
    WorldImportCreateRequest,
    WorldImportDraftItemOut,
    WorldImportDraftLinkOut,
    WorldImportJobOut,
    WorldVaultParseRequest,
    WorldVaultParseResultOut,
)
from app.services import lobby_roles as roles
from app.services.world_import_links import build_alias_and_link_graph
from app.services.world_vault_parse import (
    VaultFile,
    extract_zip_to_files,
    parse_vault_files,
)

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

    def _require_job(self, setting: Setting, job_id: UUID) -> WorldImportJob:
        job = self.db.get(WorldImportJob, job_id)
        if job is None or job.setting_id != setting.id:
            raise NotFoundError("Задание импорта не найдено", code="world_import_not_found")
        return job

    def list_draft_items(
        self, user: User, setting_id: UUID, job_id: UUID
    ) -> list[WorldImportDraftItemOut]:
        setting = self._require_setting(setting_id)
        self._require_master_for_setting(user, setting)
        job = self._require_job(setting, job_id)
        rows = list(
            self.db.scalars(
                select(WorldImportDraftItem)
                .where(WorldImportDraftItem.job_id == job.id)
                .order_by(WorldImportDraftItem.created_at.asc())
            ).all()
        )
        return [WorldImportDraftItemOut.model_validate(r) for r in rows]

    def list_draft_links(
        self, user: User, setting_id: UUID, job_id: UUID
    ) -> list[WorldImportDraftLinkOut]:
        setting = self._require_setting(setting_id)
        self._require_master_for_setting(user, setting)
        job = self._require_job(setting, job_id)
        rows = list(
            self.db.scalars(
                select(WorldImportDraftLink)
                .where(WorldImportDraftLink.job_id == job.id)
                .order_by(WorldImportDraftLink.created_at.asc())
            ).all()
        )
        return [WorldImportDraftLinkOut.model_validate(r) for r in rows]

    def _upsert_source_key(
        self, setting_id: UUID, *, source_path: str, source_slug: str | None
    ) -> WorldSourceKey:
        """Регистрирует/обновляет ключ. Ярлык стабилен: переезд файла при том же slug — update.

        В page_id / artifact_id / character_id не пишет (confirm — W-API-05).
        """
        existing = self.db.scalar(
            select(WorldSourceKey)
            .where(
                WorldSourceKey.setting_id == setting_id,
                WorldSourceKey.source_path == source_path,
            )
            .limit(1)
        )
        if existing is not None:
            if source_slug and existing.source_slug != source_slug:
                conflict = self.db.scalar(
                    select(WorldSourceKey)
                    .where(
                        WorldSourceKey.setting_id == setting_id,
                        WorldSourceKey.source_slug == source_slug,
                        WorldSourceKey.id != existing.id,
                    )
                    .limit(1)
                )
                if conflict is None:
                    existing.source_slug = source_slug
            return existing

        # Переезд файла: тот же ярлык, другой путь → обновляем путь, не плодим ключ.
        if source_slug:
            by_slug = self.db.scalar(
                select(WorldSourceKey)
                .where(
                    WorldSourceKey.setting_id == setting_id,
                    WorldSourceKey.source_slug == source_slug,
                )
                .limit(1)
            )
            if by_slug is not None:
                path_taken = self.db.scalar(
                    select(WorldSourceKey)
                    .where(
                        WorldSourceKey.setting_id == setting_id,
                        WorldSourceKey.source_path == source_path,
                        WorldSourceKey.id != by_slug.id,
                    )
                    .limit(1)
                )
                if path_taken is None:
                    by_slug.source_path = source_path
                return by_slug

        row = WorldSourceKey(
            setting_id=setting_id,
            source_path=source_path,
            source_slug=source_slug,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def _upsert_aliases(
        self,
        setting_id: UUID,
        source_key_row: WorldSourceKey,
        alias_pairs: list[tuple[str, str]],
    ) -> list[str]:
        """Пишет алиасы; первый занявший alias_norm в сеттинге побеждает."""
        stored: list[str] = []
        for display, norm in alias_pairs:
            if not norm:
                continue
            existing = self.db.scalar(
                select(WorldSourceAlias)
                .where(
                    WorldSourceAlias.setting_id == setting_id,
                    WorldSourceAlias.alias_norm == norm,
                )
                .limit(1)
            )
            if existing is not None:
                if existing.source_key_id == source_key_row.id:
                    stored.append(existing.alias)
                continue
            self.db.add(
                WorldSourceAlias(
                    setting_id=setting_id,
                    source_key_id=source_key_row.id,
                    alias=display[:200],
                    alias_norm=norm[:200],
                )
            )
            stored.append(display[:200])
        return stored

    def _replace_draft_links(
        self, job: WorldImportJob, proposals: list
    ) -> list[WorldImportDraftLink]:
        """Повторный разбор обновляет рёбра черновика, не трогая канон вики."""
        self.db.execute(
            delete(WorldImportDraftLink).where(WorldImportDraftLink.job_id == job.id)
        )
        rows: list[WorldImportDraftLink] = []
        seen: set[tuple] = set()
        for prop in proposals:
            edge = (
                prop.from_source_key,
                prop.to_source_key,
                prop.kind,
                prop.label or "",
                prop.confidence,
            )
            if edge in seen:
                continue
            seen.add(edge)
            row = WorldImportDraftLink(
                job_id=job.id,
                from_source_key=prop.from_source_key,
                to_source_key=prop.to_source_key,
                to_alias=(prop.to_alias[:200] if prop.to_alias else None),
                kind=prop.kind,
                label=(prop.label or "")[:120],
                confidence=prop.confidence,
                status="proposed",
            )
            self.db.add(row)
            rows.append(row)
        return rows

    def _apply_parsed_items(
        self,
        job: WorldImportJob,
        parsed_items: list,
        *,
        skipped: list[dict[str, str]],
    ) -> WorldVaultParseResultOut:
        existing_rows = list(
            self.db.scalars(
                select(WorldImportDraftItem).where(WorldImportDraftItem.job_id == job.id)
            ).all()
        )
        by_key = {row.source_key: row for row in existing_rows}
        created = 0
        updated = 0
        out_rows: list[WorldImportDraftItem] = []

        alias_by_key, link_proposals = build_alias_and_link_graph(parsed_items)

        for parsed in parsed_items:
            aliases = [display for display, _norm in alias_by_key[parsed.source_key].norms]
            proposal = dict(parsed.proposal)
            proposal["aliases"] = aliases

            row = by_key.get(parsed.source_key)
            if row is None:
                row = WorldImportDraftItem(
                    job_id=job.id,
                    item_type=parsed.item_type,
                    source_key=parsed.source_key,
                    status="proposed",
                    proposal=proposal,
                )
                self.db.add(row)
                by_key[parsed.source_key] = row
                created += 1
            else:
                row.item_type = parsed.item_type
                row.proposal = proposal
                # Повторный разбор обновляет черновик, не трогая уже принятые/отклонённые
                # статусы сверки, если мастер уже что-то отметил — кроме «proposed».
                if row.status in {"proposed", "conflict", "deferred"}:
                    row.status = "proposed"
                updated += 1
            out_rows.append(row)
            source_key_row = self._upsert_source_key(
                job.setting_id,
                source_path=parsed.source_path,
                source_slug=parsed.source_slug,
            )
            self._upsert_aliases(
                job.setting_id,
                source_key_row,
                alias_by_key[parsed.source_key].norms,
            )

        link_rows = self._replace_draft_links(job, link_proposals)

        job.status = "ready_for_review"
        self.db.commit()
        for row in out_rows:
            self.db.refresh(row)
        for link in link_rows:
            self.db.refresh(link)
        self.db.refresh(job)

        return WorldVaultParseResultOut(
            job=WorldImportJobOut.model_validate(job),
            items=[WorldImportDraftItemOut.model_validate(r) for r in out_rows],
            skipped=skipped,
            created_count=created,
            updated_count=updated,
            links=[WorldImportDraftLinkOut.model_validate(r) for r in link_rows],
            links_count=len(link_rows),
        )

    def ingest_vault_files(
        self,
        user: User,
        setting_id: UUID,
        job_id: UUID,
        payload: WorldVaultParseRequest,
    ) -> WorldVaultParseResultOut:
        setting = self._require_setting(setting_id)
        self._require_master_for_setting(user, setting)
        job = self._require_job(setting, job_id)

        # Редакцию проверяем до любой записи.
        rules_edition = normalize_rules_edition(payload.rules_edition)
        if job.rules_edition != rules_edition and payload.rules_edition is not None:
            # Явно прислали другое — уже отсечено выше, если не 2014.
            job.rules_edition = rules_edition

        if not payload.files:
            raise AppError(
                "Нет файлов для разбора",
                code="vault_files_empty",
                status_code=400,
                data={"hint": "Передайте files: [{path, content}] или zip"},
            )

        job.status = "parsing"
        if job.source_kind == "api":
            job.source_kind = "api"
        self.db.commit()

        try:
            vault_files = [
                VaultFile(path=f.path, content=f.content) for f in payload.files
            ]
            result = parse_vault_files(vault_files)
            return self._apply_parsed_items(job, result.items, skipped=result.skipped)
        except AppError:
            job.status = "failed"
            self.db.commit()
            raise
        except Exception:
            job.status = "failed"
            self.db.commit()
            raise

    def ingest_vault_zip(
        self,
        user: User,
        setting_id: UUID,
        job_id: UUID,
        data: bytes,
        *,
        rules_edition: str | None = None,
    ) -> WorldVaultParseResultOut:
        setting = self._require_setting(setting_id)
        self._require_master_for_setting(user, setting)
        job = self._require_job(setting, job_id)

        normalize_rules_edition(rules_edition)

        job.status = "parsing"
        job.source_kind = "zip"
        self.db.commit()

        try:
            vault_files = extract_zip_to_files(data)
            if not vault_files:
                raise AppError(
                    "В архиве нет текстовых файлов хранилища",
                    code="vault_files_empty",
                    status_code=400,
                    data={"hint": "Добавьте markdown в world/, campaign/, rules/"},
                )
            result = parse_vault_files(vault_files)
            return self._apply_parsed_items(job, result.items, skipped=result.skipped)
        except AppError:
            job.status = "failed"
            self.db.commit()
            raise
        except Exception:
            job.status = "failed"
            self.db.commit()
            raise
