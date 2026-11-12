/** Keep attack cards aligned with inventory rows (held / orphans / versatile dice). */

import {
  resolveActiveWeaponDamage,
  resolveWeaponDamageProfile,
} from './heldEquip'
import { findWeaponPreset } from '../../shared/dnd/weaponPresets'

export type AttackInventoryLink = {
  inventory_item_id?: string | null
  held?: boolean
  damage?: string
  name?: string
}

type HeldSyncItem = {
  id: string
  name?: string
  equipped: boolean
  qty?: number | null
  base_ammo_slug?: string | null
  armor_kind?: string | null
  weapon_grip?: string | null
  data?: Record<string, unknown> | null
}

function occupiesHandSlot(item: HeldSyncItem): boolean {
  if (item.armor_kind === 'shield') return true
  if (item.armor_kind && item.armor_kind !== 'none') return false
  if (item.weapon_grip === 'one_hand' || item.weapon_grip === 'two_hand') return true
  return Boolean(item.name && findWeaponPreset(item.name))
}

/** Qty 0 keeps the inventory row, but it is not a weapon you can swing. */
export function attackSuppressedByEmptyStack(
  attack: { inventory_item_id?: string | null },
  items: Array<{ id: string; qty?: number | null }>,
): boolean {
  if (!attack.inventory_item_id) return false
  const item = items.find((row) => row.id === attack.inventory_item_id)
  if (!item || item.qty == null) return false
  return item.qty <= 0
}

/**
 * Mirror inventory.equipped onto linked attack cards, drop attacks whose
 * inventory row was deleted, and swap versatile dice (1H vs 2H) from grip.
 */
export function syncAttacksHeldFromInventory<T extends AttackInventoryLink>(
  weapons: T[],
  items: HeldSyncItem[],
): T[] {
  const itemById = new Map(items.map((item) => [item.id, item]))
  const heldOtherThan = (weaponItemId: string): boolean =>
    items.some(
      (item) => item.id !== weaponItemId && item.equipped && occupiesHandSlot(item),
    )

  let changed = false
  const next: T[] = []
  for (const attack of weapons) {
    if (!attack.inventory_item_id) {
      next.push(attack)
      continue
    }
    const item = itemById.get(attack.inventory_item_id)
    if (!item) {
      // Orphan attack card (inventory row deleted) — drop it.
      changed = true
      continue
    }

    if (item.base_ammo_slug) {
      const held = (item.qty ?? 0) > 0
      if (attack.held === held) {
        next.push(attack)
        continue
      }
      changed = true
      next.push({ ...attack, held })
      continue
    }

    const held = Boolean(item.equipped)
    const artifactDie =
      (attack as { source_kind?: string }).source_kind === 'artifact' ||
      (attack as { activation?: unknown }).activation != null
    if (artifactDie) {
      if (attack.held === held) {
        next.push(attack)
        continue
      }
      changed = true
      next.push({ ...attack, held })
      continue
    }
    const name = (item.name || attack.name || '').trim()
    const data = item.data ?? null
    const profile = name ? resolveWeaponDamageProfile({ name, data }) : null

    let damage = attack.damage
    if (profile && (profile.damage || profile.versatileDamage)) {
      if (held) {
        const activeDie = resolveActiveWeaponDamage({
          name,
          data,
          twoHandedWield: !heldOtherThan(item.id),
        })
        if (activeDie) damage = activeDie
      } else if (profile.damage) {
        // Stowed — show the one-hand die as the default face of the weapon.
        damage = profile.damage
      }
    }

    if (attack.held === held && attack.damage === damage) {
      next.push(attack)
      continue
    }
    changed = true
    next.push({ ...attack, held, damage })
  }
  return changed ? next : weapons
}
