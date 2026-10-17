from app.dnd.encounter_budget import (
    EncounterDifficulty,
    budget_adjusted,
    budget_base,
    encounter_xp_cost,
    monster_count_multiplier,
    threshold_for_level,
)
from app.dnd.encounter_themes import (
    expand_theme_ids,
    monster_matches_themes,
)
from app.dnd.party_power import PartyPowerSignals, compute_party_power


def test_dmg_threshold_level_5_deadly() -> None:
    assert threshold_for_level(5, EncounterDifficulty.deadly) == 1100


def test_budget_base_sums_party() -> None:
    # 4× level 5 medium = 4×500
    assert budget_base([5, 5, 5, 5], EncounterDifficulty.medium) == 2000


def test_party_power_raises_budget() -> None:
    base = budget_base([5, 5, 5, 5], EncounterDifficulty.hard)
    boosted = budget_adjusted([5, 5, 5, 5], EncounterDifficulty.hard, party_power=1.4)
    assert boosted > base
    assert boosted == int(round(base * 1.4))


def test_monster_count_multiplier() -> None:
    assert monster_count_multiplier(1) == 1.0
    assert monster_count_multiplier(2) == 1.5
    assert monster_count_multiplier(4) == 2.0
    assert monster_count_multiplier(8) == 2.5
    assert encounter_xp_cost(50, 4) == int(round(200 * 2.0))


def test_theme_or_multiselect() -> None:
    assert monster_matches_themes(
        type_en="undead", subtype=None, theme_ids=["undead", "orc"]
    )
    assert monster_matches_themes(
        type_en="humanoid", subtype="орк", theme_ids=["undead", "orc"]
    )
    assert not monster_matches_themes(
        type_en="beast", subtype=None, theme_ids=["undead", "orc"]
    )


def test_similar_expands_orc_family() -> None:
    exact = expand_theme_ids(["orc"], similar=False)
    assert exact == {"orc"}
    wide = expand_theme_ids(["orc"], similar=True)
    assert "goblinoid" in wide and "kobold" in wide


def test_race_themes_elf_human_tiefling() -> None:
    assert monster_matches_themes(
        type_en="humanoid", subtype="эльф", theme_ids=["elf"]
    )
    assert not monster_matches_themes(
        type_en="humanoid", subtype="полуэльф", theme_ids=["elf"]
    )
    assert monster_matches_themes(
        type_en="humanoid", subtype="человек", theme_ids=["human"]
    )
    assert monster_matches_themes(
        type_en="humanoid", subtype="тифлинг", theme_ids=["tiefling"]
    )
    wide = expand_theme_ids(["elf"], similar=True)
    assert monster_matches_themes(
        type_en="humanoid", subtype="полуэльф", theme_ids=wide
    )


def test_party_power_clamped_and_grows() -> None:
    weak = compute_party_power(PartyPowerSignals())
    strong = compute_party_power(
        PartyPowerSignals(
            hp_ratio=1.4,
            ac_delta=4,
            slot_richness=0.8,
            resource_ready=0.7,
            attunement_avg=2.0,
            consumable_ready=0.5,
            companion_count=2,
            has_concentration_buff=True,
            dpr_quantile=0.8,
        )
    )
    assert weak == 1.0
    assert strong > 1.3
    assert strong <= 2.2
