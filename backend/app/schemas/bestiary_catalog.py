"""Bestiary catalog `data` contract (D&D 2014).

JSONB on catalog_entries for kind=bestiary — writers emit schema_version=1.
Product SoT: official books + our structure (B2). Legacy ttg/dnd.su importers
are archived behind DVARF_ALLOW_LEGACY_FETCH — see docs/BESTIARY_AUDIT_2014.md.
"""

from __future__ import annotations

from typing import Literal, NotRequired, TypedDict

BESTIARY_DATA_SCHEMA_VERSION = 1

BestiarySize = Literal[
    "tiny",
    "small",
    "medium",
    "large",
    "huge",
    "gargantuan",
]


class BestiarySpeed(TypedDict, total=False):
    walk: int
    swim: int
    fly: int
    climb: int
    burrow: int
    notes: str


class BestiaryAbilities(TypedDict):
    str: int
    dex: int
    con: int
    int: int
    wis: int
    cha: int


class BestiarySenses(TypedDict, total=False):
    darkvision: int
    blindsight: int
    tremorsense: int
    truesight: int
    passive_perception: int


class BestiaryActionBlock(TypedDict, total=False):
    name_ru: str
    name_en: str
    text_ru: str


class BestiaryCatalogData(TypedDict):
    """Canonical keys for kind=bestiary catalog_entries.data (edition 2014)."""

    schema_version: NotRequired[int]
    size: str
    type: str
    type_ru: str
    subtype: NotRequired[str | None]
    alignment: NotRequired[str]
    ac: int
    ac_notes: NotRequired[str]
    hp_average: int
    hp_formula: NotRequired[str]
    # Host-scaled companions (Wildfire Spirit): "+ пятикратный уровень друида"
    hp_scaling_text: NotRequired[str]
    speed: BestiarySpeed
    # Empty string when CR is not fixed (class companions / spirits).
    cr: str
    proficiency_bonus: NotRequired[int | str]
    abilities: BestiaryAbilities
    skills: NotRequired[dict[str, int]]
    senses: NotRequired[BestiarySenses]
    languages: NotRequired[list[str]]
    damage_immunities: NotRequired[list[str]]
    damage_resistances: NotRequired[list[str]]
    damage_vulnerabilities: NotRequired[list[str]]
    condition_immunities: NotRequired[list[str]]
    traits: NotRequired[list[BestiaryActionBlock]]
    actions: NotRequired[list[BestiaryActionBlock]]
    bonus_actions: NotRequired[list[BestiaryActionBlock]]
    reactions: NotRequired[list[BestiaryActionBlock]]
    legendary_actions: NotRequired[list[BestiaryActionBlock]]
    source_book: str
    tags: NotRequired[list[str]]
    environment: NotRequired[list[str]]
