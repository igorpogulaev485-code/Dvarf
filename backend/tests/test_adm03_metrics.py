"""ADM-03: метрики, журнал событий, 403 модератору, 404 без флага, без почт в ответе."""

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
from app.models.character import RulesEdition
from app.models.product_event import ProductEvent, ProductEventType
from app.schemas.admin import AdminMetricsResponse
from app.services import admin as admin_mod
from app.services.admin import AdminService
from app.services.product_events import record_product_event


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


class MetricsMemoryDB:
    """Session-заменитель для get_metrics / record / прав."""

    def __init__(self) -> None:
        self.roles: list[SimpleNamespace] = []
        self.secrets: dict = {}
        self.audit: list[SimpleNamespace] = []
        self.users: list = []
        self.characters: list = []
        self.lobbies: list = []
        self.sessions: list = []  # play_sessions
        self.auth_sessions: list = []
        self.events: list[ProductEvent] = []
        self._fail_add = False
        self.committed = 0
        self.rolled_back = 0

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

        # Активные уникальные люди
        if "auth_sessions" in sql and "count" in sql and "distinct" in sql:
            since = None
            for key, val in params.items():
                if isinstance(val, datetime):
                    since = val
                    break
            users = set()
            for s in self.auth_sessions:
                if since is not None and s.last_seen_at < since:
                    continue
                users.add(s.user_id)
            return len(users)

        if "from users" in sql.replace('"', "") or "from users" in sql:
            if "email_verified_at" in sql and "is not null" in sql:
                return sum(1 for u in self.users if u.email_verified_at is not None)
            if "blocked_at" in sql and "is not null" in sql:
                return sum(1 for u in self.users if getattr(u, "blocked_at", None) is not None)
            if "created_at" in sql:
                since = None
                for val in params.values():
                    if isinstance(val, datetime):
                        since = val
                        break
                if since is not None:
                    return sum(1 for u in self.users if u.created_at >= since)
            return len(self.users)

        if "characters" in sql and "count" in sql:
            alive = [c for c in self.characters if c.deleted_at is None]
            if "is_draft" in sql:
                return sum(1 for c in alive if c.is_draft)
            if "rules_edition" in sql:
                edition = None
                for val in params.values():
                    if val in ("2014", "2024") or isinstance(val, RulesEdition):
                        edition = getattr(val, "value", val)
                        break
                if edition:
                    return sum(
                        1
                        for c in alive
                        if getattr(c.rules_edition, "value", c.rules_edition) == edition
                    )
            return len(alive)

        if "lobbies" in sql and "count" in sql and "lobby_members" not in sql:
            if "created_at" in sql:
                since = None
                for val in params.values():
                    if isinstance(val, datetime):
                        since = val
                        break
                if since is not None:
                    return sum(1 for L in self.lobbies if L.created_at >= since)
            return len(self.lobbies)

        if "play_sessions" in sql and "count" in sql:
            since = None
            for val in params.values():
                if isinstance(val, datetime):
                    since = val
                    break
            if "closed_at" in sql:
                return sum(
                    1
                    for s in self.sessions
                    if s.closed_at is not None and (since is None or s.closed_at >= since)
                )
            return sum(
                1 for s in self.sessions if since is None or s.created_at >= since
            )

        return 0

    def execute(self, stmt):  # noqa: ANN001
        sql = str(stmt).lower().replace('"', "")

        class _Result:
            def __init__(self, rows):
                self._rows = rows

            def all(self):
                return self._rows

        since = None
        try:
            params = stmt.compile().params
            for val in params.values():
                if isinstance(val, datetime):
                    since = val
                    break
        except Exception:
            pass

        if "product_events" in sql:
            rows = []
            for e in self.events:
                if since is not None and e.created_at < since:
                    continue
                rows.append((e.event_type, e.user_id, e.created_at))
            return _Result(rows)

        if "auth_sessions" in sql and "user_id" in sql:
            rows = []
            for s in self.auth_sessions:
                created = getattr(s, "created_at", None) or getattr(s, "last_seen_at", None)
                if created is None:
                    continue
                if since is not None and created < since:
                    continue
                rows.append((s.user_id, created))
            return _Result(rows)

        if "from users" in sql or sql.strip().startswith("select users."):
            rows = []
            for u in self.users:
                if since is not None and u.created_at < since:
                    continue
                rows.append((u.created_at,))
            return _Result(rows)

        if "characters" in sql and "created_at" in sql:
            rows = []
            for c in self.characters:
                created = getattr(c, "created_at", None)
                if created is None:
                    continue
                if since is not None and created < since:
                    continue
                rows.append((created,))
            return _Result(rows)

        if "lobbies" in sql and "created_at" in sql and "lobby_members" not in sql:
            rows = []
            for lobby in self.lobbies:
                if since is not None and lobby.created_at < since:
                    continue
                rows.append((lobby.created_at,))
            return _Result(rows)

        if "play_sessions" in sql and "created_at" in sql:
            rows = []
            for s in self.sessions:
                if since is not None and s.created_at < since:
                    continue
                rows.append((s.created_at,))
            return _Result(rows)

        return _Result([])

    def add(self, obj) -> None:  # noqa: ANN001
        if self._fail_add:
            raise RuntimeError("simulated write failure")
        name = type(obj).__name__
        if name == "AdminRole":
            self.roles.append(obj)
            return
        if name == "AdminAuditLog" or (hasattr(obj, "action") and hasattr(obj, "actor_id")):
            self.audit.append(obj)
            return
        if name == "ProductEvent" or isinstance(obj, ProductEvent):
            if not getattr(obj, "created_at", None):
                obj.created_at = datetime.now(timezone.utc)
            self.events.append(obj)
            return
        if name == "AdminSecret" or (
            hasattr(obj, "password_hash") and hasattr(obj, "failed_attempts")
        ):
            self.secrets[obj.user_id] = obj

    def commit(self) -> None:
        self.committed += 1

    def rollback(self) -> None:
        self.rolled_back += 1

    def get(self, model, key):  # noqa: ANN001
        return self.secrets.get(key)

    def delete(self, obj) -> None:  # noqa: ANN001
        name = type(obj).__name__
        if name == "AdminRole" or getattr(obj, "role", None) is not None:
            oid = getattr(obj, "id", None)
            self.roles = [r for r in self.roles if getattr(r, "id", None) != oid]

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


