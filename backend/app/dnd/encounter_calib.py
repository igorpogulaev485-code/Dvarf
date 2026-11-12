"""G-01: тонкий загрузчик справочника коэффициентов генератора боя."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_CALIB_PATH = Path(__file__).resolve().parent / "data" / "encounter_calib.json"


@lru_cache(maxsize=1)
def load_encounter_calib() -> dict[str, Any]:
    raw = json.loads(_CALIB_PATH.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise RuntimeError("encounter_calib.json must be an object")
    return raw


def clear_encounter_calib_cache() -> None:
    """Для тестов после подмены файла."""
    load_encounter_calib.cache_clear()


def party_power_clip() -> tuple[float, float]:
    clip = load_encounter_calib().get("party_power_clip") or [0.85, 2.2]
    return float(clip[0]), float(clip[1])


def party_power_weights() -> dict[str, float]:
    raw = load_encounter_calib().get("party_power_weights") or {}
    return {str(k): float(v) for k, v in raw.items()}


def homebrew_party_power_weights() -> dict[str, float]:
    raw = load_encounter_calib().get("homebrew_party_power") or {}
    return {str(k): float(v) for k, v in raw.items()}


def xp_thresholds_by_level() -> dict[int, tuple[int, int, int, int]]:
    raw = load_encounter_calib().get("xp_thresholds_by_level") or {}
    out: dict[int, tuple[int, int, int, int]] = {}
    for key, row in raw.items():
        lvl = int(key)
        vals = tuple(int(x) for x in row)
        if len(vals) != 4:
            raise RuntimeError(f"bad xp threshold row for level {lvl}")
        out[lvl] = vals  # type: ignore[assignment]
    return out


def monster_count_multipliers() -> list[tuple[int, float]]:
    raw = load_encounter_calib().get("monster_count_multipliers") or []
    return [(int(row[0]), float(row[1])) for row in raw]


def composition_spec(composition: str) -> dict[str, Any]:
    table = load_encounter_calib().get("composition") or {}
    spec = table.get(composition) or table.get("mixed") or {}
    return dict(spec)


def wave_profile_spec(profile: str) -> dict[str, Any]:
    table = load_encounter_calib().get("wave_profile") or {}
    return dict(table.get(profile) or {})


def fly_budget_bonus(*, weak_ranged: bool = True) -> float:
    """Множитель XP летунов: ≈+1 ступень при слабом дальнем, слабее при сильном."""
    calib = load_encounter_calib()
    if weak_ranged:
        return float(
            calib.get("fly_budget_bonus_weak_ranged")
            or calib.get("fly_budget_bonus")
            or 1.5
        )
    return float(calib.get("fly_budget_bonus_strong_ranged") or 1.15)


def ranged_band_thresholds() -> tuple[float, float]:
    raw = load_encounter_calib().get("ranged_band") or {}
    return (
        float(raw.get("medium_min_share") or 0.25),
        float(raw.get("strong_min_share") or 0.6),
    )


def ranged_band_default_unclear() -> str:
    raw = load_encounter_calib().get("ranged_band") or {}
    val = str(raw.get("default_when_unclear") or "medium")
    return val if val in {"low", "medium", "high"} else "medium"


def candidates_per_role() -> int:
    return max(2, min(5, int(load_encounter_calib().get("candidates_per_role") or 3)))


__all__ = [
    "candidates_per_role",
    "clear_encounter_calib_cache",
    "composition_spec",
    "fly_budget_bonus",
    "homebrew_party_power_weights",
    "load_encounter_calib",
    "monster_count_multipliers",
    "party_power_clip",
    "party_power_weights",
    "ranged_band_default_unclear",
    "ranged_band_thresholds",
    "wave_profile_spec",
    "xp_thresholds_by_level",
]
