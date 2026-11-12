"""S-02: волны, инициатива, павшие, фильтр скрытого, права L-01."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.models.lobby import LOBBY_ROLE_OBSERVER
from app.services import session_combat as scmb
from app.services.lobby import LobbyService, _combat_out
from tests.test_l01_lobby_roles import RoleMemoryDB, _lobby, _role, _session, _user


def test_legacy_combat_becomes_one_released_wave():
    combatants = [
        {
            "id": "e1",
            "name": "Гоблин",
            "hp_current": 7,
            "hp_max": 7,
            "members": [{"id": "m1", "name": "Гоблин", "hp_current": 7, "hp_max": 7}],
            "alive_count": 1,
            "member_count": 1,
        }
    ]
    state = scmb.parse_combat_state(
        {"active": True, "round": 1, "active_index": 0, "entries": []},
        combatants=combatants,
    )
    assert len(state["waves"]) == 1
    assert state["waves"][0]["released"] is True
    assert state["waves"][0]["combatant_ids"] == ["e1"]
    assert combatants[0]["wave_id"] == state["waves"][0]["id"]


def test_hidden_waves_filtered_for_player():
    wid1, wid2 = str(uuid4()), str(uuid4())
    combatants = [
        {"id": "g1", "name": "Гоблин", "wave_id": wid1, "members": [], "alive_count": 1},
        {"id": "o1", "name": "Огр", "wave_id": wid2, "members": [], "alive_count": 1},
    ]
    state = {
        "active": True,
        "round": 1,
        "active_index": 0,
        "waiting_reaction": False,
        "entries": [
            {
                "id": "a",
                "kind": "enemy",
                "ref_id": "g1",
                "name": "Гоблин",
                "initiative": 12,
                "initiative_pending": False,
            },
            {
                "id": "b",
                "kind": "enemy",
                "ref_id": "o1",
                "name": "Огр",
                "initiative": 8,
                "initiative_pending": False,
            },
        ],
        "waves": [
            {
                "id": wid1,
                "index": 1,
                "released": True,
                "condition_text": None,
                "combatant_ids": ["g1"],
            },
            {
                "id": wid2,
                "index": 2,
                "released": False,
                "condition_text": "когда пал последний гоблин",
                "combatant_ids": ["o1"],
            },
        ],
        "fallen": [],
        "saved_waves": [],
    }
    filtered, visible = scmb.filter_combat_for_viewer(state, combatants, see_hidden=False)
    assert [c["id"] for c in visible] == ["g1"]
    assert all(e["ref_id"] != "o1" for e in filtered["entries"])
    assert all(w["released"] for w in filtered["waves"])
    master, master_vis = scmb.filter_combat_for_viewer(state, combatants, see_hidden=True)
    assert len(master_vis) == 2
    assert len(master["waves"]) == 2


def test_group_fallen_keeps_pack_in_order_until_all_down():
    state = {
        "active": True,
        "round": 1,
        "active_index": 0,
        "waiting_reaction": False,
        "entries": [
            {
                "id": "e",
                "kind": "enemy",
                "ref_id": "pack",
                "name": "Гоблины",
                "initiative": 10,
                "initiative_pending": False,
            }
        ],
        "waves": [],
        "fallen": [],
        "saved_waves": [],
    }
    combatants = [
        {
            "id": "pack",
            "name": "Гоблины",
            "members": [
                {"id": "m1", "name": "Гоблин 1", "hp_current": 0, "hp_max": 7},
                {"id": "m2", "name": "Гоблин 2", "hp_current": 5, "hp_max": 7},
                {"id": "m3", "name": "Гоблин 3", "hp_current": 7, "hp_max": 7},
                {"id": "m4", "name": "Гоблин 4", "hp_current": 7, "hp_max": 7},
            ],
            "alive_count": 3,
            "member_count": 4,
        }
    ]
    state, _ = scmb.sync_fallen_from_combatants(state, combatants)
    assert len(state["fallen"]) == 1
    assert len(state["entries"]) == 1
    enriched = scmb.enrich_enemy_entry(state["entries"][0], combatants[0])
    assert "×3" in enriched["name"]

    for m in combatants[0]["members"]:
        m["hp_current"] = 0
    combatants[0]["alive_count"] = 0
    state, _ = scmb.sync_fallen_from_combatants(state, combatants)
    assert state["entries"] == []
    assert len(state["fallen"]) == 4


def test_restore_fallen_default_hp_one():
    state = {
        "active": True,
        "round": 2,
        "active_index": 0,
        "waiting_reaction": False,
        "entries": [],
        "waves": [],
        "fallen": [
            {
                "id": "f1",
                "combatant_id": "pack",
                "member_id": "m1",
                "name": "Гоблин 1",
                "hp_max": 7,
            }
        ],
        "saved_waves": [],
    }
    combatants = [
        {
            "id": "pack",
            "name": "Гоблины",
            "dex_mod": 2,
            "members": [
                {"id": "m1", "name": "Гоблин 1", "hp_current": 0, "hp_max": 7},
            ],
            "alive_count": 0,
            "member_count": 1,
        }
    ]
    state, combatants = scmb.restore_fallen(state, combatants, "f1", hp=None)
    assert state["fallen"] == []
    assert combatants[0]["members"][0]["hp_current"] == 1
    assert any(e.get("ref_id") == "pack" for e in state["entries"])


def test_insert_defers_when_slot_passed():
    state = {
        "active": True,
        "round": 1,
        "active_index": 1,
        "waiting_reaction": False,
        "entries": [
            {
                "id": "a",
                "kind": "pc",
                "ref_id": "p1",
                "name": "А",
                "initiative": 20,
                "initiative_pending": False,
            },
            {
                "id": "b",
                "kind": "pc",
                "ref_id": "p2",
                "name": "Б",
                "initiative": 10,
                "initiative_pending": False,
            },
        ],
        "waves": [],
        "fallen": [],
        "saved_waves": [],
    }
    # текущий ход — Б (init 10). Огр с 15 встаёт «выше» — слот уже прошёл.
    state = scmb.insert_entry(
        state,
        {
            "id": "c",
            "kind": "enemy",
            "ref_id": "ogr",
            "name": "Огр",
            "initiative": 15,
            "initiative_pending": False,
            "dex_mod": 0,
        },
        respect_current_turn=True,
    )
    ogr = next(e for e in state["entries"] if e["id"] == "c")
    assert ogr["defer_to_next_round"] is True
    assert state["entries"][state["active_index"]]["id"] == "b"


def test_observer_cannot_roll_initiative(monkeypatch):
    import asyncio

    owner = _user()
    observer = _user()
    lobby = _lobby(owner.id)
    session = _session(lobby.id)
    session.closed_at = None
    session.combat = {
        "active": True,
        "round": 1,
        "active_index": 0,
        "entries": [
            {
                "id": "e1",
                "kind": "pc",
                "ref_id": str(uuid4()),
                "name": "Герой",
                "initiative": None,
                "initiative_pending": True,
            }
        ],
        "waves": [],
        "fallen": [],
    }
    session.combatants = []
    session.lobby = lobby
    db = RoleMemoryDB([_role(lobby.id, observer.id, LOBBY_ROLE_OBSERVER)])

    svc = LobbyService(MagicMock())
    svc.db = db
    svc.lobbies = MagicMock()
    svc.lobbies.get_session.return_value = session
    svc.characters = MagicMock()

    from app.schemas.lobby import CombatInitiativeRequest

    with pytest.raises(AppError) as exc:
        asyncio.run(
            svc.roll_combat_initiative(
                observer,
                session.id,
                CombatInitiativeRequest(entry_id="e1", mode="manual", value=12),
            )
        )
    assert exc.value.status_code == 403


def test_combat_out_hides_fallen_from_player():
    wid = str(uuid4())
    raw = {
        "active": True,
        "round": 1,
        "active_index": 0,
        "entries": [
            {
                "id": "a",
                "kind": "enemy",
                "ref_id": "g1",
                "name": "Гоблин",
                "initiative": 10,
            }
        ],
        "waves": [
            {
                "id": wid,
                "index": 1,
                "released": True,
                "condition_text": None,
                "combatant_ids": ["g1"],
            }
        ],
        "fallen": [
            {
                "id": "f1",
                "combatant_id": "g1",
                "member_id": "m1",
                "name": "Гоблин",
                "hp_max": 7,
            }
        ],
    }
    combatants = [
        {
            "id": "g1",
            "name": "Гоблин",
            "wave_id": wid,
            "hp_current": 0,
            "hp_max": 7,
            "members": [{"id": "m1", "name": "Гоблин", "hp_current": 0, "hp_max": 7}],
            "alive_count": 0,
            "member_count": 1,
        }
    ]
    player_view = _combat_out(raw, combatants=combatants, see_hidden=False)
    assert player_view.fallen == []
    master_view = _combat_out(raw, combatants=combatants, see_hidden=True)
    assert len(master_view.fallen) == 1


def test_alembic_head_unchanged_no_migration():
    """S-02 не добавляет миграцию: ровно одна голова, s01droptpl9c2a в её предках."""
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "s01droptpl9c2a" in ancestor_ids
