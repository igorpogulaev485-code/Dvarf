"""W-API-07: снимки confirm / last-applied для diff и undo."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.world_import import WorldImportConfirmation


def confirmation_applied(snapshot: dict[str, Any] | None) -> dict[str, Any]:
    """Секция applied из снимка confirm (W-API-07) или пустой dict."""
    if not isinstance(snapshot, dict):
        return {}
    applied = snapshot.get("applied")
    return applied if isinstance(applied, dict) else {}


def pages_index_from_applied(applied: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """source_key → запись страницы из applied.pages."""
    out: dict[str, dict[str, Any]] = {}
    for row in applied.get("pages") or []:
        if not isinstance(row, dict):
            continue
        key = row.get("source_key")
        if isinstance(key, str) and key:
            out[key] = row
    return out


def creatures_index_from_applied(applied: dict[str, Any]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for row in applied.get("creatures") or []:
        if not isinstance(row, dict):
            continue
        key = row.get("import_key")
        if isinstance(key, str) and key:
            out[key] = row
    return out


def artifacts_index_from_applied(applied: dict[str, Any]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for row in applied.get("artifacts") or []:
        if not isinstance(row, dict):
            continue
        key = row.get("import_key")
        if isinstance(key, str) and key:
            out[key] = row
    return out


def offices_index_from_applied(applied: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    """seat_source_key → список офисных записей (как в YAML/каноне)."""
    out: dict[str, list[dict[str, Any]]] = {}
    for row in applied.get("offices") or []:
        if not isinstance(row, dict):
            continue
        seat = row.get("seat_source_key")
        if not isinstance(seat, str) or not seat:
            continue
        out.setdefault(seat, []).append(row)
    return out


def load_active_confirmations(db: Session, setting_id: UUID) -> list[WorldImportConfirmation]:
    """Подтверждения сеттинга без undo, новые сверху."""
    rows = list(
        db.scalars(
            select(WorldImportConfirmation)
            .where(
                WorldImportConfirmation.setting_id == setting_id,
                WorldImportConfirmation.undone_at.is_(None),
            )
            .order_by(WorldImportConfirmation.confirmed_at.desc())
        ).all()
    )
    # FakeDB в тестах игнорирует WHERE / entity — берём только подтверждения.
    active = [
        r
        for r in rows
        if isinstance(r, WorldImportConfirmation)
        and r.setting_id == setting_id
        and getattr(r, "undone_at", None) is None
    ]
    active.sort(key=lambda r: r.confirmed_at or r.id, reverse=True)
    return active


def merge_last_applied(db: Session, setting_id: UUID) -> dict[str, Any]:
    """Сводка последнего применённого контента по ключам (новее перекрывает старое)."""
    pages: dict[str, dict[str, Any]] = {}
    creatures: dict[str, dict[str, Any]] = {}
    artifacts: dict[str, dict[str, Any]] = {}
    offices: dict[str, list[dict[str, Any]]] = {}
    for conf in reversed(load_active_confirmations(db, setting_id)):
        applied = confirmation_applied(conf.snapshot_before)
        pages.update(pages_index_from_applied(applied))
        creatures.update(creatures_index_from_applied(applied))
        artifacts.update(artifacts_index_from_applied(applied))
        for seat, rows in offices_index_from_applied(applied).items():
            offices[seat] = list(rows)
    return {
        "pages": pages,
        "creatures": creatures,
        "artifacts": artifacts,
        "offices": offices,
    }


def normalize_office_signature(row: dict[str, Any]) -> tuple[Any, Any, Any, Any]:
    return (
        row.get("office_title") or row.get("title"),
        row.get("succession_order") if row.get("succession_order") is not None else row.get("order"),
        row.get("office_holder_status") or row.get("status"),
        row.get("holder_source_key") or row.get("from_source_key") or row.get("name"),
    )


def offices_equal(a: list[dict[str, Any]], b: list[dict[str, Any]]) -> bool:
    sa = sorted(normalize_office_signature(x) for x in a)
    sb = sorted(normalize_office_signature(x) for x in b)
    return sa == sb
