from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.catalog import CatalogEntry, CatalogKind
from app.repositories.catalog import CatalogRepository
from app.schemas.catalog import CatalogEntryListOut, CatalogEntryOut

# Tiny dictionaries may be fetched without a text query.
SMALL_KINDS_WITHOUT_Q = frozenset({CatalogKind.condition, CatalogKind.alignment})

SPELL_PREVIEW_KEYS = (
    "level",
    "classes",
    "casting_time",
    "range",
    "attack_or_save",
    "damage",
    "concentration",
)


def to_out(entry: CatalogEntry) -> CatalogEntryOut:
    return CatalogEntryOut.model_validate(entry)


def build_preview(entry: CatalogEntry) -> dict[str, Any]:
    data = entry.data or {}
    if entry.kind == CatalogKind.spell:
        return {key: data[key] for key in SPELL_PREVIEW_KEYS if key in data}
    if entry.kind in {CatalogKind.weapon, CatalogKind.armor, CatalogKind.item}:
        preview: dict[str, Any] = {}
        for key in ("damage", "damage_type", "weight_lb", "armor_kind", "base_ac", "category"):
            if key in data:
                preview[key] = data[key]
        return preview
    return {}


def to_list_out(entry: CatalogEntry) -> CatalogEntryListOut:
    return CatalogEntryListOut(
        id=entry.id,
        kind=entry.kind,
        slug=entry.slug,
        name_ru=entry.name_ru,
        name_en=entry.name_en,
        rules_edition=entry.rules_edition,
        parent_id=entry.parent_id,
        sort_order=entry.sort_order,
        preview=build_preview(entry),
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
        limit: int | None = 40,
        spell_level: int | None = None,
        spell_class: str | None = None,
    ) -> list[CatalogEntryListOut]:
        return [
            to_list_out(item)
            for item in self.catalog.list_entries(
                kind=kind,
                edition=edition,
                q=q,
                parent_id=parent_id,
                limit=limit,
                spell_level=spell_level,
                spell_class=spell_class,
            )
        ]

    def get_entry(self, entry_id: UUID) -> CatalogEntryOut:
        entry = self.catalog.get_by_id(entry_id)
        if entry is None or not entry.is_active:
            raise NotFoundError("Запись справочника не найдена")
        return to_out(entry)
