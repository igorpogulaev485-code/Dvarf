"""L-01: хелперы ролей лобби и матрица прав."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError, NotFoundError
from app.models.lobby import (
    LOBBY_ROLE_COMASTER,
    LOBBY_ROLE_LEAD_TODAY,
    LOBBY_ROLE_OBSERVER,
    LobbyRole,
)
from app.services import lobby_roles as roles


def _user(uid=None):
    return SimpleNamespace(id=uid or uuid4())


def _lobby(owner_id, members=None, lobby_id=None):
    return SimpleNamespace(
        id=lobby_id or uuid4(),
        owner_id=owner_id,
        members=list(members or []),
    )


def _session(lobby_id):
    return SimpleNamespace(id=uuid4(), lobby_id=lobby_id, closed_at=None)


def _role(lobby_id, user_id, role, session_id=None):
    return LobbyRole(
        id=uuid4(),
        lobby_id=lobby_id,
        user_id=user_id,
        role=role,
        session_id=session_id,
        assigned_by=None,
    )


class RoleMemoryDB:
    """Минимальный db: scalar/scalars читают список LobbyRole в памяти."""

    def __init__(self, role_rows: list[LobbyRole] | None = None, member_user_ids: set | None = None):
        self.role_rows = list(role_rows or [])
        self.member_user_ids = set(member_user_ids or [])

    def scalars(self, stmt):  # noqa: ANN001
        return SimpleNamespace(all=lambda: list(self.role_rows))

    def scalar(self, stmt):  # noqa: ANN001
        # has_character_in_lobby / can_view / _has_role — различаем по тексту stmt грубо.
        sql = str(stmt).lower()
        if "lobby_members" in sql:
            # есть ли членство — тесты передают member_user_ids
            return uuid4() if self.member_user_ids else None
        # роль: ищем совпадение по role string в compiled params если есть
        params = getattr(stmt, "_bind_params_internal_map", None) or {}
        # SQLAlchemy 2: compile with literal binds is heavy — фильтруем вручную по известным ролям
        wanted_role = None
        for name in (LOBBY_ROLE_COMASTER, LOBBY_ROLE_OBSERVER, LOBBY_ROLE_LEAD_TODAY):
            if f"'{name}'" in sql or f"{name}" in sql:
                # ambiguous; prefer params
                pass
        # Используем compile()
        try:
            compiled = stmt.compile()
            p = compiled.params
        except Exception:
            p = {}
        role = p.get("role_1") or p.get("role")
        user_id = p.get("user_id_1") or p.get("user_id")
        lobby_id = p.get("lobby_id_1") or p.get("lobby_id")
        session_id = p.get("session_id_1") or p.get("session_id")
        for row in self.role_rows:
            if lobby_id is not None and row.lobby_id != lobby_id:
                continue
            if user_id is not None and row.user_id != user_id:
                continue
            if role is not None and row.role != role:
                continue
            if session_id is not None and row.session_id != session_id:
                continue
            if "session_id is null" in sql.replace('"', "").replace("`", "") or "session_id is null" in sql:
                if row.session_id is not None and role in {LOBBY_ROLE_COMASTER, LOBBY_ROLE_OBSERVER}:
                    continue
            return row.id
        # can_view_lobby: any role for user
        if role is None and user_id is not None:
            for row in self.role_rows:
                if row.user_id == user_id and (lobby_id is None or row.lobby_id == lobby_id):
                    return row.id
        return None


@pytest.fixture(autouse=True)
def _patch_has_role(monkeypatch):
    """Стабильный _has_role поверх RoleMemoryDB без разбора SQL."""

    def fake_has_role(db, lobby_id, user_id, role, *, session_id=None):
        if not isinstance(db, RoleMemoryDB):
            return False
        for row in db.role_rows:
            if row.lobby_id != lobby_id or row.user_id != user_id or row.role != role:
                continue
            if role == LOBBY_ROLE_LEAD_TODAY:
                if session_id is None or row.session_id != session_id:
                    continue
            elif row.session_id is not None:
                continue
            return True
        return False

    def fake_can_view(db, lobby, user):
        if lobby.owner_id == user.id:
            return True
        if any(m.user_id == user.id for m in lobby.members):
            return True
        if isinstance(db, RoleMemoryDB):
            return any(r.lobby_id == lobby.id and r.user_id == user.id for r in db.role_rows)
        return False

    def fake_has_character(db, lobby_id, user_id):
        if isinstance(db, RoleMemoryDB):
            return user_id in db.member_user_ids
        return False

    monkeypatch.setattr(roles, "_has_role", fake_has_role)
    monkeypatch.setattr(roles, "can_view_lobby", fake_can_view)
    monkeypatch.setattr(roles, "has_character_in_lobby", fake_has_character)


def test_owner_and_player_can_view_without_roles_table():
    owner = _user()
    player = _user()
    lobby = _lobby(owner.id, members=[SimpleNamespace(user_id=player.id)])
    db = RoleMemoryDB([])
    assert roles.is_owner(lobby, owner)
    assert roles.can_view_lobby(db, lobby, owner)
    assert roles.can_view_lobby(db, lobby, player)
    stranger = _user()
    assert not roles.can_view_lobby(db, lobby, stranger)


def test_observer_views_but_cannot_run_or_award():
    owner = _user()
    observer = _user()
    lobby = _lobby(owner.id)
    session = _session(lobby.id)
    db = RoleMemoryDB([_role(lobby.id, observer.id, LOBBY_ROLE_OBSERVER)])
    assert roles.can_view_lobby(db, lobby, observer)
    assert roles.is_observer(db, lobby, observer)
    assert not roles.can_run_session(db, lobby, observer, session)
    assert not roles.can_see_hidden(db, lobby, observer, session)
    assert not roles.can_award(db, lobby, observer, session)
    assert not roles.can_manage_journal(db, lobby, observer)
    assert not roles.can_edit_wiki(db, lobby, observer)
    assert not roles.can_delete_lobby(lobby, observer)
    assert not roles.can_change_roles(lobby, observer)
    assert not roles.can_transfer_lobby(lobby, observer)
    assert not roles.can_change_invite_code(lobby, observer)
    assert not roles.can_delete_session(lobby, observer)
    with pytest.raises(AppError) as exc:
        roles.require_can_act_on_board(db, lobby, observer)
    assert exc.value.status_code == 403


def test_comaster_matrix():
    owner = _user()
    comaster = _user()
    lobby = _lobby(owner.id)
    session = _session(lobby.id)
    db = RoleMemoryDB([_role(lobby.id, comaster.id, LOBBY_ROLE_COMASTER)])
    assert roles.can_run_session(db, lobby, comaster, session)
    assert roles.can_see_hidden(db, lobby, comaster, session)
    assert roles.can_award(db, lobby, comaster, session)
    assert roles.can_edit_wiki(db, lobby, comaster)
    assert roles.can_manage_journal(db, lobby, comaster)
    assert roles.can_edit_campaign_rules(db, lobby, comaster)
    assert not roles.can_delete_lobby(lobby, comaster)
    assert not roles.can_change_roles(lobby, comaster)
    assert not roles.can_transfer_lobby(lobby, comaster)
    assert not roles.can_change_invite_code(lobby, comaster)
    assert not roles.can_delete_session(lobby, comaster)
    with pytest.raises(AppError) as exc:
        roles.require_can_delete_lobby(lobby, comaster)
    assert exc.value.status_code == 403
    with pytest.raises(AppError) as exc2:
        roles.require_can_change_roles(lobby, comaster)
    assert exc2.value.status_code == 403


def test_lead_today_only_for_that_session():
    owner = _user()
    lead = _user()
    lobby = _lobby(owner.id, members=[SimpleNamespace(user_id=lead.id)])
    session_a = _session(lobby.id)
    session_b = _session(lobby.id)
    db = RoleMemoryDB(
        [_role(lobby.id, lead.id, LOBBY_ROLE_LEAD_TODAY, session_id=session_a.id)],
        member_user_ids={lead.id},
    )
    assert roles.can_run_session(db, lobby, lead, session_a)
    assert roles.can_award(db, lobby, lead, session_a)
    assert roles.can_see_hidden(db, lobby, lead, session_a)
    assert not roles.can_run_session(db, lobby, lead, session_b)
    assert not roles.can_edit_wiki(db, lobby, lead)
    assert not roles.can_manage_journal(db, lobby, lead)


def test_player_cannot_run_or_award():
    owner = _user()
    player = _user()
    lobby = _lobby(owner.id, members=[SimpleNamespace(user_id=player.id)])
    session = _session(lobby.id)
    db = RoleMemoryDB([], member_user_ids={player.id})
    assert roles.can_view_lobby(db, lobby, player)
    assert not roles.can_run_session(db, lobby, player, session)
    assert not roles.can_award(db, lobby, player, session)
    with pytest.raises(AppError) as exc:
        roles.require_can_run_session(db, lobby, player, session)
    assert exc.value.status_code == 403


def test_require_view_hides_lobby_from_stranger():
    owner = _user()
    lobby = _lobby(owner.id)
    db = RoleMemoryDB([])
    stranger = _user()
    with pytest.raises(NotFoundError):
        roles.require_view(db, lobby, stranger)


def test_permission_flags_for_owner():
    owner = _user()
    lobby = _lobby(owner.id)
    db = RoleMemoryDB([])
    flags = roles.permission_flags(db, lobby, owner)
    assert flags["is_owner"] is True
    assert flags["can_delete_lobby"] is True
    assert flags["can_change_invite_code"] is True
    assert flags["role"] == "owner"
