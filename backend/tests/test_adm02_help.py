"""ADM-02: помощь пользователю — почта, сессии, блок, удаление, без секретов."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.exceptions import AppError, NotFoundError
from app.core.security import hash_password
from app.main import app
from app.models.admin import AdminRoleName, AdminSecret
from app.models.user import AuthProvider
from app.services import admin as admin_mod
from app.services.admin import (
    ACCOUNT_BLOCKED_CODE,
    ACTION_PASSWORD_FAILED,
    ACTION_USER_BLOCKED,
    ACTION_USER_DELETED,
    AdminService,
    raise_if_blocked,
)


def _user(**kwargs):
    base = dict(
        id=uuid4(),
        email="player@example.com",
        password_hash=hash_password("login-password-ok"),
        display_name="Игрок",
        full_name="Секретное ФИО",
        phone="+79990001122",
        avatar_url=None,
        identities=[],
        auth_sessions=[],
        email_verified_at=datetime.now(timezone.utc),
        blocked_at=None,
        blocked_by=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


class MemoryAdminDB:
    def __init__(self) -> None:
        self.roles: list[SimpleNamespace] = []
        self.secrets: dict = {}
        self.audit: list[SimpleNamespace] = []
        self.users: list = []
        self._deleted: list = []
        self._added: list = []

    def scalar(self, stmt):  # noqa: ANN001
        sql = str(stmt).lower()
        try:
            params = stmt.compile().params
        except Exception:
            params = {}

        if "admin_roles" in sql and "count" in sql:
            role = params.get("role_1") or params.get("role")
            return sum(1 for r in self.roles if role is None or r.role == role)

        if "admin_roles" in sql:
            user_id = params.get("user_id_1") or params.get("user_id")
            role = params.get("role_1") or params.get("role")
            for row in self.roles:
                if user_id is not None and row.user_id != user_id:
                    continue
                if role is not None and row.role != role:
                    continue
                return row.id
            return None

        if "admin_secrets" in sql:
            user_id = params.get("user_id_1") or params.get("user_id")
            if user_id in self.secrets:
                return user_id
            return None

        if "from users" in sql.replace('"', "") and "count" not in sql:
            user_id = params.get("id_1") or params.get("id")
            email = params.get("email_1") or params.get("email")
            for u in self.users:
                if user_id is not None and u.id == user_id:
                    return u
                if email is not None and u.email == email:
                    return u
            return None

        if "count" in sql and "from users" in sql.replace('"', ""):
            return len(self.users)

        if "count" in sql and "lobbies" in sql:
            return 0

        if "count" in sql and "lobby_members" in sql:
            return 0

        return None

    def get(self, model, key):  # noqa: ANN001
        if model is AdminSecret or getattr(model, "__name__", "") == "AdminSecret":
            return self.secrets.get(key)
        return None

    def add(self, obj) -> None:  # noqa: ANN001
        self._added.append(obj)
        name = type(obj).__name__
        if name == "AdminRole":
            if not any(r.user_id == obj.user_id and r.role == obj.role for r in self.roles):
                self.roles.append(obj)
            return
        if name == "AdminSecret":
            self.secrets[obj.user_id] = obj
            return
        if name == "AdminAuditLog":
            self.audit.append(obj)
            return
        if hasattr(obj, "password_hash") and hasattr(obj, "failed_attempts") and hasattr(obj, "user_id"):
            self.secrets[obj.user_id] = obj
            return
        if hasattr(obj, "action") and hasattr(obj, "actor_id"):
            self.audit.append(obj)

    def commit(self) -> None:
        return None

    def scalars(self, stmt):  # noqa: ANN001
        return SimpleNamespace(unique=lambda: SimpleNamespace(all=lambda: list(self.users)))

    def execute(self, stmt):  # noqa: ANN001
        return SimpleNamespace(all=lambda: [])

    def delete(self, obj) -> None:  # noqa: ANN001
        self._deleted.append(obj)
        if obj in self.users:
            self.users.remove(obj)


@pytest.fixture
def db():
    return MemoryAdminDB()


def _grant_admin(db, user):
    db.roles.append(
        SimpleNamespace(
            id=uuid4(),
            user_id=user.id,
            role=AdminRoleName.full_admin.value,
            granted_by=None,
        )
    )


def _setup_admin(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "")
    monkeypatch.setattr(admin_mod.settings, "auth_email_stub", True)
    admin = _user(email="admin@example.com", display_name="Админ")
    _grant_admin(db, admin)
    svc = AdminService(db)
    svc.setup_password(admin, "admin-secret-1", "admin-secret-1")
    return admin, svc


def test_panel_disabled_help_404(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", False)
    with pytest.raises(NotFoundError):
        AdminService(db).get_account(_user(), uuid4())


def test_moderator_cannot_help(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "")
    mod = _user(email="mod@example.com")
    db.roles.append(
        SimpleNamespace(
            id=uuid4(),
            user_id=mod.id,
            role=AdminRoleName.catalog_moderator.value,
            granted_by=None,
        )
    )
    with pytest.raises(AppError) as exc:
        AdminService(db).list_user_sessions(mod, uuid4())
    assert exc.value.status_code == 403


def test_dangerous_requires_admin_password(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    player = _user(email="other@example.com")
    db.users = [admin, player]
    with pytest.raises(AppError) as exc:
        svc.block_user(admin, player.id, admin_password="wrong-password")
    assert exc.value.code == "admin_password_invalid"
    assert any(a.action == ACTION_PASSWORD_FAILED for a in db.audit)


def test_login_password_not_accepted_for_danger(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    player = _user(email="other@example.com")
    db.users = [admin, player]
    with pytest.raises(AppError) as exc:
        svc.block_user(admin, player.id, admin_password="login-password-ok")
    assert exc.value.code == "admin_password_invalid"


def test_raise_if_blocked():
    user = _user(blocked_at=datetime.now(timezone.utc))
    with pytest.raises(AppError) as exc:
        raise_if_blocked(user)
    assert exc.value.code == ACCOUNT_BLOCKED_CODE
    assert exc.value.status_code == 403
    assert "заблокирован" in exc.value.message.lower()
    assert "админ" not in exc.value.message.lower()


def test_block_and_unblock(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    player = _user(email="other@example.com")
    db.users = [admin, player]

    class FakeAuth:
        def __init__(self, _db):
            pass

        def revoke_all_sessions(self, _uid):
            return SimpleNamespace(message="ok", revoked=2)

    monkeypatch.setattr("app.services.auth.AuthService", FakeAuth)

    res = svc.block_user(admin, player.id, admin_password="admin-secret-1")
    assert player.blocked_at is not None
    assert player.blocked_by == admin.id
    assert "заблокирован" in res.message.lower()
    assert any(a.action == ACTION_USER_BLOCKED for a in db.audit)

    item = svc._serialize_account(player)
    assert item.is_blocked is True
    dumped = item.model_dump()
    assert "password" not in dumped
    assert "password_hash" not in dumped
    assert "token" not in dumped
    assert "full_name" not in dumped
    assert "phone" not in dumped
    assert "Секретное ФИО" not in str(dumped)
    assert "+79990001122" not in str(dumped)
    assert "has_password" in dumped["login_methods"]

    res2 = svc.unblock_user(admin, player.id, admin_password="admin-secret-1")
    assert player.blocked_at is None
    assert "разблокирован" in res2.message.lower()


def test_cannot_block_self(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    db.users = [admin]
    with pytest.raises(AppError) as exc:
        svc.block_user(admin, admin.id, admin_password="admin-secret-1")
    assert exc.value.code == "admin_self_forbidden"


def test_cannot_block_last_full_admin(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    other_admin = _user(email="second-admin@example.com", display_name="Второй")
    # Только один full_admin в ролях — admin. other_admin тоже full, но count проверяет роли.
    # Сделаем other_admin единственным full admin, actor — другой full.
    db.roles = [
        SimpleNamespace(
            id=uuid4(),
            user_id=other_admin.id,
            role=AdminRoleName.full_admin.value,
            granted_by=None,
        )
    ]
    # actor admin тоже нужен как full для require_admin_password — добавим обоих, count=2
    # Для «последнего» — только one role on target.
    db.roles = [
        SimpleNamespace(id=uuid4(), user_id=admin.id, role=AdminRoleName.full_admin.value, granted_by=None),
        SimpleNamespace(id=uuid4(), user_id=other_admin.id, role=AdminRoleName.full_admin.value, granted_by=None),
    ]
    # Удалим роль admin, оставим только other — но тогда admin не full.
    # Правильный сценарий: actor full, target is the only full admin (same person?) —
    # Нельзя затронуть последнего: target is full and count <= 1.
    db.roles = [
        SimpleNamespace(id=uuid4(), user_id=admin.id, role=AdminRoleName.full_admin.value, granted_by=None),
    ]
    # target = other without role → ok. target = admin as last → self forbidden first.
    # Create third user who is the sole full admin, actor has role too then remove actor...
    sole = _user(email="sole@example.com")
    actor = _user(email="actor@example.com", display_name="Актёр")
    actor.password_hash = hash_password("login-password-ok")
    db.roles = [
        SimpleNamespace(id=uuid4(), user_id=actor.id, role=AdminRoleName.full_admin.value, granted_by=None),
        SimpleNamespace(id=uuid4(), user_id=sole.id, role=AdminRoleName.full_admin.value, granted_by=None),
    ]
    AdminService(db).setup_password(actor, "admin-secret-9", "admin-secret-9")
    # Remove actor from roles so sole is last — but then actor can't act.
    # Keep both, then drop actor role after setup — use monkeypatch on _count.
    db.users = [actor, sole]
    db.roles = [
        SimpleNamespace(id=uuid4(), user_id=actor.id, role=AdminRoleName.full_admin.value, granted_by=None),
        SimpleNamespace(id=uuid4(), user_id=sole.id, role=AdminRoleName.full_admin.value, granted_by=None),
    ]
    # Simulate only one full admin left (sole) while actor still has role for auth:
    monkeypatch.setattr(AdminService, "_count_full_admins", lambda self: 1)
    monkeypatch.setattr(AdminService, "_is_full_admin_user", lambda self, uid: uid == sole.id)
    with pytest.raises(AppError) as exc:
        AdminService(db).block_user(actor, sole.id, admin_password="admin-secret-9")
    assert exc.value.code == "admin_last_admin_forbidden"


def test_unlink_last_oauth_rejected(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    player = _user(
        email=None,
        password_hash=None,
        identities=[SimpleNamespace(provider=AuthProvider.yandex, provider_user_id="y1")],
    )
    db.users = [admin, player]
    with pytest.raises(AppError) as exc:
        svc.unlink_oauth(
            admin,
            player.id,
            provider="yandex",
            admin_password="admin-secret-1",
        )
    assert exc.value.code == "last_login_method"


def test_delete_requires_confirm(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    player = _user(email="victim@example.com")
    db.users = [admin, player]
    with pytest.raises(AppError) as exc:
        svc.delete_user(
            admin,
            player.id,
            confirm="wrong@example.com",
            admin_password="admin-secret-1",
        )
    assert exc.value.code == "delete_confirm_mismatch"


def test_delete_success(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    player = _user(email="victim@example.com")
    db.users = [admin, player]

    class FakeUsers:
        def __init__(self, inner):
            self.inner = inner

        def delete_user(self, user):
            self.inner.delete(user)

    monkeypatch.setattr("app.repositories.user.UserRepository", FakeUsers)
    monkeypatch.setattr(
        "app.services.avatar.is_uploaded_avatar_url",
        lambda _url: False,
    )

    res = svc.delete_user(
        admin,
        player.id,
        confirm="victim@example.com",
        admin_password="admin-secret-1",
    )
    assert player not in db.users
    assert any(a.action == ACTION_USER_DELETED for a in db.audit)
    audit = next(a for a in db.audit if a.action == ACTION_USER_DELETED)
    meta = audit.meta or {}
    raw = str(meta)
    assert "password" not in raw
    assert "token" not in raw
    assert "удалён" in res.message.lower()


def test_http_help_flag_off_404(monkeypatch):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", False)

    def fake_user():
        return _user(email="admin@example.com")

    from app.api import deps

    app.dependency_overrides[deps.get_current_user] = fake_user
    try:
        client = TestClient(app)
        uid = str(uuid4())
        assert client.get(f"/admin/accounts/{uid}").status_code == 404
        assert client.get(f"/admin/accounts/{uid}/sessions").status_code == 404
        assert client.post(
            f"/admin/accounts/{uid}/block",
            json={"admin_password": "x"},
        ).status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_mark_verified(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    player = _user(email="need@example.com", email_verified_at=None)
    db.users = [admin, player]

    class FakeUsers:
        def __init__(self, inner):
            self.inner = inner

        def mark_email_verified(self, user):
            user.email_verified_at = datetime.now(timezone.utc)
            return user

    monkeypatch.setattr("app.repositories.user.UserRepository", FakeUsers)
    res = svc.mark_email_verified(admin, player.id, admin_password="admin-secret-1")
    assert player.email_verified_at is not None
    assert "подтвержд" in res.message.lower()
