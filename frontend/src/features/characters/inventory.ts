import {
  findArmorPreset,
  isArmorKind,
  isBodyArmor,
  readArmorFromCatalogData,
  type ArmorKind,
  type ArmorPiece,
  type ShieldPiece,
} from '../../shared/dnd/armor'
import {
  EMPTY_COINS,
  type CoinPurse,
  type WeighableItem,
} from '../../shared/dnd/weight'
import { asRecord, readNullableNumber, readNumber } from './sheetTypes'

export type InventoryItemKind = 'gear' | 'consumable' | 'magic' | 'other'

export const INVENTORY_ITEM_KINDS: Array<{ id: InventoryItemKind; label: string }> = [
  { id: 'gear', label: 'Вещь' },
  { id: 'consumable', label: 'Расходник' },
  { id: 'magic', label: 'Магия' },
  { id: 'other', label: 'Иное' },
]

const CONSUMABLE_NAME_RE =
  /зелье|potion|свиток|scroll|эликсир|elixir|осколок|пыль|oil|масло|бомба|flask/i

export function inferInventoryItemKind(
  name: string,
  notes = '',
  data?: Record<string, unknown> | null,
): InventoryItemKind {
  const kind = data?.item_kind ?? data?.kind
  if (kind === 'consumable' || kind === 'potion' || kind === 'scroll') return 'consumable'
  if (kind === 'magic' || kind === 'wondrous' || data?.attunement === true) return 'magic'
  const blob = `${name} ${notes}`
  if (CONSUMABLE_NAME_RE.test(blob)) return 'consumable'
  if (/кольцо|плащ|амулет|жезл|посох|ring|cloak|wand|staff/i.test(blob)) return 'magic'
  return 'gear'
}

export function isInventoryItemKind(value: unknown): value is InventoryItemKind {
  return value === 'gear' || value === 'consumable' || value === 'magic' || value === 'other'
}

export type InventoryMagicMods = {
  ac: number
  attack: number
  damage: number
}

export type InventoryItem = {
  id: string
  name: string
  catalog_id: string | null
  qty: number
  weight_lb: number | null
  equipped: boolean
  armor_kind: ArmorKind
  base_ac: number | null
  notes: string
  item_kind: InventoryItemKind
  /** Snapshot mods from setting artifact (D1) */
  magic_mods?: InventoryMagicMods | null
  requires_attunement?: boolean
  setting_artifact_id?: string | null
  artifact_snapshot?: Record<string, unknown> | null
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
    notes: '',
    item_kind: 'gear',
  }
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
  const name = typeof row.name === 'string' ? row.name : ''
  const notes = typeof row.notes === 'string' ? row.notes : ''
  const item_kind = isInventoryItemKind(row.item_kind)
    ? row.item_kind
    : inferInventoryItemKind(name, notes, row)
  const modsRaw = asRecord(row.magic_mods)
  const magic_mods: InventoryMagicMods | null =
    Object.keys(modsRaw).length > 0
      ? {
          ac: readNumber(modsRaw.ac, 0),
          attack: readNumber(modsRaw.attack, 0),
          damage: readNumber(modsRaw.damage, 0),
        }
      : null
  return {
    id: typeof row.id === 'string' ? row.id : `item-${index}`,
    name,
    catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
    qty: Math.max(0, readNumber(row.qty, 1)),
    weight_lb: readNullableNumber(row.weight_lb ?? row.weight),
    equipped: Boolean(row.equipped),
    armor_kind,
    base_ac: readNullableNumber(row.base_ac ?? row.ac_bonus),
    notes,
    item_kind,
    magic_mods,
    requires_attunement: Boolean(row.requires_attunement),
    setting_artifact_id:
      typeof row.setting_artifact_id === 'string' ? row.setting_artifact_id : null,
    artifact_snapshot:
      row.artifact_snapshot && typeof row.artifact_snapshot === 'object'
        ? (row.artifact_snapshot as Record<string, unknown>)
        : null,
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
        notes: item.notes,
        item_kind: item.item_kind,
        ...(item.magic_mods ? { magic_mods: item.magic_mods } : {}),
        ...(item.requires_attunement ? { requires_attunement: true } : {}),
        ...(item.setting_artifact_id
          ? { setting_artifact_id: item.setting_artifact_id }
          : {}),
        ...(item.artifact_snapshot ? { artifact_snapshot: item.artifact_snapshot } : {}),
      })),
    },
  }
}

/** Sum AC bonuses from magic items that are active (attuned if required). */
export function magicAcBonusFromInventory(
  items: InventoryItem[],
  attunedItemIds: Set<string>,
): number {
  let total = 0
  for (const item of items) {
    if (!item.magic_mods?.ac) continue
    if (item.requires_attunement && !attunedItemIds.has(item.id)) continue
    total += item.magic_mods.ac
  }
  return total
}

export function asWeighableItems(items: InventoryItem[]): WeighableItem[] {
  return items.map((item) => ({ qty: item.qty, weight_lb: item.weight_lb }))
}

export function readCatalogWeightLb(data: Record<string, unknown>): number | null {
  return readNullableNumber(data.weight_lb ?? data.weight)
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
    }
  }
  if (preset) {
    return {
      armor_kind: preset.kind,
      base_ac: preset.baseAc,
      weight_lb: preset.weight_lb,
    }
  }
  return {}
}

/** Equip item; unequip other body armor or shields of the same role. */
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
  return items.map((item) => {
    if (item.id === id) return { ...item, equipped: true }
    if (kind === 'shield' && item.armor_kind === 'shield') {
      return { ...item, equipped: false }
    }
    if (
      (kind === 'light' || kind === 'medium' || kind === 'heavy') &&
      (item.armor_kind === 'light' || item.armor_kind === 'medium' || item.armor_kind === 'heavy')
    ) {
      return { ...item, equipped: false }
    }
    return item
  })
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
