/** Keep attack cards aligned with inventory rows (held / orphans / versatile dice). */

import {
  resolveActiveWeaponDamage,
  resolveWeaponDamageProfile,
  resolveWeaponGrip,
} from './heldEquip'
import { findWeaponPreset } from '../../shared/dnd/weaponPresets'
import type { InventoryItem } from './inventory'
import type { WeaponAttack } from './AttacksPanel'
import { buildStartingWeaponAttacks } from './startingGearAttacks'

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
  base_weapon_slug?: string | null
  armor_kind?: string | null
  weapon_grip?: string | null
  wear_slot?: string | null
  data?: Record<string, unknown> | null
}

function occupiesHandSlot(item: HeldSyncItem): boolean {
  if (item.armor_kind === 'shield') return true
  if (item.armor_kind && item.armor_kind !== 'none') return false
  if (item.weapon_grip === 'one_hand' || item.weapon_grip === 'two_hand') return true
  if (item.name && findWeaponPreset(item.name)) return true
  // Artifact weapon rows tagged held_main without a PHB preset (Лассо Гонда).
  return item.wear_slot === 'held_main' || item.wear_slot === 'held_off'
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
    const baseWeaponSlug = item.base_weapon_slug ?? null
    const profile = name
      ? resolveWeaponDamageProfile({ name, data, baseWeaponSlug })
      : null

    let damage = attack.damage
    if (profile && (profile.damage || profile.versatileDamage)) {
      if (held) {
        const activeDie = resolveActiveWeaponDamage({
          name,
          data,
          baseWeaponSlug,
          // Alone in hands → versatile 2H die; with shield/off-hand → 1H die.
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

function itemLooksLikeWeapon(item: InventoryItem): boolean {
  if (item.parent_id) return false
  if (item.base_ammo_slug) return false
  if (item.armor_kind && item.armor_kind !== 'none') return false
  if (item.weapon_grip === 'one_hand' || item.weapon_grip === 'two_hand') return true
  if (item.base_weapon_slug) return true
  if (item.wear_slot !== 'held_main' && item.wear_slot !== 'held_off') return false
  if (item.magic_bonus) return true
  return (item.effects ?? []).some((effect) => {
    const t = String(effect.type)
    return t === 'attack_bonus' || t === 'damage_bonus'
  })
}

export type WeaponAttackCatalogHint = {
  slug: string
  damage?: string
  damage_type?: string
  ability?: string
  name_ru?: string
}

/**
 * Create missing attack cards for inventory weapons that never got one
 * (catalog used to ship some magic bows as wondrous `item` rows).
 */
export function ensureInventoryWeaponAttacks(input: {
  items: InventoryItem[]
  weapons: WeaponAttack[]
  /** Optional catalog faces so healed cards keep magic dice (1к8+1к6, …). */
  catalogBySlug?: ReadonlyMap<string, WeaponAttackCatalogHint>
}): { items: InventoryItem[]; weapons: WeaponAttack[] } {
  const linked = new Set(
    input.weapons
      .map((row) => row.inventory_item_id)
      .filter((id): id is string => Boolean(id)),
  )
  let itemsChanged = false
  const items = input.items.map((item) => {
    if (!itemLooksLikeWeapon(item)) return item
    if (item.weapon_grip === 'one_hand' || item.weapon_grip === 'two_hand') return item
    const grip = resolveWeaponGrip({
      name: item.name,
      baseWeaponSlug: item.base_weapon_slug,
    })
    if (!grip) return item
    itemsChanged = true
    return { ...item, weapon_grip: grip }
  })

  const additions: WeaponAttack[] = []
  for (const item of items) {
    if (linked.has(item.id)) continue
    if (!itemLooksLikeWeapon(item)) continue
    const baseSlug = item.base_weapon_slug?.trim() || ''
    const basePreset = baseSlug ? findWeaponPreset(baseSlug) : null
    const hint = item.catalog_slug
      ? input.catalogBySlug?.get(item.catalog_slug.trim())
      : undefined
    const built = buildStartingWeaponAttacks({
      name: basePreset?.labelRu || item.name,
      qty: Math.max(1, item.qty ?? 1),
      makeId: () => `heal-eq:${item.id}`,
      inventoryItemId: item.id,
      held: Boolean(item.equipped),
    })
    if (built.attacks.length > 0) {
      for (const attack of built.attacks) {
        additions.push({
          ...attack,
          name: hint?.name_ru || item.name,
          catalog_id: item.catalog_id,
          ability:
            (hint?.ability as WeaponAttack['ability']) ||
            attack.ability ||
            basePreset?.ability ||
            'str',
          damage: hint?.damage || attack.damage || basePreset?.damage || '',
          damage_type:
            hint?.damage_type || attack.damage_type || basePreset?.damageType || '',
        })
      }
      continue
    }
    // Catalog face without a PHB preset name match — still one attack row.
    additions.push({
      id: `heal-eq:${item.id}`,
      name: hint?.name_ru || item.name,
      catalog_id: item.catalog_id,
      source_kind: 'weapon',
      ability: (hint?.ability as WeaponAttack['ability']) || basePreset?.ability || 'dex',
      is_proficient: true,
      damage: hint?.damage || basePreset?.damage || '',
      damage_type: hint?.damage_type || basePreset?.damageType || '',
      inventory_item_id: item.id,
      held: Boolean(item.equipped),
    })
  }

  if (!itemsChanged && additions.length === 0) {
    return { items: input.items, weapons: input.weapons }
  }
  return {
    items: itemsChanged ? items : input.items,
    weapons: additions.length ? [...input.weapons, ...additions] : input.weapons,
  }
}
