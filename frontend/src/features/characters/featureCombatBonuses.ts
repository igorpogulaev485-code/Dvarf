/** Live combat bonuses derived from unlocked class/subclass features. */

import { abilityModifier, type AbilityKey } from './sheetTypes'

type FeatureLike = { id: string }

type AbilitiesLike = Partial<Record<AbilityKey, number>>

/**
 * Dread Ambusher (Gloom Stalker): add Wisdom modifier to initiative.
 * Other initiative sources (Alert feat) are summed elsewhere.
 */
export function initiativeBonusFromFeatures(input: {
  features: FeatureLike[]
  abilities: AbilitiesLike
}): number {
  let bonus = 0
  for (const feature of input.features) {
    if (feature.id !== 'dread_ambusher') continue
    const wis = input.abilities.wis
    bonus += typeof wis === 'number' ? abilityModifier(wis) : 0
  }
  return bonus
}

/**
 * Umbral Sight (Gloom Stalker): darkvision 60 ft, or +30 ft if you already have it.
 * `baseDarkvision` is the sheet value before this feature (race / manual / gear separate).
 */
export function darkvisionFtFromFeatures(input: {
  features: FeatureLike[]
  baseDarkvision: number
}): number {
  const hasUmbral = input.features.some((feature) => feature.id === 'umbral_sight')
  const base = Math.max(0, Math.floor(input.baseDarkvision))
  if (!hasUmbral) return base
  if (base <= 0) return 60
  return base + 30
}
