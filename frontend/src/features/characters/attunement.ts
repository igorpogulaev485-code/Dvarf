import type { InventoryItem } from './inventory'
import { asRecord } from './sheetTypes'

export const MAX_ATTUNEMENTS = 3

export type AttunementSlot = {
  id: string
  item_id: string | null
  name: string
  notes: string
}

export function createAttunementSlot(partial?: Partial<AttunementSlot>): AttunementSlot {
  return {
    id:
      partial?.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `attune-${Date.now()}`),
    item_id: partial?.item_id ?? null,
    name: partial?.name ?? '',
    notes: partial?.notes ?? '',
  }
}

function readSlot(raw: unknown, index: number): AttunementSlot {
  const row = asRecord(raw)
  return {
    id: typeof row.id === 'string' ? row.id : `attune-${index}`,
    item_id: typeof row.item_id === 'string' ? row.item_id : null,
    name: typeof row.name === 'string' ? row.name : '',
    notes: typeof row.notes === 'string' ? row.notes : '',
  }
}

export function readAttunements(sheet: Record<string, unknown>): AttunementSlot[] {
  const raw = sheet.attunements
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => readSlot(item, index)).slice(0, MAX_ATTUNEMENTS)
}

export function attunementsToSheet(slots: AttunementSlot[]): { attunements: AttunementSlot[] } {
  return {
    attunements: slots.slice(0, MAX_ATTUNEMENTS).map((slot) => ({
      id: slot.id,
      item_id: slot.item_id,
      name: slot.name.trim(),
      notes: slot.notes,
    })),
  }
}

export function filledAttunementCount(slots: AttunementSlot[]): number {
  return slots.filter((slot) => slot.name.trim() || slot.item_id).length
}

/**
 * Items for the attunement slot picker: needs attunement and not already
 * linked to another slot. The current slot’s selection stays in the list.
 * Never falls back to the full inventory.
 */
export function attunementPickerItems(input: {
  items: InventoryItem[]
  attunements: AttunementSlot[]
  currentSlotId: string
}): InventoryItem[] {
  const taken = new Set(
    input.attunements
      .filter((slot) => slot.id !== input.currentSlotId && Boolean(slot.item_id))
      .map((slot) => slot.item_id as string),
  )
  const currentItemId =
    input.attunements.find((slot) => slot.id === input.currentSlotId)?.item_id ?? null

  return input.items.filter((item) => {
    if (item.parent_id) return false
    if (currentItemId && item.id === currentItemId) return true
    if (!item.requires_attunement) return false
    if (taken.has(item.id)) return false
    return true
  })
}
