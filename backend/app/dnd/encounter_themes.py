"""B8: темы энкаунтера — тип/подтип бестиария + семейства «похожих».

Мультивыбор = OR. Тумблер similar расширяет каждую выбранную тему семейством.
См. docs/B8_ENCOUNTER_GENERATOR.md §B.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True, slots=True)
class ThemeDef:
    """Тема в UI генератора."""

    id: str
    label_ru: str
    # точное совпадение type (en) — пусто если тема только по subtype
    types: tuple[str, ...] = ()
    # подстроки subtype (нижний регистр), любая из них = hit
    subtypes: tuple[str, ...] = ()
    # если подстрока из excludes есть в subtype — не считать hit
    # (эльф не должен ловить «полуэльф», пока не выбрана тема half_elf)
    subtype_excludes: tuple[str, ...] = ()
    # id других тем, которые подмешиваются при similar=True
    similar_theme_ids: tuple[str, ...] = ()


# Каталог тем v1 (мультивыбор в UI).
THEMES: dict[str, ThemeDef] = {
    "undead": ThemeDef("undead", "Нежить", types=("undead",)),
    "fiend": ThemeDef("fiend", "Исчадие", types=("fiend",)),
    "demon": ThemeDef(
        "demon",
        "Демоны",
        subtypes=("демон",),
        similar_theme_ids=("devil", "yugoloth"),
    ),
    "devil": ThemeDef(
        "devil",
        "Дьяволы",
        subtypes=("дьявол",),
        similar_theme_ids=("demon", "yugoloth"),
    ),
    "yugoloth": ThemeDef(
        "yugoloth",
        "Юголоты",
        subtypes=("юголот",),
        similar_theme_ids=("demon", "devil"),
    ),
    "beast": ThemeDef(
        "beast",
        "Звери",
        types=("beast", "swarm_of_tiny_beasts"),
    ),
    "monstrosity": ThemeDef("monstrosity", "Монстры", types=("monstrosity",)),
    "dragon": ThemeDef("dragon", "Драконы", types=("dragon",)),
    "aberration": ThemeDef("aberration", "Аберрации", types=("aberration",)),
    "giant": ThemeDef("giant", "Великаны", types=("giant",)),
    "elemental": ThemeDef("elemental", "Элементали", types=("elemental",)),
    "fey": ThemeDef("fey", "Феи", types=("fey",)),
    "plant": ThemeDef("plant", "Растения", types=("plant",)),
    "construct": ThemeDef("construct", "Конструкты", types=("construct",)),
    "celestial": ThemeDef("celestial", "Небожители", types=("celestial",)),
    "ooze": ThemeDef("ooze", "Слизи", types=("ooze",)),
    "orc": ThemeDef(
        "orc",
        "Орки",
        subtypes=("орк",),
        similar_theme_ids=("goblinoid", "kobold", "gnoll", "lizardfolk"),
    ),
    "goblinoid": ThemeDef(
        "goblinoid",
        "Гоблиноиды",
        subtypes=("гоблиноид",),
        similar_theme_ids=("orc", "kobold", "gnoll"),
    ),
    "kobold": ThemeDef(
        "kobold",
        "Кобольды",
        subtypes=("кобольд",),
        similar_theme_ids=("goblinoid",),
    ),
    "gnoll": ThemeDef(
        "gnoll",
        "Гноллы",
        subtypes=("гнолл",),
        similar_theme_ids=("orc", "goblinoid"),
    ),
    "lizardfolk": ThemeDef(
        "lizardfolk",
        "Людоящеры",
        subtypes=("людоящер",),
        similar_theme_ids=("orc",),
    ),
    # Играбельные / «городские» расы (subtype гуманоида в бестиарии)
    "human": ThemeDef(
        "human",
        "Люди",
        subtypes=("человек",),
        subtype_excludes=("полуорк", "полуэльф"),
        similar_theme_ids=("half_elf", "tiefling"),
    ),
    "elf": ThemeDef(
        "elf",
        "Эльфы",
        subtypes=("эльф",),
        subtype_excludes=("полуэльф",),
        similar_theme_ids=("half_elf", "fey"),
    ),
    "half_elf": ThemeDef(
        "half_elf",
        "Полуэльфы",
        subtypes=("полуэльф",),
        similar_theme_ids=("elf", "human"),
    ),
    "dwarf": ThemeDef(
        "dwarf",
        "Дварфы",
        subtypes=("дварф",),
        similar_theme_ids=("gnome",),
    ),
    "gnome": ThemeDef(
        "gnome",
        "Гномы",
        subtypes=("гном",),
        similar_theme_ids=("dwarf",),
    ),
    "tiefling": ThemeDef(
        "tiefling",
        "Тифлинги",
        subtypes=("тифлинг",),
        similar_theme_ids=("human", "fiend"),
    ),
    "gith": ThemeDef(
        "gith",
        "Гит",
        subtypes=("гит",),
        similar_theme_ids=(),
    ),
    "kenku": ThemeDef(
        "kenku",
        "Кенку",
        subtypes=("кенку",),
        similar_theme_ids=(),
    ),
    "tortle": ThemeDef(
        "tortle",
        "Тортлы",
        subtypes=("тортл",),
        similar_theme_ids=(),
    ),
    "sahuagin": ThemeDef(
        "sahuagin",
        "Сахуагин",
        subtypes=("сахуагин",),
        similar_theme_ids=("merfolk", "kuo_toa"),
    ),
    "merfolk": ThemeDef(
        "merfolk",
        "Мерфолк",
        subtypes=("мерфолк",),
        similar_theme_ids=("sahuagin",),
    ),
    "kuo_toa": ThemeDef(
        "kuo_toa",
        "Куо-тоа",
        subtypes=("куо-тоа", "куо–тоа"),
        similar_theme_ids=("sahuagin",),
    ),
}


def expand_theme_ids(selected: Iterable[str], *, similar: bool) -> set[str]:
    """Выбранные темы + (опционально) их семейства."""
    out: set[str] = set()
    for tid in selected:
        if tid not in THEMES:
            continue
        out.add(tid)
        if similar:
            out.update(THEMES[tid].similar_theme_ids)
    return out


def monster_matches_themes(
    *,
    type_en: str | None,
    subtype: str | None,
    theme_ids: Iterable[str],
) -> bool:
    """OR: монстр подходит, если попал хотя бы в одну тему из набора."""
    type_l = (type_en or "").strip().lower()
    sub_l = (subtype or "").strip().lower()
    for tid in theme_ids:
        theme = THEMES.get(tid)
        if theme is None:
            continue
        if type_l and type_l in theme.types:
            return True
        if sub_l and theme.subtypes:
            if any(ex and ex in sub_l for ex in theme.subtype_excludes):
                continue
            if any(token in sub_l for token in theme.subtypes):
                return True
    return False
