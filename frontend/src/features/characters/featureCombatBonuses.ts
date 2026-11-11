/** Live combat bonuses derived from unlocked class/subclass features. */

import {
  initiativeBonusFromRaceGrant,
  type AppliedRaceGrant,
} from '../../shared/dnd/raceGrants'
import { abilityModifier, type AbilityKey } from './sheetTypes'

type FeatureLike = { id: string }

type AbilitiesLike = Partial<Record<AbilityKey, number>>

/**
 * Class/subclass initiative add-ons (stack with race/feat bonuses elsewhere).
 * - Dread Ambusher (Gloom Stalker): +Wisdom modifier
 * - Rakish Audacity (Swashbuckler): +Charisma modifier
 * Race (Hare-Trigger) and Alert feat: `initiativeBonusFromRaceGrant` /
 * `sumFeatInitiativeBonus`.
 */
export function initiativeBonusFromFeatures(input: {
  features: FeatureLike[]
  abilities: AbilitiesLike
}): number {
  let bonus = 0
  for (const feature of input.features) {
    if (feature.id === 'dread_ambusher') {
      const wis = input.abilities.wis
      bonus += typeof wis === 'number' ? abilityModifier(wis) : 0
      continue
    }
    if (feature.id === 'rakish_audacity') {
      const cha = input.abilities.cha
      bonus += typeof cha === 'number' ? abilityModifier(cha) : 0
    }
  }
  return bonus
}

/** Race combat_bonuses.initiative (e.g. Hare-Trigger = proficiency bonus). */
export function initiativeBonusFromRace(input: {
  grant: Pick<AppliedRaceGrant, 'combatBonuses'> | null | undefined
  proficiencyBonus: number
}): number {
  return initiativeBonusFromRaceGrant(input)
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
