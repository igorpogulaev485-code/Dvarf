"""P24-M03: 2024 character creation validation + API finalize."""

from __future__ import annotations

import re
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.config import settings
from app.core.exceptions import AppError
from app.dnd import edition_2024_create as create24
from app.dnd import weapon_mastery as wm
from app.dnd.edition_2024_languages import LANGUAGE_CHOICE_COUNT, COMMON_LANGUAGE_ID
from app.models.character import RulesEdition
from app.schemas.character_create_2024 import CharacterCreate2024Request
from app.services.character import CharacterService


CLASS_SLUGS = [
    "barbarian",
    "bard",
    "cleric",
    "druid",
    "fighter",
    "monk",
    "paladin",
    "ranger",
    "rogue",
    "sorcerer",
    "warlock",
    "wizard",
    "artificer",
]

# Varied backgrounds / species for parametrized creates.
BG_BY_CLASS = {
    "barbarian": "soldier",
    "bard": "entertainer",
    "cleric": "acolyte",
    "druid": "guide",
    "fighter": "soldier",
    "monk": "artisan",
    "paladin": "noble",
    "ranger": "guide",
    "rogue": "criminal",
    "sorcerer": "hermit",
    "warlock": "charlatan",
    "wizard": "sage",
    "artificer": "artisan",
}

SPECIES_BY_CLASS = {
    "barbarian": "goliath",
    "bard": "tiefling",
    "cleric": "human",
    "druid": "elf",
    "fighter": "dwarf",
    "monk": "halfling",
    "paladin": "dragonborn",
    "ranger": "orc",
    "rogue": "gnome",
    "sorcerer": "tiefling",
    "warlock": "human",
    "wizard": "elf",
    "artificer": "warforged",
}


def _spell_pick(class_slug: str, level: int, n: int) -> list[str]:
    out: list[str] = []
    for slug, row in create24.load_spell_catalog().items():
        data = row.get("data") or {}
        classes = data.get("classes") or []
        lv = data.get("level")
        if lv is None:
            continue
        if int(lv) == level and class_slug in classes:
            out.append(slug)
        if len(out) >= n:
            break
    return out


def wizard_book_for_level(level: int, *, include_circle: int | None = None) -> list[str]:
    """Wizard create-at-N book: 6 first-circle starters + 2×(n−1) higher picks."""
    need = 6 + 2 * max(0, int(level) - 1)
    l1 = _spell_pick("wizard", 1, max(12, need))
    book = list(l1[:6])
    if include_circle and include_circle > 1:
        higher = _spell_pick("wizard", include_circle, 4)
        book.extend(higher[:2])
    circle = 2
    while len(book) < need and circle <= 9:
        for slug in _spell_pick("wizard", circle, 8):
            if slug not in book:
                book.append(slug)
            if len(book) >= need:
                break
        circle += 1
    return book[:need]


def _melee_weapons(n: int) -> list[str]:
    out: list[str] = []
    for slug, row in wm.load_weapon_catalog_index().items():
        if row.range_kind == "melee":
            out.append(slug)
        if len(out) >= n:
            break
    return out


def _any_weapons(n: int) -> list[str]:
    return list(wm.load_weapon_catalog_index().keys())[:n]


def _species_picks(species_slug: str) -> dict:
    species = create24.load_species_catalog()[species_slug]
    data = species.get("data") or {}
    out: dict = {}
    sizes = [str(x).lower() for x in (data.get("size_options") or [])]
    if sizes:
        out["species_size"] = sizes[0]
    elif data.get("size"):
        out["species_size"] = str(data["size"]).lower()
    lineages = data.get("lineages") if isinstance(data.get("lineages"), list) else []
    if data.get("lineage_required") or lineages:
        first = lineages[0]
        out["species_lineage_id"] = str(first.get("id") or first.get("slug"))
    if data.get("draconic_ancestry"):
        out["species_ancestry_id"] = "fire"
    return out


