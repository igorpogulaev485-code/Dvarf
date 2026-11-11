"""Локальные сокеты комнаты. Между воркерами сообщение идёт через LISTEN/NOTIFY."""

from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger("app.realtime")


class RealtimeHub:
    def __init__(self, name: str) -> None:
        self.name = name
        self._rooms: dict[UUID, set[WebSocket]] = defaultdict(set)
        self._users: dict[WebSocket, UUID] = {}
        self._lock = asyncio.Lock()

    async def connect(
        self,
        room_id: UUID,
        websocket: WebSocket,
        *,
        user_id: UUID | None = None,
    ) -> None:
        await websocket.accept()
        async with self._lock:
            self._rooms[room_id].add(websocket)
            if user_id is not None:
                self._users[websocket] = user_id

    async def disconnect(self, room_id: UUID, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._rooms.get(room_id)
            if sockets:
                sockets.discard(websocket)
                if not sockets:
                    self._rooms.pop(room_id, None)
            self._users.pop(websocket, None)

    async def broadcast(
        self,
        room_id: UUID,
        message: dict[str, Any],
        *,
        only_user_ids: set[UUID] | None = None,
    ) -> None:
        """Опубликовать в общую шину. Локальные сокеты получат копию от слушателя."""
        from app.realtime.bus import publish_now

        try:
            await publish_now(self.name, room_id, message, only_user_ids)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "realtime notify failed (%s); delivering to local sockets only",
                type(exc).__name__,
            )
            await self.deliver_local(room_id, message, only_user_ids=only_user_ids)

    async def deliver_local(
        self,
        room_id: UUID,
        message: dict[str, Any],
        *,
        only_user_ids: set[UUID] | None = None,
    ) -> None:
        async with self._lock:
            sockets = list(self._rooms.get(room_id, set()))
            users = {ws: uid for ws, uid in self._users.items() if ws in sockets}
        dead: list[WebSocket] = []
        for ws in sockets:
            if only_user_ids is not None and users.get(ws) not in only_user_ids:
                continue
            try:
                await ws.send_json(message)
            except Exception:  # noqa: BLE001
                dead.append(ws)
        for ws in dead:
            await self.disconnect(room_id, ws)

    async def nudge_local(self) -> None:
        """После обрыва слушателя попросить свои вкладки перезапросить состояние."""
        async with self._lock:
            rooms = list(self._rooms)
        for room_id in rooms:
            if self.name == "session":
                message: dict[str, Any] = {
                    "type": "session_changed",
                    "session_id": str(room_id),
                }
            else:
                message = {"type": "lobby_resync"}
            await self.deliver_local(room_id, message)


session_hub = RealtimeHub("session")
lobby_hub = RealtimeHub("lobby")
