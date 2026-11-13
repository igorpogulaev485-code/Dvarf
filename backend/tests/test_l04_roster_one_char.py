"""L-04: один персонаж — одно лобби, перевод/копия, выход, кик."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.schemas.lobby import JoinLobbyRequest, RemoveLobbyMemberRequest
from app.services import lobby_roles as roles
from app.services.lobby import LobbyService
from tests.test_l01_lobby_roles import _lobby, _user


def test_copy_character_name_suffix_and_limit():
    base = "А" * 110
    names = [f"{base} (копия)"]
    out = LobbyService.copy_character_name(base, names)
    assert out.endswith("(копия 2)")
    assert len(out) <= 120

    assert LobbyService.copy_character_name("Тор", []) == "Тор (копия)"
    assert LobbyService.copy_character_name("Тор", ["Тор (копия)"]) == "Тор (копия 2)"


def test_join_blocks_when_character_in_other_lobby(monkeypatch):
    user = _user()
    target_id = uuid4()
    other_id = uuid4()
    char_id = uuid4()
    target = _lobby(user.id, lobby_id=target_id)
    target.invite_code = "ABCD"
    other_lobby = SimpleNamespace(id=other_id, name="Старое", owner_id=uuid4())
    membership = SimpleNamespace(
        lobby_id=other_id,
        character_id=char_id,
        lobby=other_lobby,
    )

    class FakeRepo:
        def get_by_invite_code(self, code):
            return target if code == "ABCD" else None

        def get_membership_by_character(self, cid):
            return membership if cid == char_id else None

        def list_open_session_ids_for_character(self, cid):
            return []

        def get_member(self, lobby_id, character_id):
            return None

        def get_role(self, *a, **k):
            return None

    svc = LobbyService.__new__(LobbyService)
    svc.db = SimpleNamespace(commit=lambda: None)
    svc.lobbies = FakeRepo()
    svc.characters = SimpleNamespace(
        get_for_user=lambda cid, uid: SimpleNamespace(id=char_id, user_id=uid, name="Герой")
    )
    monkeypatch.setattr(roles, "is_comaster", lambda *a, **k: False)
    monkeypatch.setattr(roles, "is_observer", lambda *a, **k: False)

    with pytest.raises(AppError) as exc:
        svc.join_with_character(
            user,
            JoinLobbyRequest(code="ABCD", character_id=char_id, action="join"),
        )
    assert exc.value.status_code == 409
    assert exc.value.code == "character_in_other_lobby"
    assert exc.value.data["other_lobby_name"] == "Старое"
    assert exc.value.data["can_transfer"] is True


def test_transfer_blocked_by_open_session(monkeypatch):
    user = _user()
    target_id = uuid4()
    other_id = uuid4()
    char_id = uuid4()
    target = _lobby(user.id, lobby_id=target_id)
    target.invite_code = "ABCD"
    other_lobby = SimpleNamespace(id=other_id, name="В бою", owner_id=uuid4())
    membership = SimpleNamespace(
        lobby_id=other_id,
        character_id=char_id,
        lobby=other_lobby,
    )

    class FakeRepo:
        def get_by_invite_code(self, code):
            return target

        def get_membership_by_character(self, cid):
            return membership

        def list_open_session_ids_for_character(self, cid):
            return [uuid4()]

        def get_member(self, *a, **k):
            return None

        def get_role(self, *a, **k):
            return None

        def get_lobby_name(self, lid):
            return "В бою"

    svc = LobbyService.__new__(LobbyService)
    svc.db = SimpleNamespace(commit=lambda: None, flush=lambda: None)
    svc.lobbies = FakeRepo()
    svc.characters = SimpleNamespace(
        get_for_user=lambda cid, uid: SimpleNamespace(id=char_id, user_id=uid, name="Герой")
    )
    monkeypatch.setattr(roles, "is_comaster", lambda *a, **k: False)
    monkeypatch.setattr(roles, "is_observer", lambda *a, **k: False)

    with pytest.raises(AppError) as exc:
        svc.join_with_character(
            user,
            JoinLobbyRequest(code="ABCD", character_id=char_id, action="transfer"),
        )
    assert exc.value.code == "character_in_open_session"
    assert exc.value.status_code == 409


def test_remove_member_comaster_forbidden(monkeypatch):
    owner = _user()
    comaster = _user()
    char_id = uuid4()
    lobby = _lobby(owner.id)
    member = SimpleNamespace(character_id=char_id, user_id=uuid4())

    class FakeRepo:
        def get(self, lid):
            return lobby if lid == lobby.id else None

        def get_member(self, lid, cid):
            return member if cid == char_id else None

    svc = LobbyService.__new__(LobbyService)
    svc.db = SimpleNamespace(commit=lambda: None)
    svc.lobbies = FakeRepo()

    with pytest.raises(AppError) as exc:
        svc.remove_member(comaster, lobby.id, char_id, RemoveLobbyMemberRequest())
    assert exc.value.status_code == 403


def test_player_cannot_remove_other(monkeypatch):
    owner = _user()
    player = _user()
    char_id = uuid4()
    lobby = _lobby(owner.id)
    member = SimpleNamespace(character_id=char_id, user_id=uuid4())

    class FakeRepo:
        def get(self, lid):
            return lobby

        def get_member(self, lid, cid):
            return member

    svc = LobbyService.__new__(LobbyService)
    svc.db = SimpleNamespace(commit=lambda: None)
    svc.lobbies = FakeRepo()

    with pytest.raises(AppError) as exc:
        svc.remove_member(player, lobby.id, char_id, RemoveLobbyMemberRequest())
    assert exc.value.status_code == 403


def test_self_leave_blocked_when_seated(monkeypatch):
    owner = _user()
    player = _user()
    char_id = uuid4()
    lobby = _lobby(owner.id)
    lobby.sessions = []
    member = SimpleNamespace(character_id=char_id, user_id=player.id)

    class FakeRepo:
        def get(self, lid):
            return lobby

        def get_member(self, lid, cid):
            return member

        def list_open_session_ids_for_character(self, cid):
            return [uuid4()]

    svc = LobbyService.__new__(LobbyService)
    svc.db = SimpleNamespace(commit=lambda: None)
    svc.lobbies = FakeRepo()

    with pytest.raises(AppError) as exc:
        svc.remove_member(player, lobby.id, char_id, RemoveLobbyMemberRequest())
    assert exc.value.code == "leave_blocked_by_session"
    assert exc.value.status_code == 409


def test_owner_kick_requires_combat_fate_when_seated(monkeypatch):
    owner = _user()
    char_id = uuid4()
    lobby = _lobby(owner.id)
    lobby.sessions = []
    member = SimpleNamespace(character_id=char_id, user_id=uuid4())

    class FakeRepo:
        def get(self, lid):
            return lobby

        def get_member(self, lid, cid):
            return member

        def list_open_session_ids_for_character(self, cid):
            return [uuid4()]

    svc = LobbyService.__new__(LobbyService)
    svc.db = SimpleNamespace(commit=lambda: None)
    svc.lobbies = FakeRepo()

    with pytest.raises(AppError) as exc:
        svc.remove_member(owner, lobby.id, char_id, RemoveLobbyMemberRequest())
    assert exc.value.code == "combat_fate_required"


def test_invite_meta_404():
    user = _user()

    class FakeRepo:
        def get_invite_row(self, code):
            return None

    svc = LobbyService.__new__(LobbyService)
    svc.lobbies = FakeRepo()
    with pytest.raises(AppError) as exc:
        svc.invite_meta(user, "ZZZZ")
    assert exc.value.status_code == 404
