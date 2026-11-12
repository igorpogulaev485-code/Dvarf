"""W-02: корзина, версии, mentions resolve, copy access, conflict."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError, ConflictError
from app.schemas.lobby import SettingPageUpdateRequest
from app.services import lobby_roles as roles
from app.services import wiki_presence
from app.services.wiki_copy_access import (
    can_copy_wiki_from_lobby,
    require_can_copy_wiki_from_lobby,
)
from tests.test_w01_wiki_setting import FakeDB, _lobby, _page, _setting, _svc, _user


def test_delete_page_goes_to_trash(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    lobby.settings = [setting]
    root = _page(setting.id, title="Мир")
    child = _page(setting.id, title="НПС")
    child.parent_id = root.id
    svc = _svc(lobby, monkeypatch, settings=[setting], pages=[root, child])

    out = svc.delete_setting_page(owner, child.id)
    assert child.deleted_at is not None
    assert all(p.id != child.id for p in out.pages)


def test_delete_setting_soft(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    lobby.settings = [setting]
    svc = _svc(lobby, monkeypatch, settings=[setting])
    svc.delete_setting(owner, setting.id)
    assert setting.deleted_at is not None
    assert setting.is_extra is True


def test_player_cannot_trash_page(monkeypatch):
    owner = _user("Мастер")
    player = _user("Игрок")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    lobby.settings = [setting]
    a = _page(setting.id, title="A")
    b = _page(setting.id, title="B")
    svc = _svc(lobby, monkeypatch, settings=[setting], pages=[a, b])
    with pytest.raises(AppError) as ei:
        svc.delete_setting_page(player, b.id)
    assert ei.value.status_code == 403


def test_create_missing_mentions_ignored(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    lobby.settings = [setting]
    page = _page(setting.id, title="Город", body="")
    created = []

    svc = _svc(lobby, monkeypatch, settings=[setting], pages=[page])

    def _create(**kwargs):
        created.append(kwargs)
        p = _page(setting.id, title=kwargs["title"])
        svc.lobbies.pages.append(p)
        return p

    svc.lobbies.create_setting_page = _create  # type: ignore[method-assign]
    svc.update_setting_page(
        owner,
        page.id,
        SettingPageUpdateRequest(body="См. @Новый_Герой", create_missing_mentions=True),
    )
    assert created == []
    assert page.body == "См. @Новый_Герой"


def test_conflict_409(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    lobby.settings = [setting]
    page = _page(setting.id, title="X", body="v1")
    page.updated_at = datetime.now(timezone.utc)
    known = page.updated_at - timedelta(seconds=5)
    svc = _svc(lobby, monkeypatch, settings=[setting], pages=[page])
    with pytest.raises(ConflictError) as ei:
        svc.update_setting_page(
            owner,
            page.id,
            SettingPageUpdateRequest(body="v2", expected_updated_at=known),
        )
    assert ei.value.code == "setting_page_conflict"


def test_force_overwrite_skips_conflict(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    lobby.settings = [setting]
    page = _page(setting.id, title="X", body="v1")
    page.updated_at = datetime.now(timezone.utc)
    known = page.updated_at - timedelta(seconds=5)
    svc = _svc(lobby, monkeypatch, settings=[setting], pages=[page])
    out = svc.update_setting_page(
        owner,
        page.id,
        SettingPageUpdateRequest(
            body="v2",
            expected_updated_at=known,
            force_overwrite=True,
        ),
    )
    assert page.body == "v2"
    assert any(p.body == "v2" for p in out.pages)


def test_mention_resolve_similar(monkeypatch):
    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    lobby.settings = [setting]
    a = _page(setting.id, title="Капитан Вера")
    b = _page(setting.id, title="Капитан Иван")
    svc = _svc(lobby, monkeypatch, settings=[setting], pages=[a, b])
    out = svc.wiki().resolve_mention(owner, setting.id, "Капитан")
    assert out.exact_page_id is None
    assert len(out.similar) >= 1
    assert {s.title for s in out.similar} >= {"Капитан Вера", "Капитан Иван"}


def test_copy_access_helper_uses_can_edit_wiki(monkeypatch):
    owner = _user("Мастер")
    stranger = _user("Чужой")
    lobby = _lobby(owner.id)
    db = FakeDB()
    monkeypatch.setattr(
        roles,
        "can_edit_wiki",
        lambda db_, lobby_, user: user.id == lobby_.owner_id,
    )
    assert can_copy_wiki_from_lobby(db, lobby, owner) is True
    assert can_copy_wiki_from_lobby(db, lobby, stranger) is False
    with pytest.raises(AppError) as ei:
        require_can_copy_wiki_from_lobby(db, lobby, stranger)
    assert ei.value.status_code == 403
    assert ei.value.code == "wiki_copy_source_forbidden"


def test_wiki_presence_touch_and_stale():
    lobby_id = uuid4()
    page_id = uuid4()
    user_id = uuid4()
    wiki_presence.touch(
        lobby_id=lobby_id,
        page_id=page_id,
        user_id=user_id,
        display_name="Мастер",
    )
    rows = wiki_presence.editors_for_page(lobby_id=lobby_id, page_id=page_id)
    assert len(rows) == 1
    assert rows[0].display_name == "Мастер"
    wiki_presence.clear(lobby_id=lobby_id, page_id=page_id, user_id=user_id)
    assert wiki_presence.editors_for_page(lobby_id=lobby_id, page_id=page_id) == []


def test_version_trim_keeps_20(monkeypatch):
    from app.models.setting_page_version import SettingPageVersion
    from app.services.wiki import VERSION_LIMIT, WikiService

    owner = _user("Мастер")
    lobby = _lobby(owner.id)
    setting = _setting(lobby.id)
    lobby.settings = [setting]
    page = _page(setting.id, title="X", body="0")
    svc = _svc(lobby, monkeypatch, settings=[setting], pages=[page])
    wiki = WikiService(svc.db, svc)

    # Записываем VERSION_LIMIT+3 версий через record_version
    stored: list = []

    def _add(obj):
        stored.append(obj)
        svc.db.added.append(obj)

    def _scalars(stmt):  # noqa: ANN001
        sql = str(stmt).lower()
        if "lobby_media" in sql:
            return SimpleNamespace(all=lambda: [])
        page_rows = [r for r in stored if isinstance(r, SettingPageVersion)]
        page_rows.sort(key=lambda r: r.created_at, reverse=True)
        return SimpleNamespace(all=lambda: list(page_rows))

    svc.db.add = _add  # type: ignore[method-assign]
    svc.db.scalars = _scalars  # type: ignore[method-assign]
    svc.db.delete = lambda obj: stored.remove(obj) if obj in stored else None  # type: ignore[method-assign]
    monkeypatch.setattr(wiki, "_media_for_page", lambda *a, **k: [])

    for i in range(VERSION_LIMIT + 3):
        page.body = f"v{i}"
        wiki.record_version(page=page, lobby_id=lobby.id, user=owner)

    assert len([r for r in stored if isinstance(r, SettingPageVersion)]) == VERSION_LIMIT
