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

    const held = Boolean(item.equipped)
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
