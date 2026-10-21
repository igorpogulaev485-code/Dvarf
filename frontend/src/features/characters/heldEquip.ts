/**
 * Held / in-hand equip rules (PHB-flavored, sheet-level).
 *
 * Two hands total:
 * - one two-handed weapon, OR
 * - up to two one-handed weapons, OR
 * - one one-handed + shield
 *
 * Versatile weapons (battleaxe, longsword, warhammer, …) cost one hand and
 * may be paired with a shield; damage die switches to the versatile (2H) die
 * only when nothing else occupies the other hand.
 *
 * Drawing/stowing is an action in play — sheet only tracks what is currently in hand.
 */

import { parseWeaponCatalogData } from '../../shared/dnd/gearCatalog'
import { findWeaponPreset } from '../../shared/dnd/weaponPresets'
import type { InventoryItem } from './inventory'

export type WeaponGrip = 'one_hand' | 'two_hand'

const HANDS_TOTAL = 2

function propertiesSayTwoHanded(properties: string[]): boolean {
  return properties.some((p) => {
    const key = p.toLowerCase().replace(/_/g, '-')
    return (
      key === 'two-handed' ||
      key === 'twohanded' ||
      key.includes('two-hand') ||
      key.includes('двуруч')
    )
  })
}

function propertiesSayVersatile(properties: string[]): boolean {
  return properties.some((p) => {
    const key = p.toLowerCase().replace(/_/g, '-')
    return key === 'versatile' || key.includes('универсаль')
  })
}

function propertiesSayLight(properties: string[]): boolean {
  return properties.some((p) => {
    const key = p.toLowerCase()
    return key === 'light' || key === 'лёгкое' || key === 'легкое'
  })
}

/** True when the weapon has PHB versatile (1H / 2H dice). */
export function isVersatileWeapon(input: {
  name: string
  data?: Record<string, unknown> | null
}): boolean {
  const data = input.data ?? {}
  const parsed = parseWeaponCatalogData(data)
  if (propertiesSayVersatile(parsed.properties)) return true
  if (parsed.versatile_damage.trim()) return true
  const preset = findWeaponPreset(input.name)
  return Boolean(preset?.versatileDamage)
}

/**
 * One-hand die + optional versatile (two-hand) die for a weapon.
 * Custom / unknown names return nulls — callers keep existing attack.damage.
 */
export function resolveWeaponDamageProfile(input: {
  name: string
  data?: Record<string, unknown> | null
}): { damage: string; versatileDamage: string; damageType: string } | null {
  const data = input.data ?? {}
  const parsed = parseWeaponCatalogData(data)
  const preset = findWeaponPreset(input.name)
  const damage = (parsed.damage || preset?.damage || '').trim()
  const versatileDamage = (
    parsed.versatile_damage ||
    preset?.versatileDamage ||
    ''
  ).trim()
  const damageType = (parsed.damage_type || preset?.damageType || '').trim()
  if (!damage && !versatileDamage) return null
  return { damage, versatileDamage, damageType }
}

/**
 * Active damage die: versatile 2H die when the weapon is held alone,
 * otherwise the one-hand die.
 */
export function resolveActiveWeaponDamage(input: {
  name: string
  data?: Record<string, unknown> | null
  twoHandedWield: boolean
}): string | null {
  const profile = resolveWeaponDamageProfile(input)
  if (!profile) return null
  if (input.twoHandedWield && profile.versatileDamage) return profile.versatileDamage
  return profile.damage || null
}

/** Resolve grip from catalog data and/or RU name / presets. */
export function resolveWeaponGrip(input: {
  name: string
  data?: Record<string, unknown> | null
}): WeaponGrip {
  const data = input.data ?? {}
  const parsed = parseWeaponCatalogData(data)
  // Versatile is one-handed for equip slots (shield + warhammer is legal).
  if (propertiesSayVersatile(parsed.properties) || parsed.versatile_damage.trim()) {
    return 'one_hand'
  }
  if (propertiesSayTwoHanded(parsed.properties)) return 'two_hand'

  const preset = findWeaponPreset(input.name)
  if (preset?.versatileDamage) return 'one_hand'
  if (preset?.twoHanded) return 'two_hand'
  if (preset) return 'one_hand'

  return 'one_hand'
}

export function isLightWeapon(input: {
  name: string
  data?: Record<string, unknown> | null
}): boolean {
  const data = input.data ?? {}
  const parsed = parseWeaponCatalogData(data)
  if (propertiesSayLight(parsed.properties)) return true
  const preset = findWeaponPreset(input.name)
  if (preset?.light) return true
  return false
}

