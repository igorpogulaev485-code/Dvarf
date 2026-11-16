from __future__ import annotations

from uuid import UUID

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.dnd.content_layer import layer_for_source
from app.models.catalog import CatalogEntry, CatalogKind
from app.repositories.catalog import CatalogRepository
from app.schemas.catalog import CatalogEntryOut
from app.services.catalog_names import live_names_for_entry, load_live_accepted_map


def to_out(
    entry: CatalogEntry,
    *,
    live_name_ru: str | None = None,
    live_name_en: str | None = None,
    apply_live: bool = True,
    accepted_map: dict[UUID, object] | None = None,
) -> CatalogEntryOut:
    data = entry.data if isinstance(entry.data, dict) else {}
    kind_val = entry.kind.value if hasattr(entry.kind, "value") else str(entry.kind)
    layer = layer_for_source(
        entry.source,
        kind=kind_val,
        slug=entry.slug,
        data=data,
    )
    if live_name_ru is not None:
        name_ru = live_name_ru
        name_en = live_name_en
    elif apply_live and accepted_map is not None:
        name_ru, name_en = live_names_for_entry(entry, accepted_map.get(entry.id))  # type: ignore[arg-type]
    elif apply_live:
        # Без карты — сид; вызывающий list/get обязан передать карту или resolve.
        name_ru = entry.name_ru or entry.slug
        name_en = entry.name_en
    else:
        name_ru = entry.name_ru or entry.slug
        name_en = entry.name_en

    # B2 anti-mirror: never expose ttg/dnd.su (or any) external_ref publicly.
    return CatalogEntryOut.model_validate(
        {
            "id": entry.id,
            "kind": entry.kind,
            "slug": entry.slug,
            "name_ru": name_ru,
            "name_en": name_en,
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
        items = self.catalog.list_entries(
            kind=kind,
            edition=edition,
            q=q,
            parent_id=parent_id,
            search_live_names=True,
        )
        accepted_map = load_live_accepted_map(self.db, [item.id for item in items])
        rows: list[CatalogEntryOut] = []
        for item in items:
            try:
                rows.append(to_out(item, accepted_map=accepted_map))
            except (ValidationError, TypeError, ValueError):
                continue
        return rows

    def get_entry(self, entry_id: UUID) -> CatalogEntryOut:
        entry = self.catalog.get_by_id(entry_id)
        if entry is None or not entry.is_active:
            raise NotFoundError("Запись справочника не найдена")
        accepted_map = load_live_accepted_map(self.db, [entry.id])
        return to_out(entry, accepted_map=accepted_map)
