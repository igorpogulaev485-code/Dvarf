/**
 * PHB 2014 p. 15: if the Constitution modifier changes, hit point maximum
 * changes as though the new modifier had applied from 1st level.
 * Delta is (newMod − oldMod) × current character level, so a reverse ASI
 * subtracts the same integer and does not drift by 1.
 */

export function constitutionHpDelta(input: {
  previousMod: number
  nextMod: number
  levelCount: number
}): number {
  const levels = Math.max(0, Math.floor(input.levelCount))
  const prev = Math.trunc(input.previousMod)
  const next = Math.trunc(input.nextMod)
  return (next - prev) * levels
}

export function applyHpDelta(input: {
  hpMax: number | null
  hpCurrent: number | null
  delta: number
}): { hpMax: number | null; hpCurrent: number | null } {
  if (input.hpMax == null || input.delta === 0) {
    return { hpMax: input.hpMax, hpCurrent: input.hpCurrent }
  }
  const hpMax = Math.max(1, input.hpMax + input.delta)
  if (input.hpCurrent == null) return { hpMax, hpCurrent: hpMax }
  const hpCurrent = Math.max(0, Math.min(hpMax, input.hpCurrent + input.delta))
  return { hpMax, hpCurrent }
}
