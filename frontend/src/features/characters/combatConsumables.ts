import type { InventoryItem } from './inventory'
import { isCastableSpellScroll } from './spellScroll'

/** Max items the player can pin into combat beyond auto-detect. */
export const MAX_COMBAT_CONSUMABLE_FAVORITES = 3

/** Cap rows shown under Атаки → Расходники. */
export const MAX_COMBAT_CONSUMABLE_ROWS = 8

/**
 * Ammo, potions, and common combat one-shots (name / notes).
 * Favorites cover anything this misses.
 */
const AUTO_COMBAT_CONSUMABLE_RE =
  /болт|стрел|дротик|снаряд|патрон|камень|flask|флакон|зелье|эликсир|порошок|кислот|огонь|масло|яд|свят(ая|ой)\s*вод|противояд|алхим|potion|antitoxin|healing|alchem|свиток|scroll/i

export type CombatConsumableRow = {
  item: InventoryItem
  favorite: boolean
  auto: boolean
}

export function isAutoCombatConsumable(item: {
  name: string
  notes?: string
  qty: number
  catalog_slug?: string | null
  scroll_spell?: InventoryItem['scroll_spell']
}): boolean {
  if (!item.name.trim() || item.qty <= 0) return false
  // Bound spell scrolls always belong in combat consumables.
  if (isCastableSpellScroll(item)) return true
  return (
    AUTO_COMBAT_CONSUMABLE_RE.test(item.name) ||
    AUTO_COMBAT_CONSUMABLE_RE.test(item.notes ?? '')
  )
}

export function normalizeCombatConsumableFavoriteIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of raw) {
    if (typeof id !== 'string') continue
    const trimmed = id.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
    if (out.length >= MAX_COMBAT_CONSUMABLE_FAVORITES) break
  }
  return out
}

export function toggleCombatConsumableFavorite(
  ids: string[],
  itemId: string,
): { ids: string[]; ok: boolean; reason?: string } {
  if (ids.includes(itemId)) {
    return { ids: ids.filter((id) => id !== itemId), ok: true }
  }
  if (ids.length >= MAX_COMBAT_CONSUMABLE_FAVORITES) {
    return {
      ids,
      ok: false,
      reason: `Не больше ${MAX_COMBAT_CONSUMABLE_FAVORITES} избранных расходников`,
    }
  }
  return { ids: [...ids, itemId], ok: true }
}

/** Favorites first (even at 0 qty), then auto-detected with qty > 0. */
export function listCombatConsumables(
  items: InventoryItem[],
  favoriteIds: string[],
): CombatConsumableRow[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  const rows: CombatConsumableRow[] = []
  const seen = new Set<string>()

  for (const id of favoriteIds) {
    const item = byId.get(id)
    if (!item || !item.name.trim()) continue
    seen.add(id)
    rows.push({
      item,
      favorite: true,
      auto: isAutoCombatConsumable({ ...item, qty: Math.max(1, item.qty) }),
    })
  }

  for (const item of items) {
    if (seen.has(item.id)) continue
    if (!isAutoCombatConsumable(item)) continue
    seen.add(item.id)
    rows.push({ item, favorite: false, auto: true })
  }

  return rows.slice(0, MAX_COMBAT_CONSUMABLE_ROWS)
}
