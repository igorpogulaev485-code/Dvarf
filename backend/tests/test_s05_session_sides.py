"""S-05: стороны в бою — свои, скрытие, права, конец боя, alembic без миграции."""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.services import session_combat as scmb
from app.services import session_sides as sides
from app.services import session_table_s04 as s04
from app.services.lobby import _combat_out
from tests.test_l01_lobby_roles import RoleMemoryDB, _lobby, _role, _session, _user


def test_default_sides_legacy_entries():
    entry_pc = {"kind": "pc", "ref_id": "a", "name": "Торин"}
    entry_enemy = {"kind": "enemy", "ref_id": "e", "name": "Гоблин"}
    assert sides.true_side(entry_pc, kind_fallback="pc") == sides.SIDE_PARTY
    assert sides.true_side(entry_enemy, kind_fallback="enemy") == sides.SIDE_ENEMIES


def test_hidden_side_visible_as_party_to_players():
    entry = {
        "kind": "pc",
        "ref_id": "g",
        "name": "Грок",
        "side": sides.SIDE_ENEMIES,
        "side_hidden": True,
        "side_mask": sides.SIDE_PARTY,
    }
    assert sides.visible_side(entry, see_hidden=False) == sides.SIDE_PARTY
    assert sides.visible_side(entry, see_hidden=True) == sides.SIDE_ENEMIES
    assert sides.side_is_hidden(entry)


def test_is_ally_helper_true_side():
    actor = sides.SIDE_PARTY
    friend = {"kind": "pc", "side": sides.SIDE_PARTY}
    foe = {"kind": "pc", "side": sides.SIDE_ENEMIES, "side_hidden": True}
    assert sides.is_ally_of(actor, friend, use_true=True) is True
    assert sides.is_ally_of(actor, foe, use_true=True) is False
    # игроку скрытый ещё «свой» по маске
    assert sides.is_ally_of(
        actor, foe, use_true=False, see_hidden=False
    ) is True


def test_reveal_on_hostile_to_mask():
    state = {"entries": []}
    actor = {
        "kind": "pc",
        "side": sides.SIDE_ENEMIES,
        "side_hidden": True,
        "side_mask": sides.SIDE_PARTY,
    }
    target = {"kind": "pc", "side": sides.SIDE_PARTY}
    assert sides.maybe_reveal_on_hostile(
        state, actor_entry=actor, target_entry=target, target_kind="pc"
    )
    assert actor["side_hidden"] is False


def test_filter_redacts_hidden_side_for_players():
    combatants = [{"id": "e1", "name": "Огр", "wave_id": "w1"}]
    state = scmb.parse_combat_state(
        {
            "active": True,
            "entries": [
                {
                    "id": "1",
                    "kind": "pc",
                    "ref_id": str(uuid4()),
                    "name": "Грок",
                    "initiative": 10,
                    "side": sides.SIDE_ENEMIES,
                    "side_hidden": True,
                    "side_mask": sides.SIDE_PARTY,
                }
            ],
            "waves": [
                {"id": "w1", "index": 1, "released": True, "combatant_ids": ["e1"]}
            ],
        },
        combatants=combatants,
    )
    filtered, _ = scmb.filter_combat_for_viewer(state, combatants, see_hidden=False)
    assert filtered["entries"][0]["side"] == sides.SIDE_PARTY
    assert filtered["entries"][0]["side_hidden"] is False

    master, _ = scmb.filter_combat_for_viewer(state, combatants, see_hidden=True)
    assert master["entries"][0]["side"] == sides.SIDE_ENEMIES
    assert master["entries"][0]["side_hidden"] is True


def test_build_targets_respects_sides():
    pc_id = str(uuid4())
    seats = [
        {
            "character_id": pc_id,
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
            "members": [{"id": "m1", "name": "Гоблин 1", "hp_current": 7, "hp_max": 7}],
            "conditions": [],
        }
    ]
    state = scmb.parse_combat_state(
        {
            "active": True,
            "entries": [
                {
                    "id": "p1",
                    "kind": "pc",
                    "ref_id": pc_id,
                    "name": "Торин",
                    "initiative": 12,
                    "side": sides.SIDE_PARTY,
                },
                {
                    "id": "en1",
                    "kind": "enemy",
                    "ref_id": "e1",
                    "name": "Гоблин",
                    "initiative": 8,
                    "side": sides.SIDE_ENEMIES,
                },
            ],
            "waves": [
                {"id": "w1", "index": 1, "released": True, "combatant_ids": ["e1"]}
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
    by_kind = {t["kind"]: t for t in targets}
    assert by_kind["pc"]["side"] == sides.SIDE_PARTY
    assert by_kind["pc"]["is_ally"] is True
    assert by_kind["enemy"]["side"] == sides.SIDE_ENEMIES
    assert by_kind["enemy"]["is_ally"] is False


def test_combat_out_exposes_sides():
    out = _combat_out(
        {
            "active": True,
            "round": 1,
            "active_index": 0,
            "entries": [
                {
                    "id": "e1",
                    "kind": "pc",
                    "ref_id": str(uuid4()),
                    "name": "Торин",
                    "initiative": 12,
                    "side": "party",
                }
            ],
            "waves": [],
            "fallen": [],
            "saved_waves": [],
            "sides": [
                {"id": "party", "label": "Партия"},
                {"id": "enemies", "label": "Враги"},
                {"id": "kultisty", "label": "Культисты"},
            ],
        },
        combatants=[],
        see_hidden=True,
    )
    assert out.entries[0].side == "party"
    ids = {s.id for s in out.sides}
    assert "party" in ids and "enemies" in ids and "kultisty" in ids


def test_player_cannot_set_side():
    """Сторону меняет только can_run_session — игрок / наблюдатель → 403."""
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


def test_empty_combat_resets_sides_registry():
    empty = scmb.empty_combat()
    assert empty["entries"] == []
    assert empty["active"] is False
    ids = {s["id"] for s in empty["sides"]}
    assert ids == {sides.SIDE_PARTY, sides.SIDE_ENEMIES}


def test_slugify_cultists():
    slug = sides.slugify_side_label("Культисты")
    assert slug.startswith("kult") or "kult" in slug or slug.isascii()
    assert sides.looks_like_side_id(slug)


def test_alembic_head_unchanged_no_migration():
    """S-05 без новой колонки: ровно одна голова, l08rules9f2a1 в предках."""
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
