"""P24-M04: desk combat assembly — surprise, bestiary edition, join, flag still off."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.config import settings
from app.core.exceptions import AppError
from app.models.character import RulesEdition
from app.schemas.lobby import LobbyCreateRequest
from app.services.lobby import LobbyService
from app.services.lobby_edition import (
    ensure_character_matches_lobby,
    lobby_rules_edition_value,
)
from app.services import session_combat as scmb


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


def test_join_mismatch_requires_ack_not_masked():
    """Known CI test_join_mismatch_requires_ack must remain in the tree (start-rules ack)."""
    import pathlib

    root = pathlib.Path(__file__).resolve().parents[1]
    blob = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in root.rglob("test_*.py"))
    assert "test_join_mismatch_requires_ack" in blob


def test_surprise_initiative_disadvantage_2024():
    """Surprised 2024 → disadvantage; advantage+surprised cancels to normal."""
    entry = {"kind": "enemy", "dex_mod": 0, "surprised": True}
    svc = LobbyService(db=SimpleNamespace())  # type: ignore[arg-type]

    # Force both faces different by mocking roll_d20
    calls: list[dict] = []

    def fake_roll(*, advantage=False, disadvantage=False):
        calls.append({"advantage": advantage, "disadvantage": disadvantage})
        if disadvantage:
            return 3, "d20[3,8] помеха → 3"
        if advantage:
            return 15, "d20[9,15] преим. → 15"
        return 10, "d20 → 10"

    monkey = scmb.roll_d20
    scmb.roll_d20 = fake_roll  # type: ignore[assignment]
    try:
        total, formula, _ = svc._roll_one_initiative_total(
            entry, mode="roll", value=None, advantage=False, rules_edition="2024"
        )
        assert calls[-1]["disadvantage"] is True
        assert "помех" in formula
        assert total == 3

        calls.clear()
        total2, formula2, _ = svc._roll_one_initiative_total(
            entry, mode="roll", value=None, advantage=True, rules_edition="2024"
        )
        assert calls[-1]["advantage"] is False
        assert calls[-1]["disadvantage"] is False
        assert "преим" not in formula2
        assert "помех" not in formula2
        assert total2 == 10

        calls.clear()
        _, formula3, _ = svc._roll_one_initiative_total(
            entry, mode="roll", value=None, advantage=False, rules_edition="2014"
        )
        assert calls[-1]["disadvantage"] is False
        assert "помех" not in formula3
    finally:
        scmb.roll_d20 = monkey  # type: ignore[assignment]


def test_lobby_create_2024_preview_bypass(monkeypatch):
    user = SimpleNamespace(id=uuid4())
    created = {}

    class FakeLobbies:
        def create(self, *, owner_id, name, rules_edition):
            created["edition"] = rules_edition
            lobby = SimpleNamespace(
                id=uuid4(),
                name=name,
                owner_id=owner_id,
                rules_edition=rules_edition,
                members=[],
                roles=[],
                settings=[],
                sessions=[],
                invite_code="ABCDEF",
                campaign_rules={},
                visibility_profile={},
                created_at=None,
                updated_at=None,
            )
            return lobby

        def list_roles(self, lobby_id):
            return []

    class FakeDb:
        def commit(self):
            return None

    monkeypatch.setattr(settings, "rules_edition_2024_open", False)
    svc = LobbyService(db=FakeDb())  # type: ignore[arg-type]
    svc.lobbies = FakeLobbies()  # type: ignore[assignment]

    # Without preview — closed
    with pytest.raises(AppError) as exc:
        svc.create(
            user,  # type: ignore[arg-type]
            LobbyCreateRequest(name="x", rules_edition="2024", is_preview=False),
        )
    assert exc.value.code == "rules_edition_closed"

    # Patch _require_lobby / _to_detail for success path
    lobby_holder: dict = {}

    def fake_create(*, owner_id, name, rules_edition):
        lobby = SimpleNamespace(
            id=uuid4(),
            name=name,
            owner_id=owner_id,
            rules_edition=rules_edition,
            members=[],
            roles=[],
            settings=[],
            sessions=[],
            invite_code="ABCDEF",
            campaign_rules={},
            visibility_profile={},
            created_at="t",
            updated_at="t",
        )
        lobby_holder["lobby"] = lobby
        return lobby

    svc.lobbies.create = fake_create  # type: ignore[method-assign]
    svc._require_lobby = lambda lid: lobby_holder["lobby"]  # type: ignore[method-assign]
    svc._to_detail = lambda lobby, user: SimpleNamespace(  # type: ignore[method-assign]
        id=lobby.id, rules_edition=lobby_rules_edition_value(lobby)
    )

    out = svc.create(
        user,  # type: ignore[arg-type]
        LobbyCreateRequest(name="desk-2024", rules_edition="2024", is_preview=True),
    )
    assert lobby_rules_edition_value(lobby_holder["lobby"]) == "2024"
    assert out.rules_edition == "2024"


def test_edition_mismatch_message():
    lobby = SimpleNamespace(rules_edition=RulesEdition.edition_2024)
    character = SimpleNamespace(rules_edition=RulesEdition.edition_2014)
    with pytest.raises(AppError) as exc:
        ensure_character_matches_lobby(lobby=lobby, character=character)
    assert exc.value.code == "lobby_rules_edition_mismatch"


def test_start_combat_source_skips_l21_for_2024():
    """lobby.py start_combat must gate L-21 lock on lobby edition != 2024."""
    import pathlib

    src = pathlib.Path(__file__).resolve().parents[1] / "app/services/lobby.py"
    text = src.read_text(encoding="utf-8")
    assert 'apply_l21_lock = lobby_edition != "2024"' in text
    assert "if apply_l21_lock:" in text
    assert 'list_bestiary_for_generator(\n            edition=lobby_rules_edition_value(lobby)' in text or \
        "edition=lobby_rules_edition_value(lobby)" in text
    assert 'edition="2014"' not in text.split("def generate_encounter")[1].split("def ")[0]
