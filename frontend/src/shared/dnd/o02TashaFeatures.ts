/**
 * O-02: Tasha class features at the table (buttons / turnEconomy / once-per-turn).
 * Names follow 5e14; sheet feature ids stay as in class JSON.
 */

import type { TurnCastTiming, TurnEconomyState, TurnSpendResult } from './turnEconomy'
import { canSpendFeature } from './turnEconomy'
import { tceTableVisible } from './tceOptions'

export const O02_FEATURE_IDS = [
  'ki_fueled_attack',
  'focused_aim',
  'quickened_healing',
  'magical_inspiration',
  'cd_harness_divine_power',
  'blessed_strikes',
  'favored_foe',
  'primal_awareness_tasha',
  'natures_veil',
  'magical_guidance',
  'cantrip_formulas',
  'primal_knowledge',
  'instinctive_pounce',
] as const

export type O02FeatureId = (typeof O02_FEATURE_IDS)[number]

/** Skills that Primal Knowledge may use Strength while raging. */
export const PRIMAL_KNOWLEDGE_SKILLS = [
  'animal_handling',
  'intimidation',
  'perception',
  'athletics',
] as const

export type PrimalKnowledgeSkill = (typeof PRIMAL_KNOWLEDGE_SKILLS)[number]

/** TCE Primal Awareness always-prepared spells by ranger level. */
export const PRIMAL_AWARENESS_SPELLS: Array<{
  name: string
  level: number
  fromClassLevel: number
}> = [
  { name: 'Speak with Animals', level: 1, fromClassLevel: 3 },
  { name: 'Beast Sense', level: 2, fromClassLevel: 5 },
  { name: 'Speak with Plants', level: 3, fromClassLevel: 9 },
  { name: 'Locate Creature', level: 4, fromClassLevel: 13 },
  { name: 'Commune with Nature', level: 5, fromClassLevel: 17 },
]

export const PRIMAL_AWARENESS_GRANT_LABEL = 'Первобытная осведомлённость (TCE)'
export const PRIMAL_AWARENESS_FREE_CAST_NOTE =
  '1/длинный отдых без ячейки · Первобытная осведомлённость (TCE)'

export const INSTINCTIVE_POUNCE_HINT =
  'Инстинктивный прыжок: можешь переместиться до половины скорости'

export const MAGICAL_GUIDANCE_SHEET_NAME = 'Магическое наставление'
/** 5e14 catalog name differs; do not rename the sheet feature. */
export const MAGICAL_GUIDANCE_5E14_NAME = 'Волшебное указание'

export function o02TableGate(tceAllowed: boolean | null | undefined): boolean {
  return tceTableVisible(tceAllowed === undefined ? null : tceAllowed)
}

export function hasO02Feature(
  features: Array<{ id?: string } | null | undefined> | null | undefined,
  id: O02FeatureId,
): boolean {
  return Boolean(features?.some((f) => f?.id === id))
}

/** Ki-Fueled Attack: ki spent as action this turn and bonus still free. */
export function canKiFueledAttack(state: TurnEconomyState): TurnSpendResult {
  if (state.kiSpentAs !== 'action') {
    return {
      ok: false,
      reason: 'Нужна трата ци действием в этот ход',
      mark: 'bonus',
    }
  }
  return canSpendFeature(state, 'bonus')
}

export function markKiSpent(
  state: TurnEconomyState,
  timing: TurnCastTiming,
): TurnEconomyState {
  if (timing !== 'action' && timing !== 'bonus') return state
  return { ...state, kiSpentAs: timing }
}

export function applyKiFueledAttack(state: TurnEconomyState): TurnEconomyState {
  return { ...state, bonus: true }
}

/** Focused Aim: +2 to the attack roll per ki (1–3). */
export function focusedAimBonus(ki: number): number {
  const n = Math.max(1, Math.min(3, Math.floor(ki)))
  return n * 2
}

