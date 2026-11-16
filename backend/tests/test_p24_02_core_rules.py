"""P24-02: core rules 2024 — homebrew catalog overlay, potion timing, flag still off."""

from __future__ import annotations

from app.core.config import settings
from app.services.campaign_rules import (
    HOMEBREW_KEYS,
    catalog_public,
    catalog_public_for_edition,
    default_campaign_rules,
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
    assert potion24["label"] == "Зелье бонусным действием"
    tip_l = potion24["tip"].lower()
    assert "бонусн" in tip_l
    assert "выкл" in tip_l

    stack24 = next(r for r in c24 if r["key"] == "inspiration_stack")
    assert "героическ" in stack24["label"].lower()


def test_homebrew_catalog_2014_unchanged_via_edition_helper():
    c14 = catalog_public()
    via = catalog_public_for_edition("2014")
    assert c14 == via


def test_potion_self_timing_2014_unchanged():
    """2014: OFF = PHB action, ON = Tasha bonus — polarity unchanged."""
    assert potion_self_timing("2014", False) == "action"
    assert potion_self_timing("2014", True) == "bonus"


def test_potion_self_timing_2024_both_values():
    """2024: ON = book bonus, OFF = house action (no polarity inversion)."""
    assert potion_self_timing("2024", True) == "bonus"
    assert potion_self_timing("2024", False) == "action"


def test_potion_bonus_self_defaults_by_edition():
    d14 = default_campaign_rules()
    d14_explicit = default_campaign_rules("2014")
    d24 = default_campaign_rules("2024")
    assert d14["homebrew"]["potion_bonus_self"] is False
    assert d14_explicit["homebrew"]["potion_bonus_self"] is False
    assert d24["homebrew"]["potion_bonus_self"] is True
    # Other homebrew defaults stay shared.
    assert d14["homebrew"]["inspiration_stack"] is False
    assert d24["homebrew"]["inspiration_stack"] is False
    assert d14["homebrew"]["hidden_death_saves"] is True
    assert d24["homebrew"]["hidden_death_saves"] is True