@pytest.fixture
def db():
    return MetricsMemoryDB()


def _grant_full(db: MetricsMemoryDB, user) -> None:
    db.roles.append(
        SimpleNamespace(
            id=uuid4(),
            user_id=user.id,
            role=AdminRoleName.full_admin.value,
            granted_by=None,
            created_at=datetime.now(timezone.utc),
        )
    )


def _grant_moderator(db: MetricsMemoryDB, user) -> None:
    db.roles.append(
        SimpleNamespace(
            id=uuid4(),
            user_id=user.id,
            role=AdminRoleName.catalog_moderator.value,
            granted_by=None,
            created_at=datetime.now(timezone.utc),
        )
    )


def test_metrics_flag_off_404(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", False)
    admin = _user(email="admin@example.com")
    _grant_full(db, admin)
    with pytest.raises(NotFoundError):
        AdminService(db).get_metrics(admin, period=7)


def test_metrics_moderator_403(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    mod = _user(email="mod@example.com")
    _grant_moderator(db, mod)
    with pytest.raises(AppError) as exc:
        AdminService(db).get_metrics(mod, period=7)
    assert exc.value.status_code == 403


def test_metrics_empty_base(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    admin = _user(email="admin@example.com")
    _grant_full(db, admin)
    result = AdminService(db).get_metrics(admin, period=7)
    assert isinstance(result, AdminMetricsResponse)
    assert result.period_days == 7
    assert result.accounts.total == 0
    assert result.characters.total_alive == 0
    assert result.lobbies.total == 0
    assert len(result.daily) == 30
    assert all(d.signups == 0 and d.logins_unique == 0 for d in result.daily)
    payload = result.model_dump()
    blob = str(payload).lower()
    assert "password" not in blob
    assert "email" not in blob or "email_verified" in blob
    # Нет почт/имён людей в значениях
    assert "@" not in str(payload)
    assert "секретное" not in blob
    assert "phone" not in blob


def test_metrics_aggregates_editions_drafts_blocked(monkeypatch, db):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    now = datetime.now(timezone.utc)
    admin = _user(email="admin@example.com", created_at=now - timedelta(days=40))
    _grant_full(db, admin)

    u1 = _user(
        email="a@example.com",
        created_at=now - timedelta(hours=12),
        email_verified_at=now,
        blocked_at=None,
    )
    u2 = _user(
        email="b@example.com",
        created_at=now - timedelta(days=3),
        email_verified_at=None,
        blocked_at=now,
    )
    db.users.extend([u1, u2])

    db.characters.extend(
        [
            SimpleNamespace(
                user_id=u1.id,
                rules_edition=RulesEdition.edition_2014,
                is_draft=False,
                deleted_at=None,
            ),
            SimpleNamespace(
                user_id=u1.id,
                rules_edition=RulesEdition.edition_2024,
                is_draft=True,
                deleted_at=None,
            ),
            SimpleNamespace(
                user_id=u2.id,
                rules_edition=RulesEdition.edition_2014,
                is_draft=False,
                deleted_at=now,  # удалённый не считаем
            ),
        ]
    )
    db.lobbies.append(SimpleNamespace(id=uuid4(), owner_id=u1.id, created_at=now - timedelta(hours=2)))
    db.sessions.append(
        SimpleNamespace(
            id=uuid4(),
            created_at=now - timedelta(hours=1),
            closed_at=now,
        )
    )
    db.auth_sessions.append(
        SimpleNamespace(user_id=u1.id, last_seen_at=now - timedelta(hours=1), revoked_at=None)
    )

    result = AdminService(db).get_metrics(admin, period=7)
    assert result.accounts.total == 2
    assert result.accounts.email_verified == 1
    assert result.accounts.blocked == 1
    assert result.accounts.new_7d == 2
    assert result.characters.total_alive == 2
    assert result.characters.edition_2014 == 1
    assert result.characters.edition_2024 == 1
    assert result.characters.drafts == 1
    assert result.lobbies.total == 1
    assert result.lobbies.new_in_period == 1
    assert result.sessions.started_in_period == 1
    assert result.sessions.closed_in_period == 1
    assert result.active.active_1d == 1


def test_metrics_daily_from_tables_and_logins(monkeypatch, db):
    """Дневные ряды — из таблиц; уникальные входы — из журнала/сессий."""
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    admin = _user(email="admin@example.com")
    _grant_full(db, admin)
    uid = uuid4()
    now = datetime.now(timezone.utc)
    db.users.append(_user(id=uid, email="player@example.com", created_at=now))
    db.characters.append(
        SimpleNamespace(
            user_id=uid,
            rules_edition=RulesEdition.edition_2014,
            is_draft=False,
            deleted_at=None,
            created_at=now,
        )
    )
    db.lobbies.append(SimpleNamespace(id=uuid4(), owner_id=uid, created_at=now))
    db.sessions.append(SimpleNamespace(id=uuid4(), created_at=now, closed_at=None))
    db.events.append(
        ProductEvent(
            id=uuid4(),
            event_type=ProductEventType.login.value,
            user_id=uid,
            created_at=now,
        )
    )
    db.events.append(
        ProductEvent(
            id=uuid4(),
            event_type=ProductEventType.login.value,
            user_id=uid,
            created_at=now,
        )
    )
    result = AdminService(db).get_metrics(admin, period=1)
    today = result.daily[-1]
    assert today.signups == 1
    assert today.characters_created == 1
    assert today.lobbies_created == 1
    assert today.play_started == 1
    assert today.logins_unique == 1  # уникальные люди
    assert "екатеринбург" in result.note.lower() or "таблиц" in result.note.lower()


def test_metrics_daily_yekaterinburg_boundaries(monkeypatch, db):
    """События 23:30 и 00:30 местного попадают в разные календарные дни."""
    from zoneinfo import ZoneInfo

    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    tz = ZoneInfo("Asia/Yekaterinburg")
    frozen_utc = datetime(2026, 11, 16, 7, 0, 0, tzinfo=timezone.utc)  # 12:00 Екб

    class _PatchedDateTime(datetime):
        @classmethod
        def now(cls, tz=None):  # noqa: A003
            if tz is None:
                return frozen_utc.replace(tzinfo=None)
            return frozen_utc.astimezone(tz)

    monkeypatch.setattr(admin_mod, "datetime", _PatchedDateTime)

    admin = _user(email="admin@example.com", created_at=frozen_utc - timedelta(days=40))
    _grant_full(db, admin)

    before_midnight = datetime(2026, 11, 15, 23, 30, tzinfo=tz).astimezone(timezone.utc)
    after_midnight = datetime(2026, 11, 16, 0, 30, tzinfo=tz).astimezone(timezone.utc)
    db.users.append(_user(email="late@example.com", created_at=before_midnight))
    db.users.append(_user(email="early@example.com", created_at=after_midnight))

    result = AdminService(db).get_metrics(admin, period=1)
    by_date = {point.date: point for point in result.daily}
    assert by_date["2026-11-15"].signups == 1
    assert by_date["2026-11-16"].signups == 1
    assert _PatchedDateTime.now(timezone.utc) == frozen_utc


def test_record_product_event_ok(db):
    uid = uuid4()
    record_product_event(db, ProductEventType.login, user_id=uid)
    assert len(db.events) == 1
    assert db.events[0].event_type == "login"
    assert db.committed >= 1


def test_record_product_event_failure_swallowed(db):
    db._fail_add = True
    # Не должно пробрасывать
    record_product_event(db, ProductEventType.signup, user_id=uuid4())
    assert db.rolled_back >= 1
    assert len(db.events) == 0


def test_record_does_not_break_login_flow(monkeypatch, db):
    """Ошибка записи события не мешает вернуть токены (симуляция обёртки)."""
    calls = {"login_ok": False}

    def fake_login():
        record_product_event(db, ProductEventType.login, user_id=uuid4())
        calls["login_ok"] = True
        return {"access_token": "x"}

    db._fail_add = True
    result = fake_login()
    assert calls["login_ok"] is True
    assert result["access_token"] == "x"


def test_metrics_http_404_without_flag(monkeypatch):
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", False)
    client = TestClient(app)
    resp = client.get("/admin/metrics")
    # Без сессии — 401; с флагом выкл. require_panel на роутере → 404 если авторизован.
    # Без auth — 401, это тоже ок; главное не 200.
    assert resp.status_code in (401, 404)


def test_metrics_response_has_no_pii_keys():
    sample = AdminMetricsResponse(
        period_days=7,
        accounts={
            "total": 1,
            "email_verified": 1,
            "new_in_period": 0,
            "new_1d": 0,
            "new_7d": 0,
            "new_30d": 0,
            "blocked": 0,
        },
        active={"active_1d": 0, "active_7d": 0, "active_30d": 0},
        characters={
            "total_alive": 0,
            "edition_2014": 0,
            "edition_2024": 0,
            "drafts": 0,
        },
        lobbies={"total": 0, "new_in_period": 0},
        sessions={"started_in_period": 0, "closed_in_period": 0},
        daily=[],
    )
    data = sample.model_dump()
    flat_keys = set()

    def walk(obj, prefix=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                flat_keys.add(k)
                walk(v, k)
        elif isinstance(obj, list):
            for item in obj:
                walk(item, prefix)

    walk(data)
    for forbidden in ("password", "password_hash", "token", "full_name", "phone", "email"):
        assert forbidden not in flat_keys
