"""ADM-07: выдача и снятие ролей, bootstrap не трогаем, доступ пропадает сразу."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.core.security import hash_password
from app.models.admin import AdminRoleName, AdminSecret
from app.services import admin as admin_mod
from app.services.admin import (
    ACTION_ROLE_GRANTED,
    ACTION_ROLE_REVOKED,
    BOOTSTRAP_REVOKE_HINT,
    ROLE_SOURCE_BOOTSTRAP,
    AdminService,
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
            source = params.get("source_1") or params.get("source")
            for row in self.roles:
                if user_id is not None and row.user_id != user_id:
                    continue
                if role is not None and row.role != role:
                    continue
                if source is not None and getattr(row, "source", None) != source:
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
        name = type(obj).__name__
        if name == "AdminRole":
            if not hasattr(obj, "source"):
                obj.source = None
            if not any(r.user_id == obj.user_id and r.role == obj.role for r in self.roles):
                self.roles.append(obj)
            return
        if name == "AdminSecret":
            self.secrets[obj.user_id] = obj
            return
        if name == "AdminAuditLog":
            self.audit.append(obj)
            return
        if hasattr(obj, "password_hash") and hasattr(obj, "failed_attempts") and hasattr(
            obj, "user_id"
        ):
            self.secrets[obj.user_id] = obj
            return
        if hasattr(obj, "action") and hasattr(obj, "actor_id"):
            self.audit.append(obj)

    def commit(self) -> None:
        return None

    def scalars(self, stmt):  # noqa: ANN001
        sql = str(stmt).lower()
        try:
            params = stmt.compile().params
        except Exception:
            params = {}
        if "admin_roles" in sql:
            user_id = params.get("user_id_1") or params.get("user_id")
            role = params.get("role_1") or params.get("role")
            source = params.get("source_1") or params.get("source")
            rows = []
            for row in self.roles:
                if user_id is not None and row.user_id != user_id:
                    continue
                if role is not None and row.role != role:
                    continue
                if source is not None and getattr(row, "source", None) != source:
                    continue
                rows.append(row)
            return SimpleNamespace(all=lambda: rows)
        return SimpleNamespace(unique=lambda: SimpleNamespace(all=lambda: list(self.users)))

    def execute(self, stmt):  # noqa: ANN001
        return SimpleNamespace(all=lambda: [])

    def delete(self, obj) -> None:  # noqa: ANN001
        name = type(obj).__name__
        if name == "AdminRole" or getattr(obj, "role", None) is not None:
            oid = getattr(obj, "id", None)
            self.roles = [r for r in self.roles if getattr(r, "id", None) != oid]
            return
        if name == "AdminSecret" or (
            hasattr(obj, "password_hash") and hasattr(obj, "failed_attempts")
        ):
            self.secrets.pop(getattr(obj, "user_id", None), None)
            return
        if obj in self.users:
            self.users.remove(obj)


@pytest.fixture
def db():
    return MemoryAdminDB()


def _grant(db, user, role=AdminRoleName.full_admin.value, *, source=None, granted_by=None):
    db.roles.append(
        SimpleNamespace(
            id=uuid4(),
            user_id=user.id,
            role=role,
            granted_by=granted_by,
            source=source,
        )
    )


def _setup_admin(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "")
    admin = _user(email="admin@example.com", display_name="Админ")
    db.users.append(admin)
    _grant(db, admin)
    svc = AdminService(db)
    svc.setup_password(admin, "admin-secret-1", "admin-secret-1")
    return admin, svc


def test_grant_catalog_moderator(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    target = _user(email="mod@example.com", display_name="Модератор")
    db.users.append(target)

    result = svc.grant_role(
        admin,
        target.id,
        role=AdminRoleName.catalog_moderator.value,
        admin_password="admin-secret-1",
    )
    assert "Модератор справочников" in result.message
    assert any(
        r.user_id == target.id
        and r.role == AdminRoleName.catalog_moderator.value
        and r.granted_by == admin.id
        and getattr(r, "source", None) is None
        for r in db.roles
    )
    assert any(a.action == ACTION_ROLE_GRANTED for a in db.audit)
    card = svc.get_account(admin, target.id)
    assert any(r.role == AdminRoleName.catalog_moderator.value for r in card.roles)
    assert any(r.label == "Модератор справочников" for r in card.roles)


def test_grant_full_admin(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    target = _user(email="second@example.com", display_name="Второй")
    db.users.append(target)

    result = svc.grant_role(
        admin,
        target.id,
        role=AdminRoleName.full_admin.value,
        admin_password="admin-secret-1",
    )
    assert "Полный админ" in result.message
    assert AdminService(db).is_full_admin(target) is True


def test_grant_requires_verified_email(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    target = _user(email="raw@example.com", email_verified_at=None)
    db.users.append(target)

    with pytest.raises(AppError) as exc:
        svc.grant_role(
            admin,
            target.id,
            role=AdminRoleName.catalog_moderator.value,
            admin_password="admin-secret-1",
        )
    assert exc.value.status_code == 400
    assert "подтверждённой почтой" in exc.value.message


def test_grant_rejects_blocked(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    target = _user(
        email="blocked@example.com",
        blocked_at=datetime.now(timezone.utc),
    )
    db.users.append(target)

    with pytest.raises(AppError) as exc:
        svc.grant_role(
            admin,
            target.id,
            role=AdminRoleName.catalog_moderator.value,
            admin_password="admin-secret-1",
        )
    assert exc.value.status_code == 400
    assert "заблокированн" in exc.value.message


def test_grant_duplicate_role(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    target = _user(email="dup@example.com")
    db.users.append(target)
    _grant(db, target, AdminRoleName.catalog_moderator.value, granted_by=admin.id)

    with pytest.raises(AppError) as exc:
        svc.grant_role(
            admin,
            target.id,
            role=AdminRoleName.catalog_moderator.value,
            admin_password="admin-secret-1",
        )
    assert exc.value.status_code == 409
    assert "уже есть" in exc.value.message


def test_cannot_revoke_last_full_admin(monkeypatch, db):
    """Единственный full_admin: снятие роли запрещено (ветка не self)."""
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "")
    lonely = _user(email="lonely-admin@example.com")
    db.users.append(lonely)
    _grant(db, lonely)

    ghost = _user(email="ghost@example.com")
    db.users.append(ghost)
    db.secrets[ghost.id] = AdminSecret(
        user_id=ghost.id,
        password_hash=hash_password("admin-secret-2"),
        failed_attempts=0,
        locked_until=None,
    )

    def _fake_require(self, user, password):  # noqa: ANN001
        if user.id != ghost.id:
            raise AppError("Нет доступа", code="forbidden", status_code=403)
        if password != "admin-secret-2":
            raise AppError(
                "Неверный пароль админки",
                code="admin_password_invalid",
                status_code=403,
            )
        return None

    monkeypatch.setattr(AdminService, "require_admin_password", _fake_require)
    with pytest.raises(AppError) as last_exc:
        AdminService(db).revoke_role(
            ghost,
            lonely.id,
            role=AdminRoleName.full_admin.value,
            admin_password="admin-secret-2",
        )
    assert last_exc.value.message == "Нельзя снять последнего полного админа"


def test_cannot_revoke_own_full_admin(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    second = _user(email="peer@example.com")
    db.users.append(second)
    _grant(db, second, granted_by=admin.id)

    with pytest.raises(AppError) as exc:
        svc.revoke_role(
            admin,
            admin.id,
            role=AdminRoleName.full_admin.value,
            admin_password="admin-secret-1",
        )
    assert "себе" in exc.value.message


def test_cannot_revoke_bootstrap_from_ui(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    target = _user(email="boot@example.com")
    db.users.append(target)
    _grant(db, target, source=ROLE_SOURCE_BOOTSTRAP)

    with pytest.raises(AppError) as exc:
        svc.revoke_role(
            admin,
            target.id,
            role=AdminRoleName.full_admin.value,
            admin_password="admin-secret-1",
        )
    assert exc.value.message == BOOTSTRAP_REVOKE_HINT


def test_moderator_cannot_grant_roles(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "")
    mod = _user(email="moderator@example.com", display_name="Мод")
    db.users.append(mod)
    _grant(db, mod, AdminRoleName.catalog_moderator.value)
    target = _user(email="victim@example.com")
    db.users.append(target)

    with pytest.raises(AppError) as exc:
        AdminService(db).grant_role(
            mod,
            target.id,
            role=AdminRoleName.catalog_moderator.value,
            admin_password="anything",
        )
    assert exc.value.status_code == 403


def test_wrong_admin_password_and_lockout(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    target = _user(email="t@example.com")
    db.users.append(target)

    for _ in range(admin_mod.ADMIN_PASSWORD_MAX_ATTEMPTS - 1):
        with pytest.raises(AppError) as exc:
            svc.grant_role(
                admin,
                target.id,
                role=AdminRoleName.catalog_moderator.value,
                admin_password="wrong-password",
            )
        assert exc.value.status_code == 403
        assert "Неверный пароль" in exc.value.message

    with pytest.raises(AppError) as locked:
        svc.grant_role(
            admin,
            target.id,
            role=AdminRoleName.catalog_moderator.value,
            admin_password="wrong-password",
        )
    assert locked.value.status_code == 429


def test_access_lost_immediately_after_revoke(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    target = _user(email="temp-admin@example.com")
    db.users.append(target)
    _grant(db, target, granted_by=admin.id)
    svc.setup_password(target, "temp-admin-pw", "temp-admin-pw")
    assert AdminService(db).is_full_admin(target) is True
    assert target.id in db.secrets

    svc.revoke_role(
        admin,
        target.id,
        role=AdminRoleName.full_admin.value,
        admin_password="admin-secret-1",
    )
    assert AdminService(db).has_admin_access(target) is False
    assert target.id not in db.secrets
    assert any(a.action == ACTION_ROLE_REVOKED for a in db.audit)

    with pytest.raises(AppError) as exc:
        AdminService(db).status(target)
    assert exc.value.status_code == 403


def test_manual_role_survives_bootstrap_sync(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "boss@example.com")
    manual = _user(email="manual@example.com")
    db.users.append(manual)
    _grant(db, manual, source=None, granted_by=uuid4())

    manual.email = "moved@example.com"
    assert AdminService(db).is_full_admin(manual) is True
    assert len([r for r in db.roles if r.user_id == manual.id]) == 1
    assert getattr(db.roles[0], "source", None) is None

    boss = _user(email="boss@example.com")
    db.users.append(boss)
    AdminService(db).ensure_bootstrap_role(boss)
    assert any(
        r.user_id == boss.id and getattr(r, "source", None) == ROLE_SOURCE_BOOTSTRAP
        for r in db.roles
    )
    assert any(r.user_id == manual.id and getattr(r, "source", None) is None for r in db.roles)


def test_new_admin_must_set_own_password(monkeypatch, db):
    admin, svc = _setup_admin(monkeypatch, db)
    newbie = _user(email="newbie@example.com", display_name="Новый")
    db.users.append(newbie)

    svc.grant_role(
        admin,
        newbie.id,
        role=AdminRoleName.full_admin.value,
        admin_password="admin-secret-1",
    )
    assert AdminService(db).is_full_admin(newbie) is True
    status = AdminService(db).status(newbie)
    assert status.admin_password_set is False

    AdminService(db).setup_password(newbie, "newbie-admin-pw", "newbie-admin-pw")
    status2 = AdminService(db).status(newbie)
    assert status2.admin_password_set is True
