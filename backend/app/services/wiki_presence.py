"""W-02: «Сейчас правит …» — in-memory heartbeat по лобби-сокету."""

from __future__ import annotations

import time
from dataclasses import dataclass
from threading import Lock
from uuid import UUID

# Секунды без heartbeat → считаем, что редактор ушёл.
STALE_AFTER_SEC = 45.0


@dataclass
class WikiEditorPresence:
    lobby_id: UUID
    page_id: UUID
    user_id: UUID
    display_name: str
    updated_at: float


_lock = Lock()
# (lobby_id, page_id, user_id) → presence
_store: dict[tuple[UUID, UUID, UUID], WikiEditorPresence] = {}


def touch(
    *,
    lobby_id: UUID,
    page_id: UUID,
    user_id: UUID,
    display_name: str,
) -> WikiEditorPresence:
    key = (lobby_id, page_id, user_id)
    row = WikiEditorPresence(
        lobby_id=lobby_id,
        page_id=page_id,
        user_id=user_id,
        display_name=(display_name or "Мастер")[:120],
        updated_at=time.monotonic(),
    )
    with _lock:
        _store[key] = row
        _purge_locked()
    return row


def clear(*, lobby_id: UUID, page_id: UUID, user_id: UUID) -> None:
    key = (lobby_id, page_id, user_id)
    with _lock:
        _store.pop(key, None)


def clear_user_lobby(*, lobby_id: UUID, user_id: UUID) -> list[UUID]:
    """Снять все присутствия юзера в лобби; вернуть page_id, которые опустели для него."""
    cleared: list[UUID] = []
    with _lock:
        keys = [k for k in _store if k[0] == lobby_id and k[2] == user_id]
        for key in keys:
            cleared.append(key[1])
            _store.pop(key, None)
    return cleared


def editors_for_page(*, lobby_id: UUID, page_id: UUID) -> list[WikiEditorPresence]:
    now = time.monotonic()
    with _lock:
        _purge_locked(now=now)
        rows = [
            row
            for key, row in _store.items()
            if key[0] == lobby_id and key[1] == page_id and now - row.updated_at <= STALE_AFTER_SEC
        ]
    rows.sort(key=lambda r: r.updated_at)
    return rows


def editors_for_lobby(*, lobby_id: UUID) -> list[WikiEditorPresence]:
    now = time.monotonic()
    with _lock:
        _purge_locked(now=now)
        rows = [
            row
            for key, row in _store.items()
            if key[0] == lobby_id and now - row.updated_at <= STALE_AFTER_SEC
        ]
    return rows


def _purge_locked(*, now: float | None = None) -> None:
    ts = time.monotonic() if now is None else now
    dead = [k for k, row in _store.items() if ts - row.updated_at > STALE_AFTER_SEC]
    for k in dead:
        _store.pop(k, None)
