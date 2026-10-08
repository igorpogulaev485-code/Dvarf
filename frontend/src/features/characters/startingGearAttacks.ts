/**
 * Starting-gear → Attack cards (class / background packages).
 *
 * Light weapons with qty>1 → N separate cards (dual wield / two handaxes).
 * Thrown stacks (javelins, darts) → one card + qty field (not "×N" in the name).
 */

import { findWeaponPreset, type WeaponPreset } from '../../shared/dnd/weaponPresets'
import type { AbilityKey } from './sheetTypes'
import type { WeaponAttack } from './AttacksPanel'

export type StartingWeaponResolution = {
  labelRu: string
  ability: AbilityKey
  damage: string
  damageType: string
  /** Separate attack rows (light multi). */
  cardCount: number
  /** Qty on a single stacked card; null when each card is one weapon. */
  stackQty: number | null
}

/** PHB light weapons — dual-wield / two instances as separate attacks. */
const LIGHT_LABELS = new Set(
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
  ].map((s) => s.toLowerCase()),
)

/** Thrown ammo-like stacks — one attack row + qty. */
const STACK_LABELS = new Set(
  [
    'метательное копьё',
    'метательное копье',
    'дротик',
    'стрела',
    'арбалетный болт',
  ].map((s) => s.toLowerCase()),
)

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isLightPreset(preset: WeaponPreset): boolean {
  if (preset.light === true) return true
  if (preset.light === false) return false
  const key = normalize(preset.labelRu)
  if (LIGHT_LABELS.has(key)) return true
  return Boolean(preset.aliases?.some((alias) => LIGHT_LABELS.has(normalize(alias))))
}

function isStackPreset(preset: WeaponPreset): boolean {
  if (preset.ammoStack === true) return true
  const key = normalize(preset.labelRu)
  if (STACK_LABELS.has(key)) return true
  return Boolean(preset.aliases?.some((alias) => STACK_LABELS.has(normalize(alias))))
}

/** Resolve a starting-gear weapon name + qty into attack card plan. */
export function resolveStartingWeaponAttacks(
  name: string,
  qty: number,
): StartingWeaponResolution | null {
  const preset = findWeaponPreset(name)
  if (!preset) return null
  const n = Math.max(1, Math.floor(qty))
  if (n > 1 && isLightPreset(preset)) {
    return {
      labelRu: preset.labelRu,
      ability: preset.ability,
      damage: preset.damage,
      damageType: preset.damageType,
      cardCount: n,
      stackQty: null,
    }
  }
  if (n > 1 && isStackPreset(preset)) {
    return {
      labelRu: preset.labelRu,
      ability: preset.ability,
      damage: preset.damage,
      damageType: preset.damageType,
      cardCount: 1,
      stackQty: n,
    }
  }
  // Default: one card; if qty>1 but neither light nor stack — still one card + qty
  // (e.g. "4 копья" if spear somehow qty>1 without being marked stack).
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
