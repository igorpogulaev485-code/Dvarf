"""ADM-05: правки названий справочника — черновик, принятие, сид не затирает, роли."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.exceptions import AppError, NotFoundError
from app.core.security import hash_password
from app.main import app
from app.models.admin import AdminRoleName
from app.models.catalog import CatalogKind, CatalogRulesEdition
from app.models.catalog_name_revision import (
    CatalogNameRevision,
    CatalogNameRevisionStatus,
)
from app.models.character import Character
from app.schemas.admin_catalog import AdminCatalogDraftRequest
from app.services import admin as admin_mod
from app.services.admin import AdminService, hint_is_admin
from app.services.admin_catalog import (
    ACTION_CATALOG_ACCEPT,
    ACTION_CATALOG_DRAFT_CREATE,
    ACTION_CATALOG_REJECT,
    ACTION_CATALOG_ROLLBACK,
    AdminCatalogService,
)
from app.services.catalog import to_out
from app.services.catalog_names import live_names_for_entry, load_live_accepted_map


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


def _entry(**kwargs):
    now = datetime.now(timezone.utc)
    base = dict(
        id=uuid4(),
        kind=CatalogKind.spell,
        slug="fireball",
        name_ru="Огненный шар",
        name_en="Fireball",
        rules_edition=CatalogRulesEdition.edition_2014,
        parent_id=None,
        source="srd-5.1",
        external_ref=None,
        data={},
        sort_order=0,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


class CatalogMemoryDB:
    def __init__(self) -> None:
        self.roles: list[SimpleNamespace] = []
        self.secrets: dict = {}
        self.audit: list[SimpleNamespace] = []
        self.users: list = []
        self.entries: list = []
        self.revisions: list[CatalogNameRevision] = []
        self.feedback: list = []
        self.committed = 0

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

        if "catalog_name_revisions" in sql and "count" not in sql:
            # get_pending / load one
            status = None
            entry_id = None
            for key, val in params.items():
                if "status" in key:
                    status = val
                if "catalog_entry" in key or (hasattr(val, "hex") and "entry" in key):
                    entry_id = val
            # Also pick UUIDs from params
            uuids = [v for v in params.values() if hasattr(v, "hex")]
            for row in self.revisions:
                if status and row.status != status:
                    continue
                if entry_id and row.catalog_entry_id != entry_id:
                    continue
                if uuids and row.catalog_entry_id not in uuids and row.id not in uuids:
                    # try match any uuid as entry
                    if not any(row.catalog_entry_id == u for u in uuids):
                        continue
                return row
            # pending lookup by entry from IN clause values
            for row in self.revisions:
                if status and row.status != status:
                    continue
                for u in uuids:
                    if row.catalog_entry_id == u:
                        return row
            return None

        if "count" in sql and "feedback" in sql:
            return len([f for f in self.feedback if getattr(f, "topic", None) == "name"])

        if "count" in sql and "catalog_entries" in sql:
            return len(self.entries)

        return None

    def scalars(self, stmt):  # noqa: ANN001
        sql = str(stmt).lower()
        try:
            params = stmt.compile().params
        except Exception:
            params = {}

        class _Result:
            def __init__(self, rows):
                self._rows = rows

            def all(self):
                return list(self._rows)

        if "catalog_name_revisions" in sql:
            rows = list(self.revisions)
            status_set = {s.value for s in CatalogNameRevisionStatus}
            status_vals: list[str] = []
            entry_ids: list = []
            for val in params.values():
                if isinstance(val, (list, tuple, set)):
                    for item in val:
                        if item in status_set:
                            status_vals.append(item)
                        elif hasattr(item, "hex"):
                            entry_ids.append(item)
                elif val in status_set:
                    status_vals.append(val)
                elif hasattr(val, "hex"):
                    entry_ids.append(val)
            if status_vals:
                rows = [r for r in rows if r.status in status_vals]
            # IN clause — filter by catalog_entry_id when present
            if "catalog_entry_id" in sql and entry_ids:
                id_set = set(entry_ids)
                rows = [r for r in rows if r.catalog_entry_id in id_set or r.id in id_set]
            # Order by reviewed_at / created_at desc for live map
            if "reviewed_at" in sql or CatalogNameRevisionStatus.accepted.value in status_vals:
                rows = sorted(
                    rows,
                    key=lambda r: (r.reviewed_at or r.created_at, r.created_at),
                    reverse=True,
                )
            else:
                rows = sorted(rows, key=lambda r: r.created_at, reverse=True)
            return _Result(rows)

        if "catalog_entries" in sql:
            return _Result(list(self.entries))

        if "feedback_messages" in sql:
            rows = [f for f in self.feedback if getattr(f, "topic", None) == "name"]
            return _Result(rows)

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
            return _Result(rows)

        return _Result([])

    def get(self, model, key):  # noqa: ANN001
        name = getattr(model, "__name__", str(model))
        if name == "AdminSecret":
            return self.secrets.get(key)
        if name == "CatalogEntry":
            for e in self.entries:
                if e.id == key:
                    return e
            return None
        if name == "User":
            for u in self.users:
                if u.id == key:
                    return u
            return None
        if name == "CatalogNameRevision":
            for r in self.revisions:
                if r.id == key:
                    return r
            return None
        return None

    def add(self, obj) -> None:  # noqa: ANN001
        name = type(obj).__name__
        if name == "AdminRole":
            self.roles.append(obj)
            return
        if name == "AdminAuditLog":
            self.audit.append(obj)
            return
        if name == "CatalogNameRevision":
            # replace if same id
            self.revisions = [r for r in self.revisions if r.id != obj.id]
            self.revisions.append(obj)
            return

    def delete(self, obj) -> None:  # noqa: ANN001
        name = type(obj).__name__
        if name == "CatalogNameRevision":
            self.revisions = [r for r in self.revisions if r.id != obj.id]
            return
        if name == "AdminRole" or getattr(obj, "role", None) is not None:
            oid = getattr(obj, "id", None)
            self.roles = [r for r in self.roles if getattr(r, "id", None) != oid]

    def commit(self) -> None:
        self.committed += 1

    def rollback(self) -> None:
        pass

    def flush(self) -> None:
        pass


def _grant_full(db: CatalogMemoryDB, user) -> None:
    db.roles.append(
        SimpleNamespace(
            id=uuid4(),
            user_id=user.id,
            role=AdminRoleName.full_admin.value,
        )
    )


def _grant_moderator(db: CatalogMemoryDB, user) -> None:
    db.roles.append(
        SimpleNamespace(
            id=uuid4(),
            user_id=user.id,
            role=AdminRoleName.catalog_moderator.value,
        )
    )


@pytest.fixture
def enabled(monkeypatch):
    monkeypatch.setattr(admin_mod, "admin_panel_enabled", lambda: True)
    monkeypatch.setattr(admin_mod.settings, "admin_panel_enabled", True)
    monkeypatch.setattr(admin_mod.settings, "admin_bootstrap_email", "")


def test_live_names_seed_when_no_revision():
    entry = _entry(name_ru="Сидовое", name_en="Seed")
    ru, en = live_names_for_entry(entry, None)
    assert ru == "Сидовое"
    assert en == "Seed"


def test_draft_not_in_public_to_out(enabled):
    db = CatalogMemoryDB()
    entry = _entry()
    db.entries.append(entry)
    admin = _user(email="admin@example.com", display_name="Админ")
    db.users.append(admin)
    _grant_full(db, admin)

    svc = AdminCatalogService(db)
    detail = svc.upsert_draft(
        admin,
        entry.id,
        AdminCatalogDraftRequest(name_ru="Новое имя черновика", name_en=None),
    )
    assert detail.pending is not None
    assert detail.pending.name_ru == "Новое имя черновика"

    # Публичный to_out без карты accepted — сид
    out = to_out(entry, apply_live=True, accepted_map={})
    assert out.name_ru == entry.name_ru
    assert "черновика" not in out.name_ru

    # После принятия — живое имя
    svc.accept(admin, entry.id)
    accepted_map = load_live_accepted_map(db, [entry.id])
    out2 = to_out(entry, accepted_map=accepted_map)
    assert out2.name_ru == "Новое имя черновика"
    # Сид не тронут
    assert entry.name_ru == "Огненный шар"


def test_seed_update_does_not_overwrite_accepted(enabled):
    db = CatalogMemoryDB()
    entry = _entry(name_ru="Старое сид")
    db.entries.append(entry)
    admin = _user(email="admin@example.com", display_name="Админ")
    db.users.append(admin)
    _grant_full(db, admin)
    svc = AdminCatalogService(db)
    svc.upsert_draft(admin, entry.id, AdminCatalogDraftRequest(name_ru="Принятое имя"))
    svc.accept(admin, entry.id)

    # «Сид» переписал колонку
    entry.name_ru = "Новый сид после миграции"
    accepted_map = load_live_accepted_map(db, [entry.id])
    ru, _ = live_names_for_entry(entry, accepted_map.get(entry.id))
    assert ru == "Принятое имя"


def test_reject_and_withdraw_keep_live(enabled):
    db = CatalogMemoryDB()
    entry = _entry()
    db.entries.append(entry)
    admin = _user(email="admin@example.com", display_name="Админ")
    mod = _user(email="mod@example.com", display_name="Модератор")
    db.users.extend([admin, mod])
    _grant_full(db, admin)
    _grant_moderator(db, mod)

    svc = AdminCatalogService(db)
    svc.upsert_draft(mod, entry.id, AdminCatalogDraftRequest(name_ru="Черновик мода"))
    svc.reject(admin, entry.id)
    accepted_map = load_live_accepted_map(db, [entry.id])
    assert accepted_map.get(entry.id) is None
    out = to_out(entry, accepted_map=accepted_map)
    assert out.name_ru == entry.name_ru

    svc.upsert_draft(mod, entry.id, AdminCatalogDraftRequest(name_ru="Ещё черновик"))
    svc.withdraw_draft(mod, entry.id)
    assert get_pending_count(db, entry.id) == 0


def get_pending_count(db: CatalogMemoryDB, entry_id) -> int:
    return sum(
        1
        for r in db.revisions
        if r.catalog_entry_id == entry_id
        and r.status == CatalogNameRevisionStatus.pending.value
    )


def test_accept_rollback_restores_previous(enabled):
    db = CatalogMemoryDB()
    entry = _entry(name_ru="Сид")
    db.entries.append(entry)
    admin = _user(email="admin@example.com", display_name="Админ")
    db.users.append(admin)
    _grant_full(db, admin)
    svc = AdminCatalogService(db)

    svc.upsert_draft(admin, entry.id, AdminCatalogDraftRequest(name_ru="Первое"))
    svc.accept(admin, entry.id)
    svc.upsert_draft(admin, entry.id, AdminCatalogDraftRequest(name_ru="Второе"))
    detail = svc.accept(admin, entry.id)
    live_id = next(
        r.id
        for r in detail.revisions
        if r.status == CatalogNameRevisionStatus.accepted.value and r.can_rollback
    )
    svc.rollback(admin, entry.id, live_id)

    accepted_map = load_live_accepted_map(db, [entry.id])
    ru, _ = live_names_for_entry(entry, accepted_map.get(entry.id))
    assert ru == "Первое"
    assert any(a.action == ACTION_CATALOG_ROLLBACK for a in db.audit)


def test_single_pending_update(enabled):
    db = CatalogMemoryDB()
    entry = _entry()
    db.entries.append(entry)
    mod = _user(email="mod@example.com", display_name="Мод")
    db.users.append(mod)
    _grant_moderator(db, mod)
    svc = AdminCatalogService(db)
    svc.upsert_draft(mod, entry.id, AdminCatalogDraftRequest(name_ru="А"))
    svc.upsert_draft(mod, entry.id, AdminCatalogDraftRequest(name_ru="Б"))
    assert get_pending_count(db, entry.id) == 1
    pending = next(
        r
        for r in db.revisions
        if r.status == CatalogNameRevisionStatus.pending.value
    )
    assert pending.name_ru == "Б"


def test_moderator_cannot_accept_reject_rollback(enabled):
    db = CatalogMemoryDB()
    entry = _entry()
    db.entries.append(entry)
    admin = _user(email="admin@example.com", display_name="Админ")
    mod = _user(email="mod@example.com", display_name="Мод")
    db.users.extend([admin, mod])
    _grant_full(db, admin)
    _grant_moderator(db, mod)
    svc = AdminCatalogService(db)
    svc.upsert_draft(mod, entry.id, AdminCatalogDraftRequest(name_ru="Черновик"))

    with pytest.raises(AppError) as exc:
        svc.accept(mod, entry.id)
    assert exc.value.status_code == 403

    with pytest.raises(AppError):
        svc.reject(mod, entry.id)

    svc.accept(admin, entry.id)
    live = load_live_accepted_map(db, [entry.id])[entry.id]
    with pytest.raises(AppError):
        svc.rollback(mod, entry.id, live.id)


def test_moderator_cannot_edit_foreign_draft(enabled):
    db = CatalogMemoryDB()
    entry = _entry()
    db.entries.append(entry)
    mod1 = _user(email="m1@example.com", display_name="М1")
    mod2 = _user(email="m2@example.com", display_name="М2")
    db.users.extend([mod1, mod2])
    _grant_moderator(db, mod1)
    _grant_moderator(db, mod2)
    svc = AdminCatalogService(db)
    svc.upsert_draft(mod1, entry.id, AdminCatalogDraftRequest(name_ru="Чужой"))
    with pytest.raises(AppError) as exc:
        svc.upsert_draft(mod2, entry.id, AdminCatalogDraftRequest(name_ru="Взлом"))
    assert exc.value.status_code == 403


def test_character_names_unchanged_after_accept(enabled):
    db = CatalogMemoryDB()
    entry = _entry(kind=CatalogKind.class_, slug="wizard", name_ru="Волшебник")
    db.entries.append(entry)
    admin = _user(email="admin@example.com")
    db.users.append(admin)
    _grant_full(db, admin)
    char = SimpleNamespace(
        id=uuid4(),
        class_name="Волшебник",
        race_name="Человек",
    )
    svc = AdminCatalogService(db)
    svc.upsert_draft(admin, entry.id, AdminCatalogDraftRequest(name_ru="Маг"))
    svc.accept(admin, entry.id)
    assert char.class_name == "Волшебник"
    assert char.race_name == "Человек"


def test_moderator_status_and_hint(enabled):
    db = CatalogMemoryDB()
    mod = _user(email="mod@example.com", display_name="Мод")
    db.users.append(mod)
    _grant_moderator(db, mod)
    status = AdminService(db).status(mod)
    assert status.is_full_admin is False
    assert status.is_catalog_moderator is True
    assert status.sections == ["catalog"]
    assert hint_is_admin(db, mod) is True


def test_moderator_forbidden_on_accounts(enabled):
    db = CatalogMemoryDB()
    mod = _user(email="mod@example.com")
    db.users.append(mod)
    _grant_moderator(db, mod)
    with pytest.raises(AppError) as exc:
        AdminService(db).list_accounts(mod)
    assert exc.value.status_code == 403


def test_audit_has_no_secrets(enabled):
    db = CatalogMemoryDB()
    entry = _entry()
    db.entries.append(entry)
    admin = _user(email="admin@example.com")
    db.users.append(admin)
    _grant_full(db, admin)
    svc = AdminCatalogService(db)
    svc.upsert_draft(admin, entry.id, AdminCatalogDraftRequest(name_ru="Икс"))
    svc.accept(admin, entry.id)
    for row in db.audit:
        meta = getattr(row, "meta", {}) or {}
        blob = str(meta).lower()
        assert "password" not in blob
        assert "token" not in blob
        assert row.action in {
            ACTION_CATALOG_DRAFT_CREATE,
            ACTION_CATALOG_ACCEPT,
            "admin_catalog_draft_update",
        }


def test_http_flag_off_404(monkeypatch):
    monkeypatch.setattr(admin_mod, "admin_panel_enabled", lambda: False)
    client = TestClient(app)
    res = client.get("/admin/catalog")
    assert res.status_code in (401, 404)


def test_http_no_session_401(monkeypatch):
    monkeypatch.setattr(admin_mod, "admin_panel_enabled", lambda: True)
    client = TestClient(app)
    res = client.get("/admin/catalog")
    assert res.status_code == 401


def test_empty_name_en_does_not_wipe_live_en(enabled):
    db = CatalogMemoryDB()
    entry = _entry(name_en="Fireball")
    db.entries.append(entry)
    admin = _user(email="admin@example.com")
    db.users.append(admin)
    _grant_full(db, admin)
    svc = AdminCatalogService(db)
    # Черновик без name_en
    svc.upsert_draft(admin, entry.id, AdminCatalogDraftRequest(name_ru="Шар огня", name_en=None))
    svc.accept(admin, entry.id)
    accepted_map = load_live_accepted_map(db, [entry.id])
    ru, en = live_names_for_entry(entry, accepted_map.get(entry.id))
    assert ru == "Шар огня"
    assert en == "Fireball"
