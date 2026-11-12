"""DMG 2014: таблицы сокровищ и магических предметов (ступени 0–4 / 5–10 / 11–16 / 17+; A–I).

Источник: Dungeon Master's Guide (2014), гл. 7 «Treasure»:
- Individual Treasure — с. 136–137
- Treasure Hoard — с. 137–139
- Magic Item Tables A–I — с. 144–149

Генератор только наполняет сундук (S-06). G-01 вызывает тот же API/функцию.
«Легенда» (table I / legendary) — только вручную, без авторолла.
"""

from __future__ import annotations

import random
from typing import Any, Literal

Tier = Literal["0-4", "5-10", "11-16", "17+"]
QuickKind = Literal[
    "trinkets",  # Мелочь
    "supplies",  # Припасы
    "valuables",  # Ценности
    "magic",  # Магия
    "rare_magic",  # Редкая магия
    "legend",  # Легенда — без авторолла
    "trophies",  # Трофеи (звери)
]

COIN_KEYS = ("cp", "sp", "ep", "gp", "pp")

# Упрощённые строки магических предметов по таблицам A–I (имена как на dnd.su / PHB 2014).
MAGIC_TABLE_A: tuple[str, ...] = (
    "Зелье лечения",
    "Свиток заклинания 1 уровня",
    "Зелье лазания",
    "Зелье дружбы с животными",
    "Зелье силы холмового великана",
    "Пыль исчезновения",
    "Зелье водного дыхания",
)
MAGIC_TABLE_B: tuple[str, ...] = (
    "Зелье большого лечения",
    "Зелье огненного дыхания",
    "Зелье сопротивления",
    "Свиток заклинания 2 уровня",
    "Зелье ясновидения",
    "Зелье уменьшения",
    "Масло скольжения",
)
MAGIC_TABLE_C: tuple[str, ...] = (
    "Зелье высшего лечения",
    "Зелье героизма",
    "Свиток заклинания 3 уровня",
    "Зелье неуязвимости",
    "Зелье чтения мыслей",
    "Эликсир здоровья",
)
MAGIC_TABLE_D: tuple[str, ...] = (
    "Зелье превосходного лечения",
    "Зелье ясновидения",
    "Свиток заклинания 4 уровня",
    "Зелье скорости",
    "Зелье силы каменного великана",
)
MAGIC_TABLE_E: tuple[str, ...] = (
    "Свиток заклинания 5 уровня",
    "Зелье силы огненного великана",
    "Зелье силы облачного великана",
    "Зелье полёта",
)
MAGIC_TABLE_F: tuple[str, ...] = (
    "Оружие +1",
    "Щит +1",
    "Доспех +1",
    "Амулет здоровья",
    "Сапоги эльфийского вида",
    "Плащ защиты",
)
MAGIC_TABLE_G: tuple[str, ...] = (
    "Оружие +2",
    "Щит +2",
    "Доспех +2",
    "Кольцо защиты",
    "Плащ эльфийского вида",
)
MAGIC_TABLE_H: tuple[str, ...] = (
    "Оружие +3",
    "Доспех +2",
    "Щит +2",
    "Кольцо регенерации",
    "Посох силы",
)
MAGIC_TABLE_I: tuple[str, ...] = (
    "Оружие +3",
    "Доспех +3",
    "Кольцо трёх желаний",
    "Посох магов",
)

MAGIC_BY_TABLE: dict[str, tuple[str, ...]] = {
    "A": MAGIC_TABLE_A,
    "B": MAGIC_TABLE_B,
    "C": MAGIC_TABLE_C,
    "D": MAGIC_TABLE_D,
    "E": MAGIC_TABLE_E,
    "F": MAGIC_TABLE_F,
    "G": MAGIC_TABLE_G,
    "H": MAGIC_TABLE_H,
    "I": MAGIC_TABLE_I,
}

SUPPLIES: tuple[str, ...] = (
    "Зелье лечения",
    "Рационы (1 день)",
    "Факел",
    "Верёвка пеньковая (50 футов)",
    "Набор целителя",
    "Стрелы (20)",
    "Арбалетные болты (20)",
    "Фляга масла",
)

VALUABLES_GEMS: tuple[tuple[str, int], ...] = (
    ("Агат", 10),
    ("Лазурит", 10),
    ("Бирюза", 10),
    ("Кварц", 50),
    ("Цитрин", 50),
    ("Янтарь", 100),
    ("Гранат", 100),
    ("Жемчужина", 100),
    ("Аметист", 500),
    ("Хризоберилл", 500),
)

