"""DICE-02b: цифровой бросок на сервере, заглушка, раскрытие, анти-спам."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.models.session_event import SessionEvent
from app.schemas.lobby import SessionDigitalRollRequest, SessionEventOut
from app.services import lobby as lobby_mod
from app.services.lobby import (
    LobbyService,
    _is_master_secret,
    _roll_audience,
    _stub_master_event,
)
from tests.test_l01_lobby_roles import _lobby, _session, _user


def test_roll_audience_digital_vs_legacy() -> None:
    viewers = {uuid4(), uuid4()}
    # Legacy: ручной бросок мастера по-прежнему только ведущим.
    assert _roll_audience(True, viewers) == viewers
    assert _roll_audience(False, viewers) is None
    # Цифровой обычный бросок мастера — всей комнате.
    assert (
        _roll_audience(
            True, viewers, master_hidden=False, legacy_hide_master=False
        )
        is None
    )
    # Скрытый мастер — только ведущим.
    assert (
        _roll_audience(
            True, viewers, master_hidden=True, legacy_hide_master=False
        )
        == viewers
    )
    # Скрытый игрок.
    assert _roll_audience(False, viewers, is_hidden=True) == viewers


def test_stub_hides_total_and_dice() -> None:
    event = SessionEvent(
        id=uuid4(),
        session_id=uuid4(),
        event_type="roll",
        character_id=None,
        actor_user_id=uuid4(),
        character_name="Мастер",
        title="Проверка скрытности",
        formula="1d20+5",
        breakdown="d20:17 +5 = 22",
        total=22,
        is_master_roll=True,
        payload={
            "master_hidden": True,
            "revealed": False,
            "digital": True,
            "dice": [{"sides": 20, "value": 17, "dropped": False}],
            "category": "roll",
        },
        created_at=datetime.now(timezone.utc),
    )
    stub = _stub_master_event(event)
    assert stub.title == "Мастер бросил скрыто"
    assert stub.total is None
    assert stub.formula is None
    assert stub.breakdown is None
    assert stub.payload.get("hidden_stub") is True
    assert "dice" not in stub.payload


def test_present_visibility_matrix() -> None:
    svc = LobbyService(MagicMock())
    master_id = uuid4()
    player_id = uuid4()
    base = SessionEvent(
        id=uuid4(),
        session_id=uuid4(),
        event_type="roll",
        character_id=None,
        actor_user_id=master_id,
        character_name="Мастер",
        title="Скрытая проверка",
        formula="1d20",
        breakdown="d20:11 = 11",
        total=11,
        is_master_roll=True,
        payload={
            "master_hidden": True,
            "revealed": False,
            "digital": True,
            "dice": [{"sides": 20, "value": 11, "dropped": False}],
        },
        created_at=datetime.now(timezone.utc),
    )

    # Ведущий видит полный итог.
    full = svc._present_session_event(
        base, is_owner=True, viewer_id=master_id, history_mode="active"
    )
    assert full is not None and full.total == 11

    # Игрок в «Активно» — заглушка.
    stub = svc._present_session_event(
        base, is_owner=False, viewer_id=player_id, history_mode="active"
    )
    assert stub is not None and stub.total is None
    assert stub.title == "Мастер бросил скрыто"

    # «Без бросков мастера» — даже заглушки нет.
    assert (
        svc._present_session_event(
            base,
            is_owner=False,
            viewer_id=player_id,
            history_mode="hide_master_rolls",
        )
        is None
    )

    # После раскрытия — видно даже в hide_master_rolls.
    revealed = SessionEvent(
        id=base.id,
        session_id=base.session_id,
        event_type="roll",
        character_id=None,
        actor_user_id=master_id,
        character_name="Мастер",
        title="Скрытая проверка",
        formula="1d20",
        breakdown="d20:11 = 11",
        total=11,
        is_master_roll=True,
        payload={
            "master_hidden": True,
            "revealed": True,
            "digital": True,
            "dice": [{"sides": 20, "value": 11, "dropped": False}],
        },
        created_at=base.created_at,
    )
    shown = svc._present_session_event(
        revealed,
        is_owner=False,
        viewer_id=player_id,
        history_mode="hide_master_rolls",
    )
    assert shown is not None and shown.total == 11

    # Обычный бросок мастера в hide_master_rolls — скрыт.
    normal = SessionEvent(
        id=uuid4(),
        session_id=base.session_id,
        event_type="roll",
        character_id=None,
        actor_user_id=master_id,
        character_name="Мастер",
        title="Открытый",
        formula="1d20",
        breakdown="d20:5 = 5",
        total=5,
        is_master_roll=True,
        payload={"digital": True, "master_hidden": False, "revealed": False},
        created_at=datetime.now(timezone.utc),
    )
    assert (
        svc._present_session_event(
            normal,
            is_owner=False,
            viewer_id=player_id,
            history_mode="hide_master_rolls",
        )
        is None
    )
    open_view = svc._present_session_event(
        normal, is_owner=False, viewer_id=player_id, history_mode="active"
    )
    assert open_view is not None and open_view.total == 5


def _build_digital_svc(*, can_master: bool = True):
    owner = _user()
    player = _user()
    lobby = _lobby(owner.id)
    lobby.visibility_profile = {"event_history": "active"}
    session = _session(lobby.id)
    session.lobby = lobby
    char_id = uuid4()

    db = MagicMock()
    db.scalar.return_value = 0
    db.get.return_value = None
    svc = LobbyService(db)
    svc.lobbies = MagicMock()
    svc.lobbies.get_session.return_value = session
    svc.lobbies.get_member.return_value = SimpleNamespace(
        user_id=player.id, character_id=char_id
    )
    svc.lobbies.get_seat.return_value = SimpleNamespace(character_id=char_id)
    svc.lobbies.get_characters_map.return_value = {
        char_id: SimpleNamespace(name="Торин", sheet={"combat": {}})
    }
    svc.lobbies.list_roles.return_value = []
    svc.lobbies.list_member_user_ids.return_value = {player.id}

    def _add(e: SessionEvent) -> SessionEvent:
        if getattr(e, "id", None) is None:
            e.id = uuid4()
        if getattr(e, "created_at", None) is None:
            e.created_at = datetime.now(timezone.utc)
        return e

    svc.lobbies.add_session_event.side_effect = _add
    svc._require_view = MagicMock()  # type: ignore[method-assign]

    return svc, owner, player, session, lobby, char_id


def test_create_digital_roll_ignores_client_total(monkeypatch) -> None:
    svc, _owner, player, session, _lobby, char_id = _build_digital_svc()
    monkeypatch.setattr(
        "app.services.lobby.roles.require_can_act_on_board", lambda *a, **k: None
    )
    monkeypatch.setattr(
        "app.services.lobby.roles.can_run_session", lambda *a, **k: False
    )
    broadcast = AsyncMock()
    monkeypatch.setattr("app.services.lobby.session_hub.broadcast", broadcast)
    monkeypatch.setattr(
        "app.services.lobby.roll_expression",
        lambda *_a, **_k: SimpleNamespace(
            expression="2d6+3",
            breakdown="d6:4 d6:2 +3 = 9",
            total=9,
            dice=[
                SimpleNamespace(
                    as_dict=lambda: {"sides": 6, "value": 4, "dropped": False}
                ),
                SimpleNamespace(
                    as_dict=lambda: {"sides": 6, "value": 2, "dropped": False}
                ),
            ],
            modifier_total=3,
            advantage_mode="none",
        ),
    )

    payload = SessionDigitalRollRequest(
        character_id=char_id,
        title="Акробатика",
        formula="2d6+3",
        category="sheet",
    )
    # Клиентский «фейковый» итог в схеме даже не принимается.

    async def _run():
        return await svc.create_digital_roll(player, session.id, payload)

    out = asyncio.run(_run())
    assert out.total == 9
    assert out.formula == "2d6+3"
    assert out.payload.get("digital") is True
    assert len(out.payload.get("dice") or []) == 2
    broadcast.assert_awaited()
    # Обычный бросок — всей комнате.
    kwargs = broadcast.await_args.kwargs
    assert kwargs.get("only_user_ids") is None


def test_create_digital_bad_formula(monkeypatch) -> None:
    svc, _owner, player, session, _l, char_id = _build_digital_svc()
    monkeypatch.setattr(
        "app.services.lobby.roles.require_can_act_on_board", lambda *a, **k: None
    )
    monkeypatch.setattr(
        "app.services.lobby.roles.can_run_session", lambda *a, **k: False
    )
    payload = SessionDigitalRollRequest(
        character_id=char_id, title="x", formula="нетформулы"
    )
    with pytest.raises(AppError) as exc:
        asyncio.run(svc.create_digital_roll(player, session.id, payload))
    assert exc.value.status_code == 400
    assert exc.value.code == "bad_formula"


def test_player_cannot_roll_for_other(monkeypatch) -> None:
    svc, _owner, player, session, _l, char_id = _build_digital_svc()
    other = uuid4()
    svc.lobbies.get_member.return_value = SimpleNamespace(
        user_id=other, character_id=char_id
    )
    monkeypatch.setattr(
        "app.services.lobby.roles.require_can_act_on_board", lambda *a, **k: None
    )
    monkeypatch.setattr(
        "app.services.lobby.roles.can_run_session", lambda *a, **k: False
    )
    payload = SessionDigitalRollRequest(
        character_id=char_id, title="x", formula="1d20"
    )
    with pytest.raises(AppError) as exc:
        asyncio.run(svc.create_digital_roll(player, session.id, payload))
    assert exc.value.status_code == 403


def test_master_hidden_broadcasts_stub(monkeypatch) -> None:
    svc, owner, player, session, lobby, _char = _build_digital_svc()
    monkeypatch.setattr(
        "app.services.lobby.roles.require_can_act_on_board", lambda *a, **k: None
    )
    monkeypatch.setattr(
        "app.services.lobby.roles.can_run_session", lambda *a, **k: True
    )
    broadcast = AsyncMock()
    monkeypatch.setattr("app.services.lobby.session_hub.broadcast", broadcast)
    monkeypatch.setattr(
        "app.services.lobby.roll_expression",
        lambda *_a, **_k: SimpleNamespace(
            expression="1d20",
            breakdown="d20:15 = 15",
            total=15,
            dice=[
                SimpleNamespace(
                    as_dict=lambda: {"sides": 20, "value": 15, "dropped": False}
                )
            ],
            modifier_total=0,
            advantage_mode="none",
        ),
    )
    payload = SessionDigitalRollRequest(
        character_id=None,
        title="Скрытый",
        formula="1d20",
        master_hidden=True,
    )
    out = asyncio.run(svc.create_digital_roll(owner, session.id, payload))
    assert out.total == 15
    assert out.payload.get("master_hidden") is True
    assert broadcast.await_count == 2
    # Второй вызов — заглушка игроку.
    stub_msg = broadcast.await_args_list[1].args[1]
    assert stub_msg["event"]["total"] is None
    assert stub_msg["event"]["title"] == "Мастер бросил скрыто"
    assert player.id in (broadcast.await_args_list[1].kwargs.get("only_user_ids") or set())


def test_reveal_master_roll(monkeypatch) -> None:
    svc, owner, _p, session, lobby, _c = _build_digital_svc()
    event_id = uuid4()
    event = SessionEvent(
        id=event_id,
        session_id=session.id,
        event_type="roll",
        character_id=None,
        actor_user_id=owner.id,
        character_name="Мастер",
        title="Скрытый",
        formula="1d20",
        breakdown="d20:12 = 12",
        total=12,
        is_master_roll=True,
        payload={
            "master_hidden": True,
            "revealed": False,
            "dice": [{"sides": 20, "value": 12, "dropped": False}],
        },
        created_at=datetime.now(timezone.utc),
    )
    svc.db.get.return_value = event
    monkeypatch.setattr(
        "app.services.lobby.roles.can_run_session", lambda *a, **k: True
    )
    broadcast = AsyncMock()
    monkeypatch.setattr("app.services.lobby.session_hub.broadcast", broadcast)

    out = asyncio.run(svc.reveal_master_roll(owner, session.id, event_id))
    assert out.payload.get("revealed") is True
    assert out.total == 12
    assert broadcast.await_args.kwargs.get("only_user_ids") is None


def test_player_cannot_reveal(monkeypatch) -> None:
    svc, _o, player, session, _l, _c = _build_digital_svc()
    monkeypatch.setattr(
        "app.services.lobby.roles.can_run_session", lambda *a, **k: False
    )
    with pytest.raises(AppError) as exc:
        asyncio.run(svc.reveal_master_roll(player, session.id, uuid4()))
    assert exc.value.status_code == 403


def test_rate_limit_burst() -> None:
    svc = LobbyService(MagicMock())
    svc.db.scalar.return_value = 15
    user = _user()
    with pytest.raises(AppError) as exc:
        svc._ensure_roll_rate_limit(user, uuid4())
    assert exc.value.status_code == 429
    assert "Слишком много бросков" in str(exc.value)


def test_manual_roll_still_accepts_client_total(monkeypatch) -> None:
    """Живой куб: сервер не вызывает генератор, принимает total с клиента."""
    from app.schemas.lobby import SessionRollCreateRequest

    svc, _owner, player, session, _l, char_id = _build_digital_svc()
    monkeypatch.setattr(
        "app.services.lobby.roles.require_can_act_on_board", lambda *a, **k: None
    )
    monkeypatch.setattr(
        "app.services.lobby.roles.can_run_session", lambda *a, **k: False
    )
    broadcast = AsyncMock()
    monkeypatch.setattr("app.services.lobby.session_hub.broadcast", broadcast)
    roll_spy = MagicMock()
    monkeypatch.setattr("app.services.lobby.roll_expression", roll_spy)

    payload = SessionRollCreateRequest(
        character_id=char_id,
        title="Живой куб",
        formula="1d20",
        total=17,
        physical_dice=True,
    )
    out = asyncio.run(svc.create_manual_roll(player, session.id, payload))
    assert out.total == 17
    assert out.payload.get("physical_dice") is True
    roll_spy.assert_not_called()


def test_is_master_secret_helper() -> None:
    event = SimpleNamespace(
        payload={"master_hidden": True, "revealed": False}
    )
    assert _is_master_secret(event) is True
    event.payload["revealed"] = True
    assert _is_master_secret(event) is False


def test_player_api_payload_has_no_total_before_reveal() -> None:
    """Игрок до раскрытия не получает число/кости даже в JSON ответа API/шины."""
    svc = LobbyService(MagicMock())
    master_id = uuid4()
    player_id = uuid4()
    event = SessionEvent(
        id=uuid4(),
        session_id=uuid4(),
        event_type="roll",
        character_id=None,
        actor_user_id=master_id,
        character_name="Мастер",
        title="Скрытая проверка",
        formula="1d20+2",
        breakdown="d20:14 +2 = 16",
        total=16,
        is_master_roll=True,
        payload={
            "master_hidden": True,
            "revealed": False,
            "digital": True,
            "dice": [{"sides": 20, "value": 14, "dropped": False}],
            "category": "roll",
        },
        created_at=datetime.now(timezone.utc),
    )
    stub = svc._present_session_event(
        event, is_owner=False, viewer_id=player_id, history_mode="active"
    )
    assert stub is not None
    # SessionEventOut → словарь как в HTTP/WS (без токенов).
    dumped = stub.model_dump()
    assert dumped["title"] == "Мастер бросил скрыто"
    assert dumped["total"] is None
    assert dumped["formula"] is None
    assert dumped["breakdown"] is None
    assert dumped["payload"].get("hidden_stub") is True
    assert "dice" not in dumped["payload"]
    # Секретные поля отсутствуют; UUID/даты в ответе могут содержать цифры — не сканируем весь dump.
    payload_blob = str(dumped["payload"])
    assert "16" not in payload_blob
    assert "14" not in payload_blob
    assert "1d20" not in payload_blob
    assert dumped["title"] != "Скрытая проверка"
