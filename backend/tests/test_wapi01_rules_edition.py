"""W-API-01: rules_edition и идемпотентность задания импорта."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.models.world_import import WorldImportJob
from app.schemas.world_import import WorldImportCreateRequest
from app.services import lobby_roles as roles
from app.services.world_import import (
    RULES_EDITION_UNSUPPORTED_MESSAGE,
    WorldImportService,
    normalize_rules_edition,
)


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
        self.jobs: list[WorldImportJob] = []

    def add(self, obj):
        if isinstance(obj, WorldImportJob):
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            now = datetime.now(timezone.utc)
            if getattr(obj, "created_at", None) is None:
                obj.created_at = now
            if getattr(obj, "updated_at", None) is None:
                obj.updated_at = now
            self.jobs.append(obj)

    def commit(self):
        return None

    def refresh(self, obj):
        return None

    def get(self, model, pk):
        if model is WorldImportJob:
            for j in self.jobs:
                if j.id == pk:
                    return j
        return None

    def scalar(self, stmt):  # noqa: ANN001
        # Idempotency lookup: return matching job by setting + key if present in where.
        for job in self.jobs:
            # Best-effort: if any job has idempotency_key set, prefer exact match helpers
            # via attribute scan used by tests through create_job.
            pass
        # Service calls select(...).where(setting_id, idempotency_key).limit(1)
        # Without compiling SQL we resolve via last compile-less heuristic in create_job tests
        # by monkeypatching find below — see _svc.
        return getattr(self, "_idempotency_hit", None)

    def scalars(self, stmt):  # noqa: ANN001
        class _Result:
            def __init__(self, rows):
                self._rows = rows

            def all(self):
                return list(self._rows)

        return _Result(sorted(self.jobs, key=lambda j: j.created_at, reverse=True))


def _svc(lobby, setting, monkeypatch):
    db = FakeDB()
    svc = WorldImportService(db)
    svc.lobbies = FakeLobbies(lobby, setting)

    def _require_wiki(_db, _lobby, user):
        if user.id != lobby.owner_id:
            raise AppError("Нет прав", code="lobby_wiki_required", status_code=403)

    monkeypatch.setattr(roles, "require_can_edit_wiki", _require_wiki)

    original_create = svc.create_job

    def create_job_with_idem(user, setting_id, payload=None, *, idempotency_key=None):
        key = (idempotency_key or "").strip() or None
        if key:
            for job in db.jobs:
                if job.setting_id == setting.id and job.idempotency_key == key:
                    db._idempotency_hit = job
                    break
            else:
                db._idempotency_hit = None
        else:
            db._idempotency_hit = None
        return original_create(user, setting_id, payload, idempotency_key=idempotency_key)

    svc.create_job = create_job_with_idem  # type: ignore[method-assign]
    return svc, db


def test_normalize_default_and_2014():
    assert normalize_rules_edition(None) == "2014"
    assert normalize_rules_edition("") == "2014"
    assert normalize_rules_edition("2014") == "2014"


def test_normalize_rejects_2024_and_foo():
    with pytest.raises(AppError) as ei:
        normalize_rules_edition("2024")
    assert ei.value.code == "rules_edition_unsupported"
    assert ei.value.status_code == 400
    assert "2014" in ei.value.message

    with pytest.raises(AppError) as ei2:
        normalize_rules_edition("foo")
    assert ei2.value.code == "rules_edition_unsupported"


def test_create_job_default_rules_edition(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)
    job = svc.create_job(owner, setting.id, WorldImportCreateRequest())
    assert job.rules_edition == "2014"
    assert job.status == "received"
    assert len(db.jobs) == 1


def test_create_job_explicit_2014(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)
    job = svc.create_job(
        owner,
        setting.id,
        WorldImportCreateRequest(rules_edition="2014"),
    )
    assert job.rules_edition == "2014"
    assert len(db.jobs) == 1


def test_create_job_rejects_2024_without_row(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)
    with pytest.raises(AppError) as ei:
        svc.create_job(
            owner,
            setting.id,
            WorldImportCreateRequest(rules_edition="2024"),
        )
    assert ei.value.code == "rules_edition_unsupported"
    assert ei.value.message == RULES_EDITION_UNSUPPORTED_MESSAGE
    assert len(db.jobs) == 0


def test_create_job_rejects_foo_without_row(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)
    with pytest.raises(AppError) as ei:
        svc.create_job(
            owner,
            setting.id,
            WorldImportCreateRequest(rules_edition="foo"),
        )
    assert ei.value.code == "rules_edition_unsupported"
    assert len(db.jobs) == 0


def test_idempotency_key_returns_same_job(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    svc, db = _svc(lobby, setting, monkeypatch)
    first = svc.create_job(
        owner,
        setting.id,
        WorldImportCreateRequest(),
        idempotency_key="vault-1",
    )
    second = svc.create_job(
        owner,
        setting.id,
        WorldImportCreateRequest(),
        idempotency_key="vault-1",
    )
    assert first.id == second.id
    assert len(db.jobs) == 1
