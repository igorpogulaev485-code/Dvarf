"""ADM-QF: bootstrap-роль, CLI сброс пароля админки, content_layer."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import MagicMock

import pytest

from app.core.exceptions import NotFoundError
from app.core.security import hash_password
from app.models.admin import AdminRoleName, AdminSecret
from app.services import admin as admin_mod
from app.services.admin import (
    ACTION_PASSWORD_CLI_RESET,
    ROLE_SOURCE_BOOTSTRAP,
    AdminService,
)
from app.services.catalog import to_out


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
        blocked_at=None,
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


class MemoryDB:
    def __init__(self) -> None:
        self.roles: list = []
        self.secrets: dict = {}
        self.audit: list = []
        self.users: list = []

    def scalar(self, stmt):  # noqa: ANN001
        sql = str(stmt).lower()
        try:
            params = stmt.compile().params
        except Exception:
            params = {}

        if "from users" in sql.replace('"', "") and "email" in sql:
            email = None
            for key, val in params.items():
                if "email" in key and isinstance(val, str):
                    email = val
                    break
            if email:
                for u in self.users:
                    if (u.email or "").lower() == email.lower():
                        return u
            return None

        if "admin_roles" in sql:
            user_id = params.get("user_id_1") or params.get("user_id")
            role = params.get("role_1") or params.get("role")
            source = params.get("source_1") or params.get("source")
            exclude_user = None
            compact = sql.replace(" ", "")
            if "user_id!=" in compact or "user_id<>" in compact:
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

        return None

    def get(self, model, key):  # noqa: ANN001
        if model is AdminSecret or getattr(model, "__name__", "") == "AdminSecret":
            return self.secrets.get(key)
        if getattr(model, "__name__", "") == "User":
            for u in self.users:
                if u.id == key:
                    return u
            return None
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
        if hasattr(obj, "password_hash") and hasattr(obj, "failed_attempts"):
            self.secrets[obj.user_id] = obj
            return
        if hasattr(obj, "action") and hasattr(obj, "actor_id"):
            self.audit.append(obj)

    def delete(self, obj) -> None:  # noqa: ANN001
        name = type(obj).__name__
        if name == "AdminRole" or getattr(obj, "role", None) is not None:
            oid = getattr(obj, "id", None)
            self.roles = [r for r in self.roles if getattr(r, "id", None) != oid]
            return
        if name == "AdminSecret" or hasattr(obj, "password_hash"):
            self.secrets.pop(getattr(obj, "user_id", None), None)

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
        return SimpleNamespace(all=lambda: [])


@pytest.fixture
def db():
    return MemoryDB()


def test_bootstrap_requires_verified_email(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "boss@example.com")
    user = _user(email="boss@example.com", email_verified_at=None)
    assert AdminService(db).is_full_admin(user) is False
    assert db.roles == []


def test_bootstrap_not_granted_if_other_has_bootstrap(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "boss@example.com")
    other = _user(email="other@example.com")
    db.roles.append(
        SimpleNamespace(
            id=uuid4(),
            user_id=other.id,
            role=AdminRoleName.full_admin.value,
            granted_by=None,
            source=ROLE_SOURCE_BOOTSTRAP,
        )
    )
    claimant = _user(email="boss@example.com")
    assert AdminService(db).is_full_admin(claimant) is False
    assert not any(r.user_id == claimant.id for r in db.roles)


def test_bootstrap_revoked_when_email_changes_away(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "boss@example.com")
    user = _user(email="boss@example.com")
    assert AdminService(db).is_full_admin(user) is True
    assert len(db.roles) == 1

    user.email = "player-after@example.com"
    assert AdminService(db).is_full_admin(user) is False
    assert db.roles == []


def test_manual_role_not_revoked_on_email_change(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "boss@example.com")
    user = _user(email="manual@example.com")
    db.roles.append(
        SimpleNamespace(
            id=uuid4(),
            user_id=user.id,
            role=AdminRoleName.full_admin.value,
            granted_by=None,
            source=None,
        )
    )
    user.email = "someone-else@example.com"
    assert AdminService(db).is_full_admin(user) is True
    assert len(db.roles) == 1
    assert getattr(db.roles[0], "source", None) is None


def test_cli_reset_admin_password(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "")
    user = _user(email="admin@example.com")
    db.users.append(user)
    db.roles.append(
        SimpleNamespace(
            id=uuid4(),
            user_id=user.id,
            role=AdminRoleName.full_admin.value,
            granted_by=None,
            source=None,
        )
    )
    secret = AdminSecret(
        user_id=user.id,
        password_hash=hash_password("admin-secret-99"),
        failed_attempts=5,
        locked_until=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.secrets[user.id] = secret

    result = AdminService(db).reset_admin_password_cli(email="admin@example.com")
    assert result["had_secret"] is True
    assert user.id not in db.secrets
    assert any(a.action == ACTION_PASSWORD_CLI_RESET for a in db.audit)
    meta = next(a.meta for a in db.audit if a.action == ACTION_PASSWORD_CLI_RESET)
    assert meta.get("source") == "cli"
    assert "password" not in meta
    assert "hash" not in meta


def test_cli_reset_requires_panel(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", False)
    user = _user(email="admin@example.com")
    db.users.append(user)
    with pytest.raises(NotFoundError):
        AdminService(db).reset_admin_password_cli(email="admin@example.com")


def test_cli_module_rejects_password_argv():
    from app.scripts.reset_admin_password import main

    code = main(["--email", "a@b.c", "--password", "secret", "--yes"])
    assert code == 2


def test_public_catalog_hides_content_layer():
    from app.models.catalog import CatalogKind, CatalogRulesEdition

    entry = SimpleNamespace(
        id=uuid4(),
        kind=CatalogKind.spell,
        slug="fireball",
        name_ru="Огненный шар",
        name_en="Fireball",
        rules_edition=CatalogRulesEdition.edition_2014,
        parent_id=None,
        source="srd-5.1",
        data={"content_layer": "srd"},
        sort_order=1,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    out = to_out(entry, apply_live=False)
    assert out.content_layer is None


def test_email_change_to_bootstrap_confirms_new_inbox(monkeypatch):
    """Смена почты на ADMIN_BOOTSTRAP_EMAIL — письмо на новый ящик."""
    from app.services.auth import AuthService, settings as auth_settings

    monkeypatch.setattr(auth_settings, "admin_bootstrap_email", "boss@example.com")
    monkeypatch.setattr(auth_settings, "auth_email_stub", False)
    monkeypatch.setattr(auth_settings, "app_public_url", "http://localhost")
    monkeypatch.setattr(auth_settings, "email_change_ttl_minutes", 60)

    user = _user(email="player@example.com")
    db = MagicMock()
    svc = AuthService(db)
    svc.users = MagicMock()
    svc.users.get_by_id.return_value = user
    svc.users.get_by_email.return_value = None
    svc.email_changes = MagicMock()

    sent: dict = {}

    def fake_send_admin(*, to, confirm_url):  # noqa: ANN001
        sent["to"] = to
        sent["url"] = confirm_url

    def fake_send_normal(*, to, new_email, confirm_url):  # noqa: ANN001
        sent["normal_to"] = to

    monkeypatch.setattr("app.services.mail.smtp_configured", lambda: True)
    monkeypatch.setattr(
        "app.services.mail.send_admin_email_change_confirm",
        fake_send_admin,
    )
    monkeypatch.setattr(
        "app.services.mail.send_email_change_confirm",
        fake_send_normal,
    )

    res = svc.request_email_change(user.id, "boss@example.com")
    assert "новый" in res.message.lower() or "новой" in res.message.lower()
    assert sent.get("to") == "boss@example.com"
    assert "normal_to" not in sent