export function isWeaponItem(item: InventoryItem): boolean {
  if (item.armor_kind === 'shield') return false
  if (item.armor_kind !== 'none') return false
  if (item.weapon_grip === 'one_hand' || item.weapon_grip === 'two_hand') return true
  return findWeaponPreset(item.name) != null
}

/** Shield or weapon that occupies hands when equipped. */
export function isHeldItem(item: InventoryItem): boolean {
  if (item.armor_kind === 'shield') return true
  return isWeaponItem(item)
}

export function canShowEquipChip(item: InventoryItem): boolean {
  if (item.parent_id) return false
  if (item.armor_kind !== 'none') return true
  if (isWeaponItem(item)) return true
  // Worn wondrous / magic (cloak, ring, …).
  const slot = item.wear_slot
  if (
    slot &&
    slot !== 'none' &&
    slot !== 'held_main' &&
    slot !== 'held_off' &&
    slot !== 'body_armor' &&
    slot !== 'shield'
  ) {
    return true
  }
  return Boolean(item.requires_attunement)
}

/** How many hands this item needs while equipped. */
export function handsCost(item: InventoryItem): number {
  if (item.armor_kind === 'shield') return 1
  if (!isWeaponItem(item)) return 0
  // Always re-resolve from name — stored weapon_grip may be stale
  // (e.g. «Боевой молот» wrongly saved as two_hand via substring «молот»).
  const grip = resolveWeaponGrip({ name: item.name })
  if (grip === 'two_hand') return 2
  const qty = Math.max(1, Math.floor(item.qty || 1))
  if (qty >= 2 && isLightWeapon({ name: item.name })) return 2
  return 1
}

export function totalHeldHands(items: InventoryItem[]): number {
  return items
    .filter((item) => item.equipped && isHeldItem(item))
    .reduce((sum, item) => sum + handsCost(item), 0)
}

/**
 * Equip a held item (weapon/shield), freeing hands from other held gear as needed.
 * Body armor is not handled here.
 */
export function equipHeldItem(items: InventoryItem[], id: string): InventoryItem[] {
  const target = items.find((item) => item.id === id)
  if (!target || !isHeldItem(target)) return items

  let next = items.map((item) => {
    if (item.id !== id) return item
    if (!isWeaponItem(item)) return { ...item, equipped: true }
    return {
      ...item,
      equipped: true,
      weapon_grip: resolveWeaponGrip({ name: item.name }),
    }
  })
  const cost = handsCost(next.find((item) => item.id === id)!)

  if (cost >= HANDS_TOTAL) {
    // Two-hander (or dual light stack) — clear every other held item.
    return next.map((item) =>
      item.id !== id && item.equipped && isHeldItem(item)
        ? { ...item, equipped: false }
        : item,
    )
  }

  // Free hands until we fit; drop other held items (two-handers first, then any).
  const others = () =>
    next.filter((item) => item.id !== id && item.equipped && isHeldItem(item))

  while (totalHeldHands(next) > HANDS_TOTAL) {
    const candidates = others()
    if (candidates.length === 0) break
    const drop =
      candidates.find((item) => handsCost(item) >= 2) ?? candidates[candidates.length - 1]
    next = next.map((item) =>
      item.id === drop.id ? { ...item, equipped: false } : item,
    )
  }
  return next
}

export function equipLabel(item: InventoryItem): { on: string; off: string } {
  if (isWeaponItem(item)) {
    return { on: 'В руках', off: 'Убран' }
  }
  if (item.armor_kind === 'shield') {
    return { on: 'В руке', off: 'Не в руке' }
  }
  return { on: 'Надето', off: 'Снято' }
}

export function listShieldItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter(
    (item) => !item.parent_id && item.armor_kind === 'shield' && item.name.trim(),
  )
}

export type ShieldToggleResult =
  | { ok: true; items: InventoryItem[]; equipped: boolean; name: string }
  | { ok: false; reason: string }

/**
 * Quick draw/stow for the desk AC vital.
 * Off → equip first shield (frees a hand if needed). On → stow the equipped shield.
 */
export function toggleShieldInHand(items: InventoryItem[]): ShieldToggleResult {
  const shields = listShieldItems(items)
  if (shields.length === 0) {
    return { ok: false, reason: 'Нет щита в инвентаре' }
  }
  const equipped = shields.find((item) => item.equipped)
  if (equipped) {
    return {
      ok: true,
      equipped: false,
      name: equipped.name.trim() || 'Щит',
      items: items.map((item) =>
        item.id === equipped.id ? { ...item, equipped: false } : item,
      ),
    }
  }
  const target = shields[0]!
  return {
    ok: true,
    equipped: true,
    name: target.name.trim() || 'Щит',
    items: equipHeldItem(items, target.id),
  }
}