VALUABLES_ART: tuple[tuple[str, int], ...] = (
    ("Серебряная серьга", 25),
    ("Резной костяной идол", 25),
    ("Золотой браслет", 250),
    ("Обсидиановая статуэтка", 250),
    ("Шёлковый ковёр", 750),
    ("Золотая чаша с самоцветами", 750),
)

HUMANOID_GEAR: tuple[str, ...] = (
    "Короткий меч",
    "Скимитар",
    "Копьё",
    "Короткий лук",
    "Щит",
    "Кожаный доспех",
    "Кольчужная рубаха",
    "Кинжал",
)

BEAST_TROPHIES: tuple[str, ...] = (
    "Шкура зверя",
    "Клык",
    "Коготь",
    "Рог",
    "Железа",
    "Череп трофейный",
)


def tier_from_level(level: int) -> Tier:
    lvl = max(1, min(20, int(level)))
    if lvl <= 4:
        return "0-4"
    if lvl <= 10:
        return "5-10"
    if lvl <= 16:
        return "11-16"
    return "17+"


def _d(sides: int, rng: random.Random) -> int:
    return rng.randint(1, sides)


def _coins(**kwargs: int) -> dict[str, int]:
    out = {k: 0 for k in COIN_KEYS}
    for k, v in kwargs.items():
        if k in out:
            out[k] = max(0, int(v))
    return out


def _item(name: str, *, qty: int = 1, notes: str | None = None, table: str | None = None) -> dict[str, Any]:
    row: dict[str, Any] = {
        "id": "",  # заполняет вызывающий uuid4
        "name": name[:120],
        "qty": max(1, int(qty)),
        "notes": (notes or None),
        "artifact_id": None,
        "catalog_slug": None,
        "magic_table": table,
    }
    return row


def roll_individual_coins(tier: Tier, *, rng: random.Random | None = None) -> dict[str, int]:
    """Individual Treasure (DMG с. 136–137) — упрощённый бросок монет по ступени."""
    r = rng or random.Random()
    roll = _d(100, r)
    if tier == "0-4":
        if roll <= 30:
            return _coins(cp=5 * _d(6, r))
        if roll <= 60:
            return _coins(sp=4 * _d(6, r))
        if roll <= 70:
            return _coins(ep=3 * _d(6, r))
        if roll <= 95:
            return _coins(gp=3 * _d(6, r))
        return _coins(pp=1 * _d(6, r))
    if tier == "5-10":
        if roll <= 30:
            return _coins(cp=4 * _d(6, r) * 100, ep=1 * _d(6, r) * 10)
        if roll <= 60:
            return _coins(sp=6 * _d(6, r) * 10, gp=2 * _d(6, r) * 10)
        if roll <= 70:
            return _coins(ep=3 * _d(6, r) * 10, gp=2 * _d(6, r) * 10)
        if roll <= 95:
            return _coins(gp=4 * _d(6, r) * 10)
        return _coins(gp=2 * _d(6, r) * 10, pp=3 * _d(6, r))
    if tier == "11-16":
        if roll <= 20:
            return _coins(sp=4 * _d(6, r) * 100, gp=1 * _d(6, r) * 100)
        if roll <= 35:
            return _coins(ep=1 * _d(6, r) * 100, gp=1 * _d(6, r) * 100)
        if roll <= 75:
            return _coins(gp=2 * _d(6, r) * 100, pp=1 * _d(6, r))
        return _coins(gp=2 * _d(6, r) * 100, pp=1 * _d(6, r) * 10)
    # 17+
    if roll <= 15:
        return _coins(ep=2 * _d(6, r) * 1000, gp=8 * _d(6, r) * 100)
    if roll <= 55:
        return _coins(gp=1 * _d(6, r) * 1000, pp=1 * _d(6, r) * 100)
    return _coins(gp=1 * _d(6, r) * 1000, pp=2 * _d(6, r) * 100)


