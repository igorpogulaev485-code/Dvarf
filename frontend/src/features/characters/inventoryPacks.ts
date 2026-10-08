/**
 * Pack / kit expand → nested inventory rows.
 * Weight rule: collapsed pack uses its weight_lb; expanded pack contributes 0
 * and children each add qty×weight — so encumbrance tracks spends (drank a waterskin).
 */

import { parseItemCatalogData, type PackContentRef } from '../../shared/dnd/gearCatalog'
import { itemLineWeightLb } from '../../shared/dnd/weight'
import { createInventoryItem, type InventoryItem } from './inventory'

export type PackCatalogLookup = {
  id: string
  slug: string
  name_ru: string
  data?: Record<string, unknown> | null
}

export type ResolvedPackContent = {
  slug?: string
  name_ru: string
  qty: number
  weight_lb: number | null
  catalog_id: string | null
}

export function childrenOf(items: InventoryItem[], parentId: string): InventoryItem[] {
  return items.filter((item) => item.parent_id === parentId)
}

export function isExpandedPack(items: InventoryItem[], packId: string): boolean {
  return items.some((item) => item.parent_id === packId)
}

export function hasPackContents(data: Record<string, unknown> | null | undefined): boolean {
  const parsed = parseItemCatalogData(data)
  return parsed.contents.length > 0 || parsed.item_category === 'pack'
}

export function readPackContents(data: Record<string, unknown> | null | undefined): PackContentRef[] {
  return parseItemCatalogData(data).contents
}

