from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.catalog import CatalogKind, CatalogRulesEdition


class CatalogEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: CatalogKind
    slug: str
    name_ru: str
    name_en: str | None = None
    rules_edition: CatalogRulesEdition
    parent_id: UUID | None = None
    source: str | None = None
    external_ref: dict[str, Any] | None = None
    data: dict[str, Any] = Field(default_factory=dict)
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
