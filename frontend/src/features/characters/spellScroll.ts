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
  concentration?: boolean
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
      concentration: Boolean(spell.concentration),
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

/** Bound scroll ready to cast / show in combat consumables. */
export function isCastableSpellScroll(item: {
  qty: number
  name: string
  catalog_slug?: string | null
  scroll_spell?: ScrollSpellBinding | null
}): boolean {
  return (
    item.qty > 0 &&
    isSpellScrollItem(item) &&
    item.scroll_spell != null &&
    Boolean(item.scroll_spell.name.trim())
  )
}

/**
 * DMG 2014 Spell Scroll fixed save DC / attack bonus by spell level.
 * (Rarity tiers collapsed to the published table.)
 */
export type SpellScrollCastStats = {
  level: number
  saveDc: number
  attackBonus: number
  rarityRu: string
}

export function spellScrollCastStats(spellLevel: number): SpellScrollCastStats {
  const level = Math.max(0, Math.min(9, Math.floor(spellLevel)))
  if (level <= 1) {
    return { level, saveDc: 13, attackBonus: 5, rarityRu: 'обычный' }
  }
  if (level === 2) {
    return { level, saveDc: 13, attackBonus: 5, rarityRu: 'необычный' }
  }
  if (level === 3) {
    return { level, saveDc: 15, attackBonus: 7, rarityRu: 'необычный' }
  }
  if (level === 4) {
    return { level, saveDc: 15, attackBonus: 7, rarityRu: 'редкий' }
  }
  if (level === 5) {
    return { level, saveDc: 17, attackBonus: 9, rarityRu: 'редкий' }
  }
  if (level === 6) {
    return { level, saveDc: 17, attackBonus: 9, rarityRu: 'очень редкий' }
  }
  if (level === 7 || level === 8) {
    return { level, saveDc: 18, attackBonus: 10, rarityRu: 'очень редкий' }
  }
  return { level, saveDc: 19, attackBonus: 11, rarityRu: 'легендарный' }
}

/** Ability check DC to cast a scroll whose spell is not on your list (DMG). */
export function spellScrollOffListCheckDc(spellLevel: number): number {
  return 10 + Math.max(0, Math.floor(spellLevel))
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
    concentration: Boolean(row.concentration),
  }
}
