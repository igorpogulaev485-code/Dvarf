/** Pure rest helpers — sheet now, party frame later. */

import {
  recoverHitDicePoolsOnLongRest,
  type ClassHitDicePool,
} from './classHitDice'
import { recoverHitDiceOnLongRest } from './hitDice'
import { clampSlot, type SpellSlotState } from './spells'

export type ResourceReset = 'short' | 'long' | 'manual' | 'dawn' | 'midnight'

export type SheetResource = {
  id: string
  name: string
  max: number
  used: number
  reset: ResourceReset
  /**
   * Show pips on PlayDesk hot bar.
   * `undefined` = legacy default (on). Note-block resources opt in with `true`.
   */
  onHot?: boolean
  /** spend: used = expended. stock: used = current holdings (ward HP, portent dice). */
  track?: 'spend' | 'stock'
  /** Recorded d20s (Portent). */
  dice?: number[]
  /** Active feature state shown on the card (Bladesong, Third Eye). */
  activeLabel?: string
  /** Arcane Ward has been created since the last long rest. */
  wardCreated?: boolean
  /** Does not deplete (PHB barbarian rage at 20). */
  unlimited?: boolean
  /**
   * Dawn / midnight recharge. Dice ("4d6+2") are rolled.
   * A plain integer ("3") restores that many charges.
   * Absent = refill to max.
   */
  rechargeDice?: string
  /** Shown when the last charge is spent. The sheet does not destroy the item. */
  depleteHint?: string
}

export function clampExhaustion(value: number): number {
  return Math.min(6, Math.max(0, Math.floor(value)))
}

export function clampResource(resource: SheetResource): SheetResource {
  const max = Math.max(0, Math.floor(resource.max))
  const used = Math.min(max, Math.max(0, Math.floor(resource.used)))
  const reset: ResourceReset =
    resource.reset === 'short' ||
    resource.reset === 'long' ||
    resource.reset === 'manual' ||
    resource.reset === 'dawn' ||
    resource.reset === 'midnight'
      ? resource.reset
      : 'long'
  const rechargeDice = resource.rechargeDice?.trim() || undefined
  const depleteHint = resource.depleteHint?.trim() || undefined
  const onHot =
    typeof resource.onHot === 'boolean' ? resource.onHot : undefined
  const dice = Array.isArray(resource.dice)
    ? resource.dice
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.min(20, Math.max(1, Math.floor(value))))
    : undefined
  return {
    ...resource,
    max,
    used,
    reset,
    ...(onHot === undefined ? {} : { onHot }),
    ...(dice && dice.length ? { dice } : { dice: undefined }),
    ...(resource.activeLabel?.trim()
      ? { activeLabel: resource.activeLabel.trim() }
      : { activeLabel: undefined }),
    ...(resource.wardCreated ? { wardCreated: true } : { wardCreated: undefined }),
    ...(resource.unlimited ? { unlimited: true, used: 0 } : { unlimited: undefined }),
    ...(rechargeDice ? { rechargeDice } : { rechargeDice: undefined }),
    ...(depleteHint ? { depleteHint } : { depleteHint: undefined }),
  }
}

/** Same current/max on the feature card and the combat bar. Stock keeps holdings in `used`. */
export function resourceShownCurrent(resource: SheetResource): number {
  if (resource.track === 'stock') {
    return Math.max(0, Math.min(resource.max, Math.floor(resource.used)))
  }
  return Math.max(0, resource.max - resource.used)
}

/** Hot-bar visibility: explicit false hides; undefined/true shows (legacy + class pools). */
export function resourceShowsOnHot(resource: SheetResource): boolean {
  if (resource.onHot === false) return false
  // HDP daily is not a direct hot spend — only via Channel Divinity dialog / amulet.
  if (resource.id.includes(':harness_divine_power:')) return false
  if (resource.unlimited) return Boolean(resource.name.trim())
  return resource.max > 0 && Boolean(resource.name.trim())
}

function clearExpiredPack07Label(resource: SheetResource): SheetResource {
  const label = resource.activeLabel ?? ''
  if (
    label.startsWith('Симбиотическая сущность') ||
    label.startsWith('Дух-тотем') ||
    label.startsWith('Знамение:')
  ) {
    const next = { ...resource }
    delete next.activeLabel
    return next
  }
  return resource
}

export function resetResourcesOnRest(
  resources: SheetResource[],
  kind: 'short' | 'long',
): SheetResource[] {
  return resources.map((raw) => {
    const resource = clampResource(raw)
    if (resource.reset === 'manual') return resource
    // Dawn and midnight roll (or refill) in rechargeFormulaResources, not here.
    if (resource.reset === 'dawn' || resource.reset === 'midnight') return resource
    if (kind === 'short' && resource.reset !== 'short') return resource
    // long rest clears short- and long-reset resources
    return clearExpiredPack07Label({ ...resource, used: 0 })
  })
}

/** Recover all leveled spell slots (and pact slots) after a long rest. */
export function recoverSpellSlotsOnLongRest(
  slots: Record<string, SpellSlotState>,
): Record<string, SpellSlotState> {
  const next: Record<string, SpellSlotState> = {}
  for (const [key, slot] of Object.entries(slots)) {
    const clamped = clampSlot(slot)
    const flexible = clamped.flexible ?? 0
    next[key] = { max: Math.max(0, clamped.max - flexible), used: 0 }
  }
  return next
}

/**
 * PHB Sorcerous Restoration: a 20th-level sorcerer regains 4 sorcery points
 * on a short rest, up to the pool maximum.
 */
