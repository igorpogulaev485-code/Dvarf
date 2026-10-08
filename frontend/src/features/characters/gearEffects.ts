/**
 * Aggregate active gear effects from inventory (equipped + attuned when required).
 * MVP: ac_bonus, sense, attack/damage bonus, ability_score / ability_mod.
 */

import type { GearEffect, AbilityScoreKey } from '../../shared/dnd/gearCatalog'
import type { AttunementSlot } from './attunement'
import type { InventoryItem } from './inventory'

export type ActiveGearEffect = {
  effect: GearEffect
  itemId: string
  itemName: string
}

export type AggregatedGearEffects = {
  /** Flat AC from cloaks / rings / armor +N, etc. */
  acBonus: number
  /** Darkvision / blindsight / … — max range per sense key. */
  senses: Record<string, number>
  /** Ability score set (absolute) — last wins per ability. */
  abilityScores: Partial<Record<AbilityScoreKey, number>>
  /** Ability score deltas (Ring of Strength style). */
  abilityMods: Partial<Record<AbilityScoreKey, number>>
  /** Per inventory item: attack / damage bonuses (weapon +1 while held). */
  byItem: Record<string, { attackBonus: number; damageBonus: number }>
  /** Human-readable lines for UI. */
  notes: string[]
  active: ActiveGearEffect[]
}

const ABILITY_KEYS: AbilityScoreKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

