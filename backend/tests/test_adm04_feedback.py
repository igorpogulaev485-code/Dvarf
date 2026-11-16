"""ADM-04: обратная связь — приём, лимиты, админ-очередь, 403/404, SET NULL."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.exceptions import AppError, NotFoundError
from app.core.security import hash_password
from app.main import app
from app.models.admin import AdminRoleName
from app.models.feedback import FeedbackMessage, FeedbackStatus, FeedbackTopic
from app.services import admin as admin_mod
from app.services.admin import ACCOUNT_BLOCKED_CODE, raise_if_blocked
from app.services.feedback import (
    ACTION_FEEDBACK_NOTE,
    ACTION_FEEDBACK_STATUS,
    FeedbackService,
    RATE_LIMIT_BURST,
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
        blocked_at=None,
        blocked_by=None,
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


class FeedbackMemoryDB:
    def __init__(self) -> None:
        self.roles: list[SimpleNamespace] = []
        self.secrets: dict = {}
        self.audit: list[SimpleNamespace] = []
        self.users: list = []
        self.messages: list[FeedbackMessage] = []
        self.characters: list = []
        self.lobbies: list = []
        self.lobby_members: list = []
        self.committed = 0
        self.mail_calls: list[dict] = []

    def scalar(self, stmt):  # noqa: ANN001
        sql = str(stmt).lower()
        try:
            params = stmt.compile().params
        except Exception:
            params = {}

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
            return user_id if user_id in self.secrets else None

        if "feedback_messages" in sql and "count" in sql:
            rows = list(self.messages)
            for key, val in params.items():
                if "rate_account" in key or key.endswith("rate_account_id"):
                    rows = [m for m in rows if m.rate_account_id == val]
                if isinstance(val, datetime):
                    rows = [m for m in rows if m.created_at >= val]
                if val in {s.value for s in FeedbackStatus}:
                    if "status" in sql:
                        rows = [m for m in rows if m.status == val]
                if val in {t.value for t in FeedbackTopic}:
                    if "topic" in sql and "status" not in sql.split("topic")[0][-20:]:
                        pass
            # Filters from where clauses via params values
            status_vals = [v for v in params.values() if v in {s.value for s in FeedbackStatus}]
            topic_vals = [v for v in params.values() if v in {t.value for t in FeedbackTopic}]
            if status_vals and "status" in sql:
                rows = [m for m in rows if m.status in status_vals]
            if topic_vals and "topic" in sql:
                rows = [m for m in rows if m.topic in topic_vals]
            account_vals = [
                v
                for k, v in params.items()
                if "rate_account" in str(k) or (hasattr(v, "hex") and "rate" in sql)
            ]
            # Prefer explicit rate_account_id match from compiled params
            for k, v in params.items():
                if "rate_account" in str(k).lower():
                    rows = [m for m in rows if m.rate_account_id == v]
            since_vals = [v for v in params.values() if isinstance(v, datetime)]
            if since_vals and "created_at" in sql:
                since = since_vals[0]
                rows = [m for m in rows if m.created_at >= since]
            return len(rows)

        if "characters" in sql and "name" in sql:
            cid = None
            for val in params.values():
                if hasattr(val, "hex"):
                    cid = val
                    break
            for c in self.characters:
                if cid is not None and c.id == cid:
                    return c.name
            return None

        if "characters" in sql:
            cid = None
            uid = None
            for key, val in params.items():
                if hasattr(val, "hex"):
                    if "user" in key:
                        uid = val
                    else:
                        cid = val
            for c in self.characters:
                if cid is not None and c.id != cid:
                    continue
                if uid is not None and c.user_id != uid:
                    continue
                if getattr(c, "deleted_at", None) is not None:
                    continue
                return c.id
            return None

        if "lobby_members" in sql:
            for key, val in params.items():
                pass
            lobby_id = None
            user_id = None
            for key, val in params.items():
                if "lobby" in key and hasattr(val, "hex"):
                    lobby_id = val
                if "user" in key and hasattr(val, "hex"):
                    user_id = val
            for m in self.lobby_members:
                if lobby_id is not None and m.lobby_id != lobby_id:
                    continue
                if user_id is not None and m.user_id != user_id:
                    continue
                return m.id
            return None

        if "lobbies" in sql and "name" in sql:
            lid = None
            for val in params.values():
                if hasattr(val, "hex"):
                    lid = val
                    break
            for L in self.lobbies:
                if lid is not None and L.id == lid:
                    return L.name
            return None

        return None

    def get(self, model, key):  # noqa: ANN001
        name = getattr(model, "__name__", "")
        if name == "FeedbackMessage" or model is FeedbackMessage:
            for m in self.messages:
                if m.id == key:
                    return m
            return None
        if name == "User":
            for u in self.users:
                if u.id == key:
                    return u
            return None
        if name == "Lobby":
            for L in self.lobbies:
                if L.id == key:
                    return L
            return None
        if name == "Character":
            for c in self.characters:
                if c.id == key:
                    return c
            return None
        return None

    def add(self, obj) -> None:  # noqa: ANN001
        name = type(obj).__name__
        if name == "AdminRole":
            self.roles.append(obj)
            return
        if name == "AdminAuditLog" or (hasattr(obj, "action") and hasattr(obj, "actor_id")):
            self.audit.append(obj)
            return
        if name == "FeedbackMessage" or isinstance(obj, FeedbackMessage):
            if not getattr(obj, "created_at", None):
                obj.created_at = datetime.now(timezone.utc)
            if not getattr(obj, "updated_at", None):
                obj.updated_at = obj.created_at
            self.messages.append(obj)
            return

    def commit(self) -> None:
        self.committed += 1

    def refresh(self, obj) -> None:  # noqa: ANN001
        return None

    def execute(self, stmt):  # noqa: ANN001
        return SimpleNamespace(all=lambda: [])

    def scalars(self, stmt):  # noqa: ANN001
        sql = str(stmt).lower()
        try:
            params = dict(stmt.compile().params)
        except Exception:
            params = {}
        rows = list(self.messages)
        # Фильтры из where: точные значения topic/status (не путать с limit/offset).
        for key, val in list(params.items()):
            key_l = str(key).lower()
            if val in {s.value for s in FeedbackStatus} and (
                "status" in key_l or ("status" in sql and "feedback_messages" in sql)
            ):
                rows = [m for m in rows if m.status == val]
            if val in {t.value for t in FeedbackTopic} and (
                "topic" in key_l or "topic" in sql
            ):
                # Не фильтровать повторно по status-значениям, пересекающимся с topic — их нет.
                rows = [m for m in rows if m.topic == val]
        rows.sort(key=lambda m: m.created_at, reverse=True)

        class _S:
            def all(self_inner):
                return rows

        return _S()


@pytest.fixture
def db():
    return FeedbackMemoryDB()


def _grant_full(db: FeedbackMemoryDB, user) -> None:
    db.roles.append(
        SimpleNamespace(
            id=uuid4(),
            user_id=user.id,
            role=AdminRoleName.full_admin.value,
            granted_by=None,
            created_at=datetime.now(timezone.utc),
        )
    )


def _grant_moderator(db: FeedbackMemoryDB, user) -> None:
    db.roles.append(
        SimpleNamespace(
            id=uuid4(),
            user_id=user.id,
            role=AdminRoleName.catalog_moderator.value,
            granted_by=None,
            created_at=datetime.now(timezone.utc),
        )
    )


@pytest.fixture(autouse=True)
def _mail_stub(monkeypatch, db):
    def fake_send_email(*, to, subject, text_body):
        db.mail_calls.append({"to": to, "subject": subject, "text_body": text_body})

    monkeypatch.setattr("app.services.feedback.send_email", fake_send_email)


def test_create_normal_and_anonymous(db, monkeypatch):
    monkeypatch.setattr(admin_mod, "admin_panel_enabled", lambda: True)
    user = _user()
    db.users.append(user)
    svc = FeedbackService(db)

    res = svc.create(user, topic=FeedbackTopic.bug, body="Нашёл ошибку на листе")
    assert res.id is not None
    assert db.messages[0].user_id == user.id
    assert db.messages[0].is_anonymous is False
    assert db.messages[0].rate_account_id == user.id
    assert db.mail_calls

    res2 = svc.create(
        user,
        topic=FeedbackTopic.idea,
        body="Идея про подсказки",
        is_anonymous=True,
    )
    anon = db.messages[1]
    assert anon.user_id is None
    assert anon.is_anonymous is True
    assert anon.rate_account_id == user.id

    _grant_full(db, user)
    page = svc.list_for_admin(user)
    anon_item = next(i for i in page.items if i.id == res2.id)
    assert anon_item.author is None
    assert anon_item.is_anonymous is True


def test_foreign_character_and_lobby_422(db):
    user = _user()
    other = _user(email="other@example.com")
    db.users.extend([user, other])
    foreign_char = SimpleNamespace(
        id=uuid4(), user_id=other.id, name="Чужой", deleted_at=None
    )
    foreign_lobby = SimpleNamespace(id=uuid4(), owner_id=other.id, name="Чужое лобби")
    db.characters.append(foreign_char)
    db.lobbies.append(foreign_lobby)
    svc = FeedbackService(db)

    with pytest.raises(AppError) as exc:
        svc.create(
            user,
            topic=FeedbackTopic.question,
            body="Вопрос",
            character_id=foreign_char.id,
        )
    assert exc.value.status_code == 422

    with pytest.raises(AppError) as exc2:
        svc.create(
            user,
            topic=FeedbackTopic.question,
            body="Вопрос",
            lobby_id=foreign_lobby.id,
        )
    assert exc2.value.status_code == 422


def test_rate_limit_429(db):
    user = _user()
    db.users.append(user)
    svc = FeedbackService(db)
    for i in range(RATE_LIMIT_BURST):
        svc.create(user, topic=FeedbackTopic.bug, body=f"Сообщение номер {i + 1}")
    with pytest.raises(AppError) as exc:
        svc.create(user, topic=FeedbackTopic.bug, body="Лишнее")
    assert exc.value.status_code == 429
    assert "много" in exc.value.message.lower() or "лимит" in exc.value.message.lower()


def test_blocked_account_cannot_write(db):
    user = _user(blocked_at=datetime.now(timezone.utc))
    db.users.append(user)
    svc = FeedbackService(db)
    with pytest.raises(AppError) as exc:
        svc.create(user, topic=FeedbackTopic.bug, body="Не должно пройти")
    assert exc.value.code == ACCOUNT_BLOCKED_CODE
    assert exc.value.status_code == 403


def test_raise_if_blocked_helper():
    user = _user(blocked_at=datetime.now(timezone.utc))
    with pytest.raises(AppError) as exc:
        raise_if_blocked(user)
    assert exc.value.code == ACCOUNT_BLOCKED_CODE


def test_admin_list_filter_patch_audit(db, monkeypatch):
    monkeypatch.setattr(admin_mod, "admin_panel_enabled", lambda: True)
    admin = _user(email="admin@example.com", display_name="Админ")
    player = _user()
    db.users.extend([admin, player])
    _grant_full(db, admin)
    svc = FeedbackService(db)

    a = svc.create(player, topic=FeedbackTopic.bug, body="Баг А")
    b = svc.create(player, topic=FeedbackTopic.idea, body="Идея Б")
    # Make «Баг А» older so newer ideas float up — created_at already sequential.

    page = svc.list_for_admin(admin, topic="idea")
    assert page.total == 1
    assert page.items[0].id == b.id
    assert page.new_count >= 1

    detail = svc.get_for_admin(admin, a.id)
    assert detail.body == "Баг А"
    assert detail.author is not None
    assert detail.author.email == player.email

    updated = svc.patch_for_admin(
        admin,
        a.id,
        status=FeedbackStatus.in_progress,
        admin_note="Смотрим",
        note_provided=True,
    )
    assert updated.status == FeedbackStatus.in_progress.value
    assert updated.admin_note == "Смотрим"
    actions = {row.action for row in db.audit}
    assert ACTION_FEEDBACK_STATUS in actions
    assert ACTION_FEEDBACK_NOTE in actions


def test_moderator_403(db, monkeypatch):
    monkeypatch.setattr(admin_mod, "admin_panel_enabled", lambda: True)
    mod = _user(email="mod@example.com")
    db.users.append(mod)
    _grant_moderator(db, mod)
    svc = FeedbackService(db)
    with pytest.raises(AppError) as exc:
        svc.list_for_admin(mod)
    assert exc.value.status_code == 403


def test_flag_off_404(db, monkeypatch):
    monkeypatch.setattr(admin_mod, "admin_panel_enabled", lambda: False)
    admin = _user(email="admin@example.com")
    db.users.append(admin)
    _grant_full(db, admin)
    svc = FeedbackService(db)
    with pytest.raises(NotFoundError):
        svc.list_for_admin(admin)


def test_user_delete_sets_null_keeps_message(db, monkeypatch):
    """Удаление пользователя не стирает сообщение: user_id / rate_account_id → SET NULL."""
    monkeypatch.setattr(admin_mod, "admin_panel_enabled", lambda: True)
    user = _user()
    admin = _user(email="admin@example.com")
    db.users.extend([user, admin])
    _grant_full(db, admin)
    svc = FeedbackService(db)
    res = svc.create(user, topic=FeedbackTopic.question, body="Останется после удаления")
    msg = db.messages[0]
    assert msg.user_id == user.id
    msg.user_id = None
    msg.rate_account_id = None
    item = svc.get_for_admin(admin, res.id)
    assert item.body == "Останется после удаления"
    assert item.author is None


def test_post_feedback_401_without_auth():
    client = TestClient(app)
    response = client.post(
        "/feedback",
        json={"topic": "bug", "body": "Без входа"},
    )
    assert response.status_code in (401, 403)


def test_post_feedback_ok_via_override(db, monkeypatch):
    monkeypatch.setattr(admin_mod, "admin_panel_enabled", lambda: False)
    user = _user()
    db.users.append(user)

    from app.api import deps

    def fake_user():
        return user

    def fake_db():
        return db

    app.dependency_overrides[deps.get_current_user] = fake_user
    app.dependency_overrides[deps.get_db] = fake_db
    try:
        client = TestClient(app)
        response = client.post(
            "/feedback",
            json={"topic": "bug", "body": "Работает без флага админки"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "принято" in data["message"].lower() or "принят" in data["message"].lower()
        assert db.messages
    finally:
        app.dependency_overrides.clear()


def test_admin_feedback_routes_404_without_flag(db, monkeypatch):
    monkeypatch.setattr(admin_mod, "admin_panel_enabled", lambda: False)
    admin = _user(email="admin@example.com")
    db.users.append(admin)
    _grant_full(db, admin)

    from app.api import deps

    app.dependency_overrides[deps.get_current_user] = lambda: admin
    app.dependency_overrides[deps.get_db] = lambda: db
    try:
        client = TestClient(app)
        assert client.get("/admin/feedback").status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_anonymous_mail_omits_author_email(db):
    user = _user(email="hidden@example.com")
    db.users.append(user)
    svc = FeedbackService(db)
    svc.create(user, topic=FeedbackTopic.idea, body="Анонимная идея", is_anonymous=True)
    assert db.mail_calls
    body = db.mail_calls[-1]["text_body"]
    assert "hidden@example.com" not in body
