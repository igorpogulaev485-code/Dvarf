"""B8/G-01: бюджет энкаунтера — пороги DMG 2014 + множитель party_power.

Пороги и клип силы — из `data/encounter_calib.json` (править справочник, не формулу).
Автопоправку «партия 20 уровня готова» не вводим.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Iterable

from app.dnd.encounter_calib import (
    monster_count_multipliers as _calib_monster_mults,
    party_power_clip,
    xp_thresholds_by_level as _calib_thresholds,
)


def _thresholds() -> dict[int, tuple[int, int, int, int]]:
    return _calib_thresholds()


def _monster_mults() -> list[tuple[int, float]]:
    return _calib_monster_mults()


# Совместимость со старыми импортами тестов.
XP_THRESHOLDS_BY_LEVEL: dict[int, tuple[int, int, int, int]] = _thresholds()
MONSTER_COUNT_MULTIPLIERS: list[tuple[int, float]] = _monster_mults()
PARTY_POWER_MIN, PARTY_POWER_MAX = party_power_clip()


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
    row = _thresholds()[clamp_level(level)]
    return row[_DIFF_INDEX[difficulty]]


def budget_base(levels: Iterable[int], difficulty: EncounterDifficulty) -> int:
    """Σ порогов DMG по уровням участников (без party_power)."""
    return sum(threshold_for_level(lvl, difficulty) for lvl in levels)


def clamp_party_power(value: float) -> float:
    lo, hi = party_power_clip()
    return max(lo, min(hi, float(value)))


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
    for threshold, value in _monster_mults():
        if n >= threshold:
            mult = value
    return mult


def encounter_xp_cost(monster_xp_each: int, count: int) -> int:
    """Сколько «бюджета» съедает пачка с учётом множителя численности."""
    raw = max(0, int(monster_xp_each)) * max(1, int(count))
    return int(round(raw * monster_count_multiplier(count)))
