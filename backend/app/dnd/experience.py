"""PHB 2014: пороги опыта для уровней 1–20."""

from __future__ import annotations

# Индекс = уровень; значение = суммарный XP, чтобы быть на этом уровне.
XP_TO_REACH_LEVEL: tuple[int, ...] = (
    0,  # unused
    0,
    300,
    900,
    2700,
    6500,
    14000,
    23000,
    34000,
    48000,
    64000,
    85000,
    100000,
    120000,
    140000,
    165000,
    195000,
    225000,
    265000,
    305000,
    355000,
)


def clamp_level(level: object, *, default: int = 1) -> int:
    try:
        n = int(level)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        n = default
    return max(1, min(20, n))


def xp_to_reach_level(level: object) -> int:
    lvl = clamp_level(level)
    return XP_TO_REACH_LEVEL[lvl]


def level_from_xp(xp: object) -> int:
    try:
        total = max(0, int(xp))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        total = 0
    lvl = 1
    for candidate in range(1, 21):
        if total >= XP_TO_REACH_LEVEL[candidate]:
            lvl = candidate
        else:
            break
    return lvl


def crossed_next_threshold(*, before_xp: int, after_xp: int, level: int) -> bool:
    """True, если выдача впервые дотянула XP до порога следующего уровня."""
    lvl = clamp_level(level)
    if lvl >= 20:
        return False
    need = XP_TO_REACH_LEVEL[lvl + 1]
    return before_xp < need <= after_xp
