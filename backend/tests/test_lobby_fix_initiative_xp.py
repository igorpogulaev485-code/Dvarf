"""LOBBY-FIX: бросить за оставшихся + XP из ПО для своего НПС."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.dnd.xp import xp_from_cr
from app.schemas.lobby import CombatantCreateRequest, CombatInitiativeRequest
from app.services.lobby import LobbyService


def test_xp_from_cr_2014_table():
    assert xp_from_cr("1/4") == 50
    assert xp_from_cr("1") == 200
    assert xp_from_cr("5") == 1800
    assert xp_from_cr("goblin") is None


def _session_with_pending_entries():
    lobby = SimpleNamespace(id=uuid4(), members=[])
    owner = SimpleNamespace(id=uuid4())
    session = SimpleNamespace(
        id=uuid4(),
        lobby=lobby,
        closed_at=None,
        combatants=[],
        combat={
            "active": True,
            "round": 1,
            "active_index": 0,
            "entries": [
                {
                    "id": "e1",
                    "kind": "enemy",
                    "ref_id": "g1",
                    "name": "Гоблин",
                    "initiative": None,
                    "initiative_pending": True,
                    "dex_mod": 2,
                },
                {
                    "id": "e2",
                    "kind": "enemy",
                    "ref_id": "g2",
                    "name": "Орк",
                    "initiative": None,
                    "initiative_pending": True,
                    "dex_mod": 1,
                },
                {
                    "id": "e3",
                    "kind": "enemy",
                    "ref_id": "g3",
                    "name": "Уже бросил",
                    "initiative": 14,
                    "initiative_pending": False,
                    "dex_mod": 0,
                },
            ],
            "waves": [],
            "fallen": [],
        },
        seats=[],
    )
    return owner, lobby, session


def test_roll_remaining_sets_all_pending():
    owner, lobby, session = _session_with_pending_entries()
    svc = LobbyService(MagicMock())
    svc.lobbies = MagicMock()
    svc.lobbies.get_session.return_value = session
    svc.lobbies.add_session_event = MagicMock()
    svc.characters = MagicMock()
    svc._require_view = MagicMock()
    svc._session_detail = MagicMock(return_value=SimpleNamespace(id=session.id))

    fake_event_out = SimpleNamespace(model_dump=lambda mode="json": {"ok": True})

    with (
        patch("app.services.lobby.roles") as roles,
        patch("app.services.lobby.session_hub") as hub,
        patch("app.services.lobby._broadcast_session_changed", new_callable=AsyncMock),
        patch("app.services.lobby.scmb.roll_d20", side_effect=[(10, "10"), (8, "8")]),
        patch("sqlalchemy.orm.attributes.flag_modified"),
        patch(
            "app.services.lobby.SessionEventOut.model_validate",
            return_value=fake_event_out,
        ),
    ):
        roles.require_can_act_on_board = MagicMock()
        roles.can_run_session.return_value = True
        hub.broadcast = AsyncMock()
        svc.db = MagicMock()

        detail = asyncio.run(
            svc.roll_combat_initiative(
                owner,
                session.id,
                CombatInitiativeRequest(mode="roll_remaining"),
            )
        )

    assert detail.id == session.id
    dumped = session.combat
    assert isinstance(dumped, dict)
    pending_left = [
        e
        for e in dumped.get("entries", [])
        if e.get("initiative_pending") or e.get("initiative") is None
    ]
    assert pending_left == []
    rolled = [e for e in dumped.get("entries", []) if e.get("id") in {"e1", "e2"}]
    assert all(e.get("initiative") is not None for e in rolled)
    assert svc.lobbies.add_session_event.call_count >= 3  # 2 rolls + summary


def test_roll_remaining_forbidden_for_non_master():
    owner, lobby, session = _session_with_pending_entries()
    player = SimpleNamespace(id=uuid4())
    svc = LobbyService(MagicMock())
    svc.lobbies = MagicMock()
    svc.lobbies.get_session.return_value = session
    svc._require_view = MagicMock()

    with patch("app.services.lobby.roles") as roles:
        roles.require_can_act_on_board = MagicMock()
        roles.can_run_session.return_value = False
        with pytest.raises(AppError) as exc:
            asyncio.run(
                svc.roll_combat_initiative(
                    player,
                    session.id,
                    CombatInitiativeRequest(mode="roll_remaining"),
                )
            )
    assert exc.value.status_code == 403


def test_custom_npc_requires_cr_and_sets_xp():
    from app.dnd.xp import normalize_cr

    assert normalize_cr("1/4") == "1/4"
    assert xp_from_cr("1/4") == 50

    # unit-level: CombatantCreateRequest accepts cr
    payload = CombatantCreateRequest(
        name="Свой гоблин",
        hp_max=7,
        ac=15,
        cr="1/4",
        count=1,
    )
    assert payload.cr == "1/4"
    assert xp_from_cr(payload.cr) == 50
