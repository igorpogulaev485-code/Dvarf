"""FIX-01: пост-релиз 2014 — вики-бои, флаги прав после save, оценка без N+1."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import MagicMock

from app.dnd import wiki_combat as wc
from app.schemas.lobby import SettingPageOut
from app.services import wiki_combat_ops as ops
from app.services.lobby import LobbyService


def test_list_wiki_combat_pages_includes_all_setting_combats():
    """«Бой из вики» — все страницы боя сеттинга, не только дети локации сессии."""
    now = datetime.now(timezone.utc)
    loc_a = SimpleNamespace(
        id=uuid4(),
        page_kind="location",
        title="Пещера",
        parent_id=None,
        deleted_at=None,
        updated_at=now,
    )
    loc_b = SimpleNamespace(
        id=uuid4(),
        page_kind="location",
        title="Башня",
        parent_id=None,
        deleted_at=None,
        updated_at=now,
    )
    combat_a = SimpleNamespace(
        id=uuid4(),
        page_kind="combat",
        title="Засада",
        parent_id=loc_a.id,
        deleted_at=None,
        updated_at=now,
    )
    combat_b = SimpleNamespace(
        id=uuid4(),
        page_kind="combat",
        title="Охрана",
        parent_id=loc_b.id,
        deleted_at=None,
        updated_at=now,
    )
    pages = ops.list_wiki_combat_pages_for_session(
        pages=[loc_a, loc_b, combat_a, combat_b],
        location_page_id=loc_a.id,
        involved_page_ids=[],
    )
    titles = {p.title for p in pages}
    assert titles == {"Засада", "Охрана"}
    assert {p.parent_title for p in pages} == {"Пещера", "Башня"}


def test_list_wiki_combat_skips_deleted():
    now = datetime.now(timezone.utc)
    loc = SimpleNamespace(
        id=uuid4(), page_kind="location", title="Лока", parent_id=None, deleted_at=None, updated_at=now
    )
    live = SimpleNamespace(
        id=uuid4(),
        page_kind="combat",
        title="Живой",
        parent_id=loc.id,
        deleted_at=None,
        updated_at=now,
    )
    gone = SimpleNamespace(
        id=uuid4(),
        page_kind="combat",
        title="В корзине",
        parent_id=loc.id,
        deleted_at=now,
        updated_at=now,
    )
    pages = ops.list_wiki_combat_pages_for_session(pages=[loc, live, gone])
    assert [p.title for p in pages] == ["Живой"]


def test_with_setting_rights_keeps_master_flags():
    owner = SimpleNamespace(id=uuid4())
    lobby = SimpleNamespace(id=uuid4(), owner_id=owner.id)
    setting = SimpleNamespace(
        id=uuid4(),
        lobby_id=lobby.id,
        name="Мир",
        world_notes="",
        is_extra=False,
        deleted_at=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    svc = LobbyService(MagicMock())
    svc.lobbies = MagicMock()
    svc.lobbies.list_setting_pages.return_value = []
    svc.lobbies.list_setting_page_links.return_value = []
    svc.lobbies.list_setting_page_templates.return_value = []
    svc.lobbies.list_setting_artifacts.return_value = []
    svc.lobbies.list_setting_artifact_sets = MagicMock(return_value=[])
    svc.catalog = MagicMock()
    svc.wiki = MagicMock(return_value=MagicMock(enrich_pages_with_media=lambda pages, **k: pages))

    bare = svc._setting_detail(setting, see_as_gm=True)
    assert bare.can_edit_wiki is False
    assert bare.is_owner is False

    with_flags = svc._setting_detail_for_editor(setting, user=owner, lobby=lobby)
    assert with_flags.is_owner is True
    assert with_flags.can_edit_wiki is True
    assert with_flags.can_see_hidden is True


def test_enrich_combat_pages_loads_bestiary_once():
    catalog = MagicMock()
    catalog.list_bestiary_for_generator.return_value = []
    pages = [
        SettingPageOut.model_validate(
            {
                "id": uuid4(),
                "setting_id": uuid4(),
                "title": f"Бой {i}",
                "body": "",
                "gm_body": "",
                "parent_id": None,
                "sort_order": i,
                "revealed": False,
                "page_kind": "combat",
                "fields": wc.empty_combat_fields(),
                "tags": [],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        )
        for i in range(3)
    ]
    out = ops.enrich_combat_pages_out(pages, catalog=catalog)
    assert len(out) == 3
    assert all(p.combat_estimate is not None for p in out)
    assert catalog.list_bestiary_for_generator.call_count == 1
