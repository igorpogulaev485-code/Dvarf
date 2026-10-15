/**
 * Spell scrolls (I-17 stitch): bind a concrete spell to a generic scroll item,
 * then copy into a wizard spellbook at foreign tariff (consumes the scroll).
 */
import type { InventoryItem } from './inventory'

export type ScrollSpellBinding = {
  catalog_id: string | null
  slug?: string | null
  name: string
  level: number
  school?: string | null
  ritual?: boolean
}

const SCROLL_SLUG_RE = /^spell_scroll(?:_(\d+|cantrip))?$/i
const SCROLL_NAME_RE = /свиток/i

export function isSpellScrollCatalogSlug(slug: string | null | undefined): boolean {
  if (!slug) return false
  return SCROLL_SLUG_RE.test(slug.trim()) || slug.trim().toLowerCase() === 'spell_scroll'
}

export function isSpellScrollItem(item: Pick<InventoryItem, 'catalog_slug' | 'name'>): boolean {
  if (isSpellScrollCatalogSlug(item.catalog_slug)) return true
  return SCROLL_NAME_RE.test(item.name.trim())
}

/**
 * Max spell level this scroll blank can hold (0 = cantrip).
 * Null = unknown / unbound generic "свиток" — any level allowed in binder UI.
 */
export function spellScrollLevelCap(
  item: Pick<InventoryItem, 'catalog_slug' | 'name'>,
): number | null {
  const slug = item.catalog_slug?.trim() ?? ''
  const match = SCROLL_SLUG_RE.exec(slug)
  if (match) {
    const key = (match[1] ?? '').toLowerCase()
    if (!key || key === 'cantrip') return 0
    const n = Number(key)
    return Number.isFinite(n) ? n : null
  }
  const name = item.name.trim().toLowerCase()
  if (/заговор|cantrip/.test(name)) return 0
  const levelMatch = name.match(/(\d+)\s*(?:ур|уровн)/i) || name.match(/scroll\s*\((\d+)/i)
  if (levelMatch) {
    const n = Number(levelMatch[1])
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function formatScrollDisplayName(spellName: string, level: number): string {
  const label = spellName.trim() || '—'
  if (level <= 0) return `Свиток: ${label} (заговор)`
  return `Свиток: ${label} (${level} ур.)`
}

export function bindScrollSpell(
  item: InventoryItem,
  spell: ScrollSpellBinding,
): InventoryItem {
  return {
    ...item,
    scroll_spell: {
      catalog_id: spell.catalog_id,
      slug: spell.slug ?? null,
      name: spell.name.trim(),
      level: Math.max(0, Math.floor(spell.level)),
      school: spell.school ?? null,
      ritual: Boolean(spell.ritual),
    },
    name: formatScrollDisplayName(spell.name, spell.level),
    // Bound scrolls are distinct consumables — don't casually stack mixed spells.
    qty: Math.max(1, item.qty || 1),
  }
}

export function clearScrollSpell(item: InventoryItem): InventoryItem {
  const { scroll_spell: _drop, ...rest } = item
  return { ...rest, scroll_spell: null }
}

export function listBoundSpellScrolls(items: InventoryItem[]): InventoryItem[] {
  return items.filter(
    (item) =>
      item.qty > 0 &&
      isSpellScrollItem(item) &&
      item.scroll_spell != null &&
      Boolean(item.scroll_spell.name.trim()),
  )
}

/** Decrement qty; remove row when qty hits 0. */
export function consumeScrollItem(
  items: InventoryItem[],
  itemId: string,
): InventoryItem[] {
  const next: InventoryItem[] = []
  for (const item of items) {
    if (item.id !== itemId) {
      next.push(item)
      continue
    }
    const qty = Math.max(0, item.qty - 1)
    if (qty > 0) next.push({ ...item, qty })
  }
  return next
}

export function readScrollSpellBinding(raw: unknown): ScrollSpellBinding | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  if (!name) return null
  const levelRaw = row.level
  const level =
    typeof levelRaw === 'number' && Number.isFinite(levelRaw)
      ? Math.max(0, Math.floor(levelRaw))
      : 0
  return {
    catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
    slug: typeof row.slug === 'string' ? row.slug : null,
    name,
    level,
    school: typeof row.school === 'string' ? row.school : null,
    ritual: Boolean(row.ritual),
  }
}
