"""S-07: передача, выдача мастером, отдых партии, бой — без хардкода головы Alembic."""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.services import session_combat as scmb
from app.services import session_table_s07 as s07
from app.services.campaign_rules import normalize_campaign_rules


def _combat_with_pc(character_id, *, active_index: int = 0) -> dict:
    state = scmb.empty_combat()
    state["active"] = True
    state["entries"] = [
        {
            "id": "e1",
            "kind": "pc",
            "ref_id": str(character_id),
            "name": "Плач",
            "initiative": 15,
            "side": "party",
        },
        {
            "id": "e2",
            "kind": "enemy",
            "ref_id": "gob",
            "name": "Гоблин",
            "initiative": 10,
            "side": "enemies",
        },
    ]
    state["active_index"] = active_index
    return state


def test_transfer_blocked_not_own_turn():
    cid = uuid4()
    state = _combat_with_pc(cid, active_index=1)  # ход врага
    with pytest.raises(AppError) as ei:
        s07.assert_player_transfer_in_combat(state, from_character_id=cid)
    assert ei.value.status_code == 400
    assert ei.value.data.get("code") == "transfer_not_your_turn" or "хода" in str(
        ei.value
    ).lower() or ei.value.code == "transfer_not_your_turn"


def test_transfer_second_interaction_blocked():
    cid = uuid4()
    state = _combat_with_pc(cid, active_index=0)
    state = s07.mark_object_interaction(state, cid)
    with pytest.raises(AppError) as ei:
        s07.assert_player_transfer_in_combat(state, from_character_id=cid)
    assert ei.value.code == "transfer_interaction_used"


def test_transfer_ok_on_own_turn_first():
    cid = uuid4()
    state = _combat_with_pc(cid, active_index=0)
    s07.assert_player_transfer_in_combat(state, from_character_id=cid)
    marked = s07.mark_object_interaction(state, cid)
    assert marked["object_interactions"][str(cid)] == 1


def test_clear_interactions_on_turn_change():
    cid = uuid4()
    state = _combat_with_pc(cid)
    state = s07.mark_object_interaction(state, cid)
    cleared = s07.clear_object_interactions(state)
    assert cleared["object_interactions"] == {}


def test_party_rest_blocked_helper_when_combat_active():
    assert s07.combat_active(_combat_with_pc(uuid4())) is True
    assert s07.combat_active(scmb.empty_combat()) is False


def test_gritty_rest_copy():
    rules = normalize_campaign_rules({"homebrew": {"gritty_rest": True}})
    copy = s07.gritty_rest_copy(rules)
    assert copy["gritty_rest"] is True
    assert "8" in copy["short_label"]
    assert "7" in copy["long_label"]
    plain = s07.gritty_rest_copy(normalize_campaign_rules({}))
    assert plain["gritty_rest"] is False


def test_observer_cannot_award_grant():
    from app.models.lobby import LOBBY_ROLE_OBSERVER
    from app.services import lobby_roles as roles
    from tests.test_l01_lobby_roles import RoleMemoryDB, _lobby, _role, _session, _user

    owner = _user()
    observer = _user()
    lobby = _lobby(owner.id)
    session = _session(lobby.id)
    db = RoleMemoryDB(role_rows=[_role(lobby.id, observer.id, LOBBY_ROLE_OBSERVER)])
    assert roles.can_award(db, lobby, observer, session) is False
    with pytest.raises(AppError) as ei:
        roles.require_can_award(db, lobby, observer, session)
    assert ei.value.status_code == 403


def test_player_cannot_transfer_foreign_sheet_helper():
    """Чужой лист: from_member.user_id != user → 403 (проверяется в сервисе)."""
    from app.services import lobby_roles as roles
    from tests.test_l01_lobby_roles import RoleMemoryDB, _lobby, _session, _user

    owner = _user()
    player = _user()
    lobby = _lobby(owner.id)
    session = _session(lobby.id)
    db = RoleMemoryDB()
    # игрок не can_award — выдача из воздуха тоже закрыта
    assert roles.can_award(db, lobby, player, session) is False


def test_object_interactions_roundtrip_in_combat_json():
    cid = str(uuid4())
    state = _combat_with_pc(uuid4())
    state["object_interactions"] = {cid: 1}
    dumped = scmb.dump_combat_state(state)
    parsed = scmb.parse_combat_state(dumped)
    assert parsed["object_interactions"].get(cid) == 1


def test_alembic_single_head_no_migration_hardcoded():
    """S-07 без миграции: ровно одна голова, l08rules9f2a1 в предках."""
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


def test_app_error_code_attr():
    """Убедиться, что AppError.code доступен в ассертах выше."""
    err = AppError("x", code="transfer_not_your_turn", status_code=400)
    assert err.code == "transfer_not_your_turn"