/** Class/BG grants often say «Набор исследователя» while catalog uses PHB «путешественника». */
const PACK_NAME_ALIASES: Record<string, string[]> = {
  explorers_pack: [
    'набор исследователя',
    'набор путешественника',
    "explorer's pack",
    'explorers pack',
  ],
  dungeoneers_pack: [
    'набор исследователя подземелий',
    "dungeoneer's pack",
    'dungeoneers pack',
  ],
  burglars_pack: ['набор взломщика', "burglar's pack"],
  diplomats_pack: ['набор дипломата', "diplomat's pack"],
  entertainers_pack: ['набор артиста', "entertainer's pack"],
  priests_pack: ['набор священника', 'набор жреца', "priest's pack"],
  scholars_pack: ['набор учёного', 'набор ученого', "scholar's pack"],
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Find catalog pack row by id, exact RU name, or grant alias. */
export function findCatalogPackEntry(
  item: { catalog_id?: string | null; name: string },
  catalogItems: PackCatalogLookup[],
): PackCatalogLookup | null {
  if (item.catalog_id) {
    const byId = catalogItems.find((row) => row.id === item.catalog_id)
    if (byId) return byId
  }
  const key = normalizeName(item.name)
  if (!key) return null
  const byName = catalogItems.find((row) => normalizeName(row.name_ru) === key)
  if (byName) return byName
  for (const [slug, aliases] of Object.entries(PACK_NAME_ALIASES)) {
    if (!aliases.some((alias) => alias === key || key.includes(alias))) continue
    const bySlug = catalogItems.find((row) => row.slug === slug)
    if (bySlug) return bySlug
  }
  return null
}

/** Resolve content refs against a catalog item list (by slug, then name). */
export function resolvePackContents(
  contents: PackContentRef[],
  catalogItems: PackCatalogLookup[],
): ResolvedPackContent[] {
  const bySlug = new Map(catalogItems.map((row) => [row.slug, row]))
  const byName = new Map(
    catalogItems.map((row) => [row.name_ru.trim().toLowerCase(), row]),
  )
  const out: ResolvedPackContent[] = []
  for (const ref of contents) {
    const qty = Math.max(1, Math.floor(ref.qty || 1))
    const fromSlug = ref.slug ? bySlug.get(ref.slug) : undefined
    const fromName = ref.name_ru
      ? byName.get(ref.name_ru.trim().toLowerCase())
      : undefined
    const hit = fromSlug ?? fromName
    if (hit) {
      const parsed = parseItemCatalogData(hit.data ?? {})
      out.push({
        slug: hit.slug,
        name_ru: hit.name_ru,
        qty,
        weight_lb: parsed.weight_lb,
        catalog_id: hit.id,
      })
      continue
    }
    out.push({
      slug: ref.slug,
      name_ru: ref.name_ru || ref.slug || 'Предмет набора',
      qty,
      weight_lb: null,
      catalog_id: null,
    })
  }
  return out
}

/** Sum of resolved contents (for collapsed packs with null catalog weight). */
export function sumContentsWeightLb(contents: ResolvedPackContent[]): number {
  return contents.reduce(
    (sum, row) => sum + itemLineWeightLb({ qty: row.qty, weight_lb: row.weight_lb }),
    0,
  )
}

/**
 * Fill missing weight / pack kind on collapsed grant packs («Набор исследователя» без weight_lb).
 * Returns null when nothing to change. Caller must skip expanded packs (children own the mass).
 */
export function hydrateCollapsedPackMeta(
  item: InventoryItem,
  catalogItems: PackCatalogLookup[],
): Partial<InventoryItem> | null {
  if (item.parent_id) return null
  const hit = findCatalogPackEntry(item, catalogItems)
  if (!hit || !hasPackContents(hit.data ?? undefined)) return null
  const parsed = parseItemCatalogData(hit.data ?? {})
  const resolved = resolvePackContents(parsed.contents, catalogItems)
  const fromCatalog = parsed.weight_lb
  const fromContents = sumContentsWeightLb(resolved)
  const weight =
    fromCatalog != null && fromCatalog > 0
      ? fromCatalog
      : fromContents > 0
        ? fromContents
        : null
  const patch: Partial<InventoryItem> = {}
  let changed = false
  if (
    (item.weight_lb == null || item.weight_lb === 0) &&
    weight != null &&
    weight > 0
  ) {
    patch.weight_lb = weight
    patch.pack_weight_lb = weight
    changed = true
  }
  if (item.container_kind !== 'pack' && item.container_kind !== 'kit') {
    patch.container_kind = 'pack'
    changed = true
  }
  if (!item.catalog_id) {
    patch.catalog_id = hit.id
    changed = true
  }
  return changed ? patch : null
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * Expand one pack row into child inventory lines.
 * Multiplies content qty by pack.qty. Sets pack weight to 0 (children carry mass).
 * Stores prior pack weight in pack_weight_lb for collapse.
 */
export function expandPack(input: {
  items: InventoryItem[]
  packId: string
  contents: ResolvedPackContent[]
}): InventoryItem[] {
  const pack = input.items.find((item) => item.id === input.packId)
  if (!pack) return input.items
  if (isExpandedPack(input.items, input.packId)) return input.items
  if (input.contents.length === 0) return input.items

  const packQty = Math.max(1, Math.floor(pack.qty))
  const priorWeight = pack.weight_lb
  const children: InventoryItem[] = input.contents.map((row) => {
    const created = createInventoryItem()
    created.id = newId()
    created.name = row.name_ru
    created.catalog_id = row.catalog_id
    created.qty = row.qty * packQty
    created.weight_lb = row.weight_lb
    created.parent_id = pack.id
    created.notes = `Из набора: ${pack.name || 'набор'}`
    created.equipped = false
    return created
  })

  return [
    ...input.items.map((item) =>
      item.id === pack.id
        ? {
            ...item,
            qty: 1,
            weight_lb: 0,
            container_expanded: true,
            pack_weight_lb: priorWeight,
            container_kind: item.container_kind ?? 'pack',
          }
        : item,
    ),
    ...children,
  ]
}

/**
 * Collapse: remove children, put their *current* total weight back on the pack.
 * Spent waterskins / eaten rations stay reflected — we do not restore the pre-expand snapshot.
 */
export function collapsePack(input: {
  items: InventoryItem[]
  packId: string
}): InventoryItem[] {
  const pack = input.items.find((item) => item.id === input.packId)
  if (!pack) return input.items
  const kids = childrenOf(input.items, input.packId)
  if (kids.length === 0) {
    return input.items.map((item) =>
      item.id === pack.id
        ? { ...item, container_expanded: false }
        : item,
    )
  }
  const kidsWeight = kids.reduce(
    (sum, row) => sum + itemLineWeightLb({ qty: row.qty, weight_lb: row.weight_lb }),
    0,
  )
  // Prefer live contents sum (after spends). Snapshot only if every child lacks weight.
  const anyChildWeighed = kids.some((row) => row.weight_lb != null)
  const restored = anyChildWeighed
    ? kidsWeight
    : pack.pack_weight_lb != null && Number.isFinite(pack.pack_weight_lb)
      ? pack.pack_weight_lb
      : kidsWeight

  return input.items
    .filter((item) => item.parent_id !== pack.id)
    .map((item) =>
      item.id === pack.id
        ? {
            ...item,
            weight_lb: restored,
            container_expanded: false,
            pack_weight_lb: restored,
          }
        : item,
    )
}

/** Delete item; if pack, also drop children. */
export function removeInventoryItem(
  items: InventoryItem[],
  id: string,
): InventoryItem[] {
  const drop = new Set<string>([id])
  for (const item of items) {
    if (item.parent_id === id) drop.add(item.id)
  }
  return items.filter((item) => !drop.has(item.id))
}

/** Stable display order: roots, each followed by its children. */
export function orderInventoryItems(items: InventoryItem[]): InventoryItem[] {
  const roots = items.filter((item) => !item.parent_id)
  const out: InventoryItem[] = []
  const seen = new Set<string>()
  for (const root of roots) {
    out.push(root)
    seen.add(root.id)
    for (const child of childrenOf(items, root.id)) {
      out.push(child)
      seen.add(child.id)
    }
  }
  for (const item of items) {
    if (!seen.has(item.id)) out.push(item)
  }
  return out
}
