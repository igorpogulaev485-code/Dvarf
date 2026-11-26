/** Keep attack cards aligned with inventory rows (held / orphans / versatile dice). */

import {
  resolveActiveWeaponDamage,
  resolveWeaponDamageProfile,
  resolveWeaponGrip,
} from './heldEquip'
import { findWeaponPreset } from '../../shared/dnd/weaponPresets'
import { ammoKindOfStack } from '../../shared/dnd/o09DeathInspirationAmmo'
import { parseDamageExpression } from './deskRolls'
import type { InventoryItem } from './inventory'
import type { WeaponAttack } from './AttacksPanel'
import { buildStartingWeaponAttacks } from './startingGearAttacks'

/** Normalize dice text for face compare (`1d8` ≡ `1к8`). */
function normalizeDamageFace(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/d/gi, 'к')
    .replace(/\s+/g, '')
}

/** True when `damage` is empty or matches a versatile/base profile face. */
function isBaseOrVersatileFace(
  damage: string | null | undefined,
  profile: { damage: string; versatileDamage: string },
): boolean {
  const current = normalizeDamageFace(damage)
  if (!current) return true
  return (
    current === normalizeDamageFace(profile.damage) ||
    current === normalizeDamageFace(profile.versatileDamage)
  )
}

export type AttackInventoryLink = {
  inventory_item_id?: string | null
  held?: boolean
  damage?: string
  name?: string
  /** O-09: bound ammo stack — cleared when the bind is not real ammo. */
  ammo_item_id?: string | null
}

type HeldSyncItem = {
  id: string
  name?: string
  equipped: boolean
  qty?: number | null
  catalog_slug?: string | null
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

    // Drop false ammo binds (e.g. Bracers of Archery matched as «стрел»).
    let ammoItemId = attack.ammo_item_id ?? null
    if (ammoItemId) {
      const ammo = itemById.get(ammoItemId)
      if (
        !ammo ||
        ammoKindOfStack({
          name: ammo.name,
          catalog_slug: ammo.catalog_slug,
          base_ammo_slug: ammo.base_ammo_slug,
          wear_slot: ammo.wear_slot,
        }) == null
      ) {
        ammoItemId = null
      }
    }

    if (item.base_ammo_slug) {
      const held = (item.qty ?? 0) > 0
      if (attack.held === held && attack.ammo_item_id === ammoItemId) {
        next.push(attack)
        continue
      }
      changed = true
      next.push({ ...attack, held, ammo_item_id: ammoItemId })
      continue
    }

    const held = Boolean(item.equipped)
    const artifactDie =
      (attack as { source_kind?: string }).source_kind === 'artifact' ||
      (attack as { activation?: unknown }).activation != null
    if (artifactDie) {
      if (attack.held === held && attack.ammo_item_id === ammoItemId) {
        next.push(attack)
        continue
      }
      changed = true
      next.push({ ...attack, held, ammo_item_id: ammoItemId })
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
      // Only swap 1H↔2H versatile faces. Keep magic expressions (`1к8+1к6`).
      if (isBaseOrVersatileFace(attack.damage, profile)) {
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
    }

    if (
      attack.held === held &&
      attack.damage === damage &&
      attack.ammo_item_id === ammoItemId
    ) {
      next.push(attack)
      continue
    }
    changed = true
    next.push({ ...attack, held, damage, ammo_item_id: ammoItemId })
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

  // Restore catalog faces on already-linked cards (sync used to clobber 1к8+1к6 → 1к8).
  let weaponsChanged = additions.length > 0
  const healedExisting = input.weapons.map((attack) => {
    if (!attack.inventory_item_id) return attack
    const item = items.find((row) => row.id === attack.inventory_item_id)
    if (!item?.catalog_slug) return attack
    const hint = input.catalogBySlug?.get(item.catalog_slug.trim())
    if (!hint?.damage) return attack
    const want = normalizeDamageFace(hint.damage)
    const have = normalizeDamageFace(attack.damage)
    if (have === want) {
      if (hint.damage_type && attack.damage_type !== hint.damage_type) {
        weaponsChanged = true
        return { ...attack, damage_type: hint.damage_type }
      }
      return attack
    }
    const baseSlug = item.base_weapon_slug?.trim() || ''
    const baseDie = normalizeDamageFace(
      baseSlug ? findWeaponPreset(baseSlug)?.damage : '',
    )
    const haveGroups = parseDamageExpression(attack.damage)?.groups.length ?? 0
    const wantGroups = parseDamageExpression(hint.damage)?.groups.length ?? 0
    const shouldHeal =
      !have || have === baseDie || wantGroups > haveGroups
    if (!shouldHeal) return attack
    weaponsChanged = true
    return {
      ...attack,
      name: hint.name_ru || attack.name,
      damage: hint.damage,
      damage_type: hint.damage_type || attack.damage_type,
    }
  })

  if (!itemsChanged && !weaponsChanged) {
    return { items: input.items, weapons: input.weapons }
  }
  return {
    items: itemsChanged ? items : input.items,
    weapons: additions.length ? [...healedExisting, ...additions] : healedExisting,
  }
}
