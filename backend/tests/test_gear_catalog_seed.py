"""I21–I23, I31: gear catalog upsert plan and inventory rule refresh."""

from __future__ import annotations

from dataclasses import replace

import pytest

from app.services.gear_catalog_seed import (
    I22_ACTIVE_MAGIC_COUNT,
    I22_DEACTIVATE_SLUGS,
    WAND_ID,
    WAND_SLUG,
    GearRecord,
    active_magic_rows,
    diff_gear_catalog,
    gear_row_key,
    item_pack_insert_keys,
    planned_gear_rows,
    refresh_character_sheet,
    split_gear_waves_at_item_packs,
)


@pytest.fixture(scope="module")
def planned() -> list[GearRecord]:
    return planned_gear_rows()


def _by_slug(rows: list[GearRecord], slug: str) -> GearRecord:
    found = [row for row in rows if row.slug == slug]
    assert len(found) == 1, slug
    return found[0]


def test_one_row_per_kind_slug(planned: list[GearRecord]) -> None:
    keys = [(row.kind, row.edition, row.slug) for row in planned]
    assert len(keys) == len(set(keys))


def test_active_magic_count_after_i22(planned: list[GearRecord]) -> None:
    """I22 locks 445 active magic rows. Later gear_i* waves may only add inserts."""
    before, _after = split_gear_waves_at_item_packs()
    baseline_rows = planned_gear_rows(before)
    baseline = active_magic_rows(baseline_rows)
    assert len(baseline) == I22_ACTIVE_MAGIC_COUNT
    base_keys = {gear_row_key(row) for row in baseline}
    baseline_keys = {gear_row_key(row) for row in baseline_rows}
    magic = active_magic_rows(planned)
    magic_keys = {gear_row_key(row) for row in magic}
    assert base_keys <= magic_keys
    added = magic_keys - base_keys
    new_inserts = item_pack_insert_keys() - baseline_keys
    final_keys = {gear_row_key(row) for row in planned}
    assert new_inserts <= final_keys
    assert added == {key for key in new_inserts if key in magic_keys}
    assert len(magic) == I22_ACTIVE_MAGIC_COUNT + len(added)
    hidden = [row for row in planned if row.slug in I22_DEACTIVATE_SLUGS]
    assert len(hidden) == 13
    assert all(not row.is_active for row in hidden)
    assert all(row.kind == "item" for row in hidden)


def test_viscid_globs_wand_keeps_id_and_slug(planned: list[GearRecord]) -> None:
    wand = _by_slug(planned, WAND_SLUG)
    assert wand.id == WAND_ID
    assert wand.is_active
    assert wand.name_ru == "Волшебная палочка вязких шаров"
    assert wand.name_en == "Wand of Viscid Globs"
    assert wand.source == "OotA 2014"
    assert wand.data["rarity"] == "rare"
    assert wand.data["requires_attunement"] is True
    assert wand.data["magic_item_type_ru"] == "Волшебная палочка"
    assert wand.data["source_book"] == "OotA"
    assert wand.data["charges"] == {
        "max": 7,
        "restore": "midnight",
        "recharge_dice": "1d6+1",
    }
    assert "Палочка вязкой слизи" not in {row.name_ru for row in planned if row.is_active}
    assert "Wand of Viscous Goop" not in {row.name_en for row in planned if row.is_active}


def test_spell_scrolls_cantrip_through_nine_once(planned: list[GearRecord]) -> None:
    expected = ["spell_scroll_cantrip", *[f"spell_scroll_{level}" for level in range(1, 10)]]
    found = [row for row in planned if row.slug in expected]
    assert sorted(row.slug for row in found) == sorted(expected)
    assert len({row.id for row in found}) == 10
    assert all(row.is_active and row.kind == "item" for row in found)


def test_family_parent_slug_replaces_variant(planned: list[GearRecord]) -> None:
    slugs = {row.slug for row in planned}
    assert "bag_of_tricks" in slugs
    assert "bag_of_tricks_gray" not in slugs
    parent = _by_slug(planned, "bag_of_tricks")
    assert parent.data["family_slug"] == "bag_of_tricks"


