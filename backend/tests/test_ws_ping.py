"""Текст ping на сокетах лобби и сессии получает {"type":"pong"}."""

from __future__ import annotations

import asyncio

import pytest
from fastapi import WebSocketDisconnect
from fastapi.testclient import TestClient

from app.api.routers.lobbies import _ws_text_loop
from app.main import app


class ScriptedSocket:
    def __init__(self, incoming: list[str]) -> None:
        self.incoming = list(incoming)
        self.sent: list[str] = []

    async def receive_text(self) -> str:
        if not self.incoming:
            raise WebSocketDisconnect()
        return self.incoming.pop(0)

    async def send_text(self, data: str) -> None:
        self.sent.append(data)


def test_ws_text_loop_answers_ping_with_pong() -> None:
    sock = ScriptedSocket(["ping", "hello", "ping", "ping\n"])
    with pytest.raises(WebSocketDisconnect):
        asyncio.run(_ws_text_loop(sock))  # type: ignore[arg-type]
    assert sock.sent == ['{"type":"pong"}', '{"type":"pong"}']


def _assert_close_4401(path: str) -> None:
    client = TestClient(app)
    with client.websocket_connect(path) as ws:
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_text()
    assert exc.value.code == 4401


def test_lobby_ws_without_token_closes_4401() -> None:
    _assert_close_4401("/lobbies/11111111-1111-1111-1111-111111111111/ws")


def test_session_ws_without_token_closes_4401() -> None:
    _assert_close_4401("/sessions/11111111-1111-1111-1111-111111111111/ws")


def test_lobby_ws_with_bad_token_closes_4401() -> None:
    _assert_close_4401("/lobbies/11111111-1111-1111-1111-111111111111/ws?token=not-a-jwt")
