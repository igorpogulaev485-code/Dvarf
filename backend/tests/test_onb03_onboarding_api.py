"""ONB-03: onboarding payload on /auth/me serialize + PATCH (no live DB)."""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.user import OnboardingStatePayload, UserUpdateRequest
from app.services.auth import AuthService, normalize_onboarding_payload, serialize_user


def _user(**kwargs):
    now = datetime.now(UTC)
    base = dict(
        id=uuid4(),
        email="player@example.com",
        login=None,
        display_name="Игрок",
        full_name=None,
        phone=None,
        avatar_url=None,
        theme_id="wis",
        ability_colors="identity",
        onboarding=None,
        email_verified_at=None,
        created_at=now,
        updated_at=now,
        identities=[],
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


def test_normalize_onboarding_empty_is_none():
    assert normalize_onboarding_payload(None) is None
    assert normalize_onboarding_payload({}) is None
    assert normalize_onboarding_payload("x") is None


def test_normalize_onboarding_flags():
    payload = normalize_onboarding_payload(
        {
            "version": 1,
            "welcomeDone": True,
            "segment": "dnd_new",
            "sheetTourDone": True,
            "lobbyTourDone": False,
        }
    )
    assert payload is not None
    assert payload.welcomeDone is True
    assert payload.segment == "dnd_new"
    assert payload.sheetTourDone is True
    assert payload.lobbyTourDone is False


def test_onboarding_payload_rejects_bad_segment():
    with pytest.raises(ValidationError):
        OnboardingStatePayload.model_validate({"version": 1, "segment": "wizard"})


def test_serialize_user_includes_onboarding():
    user = _user(
        onboarding={
            "version": 1,
            "welcomeDone": True,
            "segment": "product_new",
            "sheetTourDone": True,
            "lobbyTourDone": True,
        }
    )
    out = serialize_user(user)
    assert out.onboarding is not None
    assert out.onboarding.segment == "product_new"
    assert out.onboarding.lobbyTourDone is True


def test_serialize_user_null_onboarding():
    out = serialize_user(_user(onboarding=None))
    assert out.onboarding is None


def test_update_me_writes_and_reads_onboarding():
    user = _user()
    db = MagicMock()
    svc = AuthService(db)
    svc.users = MagicMock()
    svc.users.get_by_id.return_value = user

    payload = UserUpdateRequest(
        onboarding=OnboardingStatePayload(
            version=1,
            welcomeDone=True,
            segment="dnd_new",
            sheetTourDone=True,
            lobbyTourDone=False,
        )
    )
    result = svc.update_me(user.id, payload)
    assert user.onboarding is not None
    assert user.onboarding["sheetTourDone"] is True
    assert user.onboarding["lobbyTourDone"] is False
    assert result.onboarding is not None
    assert result.onboarding.sheetTourDone is True
    db.commit.assert_called()


def test_update_me_reset_clears_tour_flags():
    user = _user(
        onboarding={
            "version": 1,
            "welcomeDone": True,
            "segment": "dnd_new",
            "sheetTourDone": True,
            "lobbyTourDone": True,
        }
    )
    db = MagicMock()
    svc = AuthService(db)
    svc.users = MagicMock()
    svc.users.get_by_id.return_value = user

    reset = UserUpdateRequest(
        onboarding=OnboardingStatePayload(
            version=1,
            welcomeDone=True,
            segment="dnd_new",
            sheetTourDone=False,
            lobbyTourDone=False,
        )
    )
    result = svc.update_me(user.id, reset)
    assert result.onboarding is not None
    assert result.onboarding.sheetTourDone is False
    assert result.onboarding.lobbyTourDone is False
    assert result.onboarding.segment == "dnd_new"


def test_update_me_theme_untouched_when_only_onboarding():
    user = _user(theme_id="cha", ability_colors="theme")
    db = MagicMock()
    svc = AuthService(db)
    svc.users = MagicMock()
    svc.users.get_by_id.return_value = user

    svc.update_me(
        user.id,
        UserUpdateRequest(
            onboarding=OnboardingStatePayload(welcomeDone=True, segment="skip")
        ),
    )
    assert user.theme_id == "cha"
    assert user.ability_colors == "theme"
