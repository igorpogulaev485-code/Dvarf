/**
 * Spell scrolls (I-17 stitch): bind a concrete spell to a generic scroll item,
 * then copy into a wizard spellbook at foreign tariff (consumes the scroll).
 */
import type { SpellCastProfile } from '../../shared/dnd/castProfiles'
import type { SpellcastingAbility } from '../../shared/dnd/spells'
import type { InventoryItem, ScrollSpellBinding } from './inventory'

export type { ScrollSpellBinding }

export const SCROLL_NOT_ON_CLASS_LIST =
  'Заклинания нет в списке вашего класса — свиток не прочесть (DMG, Свиток заклинания)'

export type ScrollCaster = {
  /** Spell list this caster draws from. Eldritch Knight and Arcane Trickster use wizard. */
  listSlug: string
  ability: SpellcastingAbility | null
  maxSpellLevel: number
}

export type ScrollReadGate =
  | { status: 'unknown' }
  | { status: 'cast' }
  | { status: 'blocked'; reason: string }
  | { status: 'check'; ability: SpellcastingAbility; dc: number }

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

export function isScrollSpellLocked(
  item: Pick<InventoryItem, 'scroll_spell'>,
): boolean {
  return Boolean(item.scroll_spell?.name?.trim())
}

export function bindScrollSpell(
  item: InventoryItem,
  spell: ScrollSpellBinding,
): InventoryItem {
  if (isScrollSpellLocked(item)) return item
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
      ...(spell.classes ? { classes: spell.classes } : {}),
    },
    name: formatScrollDisplayName(spell.name, spell.level),
    qty: Math.max(1, item.qty || 1),
  }
}

function newScrollRowId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `scroll-${Date.now()}`
}

/**
 * Bind a spell onto a blank scroll. A stack of qty>1 splits one copy off
 * so the rest stay blank. An already chosen spell is left untouched.
 */
export function applyScrollSpellChoice(
  items: InventoryItem[],
  itemId: string,
  spell: ScrollSpellBinding,
): InventoryItem[] {
  const item = items.find((row) => row.id === itemId)
  if (!item || !isSpellScrollItem(item)) return items
  if (isScrollSpellLocked(item)) return items
  const qty = Math.max(1, item.qty || 1)
  if (qty > 1) {
    const bound = bindScrollSpell({ ...item, id: newScrollRowId(), qty: 1 }, spell)
    return items.flatMap((row) =>
      row.id === itemId ? [{ ...row, qty: qty - 1 }, bound] : [row],
    )
  }
  return items.map((row) => (row.id === itemId ? bindScrollSpell(row, spell) : row))
}

/**
 * DMG p. 200. Not on any class list → cannot read.
 * On the list but above the level that class can cast → ability check DC 10 + level.
 * Thief 13 ignores the class-list bar. The level check still applies; the ability
 * is the character's own spellcasting ability, or Intelligence when they have none.
 */
export function scrollCastersFromProfiles(profiles: SpellCastProfile[]): ScrollCaster[] {
  return profiles.map((row) => ({
    listSlug: row.kind === 'third' ? 'wizard' : row.slug,
    ability: row.ability,
    maxSpellLevel: row.aloneMaxLevel,
  }))
}

export function resolveScrollClasses(
  item: InventoryItem,
  index: Record<string, string[]>,
  ready: boolean,
): string[] | null {
  const binding = item.scroll_spell
  if (!binding) return null
  if (binding.classes) return binding.classes
  if (!ready) return null
  const id = binding.catalog_id ?? ''
  if (id && id in index) return index[id]!
  const slug = binding.slug ?? ''
  if (slug && slug in index) return index[slug]!
  return []
}

export function scrollCastBlockReason(
  item: InventoryItem,
  casters: ScrollCaster[],
  thiefRogue13: boolean,
  classes: string[] | null,
): string | null {
  if (!isCastableSpellScroll(item) || !item.scroll_spell) return null
  const gate = scrollReadGate({
    spellLevel: item.scroll_spell.level,
    spellClasses: classes,
    casters,
    thiefRogue13,
  })
  return gate.status === 'blocked' ? gate.reason : null
}

export function scrollReadGate(input: {
  spellLevel: number
  /** null while the catalog class list is still unknown. */
  spellClasses: string[] | null
  casters: ScrollCaster[]
  thiefRogue13: boolean
}): ScrollReadGate {
  if (input.spellClasses == null) return { status: 'unknown' }
  const classes = input.spellClasses.map((row) => row.trim().toLowerCase()).filter(Boolean)
  const holders = input.casters.filter((row) => classes.includes(row.listSlug))
  const level = Math.max(0, Math.floor(input.spellLevel))
  if (!input.thiefRogue13 && holders.length === 0) {
    return { status: 'blocked', reason: SCROLL_NOT_ON_CLASS_LIST }
  }
  if (level <= 0) return { status: 'cast' }
  const holderMax = holders.reduce((max, row) => Math.max(max, row.maxSpellLevel), 0)
  const ownMax = input.casters.reduce((max, row) => Math.max(max, row.maxSpellLevel), 0)
  if (!input.thiefRogue13) {
    if (holderMax >= level) return { status: 'cast' }
    const best = [...holders].sort((a, b) => b.maxSpellLevel - a.maxSpellLevel)[0]
    return {
      status: 'check',
      ability: best?.ability ?? 'wis',
      dc: 10 + level,
    }
  }
  if (level <= ownMax) return { status: 'cast' }
  const ownAbility = input.casters.find((row) => row.ability)?.ability ?? 'int'
  return { status: 'check', ability: ownAbility, dc: 10 + level }
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
    ...(Array.isArray(row.classes)
      ? {
          classes: row.classes.filter((item): item is string => typeof item === 'string'),
        }
      : {}),
  }
}
