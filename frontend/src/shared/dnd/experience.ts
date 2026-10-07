/** PHB 2014/SRD: cumulative XP required to reach each level (index = level). */
export const XP_TO_REACH_LEVEL: readonly number[] = [
  0, // unused (level 0)
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
] as const

export type XpProgress = {
  xp: number
  level: number
  /** XP needed to be at the current level. */
  floor: number
  /** XP needed for next level; null at level 20. */
  nextThreshold: number | null
  /** 0..1 within the current level band. */
  ratio: number
  /** XP still needed for next level; null at 20. */
  remaining: number | null
}

export function clampCharacterLevel(level: number): number {
  return Math.min(20, Math.max(1, Math.floor(level) || 1))
}

export function xpToReachLevel(level: number): number {
  const lvl = clampCharacterLevel(level)
  return XP_TO_REACH_LEVEL[lvl] ?? 0
}

export function xpProgress(xpRaw: number, levelRaw: number): XpProgress {
  const level = clampCharacterLevel(levelRaw)
  const xp = Math.max(0, Math.floor(xpRaw) || 0)
  const floor = xpToReachLevel(level)
  const nextThreshold = level >= 20 ? null : xpToReachLevel(level + 1)

  if (nextThreshold == null) {
    return {
      xp,
      level,
      floor,
      nextThreshold: null,
      ratio: 1,
      remaining: null,
    }
  }

  const span = Math.max(1, nextThreshold - floor)
  const ratio = Math.min(1, Math.max(0, (xp - floor) / span))
  const remaining = Math.max(0, nextThreshold - xp)

  return {
    xp,
    level,
    floor,
    nextThreshold,
    ratio,
    remaining,
  }
}

export function formatXp(n: number): string {
  return n.toLocaleString('ru-RU')
}
