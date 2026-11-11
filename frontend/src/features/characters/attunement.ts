import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { resolveClassFeatureSlug } from '../../shared/dnd/classFeatures'
import type { InventoryItem } from './inventory'
import { asRecord } from './sheetTypes'

/** PHB default. Artificer raises this; use maxAttunementsForClasses. */
export const MAX_ATTUNEMENTS = 3

function isArtificer(row: ClassLevelEntry): boolean {
  if (resolveClassFeatureSlug(row.name) === 'artificer') return true
  const id = (row.catalog_id || '').toLowerCase()
  return id.includes('artificer') || /изобретат/i.test(row.name || '')
}

/**
 * Attunement slots. Artificer class level (not character level):
 * 10+ → 4, 14+ → 5, 18+ → 6 (TCE Magic Item Adept / Savant / Master).
 */
export function maxAttunementsForClasses(classes: ClassLevelEntry[]): number {
  let artificer = 0
  for (const row of classes) {
    if (!isArtificer(row)) continue
    artificer += Math.max(0, Math.floor(row.level))
  }
  if (artificer >= 18) return 6
  if (artificer >= 14) return 5
  if (artificer >= 10) return 4
  return MAX_ATTUNEMENTS
}

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
  // Do not drop slots above the current limit — a level-down must not
  // silently unattune. Overflow is marked and stops granting effects.
  return raw.map((item, index) => readSlot(item, index))
}

export function attunementsToSheet(slots: AttunementSlot[]): { attunements: AttunementSlot[] } {
  return {
    attunements: slots.map((slot) => ({
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
