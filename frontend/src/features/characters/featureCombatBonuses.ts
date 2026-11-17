/** Live combat bonuses derived from unlocked class/subclass features. */

import {
  initiativeBonusFromRaceGrant,
  type AppliedRaceGrant,
} from '../../shared/dnd/raceGrants'
import { abilityModifier, type AbilityKey } from './sheetTypes'

type FeatureLike = { id: string }

type AbilitiesLike = Partial<Record<AbilityKey, number>>

function normalizeFeatureId(id: string): string {
  return id.trim().replace(/-/g, '_')
}

function isRulesEdition2024(rulesEdition: string | null | undefined): boolean {
  return String(rulesEdition ?? '2014').trim() === '2024'
}

/**
 * Expanded crit range for Champion 2024 only (improved 19–20, superior 18–20).
 * 2014 sheets keep nat-20 crits — do not apply even if feature ids match.
 */
export function critThresholdFromFeatures(
  features: FeatureLike[],
  rulesEdition?: string | null,
): number {
  if (!isRulesEdition2024(rulesEdition)) return 20
  let threshold = 20
  for (const feature of features) {
    const id = normalizeFeatureId(feature.id)
    if (id === 'superior_critical') threshold = Math.min(threshold, 18)
    else if (id === 'improved_critical') threshold = Math.min(threshold, 19)
  }
  return threshold
}

/**
 * 2024-only initiative advantage from subclass calcs:
 * - Remarkable Athlete (Champion) — NOT the 2014 half-PB check bonus
 * - Assassinate (Assassin) — 2024 PHB; no 2014 surprised auto-crit here
 */
export function initiativeAdvantageFromFeatures(
  features: FeatureLike[],
  rulesEdition?: string | null,
): boolean {
  if (!isRulesEdition2024(rulesEdition)) return false
  return features.some((feature) => {
    const id = normalizeFeatureId(feature.id)
    return id === 'remarkable_athlete' || id === 'assassinate'
  })
}

/** Draconic Resilience feature id — hyphen form is 2024-catalog only. */
export function hasDraconicResilienceFeature(
  features: Array<{ id?: string }>,
  rulesEdition?: string | null,
): boolean {
  const allowHyphen = isRulesEdition2024(rulesEdition)
  return features.some((feature) => {
    const id = String(feature.id || '')
    if (id === 'draconic_resilience') return true
    return allowHyphen && id === 'draconic-resilience'
  })
}

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
 * PHB 2014 Improved Divine Smite (11th) / PHB 2024 Radiant Strikes (11th):
 * +1к8 излучением on melee weapon hit (2024 also covers unarmed — caller gates attack type).
 * Stacks with Divine Smite. No slot is spent.
 * 2014 sheets only ever carry `improved_divine_smite`; 2024 sheets carry `radiant_strikes`.
 */
export function improvedDivineSmiteRider(
  features: Array<{ id: string }>,
): DivineStrikeRider | null {
  const hasRadiantStrikes2024 = features.some((row) => {
    const id = row.id.trim().replace(/-/g, '_')
    return id === 'radiant_strikes'
  })
  const hasImproved2014 = features.some((row) => row.id === 'improved_divine_smite')
  if (!hasRadiantStrikes2024 && !hasImproved2014) return null
  return {
    dice: '1d8',
    type: 'излучением',
    label: '1к8 излучением',
    rollLabel: hasRadiantStrikes2024 ? 'Сияющие удары, 1к8' : 'Улучшенная божественная кара, 1к8',
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

/** PHB 2024 Rage Damage bonus by barbarian level (same ladder as B-04). */
export function rageDamageBonusFromLevel(barbarianLevel: number): number {
  const level = Math.max(1, Math.floor(barbarianLevel))
  if (level >= 16) return 4
  if (level >= 9) return 3
  return 2
}

/**
 * Berserker Frenzy (2024): while raging, if you use Reckless Attack,
 * first Strength hit this turn deals extra Nd6 where N = Rage Damage bonus
 * (NOT proficiency bonus).
 */
export function frenzy2024Rider(input: {
  features: Array<{ id: string; classLevel?: number }>
  rulesEdition?: string | null
  raging: boolean
  recklessAttack: boolean
  strengthBased: boolean
  alreadyUsedThisTurn?: boolean
}): DivineStrikeRider | null {
  if (!isRulesEdition2024(input.rulesEdition)) return null
  if (!input.raging || !input.recklessAttack || !input.strengthBased) return null
  if (input.alreadyUsedThisTurn) return null
  const feature = input.features.find(
    (row) => normalizeFeatureId(row.id) === 'frenzy',
  )
  if (!feature) return null
  const count = rageDamageBonusFromLevel(feature.classLevel ?? 1)
  return {
    dice: `${count}d6`,
    type: null,
    label: `${count}к6 (Бешенство)`,
    rollLabel: `Бешенство, ${count}к6`,
  }
}

/**
 * Assassin Assassinate (2024): in round 1 vs a creature that hasn't acted,
 * Sneak Attack damage increases by Rogue level (flat; not 2014 surprised crit).
 */
export function assassinate2024ExtraDamage(input: {
  features: Array<{ id: string; classLevel?: number }>
  rulesEdition?: string | null
  /** Player marks: first round, target has not acted yet. */
  applyRound1Bonus: boolean
}): { amount: number; label: string } | null {
  if (!isRulesEdition2024(input.rulesEdition)) return null
  if (!input.applyRound1Bonus) return null
  const feature = input.features.find(
    (row) => normalizeFeatureId(row.id) === 'assassinate',
  )
  if (!feature) return null
  const amount = Math.max(1, Math.floor(feature.classLevel ?? 1))
  return {
    amount,
    label: `Ликвидация +${amount}`,
  }
}

/** 2024 Assassinate does not grant auto-crit vs surprised (that is 2014). */
export function assassinateGrantsCritVsSurprised(
  features: FeatureLike[],
  rulesEdition?: string | null,
): boolean {
  if (!features.some((f) => normalizeFeatureId(f.id) === 'assassinate')) return false
  // Explicitly false for 2024; keep false for 2014 sheet automation too
  // (2014 crit-vs-surprised is handled elsewhere / not auto-wired).
  void rulesEdition
  return false
}
