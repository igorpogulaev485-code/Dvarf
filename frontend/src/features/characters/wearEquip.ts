/**
 * Worn magic-item slots (cloak, ring×2, …) — exclusivity when «Надето».
 * Held weapons/shields stay in heldEquip; body armor in inventory.equipInventoryItem.
 */

import {
  WEAR_SLOTS,
  type WearSlot,
} from '../../shared/dnd/gearCatalog'
import type { InventoryItem } from './inventory'

export const WEAR_SLOT_LABEL_RU: Record<WearSlot, string> = {
  body_armor: 'Доспех',
  shield: 'Щит',
  cloak: 'Плащ',
  head: 'Голова',
  eyes: 'Глаза',
  neck: 'Шея',
  hands: 'Кисти',
  arms: 'Руки / наручи',
  feet: 'Ступни',
  belt: 'Пояс',
  ring: 'Кольцо',
  held_main: 'В основной руке',
  held_off: 'Во второй руке',
  none: '—',
}

/** Slots managed here (not body armor / shield / held weapons). */
const WORN_SLOTS = new Set<WearSlot>([
  'cloak',
  'head',
  'eyes',
  'neck',
  'hands',
  'arms',
  'feet',
  'belt',
  'ring',
])

export function isWearSlot(value: unknown): value is WearSlot {
  return typeof value === 'string' && (WEAR_SLOTS as readonly string[]).includes(value)
}

export function readWearSlot(value: unknown): WearSlot | null {
  return isWearSlot(value) ? value : null
}

export function isWornMagicSlot(slot: WearSlot | null | undefined): boolean {
  return Boolean(slot && WORN_SLOTS.has(slot))
}

export function wearSlotCapacity(slot: WearSlot): number {
  if (slot === 'ring') return 2
  if (slot === 'none') return Number.POSITIVE_INFINITY
  return 1
}

/** Items currently occupying a worn slot. */
export function equippedInWearSlot(
  items: InventoryItem[],
  slot: WearSlot,
): InventoryItem[] {
  return items.filter(
    (item) => item.equipped && item.wear_slot === slot && isWornMagicSlot(slot),
  )
}

/**
 * Equip a worn-slot item; free the same slot if at capacity (rings keep 1 other).
 */
export function equipWornItem(items: InventoryItem[], id: string): InventoryItem[] {
  const target = items.find((item) => item.id === id)
  if (!target) return items
  const slot = target.wear_slot ?? 'none'
  if (!isWornMagicSlot(slot)) {
    return items.map((item) =>
      item.id === id ? { ...item, equipped: true } : item,
    )
  }

  const cap = wearSlotCapacity(slot)
  let next = items.map((item) =>
    item.id === id ? { ...item, equipped: true } : item,
  )
  const occupants = equippedInWearSlot(next, slot).filter((item) => item.id !== id)
  let overflow = occupants.length + 1 - cap
  if (overflow <= 0) return next

  // Unequip oldest others first (stable list order).
  for (const other of occupants) {
    if (overflow <= 0) break
    next = next.map((item) =>
      item.id === other.id ? { ...item, equipped: false } : item,
    )
    overflow -= 1
  }
  return next
}

export function attunementEligibleItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter(
    (item) =>
      !item.parent_id &&
      (item.requires_attunement ||
        (item.wear_slot != null &&
          item.wear_slot !== 'none' &&
          isWornMagicSlot(item.wear_slot))),
  )
}
