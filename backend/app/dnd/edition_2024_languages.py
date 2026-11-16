"""P24-M03: languages for rules_edition=2024 character creation.

2024 rule: Common is free; pick exactly two more from the approved list
(including Common Sign Language). Species and backgrounds do not grant languages.
Class languages (Druidic, Thieves' Cant) are separate and additive.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Language2024:
    id: str
    name_en: str
    name_ru: str
    kind: str  # standard | exotic | class_special


# SRD 5.2.1 standard + exotic languages (Common is automatic, not chosen).
LANGUAGES_2024: tuple[Language2024, ...] = (
    Language2024("common", "Common", "Общий", "standard"),
    Language2024("common-sign-language", "Common Sign Language", "Язык жестов", "standard"),
    Language2024("dwarvish", "Dwarvish", "Дварфийский", "standard"),
    Language2024("elvish", "Elvish", "Эльфийский", "standard"),
    Language2024("giant", "Giant", "Великаний", "standard"),
    Language2024("gnomish", "Gnomish", "Гномий", "standard"),
    Language2024("goblin", "Goblin", "Гоблинский", "standard"),
    Language2024("halfling", "Halfling", "Язык полуросликов", "standard"),
    Language2024("orc", "Orc", "Орочий", "standard"),
    Language2024("abyssal", "Abyssal", "Бездны", "exotic"),
    Language2024("celestial", "Celestial", "Небесный", "exotic"),
    Language2024("deep-speech", "Deep Speech", "Глубинная речь", "exotic"),
    Language2024("draconic", "Draconic", "Драконий", "exotic"),
    Language2024("infernal", "Infernal", "Инфернальный", "exotic"),
    Language2024("primordial", "Primordial", "Первичный", "exotic"),
    Language2024("sylvan", "Sylvan", "Сильван", "exotic"),
    Language2024("undercommon", "Undercommon", "Подземный", "exotic"),
)

# Not selectable at the languages step — granted by class features.
CLASS_SPECIAL_LANGUAGES: tuple[Language2024, ...] = (
    Language2024("druidic", "Druidic", "Друидический", "class_special"),
    Language2024("thieves-cant", "Thieves' Cant", "Воровской жаргон", "class_special"),
)

COMMON_LANGUAGE_ID = "common"
LANGUAGE_CHOICE_COUNT = 2

_BY_ID = {row.id: row for row in LANGUAGES_2024}
_CHOICE_IDS = frozenset(row.id for row in LANGUAGES_2024 if row.id != COMMON_LANGUAGE_ID)


def language_by_id(language_id: str) -> Language2024 | None:
    return _BY_ID.get((language_id or "").strip().lower())


def selectable_language_ids() -> frozenset[str]:
    return _CHOICE_IDS


def list_selectable_languages() -> list[Language2024]:
    return [row for row in LANGUAGES_2024 if row.id != COMMON_LANGUAGE_ID]


def validate_language_picks(picks: list[str]) -> list[str]:
    """Return normalized choice ids or raise ValueError with a short Russian reason."""
    cleaned: list[str] = []
    seen: set[str] = set()
    for raw in picks:
        lid = (raw or "").strip().lower().replace("_", "-")
        if not lid:
            continue
        if lid == COMMON_LANGUAGE_ID:
            raise ValueError("Общий язык выдаётся автоматически — не выбирайте его отдельно")
        if lid not in _CHOICE_IDS:
            raise ValueError(f"Неизвестный язык 2024: {raw}")
        if lid in seen:
            raise ValueError(f"Язык выбран дважды: {lid}")
        seen.add(lid)
        cleaned.append(lid)
    if len(cleaned) != LANGUAGE_CHOICE_COUNT:
        raise ValueError(
            f"Нужно выбрать ровно {LANGUAGE_CHOICE_COUNT} языка (сейчас {len(cleaned)})"
        )
    return cleaned
