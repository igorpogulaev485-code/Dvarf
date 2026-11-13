"""Общая шина воркеров: PostgreSQL LISTEN/NOTIFY, канал dvarf_rt.

В payload только короткий сигнал или небольшое событие. Полный SessionDetail
и тексты личных писем/заметок сюда не кладутся (лимит NOTIFY — 8000 байт).
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from collections.abc import Awaitable, Callable
from typing import Any, Protocol
from uuid import UUID

from app.core.config import settings

logger = logging.getLogger("app.realtime")

CHANNEL = "dvarf_rt"
NOTIFY_MAX_BYTES = 7000
_CHANNEL_RE = re.compile(r"^[a-z][a-z0-9_]{0,40}$")

NotifyHandler = Callable[[str], Awaitable[None]]
ReadyCallback = Callable[[], None]


def raw_psycopg_dsn(url: str | None = None) -> str:
    """Убрать драйвер SQLAlchemy (+psycopg) для сырого соединения. Не логировать."""
    raw = settings.database_url if url is None else url
    if "://" not in raw:
        return raw
    scheme, rest = raw.split("://", 1)
    scheme = scheme.replace("+psycopg", "")
    return f"{scheme}://{rest}"


def _fallback_message(hub: str, room_id: UUID, message: dict[str, Any]) -> dict[str, Any]:
    if hub == "session":
        return {"type": "session_changed", "session_id": str(room_id)}
    kind = str(message.get("type") or "")
    if kind == "chat_message" or kind.startswith("chat"):
        return {"type": "chat_refresh"}
    if kind.startswith("whisper"):
        return {"type": "whisper_changed"}
    if kind.startswith("note"):
        return {"type": "notes_changed"}
    if kind.startswith("journal"):
        return {"type": "journal_changed"}
    return {"type": "letters_changed"}


def encode_notification(
    hub: str,
    room_id: UUID,
    message: dict[str, Any],
    only_user_ids: set[UUID] | None,
) -> str:
    body: dict[str, Any] = {
        "hub": hub,
        "room": str(room_id),
        "message": message,
    }
    if only_user_ids is not None:
        body["only_user_ids"] = sorted(str(uid) for uid in only_user_ids)
    payload = json.dumps(body, ensure_ascii=False, separators=(",", ":"))
    if len(payload.encode("utf-8")) <= NOTIFY_MAX_BYTES:
        return payload
    body["message"] = _fallback_message(hub, room_id, message)
    return json.dumps(body, ensure_ascii=False, separators=(",", ":"))


def parse_notification(
    payload: str,
) -> tuple[str, UUID, dict[str, Any], set[UUID] | None] | None:
    try:
        data = json.loads(payload)
        hub = data["hub"]
        room_id = UUID(str(data["room"]))
        message = data["message"]
        if hub not in {"session", "lobby"} or not isinstance(message, dict):
            return None
        raw_ids = data.get("only_user_ids")
        only: set[UUID] | None = None
        if isinstance(raw_ids, list):
            only = {UUID(str(item)) for item in raw_ids}
        return hub, room_id, message, only
    except (TypeError, ValueError, KeyError):
        return None


class NotifyTransport(Protocol):
    async def publish(self, payload: str) -> None: ...

    async def listen(
        self,
        handler: NotifyHandler,
        stop: asyncio.Event,
        on_ready: ReadyCallback | None = None,
    ) -> None: ...


class MemoryTransport:
    """Общий вентилятор для теста двух процессов: publish видят все слушатели."""

    def __init__(self) -> None:
        self._handlers: list[NotifyHandler] = []
        self._lock = asyncio.Lock()

    async def publish(self, payload: str) -> None:
        async with self._lock:
            handlers = list(self._handlers)
        for handler in handlers:
            await handler(payload)

    async def listen(
        self,
        handler: NotifyHandler,
        stop: asyncio.Event,
        on_ready: ReadyCallback | None = None,
    ) -> None:
        async with self._lock:
            self._handlers.append(handler)
        try:
            if on_ready is not None:
                on_ready()
            await stop.wait()
        finally:
            async with self._lock:
                if handler in self._handlers:
                    self._handlers.remove(handler)


class PostgresTransport:
    def __init__(self, dsn: str, channel: str = CHANNEL) -> None:
        if not _CHANNEL_RE.fullmatch(channel):
            raise ValueError("invalid realtime channel")
        self._dsn = dsn
        self._channel = channel
        self._pub: Any = None
        self._pub_lock = asyncio.Lock()

    async def publish(self, payload: str) -> None:
        import psycopg

        async with self._pub_lock:
            last_error: Exception | None = None
            for attempt in range(2):
                try:
                    if self._pub is None or self._pub.closed:
                        self._pub = await psycopg.AsyncConnection.connect(
                            self._dsn,
                            autocommit=True,
                            application_name="dvarf-realtime",
                            connect_timeout=10,
                        )
                    await self._pub.execute(
                        "SELECT pg_notify(%s, %s)",
                        (self._channel, payload),
                    )
                    return
                except Exception as exc:  # noqa: BLE001
                    last_error = exc
                    if self._pub is not None:
                        try:
                            await self._pub.close()
                        except Exception:  # noqa: BLE001
                            pass
                    self._pub = None
                    if attempt == 0:
                        continue
            if last_error is None:
                raise ConnectionError("realtime notify failed")
            raise last_error

    async def listen(
        self,
        handler: NotifyHandler,
        stop: asyncio.Event,
        on_ready: ReadyCallback | None = None,
    ) -> None:
        import psycopg
        from psycopg import sql

        conn = await psycopg.AsyncConnection.connect(
            self._dsn,
            autocommit=True,
            application_name="dvarf-realtime-listen",
            connect_timeout=10,
        )
        try:
            await conn.execute(sql.SQL("LISTEN {}").format(sql.Identifier(self._channel)))
            if on_ready is not None:
                on_ready()
            while not stop.is_set():
                async for notify in conn.notifies(timeout=1.0, stop_after=1):
                    if stop.is_set():
                        return
                    if notify.payload:
                        await handler(notify.payload)
        finally:
            await conn.close()

    async def aclose(self) -> None:
        async with self._pub_lock:
            if self._pub is not None:
                try:
                    await self._pub.close()
                except Exception:  # noqa: BLE001
                    pass
                self._pub = None


class RealtimeListener:
    def __init__(
        self,
        hubs: dict[str, Any],
        transport: NotifyTransport,
        *,
        initial_backoff: float = 1.0,
        max_backoff: float = 30.0,
    ) -> None:
        self._hubs = hubs
        self._transport = transport
        self.initial_backoff = initial_backoff
        self.max_backoff = max_backoff
        self._delay = initial_backoff
        self._stop = asyncio.Event()
        self._task: asyncio.Task[None] | None = None
        self._ever_ready = False
        self.ready = asyncio.Event()

    async def start(self) -> None:
        if self._task is not None:
            return
        self._task = asyncio.create_task(self._run(), name="realtime-listen")

    async def stop(self) -> None:
        self._stop.set()
        task = self._task
        self._task = None
        if task is None:
            return
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    def _arm_ready(self) -> None:
        reconnect = self._ever_ready
        self._ever_ready = True
        self._delay = self.initial_backoff
        self.ready.set()
        if reconnect:
            asyncio.get_running_loop().create_task(self._nudge_local())

    async def _nudge_local(self) -> None:
        try:
            for hub in self._hubs.values():
                await hub.nudge_local()
        except Exception as exc:  # noqa: BLE001
            logger.warning("realtime resync nudge failed (%s)", type(exc).__name__)

    async def _on_notify(self, payload: str) -> None:
        parsed = parse_notification(payload)
        if parsed is None:
            logger.warning("realtime notify ignored (invalid payload)")
            return
        hub_name, room_id, message, only_user_ids = parsed
        hub = self._hubs.get(hub_name)
        if hub is None:
            return
        await hub.deliver_local(room_id, message, only_user_ids=only_user_ids)

    async def _run(self) -> None:
        while not self._stop.is_set():
            try:
                await self._transport.listen(self._on_notify, self._stop, on_ready=self._arm_ready)
                if self._stop.is_set():
                    return
                raise ConnectionError("listen ended")
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001
                self.ready.clear()
                if self._stop.is_set():
                    return
                logger.warning(
                    "realtime listener disconnected (%s), retry in %.1fs",
                    type(exc).__name__,
                    self._delay,
                )
                try:
                    await asyncio.wait_for(self._stop.wait(), timeout=self._delay)
                    return
                except asyncio.TimeoutError:
                    pass
                self._delay = min(self._delay * 2, self.max_backoff)


_transport: NotifyTransport | None = None
_listener: RealtimeListener | None = None


def set_transport(transport: NotifyTransport | None) -> None:
    global _transport
    _transport = transport


def get_transport() -> NotifyTransport:
    global _transport
    if _transport is None:
        _transport = PostgresTransport(raw_psycopg_dsn())
    return _transport


async def publish_now(
    hub: str,
    room_id: UUID,
    message: dict[str, Any],
    only_user_ids: set[UUID] | None,
) -> None:
    payload = encode_notification(hub, room_id, message, only_user_ids)
    await get_transport().publish(payload)


async def start_realtime() -> None:
    global _listener
    if _listener is not None:
        return
    from app.realtime.hub import lobby_hub, session_hub

    _listener = RealtimeListener(
        {"session": session_hub, "lobby": lobby_hub},
        get_transport(),
    )
    await _listener.start()


async def stop_realtime() -> None:
    global _listener
    listener = _listener
    _listener = None
    if listener is not None:
        await listener.stop()
    transport = _transport
    if isinstance(transport, PostgresTransport):
        await transport.aclose()