def _background_tool(bg_slug: str) -> str | None:
    bg = create24.load_background_catalog()[bg_slug]
    data = bg.get("data") or {}
    fixed = data.get("tool_proficiencies") or []
    if fixed:
        return None
    choices = data.get("tool_choices")
    if not choices:
        return None
    pool = create24._tool_choice_pool(choices if isinstance(choices, dict) else None)
    if pool:
        return pool[0]
    return "dice-set"


def _origin_feat_nested(feat_slug: str) -> dict:
    slug = str(feat_slug or "")
    if slug == "magic-initiate":
        return {
            "list": ["wizard"],
            "cantrips": _spell_pick("wizard", 0, 2),
            "spell": _spell_pick("wizard", 1, 1),
            "ability": ["int"],
        }
    if slug == "skilled":
        return {"skilled": ["athletics", "stealth", "persuasion"]}
    if slug == "crafter":
        return {
            "tools": [
                "alchemists-supplies",
                "smiths-tools",
                "tinkers-tools",
            ]
        }
    if slug == "musician":
        return {"instruments": ["lute", "flute", "drum"]}
    if slug == "harper-agent":
        return {"instruments": ["lute"]}
    if slug == "portal-jumper":
        return {"damage": ["psychic"]}
    if slug == "purple-dragon-rook":
        return {"skill": ["insight"]}
    return {}


def _origin_feat_fields(bg_slug: str) -> dict:
    bg = create24.load_background_catalog()[bg_slug]
    feat = (bg.get("data") or {}).get("origin_feat") or {}
    slug = str(feat.get("slug") or feat.get("id") or "")
    out: dict = {}
    nested = _origin_feat_nested(slug)
    if slug == "magic-initiate":
        out["origin_feat_list"] = "wizard"
        out["origin_feat_cantrips"] = nested["cantrips"]
        out["origin_feat_spell_id"] = nested["spell"][0]
    elif slug == "skilled":
        out["origin_feat_skilled"] = nested["skilled"]
    out["_origin_feat_picks"] = nested
    out["_origin_feat_slug"] = slug
    return out


def _species_client_picks(species_slug: str) -> dict:
    from app.dnd import edition_2024_origin_feats as ofeats

    out: dict = {}
    rule = ofeats.SPECIES_SKILL_RULES.get(species_slug)
    if rule:
        allowed = (
            sorted(create24.SKILL_IDS)
            if rule["from"] == "any"
            else list(rule["from"])
        )
        out["skills"] = allowed[: int(rule["count"])]
    if species_slug in ofeats.SPECIES_TOOL_RULES:
        out["tools"] = ["smiths-tools"]
    if species_slug in ofeats.SPECIES_SKILL_OR_TOOL:
        out["skill_or_tool"] = ["athletics"]
    damage_rule = ofeats.SPECIES_DAMAGE_RULES.get(species_slug)
    if damage_rule:
        out["damage"] = [sorted(damage_rule)[0]]
    if species_slug == "shifter":
        out["form"] = ["beasthide"]
    if species_slug in ofeats.SPECIES_CASTING_ABILITY:
        out["ability"] = ["int"]
    species = create24.load_species_catalog().get(species_slug) or {}
    data = species.get("data") or {}
    text = str(data.get("traits_text") or "")
    if "Интеллект, Мудрость или Харизма" in text and "ability" not in out:
        out["ability"] = ["int"]
    result: dict = {"species_picks": {k: v for k, v in out.items() if v}}
    if data.get("origin_feat_choice"):
        result["species_feat"] = {
            "slug": "skilled",
            "picks": {"skilled": ["athletics", "stealth", "persuasion"]},
        }
    return result


def _class_option_picks(class_slug: str, class_skills: list[str]) -> dict:
    if class_slug == "cleric":
        return {"divine_order": "protector"}
    if class_slug == "druid":
        return {"primal_order": "warden"}
    if class_slug == "rogue":
        return {"expertise": class_skills[:2]}
    if class_slug == "warlock":
        return {"eldritch_invocations": ["armor-of-shadows"]}
    return {}


