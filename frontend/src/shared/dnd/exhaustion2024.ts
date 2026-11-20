/**
 * SRD 5.2.1 Exhaustion (p. 181): levels 1–6, die at 6.
 * Each level: −2 to every D20 Test, Speed −5 ft × level.
 * No 2014 ladder (disadvantage / half speed / half max HP / speed 0).
 * Long Rest removes 1 level (handled in rest helpers).
 */

export function clampExhaustionLevel2024(level: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.max(0, Math.min(6, Math.floor(level)))
}

/** −2 × level to ability checks, saves, and attack rolls (D20 Test). */
export function exhaustionD20Penalty2024(level: number): number {
  return clampExhaustionLevel2024(level) * 2
}

/** Speed −5 ft per level; never below 0. Level 6 is death — speed still computed. */
export function exhaustionSpeedFt2024(speed: number | null, level: number): number | null {
  if (speed == null || !Number.isFinite(speed)) return null
  const n = clampExhaustionLevel2024(level)
  return Math.max(0, Math.floor(speed) - 5 * n)
}

/** 2024 does not halve hit point maximum. */
export function exhaustionHpMax2024(hpMax: number | null, _level: number): number | null {
  if (hpMax == null || !Number.isFinite(hpMax)) return null
  return hpMax
}

export function exhaustionHpCurrent2024(
  hpCurrent: number | null,
  hpMax: number | null,
  level: number,
): number | null {
  if (hpCurrent == null) return null
  const cap = exhaustionHpMax2024(hpMax, level)
  if (cap == null) return hpCurrent
  return Math.min(hpCurrent, cap)
}

export function exhaustionRollFlags2024(level: number): {
  d20Penalty: number
  disadvantageOnChecks: boolean
  disadvantageOnAttacksAndSaves: boolean
} {
  return {
    d20Penalty: exhaustionD20Penalty2024(level),
    disadvantageOnChecks: false,
    disadvantageOnAttacksAndSaves: false,
  }
}

export function exhaustionSpeedNote2024(level: number): string | null {
  const n = clampExhaustionLevel2024(level)
  if (n <= 0) return null
  return `истощение: скорость −${5 * n} фт`
}

export function exhaustionHpNote2024(_level: number): string | null {
  return null
}

export function exhaustionLevelLabel2024(level: number): string | null {
  const n = clampExhaustionLevel2024(level)
  if (n <= 0) return null
  if (n >= 6) return 'смерть'
  return `−${2 * n} к D20 Test · скорость −${5 * n} фт`
}
