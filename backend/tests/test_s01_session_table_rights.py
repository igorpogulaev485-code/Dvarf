"""S-01: права стола через хелперы L-01 + L08 broadcast после сохранения листа."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.models.lobby import LOBBY_ROLE_COMASTER, LOBBY_ROLE_OBSERVER
from app.services import lobby_roles as roles
from app.services.character import CharacterService
from tests.test_l01_lobby_roles import RoleMemoryDB, _lobby, _role, _session, _user


def test_player_and_observer_cannot_run_or_see_hidden():
    owner = _user()
    player = _user()
    observer = _user()
    lobby = _lobby(owner.id, members=[SimpleNamespace(user_id=player.id)])
    session = _session(lobby.id)
    db = RoleMemoryDB(
        [_role(lobby.id, observer.id, LOBBY_ROLE_OBSERVER)],
        member_user_ids={player.id},
    )
    assert not roles.can_run_session(db, lobby, player, session)
    assert not roles.can_see_hidden(db, lobby, player, session)
    with pytest.raises(AppError) as player_exc:
        roles.require_can_run_session(db, lobby, player, session)
    assert player_exc.value.status_code == 403

    assert not roles.can_run_session(db, lobby, observer, session)
    assert not roles.can_see_hidden(db, lobby, observer, session)
    with pytest.raises(AppError) as obs_exc:
        roles.require_can_act_on_board(db, lobby, observer)
    assert obs_exc.value.status_code == 403


def test_comaster_runs_but_cannot_delete_session():
    owner = _user()
    comaster = _user()
    lobby = _lobby(owner.id)
    session = _session(lobby.id)
    db = RoleMemoryDB([_role(lobby.id, comaster.id, LOBBY_ROLE_COMASTER)])
    assert roles.can_run_session(db, lobby, comaster, session)
    assert roles.can_see_hidden(db, lobby, comaster, session)
    assert not roles.can_delete_session(lobby, comaster)
    with pytest.raises(AppError) as exc:
        roles.require_can_delete_session(lobby, comaster)
    assert exc.value.status_code == 403
    assert exc.value.code == "lobby_session_delete_required"


def test_character_update_broadcasts_open_sessions(monkeypatch):
    import asyncio

    character_id = uuid4()
    session_a = uuid4()
    session_b = uuid4()

    svc = CharacterService(MagicMock())
    character = SimpleNamespace(
        id=character_id,
        sheet_version=1,
        name="Герой",
        avatar_url=None,
        level=3,
        class_name="Воин",
        race_name="Человек",
        hp_current=20,
        hp_max=25,
        rules_edition="2014",
        is_draft=False,
        sheet={},
    )
    svc.characters = MagicMock()
    svc.characters.get_for_user.return_value = character
    svc.lobbies = MagicMock()
    svc.lobbies.list_open_session_ids_for_character.return_value = [session_a, session_b]
    svc.db = MagicMock()

    broadcast = AsyncMock()
    monkeypatch.setattr(
        "app.realtime.hub.session_hub.broadcast",
        broadcast,
    )
    monkeypatch.setattr(
        "app.services.character.to_detail",
        lambda *_args, **_kwargs: SimpleNamespace(id=character_id),
    )

    from app.schemas.character import CharacterUpdateRequest

    user = _user()
    asyncio.run(
        svc.update(
            user,
            character_id,
            CharacterUpdateRequest(sheet_version=1, hp_current=18),
        )
    )

    assert character.hp_current == 18
    assert character.sheet_version == 2
    assert broadcast.await_count == 2
    called_ids = {call.args[0] for call in broadcast.await_args_list}
    assert called_ids == {session_a, session_b}
