"""Шина L06/L07: два хаба, фильтр получателя, переподключение слушателя."""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from uuid import uuid4

import pytest

from app.realtime.bus import (
    MemoryTransport,
    PostgresTransport,
    RealtimeListener,
    encode_notification,
    parse_notification,
    raw_psycopg_dsn,
    set_transport,
)
from app.realtime.hub import RealtimeHub
from app.services.lobby import _combatant_out, _copy_defenses, _parse_combatants, _roll_audience

ROOT = Path(__file__).resolve().parents[1]


class FakeSocket:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def accept(self) -> None:
        return None

    async def send_json(self, message: dict) -> None:
        self.sent.append(message)


class FailListenTransport(MemoryTransport):
    def __init__(self, failures: int, message: str = "db down") -> None:
        super().__init__()
        self.failures = failures
        self.message = message

    async def listen(self, handler, stop, on_ready=None):  # type: ignore[no-untyped-def]
        if self.failures > 0:
            self.failures -= 1
            raise ConnectionError(self.message)
        await super().listen(handler, stop, on_ready)


class DropAfterReadyTransport(MemoryTransport):
    def __init__(self) -> None:
        super().__init__()
        self.calls = 0

    async def listen(self, handler, stop, on_ready=None):  # type: ignore[no-untyped-def]
        self.calls += 1
        if self.calls == 1:
            if on_ready is not None:
                on_ready()
            raise ConnectionError("dropped")
        await super().listen(handler, stop, on_ready)


class BoomTransport(MemoryTransport):
    async def publish(self, payload: str) -> None:
        raise ConnectionError("notify down")


@pytest.fixture(autouse=True)
def _reset_transport():
    set_transport(None)
    yield
    set_transport(None)


def test_raw_dsn_strips_sqlalchemy_driver() -> None:
    converted = raw_psycopg_dsn("postgresql+psycopg://dvarf:dvarf@localhost:5432/dvarf")
    assert converted == "postgresql://dvarf:dvarf@localhost:5432/dvarf"
    assert "+psycopg" not in converted


def test_roll_audience_hides_master_rolls() -> None:
    owner = uuid4()
    comaster = uuid4()
    viewers = {owner, comaster}
    assert _roll_audience(True, viewers) == viewers
    assert _roll_audience(False, viewers) is None


def test_encode_shrinks_oversized_session_dump() -> None:
    room = uuid4()
    fat = {
        "type": "session_update",
        "session": {"location_page_id": str(uuid4()), "blob": "я" * 5000},
    }
    payload = encode_notification("session", room, fat, None)
    assert len(payload.encode("utf-8")) <= 7000
    parsed = parse_notification(payload)
    assert parsed is not None
    _hub, parsed_room, message, only = parsed
    assert parsed_room == room
    assert message["type"] == "session_changed"
    assert "location_page_id" not in json.dumps(message)
    assert only is None


def test_server_broadcasts_do_not_embed_foreign_visibility() -> None:
    lobby = (ROOT / "app/services/lobby.py").read_text(encoding="utf-8")
    chat = (ROOT / "app/services/chat.py").read_text(encoding="utf-8")
    note = (ROOT / "app/services/note.py").read_text(encoding="utf-8")
    assert '"type": "session_update"' not in lobby
    assert "session_changed" in lobby
    assert '"type": "master_letter"' not in chat
    assert "letters_changed" in chat
    assert "note_upsert" not in note
    assert "notes_changed" in note


def test_parse_combatants_keeps_bestiary_defenses() -> None:
    copied = _copy_defenses(
        {
            "damage_resistances": ["огонь", ""],
            "damage_immunities": ["яд"],
            "damage_vulnerabilities": ["холод"],
            "condition_immunities": ["испуг", 3],
        }
    )
    assert copied["damage_resistances"] == ["огонь"]
    assert copied["condition_immunities"] == ["испуг"]
    rows = _parse_combatants(
        [
            {
                "id": "c1",
                "name": "Гоблин",
                "hp_max": 7,
                **copied,
            }
        ]
    )
    out = _combatant_out(rows[0])
    assert out.damage_resistances == ["огонь"]
    assert out.damage_immunities == ["яд"]
    assert out.damage_vulnerabilities == ["холод"]
    assert out.condition_immunities == ["испуг"]


