"""ADM-05: живые имена справочника поверх сида (принятые правки).

Черновик (pending) в публичный API и поиск не попадает.
Сидовые catalog_entries.name_ru / name_en при принятии не обновляются.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.catalog import CatalogEntry
from app.models.catalog_name_revision import (
    CatalogNameRevision,
    CatalogNameRevisionStatus,
)


def load_live_accepted_map(
    db: Session,
    entry_ids: list[UUID],
) -> dict[UUID, CatalogNameRevision]:
    """Для каждой записи — последняя принятая (не откатанная) правка."""
    if not entry_ids:
        return {}
    rows = list(
        db.scalars(
            select(CatalogNameRevision)
            .where(
                CatalogNameRevision.catalog_entry_id.in_(entry_ids),
                CatalogNameRevision.status == CatalogNameRevisionStatus.accepted.value,
            )
            .order_by(
                CatalogNameRevision.catalog_entry_id.asc(),
                CatalogNameRevision.reviewed_at.desc(),
                CatalogNameRevision.created_at.desc(),
            )
        ).all()
    )
    out: dict[UUID, CatalogNameRevision] = {}
    for row in rows:
        if row.catalog_entry_id not in out:
            out[row.catalog_entry_id] = row
    return out


def live_names_for_entry(
    entry: CatalogEntry,
    accepted: CatalogNameRevision | None,
) -> tuple[str, str | None]:
    """Русское и английское «живое» имя для игрока."""
    seed_ru = getattr(entry, "name_ru", None) or getattr(entry, "slug", "") or ""
    seed_en = getattr(entry, "name_en", None)
    if accepted is not None:
        name_ru = (accepted.name_ru or "").strip() or seed_ru
        # Пустой name_en в правке не затирает живое английское (сид / предыдущее).
        if accepted.name_en is not None and str(accepted.name_en).strip():
            name_en: str | None = str(accepted.name_en).strip()
        else:
            name_en = seed_en
        return name_ru, name_en
    return seed_ru, seed_en


def resolve_live_names(db: Session, entry: CatalogEntry) -> tuple[str, str | None]:
    accepted_map = load_live_accepted_map(db, [entry.id])
    return live_names_for_entry(entry, accepted_map.get(entry.id))


def get_pending(
    db: Session,
    entry_id: UUID,
) -> CatalogNameRevision | None:
    return db.scalar(
        select(CatalogNameRevision).where(
            CatalogNameRevision.catalog_entry_id == entry_id,
            CatalogNameRevision.status == CatalogNameRevisionStatus.pending.value,
        )
    )


def list_revisions_for_entry(
    db: Session,
    entry_id: UUID,
) -> list[CatalogNameRevision]:
    return list(
        db.scalars(
            select(CatalogNameRevision)
            .where(CatalogNameRevision.catalog_entry_id == entry_id)
            .order_by(
                CatalogNameRevision.created_at.desc(),
                CatalogNameRevision.id.desc(),
            )
        ).all()
    )
