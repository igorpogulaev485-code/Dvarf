"""L-05: видимость личных, доска, конфликт, экспорт, права."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.schemas.note import NoteCreateRequest, NoteUpdateRequest
from app.services import lobby_roles as roles
from app.services.note import NoteService


def _run(coro):
    return asyncio.run(coro)


def _user(uid=None, name="Игрок"):
    return SimpleNamespace(
        id=uid or uuid4(),
        display_name=name,
        login=None,
        email=f"{name}@ex.test",
    )


def _lobby(owner_id, lobby_id=None, name="Стол"):
    return SimpleNamespace(
        id=lobby_id or uuid4(),
        owner_id=owner_id,
        name=name,
        members=[],
    )


def _note(**kwargs):
    now = datetime.now(timezone.utc)
    defaults = dict(
        id=uuid4(),
        lobby_id=uuid4(),
        scope="personal",
        author_user_id=uuid4(),
        character_id=None,
        character_name=None,
        title="Т",
        body="тело",
        shared_with_master=False,
        pinned=False,
        updated_by_user_id=None,
        created_at=now,
        updated_at=now,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


class FakeNotesRepo:
    def __init__(self, notes: list | None = None):
        self.notes = list(notes or [])
        self.deleted: list = []

    def list_visible(self, lobby_id, *, user_id, can_manage_journal, scope=None):
        out = []
        for n in self.notes:
            if n.lobby_id != lobby_id:
                continue
            if scope and n.scope != scope:
                continue
            own = n.author_user_id == user_id
            party = n.scope == "party"
            if can_manage_journal:
                ok = own or party or n.scope == "master" or (
                    n.scope == "personal" and n.shared_with_master
                )
            else:
                ok = (own or party) and n.scope != "master"
            if ok:
                out.append(n)
        out.sort(key=lambda x: (not x.pinned, -x.updated_at.timestamp()))
        return out

    def list_for_export(self, lobby_id, *, user_id, can_manage_journal):
        return self.list_visible(
            lobby_id,
            user_id=user_id,
            can_manage_journal=can_manage_journal,
        )

    def get(self, note_id):
        for n in self.notes:
            if n.id == note_id:
                return n
        return None

    def add(self, note):
        if getattr(note, "id", None) is None:
            note.id = uuid4()
        now = datetime.now(timezone.utc)
        if getattr(note, "created_at", None) is None:
            note.created_at = now
        if getattr(note, "updated_at", None) is None:
            note.updated_at = now
        if not hasattr(note, "shared_with_master"):
            note.shared_with_master = False
        if not hasattr(note, "pinned"):
            note.pinned = False
        self.notes.append(note)
        return note

    def delete(self, note):
        self.deleted.append(note.id)
        self.notes = [n for n in self.notes if n.id != note.id]


class FakeLobbies:
    def __init__(self, lobby):
        self.lobby = lobby

    def get(self, lobby_id):
        if self.lobby and self.lobby.id == lobby_id:
            return self.lobby
        return None

    def get_member(self, *a, **k):
        return None

    def get_characters_map(self, ids):
        return {}


class FakeDB:
    def __init__(self, users=None):
        self._users = {u.id: u for u in (users or [])}
        self.committed = False

    def get(self, model, pk):
        return self._users.get(pk)

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        pass


def _svc(lobby, notes, users, monkeypatch, *, journal_users=None, board_users=None):
    journal_users = set(journal_users or [])
    board_users = set(board_users or []) | journal_users

    db = FakeDB(users)
    svc = NoteService(db)
    svc.notes = FakeNotesRepo(notes)
    svc.lobbies = FakeLobbies(lobby)

    monkeypatch.setattr(roles, "require_view", lambda *a, **k: None)
    monkeypatch.setattr(
        roles,
        "can_manage_journal",
        lambda db, lobby, user: user.id in journal_users or user.id == lobby.owner_id,
    )
    monkeypatch.setattr(
        roles,
        "can_act_on_board",
        lambda db, lobby, user: user.id in board_users or user.id == lobby.owner_id,
    )
    monkeypatch.setattr(roles, "require_can_act_on_board", lambda *a, **k: None)

    async def _broadcast(*a, **k):
        return None

    monkeypatch.setattr("app.services.note.lobby_hub.broadcast", _broadcast)
    return svc


def test_master_does_not_see_foreign_personal(monkeypatch):
    owner = _user(name="Мастер")
    player = _user(name="Игрок")
    lobby = _lobby(owner.id)
    foreign = _note(lobby_id=lobby.id, author_user_id=player.id, scope="personal", title="тайна")
    svc = _svc(lobby, [foreign], [owner, player], monkeypatch, journal_users={owner.id})
    assert svc.list_notes(owner, lobby.id) == []


def test_shared_personal_visible_to_owner_and_comaster(monkeypatch):
    owner = _user(name="Мастер")
    comaster = _user(name="Сомастер")
    lead = _user(name="Повести")
    player = _user(name="Игрок")
    lobby = _lobby(owner.id)
    shared = _note(
        lobby_id=lobby.id,
        author_user_id=player.id,
        scope="personal",
        shared_with_master=True,
        title="открыто",
    )
    svc = _svc(
        lobby,
        [shared],
        [owner, comaster, lead, player],
        monkeypatch,
        journal_users={owner.id, comaster.id},
        board_users={owner.id, comaster.id, lead.id, player.id},
    )
    assert len(svc.list_notes(owner, lobby.id)) == 1
    assert len(svc.list_notes(comaster, lobby.id)) == 1
    monkeypatch.setattr(
        roles,
        "can_manage_journal",
        lambda db, lobby, user: user.id in {owner.id, comaster.id},
    )
    assert svc.list_notes(lead, lobby.id) == []
    other = _user(name="Другой")
    assert svc.list_notes(other, lobby.id) == []


def test_player_cannot_see_master_notes(monkeypatch):
    owner = _user(name="Мастер")
    player = _user(name="Игрок")
    lobby = _lobby(owner.id)
    master_note = _note(lobby_id=lobby.id, author_user_id=owner.id, scope="master")
    svc = _svc(
        lobby,
        [master_note],
        [owner, player],
        monkeypatch,
        journal_users={owner.id},
        board_users={player.id},
    )
    assert svc.list_notes(player, lobby.id) == []
    assert len(svc.list_notes(owner, lobby.id)) == 1


def test_party_any_board_actor_can_edit(monkeypatch):
    owner = _user(name="Мастер")
    p1 = _user(name="А")
    p2 = _user(name="Б")
    lobby = _lobby(owner.id)
    note = _note(
        lobby_id=lobby.id,
        author_user_id=p1.id,
        scope="party",
        title="доска",
        body="v1",
        updated_at=datetime.now(timezone.utc) - timedelta(seconds=10),
    )
    svc = _svc(
        lobby,
        [note],
        [owner, p1, p2],
        monkeypatch,
        journal_users={owner.id},
        board_users={p1.id, p2.id},
    )
    out = _run(
        svc.update_note(p2, note.id, NoteUpdateRequest(body="v2", updated_at=note.updated_at))
    )
    assert out.body == "v2"
    assert out.updated_by_user_id == p2.id


def test_party_delete_only_author_or_journal(monkeypatch):
    owner = _user(name="Мастер")
    author = _user(name="А")
    other = _user(name="Б")
    lobby = _lobby(owner.id)
    note = _note(lobby_id=lobby.id, author_user_id=author.id, scope="party")
    svc = _svc(
        lobby,
        [note],
        [owner, author, other],
        monkeypatch,
        journal_users={owner.id},
        board_users={author.id, other.id},
    )
    with pytest.raises(AppError) as exc:
        _run(svc.delete_note(other, note.id))
    assert exc.value.status_code == 403
    _run(svc.delete_note(owner, note.id))
    assert note.id in svc.notes.deleted


def test_update_conflict_409(monkeypatch):
    owner = _user(name="Мастер")
    p1 = _user(name="А")
    lobby = _lobby(owner.id)
    known = datetime.now(timezone.utc) - timedelta(seconds=30)
    note = _note(
        lobby_id=lobby.id,
        author_user_id=p1.id,
        scope="party",
        updated_at=datetime.now(timezone.utc),
    )
    svc = _svc(
        lobby,
        [note],
        [owner, p1],
        monkeypatch,
        journal_users={owner.id},
        board_users={p1.id},
    )
    with pytest.raises(ConflictError) as exc:
        _run(svc.update_note(p1, note.id, NoteUpdateRequest(body="x", updated_at=known)))
    assert exc.value.code == "note_conflict"


def test_create_personal_without_character(monkeypatch):
    owner = _user(name="Мастер")
    player = _user(name="Игрок")
    lobby = _lobby(owner.id)
    lobby.members = []
    svc = _svc(
        lobby,
        [],
        [owner, player],
        monkeypatch,
        journal_users={owner.id},
        board_users={player.id},
    )
    out = _run(
        svc.create_note(
            player,
            lobby.id,
            NoteCreateRequest(scope="personal", title="без персонажа", body="ok"),
        )
    )
    assert out.scope == "personal"
    assert out.title == "без персонажа"


def test_export_hides_unshared_personal(monkeypatch):
    owner = _user(name="Мастер")
    player = _user(name="Игрок")
    lobby = _lobby(owner.id, name="Кампания")
    notes = [
        _note(lobby_id=lobby.id, author_user_id=player.id, scope="personal", title="тайна"),
        _note(
            lobby_id=lobby.id,
            author_user_id=player.id,
            scope="personal",
            shared_with_master=True,
            title="открыто",
        ),
        _note(lobby_id=lobby.id, author_user_id=player.id, scope="party", title="доска"),
        _note(lobby_id=lobby.id, author_user_id=owner.id, scope="master", title="гм"),
    ]
    svc = _svc(
        lobby,
        notes,
        [owner, player],
        monkeypatch,
        journal_users={owner.id},
        board_users={player.id},
    )
    player_export = svc.export_notes(player, lobby.id)
    assert "тайна" in player_export.content
    assert "доска" in player_export.content
    assert "гм" not in player_export.content

    owner_export = svc.export_notes(owner, lobby.id)
    assert "открыто" in owner_export.content
    assert "тайна" not in owner_export.content
    assert "гм" in owner_export.content
    assert owner_export.filename.endswith(".md")


def test_share_toggle_author_only(monkeypatch):
    owner = _user(name="Мастер")
    player = _user(name="Игрок")
    lobby = _lobby(owner.id)
    note = _note(lobby_id=lobby.id, author_user_id=player.id, scope="personal")
    svc = _svc(
        lobby,
        [note],
        [owner, player],
        monkeypatch,
        journal_users={owner.id},
        board_users={player.id},
    )
    with pytest.raises(NotFoundError):
        _run(svc.update_note(owner, note.id, NoteUpdateRequest(shared_with_master=True)))
    out = _run(svc.update_note(player, note.id, NoteUpdateRequest(shared_with_master=True)))
    assert out.shared_with_master is True


def test_hidden_note_update_returns_not_found(monkeypatch):
    owner = _user(name="Мастер")
    player = _user(name="Игрок")
    lobby = _lobby(owner.id)
    note = _note(lobby_id=lobby.id, author_user_id=player.id, scope="personal")
    svc = _svc(
        lobby,
        [note],
        [owner, player],
        monkeypatch,
        journal_users={owner.id},
        board_users={player.id},
    )
    with pytest.raises(NotFoundError):
        _run(
            svc.update_note(
                owner,
                note.id,
                NoteUpdateRequest(title="x", updated_at=note.updated_at),
            )
        )
