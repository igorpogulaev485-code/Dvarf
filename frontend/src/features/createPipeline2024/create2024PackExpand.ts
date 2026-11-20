/**
 * Expand 2024 background ``pack_summary_ru`` the same way the server builds
 * ``sheet.inventory`` (edition_2024_create). Keeps wizard preview / chip copy
 * aligned with what «Готово» persists.
 */

import type { CatalogEntry } from '../../shared/api/catalog'
import {
  itemNameRu,
  normalizeSlug,
  type ItemNameIndex,
} from './create2024Labels'
import { entryData } from './createPipeline2024Types'

const PACK_COIN_RE = /^(\d+)\s*зм\.?$/i
const PACK_LEADING_QTY_RE = /^(\d+)\s+(.+)$/u
/** Trailing × / x / Cyrillic х only when followed by digits — never split «духи». */
const PACK_TRAILING_QTY_RE = /^(.+?)\s*[×xXх]\s*(\d+)\s*$/u
const PACK_CHOICE_LABELS = new Set([
  'музыкальный инструмент',
  'ремесленные инструменты',
  'игровой набор',
])

export type ExpandedPackItem = {
  name: string
  qty: number
  slug: string | null
}

export type ExpandedBackgroundPack = {
  items: ExpandedPackItem[]
  coinsGp: number
}

export type ToolChoices = {
  category?: string
  from_category?: string
  from_group?: string
  label_ru?: string
  count?: number
  from?: unknown
}

function packNameCandidates(name: string): string[] {
  const n = name.trim().toLowerCase()
  if (!n) return []
  const out: string[] = [n]
  if (n.includes('(')) out.push(n.split('(', 1)[0]!.trim())
  for (const suf of ['ами', 'ями', 'ов', 'ев', 'ей', 'ы', 'и', 'а', 'я'] as const) {
    if (n.endsWith(suf) && n.length > suf.length + 2) {
      const stem = n.slice(0, -suf.length)
      out.push(stem)
      for (const add of ['', 'а', 'я', 'ь', 'ы', 'и'] as const) out.push(stem + add)
    }
  }
  for (const add of ['ы', 'а', 'я', 'и', 'ь'] as const) out.push(n + add)
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const cand of out) {
    const key = cand.trim()
    if (key && !seen.has(key)) {
      seen.add(key)
      ordered.push(key)
    }
  }
  return ordered
}

function buildNameIndex(items: ItemNameIndex): Map<string, string> {
  const byName = new Map<string, string>()
  for (const [slug, name] of items) {
    const key = String(name || '')
      .trim()
      .toLowerCase()
    if (key && !byName.has(key)) byName.set(key, slug)
  }
  return byName
}

function resolvePackItemSlug(name: string, byName: Map<string, string>): string | null {
  for (const cand of packNameCandidates(name)) {
    const slug = byName.get(cand)
    if (slug) return slug
  }
  return null
}

export function parsePackSummaryChunk(chunk: string): { name: string | null; qty: number } {
  const text = chunk.trim().replace(/\.$/, '')
  if (!text) return { name: '', qty: 1 }
  const coin = text.match(PACK_COIN_RE)
  if (coin) return { name: null, qty: Number(coin[1]) }
  const trailing = text.match(PACK_TRAILING_QTY_RE)
  if (trailing) return { name: trailing[1]!.trim(), qty: Number(trailing[2]) }
  const leading = text.match(PACK_LEADING_QTY_RE)
  if (leading) return { name: leading[2]!.trim(), qty: Number(leading[1]) }
  return { name: text, qty: 1 }
}

function isPackToolChoiceChunk(name: string, toolChoices: ToolChoices | null | undefined): boolean {
  const low = name.trim().toLowerCase()
  if (low.includes('выбранн')) return true
  if (!toolChoices || typeof toolChoices !== 'object') return false
  const base = low.split('(', 1)[0]!.trim()
  if (!PACK_CHOICE_LABELS.has(base)) return false
  const category = String(
    toolChoices.category || toolChoices.from_category || toolChoices.from_group || '',
  ).toLowerCase()
  if (category.includes('musical') || category.includes('instrument')) {
    return base === 'музыкальный инструмент'
  }
  if (category.includes('artisan')) return base === 'ремесленные инструменты'
  if (category.includes('gaming')) return base === 'игровой набор'
  return false
}