export function regainSorceryPointsOnShortRest(
  resources: SheetResource[],
  amount = 4,
): SheetResource[] {
  const gain = Math.max(0, Math.floor(amount))
  if (gain <= 0) return resources
  return resources.map((raw) => {
    const resource = clampResource(raw)
    if (resource.track === 'stock') return resource
    if (!resource.id.includes('sorcery_points')) return resource
    if (resource.max < 20) return resource
    const regained = Math.min(gain, resource.used)
    if (regained <= 0) return resource
    return { ...resource, used: resource.used - regained }
  })
}

/** 2014 PHB: long rest reduces exhaustion by 1 (min 0). */
export function reduceExhaustionOnLongRest(exhaustion: number): number {
  return clampExhaustion(exhaustion - 1)
}

export type RestResult = {
  resources: SheetResource[]
  slots?: Record<string, SpellSlotState>
  pact_slots?: { max: number; used: number; level: number } | null
  exhaustion?: number
  hp_current?: number | null
  hp_temp?: number
  hit_dice_current?: number
  hit_dice_by_class?: ClassHitDicePool[]
  is_dying?: boolean
  death_successes?: number
  death_fails?: number
  /** Player-visible dawn / midnight charge rolls from this long rest. */
  rechargeLines?: string[]
}

/**
 * 2014 PHB: short rest recovers short-reset resources and warlock pact slots.
 * Spell slots (Spellcasting) stay spent until a long rest.
 */
export function applyShortRest(input: {
  resources: SheetResource[]
  /** When provided, pact `used` is cleared (PHB Pact Magic). Omit to leave spells untouched. */
  pact_slots?: { max: number; used: number; level: number } | null
}): RestResult {
  const result: RestResult = {
    resources: regainSorceryPointsOnShortRest(
      resetResourcesOnRest(input.resources, 'short'),
    ),
  }
  if (input.pact_slots !== undefined) {
    const pact = input.pact_slots
    result.pact_slots = pact ? { ...pact, used: 0 } : null
  }
  return result
}

function rollChargeFormula(
  formula: string,
  rng: () => number,
): number | null {
  const text = formula.trim().toLowerCase()
  const fixed = text.match(/^\+?\d+$/)
  if (fixed) return Math.max(0, Math.floor(Number(text.replace('+', ''))))
  const match = text.match(/(\d+)\s*[dк]\s*(\d+)/i)
  if (!match) return null
  const count = Math.max(1, Math.floor(Number(match[1])))
  const sides = Math.max(2, Math.floor(Number(match[2])))
  let total = 0
  for (let i = 0; i < count; i += 1) {
    total += 1 + Math.floor(rng() * sides)
  }
  const after = text.slice((match.index ?? 0) + match[0].length)
  const modRe = /([+-])\s*(\d+)/g
  let mod: RegExpExecArray | null
  while ((mod = modRe.exec(after))) {
    const sign = mod[1] === '-' ? -1 : 1
    total += sign * Math.floor(Number(mod[2]))
  }
  return total
}

function formulaForPlayer(formula: string): string {
  return formula.replace(/(\d)\s*d\s*/gi, '$1к')
}

/**
 * Dawn and midnight pools regain charges on a long rest.
 * A formula is rolled and shown; without one the pool refills (regain all).
 * Never above max.
 */
export function rechargeFormulaResources(
  resources: SheetResource[],
  rng: () => number = Math.random,
): { resources: SheetResource[]; lines: string[] } {
  const lines: string[] = []
  const next = resources.map((raw) => {
    const resource = clampResource(raw)
    if (resource.reset !== 'dawn' && resource.reset !== 'midnight') return resource
    const before = Math.max(0, resource.max - resource.used)
    if (!resource.rechargeDice) {
      if (resource.used === 0) return resource
      lines.push(`${resource.name}: заряды ${before} → ${resource.max}`)
      return { ...resource, used: 0 }
    }
    const rolled = rollChargeFormula(resource.rechargeDice, rng)
    if (rolled == null) {
      if (resource.used === 0) return resource
      lines.push(`${resource.name}: заряды ${before} → ${resource.max}`)
      return { ...resource, used: 0 }
    }
    const gain = Math.max(0, rolled)
    const after = Math.min(resource.max, before + gain)
    const used = Math.max(0, resource.max - after)
    lines.push(
      `${resource.name}: ${formulaForPlayer(resource.rechargeDice)} = ${gain}, заряды ${before} → ${after}`,
    )
    return { ...resource, used }
  })
  return { resources: next, lines }
}

export function applyLongRest(input: {
  resources: SheetResource[]
  slots: Record<string, SpellSlotState>
  pact_slots: { max: number; used: number; level: number } | null
  exhaustion: number
  hp_max: number | null
  hit_dice_current: number
  hit_dice_max: number
  hit_dice_by_class?: ClassHitDicePool[]
  /** Injected so tests can pin dawn recharge rolls. */
  rng?: () => number
}): RestResult {
  const pact = input.pact_slots
  const pools = input.hit_dice_by_class
  const recoveredPools =
    pools && pools.length > 0 ? recoverHitDicePoolsOnLongRest(pools) : undefined
  const recharged = rechargeFormulaResources(
    resetResourcesOnRest(input.resources, 'long'),
    input.rng,
  )
  return {
    resources: recharged.resources,
    rechargeLines: recharged.lines,
    slots: recoverSpellSlotsOnLongRest(input.slots),
    pact_slots: pact ? { ...pact, used: 0 } : null,
    exhaustion: reduceExhaustionOnLongRest(input.exhaustion),
    hp_current: input.hp_max,
    hp_temp: 0,
    hit_dice_current: recoveredPools
      ? recoveredPools.reduce((sum, pool) => sum + pool.current, 0)
      : recoverHitDiceOnLongRest(input.hit_dice_current, input.hit_dice_max),
    hit_dice_by_class: recoveredPools,
    is_dying: false,
    death_successes: 0,
    death_fails: 0,
  }
}
