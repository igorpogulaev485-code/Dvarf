/** Hit point max helpers: base max + temporary max bonus (Aid etc.). */

export function clampHpMaxBonus(value: number): number {
  return Math.max(0, Math.floor(value))
}

/** Effective combat max = base + temporary bonus. Null if base is unset. */
export function effectiveHpMax(
  hpMax: number | null,
  hpMaxBonus = 0,
): number | null {
  if (hpMax == null) return null
  return Math.max(1, Math.floor(hpMax) + clampHpMaxBonus(hpMaxBonus))
}

export function clampHpCurrentToMax(
  hpCurrent: number | null,
  effectiveMax: number | null,
): number | null {
  if (hpCurrent == null) return null
  const current = Math.max(0, Math.floor(hpCurrent))
  if (effectiveMax == null) return current
  return Math.min(effectiveMax, current)
}

/**
 * Adjust current HP when the temporary max bonus changes (Aid-like).
 * Increasing bonus can raise current by the same delta; decreasing always clamps.
 */
export function applyHpMaxBonusChange(input: {
  hpCurrent: number | null
  hpMax: number | null
  previousBonus: number
  nextBonus: number
  raiseCurrentWithBonus: boolean
}): number | null {
  const prevBonus = clampHpMaxBonus(input.previousBonus)
  const nextBonus = clampHpMaxBonus(input.nextBonus)
  const nextEffective = effectiveHpMax(input.hpMax, nextBonus)
  if (input.hpCurrent == null) {
    return nextEffective
  }
  let current = Math.max(0, Math.floor(input.hpCurrent))
  const delta = nextBonus - prevBonus
  if (delta > 0 && input.raiseCurrentWithBonus) {
    current += delta
  }
  return clampHpCurrentToMax(current, nextEffective)
}
