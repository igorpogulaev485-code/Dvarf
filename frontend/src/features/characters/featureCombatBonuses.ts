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
/** PHB Remarkable Athlete: half proficiency, round up. */
export function halfProficiencyRoundUp(proficiencyBonus: number): number {
  return Math.ceil(Math.max(0, Math.floor(proficiencyBonus)) / 2)
}

/**
 * Champion Remarkable Athlete: half PB (round up) on Strength, Dexterity,
 * and Constitution checks that do not already add proficiency.
 */
export function remarkableAthleteCheckBonus(input: {
  features: FeatureLike[]
  proficiencyBonus: number
  ability: string
  includesProficiency: boolean
}): number {
  if (input.includesProficiency) return 0
  if (input.ability !== 'str' && input.ability !== 'dex' && input.ability !== 'con') return 0
  if (!input.features.some((feature) => feature.id === 'remarkable_athlete')) return 0
  return halfProficiencyRoundUp(input.proficiencyBonus)
}

/** Samurai Elegant Courtier: Wisdom modifier on Persuasion checks. */
export function elegantCourtierPersuasionBonus(input: {
  features: FeatureLike[]
  wisdomScore: number | null | undefined
  skillKey: string
}): number {
  if (input.skillKey !== 'persuasion') return 0
  if (!input.features.some((feature) => feature.id === 'elegant_courtier')) return 0
  if (typeof input.wisdomScore !== 'number') return 0
  return abilityModifier(input.wisdomScore)
}

export function initiativeBonusFromFeatures(input: {
  features: FeatureLike[]
  abilities: AbilitiesLike
  /** Remarkable Athlete adds half PB (round up) to initiative, a Dexterity check. */
  proficiencyBonus?: number
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
      continue
    }
    if (feature.id === 'tactical_wit') {
      const int = input.abilities.int
      bonus += typeof int === 'number' ? abilityModifier(int) : 0
      continue
    }
    if (feature.id === 'aura_of_the_sentinel') {
      const cha = input.abilities.cha
      const mod = typeof cha === 'number' ? abilityModifier(cha) : 0
      bonus += Math.max(1, mod)
      continue
    }
    if (feature.id === 'remarkable_athlete') {
      bonus += halfProficiencyRoundUp(input.proficiencyBonus ?? 0)
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

export const SYMBIOTIC_ACTIVE_PREFIX = 'Симбиотическая сущность'

/**
 * Circle of Spores: while Symbiotic Entity is up and temporary HP remain,
 * melee weapon hits deal an extra 1d6 necrotic. Same rider path as Divine Strike.
 */
export function symbioticNecroticRider(input: {
  features: Array<{ id: string }>
  resources: Array<{ id: string; activeLabel?: string }>
  hpTemp: number
  /** B-04: prefer ActiveEffect slug when present. */
  effects?: Array<{ slug?: string | null; inactive?: boolean | null }> | null
}): DivineStrikeRider | null {
  if (!input.features.some((row) => row.id === 'symbiotic_entity')) return null
  if (Math.floor(input.hpTemp) <= 0) return null
  const fromEffect = (input.effects ?? []).some(
    (row) => row.slug === 'symbiotic_entity' && !row.inactive,
  )
  const active =
    fromEffect ||
    input.resources.some(
      (row) =>
        row.id.includes(':symbiotic_entity:') &&
        (row.activeLabel ?? '').startsWith(SYMBIOTIC_ACTIVE_PREFIX),
    )
  if (!active) return null
  return {
    dice: '1d6',
    type: 'некротической энергией',
    label: '1к6 некротической энергией',
    rollLabel: 'Симбиотическая сущность, 1к6',
  }
}

export function haloDice(druidLevel: number, doubled: boolean): string {
  const level = Math.floor(druidLevel)
  const base = level >= 14 ? '1к10' : level >= 10 ? '1к8' : level >= 6 ? '1к6' : '1к4'
  return doubled ? base.replace('1к', '2к') : base
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
