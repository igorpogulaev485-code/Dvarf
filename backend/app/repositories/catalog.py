from __future__ import annotations

from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.catalog import CatalogEntry, CatalogKind, CatalogRulesEdition


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
            stmt = stmt.where(
                or_(
                    CatalogEntry.name_ru.ilike(pattern),
                    CatalogEntry.name_en.ilike(pattern),
                    CatalogEntry.slug.ilike(pattern),
                )
            )
        stmt = stmt.order_by(CatalogEntry.sort_order.asc(), CatalogEntry.name_ru.asc())
        # Бестиарий большой (~2380) — без q не тащим весь каталог в combobox.
        effective_limit = limit
        if effective_limit is None and kind == CatalogKind.bestiary and not q:
            effective_limit = 40
        if effective_limit is not None:
            stmt = stmt.limit(max(1, min(int(effective_limit), 500)))
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
