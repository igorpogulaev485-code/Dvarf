"""S-06: остаток XP, вехи, сундук, права на добычу, без хардкода головы Alembic."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.dnd.loot_tables import generate_loot, tier_from_level
from app.services import session_combat as scmb
from app.services import session_rewards as rewards
from app.services.campaign_rules import normalize_campaign_rules


def test_split_xp_keeps_remainder():
    each, rem = rewards.split_xp(100, 3)
    assert each == 33
    assert rem == 1
    assert each * 3 + rem == 100


def test_fled_and_surrendered_count_for_xp():
    combatants = [
        {
            "id": "g1",
            "name": "Гоблин",
            "xp": 50,
            "hp_current": 0,
            "members": [{"id": "m1", "name": "Гоблин", "hp_current": 0, "hp_max": 7}],
            "xp_claimed_count": 0,
        },
        {
            "id": "o1",
            "name": "Огр",
            "xp": 450,
            "hp_current": 20,
            "outcome": "fled",
            "members": [
                {"id": "m2", "name": "Огр", "hp_current": 20, "hp_max": 59, "outcome": "fled"}
            ],
            "xp_claimed_count": 0,
        },
        {
            "id": "b1",
            "name": "Бандит",
            "xp": 100,
            "hp_current": 11,
            "outcome": "surrendered",
            "members": [
                {
                    "id": "m3",
                    "name": "Бандит",
                    "hp_current": 11,
                    "hp_max": 11,
                    "outcome": "surrendered",
                }
            ],
            "xp_claimed_count": 0,
        },
    ]
    pool = rewards.compute_xp_pool(combatants)
    assert pool["pool"] == 50 + 450 + 100
    assert len(pool["defeats"]) == 3


def test_milestones_mode_from_campaign_rules():
    rules = normalize_campaign_rules({"progression": {"mode": "milestones"}})
    assert rewards.progression_mode(rules) == "milestones"
    sheet, new_level = rewards.bump_character_level(
        {"identity": {"level": 3, "experience": 900}}, delta=1
    )
    assert new_level == 4
    assert sheet["identity"]["experience"] == 900  # CR sum not written


def test_xp_remainder_persists_in_campaign_rules():
    rules = normalize_campaign_rules({"progression": {"mode": "xp", "xp_remainder": 2}})
    assert rewards.get_xp_remainder(rules) == 2
    updated = rewards.set_xp_remainder(rules, 5)
    assert rewards.get_xp_remainder(updated) == 5
    again = normalize_campaign_rules(updated)
    assert again["progression"]["xp_remainder"] == 5


def test_pending_rewards_exclude_dead_absent_traitor():
    cid_alive = uuid4()
    cid_dead = uuid4()
    cid_absent = uuid4()
    cid_traitor = uuid4()
    seats = [
        SimpleNamespace(
            character_id=cid_alive,
            character_level=5,
            hp_current=20,
            death_fails=0,
            is_dying=False,
            conditions=[],
        ),
        SimpleNamespace(
            character_id=cid_dead,
            character_level=5,
            hp_current=0,
            death_fails=3,
            is_dying=False,
            conditions=[{"name": "мертв"}],
        ),
        SimpleNamespace(
            character_id=cid_absent,
            character_level=4,
            hp_current=15,
            death_fails=0,
            is_dying=False,
            conditions=[],
        ),
        SimpleNamespace(
            character_id=cid_traitor,
            character_level=5,
            hp_current=18,
            death_fails=0,
            is_dying=False,
            conditions=[],
        ),
    ]
    combatants = [
        {
            "id": "g1",
            "name": "Гоблин",
            "xp": 50,
            "hp_current": 0,
            "type_ru": "гуманоид",
            "members": [{"id": "m1", "name": "Гоблин", "hp_current": 0, "hp_max": 7}],
            "xp_claimed_count": 0,
        }
    ]
    state = {
        "entries": [
            {"kind": "pc", "ref_id": str(cid_alive), "side": "party"},
            {"kind": "pc", "ref_id": str(cid_dead), "side": "party"},
            {"kind": "pc", "ref_id": str(cid_traitor), "side": "enemies"},
            {"kind": "enemy", "ref_id": "g1", "side": "enemies"},
        ]
    }
    pending = rewards.build_pending_rewards(
        combatants=combatants, combat_state=state, seats=seats
    )
    assert pending["xp_pool"] == 50
    excluded = set(pending["default_excluded_ids"])
    assert str(cid_dead) in excluded
    assert str(cid_absent) in excluded
    assert str(cid_traitor) in excluded
    assert str(cid_alive) not in excluded


def test_empty_combat_keeps_pending_and_chest():
    pending = {"xp_pool": 150, "defeats": [], "claim_combatant_ids": []}
    chest = rewards.empty_loot_chest()
    chest["items"] = [
        rewards.normalize_loot_item({"id": "i1", "name": "Зелье лечения", "qty": 2})
    ]
    state = scmb.empty_combat(pending_rewards=pending, loot_chest=chest)
    dumped = scmb.dump_combat_state(state)
    parsed = scmb.parse_combat_state(dumped, combatants=[])
    assert parsed["pending_rewards"]["xp_pool"] == 150
    assert parsed["loot_chest"]["items"][0]["name"] == "Зелье лечения"


def test_legend_quick_add_does_not_autoroll():
    out = generate_loot(party_level=17, kind="legend", seed=1)
    assert out["items"] == []
    assert any("вручную" in n for n in out["meta"]["notes"])


def test_hoard_tier_by_party_level():
    assert tier_from_level(8) == "5-10"
    out = generate_loot(party_level=8, difficulty="medium", seed=7)
    assert out["meta"]["tier"] == "5-10"
    assert "hoard:5-10" in out["meta"]["tables"]


def test_fill_loot_chest_contract_for_g01():
    chest, meta = rewards.fill_loot_chest(
        None, party_level=8, difficulty="deadly", replace=True, seed=3
    )
    assert isinstance(chest["items"], list)
    assert isinstance(chest["coins"], dict)
    assert meta["tier"] == "5-10"


def test_observer_cannot_claim_helper_via_roles():
    """Права: наблюдатель не забирает — require_can_act + is_observer (см. loot_chest)."""
    from app.models.lobby import LOBBY_ROLE_OBSERVER
    from app.services import lobby_roles as roles
    from tests.test_l01_lobby_roles import RoleMemoryDB, _lobby, _role, _session, _user

    owner = _user()
    observer = _user()
    lobby = _lobby(owner.id)
    session = _session(lobby.id)
    db = RoleMemoryDB(role_rows=[_role(lobby.id, observer.id, LOBBY_ROLE_OBSERVER)])
    assert roles.can_act_on_board(db, lobby, observer) is False
    assert roles.can_award(db, lobby, observer, session) is False


def test_player_cannot_award_foreign_loot():
    from app.services import lobby_roles as roles
    from tests.test_l01_lobby_roles import RoleMemoryDB, _lobby, _session, _user

    owner = _user()
    player = _user()
    lobby = _lobby(owner.id)
    session = _session(lobby.id)
    db = RoleMemoryDB()
    assert roles.can_award(db, lobby, player, session) is False


def test_alembic_single_head_no_migration_hardcoded():
    """S-06 по умолчанию без миграции: ровно одна голова, l08rules9f2a1 в предках."""
    from pathlib import Path

    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "l08rules9f2a1" in ancestor_ids


def test_split_coins_leaves_remainder_in_chest():
    each, rem = rewards.split_coins_evenly({"gp": 100, "sp": 0, "cp": 0, "ep": 0, "pp": 0}, 3)
    assert each["gp"] == 33
    assert rem["gp"] == 1
