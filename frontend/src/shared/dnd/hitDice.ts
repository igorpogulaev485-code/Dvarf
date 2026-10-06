/** Hit dice helpers for short/long rest. */

export const HIT_DIE_OPTIONS = ['d6', 'd8', 'd10', 'd12'] as const
export type HitDie = (typeof HIT_DIE_OPTIONS)[number]

export function isHitDie(value: unknown): value is HitDie {
  return value === 'd6' || value === 'd8' || value === 'd10' || value === 'd12'
}

export function clampHitDiceCurrent(current: number, max: number): number {
  const safeMax = Math.max(0, Math.floor(max))
  return Math.min(safeMax, Math.max(0, Math.floor(current)))
}

export function clampDeathMarks(value: number): number {
  return Math.min(3, Math.max(0, Math.floor(value)))
}

/** 2014: regain hit dice equal to half your total (min 1), up to max. */
export function recoverHitDiceOnLongRest(current: number, max: number): number {
  const safeMax = Math.max(0, Math.floor(max))
  if (safeMax <= 0) return 0
  const regain = Math.max(1, Math.floor(safeMax / 2))
  return clampHitDiceCurrent(current + regain, safeMax)
}

export function spendHitDie(current: number): number {
  return Math.max(0, Math.floor(current) - 1)
}

export function hitDieSides(die: HitDie): number {
  return Number(die.slice(1))
}

/** Average die face (e.g. d8 → 5) + CON mod; floor at 0 before CON can still heal 0+. */
export function suggestedHitDieHeal(die: HitDie, constitutionMod: number): number {
  const avg = Math.ceil(hitDieSides(die) / 2) + 1
  return Math.max(0, avg + constitutionMod)
}

export function applyHitDieHeal(input: {
  hpCurrent: number | null
  hpMax: number | null
  healAmount: number
}): number | null {
  if (input.hpMax == null) return input.hpCurrent
  const current = input.hpCurrent ?? 0
  const heal = Math.max(0, Math.floor(input.healAmount))
  return Math.min(input.hpMax, current + heal)
}
