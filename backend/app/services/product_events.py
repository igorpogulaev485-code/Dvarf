"""Безопасная запись продуктовых событий (ADM-03).

Ошибка записи никогда не должна ломать основное действие: ловим исключение,
пишем в лог и продолжаем. В одном запросе один тип события — без дублей.
"""

from __future__ import annotations

import logging
import uuid
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.product_event import ProductEvent, ProductEventType

logger = logging.getLogger(__name__)

_VALID = {item.value for item in ProductEventType}


def record_product_event(
    db: Session,
    event_type: str | ProductEventType,
    *,
    user_id: uuid.UUID | None = None,
    rules_edition: str | None = None,
) -> None:
    """Записать одно событие. Сбой — только в лог, без проброса наружу."""
    try:
        kind = event_type.value if isinstance(event_type, ProductEventType) else str(event_type)
        if kind not in _VALID:
            logger.warning("product_event: неизвестный тип %s", kind)
            return
        edition: str | None = None
        if kind == ProductEventType.character_created.value and rules_edition:
            edition = str(rules_edition)
        db.add(
            ProductEvent(
                id=uuid.uuid4(),
                event_type=kind,
                user_id=user_id,
                rules_edition=edition,
            )
        )
        db.commit()
    except Exception:
        logger.exception("product_event: не удалось записать %s", event_type)
        try:
            db.rollback()
        except Exception:
            logger.exception("product_event: rollback после ошибки записи")


def record_product_events(
    db: Session,
    events: Iterable[tuple[str | ProductEventType, uuid.UUID | None, str | None]],
) -> None:
    """Записать несколько разных событий одним commit (без дублей одного типа)."""
    try:
        seen: set[str] = set()
        for event_type, user_id, rules_edition in events:
            kind = event_type.value if isinstance(event_type, ProductEventType) else str(event_type)
            if kind not in _VALID or kind in seen:
                continue
            seen.add(kind)
            edition: str | None = None
            if kind == ProductEventType.character_created.value and rules_edition:
                edition = str(rules_edition)
            db.add(
                ProductEvent(
                    id=uuid.uuid4(),
                    event_type=kind,
                    user_id=user_id,
                    rules_edition=edition,
                )
            )
        if seen:
            db.commit()
    except Exception:
        logger.exception("product_event: не удалось записать пачку событий")
        try:
            db.rollback()
        except Exception:
            logger.exception("product_event: rollback после ошибки пачки")
