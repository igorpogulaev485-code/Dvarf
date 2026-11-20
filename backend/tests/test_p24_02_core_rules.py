"""P24-02: core rules 2024 — homebrew catalog overlay, potion timing, flag still off."""

from __future__ import annotations

from app.core.config import settings
from app.services.campaign_rules import (
    HOMEBREW_KEYS,
    catalog_public,
    catalog_public_for_edition,
    potion_self_timing,
)


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


def test_homebrew_catalog_2024_same_keys_new_tips():
    c14 = catalog_public()
    c24 = catalog_public_for_edition("2024")
    assert len(c14) == len(HOMEBREW_KEYS)
    assert len(c24) == len(HOMEBREW_KEYS)
    keys14 = [r["key"] for r in c14]
    keys24 = [r["key"] for r in c24]
    assert keys14 == keys24 == list(HOMEBREW_KEYS)

    potion14 = next(r for r in c14 if r["key"] == "potion_bonus_self")
    potion24 = next(r for r in c24 if r["key"] == "potion_bonus_self")
    assert potion14["label"] == "Зелье бонусным действием"
    assert potion24["label"] == "Зелье стоит действие"
    assert "бонусное" in potion24["tip"].lower() or "бонусн" in potion24["tip"].lower()

    stack24 = next(r for r in c24 if r["key"] == "inspiration_stack")
    assert "героическ" in stack24["label"].lower()


def test_homebrew_catalog_2014_unchanged_via_edition_helper():
    c14 = catalog_public()
    via = catalog_public_for_edition("2014")
    assert c14 == via


def test_potion_self_timing_by_edition():
    assert potion_self_timing("2014", False) == "action"
    assert potion_self_timing("2014", True) == "bonus"
    assert potion_self_timing("2024", False) == "bonus"
    assert potion_self_timing("2024", True) == "action"
