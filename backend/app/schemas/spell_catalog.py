"""Spell catalog `data` contract (D&D 2014).

JSONB on catalog_entries — writers should emit schema_version=1.
Readers (API clients) must tolerate legacy SRD shapes until backfill.
"""

from __future__ import annotations

from typing import Literal, NotRequired, TypedDict

SPELL_DATA_SCHEMA_VERSION = 1

SpellCastingTimeUnit = Literal[
    "action",
    "bonus",
    "reaction",
    "minute",
    "hour",
    "special",
]


class SpellCastingTime(TypedDict):
    unit: SpellCastingTimeUnit
    amount: NotRequired[int]
    condition: NotRequired[str]


class SpellComponents(TypedDict):
    v: bool
    s: bool
    m: NotRequired[str]


class SpellCatalogData(TypedDict):
    """Canonical keys for kind=spell catalog_entries.data (edition 2014)."""

    schema_version: NotRequired[int]
    level: int
    school: str
    casting_time: SpellCastingTime | str
    range: str
    components: SpellComponents | list[str]
    duration: NotRequired[str]
    concentration: bool
    ritual: bool
    classes: list[str]
    # each item: {"class": "<slug>", "subclass": "<slug>"}
    subclasses: NotRequired[list[dict[str, str]]]
    attack_or_save: NotRequired[str | None]
    damage: NotRequired[str | None]
    damage_at_character_level: NotRequired[dict[str, str]]
    damage_at_slot_level: NotRequired[dict[str, str]]
    higher_levels: NotRequired[str]
    description: NotRequired[str]
    source_book: NotRequired[str]
    ritual_cast_without_prepare: NotRequired[bool]