def _bg_asi(bg_slug: str) -> tuple[str, dict[str, int]]:
    bg = create24.load_background_catalog()[bg_slug]
    abilities = [str(a).lower() for a in ((bg.get("data") or {}).get("asi") or {}).get("abilities") or []]
    assert len(abilities) == 3
    return "+2/+1", {abilities[0]: 2, abilities[1]: 1}


def _class_skills(class_slug: str) -> list[str]:
    from app.dnd import edition_2024_classes as e24

    data = e24.load_class_catalog()[class_slug]["data"]
    choices = data.get("skill_choices") or {}
    count = int(choices.get("count") or 0)
    pool = list(choices.get("from") or [])
    if choices.get("from_any") or not pool:
        pool = sorted(create24.SKILL_IDS)
    return pool[:count]


def build_valid_payload(class_slug: str, **overrides) -> dict:
    bg_slug = BG_BY_CLASS[class_slug]
    species_slug = SPECIES_BY_CLASS[class_slug]
    # Fallback if book-specific bg/species missing in thin envs.
    bgs = create24.load_background_catalog()
    species = create24.load_species_catalog()
    if bg_slug not in bgs:
        bg_slug = "acolyte" if "acolyte" in bgs else next(iter(bgs))
    if species_slug not in species:
        species_slug = "human" if "human" in species else next(iter(species))

    asi_mode, asi = _bg_asi(bg_slug)
    skills = _class_skills(class_slug)
    limit = create24._weapon_mastery_limit(class_slug)
    if class_slug == "barbarian":
        mastery = _melee_weapons(limit) if limit else []
    else:
        mastery = _any_weapons(limit) if limit else []

    from app.dnd import edition_2024_classes as e24

    class_data = e24.load_class_catalog()[class_slug]["data"]
    packs = class_data.get("starting_equipment") or []
    pack_id = "a" if any(p.get("id") == "a" for p in packs) else packs[0]["id"]

    base = {
        "str": 15,
        "dex": 14,
        "con": 13,
        "int": 12,
        "wis": 10,
        "cha": 8,
    }
    # Casters: put 15 into primary.
    primaries = [str(x).lower() for x in (class_data.get("primary_abilities") or [])]
    if primaries:
        primary = primaries[0]
        # Swap so primary gets 15.
        for k, v in list(base.items()):
            if v == 15 and k != primary:
                base[k] = base.get(primary, 8)
                base[primary] = 15
                break

    payload = {
        "name": f"Герой-{class_slug}",
        "class_slug": class_slug,
        "background_slug": bg_slug,
        "species_slug": species_slug,
        "ability_method": "standard_array",
        "base_abilities": base,
        "background_asi_mode": asi_mode,
        "background_asi": asi,
        "language_ids": ["elvish", "dwarvish"],
        "class_skill_ids": skills,
        "weapon_mastery_ids": mastery,
        "fighting_style_slug": "defense" if class_slug == "fighter" else None,
        "background_tool_id": _background_tool(bg_slug),
        "background_equipment": "pack",
        "class_equipment": pack_id,
        "cantrip_ids": [],
        "prepared_spell_ids": [],
        "class_option_picks": _class_option_picks(class_slug, skills),
        "is_preview": True,
        "is_draft": False,
        **_species_picks(species_slug),
        **{k: v for k, v in _origin_feat_fields(bg_slug).items() if not k.startswith("_")},
    }
    origin_meta = _origin_feat_fields(bg_slug)
    client = {
        "origin_feat_picks": origin_meta.get("_origin_feat_picks") or {},
        **_species_client_picks(species_slug),
    }
    payload["class_option_picks"] = {
        **payload["class_option_picks"],
        "client_picks": client,
    }

    # Spells for L1 casters
    snap = e24.compute_progression([{"slug": class_slug, "level": 1}], abilities=base)
    if snap.spellcasting:
        block = snap.spellcasting[0]
        payload["cantrip_ids"] = _spell_pick(class_slug, 0, int(block.cantrips or 0))
        always = set(block.always_prepared or ())
        prep = _spell_pick(class_slug, 1, int(block.prepared_spells or 0) + len(always))
        # Prefer non-always for budget fills.
        filled: list[str] = []
        for sid in prep:
            if sid in always:
                continue
            filled.append(sid)
            if len(filled) >= int(block.prepared_spells or 0):
                break
        payload["prepared_spell_ids"] = filled
        if class_slug == "wizard":
            book = _spell_pick("wizard", 1, 6)
            payload["spellbook_spell_ids"] = book
            payload["prepared_spell_ids"] = book[: int(block.prepared_spells or 0)]

    book_overridden = "spellbook_spell_ids" in overrides
    payload.update(overrides)
    # Wizard create-at-N expects 6 + 2×(n−1) book spells unless the caller set the book.
    if payload.get("class_slug") == "wizard" and not book_overridden:
        wizard_lv = 1
        for row in payload.get("class_levels") or []:
            if isinstance(row, dict) and str(row.get("slug") or "") == "wizard":
                wizard_lv = int(row.get("level") or 1)
                break
        need = 6 + 2 * max(0, wizard_lv - 1)
        book = list(payload.get("spellbook_spell_ids") or [])
        if len(book) < need:
            book = wizard_book_for_level(wizard_lv)
            payload["spellbook_spell_ids"] = book
            prep_n = len(payload.get("prepared_spell_ids") or [])
            if prep_n:
                payload["prepared_spell_ids"] = book[:prep_n]
    # Drop None optional fields
    return {k: v for k, v in payload.items() if v is not None}


