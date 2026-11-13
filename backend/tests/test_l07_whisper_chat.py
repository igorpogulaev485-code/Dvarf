"""L-07: шёпот, факт для мастера, письма через can_manage_journal, бейджи."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.schemas.chat import (
    ChatChannelCreateRequest,
    ChatMessageCreateRequest,
    ChatReadRequest,
    MasterLetterCreateRequest,
    WhisperCreateRequest,
    WhisperMessageCreateRequest,
)
from app.services import lobby_roles as roles
from app.services.chat import ChatService, _ordered_pair


def _run(coro):
    return asyncio.run(coro)


def _user(uid=None, name="Игрок"):
    return SimpleNamespace(
        id=uid or uuid4(),
        display_name=name,
        login=None,
        email=f"{name}@ex.test",
    )


def _lobby(owner_id, lobby_id=None, members=None):
    return SimpleNamespace(
        id=lobby_id or uuid4(),
        owner_id=owner_id,
        name="Стол",
        members=list(members or []),
    )


def _member(user_id, character_id=None, character_name="Герой"):
    cid = character_id or uuid4()
    return SimpleNamespace(
        id=uuid4(),
        user_id=user_id,
        character_id=cid,
        character_name=character_name,
    )


class FakeChatRepo:
    def __init__(self) -> None:
        self.channels = []
        self.messages = []
        self.letters = []
        self.letter_messages = []
        self.threads = []
        self.whisper_messages = []
        self.cursors = []

    def list_channels(self, lobby_id):
        return [c for c in self.channels if c.lobby_id == lobby_id]

    def get_channel(self, channel_id):
        return next((c for c in self.channels if c.id == channel_id), None)

    def create_channel(self, *, lobby_id, name, user_id):
        ch = SimpleNamespace(
            id=uuid4(),
            lobby_id=lobby_id,
            name=name,
            created_by_user_id=user_id,
            created_at=datetime.now(timezone.utc),
        )
        self.channels.append(ch)
        return ch

    def count_messages(self, channel_id):
        return sum(1 for m in self.messages if m.channel_id == channel_id)

    def count_unread_channel_messages(self, channel_id, *, user_id, since):
        n = 0
        for m in self.messages:
            if m.channel_id != channel_id:
                continue
            if m.author_user_id == user_id:
                continue
            if since is not None and m.created_at <= since:
                continue
            n += 1
        return n

    def list_messages(self, channel_id, *, limit=50, before=None):
        rows = [m for m in self.messages if m.channel_id == channel_id]
        rows.sort(key=lambda m: m.created_at)
        return rows[-limit:]

    def add_message(self, message):
        if getattr(message, "id", None) is None:
            message.id = uuid4()
        if getattr(message, "created_at", None) is None:
            message.created_at = datetime.now(timezone.utc)
        self.messages.append(message)
        return message

    def list_letters_for_lobby(self, lobby_id):
        return [l for l in self.letters if l.lobby_id == lobby_id]

    def list_letters_for_user(self, lobby_id, user_id):
        return [l for l in self.letters if l.lobby_id == lobby_id and l.author_user_id == user_id]

    def list_waiting_master(self, lobby_id):
        return [
            l
            for l in self.letters
            if l.lobby_id == lobby_id and l.status == "waiting_master"
        ]

    def get_letter(self, letter_id):
        letter = next((l for l in self.letters if l.id == letter_id), None)
        if letter is None:
            return None
        letter.messages = [m for m in self.letter_messages if m.letter_id == letter.id]
        return letter

    def add_letter(self, letter):
        if getattr(letter, "id", None) is None:
            letter.id = uuid4()
        if getattr(letter, "created_at", None) is None:
            now = datetime.now(timezone.utc)
            letter.created_at = now
            letter.updated_at = now
        self.letters.append(letter)
        return letter

    def add_letter_message(self, message):
        if getattr(message, "id", None) is None:
            message.id = uuid4()
        if getattr(message, "created_at", None) is None:
            message.created_at = datetime.now(timezone.utc)
        self.letter_messages.append(message)
        return message

    def get_whisper_thread(self, thread_id):
        return next((t for t in self.threads if t.id == thread_id), None)

    def get_whisper_thread_by_pair(self, lobby_id, user_low_id, user_high_id):
        return next(
            (
                t
                for t in self.threads
                if t.lobby_id == lobby_id
                and t.user_low_id == user_low_id
                and t.user_high_id == user_high_id
            ),
            None,
        )

    def list_whisper_threads_for_user(self, lobby_id, user_id):
        return [
            t
            for t in self.threads
            if t.lobby_id == lobby_id
            and user_id in {t.user_low_id, t.user_high_id}
        ]

    def list_whisper_threads_for_lobby(self, lobby_id):
        return [t for t in self.threads if t.lobby_id == lobby_id]

    def create_whisper_thread(self, *, lobby_id, user_low_id, user_high_id):
        now = datetime.now(timezone.utc)
        thread = SimpleNamespace(
            id=uuid4(),
            lobby_id=lobby_id,
            user_low_id=user_low_id,
            user_high_id=user_high_id,
            created_at=now,
            last_message_at=now,
            messages=[],
        )
        self.threads.append(thread)
        return thread

    def list_whisper_messages(self, thread_id, *, limit=50):
        rows = [m for m in self.whisper_messages if m.thread_id == thread_id]
        rows.sort(key=lambda m: m.created_at)
        return rows[-limit:]

    def count_unread_whisper_messages(self, thread_id, *, user_id, since):
        n = 0
        for m in self.whisper_messages:
            if m.thread_id != thread_id:
                continue
            if m.author_user_id == user_id:
                continue
            if since is not None and m.created_at <= since:
                continue
            n += 1
        return n

    def add_whisper_message(self, message):
        if getattr(message, "id", None) is None:
            message.id = uuid4()
        if getattr(message, "created_at", None) is None:
            message.created_at = datetime.now(timezone.utc)
        self.whisper_messages.append(message)
        return message

    def get_read_cursor(self, *, user_id, target_kind, target_id):
        return next(
            (
                c
                for c in self.cursors
                if c.user_id == user_id
                and c.target_kind == target_kind
                and c.target_id == target_id
            ),
            None,
        )

    def upsert_read_cursor(self, *, lobby_id, user_id, target_kind, target_id, last_read_at):
        row = self.get_read_cursor(
            user_id=user_id, target_kind=target_kind, target_id=target_id
        )
        if row is None:
            row = SimpleNamespace(
                id=uuid4(),
                lobby_id=lobby_id,
                user_id=user_id,
                target_kind=target_kind,
                target_id=target_id,
                last_read_at=last_read_at,
            )
            self.cursors.append(row)
        else:
            row.last_read_at = last_read_at
        return row

    def list_read_cursors_for_user(self, lobby_id, user_id, *, target_kind=None):
        rows = [c for c in self.cursors if c.lobby_id == lobby_id and c.user_id == user_id]
        if target_kind is not None:
            rows = [c for c in rows if c.target_kind == target_kind]
        return rows

    def count_unread_letter_messages(self, letter_id, *, user_id, since):
        n = 0
        for m in self.letter_messages:
            if m.letter_id != letter_id:
                continue
            if m.author_user_id == user_id:
                continue
            if since is not None and m.created_at <= since:
                continue
            n += 1
        return n

    def letter_has_unread_for_author(self, letter, *, user_id, since):
        if letter.author_user_id != user_id:
            return False
        if letter.status == "waiting_player":
            return True
        return self.count_unread_letter_messages(letter.id, user_id=user_id, since=since) > 0


class FakeLobbies:
    def __init__(self, lobby, characters=None, role_rows=None):
        self.lobby = lobby
        self.characters = characters or {}
        self.role_rows = list(role_rows or [])

    def get(self, lobby_id):
        return self.lobby if self.lobby.id == lobby_id else None

    def get_member(self, lobby_id, character_id):
        for m in self.lobby.members:
            if m.character_id == character_id:
                return m
        return None

    def get_characters_map(self, character_ids):
        return {cid: self.characters[cid] for cid in character_ids if cid in self.characters}

    def list_roles(self, lobby_id):
        return [r for r in self.role_rows if r.lobby_id == lobby_id]


class FakeDb:
    def __init__(self, users: dict):
        self.users = users
        self.committed = False

    def get(self, model, pk):
        return self.users.get(pk)

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        return obj


class FakeHub:
    def __init__(self):
        self.events = []

    async def broadcast(self, lobby_id, message, *, only_user_ids=None):
        self.events.append(
            {
                "lobby_id": lobby_id,
                "message": message,
                "only_user_ids": only_user_ids,
            }
        )


def _service(owner, player_a, player_b, *, comaster=None, observer=None, monkeypatch, hub):
    char_a = SimpleNamespace(id=uuid4(), name="Альфа")
    char_b = SimpleNamespace(id=uuid4(), name="Бета")
    members = [
        _member(player_a.id, char_a.id, "Альфа"),
        _member(player_b.id, char_b.id, "Бета"),
    ]
    lobby = _lobby(owner.id, members=members)
    role_rows = []
    if comaster is not None:
        role_rows.append(
            SimpleNamespace(
                lobby_id=lobby.id,
                user_id=comaster.id,
                role="comaster",
            )
        )
    if observer is not None:
        role_rows.append(
            SimpleNamespace(
                lobby_id=lobby.id,
                user_id=observer.id,
                role="observer",
            )
        )
    users = {u.id: u for u in [owner, player_a, player_b] if u}
    if comaster:
        users[comaster.id] = comaster
    if observer:
        users[observer.id] = observer

    svc = ChatService(FakeDb(users))
    svc.chats = FakeChatRepo()
    svc.lobbies = FakeLobbies(
        lobby,
        characters={char_a.id: char_a, char_b.id: char_b},
        role_rows=role_rows,
    )

    monkeypatch.setattr(roles, "require_view", lambda *a, **k: None)
    monkeypatch.setattr(
        roles,
        "require_can_act_on_board",
        lambda db, lob, user: (
            (_ for _ in ()).throw(
                AppError("forbidden", code="forbidden", status_code=403)
            )
            if observer is not None and user.id == observer.id
            else None
        ),
    )
    monkeypatch.setattr(
        roles,
        "can_act_on_board",
        lambda db, lob, user: not (observer is not None and user.id == observer.id),
    )
    monkeypatch.setattr(
        roles,
        "can_manage_journal",
        lambda db, lob, user: user.id == owner.id
        or (comaster is not None and user.id == comaster.id),
    )
    monkeypatch.setattr(
        roles,
        "can_edit_wiki",
        lambda db, lob, user: user.id == owner.id
        or (comaster is not None and user.id == comaster.id),
    )
    monkeypatch.setattr(
        roles,
        "can_view_lobby",
        lambda *a, **k: True,
    )
    monkeypatch.setattr(
        roles,
        "is_observer",
        lambda db, lob, user: observer is not None and user.id == observer.id,
    )
    monkeypatch.setattr("app.services.chat.lobby_hub", hub)
    return svc, lobby, char_a, char_b


def test_ordered_pair_stable():
    a, b = uuid4(), uuid4()
    assert _ordered_pair(a, b) == _ordered_pair(b, a)


def test_whisper_participants_and_third_403(monkeypatch):
    hub = FakeHub()
    owner = _user(name="Мастер")
    a = _user(name="A")
    b = _user(name="B")
    c = _user(name="C")
    svc, lobby, char_a, _char_b = _service(owner, a, b, monkeypatch=monkeypatch, hub=hub)
    # third player also a member for reachability
    svc.lobbies.lobby.members.append(_member(c.id, uuid4(), "Гамма"))
    svc.db.users[c.id] = c

    thread = svc.open_whisper(a, lobby.id, WhisperCreateRequest(peer_user_id=b.id))
    msg = _run(
        svc.post_whisper_message(
            a,
            thread.id,
            WhisperMessageCreateRequest(body="псс", character_id=char_a.id),
        )
    )
    assert msg.body == "псс"

    body = svc.list_whisper_messages(b, thread.id)
    assert len(body) == 1

    with pytest.raises(AppError) as exc:
        svc.list_whisper_messages(c, thread.id)
    assert exc.value.status_code == 403

    with pytest.raises(AppError) as exc2:
        svc.list_whisper_messages(owner, thread.id)
    assert exc2.value.status_code == 403

    facts = svc.list_whisper_facts(owner, lobby.id)
    assert len(facts) == 1
    assert {facts[0].label_a, facts[0].label_b} == {"Альфа", "Бета"}

    types = [e["message"]["type"] for e in hub.events]
    assert "whisper_changed" in types
    assert "whisper_fact" in types
    for e in hub.events:
        dumped = str(e["message"])
        assert "псс" not in dumped


def test_comaster_sees_facts_lead_today_style_forbidden(monkeypatch):
    hub = FakeHub()
    owner = _user(name="Мастер")
    comaster = _user(name="Сомастер")
    a = _user(name="A")
    b = _user(name="B")
    lead = _user(name="Ведёт")
    svc, lobby, char_a, _ = _service(
        owner, a, b, comaster=comaster, monkeypatch=monkeypatch, hub=hub
    )
    svc.lobbies.lobby.members.append(_member(lead.id, uuid4(), "Лидер"))
    svc.db.users[lead.id] = lead
    # lead can act on board but is not journal manager
    monkeypatch.setattr(
        roles,
        "can_manage_journal",
        lambda db, lob, user: user.id in {owner.id, comaster.id},
    )

    thread = svc.open_whisper(a, lobby.id, WhisperCreateRequest(peer_user_id=b.id))
    _run(
        svc.post_whisper_message(
            a,
            thread.id,
            WhisperMessageCreateRequest(body="секрет", character_id=char_a.id),
        )
    )

    facts = svc.list_whisper_facts(comaster, lobby.id)
    assert len(facts) == 1

    with pytest.raises(AppError) as exc:
        svc.list_whisper_facts(lead, lobby.id)
    assert exc.value.status_code == 403

    with pytest.raises(AppError):
        svc.list_whisper_messages(lead, thread.id)


def test_observer_cannot_whisper_or_letter(monkeypatch):
    hub = FakeHub()
    owner = _user(name="Мастер")
    a = _user(name="A")
    b = _user(name="B")
    observer = _user(name="Зритель")
    svc, lobby, char_a, _ = _service(
        owner, a, b, observer=observer, monkeypatch=monkeypatch, hub=hub
    )

    with pytest.raises(AppError) as exc:
        svc.open_whisper(observer, lobby.id, WhisperCreateRequest(peer_user_id=a.id))
    assert exc.value.status_code == 403

    with pytest.raises(AppError) as exc2:
        _run(
            svc.create_letter(
                observer,
                lobby.id,
                MasterLetterCreateRequest(subject="?", body="привет", character_id=char_a.id),
            )
        )
    assert exc2.value.status_code == 403


def test_letter_badge_for_comaster_not_raw_owner_only(monkeypatch):
    hub = FakeHub()
    owner = _user(name="Мастер")
    comaster = _user(name="Сомастер")
    a = _user(name="A")
    b = _user(name="B")
    svc, lobby, char_a, _ = _service(
        owner, a, b, comaster=comaster, monkeypatch=monkeypatch, hub=hub
    )

    _run(
        svc.create_letter(
            a,
            lobby.id,
            MasterLetterCreateRequest(subject="Вопрос", body="тело", character_id=char_a.id),
        )
    )
    badge_owner = svc.letter_badge(owner, lobby.id)
    badge_co = svc.letter_badge(comaster, lobby.id)
    assert badge_owner.count == 1
    assert badge_co.count == 1

    letters_co = svc.list_letters(comaster, lobby.id)
    assert len(letters_co) == 1


def test_whisper_with_master_readable_by_master(monkeypatch):
    hub = FakeHub()
    owner = _user(name="Мастер")
    a = _user(name="A")
    b = _user(name="B")
    svc, lobby, char_a, _ = _service(owner, a, b, monkeypatch=monkeypatch, hub=hub)

    thread = svc.open_whisper(a, lobby.id, WhisperCreateRequest(peer_user_id=owner.id))
    _run(
        svc.post_whisper_message(
            a,
            thread.id,
            WhisperMessageCreateRequest(body="мастеру", character_id=char_a.id),
        )
    )
    body = svc.list_whisper_messages(owner, thread.id)
    assert len(body) == 1
    assert body[0].body == "мастеру"
    # не факт игрок↔игрок
    assert svc.list_whisper_facts(owner, lobby.id) == []


def test_mark_read_clears_channel_unread(monkeypatch):
    hub = FakeHub()
    owner = _user(name="Мастер")
    a = _user(name="A")
    b = _user(name="B")
    svc, lobby, char_a, _ = _service(owner, a, b, monkeypatch=monkeypatch, hub=hub)

    channel = svc.create_channel(a, lobby.id, ChatChannelCreateRequest(name="общий"))
    _run(
        svc.post_message(
            a,
            channel.id,
            ChatMessageCreateRequest(body="всем", character_id=char_a.id),
        )
    )
    badge_b = svc.chats_badge(b, lobby.id)
    assert badge_b.channels >= 1
    cleared = svc.mark_read(
        b,
        lobby.id,
        ChatReadRequest(target_kind="channel", target_id=channel.id),
    )
    assert cleared.channels == 0
