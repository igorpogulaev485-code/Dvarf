"""W-API-01: токены импорта — создание, отзыв, чужой сеттинг, хеш без сырого секрета."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError, NotFoundError
from app.models.world_api_token import WorldApiToken
from app.services import lobby_roles as roles
from app.services.world_api_tokens import WorldApiTokenService, _hash_secret


def _user(name="U"):
    return SimpleNamespace(id=uuid4(), display_name=name, login=None, email=f"{name}@t.test")


def _lobby(owner_id):
    return SimpleNamespace(
        id=uuid4(),
        owner_id=owner_id,
        name="Лобби",
        invite_code="ABC123",
        members=[],
        roles=[],
        settings=[],
        sessions=[],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def _setting(lobby_id, name="Мир"):
    return SimpleNamespace(
        id=uuid4(),
        lobby_id=lobby_id,
        name=name,
        world_notes="",
        is_extra=False,
        deleted_at=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


class FakeLobbies:
    def __init__(self, lobby, setting):
        self.lobby = lobby
        self.setting = setting

    def get(self, lobby_id):
        return self.lobby if self.lobby.id == lobby_id else None

    def get_setting(self, setting_id):
        return self.setting if self.setting.id == setting_id else None


class FakeDB:
    def __init__(self):
        self.tokens: list[WorldApiToken] = []
        self.added: list[object] = []

    def add(self, obj):
        self.added.append(obj)
        if isinstance(obj, WorldApiToken):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            if getattr(obj, "created_at", None) is None:
                obj.created_at = datetime.now(timezone.utc)
            self.tokens.append(obj)

    def commit(self):
        return None

    def refresh(self, obj):
        return None

    def get(self, model, pk):
        if model is WorldApiToken:
            for t in self.tokens:
                if t.id == pk:
                    return t
        return None

    def scalar(self, stmt):  # noqa: ANN001
        # Minimal support for select(WorldApiToken).where(...).limit(1)
        return None

    def scalars(self, stmt):  # noqa: ANN001
        class _Result:
            def __init__(self, rows):
                self._rows = rows

            def all(self):
                return list(self._rows)

        return _Result(
            sorted(self.tokens, key=lambda t: t.created_at, reverse=True)
        )


def _svc(lobby, setting, monkeypatch, *, allow_user_ids=None):
    db = FakeDB()
    svc = WorldApiTokenService(db)
    svc.lobbies = FakeLobbies(lobby, setting)
    allowed = set(allow_user_ids or [lobby.owner_id])

    def _require_wiki(_db, _lobby, user):
        if user.id not in allowed:
            raise AppError("Нет прав", code="lobby_wiki_required", status_code=403)

    monkeypatch.setattr(roles, "require_can_edit_wiki", _require_wiki)
    return svc, db


def test_create_token_shows_secret_once(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    lobby.settings = [setting]
    svc, db = _svc(lobby, setting, monkeypatch)

    created = svc.create(owner, lobby.id, setting.id)
    assert created.secret.startswith("wapi_")
    assert created.token_prefix == created.secret[:8]
    assert len(db.tokens) == 1
    stored = db.tokens[0]
    assert stored.token_hash == _hash_secret(created.secret)
    assert created.secret not in stored.token_hash
    assert getattr(stored, "secret", None) is None

    listed = svc.list(owner, lobby.id, setting.id)
    assert len(listed) == 1
    assert not hasattr(listed[0], "secret") or getattr(listed[0], "secret", None) is None
    dump = listed[0].model_dump()
    assert "secret" not in dump


def test_revoke_token(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, _db = _svc(lobby, setting, monkeypatch)
    created = svc.create(owner, lobby.id, setting.id)
    revoked = svc.revoke(owner, lobby.id, setting.id, created.id)
    assert revoked.revoked_at is not None


def test_foreign_setting_rejected(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    other = _setting(uuid4())
    svc, _db = _svc(lobby, setting, monkeypatch)
    with pytest.raises(NotFoundError) as ei:
        svc.create(owner, lobby.id, other.id)
    assert ei.value.code == "setting_not_found"


def test_player_cannot_create_token(monkeypatch):
    owner = _user("Мастер")
    player = _user("Игрок")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, _db = _svc(lobby, setting, monkeypatch, allow_user_ids=[owner.id])
    with pytest.raises(AppError) as ei:
        svc.create(player, lobby.id, setting.id)
    assert ei.value.status_code == 403


def test_raw_secret_not_in_db_row(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)
    created = svc.create(owner, lobby.id, setting.id)
    row = db.tokens[0]
    assert created.secret not in (row.token_hash, row.token_prefix)
    assert row.token_hash == _hash_secret(created.secret)