def _is_cyrillic(value: str) -> bool:
    return bool(re.search(r"[А-Яа-яЁё]", value))


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


def test_languages_catalog():
    langs = create24.languages_catalog_payload()
    assert len(langs) >= 10
    ids = {row["id"] for row in langs}
    assert COMMON_LANGUAGE_ID not in ids
    assert "common-sign-language" in ids
    assert LANGUAGE_CHOICE_COUNT == 2


@pytest.mark.parametrize("class_slug", CLASS_SLUGS)
def test_create_2024_each_class(class_slug: str):
    payload = build_valid_payload(class_slug)
    result = create24.validate_create_2024(create24.payload_from_dict(payload))
    assert result.level == 1
    assert result.hp_max >= 4
    sheet = result.sheet
    assert sheet["meta"]["rules_edition"] == "2024"
    assert sheet["classes"][0]["level"] == 1
    assert sheet["classes"][0]["subclass_slug"] is None
    assert "class_progress_2024" in sheet
    assert sheet["proficiency"]["languages"][0] == "Общий"
    assert len(sheet["create_2024"]["languages_chosen"]) == 2
    for name in [*sheet["proficiency"]["languages"], *sheet["proficiency"]["tools"]]:
        assert _is_cyrillic(name), f"English-looking proficiency name: {name!r}"
    for row in sheet["spells"]["known"]:
        assert isinstance(row, dict)
        assert _is_cyrillic(row["name"])
    # No racial ASI: final scores = base + background only
    for key, base in payload["base_abilities"].items():
        bonus = int(payload["background_asi"].get(key, 0))
        assert sheet["abilities"][key]["score"] == base + bonus
    if class_slug in {"barbarian", "fighter", "paladin", "ranger", "rogue"}:
        assert sheet.get("weapon_mastery")
    if class_slug == "fighter":
        assert sheet["create_2024"]["fighting_style"] == "defense"


