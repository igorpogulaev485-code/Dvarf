"""In-memory pub/sub для живого стола сессии (один процесс API)."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket


class SessionRealtimeHub:
    def __init__(self) -> None:
        self._rooms: dict[UUID, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, session_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._rooms[session_id].add(websocket)

    async def disconnect(self, session_id: UUID, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._rooms.get(session_id)
            if not sockets:
                return
            sockets.discard(websocket)
            if not sockets:
                self._rooms.pop(session_id, None)

    async def broadcast(self, session_id: UUID, message: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._rooms.get(session_id, set()))
        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_json(message)
            except Exception:  # noqa: BLE001
                dead.append(ws)
        for ws in dead:
            await self.disconnect(session_id, ws)


session_hub = SessionRealtimeHub()
