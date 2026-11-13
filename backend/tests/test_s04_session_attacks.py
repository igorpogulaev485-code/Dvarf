"""S-04: разбор действий, лента, цели, кубики на столе, права, alembic без новой миграции."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.services import session_combat as scmb
from app.services import session_table_s04 as s04
from app.services.lobby import _action_blocks, _combat_out
from tests.test_l01_lobby_roles import RoleMemoryDB, _lobby, _role, _session, _user


def test_parse_ogre_club_action_from_text():
    stats = s04.parse_action_stats(
        {
            "name_ru": "Дубина",
            "text_ru": (
                "Рукопашная атака оружием: +6 к попаданию, досягаемость 5 фт., одна цель. "
                "Попадание: 13 (2к8 + 4) дробящего урона."
            ),
        }
    )
    assert stats["attack_bonus"] == 6
    assert stats["damage_dice"] in {"2к8+4", "2к8 + 4", "2к8+4"}
    assert stats["damage_type"] == "bludgeoning"
    assert stats["kind"] == "attack"


def test_enrich_action_keeps_structured_fields():
    rows = _action_blocks(
        [
            {
                "name_ru": "Укус",
                "text_ru": "",
                "attack_bonus": 5,
                "damage_dice": "1к8+3",
                "damage_type": "piercing",
            }
        ]
    )
    assert rows[0]["attack_bonus"] == 5
    assert rows[0]["damage_dice"] == "1к8+3"
    assert rows[0]["damage_type"] == "piercing"


def test_format_feed_line_table_hit():
    line = s04.format_feed_line(
        actor="Огр",
        target="Торин",
        action_name="Дубина",
        outcome="попал",
        damage=13,
        damage_type="bludgeoning",
        physical=True,
    )
    assert "Огр → Торин" in line
    assert "попал" in line
    assert "🎲" in line
    assert "13" in line
    assert "дробящего" in line


def test_dice_on_table_roundtrips_in_combat_json():
    state = scmb.parse_combat_state({"active": False, "dice_on_table": True})
    assert state["dice_on_table"] is True
    dumped = scmb.dump_combat_state(state)
    assert dumped["dice_on_table"] is True
    again = scmb.parse_combat_state(dumped)
    assert again["dice_on_table"] is True


def test_build_combat_targets_party_and_enemies():
    seats = [
        {
            "character_id": str(uuid4()),
            "character_name": "Торин",
            "hp_current": 20,
            "hp_max": 30,
            "ac": 16,
            "conditions": [],
            "companions": [],
            "user_id": uuid4(),
        }
    ]
    combatants = [
        {
            "id": "e1",
            "name": "Гоблин",
            "ac": 15,
            "members": [
                {"id": "m1", "name": "Гоблин 1", "hp_current": 7, "hp_max": 7},
                {"id": "m2", "name": "Гоблин 2", "hp_current": 0, "hp_max": 7},
            ],
            "conditions": [],
        }
    ]
    state = scmb.parse_combat_state(
        {
            "active": True,
            "entries": [],
            "waves": [
                {
                    "id": "w1",
                    "index": 1,
                    "released": True,
                    "combatant_ids": ["e1"],
                }
            ],
        },
        combatants=combatants,
    )
    targets = s04.build_combat_targets(
        seats=seats,
        combatants=combatants,
        combat_state=state,
        see_hidden=True,
    )
    kinds = {t["kind"] for t in targets}
    assert "pc" in kinds
    assert "enemy" in kinds
    enemy_names = [t["name"] for t in targets if t["kind"] == "enemy"]
    assert "Гоблин 1" in enemy_names
    assert "Гоблин 2" not in enemy_names  # мёртвый не в целях


def test_filter_events_combat_vs_rolls():
    combat_ev = SimpleNamespace(
        event_type="combat",
        payload={"combat_journal": True},
    )
    roll_ev = SimpleNamespace(event_type="roll", payload={})
    sheet_ev = SimpleNamespace(
        event_type="roll",
        payload={"category": "sheet"},
    )
    events = [combat_ev, roll_ev, sheet_ev]
    combat_only = s04.filter_events_by_feed(events, feed_filter="combat")
    assert combat_ev in combat_only
    assert roll_ev not in combat_only
    rolls = s04.filter_events_by_feed(events, feed_filter="rolls")
    assert roll_ev in rolls
    assert sheet_ev in rolls


def test_observer_cannot_run_attack():
    """Атаку врага ведёт can_run_session — наблюдатель получает 403."""
    from app.models.lobby import LOBBY_ROLE_OBSERVER
    from app.services import lobby_roles as roles

    db = RoleMemoryDB()
    owner = _user("owner")
    observer = _user("obs")
    lobby = _lobby(owner.id)
    session = _session(lobby)
    db.roles = [_role(lobby.id, observer.id, LOBBY_ROLE_OBSERVER)]

    with pytest.raises(AppError) as ei:
        roles.require_can_run_session(db, lobby, observer, session)
    assert ei.value.status_code == 403
    assert roles.can_run_session(db, lobby, owner, session)


def test_homebrew_flags_hooks():
    rules = {
        "homebrew": {
            "fumble_on_1": True,
            "flanking_advantage": True,
            "reroll_initiative_each_round": True,
            "group_initiative": True,
            "gunpowder_exploding": True,
            "potion_bonus_self": True,
            "gritty_rest": True,
            "hidden_death_saves": True,
        }
    }
    assert s04.fumble_on_natural_1(rules)
    assert s04.flanking_gives_advantage(rules)
    assert s04.should_reroll_initiative(rules)
    assert s04.group_initiative_enabled(rules)
    assert s04.potion_bonus_self_enabled(rules)
    assert s04.gritty_rest_enabled(rules)


def test_alembic_head_unchanged_no_migration():
    """S-04 без новой колонки: ровно одна голова, l08rules9f2a1 в предках."""
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
    assert "l08rules9f2a1" in ancestor_ids


def test_combat_out_exposes_dice_on_table():
    out = _combat_out(
        {
            "active": True,
            "round": 1,
            "active_index": 0,
            "waiting_reaction": True,
            "dice_on_table": True,
            "reaction_character_id": "abc",
            "reaction_hint": "Есть ли реакция?",
            "entries": [
                {
                    "id": "e1",
                    "kind": "pc",
                    "ref_id": str(uuid4()),
                    "name": "Торин",
                    "initiative": 12,
                }
            ],
            "waves": [],
            "fallen": [],
            "saved_waves": [],
        },
        combatants=[],
        see_hidden=True,
    )
    assert out.dice_on_table is True
    assert out.waiting_reaction is True
    assert out.reaction_character_id == "abc"