def test_historical_stubs_stay_inactive(planned: list[GearRecord]) -> None:
    weapon = _by_slug(planned, "weapon")
    armor = _by_slug(planned, "armor")
    assert weapon.kind == "weapon" and not weapon.is_active
    assert armor.kind == "armor" and not armor.is_active
    for slug in (
        "potion_of_hill_giant_strength",
        "potion_of_fire_giant_strength",
        "potion_of_cloud_giant_strength",
    ):
        assert not _by_slug(planned, slug).is_active


def test_i22_rows_turn_off_once(planned: list[GearRecord]) -> None:
    active = [
        replace(row, is_active=True) if row.slug in I22_DEACTIVATE_SLUGS else row
        for row in planned
    ]
    changes, stats = diff_gear_catalog(active)
    assert stats.inserted == 0
    assert stats.deactivated == 13
    assert stats.updated == 13
    written = {change.row.id: change.row for change in changes}
    assert {row.slug for row in written.values()} == set(I22_DEACTIVATE_SLUGS)
    assert all(not row.is_active for row in written.values())
    by_id = {row.id: row for row in active}
    by_id.update(written)
    _again, second = diff_gear_catalog(list(by_id.values()))
    assert second.inserted == 0
    assert second.updated == 0
    assert second.deactivated == 0


def test_second_plan_against_result_changes_nothing(planned: list[GearRecord]) -> None:
    _changes, stats = diff_gear_catalog(planned)
    assert stats.inserted == 0
    assert stats.updated == 0
    assert stats.deactivated == 0
    assert stats.unchanged == len(planned)


def test_repeat_apply_keeps_extra_data_keys(planned: list[GearRecord]) -> None:
    longsword = _by_slug(planned, "longsword")
    edited = replace(
        longsword,
        name_ru="Старое имя",
        data={**longsword.data, "gm_note": "не из JSON"},
    )
    others = [row for row in planned if row.slug != "longsword" or row.kind != longsword.kind]
    first, stats = diff_gear_catalog([*others, edited])
    assert stats.inserted == 0
    assert stats.updated == 1
    assert stats.deactivated == 0
    written = next(change.row for change in first if change.row.slug == "longsword")
    assert written.name_ru == longsword.name_ru
    assert written.data["gm_note"] == "не из JSON"
    assert written.id == longsword.id
    second_changes, second = diff_gear_catalog([*others, written])
    assert second_changes == []
    assert second.updated == 0
    assert second.inserted == 0
    assert second.deactivated == 0


def _catalog(*rows: GearRecord) -> list[GearRecord]:
    return list(rows)


def _row(**kwargs: object) -> GearRecord:
    base = dict(
        id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        kind="item",
        slug="hat_of_beats",
        edition="2014",
        name_ru="Шляпа ритма",
        name_en="Hat of Beats",
        source="AI 2014",
        sort_order=1,
        is_active=False,
        parent_id=None,
        external_ref=None,
        data={
            "effects": [{"type": "custom_note", "text": "новое правило"}],
            "requires_attunement": False,
            "wear_slot": "head",
        },
    )
    base.update(kwargs)
    return GearRecord(**base)  # type: ignore[arg-type]


def test_refresh_updates_rules_and_keeps_player_fields() -> None:
    catalog = _row()
    item = {
        "id": "item-1",
        "name": "Моя шляпа",
        "catalog_id": catalog.id,
        "catalog_slug": catalog.slug,
        "qty": 3,
        "equipped": True,
        "notes": "подарок",
        "parent_id": "pack-1",
        "effects": [{"type": "custom_note", "text": "старое"}],
        "requires_attunement": True,
        "wear_slot": "none",
        "player_flag": "keep",
    }
    weapons = [{"id": "atk-1", "inventory_item_id": "item-1", "name": "Моя шляпа", "held": True}]
    attunements = [{"id": "slot-1", "item_id": "item-1", "name": "Моя шляпа"}]
    sheet = {
        "inventory": {"items": [item], "coins": {"gp": 5}, "notes": "кошель"},
        "weapons": weapons,
        "attunements": attunements,
        "resources": [],
    }
    updated, changed = refresh_character_sheet(sheet, _catalog(catalog))
    assert changed == 1
    refreshed = updated["inventory"]["items"][0]
    assert refreshed["effects"] == catalog.data["effects"]
    assert refreshed["requires_attunement"] is False
    assert refreshed["wear_slot"] == "head"
    assert refreshed["name"] == "Моя шляпа"
    assert refreshed["qty"] == 3
    assert refreshed["equipped"] is True
    assert refreshed["notes"] == "подарок"
    assert refreshed["parent_id"] == "pack-1"
    assert refreshed["player_flag"] == "keep"
    assert updated["weapons"] == weapons
    assert updated["attunements"] == attunements
    assert updated["inventory"]["coins"] == {"gp": 5}
    assert updated["inventory"]["notes"] == "кошель"
    again, again_changed = refresh_character_sheet(updated, _catalog(catalog))
    assert again_changed == 0
    assert again is updated


