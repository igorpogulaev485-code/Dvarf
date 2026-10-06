from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.models.catalog import CatalogKind
from app.schemas.catalog import CatalogEntryOut
from app.services.catalog import CatalogService

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("", response_model=list[CatalogEntryOut])
def list_catalog_entries(
    current_user: CurrentUser,
    db: DbSession,
    kind: CatalogKind | None = Query(default=None),
    edition: str | None = Query(default=None, pattern="^(2014|2024)$"),
    q: str | None = Query(default=None, min_length=1, max_length=120),
    parent_id: UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
) -> list[CatalogEntryOut]:
    _ = current_user
    return CatalogService(db).list_entries(
        kind=kind,
        edition=edition,
        q=q,
        parent_id=parent_id,
        limit=limit,
    )


@router.get("/{entry_id}", response_model=CatalogEntryOut)
def get_catalog_entry(
    entry_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> CatalogEntryOut:
    _ = current_user
    return CatalogService(db).get_entry(entry_id)
