"""W-04: сервис сетов и известных легенд (без HTTP/conftest)."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.schemas.lobby import (
    SettingArtifactCreateRequest,
    SettingArtifactSetCreateRequest,
    ArtifactAbilityIn,
    ArtifactSetThresholdIn,
)
from app.services import lobby_roles as roles
from app.services.lobby import LobbyService


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
        visibility_profile={},
        campaign_rules={},
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
        pages=[],
    )


class FakeLobbies:
    def __init__(self, lobby, setting):
        self.lobby = lobby
        self.setting = setting
        self.pages = []
        self.artifacts = []
        self.sets = []
        self.members = []  # set memberships
        self.links = []
        self.templates = []

    def get_lobby(self, lobby_id):
        return self.lobby if self.lobby.id == lobby_id else None

    def get_setting(self, setting_id):
        return self.setting if self.setting.id == setting_id else None

    def list_setting_pages(self, setting_id, *, include_deleted=False):
        rows = [p for p in self.pages if p.setting_id == setting_id]
        if not include_deleted:
            rows = [p for p in rows if getattr(p, "deleted_at", None) is None]
        return rows

    def get_setting_page(self, page_id):
        for p in self.pages:
            if p.id == page_id:
                return p
        return None

    def create_setting_page(self, **kwargs):
        now = datetime.now(timezone.utc)
        page = SimpleNamespace(
            id=uuid4(),
            setting_id=kwargs["setting_id"],
            title=kwargs.get("title", "Новая"),
            body=kwargs.get("body", ""),
            gm_body=kwargs.get("gm_body", ""),
            parent_id=kwargs.get("parent_id"),
            sort_order=kwargs.get("sort_order", 0),
            page_kind=kwargs.get("page_kind", "note"),
            template_id=kwargs.get("template_id"),
            fields=kwargs.get("fields") or {},
            quest_status=kwargs.get("quest_status"),
            tags=list(kwargs.get("tags") or []),
            artifact_id=kwargs.get("artifact_id"),
            revealed=False,
            revealed_at=None,
            deleted_at=None,
            created_at=now,
            updated_at=now,
        )
        self.pages.append(page)
        return page

    def list_setting_page_links(self, setting_id):
        return []

    def list_setting_page_templates(self, setting_id):
        return []

    def list_setting_artifacts(self, setting_id):
        return [a for a in self.artifacts if a.setting_id == setting_id]

    def get_setting_artifact(self, artifact_id):
        for a in self.artifacts:
            if a.id == artifact_id:
                return a
        return None

    def create_setting_artifact(self, **kwargs):
        now = datetime.now(timezone.utc)
        row = SimpleNamespace(
            id=uuid4(),
            created_at=now,
            updated_at=now,
            **kwargs,
        )
        if not hasattr(row, "sort_order"):
            row.sort_order = 0
        self.artifacts.append(row)
        return row

    def delete_setting_artifact(self, artifact):
        self.artifacts = [a for a in self.artifacts if a.id != artifact.id]

    def list_setting_artifact_sets(self, setting_id):
        rows = [s for s in self.sets if s.setting_id == setting_id]
        for s in rows:
            s.members = [m for m in self.members if m.set_id == s.id]
        return rows

    def get_setting_artifact_set(self, set_id):
        for s in self.sets:
            if s.id == set_id:
                s.members = [m for m in self.members if m.set_id == s.id]
                return s
        return None

    def create_setting_artifact_set(self, **kwargs):
        now = datetime.now(timezone.utc)
        row = SimpleNamespace(
            id=uuid4(),
            created_at=now,
            updated_at=now,
            members=[],
            **kwargs,
        )
        self.sets.append(row)
        return row

    def delete_setting_artifact_set(self, artifact_set):
        self.sets = [s for s in self.sets if s.id != artifact_set.id]
        self.members = [m for m in self.members if m.set_id != artifact_set.id]

    def clear_artifact_set_members(self, set_id):
        self.members = [m for m in self.members if m.set_id != set_id]

    def add_artifact_set_member(self, *, set_id, artifact_id, sort_order=0):
        row = SimpleNamespace(
            id=uuid4(),
            set_id=set_id,
            artifact_id=artifact_id,
            sort_order=sort_order,
        )
        self.members.append(row)
        return row

    def find_artifact_set_membership(self, artifact_id):
        for m in self.members:
            if m.artifact_id == artifact_id:
                return m
        return None

    def list_roles(self, lobby_id):
        return []

    def latest_journal_published_at(self, lobby_id):
        return None

    def get_characters_map(self, ids):
        return {}

    def delete_setting_page_links_of_kind(self, **kwargs):
        pass

    def create_setting_page_link(self, **kwargs):
        pass


class FakeDB:
    def commit(self):
        pass

    def refresh(self, obj):
        pass

    def flush(self):
        pass

    def add(self, obj):
        pass

    def delete(self, obj):
        pass


def _svc(owner, monkeypatch):
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    lobby.settings = [setting]
    db = FakeDB()
    svc = LobbyService(db)
    fake = FakeLobbies(lobby, setting)
    svc.lobbies = fake

    monkeypatch.setattr(svc, "_require_lobby", lambda lid: lobby)
    monkeypatch.setattr(svc, "_require_setting_writable", lambda s: None)
    monkeypatch.setattr(roles, "require_view", lambda *a, **k: None)

    def _require_wiki(db_, lobby_, user):
        if user.id != owner.id:
            raise AppError("Нет прав править вики", code="lobby_wiki_required", status_code=403)

    monkeypatch.setattr(roles, "require_can_edit_wiki", _require_wiki)
    monkeypatch.setattr(roles, "can_edit_wiki", lambda *a, **k: a[2].id == owner.id)
    monkeypatch.setattr(roles, "can_see_hidden", lambda *a, **k: a[2].id == owner.id)
    monkeypatch.setattr(roles, "is_owner", lambda lobby_, user: user.id == owner.id)

    monkeypatch.setattr(
        svc,
        "wiki",
        lambda: SimpleNamespace(
            purge_expired=lambda **kw: None,
            enrich_pages_with_media=lambda pages, **kw: pages,
            check_conflict=lambda *a, **k: None,
            record_version=lambda **kw: None,
        ),
    )
    return svc, lobby, setting, fake


def test_multi_abilities_and_set_visibility(monkeypatch):
    owner = _user("GM")
    player = _user("PL")
    svc, lobby, setting, fake = _svc(owner, monkeypatch)

    detail = svc.create_setting_artifact(
        owner,
        setting.id,
        SettingArtifactCreateRequest(
            name="Кольцо",
            abilities=[
                ArtifactAbilityIn(kind="passive", name="+1 КД", bonus_target="ac", bonus_value=1),
                ArtifactAbilityIn(
                    kind="companion",
                    name="Призыв",
                    companion_name="Волк",
                    hp_max=11,
                    ac=13,
                ),
            ],
        ),
    )
    assert len(detail.artifacts) == 1
    assert len(detail.artifacts[0].abilities) == 2

    a2 = svc.create_setting_artifact(
        owner,
        setting.id,
        SettingArtifactCreateRequest(
            name="Амулет",
            abilities=[ArtifactAbilityIn(kind="trait", name="черта")],
        ),
    )
    ids = [a.id for a in a2.artifacts]

    sets = svc.create_setting_artifact_set(
        owner,
        setting.id,
        SettingArtifactSetCreateRequest(
            name="Сет",
            artifact_ids=ids,
            thresholds=[
                ArtifactSetThresholdIn(
                    pieces=2,
                    player_text="Две",
                    abilities=[
                        ArtifactAbilityIn(
                            kind="passive",
                            name="за 2",
                            bonus_target="ac",
                            bonus_value=1,
                        )
                    ],
                )
            ],
        ),
    )
    assert len(sets.artifact_sets) == 1
    assert sets.artifact_sets[0].artifact_ids == ids

    # повтор — тот же артефакт в другом сете
    with pytest.raises(AppError) as exc:
        svc.create_setting_artifact_set(
            owner,
            setting.id,
            SettingArtifactSetCreateRequest(name="Другой", artifact_ids=[ids[0]]),
        )
    assert exc.value.code == "artifact_already_in_set"

    # игрок: пустые artifacts/sets
    monkeypatch.setattr(roles, "can_see_hidden", lambda *a, **k: False)
    monkeypatch.setattr(roles, "can_edit_wiki", lambda *a, **k: False)
    monkeypatch.setattr(roles, "is_owner", lambda *a, **k: False)
    player_detail = svc.get_setting(player, setting.id)
    assert player_detail.artifacts == []
    assert player_detail.artifact_sets == []
    assert player_detail.known_legends == []


def test_known_legend_after_reveal(monkeypatch):
    owner = _user("GM")
    player = _user("PL")
    svc, lobby, setting, fake = _svc(owner, monkeypatch)

    art = svc.create_setting_artifact(
        owner,
        setting.id,
        SettingArtifactCreateRequest(
            name="Клинок бури",
            description="Древний клинок",
            abilities=[ArtifactAbilityIn(kind="trait", name="секрет")],
        ),
    )
    aid = art.artifacts[0].id
    now = datetime.now(timezone.utc)
    page = SimpleNamespace(
        id=uuid4(),
        setting_id=setting.id,
        parent_id=None,
        title="Клинок",
        body="Текст",
        gm_body="",
        sort_order=0,
        revealed=False,
        revealed_at=None,
        page_kind="item_lore",
        template_id=None,
        fields={},
        quest_status=None,
        tags=[],
        artifact_id=aid,
        deleted_at=None,
        created_at=now,
        updated_at=now,
    )
    fake.pages.append(page)

    hidden = svc._setting_detail(setting, see_as_gm=True)
    assert hidden.known_legends == []

    page.revealed = True
    page.revealed_at = now
    shown = svc._setting_detail(setting, see_as_gm=True)
    assert any(L.artifact_id == aid for L in shown.known_legends)
    legend = next(L for L in shown.known_legends if L.artifact_id == aid)
    assert legend.name == "Клинок бури"
    assert legend.description == "Древний клинок"

    pl = svc._setting_detail(setting, see_as_gm=False)
    assert pl.artifacts == []
    assert pl.artifact_sets == []
    assert len(pl.known_legends) == 1
    assert pl.known_legends[0].artifact_id == aid