/** Expand background pack_summary_ru → inventory lines + purse GP. */
export function expandBackgroundPackSummary(input: {
  packSummaryRu: string
  backgroundToolId: string | null | undefined
  toolChoices?: ToolChoices | null
  items: ItemNameIndex
}): ExpandedBackgroundPack {
  const summary = String(input.packSummaryRu || '').trim()
  const out: ExpandedBackgroundPack = { items: [], coinsGp: 0 }
  if (!summary) return out

  const byName = buildNameIndex(input.items)
  const toolId = input.backgroundToolId ? normalizeSlug(input.backgroundToolId) : ''
  const toolName = toolId ? itemNameRu(toolId, input.items) : ''
  let toolPushed = false

  const chunks = summary
    .replace(/;/g, ',')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)

  for (const chunk of chunks) {
    const { name, qty } = parsePackSummaryChunk(chunk)
    if (name === null) {
      out.coinsGp += qty
      continue
    }
    if (toolId && isPackToolChoiceChunk(name, input.toolChoices)) {
      out.items.push({ name: toolName || name, qty, slug: toolId })
      toolPushed = true
      continue
    }
    const slug = resolvePackItemSlug(name, byName)
    if (slug) {
      out.items.push({ name: itemNameRu(slug, input.items), qty, slug })
      if (toolId && slug === toolId) toolPushed = true
    } else {
      out.items.push({ name, qty, slug: null })
    }
  }

  if (toolId && !toolPushed && input.toolChoices) {
    out.items.push({ name: toolName || toolId, qty: 1, slug: toolId })
  }
  return out
}

/** One-line summary for chips / detail panels (resolved tool + no trailing GP item). */
export function formatBackgroundPackPreview(input: {
  packSummaryRu: string
  backgroundToolId: string | null | undefined
  toolChoices?: ToolChoices | null
  items: ItemNameIndex
}): string {
  const expanded = expandBackgroundPackSummary(input)
  const parts = expanded.items.map((row) =>
    row.qty > 1 ? `${row.qty}× ${row.name}` : row.name,
  )
  if (expanded.coinsGp > 0) parts.push(`${expanded.coinsGp} зм`)
  return parts.join(', ')
}

export function backgroundToolChoicesOf(
  backgroundEntry: CatalogEntry | null | undefined,
): ToolChoices | null {
  const raw = entryData(backgroundEntry).tool_choices
  return raw && typeof raw === 'object' ? (raw as ToolChoices) : null
}

/**
 * Resolve class starting-pack rows that are generic tool slots
 * (``musical-instrument``, ``choice``, empty id) into the picked class tools.
 */
export function resolveClassPackToolItem(input: {
  itemId: string | null
  choice?: string | null
  nameRu?: string | null
  classToolIds: readonly string[]
  toolCursor: { index: number }
  items: ItemNameIndex
}): { name: string; slug: string | null } | null {
  const id = normalizeSlug(input.itemId || '')
  const choice = String(input.choice || '').toLowerCase()
  const needsPick =
    Boolean(choice) ||
    !id ||
    id === 'musical-instrument' ||
    id === 'gaming-set' ||
    /на выбор|выбранн/i.test(String(input.nameRu || ''))

  if (!needsPick) return null
  if (!input.classToolIds.length) {
    return {
      name: String(input.nameRu || 'Инструмент на выбор'),
      slug: id || null,
    }
  }
  const toolId = input.classToolIds[Math.min(input.toolCursor.index, input.classToolIds.length - 1)]!
  input.toolCursor.index += 1
  const slug = normalizeSlug(toolId)
  return { name: itemNameRu(slug, input.items), slug }
}

export function formatClassPackPreview(input: {
  pack: {
    coinsGp: number
    items: Array<{ id: string | null; qty: number; nameRu?: string; choice?: string }>
  }
  classToolIds: readonly string[]
  items: ItemNameIndex
}): string {
  const cursor = { index: 0 }
  const parts: string[] = []
  for (const row of input.pack.items) {
    const resolved = resolveClassPackToolItem({
      itemId: row.id,
      choice: row.choice,
      nameRu: row.nameRu,
      classToolIds: input.classToolIds,
      toolCursor: cursor,
      items: input.items,
    })
    const name =
      resolved?.name ??
      (row.id ? itemNameRu(row.id, input.items) : row.nameRu) ??
      'Предмет'
    parts.push(row.qty > 1 ? `${row.qty}× ${name}` : name)
  }
  if (input.pack.coinsGp > 0) parts.push(`${input.pack.coinsGp} зм`)
  return parts.join(', ')
}