def roll_hoard_coins(tier: Tier, *, rng: random.Random | None = None) -> dict[str, int]:
    """Treasure Hoard coins (DMG с. 137–139)."""
    r = rng or random.Random()
    if tier == "0-4":
        return _coins(
            cp=6 * _d(6, r) * 100,
            sp=3 * _d(6, r) * 100,
            gp=2 * _d(6, r) * 10,
        )
    if tier == "5-10":
        return _coins(
            cp=2 * _d(6, r) * 100,
            sp=2 * _d(6, r) * 1000,
            gp=6 * _d(6, r) * 100,
            pp=3 * _d(6, r) * 10,
        )
    if tier == "11-16":
        return _coins(
            gp=4 * _d(6, r) * 1000,
            pp=5 * _d(6, r) * 100,
        )
    return _coins(
        gp=12 * _d(6, r) * 1000,
        pp=8 * _d(6, r) * 1000,
    )


def _pick_magic(table: str, rng: random.Random) -> dict[str, Any]:
    pool = MAGIC_BY_TABLE.get(table) or MAGIC_TABLE_A
    name = pool[_d(len(pool), rng) - 1]
    return _item(name, table=table)


def roll_magic_for_tier(
    tier: Tier,
    *,
    rare: bool = False,
    rng: random.Random | None = None,
) -> list[dict[str, Any]]:
    """Бросок магии для ступени. rare=True → таблицы D–H; иначе A–C (и иногда F)."""
    r = rng or random.Random()
    items: list[dict[str, Any]] = []
    roll = _d(100, r)
    if not rare:
        if tier == "0-4":
            if roll <= 60:
                return items
            if roll <= 85:
                items.append(_pick_magic("A", r))
            elif roll <= 95:
                for _ in range(2):
                    items.append(_pick_magic("A", r))
            else:
                items.append(_pick_magic("B", r))
        elif tier == "5-10":
            if roll <= 40:
                return items
            if roll <= 65:
                items.append(_pick_magic("A", r))
            elif roll <= 80:
                items.append(_pick_magic("B", r))
            elif roll <= 90:
                items.append(_pick_magic("C", r))
            else:
                items.append(_pick_magic("F", r))
        elif tier == "11-16":
            if roll <= 25:
                return items
            if roll <= 50:
                items.append(_pick_magic("B", r))
            elif roll <= 70:
                items.append(_pick_magic("C", r))
            elif roll <= 85:
                items.append(_pick_magic("D", r))
            else:
                items.append(_pick_magic("F", r))
        else:
            if roll <= 20:
                return items
            if roll <= 40:
                items.append(_pick_magic("C", r))
            elif roll <= 60:
                items.append(_pick_magic("D", r))
            elif roll <= 80:
                items.append(_pick_magic("E", r))
            else:
                items.append(_pick_magic("G", r))
        return items

    # Редкая магия — без table I (легенда только вручную)
    if tier == "0-4":
        items.append(_pick_magic("B", r))
    elif tier == "5-10":
        table = "C" if roll <= 50 else "D" if roll <= 80 else "F"
        items.append(_pick_magic(table, r))
    elif tier == "11-16":
        table = "D" if roll <= 40 else "E" if roll <= 70 else "G"
        items.append(_pick_magic(table, r))
    else:
        table = "E" if roll <= 35 else "G" if roll <= 70 else "H"
        items.append(_pick_magic(table, r))
    return items


def roll_valuables(tier: Tier, *, rng: random.Random | None = None) -> list[dict[str, Any]]:
    r = rng or random.Random()
    count = 1 if tier == "0-4" else 2 if tier in ("5-10", "11-16") else 3
    items: list[dict[str, Any]] = []
    pool = VALUABLES_GEMS if _d(2, r) == 1 else VALUABLES_ART
    # фильтр по ценности ступени
    if tier == "0-4":
        pool = tuple(p for p in pool if p[1] <= 100) or VALUABLES_GEMS[:4]
    elif tier == "5-10":
        pool = tuple(p for p in pool if 25 <= p[1] <= 500) or VALUABLES_GEMS
    else:
        pool = tuple(p for p in pool if p[1] >= 100) or VALUABLES_ART
    for _ in range(count):
        name, gp = pool[_d(len(pool), r) - 1]
        items.append(_item(name, notes=f"~{gp} зм"))
    return items


Difficulty = Literal["easy", "medium", "hard", "deadly"]


def difficulty_coin_mult(difficulty: str | None) -> float:
    key = (difficulty or "medium").strip().lower()
    return {
        "easy": 0.6,
        "medium": 1.0,
        "hard": 1.35,
        "deadly": 1.75,
    }.get(key, 1.0)


