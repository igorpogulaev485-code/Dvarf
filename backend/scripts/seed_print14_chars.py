#!/usr/bin/env python3
"""PRINT-14 seed: three distinct classic-print characters for capture.

  Даррак — жрец 3 (муд/хар спас, владения жреца)
  Торбин — воин/плут/волшебник/бард (другие статы, навыки, снаряжение)
  Аэрин — чародей 20 (большой список заклинаний)

Run from backend/:
  PYTHONPATH=. python scripts/seed_print14_chars.py
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.character import Character, RulesEdition
from app.models.user import User
from scripts.seed_mag01_chars import _full_slots, _spell, sorcerer20_sheet

EMAIL = "uikit03@example.com"
PASSWORD = "uikit03-dev"
DARRACK_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1")
TORBIN_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2")
SORC_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccc02")


def _skill(proficient: bool = False, expertise: bool = False) -> dict:
    return {"is_proficient": proficient or expertise, "is_expertise": expertise}


def _skills(*keys: str, expertise: tuple[str, ...] = ()) -> dict:
    all_keys = (
        "acrobatics",
        "animal_handling",
        "arcana",
        "athletics",
        "deception",
        "history",
        "insight",
        "intimidation",
        "investigation",
        "medicine",
        "nature",
        "perception",
        "performance",
        "persuasion",
        "religion",
        "sleight_of_hand",
        "stealth",
        "survival",
    )
    return {k: _skill(k in keys, k in expertise) for k in all_keys}


def _weapon(wid: str, name: str, ability: str, bonus: str, damage: str, dtype: str) -> dict:
    return {
        "id": wid,
        "name": name,
        "ability": ability,
        "is_proficient": True,
        "attack_bonus": bonus,
        "damage": damage,
        "damage_type": dtype,
        "source_kind": "custom",
    }


def darrack_sheet() -> dict:
    return {
        "identity": {
            "alignment": "Хаотично-нейтральный",
            "experience": 900,
            "background": "Солдат",
            "player_name": "Игорь",
            "gender": "male",
            "age": "82",
            "height": "4′3″",
            "weight": "160 фнт.",
            "eyes": "Стальные",
            "skin": "Каменная",
            "hair": "Рыжая борода",
        },
        "classes": [
            {
                "id": "cleric",
                "name": "Жрец",
                "catalog_id": "cleric",
                "level": 3,
                "subclass_name": "Домен бури",
                "subclass_catalog_id": "tempest_domain",
            }
        ],
        "abilities": {
            "str": {"score": 14},
            "dex": {"score": 10},
            "con": {"score": 14},
            "int": {"score": 10},
            "wis": {"score": 16},
            "cha": {"score": 12},
        },
        "saves": {
            "wis": {"is_proficient": True},
            "cha": {"is_proficient": True},
        },
        "skills": _skills("insight", "medicine", "religion", "athletics"),
        "proficiency": {"bonus": 2},
        "combat": {
            "ac": 18,
            "initiative": 0,
            "speed": 25,
            "inspiration": False,
            "hp_current": 24,
            "hp_max": 27,
            "hp_temp": 0,
            "hit_die": "d8",
            "hp_dice_current": 3,
            "death_successes": 0,
            "death_fails": 0,
            "conditions": [],
            "exhaustion": 0,
            "effects": [],
            "turn_economy": {
                "action": False,
                "bonus": False,
                "reaction": False,
                "movement": False,
            },
        },
        "weapons": [
            _weapon("w-hammer", "Боевой молот", "str", "+4", "1к8+2", "дробящий"),
            _weapon("w-sacred", "Священное пламя", "wis", "Сл 13", "1к8", "излучение"),
        ],
        "inventory": {
            "coins": {"cp": 40, "sp": 25, "ep": 0, "gp": 35, "pp": 0},
            "items": [
                {"id": "mail-1", "name": "Кольчуга", "equipped": True, "qty": 1, "kind": "armor"},
                {"id": "shield-1", "name": "Щит", "equipped": True, "qty": 1, "kind": "armor"},
                {"id": "sym-1", "name": "Священный символ", "qty": 1},
                {"id": "pack-1", "name": "Набор жреца", "qty": 1},
            ],
            "notes": "",
        },
        "personality": {
            "personality": "Прям и громок, как удар молота.",
            "ideals": "Буря очищает ложь.",
            "bonds": "Клан Железный Кулак.",
            "flaws": "Не умеет шептать.",
        },
        "features_text": {
            "features": "Гнев бури\nРазрушительный гнев\nВладение тяжёлой бронёй\nТёмное зрение 60 фт.\nУстойчивость дварфа"
        },
        "notes": {
            "proficiencies": "Лёгкие и средние доспехи, щиты, простое оружие.\nОбщий, дварфийский.",
            "appearance": "Горный дварф с шрамом через бровь.",
            "allies": "Храм бури · Отряд «Железный клин»",
            "background": "Солдат храма, ушёл после видения грозы.",
            "treasure": "Амулет грома",
        },
        "spells": {
            "casting_ability": "wis",
            "max_prepared": 6,
            "slots": {"1": {"max": 4, "used": 1}, "2": {"max": 2, "used": 0}},
            "known": [
                _spell("cl:sacred", "Священное пламя", 0, class_slug="cleric", damage="1к8", attack_or_save="спас Ловкости"),
                _spell("cl:guidance", "Указание", 0, class_slug="cleric", concentration=True),
                _spell("cl:thaum", "Чудотворство", 0, class_slug="cleric"),
                _spell("cl:cure", "Лечение ран", 1, class_slug="cleric"),
                _spell("cl:bless", "Благословение", 1, class_slug="cleric", concentration=True),
                _spell("cl:thunder", "Громовая волна", 1, class_slug="cleric"),
                _spell("cl:aid", "Подмога", 2, class_slug="cleric"),
                _spell("cl:shatter", "Дребезги", 2, class_slug="cleric"),
            ],
        },
        "resources": [],
        "companions": [],
        "ui": {},
    }


def torbin_sheet() -> dict:
    return {
        "identity": {
            "alignment": "Законно-добрый",
            "experience": 34000,
            "background": "Народный герой",
            "player_name": "Марина",
            "gender": "male",
            "age": "47",
            "height": "4′1″",
            "weight": "155 фнт.",
            "eyes": "Янтарные",
            "skin": "Загорелая",
            "hair": "Чёрная коса",
        },
        "classes": [
            {
                "id": "fighter",
                "name": "Воин",
                "catalog_id": "fighter",
                "level": 3,
                "subclass_name": "Мастер боевых искусств",
                "subclass_catalog_id": "battle_master",
            },
            {
                "id": "rogue",
                "name": "Плут",
                "catalog_id": "rogue",
                "level": 2,
                "subclass_name": "Вор",
                "subclass_catalog_id": "thief",
            },
            {
                "id": "wizard",
                "name": "Волшебник",
                "catalog_id": "wizard",
                "level": 2,
                "subclass_name": "Школа воплощения",
                "subclass_catalog_id": "evocation",
            },
            {
                "id": "bard",
                "name": "Бард",
                "catalog_id": "bard",
                "level": 1,
                "subclass_name": "Коллегия доблести",
                "subclass_catalog_id": "valor",
            },
        ],
        "abilities": {
            "str": {"score": 16},
            "dex": {"score": 14},
            "con": {"score": 15},
            "int": {"score": 14},
            "wis": {"score": 10},
            "cha": {"score": 12},
        },
        "saves": {
            "str": {"is_proficient": True},
            "con": {"is_proficient": True},
        },
        "skills": _skills(
            "athletics",
            "acrobatics",
            "stealth",
            "investigation",
            "arcana",
            "persuasion",
            expertise=("stealth",),
        ),
        "proficiency": {"bonus": 3},
        "combat": {
            "ac": 16,
            "initiative": 2,
            "speed": 25,
            "inspiration": True,
            "hp_current": 58,
            "hp_max": 62,
            "hp_temp": 5,
            "hit_die": "d10",
            "hp_dice_current": 8,
            "death_successes": 1,
            "death_fails": 0,
            "conditions": [],
            "exhaustion": 0,
            "effects": [],
            "turn_economy": {
                "action": False,
                "bonus": False,
                "reaction": False,
                "movement": False,
            },
        },
        "weapons": [
            _weapon("t-axe", "Боевой топор", "str", "+6", "1к8+3", "рубящий"),
            _weapon("t-bow", "Короткий лук", "dex", "+5", "1к6+2", "колющий"),
            _weapon("t-dagger", "Кинжал", "dex", "+5", "1к4+2", "колющий"),
        ],
        "inventory": {
            "coins": {"cp": 12, "sp": 40, "ep": 2, "gp": 180, "pp": 1},
            "items": [
                {"id": "scale-1", "name": "Чешуйчатый доспех", "equipped": True, "qty": 1},
                {"id": "pack-t", "name": "Набор путешественника", "qty": 1},
                {"id": "book-1", "name": "Книга заклинаний", "qty": 1},
                {"id": "lute-1", "name": "Лютня", "qty": 1},
                {"id": "thieves-1", "name": "Воровские инструменты", "qty": 1},
                {"id": "potion-1", "name": "Зелье лечения", "qty": 2},
            ],
            "notes": "Карта шахт Громовой Кузни\nПисьмо от гильдии Арфистов",
        },
        "personality": {
            "personality": "Считает удары и рифмы одинаково важными.",
            "ideals": "Знание без дела — ржавый клинок.",
            "bonds": "Клан Кузни и сестра Лира.",
            "flaws": "Не уходит с поля, пока не споёт.",
        },
        "features_text": {
            "features": (
                "Боевой стиль: Защита\nВторое дыхание\nМаневры мастера\n"
                "Скрытая атака 1к6\nХитрое действие\n"
                "Восстановление магии\nВолшебная хитрость\n"
                "Вдохновение барда (к6)"
            )
        },
        "notes": {
            "proficiencies": (
                "Все доспехи, щиты, простое и воинское оружие.\n"
                "Воровские инструменты, лютня.\n"
                "Общий, дварфийский, эльфийский, воровской жаргон."
            ),
            "appearance": "Щитовой дварф в дорожной куртке, на поясе — лютня и книга рун.",
            "allies": "Клан Громовой Кузни · Гильдия Арфистов · отряд «Железная песнь»",
            "background": "Кузнец, ставший воином, потом вором знаний и бардом дороги.",
            "treasure": "Кольцо клана · Медаль за оборону перевала",
        },
        "spells": {
            "casting_ability": "int",
            "max_prepared": 5,
            "slots": {"1": {"max": 3, "used": 0}},
            "known": [
                _spell("tw:fire", "Огненный снаряд", 0, class_slug="wizard", damage="1к10", attack_or_save="атака"),
                _spell("tw:magehand", "Волшебная рука", 0, class_slug="wizard"),
                _spell("tw:mm", "Волшебная стрела", 1, class_slug="wizard"),
                _spell("tw:shield", "Щит", 1, class_slug="wizard", casting_time="1 реакция"),
                _spell("tb:vicious", "Злая насмешка", 0, class_slug="bard"),
                _spell("tb:heal", "Слово исцеления", 1, class_slug="bard"),
            ],
        },
        "resources": [
            {
                "id": "feat:superiority:fighter",
                "name": "Кости превосходства",
                "max": 4,
                "used": 1,
                "reset": "short",
                "track": "pool",
            }
        ],
        "companions": [],
        "ui": {},
    }


def aerin_sheet() -> dict:
    sheet = sorcerer20_sheet()
    extra = [
        _spell("sorc:light", "Свет", 0, class_slug="sorcerer"),
        _spell("sorc:friends", "Дружба", 0, class_slug="sorcerer"),
        _spell("sorc:shock", "Шок", 0, class_slug="sorcerer", damage="1к8 электр."),
        _spell("sorc:chromatic", "Цветные брызги", 1, class_slug="sorcerer"),
        _spell("sorc:disguise", "Маскировка", 1, class_slug="sorcerer"),
        _spell("sorc:detect", "Обнаружение магии", 1, class_slug="sorcerer", ritual=True),
        _spell("sorc:misty", "Туманный шаг", 2, class_slug="sorcerer"),
        _spell("sorc:web", "Паутина", 2, class_slug="sorcerer", concentration=True),
        _spell("sorc:counter", "Контрзаклинание", 3, class_slug="sorcerer", casting_time="1 реакция"),
        _spell("sorc:fly", "Полёт", 3, class_slug="sorcerer", concentration=True),
        _spell("sorc:banish", "Изгнание", 4, class_slug="sorcerer", concentration=True),
        _spell("sorc:dimension", "Уход в иное измерение", 4, class_slug="sorcerer"),
        _spell("sorc:telek", "Телекинез", 5, class_slug="sorcerer", concentration=True),
        _spell("sorc:wall", "Стена силы", 5, class_slug="sorcerer", concentration=True),
        _spell("sorc:disint", "Распыление", 6, class_slug="sorcerer"),
        _spell("sorc:globe", "Сфера неуязвимости", 6, class_slug="sorcerer", concentration=True),
        _spell("sorc:teleport", "Телепортация", 7, class_slug="sorcerer"),
        _spell("sorc:plane", "Уход на иной план", 7, class_slug="sorcerer"),
        _spell("sorc:dominate", "Подчинение чудовища", 8, class_slug="sorcerer", concentration=True),
        _spell("sorc:power", "Слово силы: оглушение", 8, class_slug="sorcerer"),
        _spell("sorc:meteor", "Метеоритный рой", 9, class_slug="sorcerer"),
        _spell("sorc:time", "Остановка времени", 9, class_slug="sorcerer"),
    ]
    known = sheet["spells"]["known"]
    seen = {s["id"] for s in known}
    for row in extra:
        if row["id"] not in seen:
            known.append(row)
    sheet["spells"]["known"] = known
    sheet["spells"]["slots"] = _full_slots()
    sheet["proficiency"] = {"bonus": 6}
    sheet["saves"] = {"con": {"is_proficient": True}, "cha": {"is_proficient": True}}
    sheet["skills"] = _skills("arcana", "persuasion", "deception", "insight")
    sheet["identity"] = {
        "alignment": "Хаотично-добрый",
        "experience": 355000,
        "background": "Артист",
        "player_name": "Игорь",
        "gender": "female",
        "age": "29",
        "height": "5′7″",
        "weight": "132 фнт.",
        "eyes": "Угольные",
        "skin": "С медными чешуйками",
        "hair": "Огненно-рыжие",
    }
    sheet["weapons"] = [
        _weapon("a-staff", "Посох", "str", "+6", "1к6+0", "дробящий"),
        _weapon("a-fb", "Огненный снаряд", "cha", "+11", "4к10", "огонь"),
    ]
    sheet["personality"] = {
        "personality": "Говорит тихо, но каждое слово жжёт.",
        "ideals": "Сила — это свобода.",
        "bonds": "Клятва крови прародителя.",
        "flaws": "Не терпит приказов.",
    }
    sheet["features_text"] = {
        "features": (
            "Драконья устойчивость (+1 ХП/уровень)\n"
            "Крылья дракона (полёт)\n"
            "Присутствие дракона\n"
            "Метамагия: 8 вариантов\n"
            "Гибкое колдовство / магическое направление"
        )
    }
    sheet["notes"] = {
        "proficiencies": "Кинжалы, дротики, пращи, посохи, лёгкие арбалеты.\nОбщий, драконий, эльфийский, небесный.",
        "appearance": "Человек с медными чешуйками на скулах; глаза цвета раскалённого угля.",
        "allies": "Клан алых драконов · Гильдия Арфистов",
        "background": "Родилась под знаком красного дракона. Скитается, испытывая пределы крови.",
        "treasure": "Чешуя прародителя · Сапфир из Кратера",
    }
    sheet["inventory"] = {
        "coins": {"cp": 0, "sp": 8, "ep": 0, "gp": 420, "pp": 3},
        "items": [
            {"name": "Посох силы"},
            {"name": "Кольцо защиты"},
            {"name": "Плащ защиты"},
            {"name": "Мешочек с компонентами"},
            {"name": "Зелье высшего лечения ×3"},
            {"name": "Кристалл фокусировки"},
        ],
        "notes": "",
    }
    sheet["combat"] = {
        **sheet.get("combat", {}),
        "ac": 16,
        "initiative": 2,
        "speed": 30,
        "inspiration": False,
        "hp_current": 162,
        "hp_max": 162,
        "hp_temp": 0,
        "hit_die": "d6",
        "hp_dice_current": 20,
        "death_successes": 0,
        "death_fails": 0,
    }
    return sheet


def upsert(
    db,
    user_id: uuid.UUID,
    char_id: uuid.UUID,
    *,
    name: str,
    class_name: str,
    level: int,
    race_name: str,
    hp_current: int,
    hp_max: int,
    sheet: dict,
) -> None:
    row = db.get(Character, char_id)
    now = datetime.now(timezone.utc)
    if row is None:
        db.add(
            Character(
                id=char_id,
                user_id=user_id,
                name=name,
                class_name=class_name,
                level=level,
                race_name=race_name,
                hp_current=hp_current,
                hp_max=hp_max,
                sheet=sheet,
                rules_edition=RulesEdition.edition_2014,
                sheet_version=1,
                is_draft=False,
                created_at=now,
                updated_at=now,
            )
        )
        print("created", char_id, name)
    else:
        row.name = name
        row.class_name = class_name
        row.level = level
        row.race_name = race_name
        row.hp_current = hp_current
        row.hp_max = hp_max
        row.sheet = sheet
        row.rules_edition = RulesEdition.edition_2014
        row.updated_at = now
        print("updated", char_id, name)


def main() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == EMAIL).one_or_none()
        if user is None:
            user = User(
                email=EMAIL,
                login="uikit03",
                password_hash=hash_password(PASSWORD),
                display_name="UIKIT03",
                email_verified_at=datetime.now(timezone.utc),
                theme_id="wis",
                ability_colors="identity",
            )
            db.add(user)
            db.flush()
        else:
            user.password_hash = hash_password(PASSWORD)
            user.email_verified_at = datetime.now(timezone.utc)

        upsert(
            db,
            user.id,
            DARRACK_ID,
            name="Даррак Железный Кулак",
            class_name="Жрец 3",
            level=3,
            race_name="Дварф (горный)",
            hp_current=24,
            hp_max=27,
            sheet=darrack_sheet(),
        )
        upsert(
            db,
            user.id,
            TORBIN_ID,
            name="Торбин Громовержец Железной Горы из Клана Кузни",
            class_name="Воин 3 / Плут 2 / Волшебник 2 / Бард 1",
            level=8,
            race_name="Дварф холмов (щитовой)",
            hp_current=58,
            hp_max=62,
            sheet=torbin_sheet(),
        )
        upsert(
            db,
            user.id,
            SORC_ID,
            name="Аэрин Пламенное Сердце",
            class_name="Чародей 20",
            level=20,
            race_name="Человек",
            hp_current=162,
            hp_max=162,
            sheet=aerin_sheet(),
        )
        db.commit()
        print(
            json.dumps(
                {
                    "email": EMAIL,
                    "password": PASSWORD,
                    "darrack": str(DARRACK_ID),
                    "torbin": str(TORBIN_ID),
                    "sorcerer20": str(SORC_ID),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