def test_refresh_skips_rows_without_catalog_id() -> None:
    catalog = _row()
    item = {
        "id": "loose",
        "name": "Шляпа ритма",
        "catalog_id": None,
        "catalog_slug": catalog.slug,
        "qty": 1,
        "effects": [{"type": "custom_note", "text": "своё"}],
        "notes": "заметка",
    }
    sheet = {"inventory": {"items": [item]}}
    updated, changed = refresh_character_sheet(sheet, _catalog(catalog))
    assert changed == 0
    assert updated is sheet
    assert item["effects"][0]["text"] == "своё"


def test_scroll_spell_name_and_qty_survive_rule_refresh() -> None:
    catalog = _row(
        id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        slug="spell_scroll_3",
        name_ru="Свиток 3 уровня",
        name_en="Spell Scroll (3rd)",
        data={
            "effects": [{"type": "custom_note", "text": "правило свитка"}],
            "requires_attunement": False,
            "wear_slot": "none",
            "rarity": "uncommon",
        },
    )
    scroll_spell = {
        "catalog_id": "spell-fireball",
        "slug": "fireball",
        "name": "Огненный шар",
        "level": 3,
        "school": "evocation",
        "ritual": False,
        "concentration": True,
    }
    item = {
        "id": "scroll-1",
        "name": "Свиток: Огненный шар (3 ур.)",
        "catalog_id": catalog.id,
        "catalog_slug": catalog.slug,
        "qty": 2,
        "notes": "из сундука",
        "equipped": False,
        "parent_id": None,
        "effects": [],
        "scroll_spell": scroll_spell,
    }
    sheet = {"inventory": {"items": [item]}, "weapons": [{"id": "not-a-scroll"}]}
    updated, changed = refresh_character_sheet(sheet, _catalog(catalog))
    assert changed == 1
    refreshed = updated["inventory"]["items"][0]
    assert refreshed["scroll_spell"] == scroll_spell
    assert refreshed["name"] == "Свиток: Огненный шар (3 ур.)"
    assert refreshed["qty"] == 2
    assert refreshed["notes"] == "из сундука"
    assert refreshed["effects"] == catalog.data["effects"]
    assert updated["weapons"] == [{"id": "not-a-scroll"}]


