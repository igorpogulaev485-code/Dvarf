"""W-API-11: отклонение пункта черновика и журнал подтверждений (тонкая склейка API)."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.models.world_import import (
    WorldImportConfirmation,
    WorldImportDraftItem,
    WorldImportJob,
)
from app.services.world_import import WorldImportService


def _user():
    return SimpleNamespace(id=uuid4(), display_name="Мастер", login=None, email="m@t.test")


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


def _setting(lobby_id):
    return SimpleNamespace(
        id=uuid4(),
        lobby_id=lobby_id,
        name="Мир",
        world_notes="",
        is_extra=False,
        deleted_at=None,
        ai_can_confirm=False,
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
    def __init__(self, items, confirmations, jobs):
        self.items = items
        self.confirmations = confirmations
        self.jobs = jobs
        self.committed = False

    def get(self, model, pk):
        if model is WorldImportJob:
            return next((j for j in self.jobs if j.id == pk), None)
        if model is WorldImportDraftItem:
            return next((i for i in self.items if i.id == pk), None)
        return None

    def scalars(self, stmt):
        # Упрощённо: отдаём items или confirmations по типу entity.
        entity = getattr(stmt, "column_descriptions", None)
        text = str(stmt)
        if "world_import_confirmations" in text or "WorldImportConfirmation" in text:
            rows = self.confirmations
        elif "world_import_draft_items" in text or "WorldImportDraftItem" in text:
            rows = self.items
        else:
            rows = self.items

        class _R:
            def all(self_inner):
                return rows

        return _R()

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        return obj


def test_reject_draft_item_sets_rejected(monkeypatch):
    owner = _user()
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    job = WorldImportJob(
        id=uuid4(),
        setting_id=setting.id,
        lobby_id=lobby.id,
        author_id=owner.id,
        status="ready_for_review",
        rules_edition="2014",
        source_kind="api",
    )
    now = datetime.now(timezone.utc)
    item = WorldImportDraftItem(
        id=uuid4(),
        job_id=job.id,
        item_type="ai_suggestion",
        source_key="world/lore/x.md",
        status="proposed",
        proposal={"title": "X"},
        created_at=now,
        updated_at=now,
    )
    db = FakeDB([item], [], [job])
    svc = WorldImportService(db)
    monkeypatch.setattr(svc, "lobbies", FakeLobbies(lobby, setting))
    monkeypatch.setattr(svc, "_require_setting", lambda _sid: setting)
    monkeypatch.setattr(svc, "_require_master_for_setting", lambda *_a, **_k: None)
    monkeypatch.setattr(svc, "_require_job", lambda _s, _j: job)

    out = svc.reject_draft_item(owner, setting.id, job.id, item.id)
    assert out.status == "rejected"
    assert item.status == "rejected"
    assert db.committed


def test_list_confirmations_returns_journal(monkeypatch):
    owner = _user()
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    job = WorldImportJob(
        id=uuid4(),
        setting_id=setting.id,
        lobby_id=lobby.id,
        author_id=owner.id,
        status="confirmed",
        rules_edition="2014",
        source_kind="zip",
    )
    conf = WorldImportConfirmation(
        id=uuid4(),
        job_id=job.id,
        setting_id=setting.id,
        lobby_id=lobby.id,
        actor_kind="user",
        actor_user_id=owner.id,
        actor_token_id=None,
        item_ids=[],
        confirmed_at=datetime.now(timezone.utc),
        undone_at=None,
    )
    db = FakeDB([], [conf], [job])
    svc = WorldImportService(db)
    monkeypatch.setattr(svc, "_require_setting", lambda _sid: setting)
    monkeypatch.setattr(svc, "_require_master_for_setting", lambda *_a, **_k: None)
    monkeypatch.setattr(svc, "_require_job", lambda _s, _j: job)

    rows = svc.list_confirmations(owner, setting.id, job.id)
    assert len(rows) == 1
    assert rows[0].actor_kind == "user"
