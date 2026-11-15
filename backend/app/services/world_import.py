"""W-API-01/02/03/05/06/08: задания импорта, разбор, извлечение, validate/upsert."""

from __future__ import annotations

import base64
from collections import Counter
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
    WorldImportFromGitRequest,
    WorldImportJobOut,
    WorldImportSettingsOut,
    WorldImportSettingsPatch,
    WorldImportUpsertRequest,
    WorldImportValidateOut,
    WorldImportValidateRequest,
    WorldVaultFileIn,
    WorldVaultParseRequest,
    WorldVaultParseResultOut,
)
from app.services import lobby_roles as roles
from app.services.media import LOBBY_QUOTA_BYTES, LobbyMediaService
from app.services.world_import_auth import WorldImportActor, WorldImportAccess
from app.services.world_import_characters import enrich_party_characters
from app.services.world_import_extract import enrich_parsed_with_ai
from app.services.world_import_links import AliasBundle, build_alias_and_link_graph
from app.services.world_vault_parse import (
    MAX_FILE_COUNT,
    MAX_TEXT_TOTAL_BYTES,
    MAX_ZIP_BYTES,
    VaultFile,
    extract_zip_to_files,
    parse_vault_files,
)


def vault_files_from_payload(files: list[WorldVaultFileIn]) -> list[VaultFile]:
    """Текст + опциональный content_base64 (PDF) → VaultFile."""
    out: list[VaultFile] = []
    for f in files:
        binary: bytes | None = None
        if f.content_base64:
            try:
                binary = base64.b64decode(f.content_base64, validate=False)
            except Exception as exc:
                raise AppError(
                    "Не удалось прочитать content_base64",
                    code="bad_encoding",
                    status_code=400,
                    data={"path": f.path, "hint": "Передайте корректный base64", "detail": str(exc)},
                ) from exc
        out.append(VaultFile(path=f.path, content=f.content or "", binary=binary))
    return out

