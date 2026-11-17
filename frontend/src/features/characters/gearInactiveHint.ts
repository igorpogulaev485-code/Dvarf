import type { AttunementSlot } from './attunement'
import { canShowEquipChip } from './heldEquip'
import { attunedItemIdSet, isGearEffectActive } from './gearEffects'
import type { InventoryItem } from './inventory'

/** Russian hint when catalog effects exist but the item is not currently active. */
export function gearInactiveHint(
  item: InventoryItem,
  attunements: AttunementSlot[],
): string | null {
  if (!item.effects?.length || item.parent_id) return null
  const attuned = attunedItemIdSet(attunements)
  if (isGearEffectActive(item, attuned)) return null
  if (!item.equipped && canShowEquipChip(item)) {
    return 'свойства не действуют · возьмите в руки / наденьте, чтобы получить бонусы'
  }
  if (item.requires_attunement && !attuned.has(item.id)) {
    return 'свойства не действуют · настройте, чтобы получить бонусы'
  }
  return null
}