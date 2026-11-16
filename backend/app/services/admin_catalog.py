"""ADM-05: поиск справочника, черновики названий, принятие, откат, журнал."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import String, cast, exists, func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.dnd.content_layer import layer_for_source
from app.models.admin import AdminRoleName
from app.models.catalog import CatalogEntry, CatalogKind, CatalogRulesEdition
from app.models.catalog_name_revision import (
    CatalogNameRevision,
    CatalogNameRevisionStatus,
)
from app.models.feedback import FeedbackMessage, FeedbackStatus, FeedbackTopic
from app.models.user import User
from app.schemas.admin_catalog import (
    KIND_LABELS,
    LAYER_LABELS,
    STATUS_LABELS,
    AdminCatalogDetail,
    AdminCatalogDraftRequest,
    AdminCatalogListItem,
    AdminCatalogNameFeedbackItem,
    AdminCatalogNameFeedbackPage,
    AdminCatalogPage,
    AdminCatalogRevisionItem,
)
from app.services.admin import AdminService
from app.services.catalog_names import (
    get_pending,
    list_revisions_for_entry,
    live_names_for_entry,
    load_live_accepted_map,
)

ACTION_CATALOG_DRAFT_CREATE = "admin_catalog_draft_create"
ACTION_CATALOG_DRAFT_UPDATE = "admin_catalog_draft_update"
ACTION_CATALOG_DRAFT_WITHDRAW = "admin_catalog_draft_withdraw"
ACTION_CATALOG_ACCEPT = "admin_catalog_accept"
ACTION_CATALOG_REJECT = "admin_catalog_reject"
ACTION_CATALOG_ROLLBACK = "admin_catalog_rollback"


def _kind_label(kind: Any) -> str:
    val = kind.value if hasattr(kind, "value") else str(kind)
    return KIND_LABELS.get(val, val)


def _layer_for(entry: CatalogEntry) -> tuple[str, str]:
    data = entry.data if isinstance(entry.data, dict) else {}
    kind_val = entry.kind.value if hasattr(entry.kind, "value") else str(entry.kind)
    layer = layer_for_source(entry.source, kind=kind_val, slug=entry.slug, data=data)
    return layer, LAYER_LABELS.get(layer, layer)


def _user_display(db: Session, user_id: UUID | None) -> str | None:
    if user_id is None:
        return None
    user = db.get(User, user_id)
    if user is None:
        return None
    return user.display_name or user.email or str(user.id)


class AdminCatalogService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.admin = AdminService(db)

    def _require_catalog_access(self, user: User) -> tuple[bool, bool]:
        """Возвращает (is_full_admin, is_moderator)."""
        self.admin.require_catalog_access(user)
        is_full = self.admin.is_full_admin(user)
        is_mod = self.admin.is_catalog_moderator(user)
        return is_full, is_mod

    def _revision_item(
        self,
        row: CatalogNameRevision,
        *,
        can_rollback: bool = False,
    ) -> AdminCatalogRevisionItem:
        return AdminCatalogRevisionItem(
            id=row.id,
            status=row.status,
            status_label=STATUS_LABELS.get(row.status, row.status),
            name_ru=row.name_ru,
            name_en=row.name_en,
            previous_name_ru=row.previous_name_ru,
            previous_name_en=row.previous_name_en,
            author_id=row.author_id,
            author_name=_user_display(self.db, row.author_id),
            reviewer_id=row.reviewer_id,
            reviewer_name=_user_display(self.db, row.reviewer_id),
            created_at=row.created_at,
            reviewed_at=row.reviewed_at,
            can_rollback=can_rollback,
        )

    def list_entries(
        self,
        user: User,
        *,
        q: str | None = None,
        kind: str | None = None,
        edition: str | None = None,
        source: str | None = None,
        layer: str | None = None,
        has_pending: bool | None = None,
        include_inactive: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> AdminCatalogPage:
        self._require_catalog_access(user)
        page = max(1, page)
        page_size = max(1, min(page_size, 100))

        stmt = select(CatalogEntry)
        count_stmt = select(func.count()).select_from(CatalogEntry)

        if not include_inactive:
            stmt = stmt.where(CatalogEntry.is_active.is_(True))
            count_stmt = count_stmt.where(CatalogEntry.is_active.is_(True))

        if kind:
            try:
                kind_enum = CatalogKind(kind)
            except ValueError as exc:
                raise AppError("Неизвестный тип", code="bad_kind", status_code=400) from exc
            stmt = stmt.where(CatalogEntry.kind == kind_enum)
            count_stmt = count_stmt.where(CatalogEntry.kind == kind_enum)

        if edition:
            try:
                ed = CatalogRulesEdition(edition)
            except ValueError as exc:
                raise AppError("Неизвестная редакция", code="bad_edition", status_code=400) from exc
            stmt = stmt.where(
                or_(
                    CatalogEntry.rules_edition == ed,
                    CatalogEntry.rules_edition == CatalogRulesEdition.both,
                )
            )
            count_stmt = count_stmt.where(
                or_(
                    CatalogEntry.rules_edition == ed,
                    CatalogEntry.rules_edition == CatalogRulesEdition.both,
                )
            )

        if source:
            src = source.strip()
            stmt = stmt.where(CatalogEntry.source.ilike(f"%{src}%"))
            count_stmt = count_stmt.where(CatalogEntry.source.ilike(f"%{src}%"))

        pending_exists = exists(
            select(1).where(
                CatalogNameRevision.catalog_entry_id == CatalogEntry.id,
                CatalogNameRevision.status == CatalogNameRevisionStatus.pending.value,
            )
        )
        if has_pending is True:
            stmt = stmt.where(pending_exists)
            count_stmt = count_stmt.where(pending_exists)
        elif has_pending is False:
            stmt = stmt.where(~pending_exists)
            count_stmt = count_stmt.where(~pending_exists)

        if q:
            pattern = f"%{q.strip()}%"
            # Сид, живое принятое, черновик, слаг, id.
            live_latest = (
                select(
                    CatalogNameRevision.catalog_entry_id.label("entry_id"),
                    func.max(CatalogNameRevision.reviewed_at).label("max_reviewed"),
                )
                .where(
                    CatalogNameRevision.status == CatalogNameRevisionStatus.accepted.value
                )
                .group_by(CatalogNameRevision.catalog_entry_id)
                .subquery()
            )
            live_match = exists(
                select(1)
                .select_from(CatalogNameRevision)
                .join(
                    live_latest,
                    (CatalogNameRevision.catalog_entry_id == live_latest.c.entry_id)
                    & (CatalogNameRevision.reviewed_at == live_latest.c.max_reviewed),
                )
                .where(
                    CatalogNameRevision.catalog_entry_id == CatalogEntry.id,
                    CatalogNameRevision.status
                    == CatalogNameRevisionStatus.accepted.value,
                    or_(
                        CatalogNameRevision.name_ru.ilike(pattern),
                        CatalogNameRevision.name_en.ilike(pattern),
                    ),
                )
            )
            draft_match = exists(
                select(1).where(
                    CatalogNameRevision.catalog_entry_id == CatalogEntry.id,
                    CatalogNameRevision.status
                    == CatalogNameRevisionStatus.pending.value,
                    or_(
                        CatalogNameRevision.name_ru.ilike(pattern),
                        CatalogNameRevision.name_en.ilike(pattern),
                    ),
                )
            )
            id_match = cast(CatalogEntry.id, String).ilike(pattern)
            text_match = or_(
                CatalogEntry.name_ru.ilike(pattern),
                CatalogEntry.name_en.ilike(pattern),
                CatalogEntry.slug.ilike(pattern),
                live_match,
                draft_match,
                id_match,
            )
            stmt = stmt.where(text_match)
            count_stmt = count_stmt.where(text_match)

        total = int(self.db.scalar(count_stmt) or 0)
        rows = list(
            self.db.scalars(
                stmt.order_by(
                    CatalogEntry.kind.asc(),
                    CatalogEntry.name_ru.asc(),
                    CatalogEntry.slug.asc(),
                )
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )

        # Фильтр по слою — после выборки (слой вычисляемый).
        if layer:
            rows = [r for r in rows if _layer_for(r)[0] == layer]
            # Пересчёт total при фильтре слоя — упрощённо по всей выборке было бы тяжело;
            # считаем отдельным проходом только если слой задан и страница маленькая.
            # Для корректного total: пройдём id без лимита только по уже отфильтрованным условиям —
            # здесь оставляем total как до слоя и помечаем в UI; точнее — фильтруем count.
            all_for_layer = list(
                self.db.scalars(
                    stmt.order_by(CatalogEntry.name_ru.asc()).limit(5000)
                ).all()
            )
            filtered = [r for r in all_for_layer if _layer_for(r)[0] == layer]
            total = len(filtered)
            start = (page - 1) * page_size
            rows = filtered[start : start + page_size]

        accepted_map = load_live_accepted_map(self.db, [r.id for r in rows])
        pending_rows = {
            p.catalog_entry_id: p
            for p in self.db.scalars(
                select(CatalogNameRevision).where(
                    CatalogNameRevision.catalog_entry_id.in_([r.id for r in rows] or [uuid.uuid4()]),
                    CatalogNameRevision.status == CatalogNameRevisionStatus.pending.value,
                )
            ).all()
        }

        items: list[AdminCatalogListItem] = []
        for entry in rows:
            live_ru, live_en = live_names_for_entry(entry, accepted_map.get(entry.id))
            layer_val, layer_label = _layer_for(entry)
            pending = pending_rows.get(entry.id)
            seed_ru = entry.name_ru or entry.slug
            items.append(
                AdminCatalogListItem(
                    id=entry.id,
                    kind=entry.kind.value if hasattr(entry.kind, "value") else str(entry.kind),
                    kind_label=_kind_label(entry.kind),
                    slug=entry.slug,
                    name_ru_live=live_ru,
                    name_en_live=live_en,
                    name_ru_seed=seed_ru,
                    name_en_seed=entry.name_en,
                    names_differ=live_ru != seed_ru or (live_en or "") != (entry.name_en or ""),
                    rules_edition=(
                        entry.rules_edition.value
                        if hasattr(entry.rules_edition, "value")
                        else str(entry.rules_edition)
                    ),
                    source=entry.source,
                    content_layer=layer_val,
                    content_layer_label=layer_label,
                    has_pending=pending is not None,
                    pending_name_ru=pending.name_ru if pending else None,
                    is_active=bool(entry.is_active),
                    updated_at=entry.updated_at,
                )
            )

        return AdminCatalogPage(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    def get_entry(self, user: User, entry_id: UUID) -> AdminCatalogDetail:
        is_full, is_mod = self._require_catalog_access(user)
        entry = self.db.get(CatalogEntry, entry_id)
        if entry is None:
            raise NotFoundError("Запись справочника не найдена")

        accepted_map = load_live_accepted_map(self.db, [entry.id])
        live_accepted = accepted_map.get(entry.id)
        live_ru, live_en = live_names_for_entry(entry, live_accepted)
        layer_val, layer_label = _layer_for(entry)
        seed_ru = entry.name_ru or entry.slug

        pending = get_pending(self.db, entry.id)
        revisions = list_revisions_for_entry(self.db, entry.id)

        can_edit_draft = is_full or (
            is_mod and (pending is None or pending.author_id == user.id)
        )
        can_withdraw = bool(
            pending is not None
            and (is_full or (is_mod and pending.author_id == user.id))
        )
        can_accept = is_full and pending is not None
        can_reject = can_accept

        parent_name = None
        if entry.parent_id:
            parent = self.db.get(CatalogEntry, entry.parent_id)
            if parent is not None:
                p_map = load_live_accepted_map(self.db, [parent.id])
                parent_name, _ = live_names_for_entry(parent, p_map.get(parent.id))

        rev_items: list[AdminCatalogRevisionItem] = []
        for row in revisions:
            can_rb = (
                is_full
                and row.status == CatalogNameRevisionStatus.accepted.value
                and live_accepted is not None
                and row.id == live_accepted.id
            )
            rev_items.append(self._revision_item(row, can_rollback=can_rb))

        return AdminCatalogDetail(
            id=entry.id,
            kind=entry.kind.value if hasattr(entry.kind, "value") else str(entry.kind),
            kind_label=_kind_label(entry.kind),
            slug=entry.slug,
            name_ru_live=live_ru,
            name_en_live=live_en,
            name_ru_seed=seed_ru,
            name_en_seed=entry.name_en,
            names_differ=live_ru != seed_ru or (live_en or "") != (entry.name_en or ""),
            pending=self._revision_item(pending) if pending else None,
            rules_edition=(
                entry.rules_edition.value
                if hasattr(entry.rules_edition, "value")
                else str(entry.rules_edition)
            ),
            source=entry.source,
            content_layer=layer_val,
            content_layer_label=layer_label,
            parent_id=entry.parent_id,
            parent_name_ru=parent_name,
            is_active=bool(entry.is_active),
            created_at=entry.created_at,
            updated_at=entry.updated_at,
            revisions=rev_items,
            can_edit_draft=can_edit_draft,
            can_accept=can_accept,
            can_reject=can_reject,
            can_withdraw=can_withdraw,
        )

    def upsert_draft(
        self,
        user: User,
        entry_id: UUID,
        payload: AdminCatalogDraftRequest,
    ) -> AdminCatalogDetail:
        is_full, is_mod = self._require_catalog_access(user)
        entry = self.db.get(CatalogEntry, entry_id)
        if entry is None:
            raise NotFoundError("Запись справочника не найдена")

        pending = get_pending(self.db, entry_id)
        if pending is not None:
            if not is_full and pending.author_id != user.id:
                raise AppError(
                    "Чужой черновик нельзя править",
                    code="forbidden",
                    status_code=403,
                )
            old = {"name_ru": pending.name_ru, "name_en": pending.name_en}
            pending.name_ru = payload.name_ru
            # Пустой name_en не затирает: оставляем прежнее значение черновика
            # или None — живое EN не трогаем до принятия.
            if payload.name_en is not None:
                pending.name_en = payload.name_en
            pending.updated_at = datetime.now(UTC)
            self.db.add(pending)
            self.db.commit()
            self.admin.write_audit(
                actor_id=user.id,
                action=ACTION_CATALOG_DRAFT_UPDATE,
                target_type="catalog_entry",
                target_id=str(entry_id),
                meta={"old": old, "new": {"name_ru": pending.name_ru, "name_en": pending.name_en}},
            )
        else:
            if not (is_full or is_mod):
                raise AppError("Нет доступа", code="forbidden", status_code=403)
            now = datetime.now(UTC)
            row = CatalogNameRevision(
                id=uuid.uuid4(),
                catalog_entry_id=entry_id,
                name_ru=payload.name_ru,
                name_en=payload.name_en,
                status=CatalogNameRevisionStatus.pending.value,
                author_id=user.id,
                created_at=now,
                updated_at=now,
            )
            self.db.add(row)
            try:
                self.db.commit()
            except Exception as exc:
                self.db.rollback()
                raise ConflictError(
                    "У этой записи уже есть черновик на проверку",
                    code="draft_exists",
                ) from exc
            self.admin.write_audit(
                actor_id=user.id,
                action=ACTION_CATALOG_DRAFT_CREATE,
                target_type="catalog_entry",
                target_id=str(entry_id),
                meta={"name_ru": payload.name_ru, "name_en": payload.name_en},
            )

        return self.get_entry(user, entry_id)

    def withdraw_draft(self, user: User, entry_id: UUID) -> AdminCatalogDetail:
        is_full, _is_mod = self._require_catalog_access(user)
        pending = get_pending(self.db, entry_id)
        if pending is None:
            raise NotFoundError("Черновика нет")
        if not is_full and pending.author_id != user.id:
            raise AppError(
                "Чужой черновик нельзя отозвать",
                code="forbidden",
                status_code=403,
            )
        old = {"name_ru": pending.name_ru, "name_en": pending.name_en}
        self.db.delete(pending)
        self.db.commit()
        self.admin.write_audit(
            actor_id=user.id,
            action=ACTION_CATALOG_DRAFT_WITHDRAW,
            target_type="catalog_entry",
            target_id=str(entry_id),
            meta={"old": old},
        )
        return self.get_entry(user, entry_id)

    def accept(self, user: User, entry_id: UUID) -> AdminCatalogDetail:
        self.admin.require_full_admin(user)
        entry = self.db.get(CatalogEntry, entry_id)
        if entry is None:
            raise NotFoundError("Запись справочника не найдена")
        pending = get_pending(self.db, entry_id)
        if pending is None:
            raise ConflictError("Нет черновика для принятия", code="no_draft")

        accepted_map = load_live_accepted_map(self.db, [entry.id])
        live_ru, live_en = live_names_for_entry(entry, accepted_map.get(entry.id))

        pending.status = CatalogNameRevisionStatus.accepted.value
        pending.reviewer_id = user.id
        pending.reviewed_at = datetime.now(UTC)
        pending.previous_name_ru = live_ru
        pending.previous_name_en = live_en
        pending.updated_at = datetime.now(UTC)
        # catalog_entries.name_ru / name_en НЕ обновляем.
        self.db.add(pending)
        self.db.commit()
        self.admin.write_audit(
            actor_id=user.id,
            action=ACTION_CATALOG_ACCEPT,
            target_type="catalog_entry",
            target_id=str(entry_id),
            meta={
                "revision_id": str(pending.id),
                "name_ru": pending.name_ru,
                "name_en": pending.name_en,
                "previous_name_ru": live_ru,
                "previous_name_en": live_en,
            },
        )
        return self.get_entry(user, entry_id)

    def reject(self, user: User, entry_id: UUID) -> AdminCatalogDetail:
        self.admin.require_full_admin(user)
        pending = get_pending(self.db, entry_id)
        if pending is None:
            raise ConflictError("Нет черновика для отклонения", code="no_draft")
        old = {"name_ru": pending.name_ru, "name_en": pending.name_en}
        pending.status = CatalogNameRevisionStatus.rejected.value
        pending.reviewer_id = user.id
        pending.reviewed_at = datetime.now(UTC)
        pending.updated_at = datetime.now(UTC)
        self.db.add(pending)
        self.db.commit()
        self.admin.write_audit(
            actor_id=user.id,
            action=ACTION_CATALOG_REJECT,
            target_type="catalog_entry",
            target_id=str(entry_id),
            meta={"revision_id": str(pending.id), "old": old},
        )
        return self.get_entry(user, entry_id)

    def rollback(self, user: User, entry_id: UUID, revision_id: UUID) -> AdminCatalogDetail:
        self.admin.require_full_admin(user)
        entry = self.db.get(CatalogEntry, entry_id)
        if entry is None:
            raise NotFoundError("Запись справочника не найдена")

        accepted_map = load_live_accepted_map(self.db, [entry.id])
        live = accepted_map.get(entry.id)
        if live is None or live.id != revision_id:
            raise ConflictError(
                "Откатить можно только текущую принятую правку",
                code="not_live_revision",
            )

        now = datetime.now(UTC)
        live.status = CatalogNameRevisionStatus.rolled_back.value
        live.reviewer_id = user.id
        live.reviewed_at = now
        live.updated_at = now
        self.db.add(live)

        journal = CatalogNameRevision(
            id=uuid.uuid4(),
            catalog_entry_id=entry_id,
            name_ru=live.name_ru,
            name_en=live.name_en,
            status=CatalogNameRevisionStatus.rolled_back.value,
            author_id=live.author_id,
            reviewer_id=user.id,
            previous_name_ru=live.previous_name_ru,
            previous_name_en=live.previous_name_en,
            created_at=now,
            updated_at=now,
            reviewed_at=now,
        )
        self.db.add(journal)
        self.db.commit()
        self.admin.write_audit(
            actor_id=user.id,
            action=ACTION_CATALOG_ROLLBACK,
            target_type="catalog_entry",
            target_id=str(entry_id),
            meta={
                "revision_id": str(revision_id),
                "journal_id": str(journal.id),
                "rolled_back_name_ru": live.name_ru,
                "restored_name_ru": live.previous_name_ru or entry.name_ru,
            },
        )
        return self.get_entry(user, entry_id)

    def list_name_feedback(
        self,
        user: User,
        *,
        page: int = 1,
        page_size: int = 10,
    ) -> AdminCatalogNameFeedbackPage:
        """Сообщения с темой «Название в справочнике» — без почты, только для раздела справочников."""
        self._require_catalog_access(user)
        page = max(1, page)
        page_size = max(1, min(page_size, 50))

        base = select(FeedbackMessage).where(
            FeedbackMessage.topic == FeedbackTopic.name.value,
        )
        total = int(
            self.db.scalar(
                select(func.count()).select_from(FeedbackMessage).where(
                    FeedbackMessage.topic == FeedbackTopic.name.value,
                )
            )
            or 0
        )
        rows = list(
            self.db.scalars(
                base.order_by(FeedbackMessage.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        status_labels = {
            FeedbackStatus.new.value: "Новое",
            FeedbackStatus.in_progress.value: "В работе",
            FeedbackStatus.closed.value: "Закрыто",
            FeedbackStatus.not_bug.value: "Не ошибка",
        }
        items: list[AdminCatalogNameFeedbackItem] = []
        for row in rows:
            author_name = None
            if not row.is_anonymous and row.user_id:
                author_name = _user_display(self.db, row.user_id)
            items.append(
                AdminCatalogNameFeedbackItem(
                    id=row.id,
                    body=row.body,
                    author_name=author_name,
                    is_anonymous=bool(row.is_anonymous),
                    status=row.status,
                    status_label=status_labels.get(row.status, row.status),
                    created_at=row.created_at,
                )
            )
        return AdminCatalogNameFeedbackPage(items=items, total=total)
