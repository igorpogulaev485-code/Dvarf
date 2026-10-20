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
 * Strip class / feat bonuses that create or feat-apply baked into `storedSpeed`,
 * so live armor-aware class bonus can be re-added without double-counting.
 * Returns race baseline when stored matches a known bake; null = manual override.
 */
function stripBakedWalkBase(input: {
  stored: number
  race: number
  featBonusFt: number
  maxClassBonusFt: number
}): number | null {
  const { stored, race, featBonusFt: feat, maxClassBonusFt: maxClass } = input
  if (stored === race) return race
  if (feat > 0 && stored === race + feat) return race
  if (maxClass > 0 && stored === race + maxClass) return race
  if (feat > 0 && maxClass > 0 && stored === race + feat + maxClass) return race
  return null
}

/**
 * Resolve displayed walk speed without double-counting class/feat bonuses
 * already baked into `storedSpeed` (create wrote race+class, Mobile wrote +10).
 *
 * Manual overrides (stored ≠ race / race+feat / race+class / race+feat+class)
 * stay as-is + gear.
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
  /** Mobile and other feat speed bonuses (from feat ledger, not gear). */
  featBonusFt?: number
  gearBonusFt?: number
}): number | null {
  const activeBonus = Math.max(0, Math.floor(input.classBonusFt))
  const maxBonus = Math.max(
    activeBonus,
    Math.max(0, Math.floor(input.classBonusFtMax ?? activeBonus)),
  )
  const feat = Math.max(0, Math.floor(input.featBonusFt ?? 0))
  const gear = Math.floor(input.gearBonusFt ?? 0)
  const race = input.raceSpeed
  const stored = input.storedSpeed

  if (stored == null && race == null && !activeBonus && !feat && !gear) return null

  // Without a race baseline we cannot detect baked class/feat — trust stored.
  if (race == null) {
    if (stored == null) {
      const bare = feat + activeBonus + gear
      return bare || null
    }
    return stored + gear
  }

  if (stored == null) {
    return race + feat + activeBonus + gear
  }

  const stripped = stripBakedWalkBase({
    stored,
    race,
    featBonusFt: feat,
    maxClassBonusFt: maxBonus,
  })

  if (stripped == null) {
    // Explicit manual override — do not re-add class/feat (already in stored).
    return stored + gear
  }

  return stripped + feat + activeBonus + gear
}
