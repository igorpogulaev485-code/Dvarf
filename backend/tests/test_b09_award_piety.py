"""B-09: award_piety — только мастер, персонаж в лобби, журнал и счёт не уходят ниже 0."""

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.schemas.lobby import PietyAwardRequest
from app.services.lobby import LobbyService


def _service(owner_id, character, member=True):
    svc = LobbyService.__new__(LobbyService)
    svc.db = MagicMock()
    lobby = SimpleNamespace(id=uuid4(), owner_id=owner_id, members=[])
    svc.lobbies = MagicMock()
    svc.lobbies.get.return_value = lobby
    svc.lobbies.get_member.return_value = object() if member else None
    svc.lobbies.get_characters_map.return_value = {character.id: character}
    return svc, lobby


def _character(sheet=None):
    return SimpleNamespace(id=uuid4(), sheet=sheet, sheet_version=1)


def test_award_piety_requires_owner():
    owner = SimpleNamespace(id=uuid4())
    other = SimpleNamespace(id=uuid4(), display_name="Игрок", login=None, email=None)
    char = _character()
    svc, lobby = _service(owner.id, char)
    payload = PietyAwardRequest(character_id=char.id, delta=2)
    with patch("app.services.lobby_roles.can_award", return_value=False), pytest.raises(
        AppError
    ) as exc:
        asyncio.run(svc.award_piety(other, lobby.id, payload))
    assert exc.value.status_code == 403
    assert exc.value.code == "lobby_award_required"


def test_award_piety_character_must_be_in_lobby():
    owner = SimpleNamespace(id=uuid4(), display_name="ГМ", login=None, email=None)
    char = _character()
    svc, lobby = _service(owner.id, char, member=False)
    payload = PietyAwardRequest(character_id=char.id, delta=2)
    with patch("app.services.lobby_roles.can_award", return_value=True), pytest.raises(
        AppError
    ) as exc:
        asyncio.run(svc.award_piety(owner, lobby.id, payload))
    assert exc.value.code == "character_not_in_lobby"


def test_award_piety_updates_score_and_journal():
    owner = SimpleNamespace(id=uuid4(), display_name="ГМ", login=None, email=None)
    char = _character({"piety": {"god": "heliod", "score": 1, "journal": []}})
    svc, lobby = _service(owner.id, char)
    with patch("app.services.lobby_roles.can_award", return_value=True), patch(
        "app.services.sheet_effects.broadcast_sheet_effects_changed",
        new=AsyncMock(),
    ), patch("sqlalchemy.orm.attributes.flag_modified"):
        result = asyncio.run(
            svc.award_piety(
                owner,
                lobby.id,
                PietyAwardRequest(character_id=char.id, delta=2, comment="Жертва"),
            )
        )
        assert result.score == 3
        assert result.god == "heliod"
        assert char.sheet["piety"]["journal"][-1]["reason"] == "master_award"
        assert char.sheet_version == 2

        result = asyncio.run(
            svc.award_piety(
                owner, lobby.id, PietyAwardRequest(character_id=char.id, delta=-50)
            )
        )
        assert result.score == 0