export function focusedAimKiClamp(ki: number): number {
  return Math.max(1, Math.min(3, Math.floor(ki)))
}

/** Quickened Healing: martial arts die + PB hit points. */
export function quickenedHealingAmount(
  martialArtsDie: string | null | undefined,
  proficiencyBonus: number,
  rng: () => number = Math.random,
): { amount: number; label: string } {
  const pb = Math.max(1, Math.floor(proficiencyBonus))
  const die = parseMartialArtsSides(martialArtsDie) ?? 4
  const roll = 1 + Math.floor(rng() * die)
  const amount = roll + pb
  return {
    amount,
    label: `Ускоренное исцеление: ${roll} (к${die}) + ${pb} БМ = ${amount}`,
  }
}

function parseMartialArtsSides(die: string | null | undefined): number | null {
  if (!die) return null
  const m = String(die)
    .trim()
    .toLowerCase()
    .match(/1?\s*[kdк]\s*(\d+)/i)
  if (!m) return null
  const sides = Number(m[1])
  return Number.isFinite(sides) && sides > 0 ? sides : null
}

/** Blessed Strikes: +1d8 radiant once per turn (replaces Divine Strike / Potent Spellcasting). */
export function blessedStrikesRider(input: {
  features: Array<{ id: string }>
  tceAllowed: boolean | null | undefined
}): { dice: string; type: string; label: string } | null {
  if (!o02TableGate(input.tceAllowed)) return null
  if (!input.features.some((f) => f.id === 'blessed_strikes')) return null
  // Replaces Divine Strike / Potent Spellcasting — do not stack.
  if (input.features.some((f) => f.id.startsWith('divine_strike_'))) return null
  if (input.features.some((f) => f.id.includes('potent_spellcasting'))) return null
  return {
    dice: '1d8',
    type: 'излучением',
    label: '1к8 излучением, раз в ход',
  }
}

export function canUseBlessedStrikes(state: TurnEconomyState): boolean {
  return !state.blessedStrikesUsed
}

export function markBlessedStrikesUsed(state: TurnEconomyState): TurnEconomyState {
  return { ...state, blessedStrikesUsed: true }
}

/** Favored Foe extra damage die by ranger level. */
export function favoredFoeDamageDie(rangerLevel: number): string {
  const level = Math.max(1, Math.floor(rangerLevel))
  if (level >= 14) return '1d8'
  if (level >= 6) return '1d6'
  return '1d4'
}

export function favoredFoeDamageLabel(rangerLevel: number): string {
  const die = favoredFoeDamageDie(rangerLevel).replace('d', 'к')
  return `${die} (Избранный противник), раз в ход`
}

export function canUseFavoredFoeDamage(state: TurnEconomyState): boolean {
  return !state.favoredFoeDamageUsed
}

export function markFavoredFoeDamageUsed(state: TurnEconomyState): TurnEconomyState {
  return { ...state, favoredFoeDamageUsed: true }
}

export function isPrimalKnowledgeSkill(key: string): key is PrimalKnowledgeSkill {
  return (PRIMAL_KNOWLEDGE_SKILLS as readonly string[]).includes(key)
}

/**
 * While raging + Primal Knowledge: use Strength instead of the skill's normal ability.
 */
export function primalKnowledgeAbilityOverride(input: {
  skillKey: string
  raging: boolean
  hasPrimalKnowledge: boolean
  tceAllowed: boolean | null | undefined
}): 'str' | null {
  if (!o02TableGate(input.tceAllowed)) return null
  if (!input.raging || !input.hasPrimalKnowledge) return null
  if (!isPrimalKnowledgeSkill(input.skillKey)) return null
  return 'str'
}

/** Harness Divine Power is a bonus action (TCE / Igor 13.11). */
export const HARNESS_DIVINE_POWER_TIMING: TurnCastTiming = 'bonus'

export function harnessBonusGate(state: TurnEconomyState): TurnSpendResult {
  return canSpendFeature(state, HARNESS_DIVINE_POWER_TIMING)
}
