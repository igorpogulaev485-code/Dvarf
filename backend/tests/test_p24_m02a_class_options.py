"""P24-M02a+: BI CHA formula, abilities format, class options validation."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.dnd import edition_2024_class_options as opt
from app.dnd import edition_2024_classes as e24
from app.schemas.character import CharacterUpdateRequest
from app.services.character import CharacterService
from tests.test_l01_lobby_roles import _user


def test_bardic_inspiration_uses_cha_mod_min_1():
    snap_hi = e24.compute_progression(
        [{"slug": "bard", "level": 1}],
        abilities={"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 16},
    )
    bi_hi = next(r for r in snap_hi.resources if r.pool_id == "bardic_inspiration")
    assert bi_hi.max == 3  # CHA 16 → +3
    assert bi_hi.reset == "long"

    snap_lo = e24.compute_progression(
        [{"slug": "bard", "level": 1}],
        abilities={"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 8},
    )
    bi_lo = next(r for r in snap_lo.resources if r.pool_id == "bardic_inspiration")
    assert bi_lo.max == 1  # CHA 8 → −1 → min 1

    # Font of Inspiration L5+: full short-rest restore
    snap5 = e24.compute_progression(
        [{"slug": "bard", "level": 5}],
        abilities={"cha": 16},
    )
    bi5 = next(r for r in snap5.resources if r.pool_id == "bardic_inspiration")
    assert bi5.max == 3
    assert bi5.reset == "short"
    assert bi5.short_rest_regain is None


def test_resource_rest_policies_srd():
    # Rage / Channel / Wild Shape: +1 on short, all on long
    for slug, pool, level in (
        ("barbarian", "rages", 1),
        ("cleric", "channel_divinity", 2),
        ("druid", "wild_shape", 2),
        ("paladin", "channel_divinity", 3),
    ):
        snap = e24.compute_progression([{"slug": slug, "level": level}])
        row = next(r for r in snap.resources if r.pool_id == pool)
        assert row.reset == "long", pool
        assert row.short_rest_regain == 1, pool

    # Second Wind: +1 short
    fighter = e24.compute_progression([{"slug": "fighter", "level": 1}])
    sw = next(r for r in fighter.resources if r.pool_id == "second_wind")
    assert sw.short_rest_regain == 1

    # Magic of Making: INT mod min 1
    art = e24.compute_progression(
        [{"slug": "artificer", "level": 1}],
        abilities={"int": 16},
    )
    mom = next(r for r in art.resources if r.pool_id == "magic_of_making")
    assert mom.max == 3


def test_read_ability_scores_nested_format():
    scores = e24.read_ability_scores_from_sheet(
        {
            "abilities": {
                "str": {"score": 15},
                "dex": {"score": 14, "max_score": 20},
                "con": {"value": 13},
                "int": 12,
                "wis": {"base": 11},
                "cha": {"score": 16},
            }
        }
    )
    assert scores == {
        "str": 15,
        "dex": 14,
        "con": 13,
        "int": 12,
        "wis": 11,
        "cha": 16,
    }


def test_api_sheet_update_nested_abilities_feeds_bardic(monkeypatch):
    """Real CharacterService.update path with sheet.abilities.{cha:{score}}."""
    character = SimpleNamespace(
        id=uuid4(),
        sheet_version=1,
        name="Лира",
        avatar_url=None,
        level=1,
        class_name="Бард 1",
        race_name="Человек",
        hp_current=8,
        hp_max=8,
        rules_edition="2024",
        is_draft=False,
        sheet={
            "classes": [{"name": "Бард", "level": 1, "slug": "bard"}],
            "abilities": {
                "str": {"score": 10},
                "dex": {"score": 14},
                "con": {"score": 12},
                "int": {"score": 10},
                "wis": {"score": 10},
                "cha": {"score": 16},
            },
        },
    )
    svc = CharacterService(MagicMock())
    svc.characters = MagicMock()
    svc.characters.get_for_user.return_value = character
    svc.lobbies = MagicMock()
    svc.lobbies.list_open_session_ids_for_character.return_value = []
    svc.db = MagicMock()
    monkeypatch.setattr(svc, "_recompute_start_rules_mark", lambda *_a, **_k: None)
    monkeypatch.setattr(svc, "_broadcast_seated_sessions_changed", AsyncMock())
    monkeypatch.setattr(
        "app.services.character.to_detail",
        lambda *_args, **_kwargs: SimpleNamespace(id=character.id),
    )

    next_sheet = {
        "classes": [{"name": "Бард", "level": 1, "slug": "bard"}],
        "abilities": {
            "str": {"score": 10},
            "dex": {"score": 14},
            "con": {"score": 12},
            "int": {"score": 10},
            "wis": {"score": 10},
            "cha": {"score": 16},
        },
        "class_progress_2024": {},
    }
    asyncio.run(
        svc.update(
            _user(),
            character.id,
            CharacterUpdateRequest(sheet_version=1, sheet=next_sheet),
        )
    )
    progress = character.sheet["class_progress_2024"]
    bi = next(r for r in progress["resources"] if r["pool_id"] == "bardic_inspiration")
    assert bi["max"] == 3

    # CHA 8 → 1 via same API path
    character.sheet_version = 2
    next_sheet["abilities"]["cha"] = {"score": 8}
    asyncio.run(
        svc.update(
            _user(),
            character.id,
            CharacterUpdateRequest(sheet_version=2, sheet=next_sheet),
        )
    )
    bi2 = next(
        r
        for r in character.sheet["class_progress_2024"]["resources"]
        if r["pool_id"] == "bardic_inspiration"
    )
    assert bi2["max"] == 1


def test_eldritch_invocations_limit_and_prereqs():
    picks = opt.validate_eldritch_invocations(
        [
            "pact-of-the-blade",
            "agonizing-blast",
            "devils-sight",
            "thirsting-blade",
            "eldritch-smite",
        ],
        warlock_level=5,
    )
    assert len(picks) == 5
    assert "thirsting-blade" in picks

    with pytest.raises(e24.Edition2024ClassError) as exc:
        opt.validate_eldritch_invocations(
            ["thirsting-blade"],
            warlock_level=5,
        )
    assert exc.value.code == "invocation_pact"

    with pytest.raises(e24.Edition2024ClassError) as exc2:
        opt.validate_eldritch_invocations(
            ["armor-of-shadows"] * 6,
            warlock_level=5,
        )
    assert exc2.value.code in {"invocation_limit", "invocation_duplicate"}


def test_metamagic_limit_and_spend():
    known = opt.validate_metamagic(["careful", "quickened"], sorcerer_level=5)
    assert known == ["careful", "quickened"]
    assert opt.metamagic_known_limit(2) == 2
    assert opt.metamagic_known_limit(10) == 4
    assert opt.metamagic_known_limit(17) == 6

    with pytest.raises(e24.Edition2024ClassError) as exc:
        opt.validate_metamagic(["careful", "quickened", "subtle"], sorcerer_level=5)
    assert exc.value.code == "metamagic_limit"

    spent = opt.apply_metamagic_spend(
        known=known,
        option_id="quickened",
        sorcery_points_max=5,
        sorcery_points_used=3,
    )
    assert spent["cost"] == 2
    assert spent["new_used"] == 5

    with pytest.raises(e24.Edition2024ClassError) as exc2:
        opt.apply_metamagic_spend(
            known=known,
            option_id="quickened",
            sorcery_points_max=5,
            sorcery_points_used=4,
        )
    assert exc2.value.code == "metamagic_no_points"

    # 2024 costs: heightened=2, seeking=1, twinned=1
    assert opt.METAMAGIC_BY_ID["heightened"].cost == 2
    assert opt.METAMAGIC_BY_ID["seeking"].cost == 1
    assert opt.METAMAGIC_BY_ID["twinned"].cost == 1


def test_replicate_plans():
    plans = opt.validate_replicate_plans(
        ["bag-of-holding", "goggles-of-night"],
        artificer_level=2,
        plans_known_limit=4,
    )
    assert len(plans) == 2
    with pytest.raises(e24.Edition2024ClassError) as exc:
        opt.validate_replicate_plans(
            ["boots-of-speed"],
            artificer_level=2,
            plans_known_limit=4,
        )
    assert exc.value.code == "replicate_level"


def test_cunning_strike():
    ok = opt.resolve_cunning_strike(
        option_ids=["trip"],
        rogue_level=5,
        sneak_attack_dice=3,
        dex_mod=3,
        proficiency_bonus=3,
    )
    assert ok["dice_spent"] == 1
    assert ok["sneak_attack_dice_remaining"] == 2
    assert ok["effects"][0]["dc"] == 14

    with pytest.raises(e24.Edition2024ClassError) as exc:
        opt.resolve_cunning_strike(
            option_ids=["knock-out"],
            rogue_level=5,
            sneak_attack_dice=3,
            dex_mod=3,
            proficiency_bonus=3,
        )
    assert exc.value.code == "cunning_option_level"


def test_brutal_strike_and_rage():
    ok = opt.resolve_brutal_strike(
        option_ids=["forceful-blow"],
        barbarian_level=9,
        reckless_used=True,
        attack_has_advantage=True,
        attack_has_disadvantage=False,
    )
    assert ok["extra_damage"] == "1d10"
    assert ok["forgo_advantage"] is True

    start = opt.resolve_rage_start(wearing_heavy_armor=False)
    assert start["active"] is True
    ext = opt.resolve_rage_extend(rage_state=start, reason="attack")
    assert ext["rounds_extended"] == 1

    with pytest.raises(e24.Edition2024ClassError):
        opt.resolve_rage_start(wearing_heavy_armor=True)


def test_divine_sense_is_channel_option():
    snap = e24.compute_progression([{"slug": "paladin", "level": 3}])
    cd = next(r for r in snap.resources if r.pool_id == "channel_divinity")
    assert "divine_sense" in (cd.meta.get("channel_options") or [])
    # No separate divine_sense pool
    assert not any(r.pool_id == "divine_sense" for r in snap.resources)

    sense = opt.resolve_divine_sense_channel(channel_remaining=2)
    assert sense["spend_channel"] == 1
    assert sense["duration_minutes"] == 10


def test_validate_class_options_update_on_sheet():
    sheet = {
        "classes": [{"slug": "warlock", "level": 5, "subclass_slug": "warlock__fiend-patron"}],
        "abilities": {"cha": {"score": 16}},
    }
    out = opt.validate_class_options_update(
        rules_edition="2024",
        previous=None,
        incoming={
            "eldritch_invocations": [
                "pact-of-the-blade",
                "agonizing-blast",
                "devils-sight",
                "thirsting-blade",
                "repelling-blast",
            ]
        },
        sheet=sheet,
    )
    assert out is not None
    assert len(out["eldritch_invocations"]) == 5
    assert out["catalog"]["limits"]["warlock_invocations"] == 5

    with pytest.raises(e24.Edition2024ClassError):
        opt.validate_class_options_update(
            rules_edition="2014",
            previous=None,
            incoming={"metamagic": ["careful"]},
            sheet=sheet,
        )


def test_api_rejects_invalid_invocations(monkeypatch):
    character = SimpleNamespace(
        id=uuid4(),
        sheet_version=1,
        name="Морг",
        avatar_url=None,
        level=5,
        class_name="Колдун 5",
        race_name="Тифлинг",
        hp_current=30,
        hp_max=30,
        rules_edition="2024",
        is_draft=False,
        sheet={
            "classes": [{"slug": "warlock", "level": 5}],
            "abilities": {"cha": {"score": 16}},
        },
    )
    svc = CharacterService(MagicMock())
    svc.characters = MagicMock()
    svc.characters.get_for_user.return_value = character
    svc.lobbies = MagicMock()
    svc.lobbies.list_open_session_ids_for_character.return_value = []
    svc.db = MagicMock()
    monkeypatch.setattr(svc, "_recompute_start_rules_mark", lambda *_a, **_k: None)
    monkeypatch.setattr(svc, "_broadcast_seated_sessions_changed", AsyncMock())
    monkeypatch.setattr(
        "app.services.character.to_detail",
        lambda *_args, **_kwargs: SimpleNamespace(id=character.id),
    )

    with pytest.raises(AppError) as exc:
        asyncio.run(
            svc.update(
                _user(),
                character.id,
                CharacterUpdateRequest(
                    sheet_version=1,
                    sheet={
                        "classes": [{"slug": "warlock", "level": 5}],
                        "abilities": {"cha": {"score": 16}},
                        "class_options_2024": {
                            "eldritch_invocations": ["thirsting-blade"],  # no pact
                        },
                    },
                ),
            )
        )
    assert exc.value.code == "invocation_pact"
