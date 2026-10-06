/** Pure rest helpers — sheet now, party frame later. */

import { recoverHitDiceOnLongRest } from './hitDice'
import { clampSlot, type SpellSlotState } from './spells'

export type ResourceReset = 'short' | 'long' | 'manual'

export type SheetResource = {
  id: string
  name: string
  max: number
  used: number
  reset: ResourceReset
}

export function clampExhaustion(value: number): number {
  return Math.min(6, Math.max(0, Math.floor(value)))
}

export function clampResource(resource: SheetResource): SheetResource {
  const max = Math.max(0, Math.floor(resource.max))
  const used = Math.min(max, Math.max(0, Math.floor(resource.used)))
  const reset: ResourceReset =
    resource.reset === 'short' || resource.reset === 'long' || resource.reset === 'manual'
      ? resource.reset
      : 'long'
  return {
    ...resource,
    max,
    used,
    reset,
  }
}

export function resetResourcesOnRest(
  resources: SheetResource[],
  kind: 'short' | 'long',
): SheetResource[] {
  return resources.map((raw) => {
    const resource = clampResource(raw)
    if (resource.reset === 'manual') return resource
    if (kind === 'short' && resource.reset !== 'short') return resource
    // long rest clears short- and long-reset resources
    return { ...resource, used: 0 }
  })
}

/** Recover all leveled spell slots (and pact slots) after a long rest. */
export function recoverSpellSlotsOnLongRest(
  slots: Record<string, SpellSlotState>,
): Record<string, SpellSlotState> {
  const next: Record<string, SpellSlotState> = {}
  for (const [key, slot] of Object.entries(slots)) {
    const clamped = clampSlot(slot)
    next[key] = { max: clamped.max, used: 0 }
  }
  return next
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
  is_dying?: boolean
  death_successes?: number
  death_fails?: number
}

export function applyShortRest(input: {
  resources: SheetResource[]
}): RestResult {
  return {
    resources: resetResourcesOnRest(input.resources, 'short'),
  }
}

export function applyLongRest(input: {
  resources: SheetResource[]
  slots: Record<string, SpellSlotState>
  pact_slots: { max: number; used: number; level: number } | null
  exhaustion: number
  hp_max: number | null
  hit_dice_current: number
  hit_dice_max: number
}): RestResult {
  const pact = input.pact_slots
  return {
    resources: resetResourcesOnRest(input.resources, 'long'),
    slots: recoverSpellSlotsOnLongRest(input.slots),
    pact_slots: pact ? { ...pact, used: 0 } : null,
    exhaustion: reduceExhaustionOnLongRest(input.exhaustion),
    hp_current: input.hp_max,
    hp_temp: 0,
    hit_dice_current: recoverHitDiceOnLongRest(
      input.hit_dice_current,
      input.hit_dice_max,
    ),
    is_dying: false,
    death_successes: 0,
    death_fails: 0,
  }
}