def test_languages_and_tools_are_russian_on_sheet():
    payload = build_valid_payload(
        "fighter",
        language_ids=["elvish", "dwarvish"],
        background_tool_id="dice-set",
    )
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    langs = sheet["proficiency"]["languages"]
    assert langs[:3] == ["Общий", "Эльфийский", "Дварфийский"]
    rogue = build_valid_payload("rogue", language_ids=["elvish", "dwarvish"])
    rogue_sheet = create24.validate_create_2024(create24.payload_from_dict(rogue)).sheet
    assert "Воровской жаргон" in rogue_sheet["proficiency"]["languages"]
    assert "Набор игральных костей" in sheet["proficiency"]["tools"]
    assert "dice-set" not in sheet["proficiency"]["tools"]
    assert sheet["create_2024"]["languages_chosen"] == ["elvish", "dwarvish"]


def test_druid_gets_druidic_in_russian():
    payload = build_valid_payload("druid")
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert "Друидический" in sheet["proficiency"]["languages"]


def test_tool_name_ru_never_latin():
    assert create24.tool_name_ru("dice-set") == "Набор игральных костей"
    assert create24.tool_name_ru("thieves_tools") == "Воровские инструменты"
    assert create24.tool_name_ru("glassblower s tools") == "Инструменты стеклодува"
    assert create24.tool_name_ru("Набор травника") == "Набор травника"
    assert _is_cyrillic(create24.tool_name_ru("totally-unknown-tool"))


def test_wizard_create_materializes_spellbook():
    payload = build_valid_payload("wizard")
    book = payload["spellbook_spell_ids"]
    assert len(book) == 6
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    known = sheet["spells"]["known"]
    leveled = [row for row in known if row["level"] >= 1]
    in_book = [row for row in leveled if row.get("in_spellbook")]
    assert len(in_book) >= 6
    assert all(row["spellbook_acquisition"] == "starting" for row in in_book)
    prepared_names = {row["name"] for row in leveled if row["prepared"]}
    assert len(prepared_names) >= len(payload["prepared_spell_ids"])
    assert all(row["name"] and _is_cyrillic(row["name"]) for row in known)
    assert any(row["level"] == 0 for row in known)
    item = next(
        i
        for i in sheet["inventory"]["items"]
        if i["id"] == sheet["spells"]["wizard_spellbook"]["primaryBookItemId"]
    )
    assert item["catalog_slug"] == "spellbook"
    assert sheet["create_2024"]["spellbook_spell_ids"] == book


def test_wizard_gold_route_still_gets_spellbook_item():
    payload = build_valid_payload("wizard", class_equipment="gold")
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    ids = [i["id"] for i in sheet["inventory"]["items"]]
    assert sheet["spells"]["wizard_spellbook"]["primaryBookItemId"] in ids


def test_wizard_requires_six_book_spells():
    payload = build_valid_payload("wizard")
    payload["spellbook_spell_ids"] = payload["spellbook_spell_ids"][:5]
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert exc.value.code == "create_2024_spells"


def test_wizard_prepared_must_be_subset_of_book():
    payload = build_valid_payload("wizard")
    outsider = next(
        s for s in _spell_pick("wizard", 1, 12) if s not in payload["spellbook_spell_ids"]
    )
    payload["prepared_spell_ids"] = [outsider, *payload["prepared_spell_ids"][1:]]
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert exc.value.code == "create_2024_spells"


def test_ru_plural_forms():
    plural = create24._ru_plural
    forms = ("заклинание", "заклинания", "заклинаний")
    assert [plural(n, *forms) for n in (1, 2, 4, 5, 11, 12, 14, 21, 22, 25)] == [
        "заклинание",
        "заклинания",
        "заклинания",
        "заклинаний",
        "заклинаний",
        "заклинаний",
        "заклинаний",
        "заклинание",
        "заклинания",
        "заклинаний",
    ]