function isAbilityKey(value: unknown): value is AbilityScoreKey {
  return typeof value === 'string' && (ABILITY_KEYS as string[]).includes(value)
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

/** Item contributes effects when equipped; if attunement required — also linked in a slot. */
export function isGearEffectActive(
  item: InventoryItem,
  attunedItemIds: ReadonlySet<string>,
): boolean {
  if (!item.equipped || item.parent_id) return false
  if (item.requires_attunement && !attunedItemIds.has(item.id)) return false
  return true
}

export function attunedItemIdSet(attunements: AttunementSlot[]): Set<string> {
  const ids = new Set<string>()
  for (const slot of attunements) {
    if (slot.item_id) ids.add(slot.item_id)
  }
  return ids
}

export function emptyAggregatedGearEffects(): AggregatedGearEffects {
  return {
    acBonus: 0,
    senses: {},
    abilityScores: {},
    abilityMods: {},
    byItem: {},
    notes: [],
    active: [],
  }
}

/**
 * Collect effects from active inventory rows.
 * Unknown effect types are skipped (never throw).
 */
export function aggregateGearEffects(input: {
  items: InventoryItem[]
  attunements: AttunementSlot[]
}): AggregatedGearEffects {
  const attuned = attunedItemIdSet(input.attunements)
  const out = emptyAggregatedGearEffects()

  for (const item of input.items) {
    if (!isGearEffectActive(item, attuned)) continue
    const effects = item.effects ?? []
    if (effects.length === 0) continue

    let itemAttack = 0
    let itemDamage = 0

    for (const effect of effects) {
      const type = typeof effect.type === 'string' ? effect.type : ''
      if (!type) continue
      out.active.push({ effect, itemId: item.id, itemName: item.name || 'Без названия' })

      if (type === 'ac_bonus') {
        const value = asNumber((effect as { value?: unknown }).value) ?? 0
        out.acBonus += Math.floor(value)
        if (value) out.notes.push(`${item.name || 'предмет'}: КД ${value >= 0 ? '+' : ''}${Math.floor(value)}`)
        continue
      }

      if (type === 'sense') {
        const sense = String((effect as { sense?: unknown }).sense ?? '').trim().toLowerCase()
        const range = asNumber((effect as { range_ft?: unknown }).range_ft) ?? 0
        if (!sense) continue
        const prev = out.senses[sense] ?? 0
        out.senses[sense] = Math.max(prev, Math.floor(range))
        out.notes.push(
          `${item.name || 'предмет'}: ${sense}${range ? ` ${Math.floor(range)} фт` : ''}`,
        )
        continue
      }

      if (type === 'attack_bonus') {
        const value = asNumber((effect as { value?: unknown }).value) ?? 0
        itemAttack += Math.floor(value)
        continue
      }

      if (type === 'damage_bonus') {
        const value = asNumber((effect as { value?: unknown }).value) ?? 0
        itemDamage += Math.floor(value)
        continue
      }

      if (type === 'ability_score') {
        const ability = (effect as { ability?: unknown }).ability
        const value = asNumber((effect as { value?: unknown }).value)
        if (!isAbilityKey(ability) || value == null) continue
        out.abilityScores[ability] = Math.floor(value)
        out.notes.push(
          `${item.name || 'предмет'}: ${ability.toUpperCase()} → ${Math.floor(value)}`,
        )
        continue
      }

      if (type === 'ability_mod') {
        const ability = (effect as { ability?: unknown }).ability
        const value = asNumber((effect as { value?: unknown }).value)
        if (!isAbilityKey(ability) || value == null) continue
        out.abilityMods[ability] = (out.abilityMods[ability] ?? 0) + Math.floor(value)
        out.notes.push(
          `${item.name || 'предмет'}: ${ability.toUpperCase()} ${
            value >= 0 ? '+' : ''
          }${Math.floor(value)}`,
        )
      }
    }

    if (itemAttack || itemDamage) {
      out.byItem[item.id] = { attackBonus: itemAttack, damageBonus: itemDamage }
      if (itemAttack) {
        out.notes.push(
          `${item.name || 'предмет'}: атака ${itemAttack >= 0 ? '+' : ''}${itemAttack}`,
        )
      }
      if (itemDamage) {
        out.notes.push(
          `${item.name || 'предмет'}: урон ${itemDamage >= 0 ? '+' : ''}${itemDamage}`,
        )
      }
    }
  }

  return out
}

/** Apply ability_score / ability_mod on top of sheet scores. */
export function applyGearAbilityScores(
  base: Record<AbilityScoreKey, number>,
  gear: Pick<AggregatedGearEffects, 'abilityScores' | 'abilityMods'>,
): Record<AbilityScoreKey, number> {
  const next = { ...base }
  for (const key of ABILITY_KEYS) {
    const absolute = gear.abilityScores[key]
    if (typeof absolute === 'number') {
      next[key] = absolute
    }
    const delta = gear.abilityMods[key]
    if (typeof delta === 'number' && delta !== 0) {
      next[key] = (next[key] ?? 10) + delta
    }
  }
  return next
}

/** Darkvision feet from gear senses (max). */
export function gearDarkvisionFt(gear: AggregatedGearEffects): number {
  const keys = ['darkvision', 'тёмное зрение', 'темное зрение', 'dark vision']
  let max = 0
  for (const [sense, range] of Object.entries(gear.senses)) {
    if (keys.includes(sense) || sense.includes('darkvision') || sense.includes('зрен')) {
      max = Math.max(max, range)
    }
  }
  return max
}

/** Append magic damage bonus to a dice string: "1d8" + 1 → "1d8+1". */
export function appendDamageBonus(damage: string, bonus: number): string {
  if (!bonus) return damage
  const trimmed = damage.trim()
  if (!trimmed) return bonus >= 0 ? `+${bonus}` : `${bonus}`
  // Already ends with +/-N — fold into that term when possible.
  const match = trimmed.match(/^(.*?)([+-]\d+)\s*$/)
  if (match) {
    const base = match[1].trim()
    const existing = Number(match[2])
    const total = existing + bonus
    if (!base) return total >= 0 ? `+${total}` : `${total}`
    return total === 0 ? base : `${base}${total >= 0 ? '+' : ''}${total}`
  }
  return `${trimmed}${bonus >= 0 ? '+' : ''}${bonus}`
}
