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

/**
 * PHB / XGE / TCE Divine Strike: extra weapon damage once on your turn.
 * Twilight (TCE) is radiant, not psychic. War uses the weapon's damage type.
 * Dice: 1d8 at 8, 2d8 at 14 — same number in the card and on the attack.
 */
const DIVINE_STRIKE_TYPE: Record<string, string | null> = {
  divine_strike_life: 'излучением',
  divine_strike_nature: 'холодом, огнём или электричеством',
  divine_strike_tempest: 'громом',
  divine_strike_trickery: 'ядом',
  divine_strike_war: null,
  divine_strike_death: 'некротической энергией',
  divine_strike_forge: 'огнём',
  divine_strike_order: 'психической энергией',
  divine_strike_twilight: 'излучением',
}

export type DivineStrikeRider = {
  /** Dice expression for the roller (`1d8` / `2d8`). */
  dice: string
  /** Null = same type as the weapon. */
  type: string | null
  /** Russian fragment for the attack line. */
  label: string
  /** Toast label when it should differ from the short attack line. */
  rollLabel?: string
}

export function divineStrikeRider(
  features: Array<{ id: string; classLevel: number }>,
): DivineStrikeRider | null {
  const feature = features.find((row) => row.id.startsWith('divine_strike_'))
  if (!feature) return null
  const diceCount = feature.classLevel >= 14 ? 2 : 1
  const dice = `${diceCount}d8`
  const type = DIVINE_STRIKE_TYPE[feature.id] ?? null
  const diceRu = `${diceCount}к8`
  const label = type ? `${diceRu} ${type}, раз в ход` : `${diceRu} того же типа, раз в ход`
  return { dice, type, label }
}

/**
 * PHB Improved Divine Smite (11th, p. 85): +1d8 radiant on every melee weapon hit.
 * Stacks with Divine Smite and is not part of the 5d8 slot cap. No slot is spent.
 */
export function improvedDivineSmiteRider(
  features: Array<{ id: string }>,
): DivineStrikeRider | null {
  if (!features.some((row) => row.id === 'improved_divine_smite')) return null
  return {
    dice: '1d8',
    type: 'излучением',
    label: '1к8 излучением',
    rollLabel: 'Улучшенная божественная кара, 1к8',
  }
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