def test_charges_clamp_only_down_and_keep_remaining() -> None:
    catalog = _row(
        id="cccccccc-cccc-cccc-cccc-cccccccccccc",
        slug=WAND_SLUG,
        data={
            "effects": [{"type": "resource", "id": "wand_goo", "max": 4, "restore": "midnight"}],
            "requires_attunement": True,
            "wear_slot": "none",
        },
    )
    item = {
        "id": "wand-1",
        "name": "Палочка вязкой слизи",
        "catalog_id": catalog.id,
        "qty": 1,
        "equipped": True,
        "effects": [{"type": "resource", "id": "wand_goo", "max": 7, "restore": "dawn"}],
    }
    other = {
        "id": "other-pool",
        "name": "Чужой ресурс",
        "max": 9,
        "used": 1,
        "track": "spend",
    }
    sheet = {
        "inventory": {"items": [item]},
        "resources": [
            {"id": "gear-res:wand-1:wand_goo", "name": "Заряды", "max": 7, "used": 2, "track": "spend"},
            other,
        ],
        "attunements": [{"id": "s", "item_id": "wand-1"}],
    }
    updated, changed = refresh_character_sheet(sheet, _catalog(catalog))
    assert changed == 1
    pool = updated["resources"][0]
    # remaining was 5, new max is 4 → remaining 4, used 0
    assert pool["max"] == 4
    assert pool["used"] == 0
    assert updated["resources"][1] == other
    assert updated["inventory"]["items"][0]["name"] == "Палочка вязкой слизи"
    assert updated["inventory"]["items"][0]["equipped"] is True
    assert updated["attunements"] == [{"id": "s", "item_id": "wand-1"}]

    grown = _row(
        id=catalog.id,
        slug=WAND_SLUG,
        data={
            "effects": [{"type": "resource", "id": "wand_goo", "max": 10, "restore": "midnight"}],
            "requires_attunement": True,
            "wear_slot": "none",
        },
    )
    raised, _raised_changed = refresh_character_sheet(updated, _catalog(grown))
    raised_pool = raised["resources"][0]
    assert raised_pool["max"] == 10
    assert raised_pool["used"] == 6  # remaining stays 4

    stock_catalog = _row(
        id="dddddddd-dddd-dddd-dddd-dddddddddddd",
        slug="stock_item",
        data={
            "effects": [{"type": "resource", "id": "stock", "max": 3}],
            "requires_attunement": False,
        },
    )
    stock_sheet = {
        "inventory": {
            "items": [
                {
                    "id": "stock-1",
                    "name": "Запас",
                    "catalog_id": stock_catalog.id,
                    "qty": 4,
                    "effects": [{"type": "resource", "id": "stock", "max": 7}],
                }
            ]
        },
        "resources": [
            {"id": "gear-res:stock-1:stock", "max": 7, "used": 5, "track": "stock"},
        ],
    }
    stock_updated, _stock_changed = refresh_character_sheet(stock_sheet, _catalog(stock_catalog))
    assert stock_updated["resources"][0]["max"] == 3
    assert stock_updated["resources"][0]["used"] == 3
    assert stock_updated["inventory"]["items"][0]["qty"] == 4


def test_armor_rules_refresh_without_touching_equip() -> None:
    catalog = _row(
        id="eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
        kind="armor",
        slug="plate_1",
        name_ru="Латы +1",
        data={
            "armor_kind": "heavy",
            "base_ac": 19,
            "max_dex_bonus": 0,
            "strength_requirement": 15,
            "effects": [{"type": "ac_bonus", "value": 1}],
            "requires_attunement": False,
            "wear_slot": "body_armor",
            "attunement_classes": ["fighter"],
        },
    )
    sheet = {
        "inventory": {
            "items": [
                {
                    "id": "armor-1",
                    "name": "Мои латы",
                    "catalog_id": catalog.id.upper(),
                    "qty": 1,
                    "equipped": True,
                    "armor_kind": "heavy",
                    "base_ac": 18,
                    "max_dex_bonus": 0,
                    "strength_requirement": 15,
                    "effects": [],
                    "notes": "",
                }
            ]
        }
    }
    updated, changed = refresh_character_sheet(sheet, _catalog(catalog))
    assert changed == 1
    item = updated["inventory"]["items"][0]
    assert item["base_ac"] == 19
    assert item["effects"] == [{"type": "ac_bonus", "value": 1}]
    assert item["attunement_classes"] == ["fighter"]
    assert item["equipped"] is True
    assert item["name"] == "Мои латы"
    assert item["qty"] == 1


def test_stale_catalog_id_falls_back_to_unique_slug() -> None:
    catalog = _row()
    sheet = {
        "inventory": {
            "items": [
                {
                    "id": "item-1",
                    "name": "Шляпа",
                    "catalog_id": "missing-id",
                    "catalog_slug": catalog.slug,
                    "effects": [],
                    "qty": 1,
                }
            ]
        }
    }
    updated, changed = refresh_character_sheet(sheet, _catalog(catalog))
    assert changed == 1
    assert updated["inventory"]["items"][0]["effects"] == catalog.data["effects"]
    assert updated["inventory"]["items"][0]["name"] == "Шляпа"