def test_ru_plural_prepared_phrase_forms():
    plural = create24._ru_plural
    forms = ("подготовленное заклинание", "подготовленных заклинания", "подготовленных заклинаний")
    assert [f"{n} {plural(n, *forms)}" for n in (1, 2, 4, 5, 6, 11, 21, 22, 25)] == [
        "1 подготовленное заклинание",
        "2 подготовленных заклинания",
        "4 подготовленных заклинания",
        "5 подготовленных заклинаний",
        "6 подготовленных заклинаний",
        "11 подготовленных заклинаний",
        "21 подготовленное заклинание",
        "22 подготовленных заклинания",
        "25 подготовленных заклинаний",
    ]


def test_spell_count_errors_use_russian_declension():
    payload = build_valid_payload("cleric")
    payload["prepared_spell_ids"] = payload["prepared_spell_ids"][:-1]
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert "Нужно 4 подготовленных заклинания 1 круга, выбрано 3" in str(exc.value)

    payload = build_valid_payload("cleric")
    payload["cantrip_ids"] = payload["cantrip_ids"][:-1]
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert "Нужно 3 заговора, выбрано 2" in str(exc.value)


def test_non_wizard_rejects_spellbook_ids():
    payload = build_valid_payload("cleric")
    payload["spellbook_spell_ids"] = _spell_pick("wizard", 1, 6)
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert exc.value.code == "create_2024_spells"


def test_cleric_known_spells_are_sheet_objects():
    payload = build_valid_payload("cleric")
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    known = sheet["spells"]["known"]
    assert known and all(isinstance(row, dict) and row["name"] for row in known)
    assert not any("in_spellbook" in row for row in known)
    assert sheet["spells"].get("wizard_spellbook") is None


def test_reject_subclass_at_level_1():
    payload = build_valid_payload("fighter", subclass_slug="champion")
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert exc.value.code == "create_2024_subclass"


def test_reject_asi_outside_background_trio():
    payload = build_valid_payload("fighter")
    # Soldier trio is str/dex/con — cha is illegal.
    payload["background_asi"] = {"cha": 2, "str": 1}
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert exc.value.code == "create_2024_asi"


def test_reject_extra_languages():
    payload = build_valid_payload(
        "fighter",
        language_ids=["elvish", "dwarvish", "draconic"],
    )
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert exc.value.code == "create_2024_languages"


def test_reject_common_as_choice():
    payload = build_valid_payload("fighter", language_ids=["common", "elvish"])
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert exc.value.code == "create_2024_languages"


def test_reject_wrong_origin_feat_picks():
    payload = build_valid_payload("cleric", background_slug="acolyte")
    payload["origin_feat_list"] = "wizard"
    payload["origin_feat_cantrips"] = ["fire-bolt"]  # only one — invalid
    payload["origin_feat_spell_id"] = _spell_pick("wizard", 1, 1)[0]
    picks = dict(payload.get("class_option_picks") or {})
    client = dict(picks.get("client_picks") or {})
    client["origin_feat_picks"] = {
        "list": ["wizard"],
        "cantrips": ["fire-bolt"],
        "spell": [_spell_pick("wizard", 1, 1)[0]],
        "ability": ["int"],
    }
    picks["client_picks"] = client
    payload["class_option_picks"] = picks
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert exc.value.code == "create_2024_origin_feat"


def test_reject_fighting_style_on_wizard():
    payload = build_valid_payload("wizard", fighting_style_slug="defense")
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert exc.value.code == "create_2024_fighting_style"


def test_reject_weapon_mastery_on_wizard():
    payload = build_valid_payload("wizard", weapon_mastery_ids=["dagger", "club"])
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert exc.value.code == "create_2024_weapon_mastery"


