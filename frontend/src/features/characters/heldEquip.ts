/**
 * Held / in-hand equip rules (PHB-flavored, sheet-level).
 *
 * Two hands total:
 * - one two-handed weapon, OR
 * - up to two one-handed weapons, OR
 * - one one-handed + shield
 *
 * Drawing/stowing is an action in play — sheet only tracks what is currently in hand.
 */

import { parseWeaponCatalogData } from '../../shared/dnd/gearCatalog'
import { findWeaponPreset } from '../../shared/dnd/weaponPresets'
import type { InventoryItem } from './inventory'

export type WeaponGrip = 'one_hand' | 'two_hand'

const HANDS_TOTAL = 2

/** Known two-handed weapons when catalog properties are missing (grants / presets). */
const TWO_HAND_NAMES = new Set(
  [
    'секира',
    'молот',
    'двуручный молот',
    'палица',
    'двуручная дубина',
    'алебарда',
    'глефа',
    'двуручный меч',
    'пика',
    'длинный лук',
    'короткий лук',
    'лёгкий арбалет',
    'легкий арбалет',
    'тяжёлый арбалет',
    'тяжелый арбалет',
    'длинное копьё',
    'длинное копье',
    'greataxe',
    'greatsword',
    'maul',
    'halberd',
    'glaive',
    'pike',
    'longbow',
    'shortbow',
    'light crossbow',
    'heavy crossbow',
    'greatclub',
  ].map((s) => s.trim().toLowerCase()),
)

const LIGHT_NAMES = new Set(
  [
    'дубинка',
    'кинжал',
    'ручной топор',
    'лёгкий молот',
    'легкий молот',
    'серп',
    'скимитар',
    'ятаган',
    'короткий меч',
    'ручной арбалет',
  ].map((s) => s.trim().toLowerCase()),
)

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

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

function propertiesSayLight(properties: string[]): boolean {
  return properties.some((p) => {
    const key = p.toLowerCase()
    return key === 'light' || key === 'лёгкое' || key === 'легкое'
  })
}

/** Resolve grip from catalog data and/or RU name. */
export function resolveWeaponGrip(input: {
  name: string
  data?: Record<string, unknown> | null
}): WeaponGrip {
  const data = input.data ?? {}
  const parsed = parseWeaponCatalogData(data)
  if (propertiesSayTwoHanded(parsed.properties)) return 'two_hand'
  const key = normalize(input.name)
  if (TWO_HAND_NAMES.has(key)) return 'two_hand'
  for (const name of TWO_HAND_NAMES) {
    if (key.includes(name)) return 'two_hand'
  }
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
  return LIGHT_NAMES.has(normalize(input.name))
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
  return isWeaponItem(item)
}

/** How many hands this item needs while equipped. */
export function handsCost(item: InventoryItem): number {
  if (item.armor_kind === 'shield') return 1
  if (!isWeaponItem(item)) return 0
  const grip =
    item.weapon_grip ??
    resolveWeaponGrip({ name: item.name })
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

  let next = items.map((item) =>
    item.id === id ? { ...item, equipped: true } : item,
  )
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
  return { on: 'Надето', off: 'Не надето' }
}