def test_ambiguous_slug_does_not_guess() -> None:
    left = _row(id="11111111-1111-1111-1111-111111111111", slug="shared")
    right = _row(id="22222222-2222-2222-2222-222222222222", slug="shared")
    item = {
        "id": "item-1",
        "name": "Неясно",
        "catalog_id": "missing",
        "catalog_slug": "shared",
        "effects": [{"type": "custom_note", "text": "как было"}],
        "qty": 1,
    }
    sheet = {"inventory": {"items": [item]}}
    updated, changed = refresh_character_sheet(sheet, _catalog(left, right))
    assert changed == 0
    assert updated is sheet


def test_i06_bases_and_dmg_cards(planned: list[GearRecord]) -> None:
    weapon = _by_slug(planned, "weapon_1")
    allowed = weapon.data["allowed_base_weapon"]
    assert "dagger" in allowed
    assert "net" in allowed
    armor = _by_slug(planned, "armor_1")
    assert "chain_mail" in armor.data["allowed_base_armor"]
    assert "shield" not in armor.data["allowed_base_armor"]
    adamantine = _by_slug(planned, "adamantine_armor")
    assert "hide_armor" not in adamantine.data["allowed_base_armor"]
    assert "leather_armor" not in adamantine.data["allowed_base_armor"]
    assert "chain_mail" in adamantine.data["allowed_base_armor"]
    assert _by_slug(planned, "armor_of_vulnerability").data.get("allowed_base_armor") is None
    mithral = _by_slug(planned, "mithral_armor")
    assert mithral.data["clear_stealth_disadvantage"] is True
    assert mithral.data["clear_strength_requirement"] is True
    warning = _by_slug(planned, "weapon_of_warning")
    assert warning.kind == "item"
    assert "longsword" in warning.data["allowed_base_weapon"]

    for slug in (
        "rope_of_entanglement",
        "efreeti_bottle",
        "wave",
        "ammunition_2",
        "shield_plus_1",
        "belt_of_giant_strength_frost",
        "ioun_stone_agility",
        "mantle_of_spell_resistance",
    ):
        assert _by_slug(planned, slug).is_active
    bards = [
        "instrument_of_the_bards_doss_lute",
        "instrument_of_the_bards_canaith",
        "instrument_of_the_bards_cli",
        "instrument_of_the_bards_fochlucan",
        "instrument_of_the_bards_mac_fuirmidh",
        "instrument_of_the_bards_anstruth",
        "instrument_of_the_bards_ollamh",
    ]
    assert all(_by_slug(planned, slug).data.get("attunement_classes") == ["bard"] for slug in bards)
    wand = _by_slug(planned, "wand_of_the_war_mage_1")
    assert wand.data["effects"][0] == {
        "type": "spellcasting_bonus",
        "value": 1,
        "applies_to": "attack",
    }
    rod = _by_slug(planned, "rod_of_the_pact_keeper_1")
    assert rod.data["attunement_classes"] == ["warlock"]
    assert rod.data["effects"][0]["applies_to"] == "both"
    frost = _by_slug(planned, "belt_of_giant_strength_frost")
    assert frost.data["single_attunement_family"] is True
    assert frost.data["effects"] == [{"type": "ability_score", "ability": "str", "value": 23}]


