"""ADM-01: флаг, права, пароль админки, список аккаунтов, без секретов в JSON."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.exceptions import AppError, NotFoundError
from app.core.security import hash_password, verify_password
from app.main import app
from app.models.admin import AdminRoleName, AdminSecret
from app.schemas.admin import AdminAccountItem, AdminAccountsPage, AdminStatusResponse
from app.services import admin as admin_mod
from app.services.admin import (
    ADMIN_PASSWORD_MAX_ATTEMPTS,
    ACTION_PASSWORD_FAILED,
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
        identities=[],
        auth_sessions=[],
        email_verified_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


class MemoryAdminDB:
    """Минимальный Session-заменитель для AdminService."""

    def __init__(self) -> None:
        self.roles: list[SimpleNamespace] = []
        self.secrets: dict = {}
        self.audit: list[SimpleNamespace] = []
        self.users: list = []
        self._added: list = []

    def scalar(self, stmt):  # noqa: ANN001
        sql = str(stmt).lower()
        try:
            params = stmt.compile().params
        except Exception:
            params = {}

        if "admin_roles" in sql:
            user_id = params.get("user_id_1") or params.get("user_id")
            role = params.get("role_1") or params.get("role")
            source = params.get("source_1") or params.get("source")
            # Запрос «bootstrap у другого аккаунта»: user_id_1 — исключаемый.
            exclude_user = None
            if "user_id" in sql and "!=" in sql.replace(" ", ""):
                exclude_user = params.get("user_id_1") or params.get("user_id")
                user_id = None
            for row in self.roles:
                if user_id is not None and row.user_id != user_id:
                    continue
                if exclude_user is not None and row.user_id == exclude_user:
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
                if not hasattr(obj, "source"):
                    obj.source = None
                self.roles.append(obj)
            return
        if name == "AdminSecret":
            self.secrets[obj.user_id] = obj
            return
        if name == "AdminAuditLog":
            self.audit.append(obj)
            return
        # Обновление уже существующего AdminSecret через add(secret).
        if hasattr(obj, "password_hash") and hasattr(obj, "failed_attempts") and hasattr(obj, "user_id"):
            self.secrets[obj.user_id] = obj
            return
        if hasattr(obj, "action") and hasattr(obj, "actor_id"):
            self.audit.append(obj)

    def delete(self, obj) -> None:  # noqa: ANN001
        name = type(obj).__name__
        if name == "AdminRole" or getattr(obj, "role", None) is not None:
            self.roles = [
                r
                for r in self.roles
                if not (r.user_id == obj.user_id and r.role == obj.role and getattr(r, "id", None) == getattr(obj, "id", None))
            ]
            # fallback: match by id alone
            self.roles = [r for r in self.roles if getattr(r, "id", None) != getattr(obj, "id", None)]
            return
        if name == "AdminSecret" or (hasattr(obj, "password_hash") and hasattr(obj, "user_id")):
            self.secrets.pop(obj.user_id, None)

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
            source = params.get("source_1") or params.get("source")
            rows = []
            for row in self.roles:
                if user_id is not None and row.user_id != user_id:
                    continue
                if source is not None and getattr(row, "source", None) != source:
                    continue
                rows.append(row)
            return SimpleNamespace(all=lambda: rows)
        return SimpleNamespace(unique=lambda: SimpleNamespace(all=lambda: list(self.users)))

    def execute(self, stmt):  # noqa: ANN001
        return SimpleNamespace(all=lambda: [])


@pytest.fixture
def db():
    return MemoryAdminDB()


def test_panel_disabled_raises_404(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", False)
    with pytest.raises(NotFoundError):
        AdminService(db).require_full_admin(_user())


def test_non_admin_forbidden_when_enabled(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "")
    with pytest.raises(AppError) as exc:
        AdminService(db).require_full_admin(_user())
    assert exc.value.status_code == 403
    assert any(a.action == "admin_access_denied" for a in db.audit)


def test_full_admin_lists_accounts_without_secrets(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "")
    admin = _user(email="admin@example.com", display_name="Админ")
    db.roles.append(
        SimpleNamespace(
            id=uuid4(),
            user_id=admin.id,
            role=AdminRoleName.full_admin.value,
            granted_by=None,
        )
    )
    player = _user(email="other@example.com", display_name="Другой")
    db.users = [admin, player]

    page = AdminService(db).list_accounts(admin, q=None, page=1, page_size=20)
    assert isinstance(page, AdminAccountsPage)
    assert page.total == 2
    payload = page.model_dump()
    raw = str(payload)
    for banned in (
        "password_hash",
        "full_name",
        "phone",
        "Секретное ФИО",
        "+79990001122",
        "login-password-ok",
    ):
        assert banned not in raw
    assert "password" not in payload  # top-level
    for item in page.items:
        dumped = item.model_dump()
        assert "password" not in dumped
        assert "password_hash" not in dumped
        assert "token" not in dumped
        assert "full_name" not in dumped
        assert "phone" not in dumped
        assert "has_password" in dumped["login_methods"]
    assert all(isinstance(item, AdminAccountItem) for item in page.items)


def test_login_password_not_accepted_as_admin_password(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "")
    admin = _user(email="admin@example.com")
    db.roles.append(
        SimpleNamespace(id=uuid4(), user_id=admin.id, role=AdminRoleName.full_admin.value, granted_by=None)
    )
    AdminService(db).setup_password(admin, "admin-secret-1", "admin-secret-1")
    with pytest.raises(AppError) as exc:
        AdminService(db).confirm_password(admin, "login-password-ok")
    assert exc.value.code == "admin_password_invalid"
    assert any(a.action == ACTION_PASSWORD_FAILED for a in db.audit)


def test_admin_password_lockout(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "")
    admin = _user(email="admin@example.com")
    db.roles.append(
        SimpleNamespace(id=uuid4(), user_id=admin.id, role=AdminRoleName.full_admin.value, granted_by=None)
    )
    AdminService(db).setup_password(admin, "admin-secret-1", "admin-secret-1")
    for _ in range(ADMIN_PASSWORD_MAX_ATTEMPTS - 1):
        with pytest.raises(AppError) as exc:
            AdminService(db).confirm_password(admin, "wrong-password")
        assert exc.value.code == "admin_password_invalid"
    with pytest.raises(AppError) as exc:
        AdminService(db).confirm_password(admin, "wrong-password")
    assert exc.value.code == "admin_password_locked"
    assert exc.value.status_code == 429


def test_setup_rejects_same_as_login_password(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "")
    admin = _user(email="admin@example.com")
    db.roles.append(
        SimpleNamespace(id=uuid4(), user_id=admin.id, role=AdminRoleName.full_admin.value, granted_by=None)
    )
    with pytest.raises(AppError) as exc:
        AdminService(db).setup_password(admin, "login-password-ok", "login-password-ok")
    assert exc.value.code == "admin_password_same_as_login"


def test_bootstrap_grants_full_admin(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "Boss@Example.com")
    admin = _user(email="boss@example.com")
    assert AdminService(db).is_full_admin(admin) is True
    assert any(
        r.role == AdminRoleName.full_admin.value
        and r.user_id == admin.id
        and getattr(r, "source", None) == admin_mod.ROLE_SOURCE_BOOTSTRAP
        for r in db.roles
    )


def test_status_reports_password_flag(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "")
    admin = _user(email="admin@example.com", display_name="Админ")
    db.roles.append(
        SimpleNamespace(id=uuid4(), user_id=admin.id, role=AdminRoleName.full_admin.value, granted_by=None)
    )
    status = AdminService(db).status(admin)
    assert isinstance(status, AdminStatusResponse)
    assert status.admin_password_set is False
    AdminService(db).setup_password(admin, "admin-secret-9", "admin-secret-9")
    secret = db.secrets[admin.id]
    assert verify_password("admin-secret-9", secret.password_hash)
    assert AdminService(db).status(admin).admin_password_set is True


def test_http_flag_off_returns_404(monkeypatch):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", False)

    def fake_user():
        return _user(email="admin@example.com")

    from app.api import deps

    app.dependency_overrides[deps.get_current_user] = fake_user
    try:
        client = TestClient(app)
        res = client.get("/admin/status")
        assert res.status_code == 404
        res2 = client.get("/admin/accounts")
        assert res2.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_http_unauthorized_without_token(monkeypatch):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    client = TestClient(app)
    res = client.get("/admin/status")
    assert res.status_code == 401
