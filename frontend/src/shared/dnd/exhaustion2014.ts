/**
 * PHB 2014 exhaustion (p. 291). Levels stack.
 * 1 disadvantage on ability checks, 2 speed halved, 3 disadvantage on
 * attacks and saves, 4 hit point maximum halved, 5 speed 0, 6 death.
 * Round down (PHB p. 7).
 */

export function clampExhaustionLevel(level: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.max(0, Math.min(6, Math.floor(level)))
}

/** Walk / climb / swim / fly. Level 5+ is 0, which replaces the level-2 half. */
export function exhaustionSpeedFt(speed: number | null, level: number): number | null {
  if (speed == null || !Number.isFinite(speed)) return null
  const n = clampExhaustionLevel(level)
  if (n >= 5) return 0
  if (n >= 2) return Math.floor(speed / 2)
  return speed
}

/** Stored maximum stays intact; this is the maximum while the level is active. */
export function exhaustionHpMax(hpMax: number | null, level: number): number | null {
  if (hpMax == null || !Number.isFinite(hpMax)) return null
  const n = clampExhaustionLevel(level)
  if (n >= 4) return Math.max(0, Math.floor(hpMax / 2))
  return hpMax
}

export function exhaustionHpCurrent(
  hpCurrent: number | null,
  hpMax: number | null,
  level: number,
): number | null {
  if (hpCurrent == null) return null
  const cap = exhaustionHpMax(hpMax, level)
  if (cap == null) return hpCurrent
  return Math.min(hpCurrent, cap)
}

export function exhaustionRollFlags(level: number): {
  disadvantageOnChecks: boolean
  disadvantageOnAttacksAndSaves: boolean
} {
  const n = clampExhaustionLevel(level)
  return {
    disadvantageOnChecks: n >= 1,
    disadvantageOnAttacksAndSaves: n >= 3,
  }
}

export function exhaustionSpeedNote(level: number): string | null {
  const n = clampExhaustionLevel(level)
  if (n >= 5) return 'истощение: скорость 0'
  if (n >= 2) return 'истощение: скорость ÷2'
  return null
}

export function exhaustionHpNote(level: number): string | null {
  return clampExhaustionLevel(level) >= 4 ? 'истощение: макс. хиты ÷2' : null
}