def test_event_from_hub_a_reaches_socket_on_hub_b() -> None:
    asyncio.run(_cross_hub())


async def _cross_hub() -> None:
    room = uuid4()
    master_id = uuid4()
    player_id = uuid4()
    hub_a = RealtimeHub("session")
    hub_b = RealtimeHub("session")
    transport = MemoryTransport()
    set_transport(transport)
    listener_a = RealtimeListener(
        {"session": hub_a},
        transport,
        initial_backoff=0.01,
        max_backoff=0.05,
    )
    listener_b = RealtimeListener(
        {"session": hub_b},
        transport,
        initial_backoff=0.01,
        max_backoff=0.05,
    )
    master = FakeSocket()
    player = FakeSocket()
    await hub_a.connect(room, master, user_id=master_id)  # type: ignore[arg-type]
    await hub_b.connect(room, player, user_id=player_id)  # type: ignore[arg-type]
    await listener_a.start()
    await listener_b.start()
    try:
        await asyncio.wait_for(listener_a.ready.wait(), timeout=2)
        await asyncio.wait_for(listener_b.ready.wait(), timeout=2)

        await hub_a.broadcast(room, {"type": "session_changed", "session_id": str(room)})
        signal = {"type": "session_changed", "session_id": str(room)}
        assert master.sent == [signal]
        assert player.sent == [signal]
        assert "location_page_id" not in json.dumps(player.sent)

        secret = "скрытый-бросок-мастера"
        await hub_a.broadcast(
            room,
            {"type": "session_event", "event": {"title": secret, "is_master_roll": True}},
            only_user_ids={master_id},
        )
        assert len(master.sent) == 2
        assert master.sent[1]["event"]["title"] == secret
        assert len(player.sent) == 1
        assert all("event" not in item for item in player.sent)

        fat = {
            "type": "session_update",
            "session": {"location_page_id": str(uuid4()), "blob": "я" * 5000},
        }
        await hub_a.broadcast(room, fat)
        assert master.sent[-1]["type"] == "session_changed"
        assert player.sent[-1]["type"] == "session_changed"
        assert "location_page_id" not in json.dumps(player.sent)
        assert "location_page_id" not in json.dumps(master.sent)
    finally:
        await listener_a.stop()
        await listener_b.stop()