ACTIVE_JOB_STATUSES = frozenset({"parsing"})

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
        self.access = WorldImportAccess(db)

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

    def _ensure_no_active_parse(self, setting_id: UUID, *, except_job_id: UUID | None = None) -> None:
        q = select(WorldImportJob).where(
            WorldImportJob.setting_id == setting_id,
            WorldImportJob.status.in_(ACTIVE_JOB_STATUSES),
        )
        active = self.db.scalar(q.limit(1))
        if active is not None and (except_job_id is None or active.id != except_job_id):
            raise AppError(
                "Уже идёт разбор импорта для этого сеттинга",
                code="import_in_progress",
                status_code=409,
                data={"job_id": str(active.id), "hint": "Дождитесь окончания или отмените задание"},
            )

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
                getattr(prop, "office_title", None),
                getattr(prop, "succession_order", None),
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
                office_title=getattr(prop, "office_title", None),
                office_holder_status=getattr(prop, "office_holder_status", None),
                succession_order=getattr(prop, "succession_order", None),
                tenure_from=getattr(prop, "tenure_from", None),
                tenure_to=getattr(prop, "tenure_to", None),
                hint=getattr(prop, "hint", None),
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
        extract_mode: str = "none",
        extract_message: str = "",
        extract_warnings: list[str] | None = None,
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

        # ИИ/эвристики не участвуют в авто-графе должностей: только явный разбор 03.
        graph_items = [
            p
            for p in parsed_items
            if not (p.proposal or {}).get("ai_extracted")
            and p.item_type not in {"ai_suggestion", "artifact_set"}
        ]
        alias_by_key, link_proposals = build_alias_and_link_graph(graph_items)
        empty_bundle = AliasBundle()

        for parsed in parsed_items:
            bundle = alias_by_key.get(parsed.source_key, empty_bundle)
            aliases = [display for display, _norm in bundle.norms]
            proposal = dict(parsed.proposal)
            proposal["aliases"] = aliases
            if extract_mode and extract_mode != "none":
                proposal.setdefault("extract_mode", extract_mode)
            if extract_message:
                proposal.setdefault("extract_message", extract_message)

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
            # Синтетические ключи извлечения (#artifact:…) — тоже в world_source_keys.
            source_key_row = self._upsert_source_key(
                job.setting_id,
                source_path=parsed.source_path,
                source_slug=parsed.source_slug,
            )
            if bundle.norms:
                self._upsert_aliases(
                    job.setting_id,
                    source_key_row,
                    bundle.norms,
                )

        link_rows = self._replace_draft_links(job, link_proposals)

        # Статус задания: разбор готов; режим извлечения — в ответе и proposal.
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
            extract_mode=extract_mode,
            extract_message=extract_message,
            extract_warnings=list(extract_warnings or []),
        )

    def _parse_and_enrich(self, vault_files: list, *, rules_edition: str):
        """Детерминированный разбор + персонажи партии (08) + ИИ (06)."""
        result = parse_vault_files(vault_files)
        result = enrich_party_characters(result, vault_files)
        return enrich_parsed_with_ai(result, rules_edition=rules_edition)

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
            vault_files = vault_files_from_payload(payload.files)
            enriched = self._parse_and_enrich(
                vault_files, rules_edition=job.rules_edition or rules_edition
            )
            return self._apply_parsed_items(
                job,
                enriched.items,
                skipped=enriched.skipped,
                extract_mode=enriched.extract_mode,
                extract_message=enriched.extract_message,
                extract_warnings=enriched.extract_warnings,
            )
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
            enriched = self._parse_and_enrich(
                vault_files, rules_edition=job.rules_edition or "2014"
            )
            return self._apply_parsed_items(
                job,
                enriched.items,
                skipped=enriched.skipped,
                extract_mode=enriched.extract_mode,
                extract_message=enriched.extract_message,
                extract_warnings=enriched.extract_warnings,
            )
        except AppError:
            job.status = "failed"
            self.db.commit()
            raise
        except Exception:
            job.status = "failed"
            self.db.commit()
            raise

    def ingest_from_git(
        self,
        actor: WorldImportActor,
        setting_id: UUID,
        payload: WorldImportFromGitRequest,
        *,
        idempotency_key: str | None = None,
        fetch_files=None,
    ) -> WorldVaultParseResultOut:
        """W-API-09: публичная git-ссылка → то же задание, что zip, тот же разбор.

        fetch_files — хук для тестов: (url) → list[VaultFile]; по умолчанию
        скачивание HTTPS-архива ветки (без бинарника git в образе).
        """
        from app.services.world_import_git import fetch_vault_files_from_git_url

        setting = self.access.require_setting(setting_id)
        lobby = self.access.authorize(actor, setting, need_write=True, allow_ai=True)

        # Редакцию и URL проверяем до сети и до записи в БД.
        rules_edition = normalize_rules_edition(payload.rules_edition)
        url = (payload.url or "").strip()
        if not url:
            raise AppError(
                "Пустая git-ссылка",
                code="git_url_rejected",
                status_code=400,
                data={"hint": "Передайте url публичного репозитория"},
            )

        # Ранняя валидация хоста (без DNS в юнит-пути fetch_files может подменить сеть).
        from app.services.world_import_git import validate_git_url

        parsed_url = validate_git_url(url)

        key = (idempotency_key or "").strip() or None
        job: WorldImportJob | None = None
        if key:
            job = self.db.scalar(
                select(WorldImportJob)
                .where(
                    WorldImportJob.setting_id == setting.id,
                    WorldImportJob.idempotency_key == key,
                )
                .limit(1)
            )
            if job is not None and job.status != "parsing":
                items = list(
                    self.db.scalars(
                        select(WorldImportDraftItem).where(
                            WorldImportDraftItem.job_id == job.id
                        )
                    ).all()
                )
                links = list(
                    self.db.scalars(
                        select(WorldImportDraftLink).where(
                            WorldImportDraftLink.job_id == job.id
                        )
                    ).all()
                )
                if items:
                    return WorldVaultParseResultOut(
                        job=WorldImportJobOut.model_validate(job),
                        items=[WorldImportDraftItemOut.model_validate(r) for r in items],
                        links=[WorldImportDraftLinkOut.model_validate(r) for r in links],
                        links_count=len(links),
                        created_count=0,
                        updated_count=0,
                    )

        if job is None:
            self._ensure_no_active_parse(setting.id)
            author_id = actor.author_user_id
            if author_id is None:
                raise AppError(
                    "Не удалось определить автора задания",
                    code="world_import_author_missing",
                    status_code=400,
                )
            job = WorldImportJob(
                setting_id=setting.id,
                lobby_id=lobby.id,
                author_id=author_id,
                status="received",
                rules_edition=rules_edition,
                source_kind="git",
                idempotency_key=key,
                source_ref=parsed_url.original_url[:2000],
            )
            self.db.add(job)
            self.db.commit()
            self.db.refresh(job)
        elif job.status == "parsing":
            raise AppError(
                "Импорт ещё разбирается",
                code="import_in_progress",
                status_code=409,
                data={"job_id": str(job.id)},
            )

        self._ensure_no_active_parse(setting.id, except_job_id=job.id)
        job.status = "parsing"
        job.rules_edition = rules_edition
        job.source_kind = "git"
        job.source_ref = parsed_url.original_url[:2000]
        self.db.commit()

        try:
            if fetch_files is not None:
                vault_files = fetch_files(url)
            else:
                _parsed, vault_files = fetch_vault_files_from_git_url(url)
            if not vault_files:
                raise AppError(
                    "В репозитории нет текстовых файлов хранилища",
                    code="vault_files_empty",
                    status_code=400,
                    data={"hint": "Добавьте markdown в world/, campaign/, rules/"},
                )
            enriched = self._parse_and_enrich(
                vault_files, rules_edition=rules_edition
            )
            return self._apply_parsed_items(
                job,
                enriched.items,
                skipped=enriched.skipped,
                extract_mode=enriched.extract_mode,
                extract_message=enriched.extract_message,
                extract_warnings=enriched.extract_warnings,
            )
        except AppError:
            job.status = "failed"
            self.db.commit()
            raise
        except Exception:
            job.status = "failed"
            self.db.commit()
            raise

    # --- W-API-05: validate / upsert / settings (сессия или токен) ---

    def validate_package(
        self,
        actor: WorldImportActor,
        setting_id: UUID,
        payload: WorldImportValidateRequest,
    ) -> WorldImportValidateOut:
        """Проверка без записи в канон и без устойчивого задания."""
        setting = self.access.require_setting(setting_id)
        lobby = self.access.authorize(actor, setting, need_write=False, allow_ai=True)

        rules_edition = normalize_rules_edition(payload.rules_edition)
        warnings: list[str] = []
        errors: list = []

        text_bytes = 0
        for f in payload.files:
            text_bytes += len((f.content or "").encode("utf-8"))

        media_usage = LobbyMediaService(self.db).usage(lobby.id)

        if not payload.files:
            from app.schemas.world_import import WorldImportValidateIssue

            errors.append(
                WorldImportValidateIssue(
                    code="vault_files_empty",
                    path="",
                    message="Нет файлов для проверки",
                    hint="Передайте files: [{path, content}]",
                )
            )

        type_counts: dict[str, int] = {}
        skipped: list[dict[str, str]] = []
        extract_mode = "none"
        extract_message = ""
        if payload.files and not errors:
            try:
                vault_files = vault_files_from_payload(payload.files)
                enriched = self._parse_and_enrich(
                    vault_files, rules_edition=rules_edition
                )
                type_counts = dict(Counter(it.item_type for it in enriched.items))
                skipped = enriched.skipped
                extract_mode = enriched.extract_mode
                extract_message = enriched.extract_message
                warnings.extend(enriched.extract_warnings)
                for err in enriched.extract_errors:
                    from app.schemas.world_import import WorldImportValidateIssue

                    # Ошибки провайдера — предупреждение, validate не валим.
                    warnings.append(err.message)
                if not enriched.items:
                    warnings.append("Ни один файл не дал карточку мира")
            except AppError as exc:
                from app.schemas.world_import import WorldImportValidateIssue

                errors.append(
                    WorldImportValidateIssue(
                        code=exc.code,
                        path=str((exc.data or {}).get("path") or ""),
                        message=exc.message,
                        hint=str((exc.data or {}).get("hint") or ""),
                    )
                )

        if media_usage.free_bytes <= 0:
            warnings.append(
                "Квота медиа лобби исчерпана (200 МБ) — вложения импорта могут быть отклонены"
            )

        ok = len(errors) == 0
        return WorldImportValidateOut(
            rules_edition=rules_edition,
            type_counts=type_counts,
            file_count=len(payload.files),
            text_bytes=text_bytes,
            skipped=skipped,
            warnings=warnings,
            errors=errors,
            media_quota_bytes=LOBBY_QUOTA_BYTES,
            media_used_bytes=media_usage.used_bytes,
            media_free_bytes=media_usage.free_bytes,
            limits={
                "max_text_bytes": MAX_TEXT_TOTAL_BYTES,
                "max_zip_bytes": MAX_ZIP_BYTES,
                "max_files": MAX_FILE_COUNT,
                "media_quota_bytes": LOBBY_QUOTA_BYTES,
            },
            ok=ok,
            extract_mode=extract_mode,
            extract_message=extract_message,
        )

    def upsert_package(
        self,
        actor: WorldImportActor,
        setting_id: UUID,
        payload: WorldImportUpsertRequest,
        *,
        idempotency_key: str | None = None,
    ) -> WorldVaultParseResultOut:
        """Создать/найти задание по Idempotency-Key и разобрать файлы (канон не трогаем)."""
        setting = self.access.require_setting(setting_id)
        lobby = self.access.authorize(actor, setting, need_write=True, allow_ai=True)
        rules_edition = normalize_rules_edition(payload.rules_edition)

        source_kind = payload.source_kind or "api"
        if source_kind not in WORLD_IMPORT_SOURCE_KINDS:
            raise AppError(
                "Неизвестный вид источника импорта",
                code="world_import_source_kind_bad",
                status_code=400,
                data={"field": "source_kind"},
            )

        key = (idempotency_key or "").strip() or None
        job: WorldImportJob | None = None
        if key:
            job = self.db.scalar(
                select(WorldImportJob)
                .where(
                    WorldImportJob.setting_id == setting.id,
                    WorldImportJob.idempotency_key == key,
                )
                .limit(1)
            )

        if job is None:
            self._ensure_no_active_parse(setting.id)
            author_id = actor.author_user_id
            if author_id is None:
                raise AppError(
                    "Не удалось определить автора задания",
                    code="world_import_author_missing",
                    status_code=400,
                )
            job = WorldImportJob(
                setting_id=setting.id,
                lobby_id=lobby.id,
                author_id=author_id,
                status="received",
                rules_edition=rules_edition,
                source_kind=source_kind,
                idempotency_key=key,
                source_ref=payload.source_ref,
            )
            self.db.add(job)
            self.db.commit()
            self.db.refresh(job)
        elif job.status == "parsing":
            raise AppError(
                "Импорт ещё разбирается",
                code="import_in_progress",
                status_code=409,
                data={"job_id": str(job.id)},
            )

        if not payload.files:
            # Идемпотентный повтор без файлов — вернуть текущее состояние.
            items = list(
                self.db.scalars(
                    select(WorldImportDraftItem).where(WorldImportDraftItem.job_id == job.id)
                ).all()
            )
            links = list(
                self.db.scalars(
                    select(WorldImportDraftLink).where(WorldImportDraftLink.job_id == job.id)
                ).all()
            )
            return WorldVaultParseResultOut(
                job=WorldImportJobOut.model_validate(job),
                items=[WorldImportDraftItemOut.model_validate(r) for r in items],
                links=[WorldImportDraftLinkOut.model_validate(r) for r in links],
                links_count=len(links),
            )

        self._ensure_no_active_parse(setting.id, except_job_id=job.id)
        job.status = "parsing"
        job.rules_edition = rules_edition
        if payload.source_ref is not None:
            job.source_ref = payload.source_ref
        self.db.commit()

        try:
            vault_files = vault_files_from_payload(payload.files)
            enriched = self._parse_and_enrich(
                vault_files, rules_edition=rules_edition
            )
            return self._apply_parsed_items(
                job,
                enriched.items,
                skipped=enriched.skipped,
                extract_mode=enriched.extract_mode,
                extract_message=enriched.extract_message,
                extract_warnings=enriched.extract_warnings,
            )
        except AppError:
            job.status = "failed"
            self.db.commit()
            raise
        except Exception:
            job.status = "failed"
            self.db.commit()
            raise

    def get_import_settings(
        self, actor: WorldImportActor, setting_id: UUID
    ) -> WorldImportSettingsOut:
        setting = self.access.require_setting(setting_id)
        lobby = self.access.authorize(actor, setting, need_write=False, allow_ai=True)
        return WorldImportSettingsOut(
            setting_id=setting.id,
            lobby_id=lobby.id,
            ai_can_confirm=bool(getattr(setting, "ai_can_confirm", False)),
        )

    def patch_import_settings(
        self,
        actor: WorldImportActor,
        setting_id: UUID,
        payload: WorldImportSettingsPatch,
    ) -> WorldImportSettingsOut:
        """Тумблер ai_can_confirm — только сессия мастера, не токен API."""
        setting = self.access.require_setting(setting_id)
        lobby = self.access.authorize(
            actor, setting, master_session_only=True, allow_ai=False
        )
        setting.ai_can_confirm = bool(payload.ai_can_confirm)
        self.db.commit()
        self.db.refresh(setting)
        return WorldImportSettingsOut(
            setting_id=setting.id,
            lobby_id=lobby.id,
            ai_can_confirm=bool(setting.ai_can_confirm),
        )

    def list_jobs_for_actor(
        self, actor: WorldImportActor, setting_id: UUID
    ) -> list[WorldImportJobOut]:
        setting = self.access.require_setting(setting_id)
        self.access.authorize(actor, setting, need_write=False, allow_ai=True)
        rows = list(
            self.db.scalars(
                select(WorldImportJob)
                .where(WorldImportJob.setting_id == setting.id)
                .order_by(WorldImportJob.created_at.desc())
            ).all()
        )
        return [WorldImportJobOut.model_validate(r) for r in rows]

    def get_job_for_actor(
        self, actor: WorldImportActor, setting_id: UUID, job_id: UUID
    ) -> WorldImportJobOut:
        setting = self.access.require_setting(setting_id)
        self.access.authorize(actor, setting, need_write=False, allow_ai=True)
        job = self._require_job(setting, job_id)
        return WorldImportJobOut.model_validate(job)
