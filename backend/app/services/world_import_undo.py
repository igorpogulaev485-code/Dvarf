"""W-API-07: отмена последнего confirm импорта мира."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError
from app.models.journal import CampaignJournalEntry
from app.models.lobby import Setting
from app.models.setting_artifact import SettingArtifact
from app.models.setting_creature import SettingCreature
from app.models.setting_page import SettingPage
from app.models.setting_page_link import SettingPageLink
from app.models.world_import import WorldImportConfirmation, WorldImportJob
from app.repositories.lobby import LobbyRepository
from app.schemas.world_import import WorldImportJobOut, WorldImportUndoOut
from app.services.world_import_auth import WorldImportAccess, WorldImportActor
from app.services.world_import_snapshots import confirmation_applied


def _bodies_equal(a: str | None, b: str | None) -> bool:
    return (a or "").strip() == (b or "").strip()


class WorldImportUndoService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.lobbies = LobbyRepository(db)
        self.access = WorldImportAccess(db)

    def _require_job(self, setting: Setting, job_id: UUID) -> WorldImportJob:
        job = self.db.get(WorldImportJob, job_id)
        if job is None or job.setting_id != setting.id:
            raise NotFoundError("Задание импорта не найдено", code="world_import_not_found")
        return job

    def _latest_confirmation(self, job: WorldImportJob) -> WorldImportConfirmation:
        rows = list(
            self.db.scalars(
                select(WorldImportConfirmation)
                .where(
                    WorldImportConfirmation.job_id == job.id,
                    WorldImportConfirmation.undone_at.is_(None),
                )
                .order_by(WorldImportConfirmation.confirmed_at.desc())
            ).all()
        )
        if not rows:
            raise AppError(
                "Нет подтверждения, которое можно отменить",
                code="nothing_to_undo",
                status_code=400,
                data={"hint": "Сначала подтвердите импорт"},
            )
        return rows[0]

    def _assert_safe_to_undo(self, confirmation: WorldImportConfirmation) -> dict[str, Any]:
        snap = confirmation.snapshot_before if isinstance(confirmation.snapshot_before, dict) else {}
        applied = confirmation_applied(snap)
        if not applied:
            raise AppError(
                "Снимок подтверждения слишком старый — безопасный откат невозможен",
                code="undo_snapshot_incomplete",
                status_code=409,
                data={"hint": "Повторите импорт и confirm после W-API-07"},
            )

        for row in applied.get("pages") or []:
            if not isinstance(row, dict):
                continue
            page_id = row.get("page_id")
            if not page_id:
                continue
            page = self.db.get(SettingPage, UUID(str(page_id)))
            if page is None or page.deleted_at is not None:
                continue
            if row.get("created"):
                # Созданная страница: если мастер сильно правил после — всё равно в корзину,
                # но если title/body ушли от applied — считаем небезопасным.
                if page.title != str(row.get("title") or "") or not _bodies_equal(
                    page.body, str(row.get("body") or "")
                ):
                    raise AppError(
                        "Откат небезопасен: страницу правили после подтверждения",
                        code="undo_unsafe",
                        status_code=409,
                        data={
                            "path": row.get("source_key") or str(page_id),
                            "hint": "Сначала верните страницу к виду после импорта или решите вручную",
                        },
                    )
            else:
                if page.title != str(row.get("title") or "") or not _bodies_equal(
                    page.body, str(row.get("body") or "")
                ):
                    raise AppError(
                        "Откат небезопасен: после импорта страницу снова меняли",
                        code="undo_unsafe",
                        status_code=409,
                        data={
                            "path": row.get("source_key") or str(page_id),
                            "hint": "Чужие правки после confirm не откатываем молча",
                        },
                    )

        for row in applied.get("creatures") or []:
            if not isinstance(row, dict) or not row.get("created"):
                continue
            cid = row.get("creature_id")
            if not cid:
                continue
            creature = self.db.get(SettingCreature, UUID(str(cid)))
            if creature is None:
                continue
            if creature.name != str(row.get("name") or "") or (creature.data or {}) != (
                row.get("data") or {}
            ):
                raise AppError(
                    "Откат небезопасен: существо меняли после подтверждения",
                    code="undo_unsafe",
                    status_code=409,
                    data={"path": row.get("import_key") or str(cid)},
                )

        for row in applied.get("artifacts") or []:
            if not isinstance(row, dict) or not row.get("created"):
                continue
            aid = row.get("artifact_id")
            if not aid:
                continue
            artifact = self.db.get(SettingArtifact, UUID(str(aid)))
            if artifact is None:
                continue
            if artifact.name != str(row.get("name") or "") or not _bodies_equal(
                artifact.description, str(row.get("description") or "")
            ):
                raise AppError(
                    "Откат небезопасен: предмет меняли после подтверждения",
                    code="undo_unsafe",
                    status_code=409,
                    data={"path": row.get("import_key") or str(aid)},
                )

        return applied

    def undo(
        self, actor: WorldImportActor, setting_id: UUID, job_id: UUID
    ) -> WorldImportUndoOut:
        setting = self.access.require_setting(setting_id)
        # Undo — только мастер (сессия), не токен ИИ.
        if actor.is_ai:
            raise AppError(
                "Токен импорта не может отменять подтверждение",
                code="undo_requires_master",
                status_code=403,
                data={"hint": "Отмену делает мастер из кабинета"},
            )
        lobby = self.access.authorize(actor, setting, need_write=True, allow_ai=False)
        job = self._require_job(setting, job_id)
        if job.status != "confirmed":
            raise AppError(
                "Отменить можно только последнее подтверждение задания",
                code="import_not_confirmed",
                status_code=400,
                data={"status": job.status, "hint": "Черновик отменяйте через cancel"},
            )

        confirmation = self._latest_confirmation(job)
        applied = self._assert_safe_to_undo(confirmation)
        snap = confirmation.snapshot_before if isinstance(confirmation.snapshot_before, dict) else {}
        pages_before = {
            str(p.get("source_key")): p
            for p in (snap.get("pages") or [])
            if isinstance(p, dict) and p.get("source_key")
        }

        restored: list[UUID] = []
        trashed: list[UUID] = []
        removed_creatures: list[UUID] = []
        removed_artifacts: list[UUID] = []
        now = datetime.now(UTC)

        for row in applied.get("pages") or []:
            if not isinstance(row, dict):
                continue
            page_id_raw = row.get("page_id")
            if not page_id_raw:
                continue
            page_id = UUID(str(page_id_raw))
            page = self.db.get(SettingPage, page_id)
            if page is None:
                continue
            if row.get("created"):
                page.deleted_at = now
                # Не снимаем раскрытие «молча» до trash — но в корзине страница скрыта от игроков.
                trashed.append(page_id)
            else:
                before = pages_before.get(str(row.get("source_key")))
                if before and before.get("page_id"):
                    page.title = str(before.get("title") or page.title)
                    page.body = str(before.get("body") if before.get("body") is not None else page.body)
                    if before.get("page_kind"):
                        page.page_kind = str(before["page_kind"])
                    restored.append(page_id)

        # Офисы на держателях — откат fields.offices, если есть в before.
        for row in applied.get("holder_offices_before") or []:
            if not isinstance(row, dict):
                continue
            pid = row.get("page_id")
            if not pid:
                continue
            page = self.db.get(SettingPage, UUID(str(pid)))
            if page is None or page.deleted_at is not None:
                continue
            fields = dict(page.fields or {})
            fields["offices"] = list(row.get("offices") or [])
            page.fields = fields

        for link_id in applied.get("created_link_ids") or []:
            try:
                lid = UUID(str(link_id))
            except (TypeError, ValueError):
                continue
            link = self.db.get(SettingPageLink, lid)
            if link is not None:
                self.db.delete(link)

        for row in applied.get("creatures") or []:
            if not isinstance(row, dict) or not row.get("created"):
                continue
            cid = row.get("creature_id")
            if not cid:
                continue
            creature = self.db.get(SettingCreature, UUID(str(cid)))
            if creature is not None:
                self.db.delete(creature)
                removed_creatures.append(UUID(str(cid)))

        for row in applied.get("artifacts") or []:
            if not isinstance(row, dict) or not row.get("created"):
                continue
            aid = row.get("artifact_id")
            if not aid:
                continue
            artifact = self.db.get(SettingArtifact, UUID(str(aid)))
            if artifact is not None:
                self.db.delete(artifact)
                removed_artifacts.append(UUID(str(aid)))

        for jid in applied.get("journal_entry_ids") or []:
            try:
                entry = self.db.get(CampaignJournalEntry, UUID(str(jid)))
            except (TypeError, ValueError):
                entry = None
            if entry is not None:
                # Помечаем черновик пустым / удаляем мягко через is_draft+title.
                entry.title = f"[отменено] {entry.title}"[:200]
                entry.is_draft = True

        actor_kind = "user"
        actor_name = getattr(actor.user, "display_name", None) or "мастер"
        journal = CampaignJournalEntry(
            lobby_id=lobby.id,
            author_user_id=actor.author_user_id,
            entry_type="session_summary",
            title="Отмена подтверждения импорта мира",
            body=(
                f"{actor_name} отменил(а) подтверждение импорта "
                f"(confirmation {confirmation.id}). "
                f"В корзину: {len(trashed)} стр.; восстановлено: {len(restored)}; "
                f"удалено существ: {len(removed_creatures)}; предметов: {len(removed_artifacts)}."
            ),
            is_draft=True,
            setting_id=setting.id,
        )
        self.lobbies.add_journal_entry(journal)

        confirmation.undone_at = now
        # Кто отменил — в снимке (без новой колонки).
        snap = dict(snap)
        snap["undo"] = {
            "undone_at": now.isoformat(),
            "actor_user_id": str(actor.author_user_id) if actor.author_user_id else None,
            "actor_kind": actor_kind,
            "journal_entry_id": str(journal.id) if getattr(journal, "id", None) else None,
        }
        confirmation.snapshot_before = snap
        job.status = "ready_for_review"
        job.confirm_snapshot = snap
        self.db.commit()
        self.db.refresh(job)
        self.db.refresh(confirmation)

        return WorldImportUndoOut(
            job=WorldImportJobOut.model_validate(job),
            confirmation_id=confirmation.id,
            undone_at=now,
            actor_kind=actor_kind,  # type: ignore[arg-type]
            restored_page_ids=restored,
            trashed_page_ids=trashed,
            removed_creature_ids=removed_creatures,
            removed_artifact_ids=removed_artifacts,
            journal_entry_id=getattr(journal, "id", None),
            message="Подтверждение отменено; кто отменил — в журнале кампании",
        )
