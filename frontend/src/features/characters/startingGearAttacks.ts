/**
 * Starting-gear → Attack cards (class / background packages / catalog picker).
 *
 * Any weapon with qty>1 → one card + qty field (handaxes, javelins, darts…).
 * Never bake "×N" into the name; never split duplicates into extra attack rows.
 */

import { findWeaponPreset } from '../../shared/dnd/weaponPresets'
import type { AbilityKey } from './sheetTypes'
import type { WeaponAttack } from './AttacksPanel'

export type StartingWeaponResolution = {
  labelRu: string
  ability: AbilityKey
  damage: string
  damageType: string
  /** Always 1 — duplicates stack via qty, not extra rows. */
  cardCount: number
  /** Qty on the single card; null when the weapon is unique. */
  stackQty: number | null
}

/** Resolve a starting-gear weapon name + qty into attack card plan. */
export function resolveStartingWeaponAttacks(
  name: string,
  qty: number,
): StartingWeaponResolution | null {
  const preset = findWeaponPreset(name)
  if (!preset) return null
  const n = Math.max(1, Math.floor(qty))
  return {
    labelRu: preset.labelRu,
    ability: preset.ability,
    damage: preset.damage,
    damageType: preset.damageType,
    cardCount: 1,
    stackQty: n > 1 ? n : null,
  }
}

export function classEquipmentAttackIdAt(
  classEntryId: string,
  inventoryItemId: string,
  index: number,
  cardCount: number,
): string {
  const base = `class-eq:${classEntryId}:${inventoryItemId}`
  return cardCount <= 1 ? base : `${base}:${index}`
}

export function backgroundEquipmentAttackIdAt(
  backgroundSlug: string,
  inventoryItemId: string,
  index: number,
  cardCount: number,
): string {
  const base = `bg-eq:${backgroundSlug}:${inventoryItemId}`
  return cardCount <= 1 ? base : `${base}:${index}`
}

/** Build WeaponAttack rows for starting gear (no "×N" baked into the name). */
export function buildStartingWeaponAttacks(input: {
  name: string
  qty: number
  makeId: (index: number, cardCount: number) => string
  /** Link attacks to inventory so «В руках» syncs. */
  inventoryItemId?: string | null
  /** Default false — starting gear is carried, not drawn. */
  held?: boolean
}): { attacks: WeaponAttack[]; attackIds: string[] } {
  const resolved = resolveStartingWeaponAttacks(input.name, input.qty)
  if (!resolved) return { attacks: [], attackIds: [] }
  const attacks: WeaponAttack[] = []
  const attackIds: string[] = []
  for (let i = 0; i < resolved.cardCount; i += 1) {
    const id = input.makeId(i, resolved.cardCount)
    attacks.push({
      id,
      name: resolved.labelRu,
      catalog_id: null,
      source_kind: 'weapon',
      ability: resolved.ability,
      is_proficient: true,
      damage: resolved.damage,
      damage_type: resolved.damageType,
      qty: resolved.stackQty,
      inventory_item_id: input.inventoryItemId ?? null,
      held: Boolean(input.held),
    })
    attackIds.push(id)
  }
  return { attacks, attackIds }
}
