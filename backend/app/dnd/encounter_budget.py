"""B8: бюджет энкаунтера — база DMG 2014 + множитель party_power.

См. docs/B8_ENCOUNTER_GENERATOR.md §C.
Пороги — Adventuring Day / Encounter Difficulty (DMG 2014).
party_power калибруется отдельно; сырой DMG для сильных пати занижает сложность.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Iterable

# level -> (easy, medium, hard, deadly) XP per character
XP_THRESHOLDS_BY_LEVEL: dict[int, tuple[int, int, int, int]] = {
    1: (25, 50, 75, 100),
    2: (50, 100, 150, 200),
    3: (75, 150, 225, 400),
    4: (125, 250, 375, 500),
    5: (250, 500, 750, 1100),
    6: (300, 600, 900, 1400),
    7: (350, 750, 1100, 1700),
    8: (450, 900, 1400, 2100),
    9: (550, 1100, 1600, 2400),
    10: (600, 1200, 1900, 2800),
    11: (800, 1600, 2400, 3600),
    12: (1000, 2000, 3000, 4500),
    13: (1100, 2200, 3400, 5100),
    14: (1250, 2500, 3800, 5700),
    15: (1400, 2800, 4300, 6400),
    16: (1600, 3200, 4800, 7200),
    17: (2000, 3900, 5900, 8800),
    18: (2100, 4200, 6300, 9500),
    19: (2400, 4900, 7300, 10900),
    20: (2800, 5700, 8500, 12700),
}

# DMG: множитель XP-«стоимости» встречи по числу монстров
MONSTER_COUNT_MULTIPLIERS: list[tuple[int, float]] = [
    (1, 1.0),
    (2, 1.5),
    (3, 2.0),  # 3–6
    (7, 2.5),  # 7–10
    (11, 3.0),  # 11–14
    (15, 4.0),  # 15+
]

PARTY_POWER_MIN = 0.85
PARTY_POWER_MAX = 2.2


class EncounterDifficulty(StrEnum):
    easy = "easy"
    medium = "medium"
    hard = "hard"
    deadly = "deadly"


_DIFF_INDEX = {
    EncounterDifficulty.easy: 0,
    EncounterDifficulty.medium: 1,
    EncounterDifficulty.hard: 2,
    EncounterDifficulty.deadly: 3,
}


def clamp_level(level: int) -> int:
    return max(1, min(20, int(level)))


def threshold_for_level(level: int, difficulty: EncounterDifficulty) -> int:
    row = XP_THRESHOLDS_BY_LEVEL[clamp_level(level)]
    return row[_DIFF_INDEX[difficulty]]


def budget_base(levels: Iterable[int], difficulty: EncounterDifficulty) -> int:
    """Σ порогов DMG по уровням участников (без party_power)."""
    return sum(threshold_for_level(lvl, difficulty) for lvl in levels)


def clamp_party_power(value: float) -> float:
    return max(PARTY_POWER_MIN, min(PARTY_POWER_MAX, float(value)))


def budget_adjusted(
    levels: Iterable[int],
    difficulty: EncounterDifficulty,
    party_power: float = 1.0,
) -> int:
    """Бюджет XP встречи с учётом силы пати."""
    base = budget_base(levels, difficulty)
    return max(0, int(round(base * clamp_party_power(party_power))))


def monster_count_multiplier(count: int) -> float:
    n = max(1, int(count))
    mult = 1.0
    for threshold, value in MONSTER_COUNT_MULTIPLIERS:
        if n >= threshold:
            mult = value
    return mult


def encounter_xp_cost(monster_xp_each: int, count: int) -> int:
    """Сколько «бюджета» съедает пачка с учётом множителя численности."""
    raw = max(0, int(monster_xp_each)) * max(1, int(count))
    return int(round(raw * monster_count_multiplier(count)))
