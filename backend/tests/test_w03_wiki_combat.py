"""W-03: страница «Бой», скрытие от игроков, from-wiki, save_to_wiki, лут."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import MagicMock

import pytest

from app.core.exceptions import AppError
from app.dnd import wiki_combat as wc
from app.schemas.lobby import (
    CombatFromWikiRequest,
    EncounterGenerateRequest,
    EncounterWikiPickIn,
    SettingPageCreateRequest,
    SettingPageUpdateRequest,
)
from app.services.lobby import LobbyService


def test_normalize_combat_fields_waves_and_loot():
    raw = {
        "waves": [
            {
                "index": 2,
                "condition_text": "когда пала предыдущая",
                "combatants": [{"slug": "hobgoblin", "count": 1, "xp": 100}],
            },
            {
                "index": 1,
                "combatants": [{"slug": "goblin", "name": "Гоблин", "count": 4, "xp": 50}],
            },
        ],
        "loot": {"items": [{"name": "Зелье", "qty": 2}], "coins": {"gp": 10}},
        "party_levels": [3, 3],
    }
    out = wc.normalize_combat_fields(raw)
    assert [w["index"] for w in out["waves"]] == [1, 2]
    assert out["waves"][0]["combatants"][0]["count"] == 4
    assert out["loot"]["coins"]["gp"] == 10
    assert out["loot"]["items"][0]["name"] == "Зелье"


def test_estimate_dmg_without_party_power():
    fields = {
        "waves": [
            {
                "index": 1,
                "combatants": [{"slug": "goblin", "count": 4, "xp": 50}],
            }
        ],
        "party_levels": [3, 3, 3, 3],
    }
    est = wc.estimate_combat_dmg(fields)
    assert est["xp_raw"] == 200
    assert est["xp_adjusted"] == 400  # ×2 за 4 монстра
    assert est["thresholds"] is not None
    assert est["band"] == "medium"
    assert "party_power" not in est


def test_estimate_without_levels_has_note():
    est = wc.estimate_combat_dmg(
        {"waves": [{"index": 1, "combatants": [{"slug": "orc", "count": 1, "xp": 100}]}]}
    )
    assert est["thresholds"] is None
    assert est["note"]


def _svc_with_setting(*, see_hidden_pages=None):
    now = datetime.now(timezone.utc)
    setting_id = uuid4()
    lobby_id = uuid4()
    location = SimpleNamespace(
        id=uuid4(),
        setting_id=setting_id,
        page_kind="location",
        title="Пещера",
        parent_id=None,
        deleted_at=None,
        revealed=True,
        revealed_at=None,
        fields={},
        template_id=None,
        body="",
        gm_body="",
        sort_order=0,
        quest_status=None,
        tags=[],
        created_at=now,
        updated_at=now,
    )
    combat = SimpleNamespace(
        id=uuid4(),
        setting_id=setting_id,
        page_kind="combat",
        title="Засада",
        parent_id=location.id,
        deleted_at=None,
        revealed=True,  # даже так — игроку не отдаём
        revealed_at=None,
        fields=wc.empty_combat_fields(),
        template_id=None,
        body="",
        gm_body="",
        sort_order=1,
        quest_status=None,
        tags=[],
        created_at=now,
        updated_at=now,
    )
    setting = SimpleNamespace(
        id=setting_id,
        lobby_id=lobby_id,
        name="Мир",
        world_notes="",
        is_extra=False,
        deleted_at=None,
        created_at=now,
        updated_at=now,
    )
    svc = LobbyService(MagicMock())
    svc.lobbies = MagicMock()
    svc.lobbies.list_setting_pages.return_value = [location, combat]
    svc.lobbies.list_setting_page_links.return_value = []
    svc.lobbies.list_setting_page_templates.return_value = []
    svc.lobbies.list_setting_artifacts.return_value = []
    svc.catalog = MagicMock()
    svc.catalog.list_bestiary_for_generator.return_value = []
    svc.wiki = MagicMock(return_value=MagicMock(enrich_pages_with_media=lambda pages, **k: pages))
    return svc, setting, location, combat


def test_setting_detail_hides_combat_from_player():
    svc, setting, _loc, combat = _svc_with_setting()
    detail = svc._setting_detail(setting, see_as_gm=False)
    assert all(p.page_kind != "combat" for p in detail.pages)
    assert combat.id not in {p.id for p in detail.pages}


def test_setting_detail_gm_sees_combat_estimate():
    svc, setting, _loc, combat = _svc_with_setting()
    combat.fields = {
        "waves": [{"index": 1, "combatants": [{"slug": "goblin", "count": 2, "xp": 50}]}],
        "party_levels": [2, 2],
        "loot": {"items": [], "coins": {}},
    }
    detail = svc._setting_detail(setting, see_as_gm=True)
    combat_pages = [p for p in detail.pages if p.page_kind == "combat"]
    assert len(combat_pages) == 1
    assert combat_pages[0].combat_estimate is not None
    assert combat_pages[0].combat_estimate.xp_raw == 100


def test_apply_revealed_ignores_combat():
    svc, setting, _loc, combat = _svc_with_setting()
    combat.revealed = False
    svc._apply_revealed(combat, revealed=True, setting_id=setting.id, reveal_subtree=False)
    assert combat.revealed is False
    assert combat.revealed_at is None


def test_create_combat_requires_location_or_quest_parent():
    setting_id = uuid4()
    lobby = SimpleNamespace(id=uuid4(), owner_id=uuid4())
    setting = SimpleNamespace(id=setting_id, lobby_id=lobby.id, is_extra=False, deleted_at=None)
    note = SimpleNamespace(id=uuid4(), setting_id=setting_id, page_kind="note")
    user = SimpleNamespace(id=uuid4())

    svc = LobbyService(MagicMock())
    svc.lobbies = MagicMock()
    svc.lobbies.get_setting.return_value = setting
    svc._require_lobby = MagicMock(return_value=lobby)
    svc._require_wiki = MagicMock()
    svc._require_setting_writable = MagicMock()
    svc.lobbies.get_setting_page.return_value = note
    svc.lobbies.list_setting_pages.return_value = [note]
    svc._ensure_combat_system_template = MagicMock(
        return_value=SimpleNamespace(id=uuid4(), schema=[])
    )
    svc._resolve_page_template = MagicMock(
        return_value=SimpleNamespace(id=uuid4(), schema=[], body_seed="")
    )

    with pytest.raises(AppError) as exc:
        svc.create_setting_page(
            user,
            setting_id,
            SettingPageCreateRequest(
                title="Бой",
                page_kind="combat",
                parent_id=note.id,
            ),
        )
    assert exc.value.code == "combat_parent_bad"


def test_combat_from_wiki_refuses_when_active():
    import asyncio

    session_id = uuid4()
    user = SimpleNamespace(id=uuid4())
    lobby = SimpleNamespace(id=uuid4())
    session = SimpleNamespace(
        id=session_id,
        closed_at=None,
        combat={
            "active": True,
            "entries": [
                {
                    "id": "e1",
                    "kind": "pc",
                    "ref_id": str(uuid4()),
                    "name": "Герой",
                    "initiative": 10,
                    "initiative_pending": False,
                }
            ],
            "waves": [
                {
                    "id": "w1",
                    "index": 1,
                    "released": True,
                    "combatant_ids": [],
                }
            ],
        },
        combatants=[],
        setting_id=uuid4(),
    )
    svc = LobbyService(MagicMock())
    svc._require_session_owner = MagicMock(return_value=(session, lobby))

    with pytest.raises(AppError) as exc:
        asyncio.run(
            svc.combat_from_wiki(
                user, session_id, CombatFromWikiRequest(page_id=uuid4())
            )
        )
    assert exc.value.code == "combat_already_active"


def test_generate_save_to_wiki_requires_can_edit_wiki(monkeypatch):
    session_id = uuid4()
    user = SimpleNamespace(id=uuid4())
    lobby = SimpleNamespace(id=uuid4(), campaign_rules={})
    session = SimpleNamespace(
        id=session_id,
        lobby=lobby,
        closed_at=None,
        seats=[],
        setting_id=uuid4(),
        combatants=[],
        combat={},
    )
    svc = LobbyService(MagicMock())
    svc._require_session_owner = MagicMock(return_value=(session, lobby))
    monkeypatch.setattr(
        "app.services.lobby_roles.can_edit_wiki",
        lambda *a, **k: False,
    )
    with pytest.raises(AppError) as exc:
        svc.generate_encounter(
            user,
            session_id,
            EncounterGenerateRequest(
                theme_ids=["orc"],
                save_to_wiki=True,
                parent_page_id=str(uuid4()),
                wiki_picks=[
                    EncounterWikiPickIn(wave_index=1, pack_slug="orc", pack_count=2)
                ],
            ),
        )
    assert exc.value.status_code == 403
    assert exc.value.code == "wiki_forbidden"


def test_loot_prep_to_chest_not_on_table():
    chest = wc.loot_prep_to_chest(
        {"items": [{"name": "Кинжал", "qty": 1}], "coins": {"gp": 5}}
    )
    assert chest["on_table"] is False
    assert chest["coins"]["gp"] == 5
    assert chest["items"][0]["name"] == "Кинжал"