def test_i07_xge_tce_settings_cards(planned: list[GearRecord]) -> None:
    """I26/I27: missing XGE, TCE and setting cards, with I06 bases and I03 bonuses."""
    drum = _by_slug(planned, "rhythm_makers_drum_1")
    assert drum.data["requires_attunement"] is True
    assert drum.data["attunement_classes"] == ["bard"]
    assert drum.data["variant_key"] == "1"
    assert drum.data["family_slug"]
    bonus = next(row for row in drum.data["effects"] if row["type"] == "spellcasting_bonus")
    assert bonus == {
        "type": "spellcasting_bonus",
        "value": 1,
        "applies_to": "both",
        "requires_held": True,
        "class_scoped": True,
    }
    assert _by_slug(planned, "rhythm_makers_drum_2").data["rarity"] == "rare"
    assert _by_slug(planned, "rhythm_makers_drum_3").data["rarity"] == "very_rare"

    archive = _by_slug(planned, "astromancy_archive")
    assert archive.data["rarity"] == "rare"
    assert archive.data["requires_attunement"] is True
    assert archive.data["attunement_classes"] == ["wizard"]
    assert archive.data["is_spell_focus"] is True
    assert not any(row["type"] == "spellcasting_bonus" for row in archive.data["effects"])

    bead = _by_slug(planned, "bead_of_nourishment")
    assert bead.data["rarity"] == "common"
    assert bead.data["requires_attunement"] is False

    armor = _by_slug(planned, "mizzium_armor")
    assert armor.kind == "armor"
    assert armor.data["rarity"] == "rare"
    assert armor.data["requires_attunement"] is False
    assert "hide_armor" not in armor.data["allowed_base_armor"]
    assert "leather_armor" not in armor.data["allowed_base_armor"]
    assert "chain_mail" in armor.data["allowed_base_armor"]
    assert "breastplate" in armor.data["allowed_base_armor"]

    gloves = _by_slug(planned, "living_gloves")
    assert gloves.data["rarity"] == "uncommon"
    assert gloves.data["requires_attunement"] is True

    for slug, rarity in (
        ("slumbering_dragon_vessel", "uncommon"),
        ("stirring_dragon_vessel", "rare"),
        ("wakened_dragon_vessel", "very_rare"),
        ("ascendant_dragon_vessel", "legendary"),
    ):
        vessel = _by_slug(planned, slug)
        assert vessel.data["rarity"] == rarity
        assert vessel.data["requires_attunement"] is True
        assert vessel.data["single_attunement_family"] is True

    orb = _by_slug(planned, "murgaxors_orb")
    assert orb.data["rarity"] == "legendary"
    assert orb.data["requires_attunement"] is True
    book = _by_slug(planned, "grimoire_infinitus_dormant")
    assert book.data["rarity"] == "legendary"
    assert book.data["attunement_classes"] == ["wizard"]
    assert book.data["single_attunement_family"] is True

    wrath = _by_slug(planned, "stirring_dragons_wrath_weapon")
    assert wrath.kind == "weapon"
    assert "longsword" in wrath.data["allowed_base_weapon"]
    assert "net" in wrath.data["allowed_base_weapon"]
    assert wrath.data["magic_bonus"] == 1
    cast_off = _by_slug(planned, "cast_off_armor")
    assert cast_off.kind == "armor"
    assert "shield" not in cast_off.data["allowed_base_armor"]
    assert "plate_armor" in cast_off.data["allowed_base_armor"]
    acheron = _by_slug(planned, "acheron_blade")
    assert set(acheron.data["allowed_base_weapon"]) == {
        "shortsword",
        "longsword",
        "scimitar",
        "greatsword",
        "rapier",
    }

    hidden = [row for row in planned if row.slug in I22_DEACTIVATE_SLUGS]
    assert len(hidden) == 13
    assert all(not row.is_active for row in hidden)


