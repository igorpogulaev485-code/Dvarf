"""L-03: открытая сессия в саммари, смена кода, удаление с confirm_name, purge медиа."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.models.lobby import LOBBY_ROLE_COMASTER
from app.schemas.lobby import LobbyDeleteRequest
from app.services import lobby_roles as roles
from app.services.lobby import LobbyService
from app.services.media import purge_lobby_media_dir
from tests.test_l01_lobby_roles import RoleMemoryDB, _lobby, _role, _user


def test_require_can_change_invite_code_owner_only():
    owner = _user()
    other = _user()
    lobby = _lobby(owner.id)
    roles.require_can_change_invite_code(lobby, owner)
    with pytest.raises(AppError) as exc:
        roles.require_can_change_invite_code(lobby, other)
    assert exc.value.status_code == 403
    assert exc.value.code == "lobby_invite_required"

    db = RoleMemoryDB([_role(lobby.id, other.id, LOBBY_ROLE_COMASTER)])
    # comaster: can_change_invite_code False
    assert not roles.can_change_invite_code(lobby, other)
    with pytest.raises(AppError):
        roles.require_can_change_invite_code(lobby, other)
    assert not roles.can_change_invite_code(lobby, _user())  # stranger
    del db


def test_open_session_picks_freshest():
    now = datetime.now(timezone.utc)
    older = SimpleNamespace(
        id=uuid4(),
        closed_at=None,
        created_at=now - timedelta(hours=2),
        updated_at=now - timedelta(hours=2),
    )
    newer = SimpleNamespace(
        id=uuid4(),
        closed_at=None,
        created_at=now - timedelta(hours=1),
        updated_at=now - timedelta(minutes=5),
    )
    closed = SimpleNamespace(
        id=uuid4(),
        closed_at=now,
        created_at=now,
        updated_at=now,
    )
    lobby = SimpleNamespace(sessions=[older, closed, newer])
    picked = LobbyService._open_session(lobby)
    assert picked is not None
    assert picked.id == newer.id

    empty = LobbyService._open_session(SimpleNamespace(sessions=[closed]))
    assert empty is None


def test_purge_lobby_media_dir_removes_tree(tmp_path, monkeypatch):
    from app.services import media as media_mod

    monkeypatch.setattr(media_mod, "uploads_root", lambda: tmp_path)
    lobby_id = uuid4()
    folder = tmp_path / "lobbies" / str(lobby_id)
    folder.mkdir(parents=True)
    (folder / "a.webp").write_bytes(b"x")
    (folder / "a_p.webp").write_bytes(b"y")
    assert folder.exists()
    purge_lobby_media_dir(lobby_id)
    assert not folder.exists()


def test_delete_confirm_name_mismatch(monkeypatch):
    owner = _user()
    lobby_id = uuid4()
    lobby = SimpleNamespace(
        id=lobby_id,
        owner_id=owner.id,
        name="Кампания Дварфов",
        members=[],
    )

    class FakeRepo:
        def get(self, lid):
            return lobby if lid == lobby_id else None

        def delete_lobby(self, row):
            raise AssertionError("delete must not run on mismatch")

    svc = LobbyService.__new__(LobbyService)
    svc.db = SimpleNamespace(commit=lambda: None)
    svc.lobbies = FakeRepo()
    monkeypatch.setattr(roles, "require_can_delete_lobby", lambda *a, **k: None)

    with pytest.raises(AppError) as exc:
        svc.delete(owner, lobby_id, LobbyDeleteRequest(confirm_name="не то"))
    assert exc.value.code == "delete_confirm_mismatch"


def test_delete_uses_require_can_delete_not_raw_owner(monkeypatch):
    owner = _user()
    comaster = _user()
    lobby_id = uuid4()
    lobby = SimpleNamespace(
        id=lobby_id,
        owner_id=owner.id,
        name="Стол",
        members=[],
    )

    class FakeRepo:
        def get(self, lid):
            return lobby if lid == lobby_id else None

        def delete_lobby(self, row):
            raise AssertionError("comaster must not delete")

    svc = LobbyService.__new__(LobbyService)
    svc.db = SimpleNamespace(commit=lambda: None)
    svc.lobbies = FakeRepo()

    with pytest.raises(AppError) as exc:
        svc.delete(comaster, lobby_id, LobbyDeleteRequest(confirm_name="Стол"))
    assert exc.value.status_code == 403
    assert exc.value.code == "lobby_delete_required"


def test_rotate_invite_forbidden_for_comaster(monkeypatch):
    owner = _user()
    comaster = _user()
    lobby_id = uuid4()
    lobby = SimpleNamespace(
        id=lobby_id,
        owner_id=owner.id,
        name="Стол",
        invite_code="OLD123",
        members=[],
    )

    class FakeRepo:
        def get(self, lid):
            return lobby if lid == lobby_id else None

        def allocate_invite_code(self, *, exclude_lobby_id=None):
            raise AssertionError("must not allocate")

    svc = LobbyService.__new__(LobbyService)
    svc.db = SimpleNamespace(commit=lambda: None)
    svc.lobbies = FakeRepo()

    with pytest.raises(AppError) as exc:
        svc.rotate_invite_code(comaster, lobby_id)
    assert exc.value.status_code == 403
    assert exc.value.code == "lobby_invite_required"


def test_rotate_invite_changes_code(monkeypatch):
    owner = _user()
    lobby_id = uuid4()
    lobby = SimpleNamespace(
        id=lobby_id,
        owner_id=owner.id,
        name="Стол",
        invite_code="OLD123",
        members=[],
    )

    class FakeRepo:
        def get(self, lid):
            return lobby if lid == lobby_id else None

        def allocate_invite_code(self, *, exclude_lobby_id=None):
            return "NEW456"

    svc = LobbyService.__new__(LobbyService)
    svc.db = SimpleNamespace(commit=lambda: None)
    svc.lobbies = FakeRepo()
    monkeypatch.setattr(
        LobbyService,
        "_to_detail",
        lambda self, lb, user: SimpleNamespace(
            invite_code=lb.invite_code,
            join_path=f"/join/{lb.invite_code}",
        ),
    )
    detail = svc.rotate_invite_code(owner, lobby_id)
    assert lobby.invite_code == "NEW456"
    assert detail.invite_code == "NEW456"
    assert detail.join_path == "/join/NEW456"


def test_alembic_head_single_l02_in_ancestors():
    """L-03 без миграции: одна голова, l02media7b3e1 в предках (не хардкодить голову)."""
    from pathlib import Path

    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "l02media7b3e1" in ancestor_ids
