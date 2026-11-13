"""W-01: один сеттинг, маскировка mention, revealed_at, права на primary."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError, NotFoundError
from app.dnd.setting_mentions import mask_unrevealed_mentions
from app.models.lobby import LOBBY_ROLE_COMASTER, LOBBY_ROLE_LEAD_TODAY, LOBBY_ROLE_OBSERVER, LobbyRole
from app.schemas.lobby import SettingCreateRequest, SettingPageUpdateRequest
from app.services import lobby_roles as roles
from app.services.lobby import LobbyService


def _user(name="U"):
    return SimpleNamespace(id=uuid4(), display_name=name, login=None, email=f"{name}@t.test")


def _lobby(owner_id, settings=None):
    return SimpleNamespace(
        id=uuid4(),
        owner_id=owner_id,
        name="Лобби",
        invite_code="ABC123",
        members=[],
        roles=[],
        settings=list(settings or []),
        sessions=[],
        visibility_profile={},
        campaign_rules={},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def _setting(lobby_id, *, is_extra=False, name="Мир"):
    return SimpleNamespace(
        id=uuid4(),
        lobby_id=lobby_id,
        name=name,
        world_notes="",
        is_extra=is_extra,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        pages=[],
    )


def _page(setting_id, *, title="Стр", body="", revealed=False, revealed_at=None, **kw):
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        setting_id=setting_id,
        parent_id=None,
        title=title,
        body=body,
        gm_body=kw.get("gm_body", ""),
        sort_order=0,
        revealed=revealed,
        revealed_at=revealed_at,
        page_kind=kw.get("page_kind", "note"),
        template_id=None,
        fields=kw.get("fields", {}),
        quest_status=kw.get("quest_status"),
        tags=kw.get("tags", []),
        created_at=now,
        updated_at=now,
    )


class FakeLobbies:
    def __init__(self, lobby, settings_by_id=None, pages=None):
        self.lobby = lobby
        self.settings_by_id = dict(settings_by_id or {})
        self.pages = list(pages or [])
        self.links = []
        self.templates = []
        self.artifacts = []

    def get_lobby(self, lobby_id):
        return self.lobby if self.lobby.id == lobby_id else None

    def get_setting(self, setting_id):
        return self.settings_by_id.get(setting_id)

    def create_setting(self, *, lobby_id, name, world_notes):
        s = _setting(lobby_id, name=name)
        s.world_notes = world_notes
        self.settings_by_id[s.id] = s
        self.lobby.settings.append(s)
        return s

    def list_setting_pages(self, setting_id):
        return [p for p in self.pages if p.setting_id == setting_id]

    def get_setting_page(self, page_id):
        for p in self.pages:
            if p.id == page_id:
                return p
        return None

    def list_setting_page_links(self, setting_id):
        return []

    def list_setting_page_templates(self, setting_id):
        return []

    def list_setting_artifacts(self, setting_id):
        return []

    def list_roles(self, lobby_id):
        return list(getattr(self.lobby, "roles", []) or [])

    def latest_journal_published_at(self, lobby_id):
        return None

    def get_characters_map(self, ids):
        return {}

    def delete_setting_page_links_of_kind(self, **kwargs):
        pass

    def create_setting_page_link(self, **kwargs):
        pass


class FakeDB:
    def __init__(self):
        self.committed = False

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        pass

    def flush(self):
        pass

    def scalar(self, stmt):  # noqa: ANN001
        return None

    def scalars(self, stmt):  # noqa: ANN001
        return SimpleNamespace(all=lambda: [])


def _svc(lobby, monkeypatch, *, pages=None, settings=None, wiki_users=None, see_hidden=None):
    wiki_users = set(wiki_users or [])
    see_hidden = set(see_hidden or [])
    settings = settings or list(lobby.settings)
    by_id = {s.id: s for s in settings}
    db = FakeDB()
    svc = LobbyService(db)
    svc.lobbies = FakeLobbies(lobby, settings_by_id=by_id, pages=pages or [])

    monkeypatch.setattr(svc, "_require_lobby", lambda lid: lobby)
    monkeypatch.setattr(roles, "require_view", lambda *a, **k: None)

    def _require_wiki(db_, lobby_, user):
        if user.id == lobby_.owner_id or user.id in wiki_users:
            return
        raise AppError("Нет прав править вики", code="lobby_wiki_required", status_code=403)

    monkeypatch.setattr(roles, "require_can_edit_wiki", _require_wiki)
    monkeypatch.setattr(
        roles,
        "can_edit_wiki",
        lambda db_, lobby_, user: user.id == lobby_.owner_id or user.id in wiki_users,
    )
    monkeypatch.setattr(
        roles,
        "can_see_hidden",
        lambda db_, lobby_, user: user.id == lobby_.owner_id or user.id in see_hidden,
    )
    monkeypatch.setattr(roles, "is_owner", lambda lobby_, user: user.id == lobby_.owner_id)
    monkeypatch.setattr(
        roles,
        "permission_flags",
        lambda db_, lobby_, user: {
            "is_owner": user.id == lobby_.owner_id,
            "is_comaster": user.id in wiki_users,
            "is_observer": False,
            "can_run_session": user.id == lobby_.owner_id,
            "can_see_hidden": user.id == lobby_.owner_id or user.id in see_hidden,
            "can_edit_wiki": user.id == lobby_.owner_id or user.id in wiki_users,
            "can_manage_journal": False,
            "can_edit_campaign_rules": user.id == lobby_.owner_id,
            "can_award": user.id == lobby_.owner_id,
            "can_delete_lobby": user.id == lobby_.owner_id,
            "can_change_roles": user.id == lobby_.owner_id,
            "can_transfer_lobby": user.id == lobby_.owner_id,
            "can_change_invite_code": user.id == lobby_.owner_id,
            "can_delete_session": user.id == lobby_.owner_id,
            "role": "owner" if user.id == lobby_.owner_id else "none",
        },
    )

    class _FakeMedia:
        def __init__(self, db):
            pass

        def usage(self, lobby_id):
            return SimpleNamespace(
                used_bytes=0,
                free_bytes=0,
                limit_bytes=0,
                used_mb=0,
                free_mb=0,
                limit_mb=0,
            )

    monkeypatch.setattr("app.services.media.LobbyMediaService", _FakeMedia)
    return svc


def test_mask_unrevealed_mentions():
    secret = _page(uuid4(), title="Секрет", revealed=False)
    open_p = _page(uuid4(), title="Порт", revealed=True)
    body = "Иду в [[Секрет]] и @Порт."
    masked = mask_unrevealed_mentions(body, [secret, open_p])
    assert "Секрет" not in masked
    assert "неизвестно" in masked
    assert "@Порт" in masked or "Порт" in masked


def test_second_active_setting_rejected(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    existing = _setting(lobby.id)
    lobby.settings = [existing]
    svc = _svc(lobby, monkeypatch, settings=[existing])
    with pytest.raises(AppError) as ei:
        svc.create_setting(owner, lobby.id, SettingCreateRequest(name="Второй"))
    assert ei.value.status_code == 400
    assert "уже есть сеттинг" in ei.value.message.lower() or "сеттинг" in ei.value.message.lower()


def test_choose_primary_403_for_player(monkeypatch):
    owner = _user("Мастер")
    player = _user("Игрок")
    lobby = _lobby(owner.id)
    a = _setting(lobby.id, name="A")
    b = _setting(lobby.id, name="B")
    lobby.settings = [a, b]
    svc = _svc(lobby, monkeypatch, settings=[a, b])
    with pytest.raises(AppError) as ei:
        svc.choose_primary_setting(player, lobby.id, a.id)
    assert ei.value.status_code == 403


def test_choose_primary_marks_extra(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    a = _setting(lobby.id, name="A")
    b = _setting(lobby.id, name="B")
    lobby.settings = [a, b]
    svc = _svc(lobby, monkeypatch, settings=[a, b])
    detail = svc.choose_primary_setting(owner, lobby.id, a.id)
    assert a.is_extra is False
    assert b.is_extra is True
    assert detail.settings_need_primary is False


def test_player_setting_hides_gm_body_and_masks_mentions(monkeypatch):
    owner = _user("Мастер")
    player = _user("Игрок")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    lobby.settings = [setting]
    secret = _page(setting.id, title="Тайна", revealed=False)
    visible = _page(
        setting.id,
        title="Город",
        body="См. [[Тайна]] и дальше",
        revealed=True,
        gm_body="секрет мастера",
        fields={"race": "человек", "secret": "x"},
    )
    svc = _svc(
        lobby,
        monkeypatch,
        settings=[setting],
        pages=[secret, visible],
    )
    detail = svc.get_setting(player, setting.id)
    assert detail.can_edit_wiki is False
    assert detail.can_see_hidden is False
    assert len(detail.pages) == 1
    page = detail.pages[0]
    assert page.gm_body == ""
    assert "Тайна" not in page.body
    assert "неизвестно" in page.body
    assert page.title == "Город"


def test_lead_today_sees_hidden_no_edit(monkeypatch):
    owner = _user("Мастер")
    lead = _user("Ведущий")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    lobby.settings = [setting]
    hidden = _page(setting.id, title="Секрет", revealed=False, gm_body="gm")
    svc = _svc(
        lobby,
        monkeypatch,
        settings=[setting],
        pages=[hidden],
        see_hidden={lead.id},
    )
    detail = svc.get_setting(lead, setting.id)
    assert detail.can_see_hidden is True
    assert detail.can_edit_wiki is False
    assert detail.is_owner is False
    assert any(p.title == "Секрет" for p in detail.pages)


def test_revealed_at_set_and_cleared(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    lobby.settings = [setting]
    page = _page(setting.id, title="НПС", revealed=False)
    svc = _svc(lobby, monkeypatch, settings=[setting], pages=[page])

    out = svc.update_setting_page(
        owner,
        page.id,
        SettingPageUpdateRequest(revealed=True),
    )
    assert page.revealed is True
    assert page.revealed_at is not None
    assert any(p.revealed_at is not None for p in out.pages)

    svc.update_setting_page(
        owner,
        page.id,
        SettingPageUpdateRequest(revealed=False),
    )
    assert page.revealed is False
    assert page.revealed_at is None


def test_page_create_blocked_on_extra(monkeypatch):
    from app.schemas.lobby import SettingPageCreateRequest

    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    primary = _setting(lobby.id, name="Основной")
    extra = _setting(lobby.id, name="Лишний", is_extra=True)
    lobby.settings = [primary, extra]
    svc = _svc(lobby, monkeypatch, settings=[primary, extra])
    with pytest.raises(AppError) as ei:
        svc.create_setting_page(
            owner,
            extra.id,
            SettingPageCreateRequest(title="Новая"),
        )
    assert ei.value.status_code == 400
