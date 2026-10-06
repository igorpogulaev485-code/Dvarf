from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CurrentUser, DbSession
from app.models.catalog import CatalogKind
from app.schemas.catalog import CatalogEntryListOut, CatalogEntryOut
from app.services.catalog import SMALL_KINDS_WITHOUT_Q, CatalogService

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("", response_model=list[CatalogEntryListOut])
def list_catalog_entries(
    current_user: CurrentUser,
    db: DbSession,
    kind: CatalogKind | None = Query(default=None),
    edition: str | None = Query(default=None, pattern="^(2014|2024)$"),
    q: str | None = Query(default=None, min_length=1, max_length=120),
    parent_id: UUID | None = Query(default=None),
    limit: int = Query(default=40, ge=1, le=100),
    spell_level: int | None = Query(default=None, ge=0, le=9),
    spell_class: str | None = Query(default=None, min_length=2, max_length=40),
) -> list[CatalogEntryListOut]:
    _ = current_user
    allow_without_q = kind in SMALL_KINDS_WITHOUT_Q
    has_query = bool(q and q.strip())
    has_spell_filters = spell_level is not None or bool(spell_class)
    if not allow_without_q and not has_query and not has_spell_filters:
        raise HTTPException(
            status_code=400,
            detail="Укажите q (поиск) или фильтр spell_level/spell_class",
        )
    return CatalogService(db).list_entries(
        kind=kind,
        edition=edition,
        q=q,
        parent_id=parent_id,
        limit=limit,
        spell_level=spell_level,
        spell_class=spell_class,
    )


@router.get("/{entry_id}", response_model=CatalogEntryOut)
def get_catalog_entry(
    entry_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> CatalogEntryOut:
    _ = current_user
    return CatalogService(db).get_entry(entry_id)
