"""In-memory pub/sub для realtime (один процесс API)."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket


class RealtimeHub:
    def __init__(self) -> None:
        self._rooms: dict[UUID, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, room_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._rooms[room_id].add(websocket)

    async def disconnect(self, room_id: UUID, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._rooms.get(room_id)
            if not sockets:
                return
            sockets.discard(websocket)
            if not sockets:
                self._rooms.pop(room_id, None)

    async def broadcast(self, room_id: UUID, message: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._rooms.get(room_id, set()))
        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_json(message)
            except Exception:  # noqa: BLE001
                dead.append(ws)
        for ws in dead:
            await self.disconnect(room_id, ws)


session_hub = RealtimeHub()
lobby_hub = RealtimeHub()
