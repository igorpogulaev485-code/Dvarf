from __future__ import annotations

from uuid import UUID

from sqlalchemy import and_, exists, func, or_, select
from sqlalchemy.orm import Session

from app.models.catalog import CatalogEntry, CatalogKind, CatalogRulesEdition
from app.models.catalog_name_revision import (
    CatalogNameRevision,
    CatalogNameRevisionStatus,
)


class CatalogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_entries(
        self,
        *,
        kind: CatalogKind | None = None,
        edition: str | None = None,
        q: str | None = None,
        parent_id: UUID | None = None,
        include_inactive: bool = False,
        limit: int | None = None,
        search_live_names: bool = False,
    ) -> list[CatalogEntry]:
        stmt = select(CatalogEntry)
        if not include_inactive:
            stmt = stmt.where(CatalogEntry.is_active.is_(True))
        if kind is not None:
            stmt = stmt.where(CatalogEntry.kind == kind)
        if parent_id is not None:
            stmt = stmt.where(CatalogEntry.parent_id == parent_id)
        if edition:
            stmt = stmt.where(
                or_(
                    CatalogEntry.rules_edition == CatalogRulesEdition(edition),
                    CatalogEntry.rules_edition == CatalogRulesEdition.both,
                )
            )
        if q:
            pattern = f"%{q.strip()}%"
            seed_match = or_(
                CatalogEntry.name_ru.ilike(pattern),
                CatalogEntry.name_en.ilike(pattern),
                CatalogEntry.slug.ilike(pattern),
            )
            if search_live_names:
                # Только последняя принятая правка; черновик в поиск не входит.
                latest_accepted = (
                    select(
                        CatalogNameRevision.catalog_entry_id.label("entry_id"),
                        func.max(CatalogNameRevision.reviewed_at).label("max_reviewed"),
                    )
                    .where(
                        CatalogNameRevision.status
                        == CatalogNameRevisionStatus.accepted.value
                    )
                    .group_by(CatalogNameRevision.catalog_entry_id)
                    .subquery()
                )
                live_match = exists(
                    select(1)
                    .select_from(CatalogNameRevision)
                    .join(
                        latest_accepted,
                        and_(
                            CatalogNameRevision.catalog_entry_id
                            == latest_accepted.c.entry_id,
                            CatalogNameRevision.reviewed_at
                            == latest_accepted.c.max_reviewed,
                        ),
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
                stmt = stmt.where(or_(seed_match, live_match))
            else:
                stmt = stmt.where(seed_match)
        stmt = stmt.order_by(CatalogEntry.sort_order.asc(), CatalogEntry.name_ru.asc())
        # Бестиарий большой (~2380) — без q не тащим весь каталог в combobox.
        effective_limit = limit
        if effective_limit is None and kind == CatalogKind.bestiary and not q:
            effective_limit = 40
        if effective_limit is not None:
            stmt = stmt.limit(max(1, min(int(effective_limit), 500)))
        return list(self.db.scalars(stmt).all())

    def list_bestiary_for_generator(
        self,
        *,
        edition: str = "2014",
    ) -> list[CatalogEntry]:
        """Полный активный бестиарий для B8 (без лимита combobox)."""
        stmt = (
            select(CatalogEntry)
            .where(CatalogEntry.is_active.is_(True))
            .where(CatalogEntry.kind == CatalogKind.bestiary)
            .where(
                or_(
                    CatalogEntry.rules_edition == CatalogRulesEdition(edition),
                    CatalogEntry.rules_edition == CatalogRulesEdition.both,
                )
            )
            .order_by(CatalogEntry.name_ru.asc())
        )
        return list(self.db.scalars(stmt).all())

    def get_by_id(self, entry_id: UUID) -> CatalogEntry | None:
        return self.db.get(CatalogEntry, entry_id)

    def get_by_kind_slug(
        self,
        *,
        kind: CatalogKind,
        slug: str,
        edition: str = "2014",
    ) -> CatalogEntry | None:
        stmt = (
            select(CatalogEntry)
            .where(CatalogEntry.kind == kind)
            .where(CatalogEntry.slug == slug)
            .where(
                or_(
                    CatalogEntry.rules_edition == CatalogRulesEdition(edition),
                    CatalogEntry.rules_edition == CatalogRulesEdition.both,
                )
            )
            .where(CatalogEntry.is_active.is_(True))
            .limit(1)
        )
        return self.db.scalars(stmt).first()
