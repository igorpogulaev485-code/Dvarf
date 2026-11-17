/**
 * Auto-link attunement when equipping a magic item and a free slot exists.
 */

import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  createAttunementSlot,
  maxAttunementsForClasses,
  type AttunementSlot,
} from './attunement'
import { attunementChoiceReason, type AttunementCharacter } from './attunementRules'
import type { InventoryItem } from './inventory'

function firstFreeSlotId(slots: AttunementSlot[], limit: number): string | null {
  for (let i = 0; i < Math.min(slots.length, limit); i++) {
    const slot = slots[i]!
    if (!slot.item_id) return slot.id
  }
  return null
}

export function tryAutoAttuneOnEquip(input: {
  item: InventoryItem
  items: InventoryItem[]
  attunements: AttunementSlot[]
  classes: ClassLevelEntry[]
  character: AttunementCharacter | null | undefined
}): { attunements: AttunementSlot[]; toast: string | null } {
  const { item } = input
  if (!item.requires_attunement) {
    return { attunements: input.attunements, toast: null }
  }
  if (input.attunements.some((slot) => slot.item_id === item.id)) {
    return { attunements: input.attunements, toast: null }
  }

  const limit = maxAttunementsForClasses(input.classes)
  let slots = [...input.attunements]
  let slotId = firstFreeSlotId(slots, limit)
  if (!slotId && slots.length < limit) {
    const created = createAttunementSlot()
    slots = [...slots, created]
    slotId = created.id
  }
  if (!slotId) {
    return { attunements: input.attunements, toast: null }
  }

  const gate = attunementChoiceReason({
    item,
    slots,
    items: input.items,
    currentSlotId: slotId,
    character: input.character,
  })
  if (gate.blocked) {
    const reason = gate.reason?.trim()
    return {
      attunements: input.attunements,
      toast:
        reason ||
        'Настройка этого предмета недоступна для вашего персонажа.',
    }
  }

  const next = slots.map((slot) =>
    slot.id === slotId
      ? {
          ...slot,
          item_id: item.id,
          name: item.name?.trim() || slot.name,
        }
      : slot,
  )
  return { attunements: next, toast: null }
}