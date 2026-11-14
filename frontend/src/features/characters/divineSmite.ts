/**
 * PHB 2014 Divine Smite (p. 85) and the melee-hit gate around it.
 * Slot dice stay on `slotSpendDiceCount` (cap 5d8). The undead/fiend die is extra.
 */

import type { FeatureSlotSpendDef } from '../../shared/dnd/classFeatures'
import { slotSpendDiceCount } from '../../shared/dnd/classFeatures'
import { isRangedWeaponAttackName } from '../../shared/dnd/fightingStyles'
import type { SpellSlotState } from '../../shared/dnd/spells'
import { clampSlot } from '../../shared/dnd/spells'
import { rollDamage } from './deskRolls'

export const DIVINE_SMITE_FEATURE_ID = 'divine_smite'

export type DivineSmiteIntent = {
  /** Circle prepared for the next confirmed melee hit. Null = choose after the roll. */
  slotLevel: number | null
  vsUndeadOrFiend: boolean
}

/**
 * Circles the character actually has (max > 0), within the feature's min/max.
 * Empty pools stay listed but are shown inactive by the UI.
 */
export function divineSmitePresentLevels(
  spend: FeatureSlotSpendDef,
  slots: Record<string, SpellSlotState>,
): number[] {
  const levels: number[] = []
  for (let level = spend.min_slot; level <= spend.max_slot; level += 1) {
    const slot = clampSlot(slots[String(level)] ?? { max: 0, used: 0 })
    if (slot.max > 0) levels.push(level)
  }
  return levels
}

/**
 * After an attack roll: natural 1 never offers smite; natural 20 forces crit.
 * Existing crit/natural flags win — no AC hit logic here.
 */
export function resolveSmiteAfterAttack(input: {
  naturalDie?: number | null
  critFlag?: boolean
  tableMiss?: boolean
}): { offer: boolean; crit: boolean; autoMiss: boolean } {
  const die =
    typeof input.naturalDie === 'number' && Number.isFinite(input.naturalDie)
      ? Math.floor(input.naturalDie)
      : null
  if (input.tableMiss || die === 1) {
    return { offer: false, crit: false, autoMiss: true }
  }
  const crit = Boolean(input.critFlag) || die === 20
  return { offer: true, crit, autoMiss: false }
}

export type DivineSmiteDice = {
  /** Dice from the slot, already capped (4th and 5th are both 5). */
  slotDice: number
  /** +1d8 vs undead or fiend. Not part of the 5d8 slot cap. */
  undeadDice: number
  totalDice: number
  diceSize: number
  /** Roller expression (`2d8`). */
  expression: string
  /** Russian formula (`2к8`). */
  formulaRu: string
}

export function divineSmiteSpendOf(
  features: Array<{ id: string; slot_spend?: FeatureSlotSpendDef }>,
): FeatureSlotSpendDef | null {
  const row = features.find((feature) => feature.id === DIVINE_SMITE_FEATURE_ID)
  return row?.slot_spend ?? null
}

export function divineSmiteDice(input: {
  spend: FeatureSlotSpendDef
  slotLevel: number
  vsUndeadOrFiend: boolean
}): DivineSmiteDice {
  const slotDice = slotSpendDiceCount(input.spend, input.slotLevel)
  const undeadDice = input.vsUndeadOrFiend ? 1 : 0
  const totalDice = slotDice + undeadDice
  const diceSize = input.spend.dice_size ?? 8
  return {
    slotDice,
    undeadDice,
    totalDice,
    diceSize,
    expression: `${totalDice}d${diceSize}`,
    formulaRu: `${totalDice}к${diceSize}`,
  }
}

/**
 * Melee weapon attack, including an unarmed strike.
 * Bows, crossbows, darts, slings and a javelin listed as a throw do not qualify.
 * A spear (`Копьё`) stays melee; `Метательное копьё` is the thrown attack.
 */
export function isMeleeWeaponAttackName(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  if (/безоруж|unarmed/i.test(trimmed)) return true
  if (isRangedWeaponAttackName(trimmed)) return false
  if (/метательн|бросок|метнуть/i.test(trimmed)) return false
  return true
}

export type OpenSmiteStrike = {
  melee: boolean
  smiteApplied: boolean
}

export type SmiteSlotClick =
  | { action: 'apply'; slotLevel: number }
  | { action: 'arm'; slotLevel: number }
  | { action: 'disarm' }
  | { action: 'refuse'; reason: 'no_slot' | 'ranged' | 'already' }

/**
 * A circle button spends a slot only when a melee hit is still open.
 * Otherwise it only arms the next confirmation. A miss button never calls this.
 */
export function decideSmiteSlotClick(input: {
  slotLevel: number
  armedSlot: number | null
  open: OpenSmiteStrike | null
  slotAvailable: boolean
}): SmiteSlotClick {
  if (!input.slotAvailable) return { action: 'refuse', reason: 'no_slot' }
  if (input.open && !input.open.melee) return { action: 'refuse', reason: 'ranged' }
  if (input.open?.smiteApplied) return { action: 'refuse', reason: 'already' }
  if (input.open?.melee) return { action: 'apply', slotLevel: input.slotLevel }
  if (input.armedSlot === input.slotLevel) return { action: 'disarm' }
  return { action: 'arm', slotLevel: input.slotLevel }
}

/** Radiant extra for one confirmed hit. Crit doubles the dice inside `rollDamage`. */
export function rollDivineSmiteExtra(input: {
  spend: FeatureSlotSpendDef
  slotLevel: number
  vsUndeadOrFiend: boolean
  crit: boolean
  rng?: () => number
}): { line: string; total: number; chip: string } | null {
  const dice = divineSmiteDice(input)
  const rolled = rollDamage(dice.expression, input.rng ?? Math.random, {
    crit: input.crit,
  })
  if (!rolled) return null
  const vs = dice.undeadDice ? ', нежить/исчадие' : ''
  const critNote = input.crit ? ', крит' : ''
  const vsChip = dice.undeadDice ? ' · нежить' : ''
  const critChip = input.crit ? ' · крит' : ''
  return {
    total: rolled.total,
    line: ` + ${rolled.total} излучением (Божественная кара, ${dice.formulaRu}${vs}${critNote}, ${rolled.detail})`,
    chip: `${rolled.total} излучением · ${dice.formulaRu}${vsChip}${critChip}`,
  }
}

/** Radiant extra for one confirmed hit. Crit doubles the dice inside `rollDamage`. */
export function formatDivineSmiteExtra(input: {
  spend: FeatureSlotSpendDef
  slotLevel: number
  vsUndeadOrFiend: boolean
  crit: boolean
  rng?: () => number
}): string {
  return rollDivineSmiteExtra(input)?.line ?? ''
}