def test_i08_other_books_part_one(planned: list[GearRecord]) -> None:
    """I33 part 1: adventure and side-book cards, with I06 bases and I02 families."""
    amulet = _by_slug(planned, "sanctum_amulet")
    assert amulet.data["rarity"] == "very_rare"
    assert amulet.data["requires_attunement"] is True
    assert amulet.data["source_book"] == "BPGG"
    assert {"type": "resistance", "damage_type": "necrotic"} in amulet.data["effects"]

    rapier = _by_slug(planned, "vicious_rapier_1")
    assert rapier.kind == "weapon"
    assert rapier.name_ru == "Жестокая рапира +1"
    assert rapier.data["rarity"] == "rare"
    assert rapier.data["requires_attunement"] is False
    assert rapier.data["base_weapon_slug"] == "rapier"
    assert rapier.data["magic_bonus"] == 1
    assert {"type": "attack_bonus", "value": 1} in rapier.data["effects"]
    assert {"type": "damage_bonus", "value": 1} in rapier.data["effects"]
    assert rapier.data.get("allowed_base_weapon") is None

    circlet = _by_slug(planned, "circlet_of_human_perfection")
    assert circlet.data["rarity"] == "uncommon"
    assert circlet.data["requires_attunement"] is True
    rod = _by_slug(planned, "rod_of_the_vonindod")
    assert rod.data["rarity"] == "rare"
    assert rod.data["requires_attunement"] is True
    assert rod.data["charges"]["max"] == 10
    abracadabrus = _by_slug(planned, "abracadabrus")
    assert abracadabrus.data["rarity"] == "very_rare"
    assert abracadabrus.data["requires_attunement"] is False

    hellfire = _by_slug(planned, "hellfire_weapon")
    assert hellfire.kind == "weapon"
    assert hellfire.data["rarity"] == "uncommon"
    assert hellfire.data["requires_attunement"] is False
    assert "longsword" in hellfire.data["allowed_base_weapon"]
    assert "dagger" in hellfire.data["allowed_base_weapon"]
    assert "net" in hellfire.data["allowed_base_weapon"]

    bloodshed = _by_slug(planned, "bloodshed_blade")
    assert set(bloodshed.data["allowed_base_weapon"]) == {
        "shortsword",
        "longsword",
        "scimitar",
        "rapier",
        "greatsword",
    }
    jewel = _by_slug(planned, "jewel_of_three_prayers_awakened")
    assert jewel.data["family_slug"] == "jewel_of_three_prayers"
    assert jewel.data["single_attunement_family"] is True
    assert jewel.data["variant_key"] == "awakened"
    assert _by_slug(planned, "jewel_of_three_prayers_exalted").data["single_attunement_family"] is True
    rose = _by_slug(planned, "red_chromatic_rose")
    assert rose.data.get("single_attunement_family") is not True
    assert rose.data["family_slug"] == "chromatic_rose"

    story = _by_slug(planned, "the_codicil_of_white")
    assert story.data["rarity"] == "none"
    assert story.data["story_item"] is True
    assert story.is_active

    hidden = [row for row in planned if row.slug in I22_DEACTIVATE_SLUGS]
    assert len(hidden) == 13
    assert all(not row.is_active for row in hidden)
    assert _by_slug(planned, WAND_SLUG).name_en == "Wand of Viscid Globs"


def test_i06_refresh_keeps_chosen_base_and_stamps_legacy(planned: list[GearRecord]) -> None:
    weapon = _by_slug(planned, "weapon_1")
    armor = _by_slug(planned, "armor_1")
    chosen = {
        "id": "w1",
        "name": "Кинжал +1",
        "catalog_id": weapon.id,
        "catalog_slug": "weapon_1",
        "base_weapon_slug": "dagger",
        "effects": [],
        "qty": 1,
        "equipped": True,
        "notes": "мой",
    }
    sheet = {"inventory": {"items": [chosen], "notes": ""}, "resources": []}
    updated, _changed = refresh_character_sheet(sheet, planned)
    row = updated["inventory"]["items"][0]
    assert row["base_weapon_slug"] == "dagger"
    assert row["name"] == "Кинжал +1"
    assert row["notes"] == "мой"
    assert "dagger" in row["allowed_base_weapon"]
    again, again_changed = refresh_character_sheet(updated, planned)
    assert again_changed == 0

    legacy = {
        "id": "old",
        "name": "Оружие +1",
        "catalog_id": weapon.id,
        "effects": [{"type": "attack_bonus", "value": 1}],
    }
    stamped, _ = refresh_character_sheet({"inventory": {"items": [legacy]}, "resources": []}, planned)
    assert stamped["inventory"]["items"][0]["base_weapon_slug"] == "longsword"

    chain = {
        "id": "a1",
        "name": "Кольчуга +1",
        "catalog_id": armor.id,
        "base_armor_slug": "chain_mail",
        "base_ac": 16,
        "armor_kind": "heavy",
        "strength_requirement": 13,
        "max_dex_bonus": 0,
    }
    kept_sheet, _ = refresh_character_sheet(
        {"inventory": {"items": [chain]}, "resources": []},
        planned,
    )
    kept = kept_sheet["inventory"]["items"][0]
    assert kept["base_ac"] == 16
    assert kept["strength_requirement"] == 13
    assert kept["base_armor_slug"] == "chain_mail"
    _again_armor, armor_changed = refresh_character_sheet(kept_sheet, planned)
    assert armor_changed == 0