def test_listener_reconnects_and_delivers(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level("WARNING", logger="app.realtime")
    asyncio.run(_reconnect_and_deliver())
    text = caplog.text
    assert "realtime listener disconnected" in text
    assert "dsn-should-not-leak" not in text
    assert "postgresql://" not in text


async def _reconnect_and_deliver() -> None:
    room = uuid4()
    hub = RealtimeHub("session")
    transport = FailListenTransport(
        1,
        message="postgresql://user:dsn-should-not-leak@localhost/db",
    )
    set_transport(transport)
    listener = RealtimeListener(
        {"session": hub},
        transport,
        initial_backoff=0.01,
        max_backoff=0.05,
    )
    sock = FakeSocket()
    await hub.connect(room, sock, user_id=uuid4())  # type: ignore[arg-type]
    await listener.start()
    try:
        await asyncio.wait_for(listener.ready.wait(), timeout=2)
        await hub.broadcast(room, {"type": "session_changed", "session_id": str(room)})
        assert sock.sent == [{"type": "session_changed", "session_id": str(room)}]
    finally:
        await listener.stop()


def test_listener_nudges_sockets_after_drop() -> None:
    asyncio.run(_nudge_after_drop())


async def _nudge_after_drop() -> None:
    room = uuid4()
    hub = RealtimeHub("session")
    transport = DropAfterReadyTransport()
    set_transport(transport)
    listener = RealtimeListener(
        {"session": hub},
        transport,
        initial_backoff=0.01,
        max_backoff=0.05,
    )
    sock = FakeSocket()
    await hub.connect(room, sock, user_id=uuid4())  # type: ignore[arg-type]
    await listener.start()
    try:
        for _ in range(100):
            if transport.calls >= 2 and any(
                item.get("type") == "session_changed" for item in sock.sent
            ):
                break
            await asyncio.sleep(0.02)
        else:
            raise AssertionError("listener did not reconnect")
        assert "location_page_id" not in json.dumps(sock.sent)
        before = len(sock.sent)
        await hub.broadcast(room, {"type": "session_changed", "session_id": str(room)})
        assert len(sock.sent) == before + 1
    finally:
        await listener.stop()


def test_notify_failure_still_reaches_local_sockets() -> None:
    asyncio.run(_local_fallback())


async def _local_fallback() -> None:
    room = uuid4()
    hub = RealtimeHub("session")
    set_transport(BoomTransport())
    sock = FakeSocket()
    await hub.connect(room, sock, user_id=uuid4())  # type: ignore[arg-type]
    await hub.broadcast(room, {"type": "session_changed", "session_id": str(room)})
    assert sock.sent == [{"type": "session_changed", "session_id": str(room)}]


def _loopback_dsn() -> str | None:
    override = os.environ.get("DVARF_TEST_REALTIME_PG", "").strip()
    if override.startswith("postgres"):
        dsn = raw_psycopg_dsn(override)
    else:
        dsn = raw_psycopg_dsn()
    if not any(marker in dsn for marker in ("@localhost", "@127.0.0.1", "@[::1]")):
        return None
    return dsn


def test_postgres_notify_crosses_two_listeners() -> None:
    dsn = _loopback_dsn()
    if dsn is None:
        pytest.skip("postgres не на loopback")
    try:
        asyncio.run(_pg_probe(dsn))
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"local postgres unavailable ({type(exc).__name__})")
    asyncio.run(_postgres_cross(dsn))


async def _pg_probe(dsn: str) -> None:
    import psycopg

    conn = await psycopg.AsyncConnection.connect(dsn, autocommit=True, connect_timeout=2)
    await conn.close()


async def _postgres_cross(dsn: str) -> None:
    channel = "dvarf_rt_" + uuid4().hex[:8]
    room = uuid4()
    hub_a = RealtimeHub("session")
    hub_b = RealtimeHub("session")
    transport_a = PostgresTransport(dsn, channel)
    transport_b = PostgresTransport(dsn, channel)
    set_transport(transport_a)
    listener_a = RealtimeListener(
        {"session": hub_a},
        transport_a,
        initial_backoff=0.05,
        max_backoff=0.2,
    )
    listener_b = RealtimeListener(
        {"session": hub_b},
        transport_b,
        initial_backoff=0.05,
        max_backoff=0.2,
    )
    master = FakeSocket()
    player = FakeSocket()
    await hub_a.connect(room, master, user_id=uuid4())  # type: ignore[arg-type]
    await hub_b.connect(room, player, user_id=uuid4())  # type: ignore[arg-type]
    await listener_a.start()
    await listener_b.start()
    try:
        await asyncio.wait_for(listener_a.ready.wait(), timeout=5)
        await asyncio.wait_for(listener_b.ready.wait(), timeout=5)
        await hub_a.broadcast(room, {"type": "session_changed", "session_id": str(room)})
        for _ in range(50):
            if master.sent and player.sent:
                break
            await asyncio.sleep(0.05)
        signal = {"type": "session_changed", "session_id": str(room)}
        assert master.sent == [signal]
        assert player.sent == [signal]
    finally:
        await listener_a.stop()
        await listener_b.stop()
        await transport_a.aclose()
        await transport_b.aclose()
