"""L-16: start rules normalize, merge, check, rights, copy-without-join."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.schemas.lobby import JoinLobbyRequest
from app.services import lobby_roles as roles
from app.services.book_sources import canonicalize_source, source_matches_allowed
from app.services.campaign_rules import (
    default_campaign_rules,
    merge_campaign_rules,
    normalize_campaign_rules,
    normalize_start_rules,
)
from app.services.lobby import LobbyService
from app.services.start_rules import check_character_start_rules
from tests.test_l01_lobby_roles import _lobby, _user


def test_default_start_rules_shape():
    d = default_campaign_rules()
    assert "start" in d
    start = d["start"]
    assert start["level"] == 1
    assert start["ability_method"] == "any"
    assert start["allowed_sources"] == ["phb"]
    assert start["starting_kit"] == {"mode": "class_equipment"}
    assert start["banned_races"] == []
    assert start["banned_classes"] == []


def test_normalize_start_and_missing_key():
    rules = normalize_campaign_rules({})
    assert rules["start"]["level"] == 1
    rules2 = normalize_campaign_rules(
        {
            "start": {
                "level": 3,
                "ability_method": "point_buy",
                "allowed_sources": ["PHB 2014", "tasha"],
                "starting_kit": {"mode": "fixed_gold", "gp": 50},
                "banned_classes": ["barbarian"],
            }
        }
    )
    assert rules2["start"]["level"] == 3
    assert rules2["start"]["ability_method"] == "point_buy"
    assert "phb" in rules2["start"]["allowed_sources"]
    assert "tce" in rules2["start"]["allowed_sources"]
    assert rules2["start"]["starting_kit"] == {"mode": "fixed_gold", "gp": 50}
    assert rules2["start"]["banned_classes"] == ["barbarian"]


def test_merge_keeps_xp_remainder_and_homebrew():
    current = normalize_campaign_rules(
        {
            "homebrew": {"feat_at_level_1": True, "gritty_rest": True},
            "progression": {"mode": "xp", "xp_remainder": 7},
        }
    )
    merged = merge_campaign_rules(
        current,
        {
            "start": {"level": 5, "ability_method": "roll"},
            "progression": {"mode": "milestones"},
        },
    )
    assert merged["progression"]["xp_remainder"] == 7
    assert merged["progression"]["mode"] == "milestones"
    assert merged["homebrew"]["feat_at_level_1"] is True
    assert merged["homebrew"]["gritty_rest"] is True
    assert merged["start"]["level"] == 5
    assert merged["start"]["ability_method"] == "roll"


def test_book_source_aliases():
    assert canonicalize_source("PHB 2014") == "phb"
    assert canonicalize_source("srd-5.1") == "phb"
    assert canonicalize_source("tasha") == "tce"
    assert canonicalize_source("xgte") == "xge"
    assert canonicalize_source("ttg:MPMM") == "mpmm"
    assert source_matches_allowed("phb-2014", ["phb"])
    assert source_matches_allowed("tce-2014", ["tce"])
    assert not source_matches_allowed("tce-2014", ["phb"])


def test_check_level_and_banned_class():
    char = SimpleNamespace(
        level=5,
        sheet={
            "create_pipeline": {
                "race": {"slug": "human", "source": "phb"},
                "classRef": {"slug": "barbarian", "source": "phb"},
            },
            "classes": [{"slug": "barbarian", "level": 5, "source": "phb"}],
        },
    )
    rules = {
        "start": {
            "level": 3,
            "ability_method": "any",
            "allowed_sources": ["phb"],
            "banned_classes": ["barbarian"],
            "banned_races": [],
            "starting_kit": {"mode": "class_equipment"},
        }
    }
    mismatches = check_character_start_rules(character=char, campaign_rules=rules)
    assert any("Уровень" in m for m in mismatches)
    assert any("barbarian" in m for m in mismatches)


def test_matching_hero_no_mismatches():
    char = SimpleNamespace(
        level=3,
        sheet={
            "create_pipeline": {
                "race": {"slug": "human", "source": "phb"},
                "classRef": {"slug": "wizard", "source": "phb"},
                "background": {"slug": "sage", "source": "phb"},
            },
            "classes": [{"slug": "wizard", "level": 3, "source": "phb"}],
        },
    )
    rules = normalize_campaign_rules(
        {"start": {"level": 3, "allowed_sources": ["phb"], "banned_classes": ["barbarian"]}}
    )
    assert check_character_start_rules(character=char, campaign_rules=rules) == []


def test_copy_creates_clone_without_join(monkeypatch):
    user = _user()
    target_id = uuid4()
    char_id = uuid4()
    clone_id = uuid4()
    target = _lobby(user.id, lobby_id=target_id)
    target.invite_code = "ABCD"
    target.name = "Новое"
    target.campaign_rules = default_campaign_rules()

    class FakeRepo:
        def get_by_invite_code(self, code):
            return target if code == "ABCD" else None

        def get_membership_by_character(self, cid):
            return None

        def get_member(self, *a, **k):
            return None

        def get_role(self, *a, **k):
            return None

        def add_member(self, *a, **k):
            raise AssertionError("copy must not join")

        def add_member_with_flags(self, *a, **k):
            raise AssertionError("copy must not join")

    svc = LobbyService.__new__(LobbyService)
    commits = {"n": 0}
    svc.db = SimpleNamespace(commit=lambda: commits.__setitem__("n", commits["n"] + 1))
    svc.lobbies = FakeRepo()
    source = SimpleNamespace(
        id=char_id,
        user_id=user.id,
        name="Герой",
        avatar_url=None,
        level=1,
        class_name="Wizard",
        race_name="Human",
        hp_current=8,
        hp_max=8,
        rules_edition="2014",
        sheet={},
    )
    clone = SimpleNamespace(id=clone_id, name="Герой (копия)")
    svc.characters = SimpleNamespace(get_for_user=lambda cid, uid: source)
    monkeypatch.setattr(roles, "is_comaster", lambda *a, **k: False)
    monkeypatch.setattr(roles, "is_observer", lambda *a, **k: False)
    monkeypatch.setattr(svc, "_clone_character_row", lambda src, u: clone)
    monkeypatch.setattr(svc, "_require_lobby", lambda lid: target)

    detail_box: dict = {}

    def _to_detail(lobby, u):
        from app.schemas.lobby import LobbyDetail

        # Minimal stub accepted by JoinLobbyOut — bypass via model_construct
        detail_box["id"] = lobby.id
        return LobbyDetail.model_construct(
            id=lobby.id,
            name=lobby.name,
            invite_code=lobby.invite_code,
            is_owner=True,
            owner_id=user.id,
            members=[],
            settings=[],
            sessions=[],
            created_at=__import__("datetime").datetime.now(
                __import__("datetime").timezone.utc
            ),
            updated_at=__import__("datetime").datetime.now(
                __import__("datetime").timezone.utc
            ),
        )

    monkeypatch.setattr(svc, "_to_detail", _to_detail)

    out = svc.join_with_character(
        user,
        JoinLobbyRequest(code="ABCD", character_id=char_id, action="copy"),
    )
    assert out.cloned_character_id == clone_id
    assert commits["n"] == 1


def test_join_mismatch_requires_ack(monkeypatch):
    user = _user()
    target = _lobby(user.id)
    target.invite_code = "ABCD"
    target.name = getattr(target, "name", None) or "Тест"
    target.campaign_rules = normalize_campaign_rules({"start": {"level": 3}})
    char_id = uuid4()
    character = SimpleNamespace(id=char_id, user_id=user.id, level=5, sheet={})

    class FakeRepo:
        def get_by_invite_code(self, code):
            return target

        def get_membership_by_character(self, cid):
            return None

        def get_member(self, *a, **k):
            return None

        def get_role(self, *a, **k):
            return None

        def add_member_with_flags(self, **kwargs):
            return SimpleNamespace(**kwargs)

    svc = LobbyService.__new__(LobbyService)
    svc.db = SimpleNamespace(commit=lambda: None)
    svc.lobbies = FakeRepo()
    svc.characters = SimpleNamespace(get_for_user=lambda cid, uid: character)
    monkeypatch.setattr(roles, "is_comaster", lambda *a, **k: False)
    monkeypatch.setattr(roles, "is_observer", lambda *a, **k: False)

    with pytest.raises(AppError) as exc:
        svc.join_with_character(
            user,
            JoinLobbyRequest(code="ABCD", character_id=char_id, action="join"),
        )
    assert exc.value.code == "start_rules_mismatch"
    assert exc.value.status_code == 409

    added = {}

    def _add(**kwargs):
        added.update(kwargs)
        return SimpleNamespace(**kwargs)

    from datetime import datetime, timezone

    from app.schemas.lobby import LobbyDetail

    svc.lobbies.add_member_with_flags = _add
    monkeypatch.setattr(svc, "_require_lobby", lambda lid: target)
    monkeypatch.setattr(
        svc,
        "_to_detail",
        lambda lobby, u: LobbyDetail.model_construct(
            id=lobby.id,
            name=getattr(lobby, "name", "Тест"),
            invite_code=lobby.invite_code,
            is_owner=False,
            owner_id=user.id,
            members=[],
            settings=[],
            sessions=[],
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        ),
    )

    out = svc.join_with_character(
        user,
        JoinLobbyRequest(
            code="ABCD",
            character_id=char_id,
            action="join",
            acknowledge_start_mismatch=True,
        ),
    )
    assert added.get("start_rules_ok") is False
    assert out.start_rules_ok is False


def test_waive_requires_can_edit_campaign_rules(monkeypatch):
    owner = _user()
    player = _user()
    lobby = _lobby(owner.id)
    char_id = uuid4()
    member = SimpleNamespace(
        character_id=char_id,
        user_id=player.id,
        start_rules_ok=False,
        start_rules_waived=False,
    )

    class FakeRepo:
        def get(self, lid):
            return lobby if lid == lobby.id else None

        def get_member(self, lid, cid):
            return member if cid == char_id else None

    svc = LobbyService.__new__(LobbyService)
    svc.db = SimpleNamespace(commit=lambda: None, scalar=lambda *a, **k: None)
    svc.lobbies = FakeRepo()
    monkeypatch.setattr(roles, "require_can_edit_campaign_rules", lambda *a, **k: (_ for _ in ()).throw(
        AppError("Запрещено", code="forbidden", status_code=403)
    ))

    with pytest.raises(AppError) as exc:
        svc.waive_start_rules(player, lobby.id, char_id)
    assert exc.value.status_code == 403


def test_normalize_start_helpers():
    start = normalize_start_rules({"level": 99, "ability_method": "manual"})
    assert start["level"] == 20
    assert start["ability_method"] == "any"  # manual не в списке правил лобби
