/** Class walk-speed bonuses (Fast Movement, Unarmored Movement). */

import { resolveClassFeatureSlug } from './classFeatures'
import type { ClassLevelEntry } from './classLevels'

/** Monk Unarmored Movement bonus by class level (PHB 2014). */
const MONK_UNARMORED_MOVEMENT_FT: Array<{ minLevel: number; bonus: number }> = [
  { minLevel: 18, bonus: 30 },
  { minLevel: 14, bonus: 25 },
  { minLevel: 10, bonus: 20 },
  { minLevel: 6, bonus: 15 },
  { minLevel: 2, bonus: 10 },
]

function monkUnarmoredBonusFt(classLevel: number): number {
  for (const row of MONK_UNARMORED_MOVEMENT_FT) {
    if (classLevel >= row.minLevel) return row.bonus
  }
  return 0
}

/**
 * Extra walk speed from class features (not baked into race speed).
 * Barbarian Fast Movement (5+): +10 unless heavy armor.
 * Monk Unarmored Movement (2+): scale unless armor or shield.
 */
export function classWalkSpeedBonusFt(input: {
  classes: Array<Pick<ClassLevelEntry, 'name' | 'level'>>
  wearingHeavyArmor?: boolean
  /** Any body armor or shield — blocks monk Unarmored Movement. */
  wearingArmorOrShield?: boolean
}): number {
  let bonus = 0
  for (const row of input.classes) {
    const slug = resolveClassFeatureSlug(row.name)
    const level = Math.max(0, Math.floor(row.level))
    if (slug === 'barbarian' && level >= 5 && !input.wearingHeavyArmor) {
      bonus += 10
    }
    if (slug === 'monk' && !input.wearingArmorOrShield) {
      bonus += monkUnarmoredBonusFt(level)
    }
  }
  return bonus
}

/**
 * Resolve displayed walk speed without double-counting a class bonus that was
 * already baked into `storedSpeed` (create wrote race+10, or tester fixed to 40).
 *
 * Manual overrides (stored ≠ race and ≠ race+maxClassBonus) stay as-is + gear.
 */
export function resolveWalkSpeedFt(input: {
  storedSpeed: number | null
  raceSpeed: number | null
  /** Currently active class bonus (armor-aware). */
  classBonusFt: number
  /**
   * Class bonus if armor weren't blocking — used to detect a baked
   * Fast Movement / Unarmored Movement already sitting in storedSpeed.
   */
  classBonusFtMax?: number
  gearBonusFt?: number
}): number | null {
  const activeBonus = Math.max(0, Math.floor(input.classBonusFt))
  const maxBonus = Math.max(
    activeBonus,
    Math.max(0, Math.floor(input.classBonusFtMax ?? activeBonus)),
  )
  const gear = Math.floor(input.gearBonusFt ?? 0)
  const race = input.raceSpeed
  const stored = input.storedSpeed

  if (stored == null && race == null && !activeBonus && !gear) return null

  // Without a race baseline we cannot detect a baked class bonus — trust stored.
  if (race == null) {
    if (stored == null) return gear ? gear : null
    return stored + gear
  }

  const looksBaked = maxBonus > 0 && stored === race + maxBonus
  const matchesRace = stored != null && stored === race

  if (stored != null && !looksBaked && !matchesRace) {
    // Explicit manual override — do not re-add class bonus.
    return stored + gear
  }

  const base = looksBaked ? race : (stored ?? race)
  return base + activeBonus + gear
}
