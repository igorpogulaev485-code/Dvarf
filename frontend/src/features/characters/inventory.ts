import {
  EMPTY_COINS,
  type CoinPurse,
  type WeighableItem,
} from '../../shared/dnd/weight'
import { asRecord, readNullableNumber, readNumber } from './sheetTypes'

export type InventoryItem = {
  id: string
  name: string
  catalog_id: string | null
  qty: number
  weight_lb: number | null
  equipped: boolean
  notes: string
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
    notes: '',
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
  return {
    id: typeof row.id === 'string' ? row.id : `item-${index}`,
    name: typeof row.name === 'string' ? row.name : '',
    catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
    qty: Math.max(0, readNumber(row.qty, 1)),
    weight_lb: readNullableNumber(row.weight_lb ?? row.weight),
    equipped: Boolean(row.equipped),
    notes: typeof row.notes === 'string' ? row.notes : '',
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
        notes: item.notes,
      })),
    },
  }
}

export function asWeighableItems(items: InventoryItem[]): WeighableItem[] {
  return items.map((item) => ({ qty: item.qty, weight_lb: item.weight_lb }))
}

export function readCatalogWeightLb(data: Record<string, unknown>): number | null {
  return readNullableNumber(data.weight_lb ?? data.weight)
}
