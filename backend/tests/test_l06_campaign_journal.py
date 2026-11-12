"""L-06: черновики, скрытые куски, права, перенос с доски, медиа при удалении."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.schemas.lobby import JournalEntryCreateRequest, JournalEntryUpdateRequest
from app.services import lobby_roles as roles
from app.services.journal_markup import (
    has_hidden_segments,
    mask_hidden_for_player,
    reveal_all_hidden,
    strip_hidden_for_search,
)
from app.services.lobby import LobbyService


def _user(name="Юзер"):
    return SimpleNamespace(
        id=uuid4(),
        display_name=name,
        login=None,
        email=f"{name}@ex.test",
    )


def _lobby(owner_id):
    return SimpleNamespace(
        id=uuid4(),
        owner_id=owner_id,
        name="Стол",
        members=[],
        roles=[],
        settings=[],
        sessions=[],
        invite_code="ABCD",
        visibility_profile={},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def _entry(**kwargs):
    now = datetime.now(timezone.utc)
    defaults = dict(
        id=uuid4(),
        lobby_id=uuid4(),
        author_user_id=None,
        entry_type="text",
        title="Т",
        body="тело",
        image_url=None,
        is_draft=False,
        chapter_id=None,
        media_id=None,
        setting_id=None,
        page_id=None,
        from_session_id=None,
        created_at=now,
        updated_at=now,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


class FakeLobbies:
    def __init__(self, lobby):
        self.lobby = lobby
        self.entries: list = []
        self.deleted: list = []

    def get(self, lobby_id):
        return self.lobby if self.lobby and self.lobby.id == lobby_id else None

    def get_setting(self, *_a, **_k):
        return None

    def get_setting_page(self, *_a, **_k):
        return None

    def get_session(self, *_a, **_k):
        return None

    def count_journal_entries(self, lobby_id, *, include_drafts=True, q=None, chapter_id=None):
        return len(
            self.list_journal_entries(
                lobby_id,
                offset=0,
                limit=10_000,
                include_drafts=include_drafts,
                q=q,
                chapter_id=chapter_id,
            )
        )

    def list_journal_entries(
        self,
        lobby_id,
        *,
        offset=0,
        limit=20,
        include_drafts=True,
        q=None,
        chapter_id=None,
    ):
        items = [e for e in self.entries if e.lobby_id == lobby_id]
        if not include_drafts:
            items = [e for e in items if not e.is_draft]
        if chapter_id is not None:
            items = [e for e in items if e.chapter_id == chapter_id]
        if q:
            needle = q.casefold()
            items = [
                e
                for e in items
                if needle in (e.title or "").casefold() or needle in (e.body or "").casefold()
            ]
        items.sort(key=lambda e: e.created_at, reverse=True)
        return items[offset : offset + limit]

    def list_journal_chapters(self, lobby_id):
        return [
            e
            for e in self.entries
            if e.lobby_id == lobby_id and e.entry_type == "chapter" and not e.is_draft
        ]

    def get_session_journal_chapter(self, lobby_id, session_id):
        for e in self.entries:
            if (
                e.lobby_id == lobby_id
                and e.entry_type == "chapter"
                and e.from_session_id == session_id
            ):
                return e
        return None

    def latest_journal_published_at(self, lobby_id):
        published = [e.updated_at for e in self.entries if e.lobby_id == lobby_id and not e.is_draft]
        return max(published) if published else None

    def get_journal_entry(self, entry_id):
        for e in self.entries:
            if e.id == entry_id:
                return e
        return None

    def add_journal_entry(self, entry):
        if getattr(entry, "id", None) is None:
            entry.id = uuid4()
        now = datetime.now(timezone.utc)
        if getattr(entry, "created_at", None) is None:
            entry.created_at = now
        if getattr(entry, "updated_at", None) is None:
            entry.updated_at = now
        if not hasattr(entry, "is_draft"):
            entry.is_draft = False
        self.entries.append(entry)
        return entry

    def delete_journal_entry(self, entry):
        self.deleted.append(entry.id)
        self.entries = [e for e in self.entries if e.id != entry.id]


class FakeNotes:
    def __init__(self, notes=None):
        self.notes = list(notes or [])
        self.deleted = []

    def get(self, note_id):
        for n in self.notes:
            if n.id == note_id:
                return n
        return None

    def delete(self, note):
        self.deleted.append(note.id)
        self.notes = [n for n in self.notes if n.id != note.id]


class FakeDB:
    def __init__(self):
        self.committed = False
        self._media = {}

    def get(self, model, pk):
        name = getattr(model, "__name__", str(model))
        if "LobbyMedia" in name:
            return self._media.get(pk)
        return None

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        pass

    def flush(self):
        pass


def _svc(lobby, monkeypatch, *, journal_users=None):
    journal_users = set(journal_users or [])
    db = FakeDB()
    svc = LobbyService(db)
    svc.lobbies = FakeLobbies(lobby)

    monkeypatch.setattr(roles, "require_view", lambda *a, **k: None)

    def _require_journal(db_, lobby_, user):
        if user.id == lobby_.owner_id or user.id in journal_users:
            return
        raise AppError(
            "Нет прав вести дневник",
            code="lobby_journal_required",
            status_code=403,
        )

    monkeypatch.setattr(roles, "require_can_manage_journal", _require_journal)
    monkeypatch.setattr(
        roles,
        "can_manage_journal",
        lambda db_, lobby_, user: user.id == lobby_.owner_id or user.id in journal_users,
    )
    return svc


def test_markup_hidden_mask_and_reveal():
    body = "видно {{скрыто}}секрет{{/скрыто}} конец"
    assert has_hidden_segments(body)
    assert mask_hidden_for_player(body) == "видно скрыто конец"
    assert "секрет" not in strip_hidden_for_search(body)
    assert reveal_all_hidden(body) == "видно секрет конец"


def test_player_list_hides_drafts(monkeypatch):
    owner = _user("Мастер")
    player = _user("Игрок")
    lobby = _lobby(owner.id)
    svc = _svc(lobby, monkeypatch)
    svc.lobbies.add_journal_entry(
        _entry(lobby_id=lobby.id, title="Черновик", is_draft=True, body="тайна")
    )
    svc.lobbies.add_journal_entry(
        _entry(lobby_id=lobby.id, title="Пост", is_draft=False, body="ок")
    )

    page = svc.list_journal(player, lobby.id)
    assert len(page.items) == 1
    assert page.items[0].title == "Пост"

    master_page = svc.list_journal(owner, lobby.id)
    assert len(master_page.items) == 2


def test_player_sees_masked_hidden_body(monkeypatch):
    owner = _user("Мастер")
    player = _user("Игрок")
    lobby = _lobby(owner.id)
    svc = _svc(lobby, monkeypatch)
    svc.lobbies.add_journal_entry(
        _entry(
            lobby_id=lobby.id,
            title="Пост",
            body="начало {{скрыто}}спойлер{{/скрыто}} конец",
            is_draft=False,
        )
    )
    page = svc.list_journal(player, lobby.id)
    assert "спойлер" not in page.items[0].body
    assert "скрыто" in page.items[0].body
    master = svc.list_journal(owner, lobby.id)
    assert master.items[0].has_hidden_segments is True
    assert "спойлер" in master.items[0].body


def test_player_cannot_create(monkeypatch):
    owner = _user("Мастер")
    player = _user("Игрок")
    lobby = _lobby(owner.id)
    svc = _svc(lobby, monkeypatch)
    with pytest.raises(AppError) as exc:
        svc.create_journal_entry(
            player,
            lobby.id,
            JournalEntryCreateRequest(entry_type="text", title="Нет", body="нет"),
        )
    assert exc.value.status_code == 403


def test_create_draft_and_publish(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    svc = _svc(lobby, monkeypatch)
    out = svc.create_journal_entry(
        owner,
        lobby.id,
        JournalEntryCreateRequest(
            entry_type="text",
            title="Д",
            body="черновик",
            is_draft=True,
        ),
    )
    assert out.is_draft is True
    published = svc.update_journal_entry(
        owner,
        out.id,
        JournalEntryUpdateRequest(is_draft=False),
    )
    assert published.is_draft is False


def test_reveal_hidden(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    svc = _svc(lobby, monkeypatch)
    created = svc.create_journal_entry(
        owner,
        lobby.id,
        JournalEntryCreateRequest(
            entry_type="text",
            title="С",
            body="а {{скрыто}}б{{/скрыто}} в",
        ),
    )
    revealed = svc.update_journal_entry(
        owner,
        created.id,
        JournalEntryUpdateRequest(reveal_hidden=True),
    )
    assert revealed.body == "а б в"
    assert revealed.has_hidden_segments is False


def test_transfer_from_party_note(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    svc = _svc(lobby, monkeypatch)
    note_id = uuid4()
    note = SimpleNamespace(
        id=note_id,
        lobby_id=lobby.id,
        scope="party",
        title="С доски",
        body="текст доски",
    )
    notes = FakeNotes([note])
    monkeypatch.setattr(
        "app.repositories.note.NoteRepository",
        lambda db: notes,
    )
    out = svc.create_journal_entry(
        owner,
        lobby.id,
        JournalEntryCreateRequest(
            entry_type="text",
            is_draft=True,
            source_note_id=note_id,
        ),
    )
    assert out.title == "С доски"
    assert out.body == "текст доски"
    assert out.is_draft is True
    assert notes.deleted == []


def test_delete_clears_media(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    svc = _svc(lobby, monkeypatch)
    entry = _entry(lobby_id=lobby.id, media_id=uuid4(), is_draft=False)
    svc.lobbies.add_journal_entry(entry)

    called = {}

    class FakeMedia:
        def __init__(self, db):
            pass

        def delete_for_attachment(self, lobby_id, kind, attached_to_id):
            called["args"] = (lobby_id, kind, attached_to_id)
            return 1

    monkeypatch.setattr("app.services.media.LobbyMediaService", FakeMedia)
    lobby_id, published = svc.delete_journal_entry(owner, entry.id)
    assert lobby_id == lobby.id
    assert published is True
    assert called["args"] == (lobby.id, "journal", entry.id)
    assert entry.id in svc.lobbies.deleted


def test_player_search_skips_hidden(monkeypatch):
    owner = _user("Мастер")
    player = _user("Игрок")
    lobby = _lobby(owner.id)
    svc = _svc(lobby, monkeypatch)
    svc.lobbies.add_journal_entry(
        _entry(
            lobby_id=lobby.id,
            title="Открыто",
            body="слово {{скрыто}}секретное{{/скрыто}}",
            is_draft=False,
        )
    )
    open_hits = svc.list_journal(player, lobby.id, q="слово")
    assert len(open_hits.items) == 1
    hidden_hits = svc.list_journal(player, lobby.id, q="секретное")
    assert len(hidden_hits.items) == 0
