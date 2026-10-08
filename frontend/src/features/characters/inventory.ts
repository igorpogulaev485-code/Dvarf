import {
  findArmorPreset,
  isArmorKind,
  isBodyArmor,
  readArmorFromCatalogData,
  type ArmorKind,
  type ArmorPiece,
  type ShieldPiece,
} from '../../shared/dnd/armor'
import { readGearWeightLb } from '../../shared/dnd/gearCatalog'
import {
  EMPTY_COINS,
  type CoinPurse,
  type WeighableItem,
} from '../../shared/dnd/weight'
import { asRecord, readNullableNumber, readNumber } from './sheetTypes'
import { equipHeldItem, isHeldItem, type WeaponGrip } from './heldEquip'

export type InventoryContainerKind = 'none' | 'pack' | 'kit' | 'container'

export type InventoryItem = {
  id: string
  name: string
  catalog_id: string | null
  qty: number
  weight_lb: number | null
  equipped: boolean
  armor_kind: ArmorKind
  base_ac: number | null
  /** From catalog; null = uncapped (light). Omitted on legacy sheets. */
  max_dex_bonus?: number | null
  /** Heavy armor STR gate (PHB). */
  strength_requirement?: number | null
  notes: string
  /** Nested under an expanded pack / kit. */
  parent_id?: string | null
  container_kind?: InventoryContainerKind
  /** True after «Раскрыть набор» — children carry weight. */
  container_expanded?: boolean
  /** Collapsed bulk weight snapshot (restored on collapse). */
  pack_weight_lb?: number | null
  /** Weapon hand grip — drives held-slot exclusivity. */
  weapon_grip?: WeaponGrip | null
}

export type InventoryState = {
  coins: CoinPurse
  items: InventoryItem[]
}

export function createInventoryItem(): InventoryItem {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `item-${Date.now()}`,
    name: '',
    catalog_id: null,
    qty: 1,
    weight_lb: null,
    equipped: false,
    armor_kind: 'none',
    base_ac: null,
    max_dex_bonus: null,
    strength_requirement: null,
    notes: '',
    parent_id: null,
    container_kind: 'none',
    container_expanded: false,
    pack_weight_lb: null,
    weapon_grip: null,
  }
}

function readWeaponGrip(value: unknown): WeaponGrip | null {
  if (value === 'one_hand' || value === 'two_hand') return value
  return null
}

function readContainerKind(value: unknown): InventoryContainerKind {
  if (value === 'pack' || value === 'kit' || value === 'container' || value === 'none') {
    return value
  }
  return 'none'
}

function readCoins(raw: unknown): CoinPurse {
  const coins = asRecord(raw)
  return {
    cp: readNumber(coins.cp, 0),
    sp: readNumber(coins.sp, 0),
    ep: readNumber(coins.ep, 0),
    gp: readNumber(coins.gp, 0),
    pp: readNumber(coins.pp, 0),
  }
}

function readItem(raw: unknown, index: number): InventoryItem {
  const row = asRecord(raw)
  const armor_kind = isArmorKind(row.armor_kind) ? row.armor_kind : 'none'
  return {
    id: typeof row.id === 'string' ? row.id : `item-${index}`,
    name: typeof row.name === 'string' ? row.name : '',
    catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
    qty: Math.max(0, readNumber(row.qty, 1)),
    weight_lb: readNullableNumber(row.weight_lb ?? row.weight),
    equipped: Boolean(row.equipped),
    armor_kind,
    base_ac: readNullableNumber(row.base_ac ?? row.ac_bonus),
    max_dex_bonus: readNullableNumber(row.max_dex_bonus),
    strength_requirement: readNullableNumber(row.strength_requirement),
    notes: typeof row.notes === 'string' ? row.notes : '',
    parent_id: typeof row.parent_id === 'string' ? row.parent_id : null,
    container_kind: readContainerKind(row.container_kind),
    container_expanded: Boolean(row.container_expanded),
    pack_weight_lb: readNullableNumber(row.pack_weight_lb),
    weapon_grip: readWeaponGrip(row.weapon_grip),
  }
}

export function readInventory(sheet: Record<string, unknown>): InventoryState {
  const inventory = asRecord(sheet.inventory)
  const itemsRaw = inventory.items
  return {
    coins: Object.keys(asRecord(inventory.coins)).length
      ? readCoins(inventory.coins)
      : { ...EMPTY_COINS },
    items: Array.isArray(itemsRaw) ? itemsRaw.map((item, index) => readItem(item, index)) : [],
  }
}

