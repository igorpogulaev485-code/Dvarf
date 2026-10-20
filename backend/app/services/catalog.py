from __future__ import annotations

from uuid import UUID

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.dnd.content_layer import layer_for_source
from app.models.catalog import CatalogEntry, CatalogKind
from app.repositories.catalog import CatalogRepository
from app.schemas.catalog import CatalogEntryOut


def to_out(entry: CatalogEntry) -> CatalogEntryOut:
    data = entry.data if isinstance(entry.data, dict) else {}
    kind_val = entry.kind.value if hasattr(entry.kind, "value") else str(entry.kind)
    layer = layer_for_source(
        entry.source,
        kind=kind_val,
        slug=entry.slug,
        data=data,
    )
    # B2 anti-mirror: never expose ttg/dnd.su (or any) external_ref publicly.
    # Rows in DB/JSON may still carry legacy refs for archaeology — not in API.
    return CatalogEntryOut.model_validate(
        {
            "id": entry.id,
            "kind": entry.kind,
            "slug": entry.slug,
            "name_ru": entry.name_ru or entry.slug,
            "name_en": entry.name_en,
            "rules_edition": entry.rules_edition,
            "parent_id": entry.parent_id,
            "source": entry.source,
            "external_ref": None,
            "data": data,
            "content_layer": layer,
            "sort_order": entry.sort_order or 0,
            "is_active": bool(entry.is_active),
            "created_at": entry.created_at,
            "updated_at": entry.updated_at,
        }
    )


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
        rows: list[CatalogEntryOut] = []
        for item in self.catalog.list_entries(
            kind=kind,
            edition=edition,
            q=q,
            parent_id=parent_id,
        ):
            # One bad spell row must not 500 the whole grimoire.
            try:
                rows.append(to_out(item))
            except (ValidationError, TypeError, ValueError):
                continue
        return rows

    def get_entry(self, entry_id: UUID) -> CatalogEntryOut:
        entry = self.catalog.get_by_id(entry_id)
        if entry is None or not entry.is_active:
            raise NotFoundError("Запись справочника не найдена")
        return to_out(entry)
