/** Keep attack cards aligned with inventory rows (held / orphans). */

export type AttackInventoryLink = {
  inventory_item_id?: string | null
  held?: boolean
}

/**
 * Mirror inventory.equipped onto linked attack cards, and drop attacks whose
 * inventory row was deleted (orphan short-sword cards after remove).
 */
export function syncAttacksHeldFromInventory<T extends AttackInventoryLink>(
  weapons: T[],
  items: Array<{ id: string; equipped: boolean }>,
): T[] {
  const itemById = new Map(items.map((item) => [item.id, item]))
  let changed = false
  const next: T[] = []
  for (const attack of weapons) {
    if (!attack.inventory_item_id) {
      next.push(attack)
      continue
    }
    const item = itemById.get(attack.inventory_item_id)
    if (!item) {
      changed = true
      continue
    }
    const held = Boolean(item.equipped)
    if (attack.held === held) {
      next.push(attack)
      continue
    }
    changed = true
    next.push({ ...attack, held })
  }
  return changed ? next : weapons
}
