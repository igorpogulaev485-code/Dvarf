from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.catalog import CatalogEntry, CatalogKind
from app.repositories.catalog import CatalogRepository
from app.schemas.catalog import CatalogEntryOut


def to_out(entry: CatalogEntry) -> CatalogEntryOut:
    return CatalogEntryOut.model_validate(entry)


class CatalogService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.catalog = CatalogRepository(db)

    def list_entries(
        self,
        *,
        kind: CatalogKind | None = None,
        edition: str | None = None,
        q: str | None = None,
        parent_id: UUID | None = None,
    ) -> list[CatalogEntryOut]:
        return [
            to_out(item)
            for item in self.catalog.list_entries(
                kind=kind,
                edition=edition,
                q=q,
                parent_id=parent_id,
            )
        ]

    def get_entry(self, entry_id: UUID) -> CatalogEntryOut:
        entry = self.catalog.get_by_id(entry_id)
        if entry is None or not entry.is_active:
            raise NotFoundError("Запись справочника не найдена")
        return to_out(entry)
