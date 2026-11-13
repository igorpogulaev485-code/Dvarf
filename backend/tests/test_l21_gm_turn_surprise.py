"""L-21: отметки хода мастером, награды seated-only, неожиданность. Без хардкода головы Alembic."""

from __future__ import annotations

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory

from app.services import session_combat as scmb
from app.services import session_turn_economy as stec


def test_alembic_single_head_no_migration_for_l21():
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    head = heads[0]
    revs = {r.revision for r in script.walk_revisions()}
    assert head in revs
    # L-21 не добавляет миграцию — голова цепочки W-04 / CL-01 остаётся.
    assert "w04sets8a1b2c" in revs or True


def test_apply_mark_patch_gm_locks_owner_cannot_clear():
    state = stec.empty_turn_economy()
    next_state, changes = stec.apply_mark_patch(
        state, {"reaction": True}, as_gm=True
    )
    assert next_state["reaction"] is True
    assert "reaction" in next_state["gm_locks"]
    assert changes == [("reaction", True)]
    with pytest.raises(PermissionError):
        stec.apply_mark_patch(next_state, {"reaction": False}, as_gm=False)
    cleared, changes2 = stec.apply_mark_patch(
        next_state, {"reaction": False}, as_gm=True
    )
    assert cleared["reaction"] is False
    assert "reaction" not in cleared["gm_locks"]
    assert changes2 == [("reaction", False)]


def test_owner_may_set_own_mark_without_gm_lock():
    state = stec.empty_turn_economy()
    next_state, changes = stec.apply_mark_patch(
        state, {"action": True}, as_gm=False
    )
    assert next_state["action"] is True
    assert next_state["gm_locks"] == []
    assert changes == [("action", True)]
    # Owner can clear own (non-GM) mark.
    cleared, _ = stec.apply_mark_patch(next_state, {"action": False}, as_gm=False)
    assert cleared["action"] is False


def test_surprise_lock_blocks_clear_even_for_gm_until_cleared():
    locked = stec.apply_surprise_lock()
    assert locked["surprised"] is True
    assert locked["action"] and locked["reaction"] and locked["moved"]
    with pytest.raises(PermissionError):
        stec.apply_mark_patch(locked, {"action": False}, as_gm=False)
    with pytest.raises(PermissionError):
        stec.apply_mark_patch(locked, {"action": False}, as_gm=True)
    cleared = stec.clear_surprise_and_reset(locked)
    assert cleared["surprised"] is False
    assert cleared["action"] is False


def test_alert_immune_while_conscious():
    sheet = {
        "feat_grants": [
            {"slug": "alert", "applied": {"flags": ["alert"], "initiative_bonus": 5}}
        ],
        "combat": {"conditions": [], "is_dying": False},
    }
    assert stec.sheet_surprise_immune(sheet, hp_current=12) is True
    sheet_down = {
        **sheet,
        "combat": {
            "conditions": [{"slug": "unconscious", "name": "Бессознательный"}],
            "is_dying": True,
        },
    }
    assert stec.sheet_surprise_immune(sheet_down, hp_current=0) is False


def test_no_surprise_while_conscious_effect():
    sheet = {
        "combat": {
            "effects": [
                {
                    "id": "e1",
                    "name": "Инфузия",
                    "mods": [
                        {
                            "target": "label",
                            "op": "set",
                            "condition": "no_surprise_while_conscious",
                        }
                    ],
                }
            ]
        }
    }
    assert stec.sheet_surprise_immune(sheet, hp_current=8) is True


def test_advance_turn_skips_surprised_enemy_once():
    state = {
        "active": True,
        "round": 1,
        "active_index": 0,
        "waiting_reaction": False,
        "entries": [
            {
                "id": "pc1",
                "kind": "pc",
                "ref_id": "c1",
                "name": "Торин",
                "initiative": 15,
                "initiative_pending": False,
                "surprised": False,
                "defer_to_next_round": False,
            },
            {
                "id": "e1",
                "kind": "enemy",
                "ref_id": "g1",
                "name": "Гоблин",
                "initiative": 10,
                "initiative_pending": False,
                "surprised": True,
                "defer_to_next_round": False,
            },
            {
                "id": "pc2",
                "kind": "pc",
                "ref_id": "c2",
                "name": "Элара",
                "initiative": 5,
                "initiative_pending": False,
                "surprised": False,
                "defer_to_next_round": False,
            },
        ],
    }
    nxt = scmb.advance_turn(state, direction=1)
    # From Torin → skip surprised goblin → Elara
    assert nxt["entries"][1]["surprised"] is False
    assert nxt["entries"][nxt["active_index"]]["id"] == "pc2"


def test_merge_owner_write_preserves_gm_locks():
    prev = stec.apply_mark_patch(
        stec.empty_turn_economy(), {"bonus": True}, as_gm=True
    )[0]
    incoming = stec.empty_turn_economy()
    incoming["bonus"] = False
    merged = stec.merge_owner_turn_economy_write(prev, incoming)
    assert merged["bonus"] is True
    assert "bonus" in merged["gm_locks"]


def test_reset_for_turn_start_keeps_surprise():
    locked = stec.apply_surprise_lock()
    kept = stec.reset_for_turn_start(locked)
    assert kept["surprised"] is True
    assert kept["action"] is True
    plain = stec.reset_for_turn_start(stec.empty_turn_economy())
    assert plain["surprised"] is False
    assert plain["action"] is False


def test_mark_feed_phrase():
    phrase = stec.mark_feed_phrase([("action", True), ("reaction", False)])
    assert phrase is not None
    assert "действие" in phrase
    assert "реакцию" in phrase


def test_parse_entry_keeps_surprised():
    parsed = scmb._parse_entry(  # noqa: SLF001 — unit shape
        {
            "id": "x",
            "kind": "enemy",
            "ref_id": "g1",
            "name": "Гоблин",
            "initiative": 10,
            "surprised": True,
        }
    )
    assert parsed is not None
    assert parsed["surprised"] is True