export function inventoryToSheet(state: InventoryState): Record<string, unknown> {
  return {
    inventory: {
      coins: {
        cp: state.coins.cp,
        sp: state.coins.sp,
        ep: state.coins.ep,
        gp: state.coins.gp,
        pp: state.coins.pp,
      },
      items: state.items.map((item) => ({
        id: item.id,
        name: item.name,
        catalog_id: item.catalog_id,
        qty: item.qty,
        weight_lb: item.weight_lb,
        equipped: item.equipped,
        armor_kind: item.armor_kind,
        base_ac: item.base_ac,
        max_dex_bonus: item.max_dex_bonus ?? null,
        strength_requirement: item.strength_requirement ?? null,
        notes: item.notes,
        parent_id: item.parent_id ?? null,
        container_kind: item.container_kind ?? 'none',
        container_expanded: Boolean(item.container_expanded),
        pack_weight_lb: item.pack_weight_lb ?? null,
        weapon_grip: item.weapon_grip ?? null,
      })),
    },
  }
}

export function asWeighableItems(items: InventoryItem[]): WeighableItem[] {
  // Expanded pack shell weighs 0 — children carry mass (no double-count).
  const parentIdsWithChildren = new Set(
    items.filter((item) => item.parent_id).map((item) => item.parent_id as string),
  )
  return items.map((item) => {
    if (parentIdsWithChildren.has(item.id)) {
      return { qty: item.qty, weight_lb: 0 }
    }
    return { qty: item.qty, weight_lb: item.weight_lb }
  })
}

export function readCatalogWeightLb(data: Record<string, unknown>): number | null {
  return readGearWeightLb(data)
}

export function armorFieldsFromCatalog(
  selected: { name_ru: string; name_en?: string | null; slug?: string; data?: Record<string, unknown> },
): Partial<InventoryItem> {
  const data = selected.data ?? {}
  const fromData = readArmorFromCatalogData(data)
  const preset =
    findArmorPreset(selected.slug ?? '') ||
    findArmorPreset(selected.name_en ?? '') ||
    findArmorPreset(selected.name_ru)

  if (fromData) {
    return {
      armor_kind: fromData.armor_kind,
      base_ac: fromData.base_ac ?? preset?.baseAc ?? (fromData.armor_kind === 'shield' ? 2 : null),
      weight_lb: fromData.weight_lb ?? preset?.weight_lb ?? null,
      max_dex_bonus: fromData.max_dex_bonus,
      strength_requirement: fromData.strength_requirement,
    }
  }
  if (preset) {
    const maxDex =
      preset.kind === 'medium' ? 2 : preset.kind === 'heavy' ? 0 : null
    const strReq =
      preset.key === 'chain_mail' ? 13 : preset.key === 'splint' || preset.key === 'plate' ? 15 : null
    return {
      armor_kind: preset.kind,
      base_ac: preset.baseAc,
      weight_lb: preset.weight_lb,
      max_dex_bonus: maxDex,
      strength_requirement: strReq,
    }
  }
  return {}
}

/**
 * Equip item with role exclusivity:
 * - body armor ↔ body armor
 * - held (weapons + shield): max 2 hands (1× two-hand XOR 2× one-hand / shield)
 */
export function equipInventoryItem(
  items: InventoryItem[],
  id: string,
  equipped: boolean,
): InventoryItem[] {
  const target = items.find((item) => item.id === id)
  if (!target) return items
  if (!equipped) {
    return items.map((item) => (item.id === id ? { ...item, equipped: false } : item))
  }

  const kind = target.armor_kind
  if (kind === 'light' || kind === 'medium' || kind === 'heavy') {
    return items.map((item) => {
      if (item.id === id) return { ...item, equipped: true }
      if (
        item.armor_kind === 'light' ||
        item.armor_kind === 'medium' ||
        item.armor_kind === 'heavy'
      ) {
        return { ...item, equipped: false }
      }
      return item
    })
  }

  if (isHeldItem(target)) {
    return equipHeldItem(items, id)
  }

  return items.map((item) => (item.id === id ? { ...item, equipped: true } : item))
}

export function equippedArmorPieces(items: InventoryItem[]): {
  armor: ArmorPiece | null
  shield: ShieldPiece | null
} {
  let armor: ArmorPiece | null = null
  let shield: ShieldPiece | null = null
  for (const item of items) {
    if (!item.equipped || item.armor_kind === 'none') continue
    if (item.armor_kind === 'shield') {
      if (!shield) {
        shield = {
          kind: 'shield',
          baseAc: item.base_ac ?? 2,
          name: item.name || 'Щит',
        }
      }
      continue
    }
    if (isBodyArmor(item.armor_kind) && !armor) {
      armor = {
        kind: item.armor_kind,
        baseAc: item.base_ac ?? 10,
        name: item.name || armorKindFallback(item.armor_kind),
        maxDexBonus:
          item.max_dex_bonus !== undefined
            ? item.max_dex_bonus
            : item.armor_kind === 'medium'
              ? 2
              : item.armor_kind === 'heavy'
                ? 0
                : null,
      }
    }
  }
  return { armor, shield }
}

function armorKindFallback(kind: 'light' | 'medium' | 'heavy'): string {
  if (kind === 'light') return 'Лёгкий доспех'
  if (kind === 'medium') return 'Средний доспех'
  return 'Тяжёлый доспех'
}