def scale_coins(coins: dict[str, int], mult: float) -> dict[str, int]:
    out = {k: 0 for k in COIN_KEYS}
    for k in COIN_KEYS:
        out[k] = max(0, int(round(int(coins.get(k) or 0) * mult)))
    return out


def generate_loot(
    *,
    party_level: int,
    difficulty: str | None = "medium",
    kind: QuickKind | None = None,
    has_humanoids: bool = False,
    has_beasts: bool = False,
    seed: int | None = None,
) -> dict[str, Any]:
    """Единый генератор наполнения сундука.

    Возвращает ``{coins, items, meta}``. ``kind=None`` — полная рекомендация «Подобрать добычу».
    ``kind='legend'`` — пусто (легенда только вручную).
    """
    rng = random.Random(seed)
    tier = tier_from_level(party_level)
    mult = difficulty_coin_mult(difficulty)
    coins = _coins()
    items: list[dict[str, Any]] = []
    meta: dict[str, Any] = {
        "tier": tier,
        "difficulty": difficulty or "medium",
        "kind": kind or "hoard",
        "tables": [],
        "notes": [],
    }

    if kind == "legend":
        meta["notes"].append("Легенда только вручную — авторолл отключён")
        return {"coins": coins, "items": items, "meta": meta}

    if kind == "trinkets":
        coins = scale_coins(roll_individual_coins(tier, rng=rng), mult * 0.5)
        meta["tables"].append("individual")
        if _d(100, rng) <= 40:
            items.append(_item("Безделушка", notes="мелочь"))
        return {"coins": coins, "items": items, "meta": meta}

    if kind == "supplies":
        n = 1 + (_d(3, rng) - 1)
        for _ in range(n):
            items.append(_item(SUPPLIES[_d(len(SUPPLIES), rng) - 1], qty=1))
        return {"coins": coins, "items": items, "meta": meta}

    if kind == "valuables":
        items.extend(roll_valuables(tier, rng=rng))
        meta["tables"].append("gems/art")
        return {"coins": coins, "items": items, "meta": meta}

    if kind == "magic":
        rolled = roll_magic_for_tier(tier, rare=False, rng=rng)
        items.extend(rolled)
        meta["tables"].extend(sorted({i.get("magic_table") for i in rolled if i.get("magic_table")}))
        return {"coins": coins, "items": items, "meta": meta}

    if kind == "rare_magic":
        rolled = roll_magic_for_tier(tier, rare=True, rng=rng)
        items.extend(rolled)
        meta["tables"].extend(sorted({i.get("magic_table") for i in rolled if i.get("magic_table")}))
        return {"coins": coins, "items": items, "meta": meta}

    if kind == "trophies":
        n = 1 + (_d(2, rng) - 1)
        pool = BEAST_TROPHIES if has_beasts or not has_humanoids else HUMANOID_GEAR
        for _ in range(n):
            items.append(_item(pool[_d(len(pool), rng) - 1]))
        return {"coins": coins, "items": items, "meta": meta}

    # Полный хорд «Подобрать добычу»
    coins = scale_coins(roll_hoard_coins(tier, rng=rng), mult)
    meta["tables"].append(f"hoard:{tier}")
    if _d(100, rng) <= 70:
        items.extend(roll_valuables(tier, rng=rng))
        meta["tables"].append("gems/art")
    magic = roll_magic_for_tier(tier, rare=False, rng=rng)
    items.extend(magic)
    meta["tables"].extend(sorted({i.get("magic_table") for i in magic if i.get("magic_table")}))
    if has_humanoids and _d(100, rng) <= 55:
        gear_n = 1 + (_d(3, rng) - 1)
        for _ in range(gear_n):
            items.append(_item(HUMANOID_GEAR[_d(len(HUMANOID_GEAR), rng) - 1], notes="с гуманоида"))
        meta["notes"].append("оружие/доспехи гуманоидов")
    if has_beasts and _d(100, rng) <= 40:
        items.append(_item(BEAST_TROPHIES[_d(len(BEAST_TROPHIES), rng) - 1], notes="трофей"))
        meta["notes"].append("трофеи зверей")
    # Легендарка (I) никогда не выпадает из авторолла
    meta["notes"].append("table I / легенда — только вручную")
    return {"coins": coins, "items": items, "meta": meta}
