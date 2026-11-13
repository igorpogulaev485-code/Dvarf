"""L-08: campaign_rules normalize, rights, inspiration migration, no crit key."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.models.lobby import LOBBY_ROLE_COMASTER, LOBBY_ROLE_LEAD_TODAY, LobbyRole
from app.services import lobby_roles as roles
from app.services.campaign_rules import (
    HOMEBREW_CATALOG,
    HOMEBREW_KEYS,
    catalog_public,
    default_campaign_rules,
    homebrew_enabled,
    migrate_inspiration_from_visibility,
    normalize_campaign_rules,
    parse_inspiration_after_roll,
)
from app.services import session_table_s03 as s03


def test_homebrew_keys_and_catalog_include_o03_o04_master_rules():
    # Старые 11 (12.11) + 10 O-03 + 7 O-04 (13.11). Крит «максимум + бросок» вне списка.
    assert len(HOMEBREW_KEYS) == 28
    assert len(HOMEBREW_CATALOG) == 28
    assert set(HOMEBREW_KEYS) == set(HOMEBREW_CATALOG)
    assert "crit_max_plus_dice" not in HOMEBREW_KEYS
    assert "crit_maximum_plus_roll" not in HOMEBREW_KEYS
    for key in (
        "dmg_disarm",
        "dmg_mark",
        "dmg_overrun",
        "dmg_tumble",
        "dmg_shove_aside",
        "dmg_climb_bigger",
        "xge_identify_spell",
        "dmg_falling",
        "dmg_adamantine_weapon",
        "xge_no_long_rest",
        "dmg_cleave",
        "dmg_massive_damage",
        "dmg_lingering_injuries",
        "dmg_morale",
        "dmg_hero_points",
        "dmg_epic_heroism",
        "dmg_proficiency_dice",
    ):
        assert key in HOMEBREW_KEYS
        assert HOMEBREW_CATALOG[key]["source"]
    public = catalog_public()
    assert len(public) == 28
    assert all(row["tip"] and row["source"] and row["label"] for row in public)


def test_defaults():
    d = default_campaign_rules()
    assert d["edition_2014"]["feats_instead_of_asi"] is True
    assert d["edition_2014"]["multiclass"] is True
    assert d["edition_2014"]["hp_on_level_up"] == "average"
    assert d["homebrew"]["hidden_death_saves"] is True
    assert d["homebrew"]["encumbrance"] is False
    assert d["homebrew"]["flanking_advantage"] is False
    assert d["homebrew"]["dmg_disarm"] is False
    assert d["homebrew"]["xge_no_long_rest"] is False
    assert d["homebrew"]["dmg_cleave"] is False
    assert d["homebrew"]["dmg_epic_heroism"] is False
    assert d["homebrew"]["dmg_proficiency_dice"] is False
    assert d["inspiration_after_roll"] is False
    assert d["enemies_ac_visible"] is False
    assert d["progression"]["mode"] == "xp"
    assert d["custom_rules"] == []


def test_normalize_and_inspiration_migration():
    rules = normalize_campaign_rules(
        {
            "homebrew": {"potion_bonus_self": 1, "inspiration_stack_max": 100},
            "custom_rules": ["  дом ", "", {"text": "ещё"}],
        }
    )
    assert rules["homebrew"]["potion_bonus_self"] is True
    assert rules["homebrew"]["inspiration_stack_max"] == 20
    assert rules["homebrew"]["dmg_disarm"] is False
    assert rules["homebrew"]["xge_no_long_rest"] is False
    assert rules["homebrew"]["dmg_cleave"] is False
    assert rules["homebrew"]["dmg_hero_points"] is False
    assert rules["homebrew"]["dmg_massive_damage"] is False
    assert rules["custom_rules"] == ["дом", "ещё"]

    migrated = migrate_inspiration_from_visibility(
        {},
        {"inspiration_after_roll": True},
    )
    assert migrated["inspiration_after_roll"] is True

    assert parse_inspiration_after_roll(
        campaign_rules={"inspiration_after_roll": True},
        visibility_profile={"inspiration_after_roll": False},
    )
    assert not parse_inspiration_after_roll(
        campaign_rules={},
        visibility_profile={},
    )
    # s03 helper understands campaign_rules kw
    assert s03.parse_inspiration_after_roll(
        {"inspiration_after_roll": False},
        campaign_rules={"inspiration_after_roll": True},
    )


def test_homebrew_enabled_helper():
    assert homebrew_enabled(None, "hidden_death_saves") is True
    assert homebrew_enabled({"homebrew": {"encumbrance": True}}, "encumbrance") is True


def _user(uid=None):
    return SimpleNamespace(id=uid or uuid4())


def _lobby(owner_id):
    return SimpleNamespace(id=uuid4(), owner_id=owner_id, members=[])


class RoleMemoryDB:
    def __init__(self, role_rows: list[LobbyRole] | None = None):
        self.role_rows = list(role_rows or [])
        self.member_user_ids: set = set()

    def scalars(self, stmt):  # noqa: ANN001
        return SimpleNamespace(all=lambda: list(self.role_rows))

    def scalar(self, stmt):  # noqa: ANN001
        try:
            compiled = stmt.compile()
            p = compiled.params
        except Exception:
            p = {}
        role = p.get("role_1") or p.get("role")
        user_id = p.get("user_id_1") or p.get("user_id")
        for row in self.role_rows:
            if user_id and row.user_id != user_id:
                continue
            if role and row.role != role:
                continue
            return row
        return None


def test_comaster_can_edit_campaign_rules_lead_cannot():
    owner = _user()
    comaster = _user()
    lead = _user()
    player = _user()
    lobby = _lobby(owner.id)
    session = SimpleNamespace(id=uuid4(), lobby_id=lobby.id, closed_at=None)
    db = RoleMemoryDB(
        [
            LobbyRole(
                id=uuid4(),
                lobby_id=lobby.id,
                user_id=comaster.id,
                role=LOBBY_ROLE_COMASTER,
                session_id=None,
                assigned_by=None,
            ),
            LobbyRole(
                id=uuid4(),
                lobby_id=lobby.id,
                user_id=lead.id,
                role=LOBBY_ROLE_LEAD_TODAY,
                session_id=session.id,
                assigned_by=None,
            ),
        ]
    )
    assert roles.can_edit_campaign_rules(db, lobby, owner)
    assert roles.can_edit_campaign_rules(db, lobby, comaster)
    assert not roles.can_edit_campaign_rules(db, lobby, lead)
    assert not roles.can_edit_campaign_rules(db, lobby, player)
    with pytest.raises(AppError) as exc:
        roles.require_can_edit_campaign_rules(db, lobby, lead)
    assert exc.value.status_code == 403
    with pytest.raises(AppError) as exc2:
        roles.require_can_edit_campaign_rules(db, lobby, player)
    assert exc2.value.status_code == 403