def test_asi_cap_20():
    payload = build_valid_payload("fighter")
    payload["ability_method"] = "manual"
    payload["base_abilities"] = {
        "str": 18,
        "dex": 14,
        "con": 13,
        "int": 12,
        "wis": 10,
        "cha": 8,
    }
    payload["background_asi_mode"] = "+2/+1"
    payload["background_asi"] = {"str": 2, "dex": 1}
    create24.validate_create_2024(create24.payload_from_dict(payload))
    payload["base_abilities"]["str"] = 19
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(payload))
    assert exc.value.code == "create_2024_asi_cap"


def test_create_2024_api_preview_allows_when_flag_closed(monkeypatch):
    created: dict = {}

    class FakeRepo:
        def create(self, **kwargs):
            created.update(kwargs)
            char = SimpleNamespace(
                id=uuid4(),
                user_id=kwargs["user_id"],
                name=kwargs["name"],
                rules_edition=kwargs["rules_edition"],
                sheet=kwargs["sheet"],
                sheet_version=1,
                avatar_url=None,
                level=1,
                class_name=None,
                race_name=None,
                hp_current=None,
                hp_max=None,
                is_draft=False,
                created_at=None,
                updated_at=None,
            )
            return char

    monkeypatch.setattr(settings, "rules_edition_2024_open", False)
    db = SimpleNamespace(commit=lambda: None, refresh=lambda _c: None)
    svc = CharacterService(db=db)  # type: ignore[arg-type]
    svc.characters = FakeRepo()  # type: ignore[assignment]
    import app.services.character as char_mod

    monkeypatch.setattr(
        char_mod,
        "to_detail",
        lambda character, **_kw: SimpleNamespace(
            id=character.id,
            rules_edition=character.rules_edition,
            name=character.name,
            sheet=character.sheet,
            level=character.level,
            class_name=character.class_name,
            race_name=character.race_name,
            hp_max=character.hp_max,
        ),
    )
    payload = CharacterCreate2024Request(**build_valid_payload("fighter", is_preview=True))
    out = svc.create_2024(SimpleNamespace(id=uuid4()), payload)  # type: ignore[arg-type]
    assert created["rules_edition"] == RulesEdition.edition_2024
    assert out.rules_edition == RulesEdition.edition_2024
    assert created["sheet"]["weapon_mastery"]["known"]
    from app.services.edition_2024_catalog_seed import entry_id

    assert created["sheet"]["classes"][0]["catalog_id"] == entry_id(kind="class", slug="fighter")


def test_create_2024_api_refuses_without_preview_when_closed(monkeypatch):
    monkeypatch.setattr(settings, "rules_edition_2024_open", False)
    svc = CharacterService(db=SimpleNamespace())  # type: ignore[arg-type]
    payload = CharacterCreate2024Request(**build_valid_payload("fighter", is_preview=False))
    with pytest.raises(AppError) as exc:
        svc.create_2024(SimpleNamespace(id=uuid4()), payload)  # type: ignore[arg-type]
    assert exc.value.code == "rules_edition_closed"


def test_empty_2014_create_still_works_shape():
    """2014 empty sheet skeleton unchanged (no 2024 keys)."""
    from app.services.character_sheet import empty_character_sheet

    sheet = empty_character_sheet()
    assert "weapon_mastery" not in sheet
    assert "class_progress_2024" not in sheet
    assert "create_2024" not in sheet
    assert sheet["combat"]["inspiration"] is False


# Snapshot of a minimal 2014-like summary shape used by create pipeline finish.
_CREATE_2014_SHEET_SNAPSHOT_KEYS = frozenset(
    {
        "identity",
        "abilities",
        "saves",
        "skills",
        "combat",
        "proficiency",
        "bonuses",
        "weapons",
        "attunements",
        "inventory",
        "resources",
        "spells",
        "features_text",
        "personality",
        "notes",
        "meta",
    }
)


def test_2014_empty_sheet_keys_identical_after_pack():
    from app.services.character_sheet import empty_character_sheet

    sheet = empty_character_sheet()
    assert set(sheet.keys()) == _CREATE_2014_SHEET_SNAPSHOT_KEYS
