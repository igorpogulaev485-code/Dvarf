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
  /** Skill key → flat bonus (cloak of elvenkind stealth, …). */
  skillBonuses: Record<string, number>
  /** Ability save bonuses; `all` applies to every save. */
  saveBonuses: Partial<Record<AbilityScoreKey | 'all', number>>
  /** Walk speed delta (ft), summed. */
  speedBonusFt: number
  /** Extra spell slots by level (Ring of Spell Storing–style deltas). */
  spellSlotDeltas: Record<number, number>
  /** Charge pools from `resource` effects. */
  resources: Array<{
    key: string
    name: string
    max: number
    reset: 'short' | 'long' | 'manual'
    itemId: string
  }>
  /** Companions granted while item is active. */
  companions: Array<{
    key: string
    kind: string
    nameRu: string
    itemId: string
  }>
  /** Spells granted with optional free charges. */
  grantSpells: Array<{
    key: string
    slug: string
    uses: number | null
    reset: 'short' | 'long'
    itemId: string
    itemName: string
  }>
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
    skillBonuses: {},
    saveBonuses: {},
    speedBonusFt: 0,
    spellSlotDeltas: {},
    resources: [],
    companions: [],
    grantSpells: [],
    notes: [],
    active: [],
  }
}

function readReset(value: unknown): 'short' | 'long' | 'manual' {
  if (value === 'short' || value === 'long' || value === 'manual') return value
  if (value && typeof value === 'object') {
    const restore = (value as { restore?: unknown }).restore
    if (restore === 'short' || restore === 'long' || restore === 'manual') return restore
  }
  return 'long'
}

function normalizeSkillKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
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
        continue
      }

      if (type === 'skill_bonus') {
        const skillRaw = String((effect as { skill?: unknown }).skill ?? '').trim()
        const value = asNumber((effect as { value?: unknown }).value) ?? 0
        if (!skillRaw || !value) continue
        const skill = normalizeSkillKey(skillRaw)
        out.skillBonuses[skill] = (out.skillBonuses[skill] ?? 0) + Math.floor(value)
        out.notes.push(
          `${item.name || 'предмет'}: ${skill} ${value >= 0 ? '+' : ''}${Math.floor(value)}`,
        )
        continue
      }

      if (type === 'save_bonus') {
        const value = asNumber((effect as { value?: unknown }).value) ?? 0
        if (!value) continue
        const abilityRaw = (effect as { ability?: unknown }).ability
        const key: AbilityScoreKey | 'all' = isAbilityKey(abilityRaw)
          ? abilityRaw
          : 'all'
        out.saveBonuses[key] = (out.saveBonuses[key] ?? 0) + Math.floor(value)
        out.notes.push(
          `${item.name || 'предмет'}: спас ${key === 'all' ? 'все' : key.toUpperCase()} ${
            value >= 0 ? '+' : ''
          }${Math.floor(value)}`,
        )
        continue
      }

      if (type === 'speed') {
        const value = asNumber((effect as { value_ft?: unknown }).value_ft) ?? 0
        if (!value) continue
        out.speedBonusFt += Math.floor(value)
        out.notes.push(
          `${item.name || 'предмет'}: скорость ${value >= 0 ? '+' : ''}${Math.floor(value)} фт`,
        )
        continue
      }

      if (type === 'spell_slots') {
        const level = asNumber((effect as { level?: unknown }).level)
        const delta = asNumber((effect as { delta?: unknown }).delta) ?? 0
        if (level == null || level < 1 || level > 9 || !delta) continue
        const key = Math.floor(level)
        out.spellSlotDeltas[key] = (out.spellSlotDeltas[key] ?? 0) + Math.floor(delta)
        out.notes.push(
          `${item.name || 'предмет'}: ячейки ${key} ${delta >= 0 ? '+' : ''}${Math.floor(delta)}`,
        )
        continue
      }

      if (type === 'resource') {
        const id = String((effect as { id?: unknown }).id ?? '').trim() || 'charges'
        const max = asNumber((effect as { max?: unknown }).max) ?? 0
        if (max <= 0) continue
        const reset = readReset(
          (effect as { restore?: unknown }).restore ?? effect,
        )
        const key = `gear-res:${item.id}:${id}`
        out.resources.push({
          key,
          name: `${item.name || 'Предмет'} · ${id}`,
          max: Math.floor(max),
          reset,
          itemId: item.id,
        })
        out.notes.push(`${item.name || 'предмет'}: ресурс ${id} ×${Math.floor(max)}`)
        continue
      }

      if (type === 'companion') {
        const kind = String((effect as { kind?: unknown }).kind ?? 'other').trim() || 'other'
        const nameRu =
          String((effect as { name_ru?: unknown }).name_ru ?? '').trim() ||
          item.name ||
          'Спутник'
        const key = `gear-companion:${item.id}:${kind}`
        out.companions.push({ key, kind, nameRu, itemId: item.id })
        out.notes.push(`${item.name || 'предмет'}: спутник ${nameRu}`)
        continue
      }

      if (type === 'grant_spell') {
        const slug = String((effect as { slug?: unknown }).slug ?? '').trim()
        if (!slug) continue
        const uses = asNumber((effect as { uses?: unknown }).uses)
        const reset = readReset((effect as { restore?: unknown }).restore) 
        const key = `gear-spell:${item.id}:${slug}`
        out.grantSpells.push({
          key,
          slug,
          uses: uses != null && uses > 0 ? Math.floor(uses) : null,
          reset: reset === 'short' ? 'short' : 'long',
          itemId: item.id,
          itemName: item.name || 'Предмет',
        })
        out.notes.push(
          `${item.name || 'предмет'}: заклинание ${slug}${
            uses != null && uses > 0 ? ` ×${Math.floor(uses)}` : ''
          }`,
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
