/**
 * 2024 spell catalog for bard Magical Secrets / College of Lore discoveries.
 * Loaded lazily from the bundled PHB / SRD 2024 seeds so sheets never fall back to 2014 slugs.
 */

import type { CatalogEntry } from '../../shared/api/catalog'

export type Bard2024SpellBrief = {
  id: string
  slug: string
  nameRu: string
  nameEn: string
  level: number
  classes: string[]
  entry: Pick<CatalogEntry, 'id' | 'slug' | 'name_ru' | 'data'>
}

type SeedRow = {
  slug?: string
  name_ru?: string
  name_en?: string | null
  data?: unknown
}

const bySlug = new Map<string, Bard2024SpellBrief>()
const byName = new Map<string, Bard2024SpellBrief>()
let loadPromise: Promise<void> | null = null
const listeners = new Set<() => void>()

function norm(value: string): string {
  return value.trim().toLowerCase()
}

export function registerBardSpells2024(packs: ReadonlyArray<{ entries?: SeedRow[] }>): void {
  for (const pack of packs) {
    for (const row of pack.entries ?? []) {
      const slug = String(row.slug || '').trim()
      if (!slug || bySlug.has(slug)) continue
      const data =
        row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {}
      const level = typeof data.level === 'number' ? data.level : 0
      const classes = Array.isArray(data.classes)
        ? data.classes.filter((item): item is string => typeof item === 'string').map(norm)
        : []
      const nameRu = String(row.name_ru || '')
      const brief: Bard2024SpellBrief = {
        id: `seed-spell-${slug}`,
        slug,
        nameRu,
        nameEn: String(row.name_en || ''),
        level,
        classes,
        entry: { id: `seed-spell-${slug}`, slug, name_ru: nameRu, data },
      }
      bySlug.set(slug, brief)
      if (nameRu) byName.set(norm(nameRu), brief)
    }
  }
  for (const fn of listeners) fn()
}

export function clearBardSpells2024(): void {
  bySlug.clear()
  byName.clear()
  loadPromise = null
}

export function bardSpells2024Loaded(): boolean {
  return bySlug.size > 0
}

export function ensureBardSpells2024(): Promise<void> {
  if (bardSpells2024Loaded()) return Promise.resolve()
  if (!loadPromise) {
    loadPromise = Promise.all([
      import('../../shared/dnd/data/edition2024/spells_srd.json'),
      import('../../shared/dnd/data/edition2024/spells_ph24.json'),
    ])
      .then(([srd, ph24]) => {
        registerBardSpells2024([
          (ph24 as { default?: unknown }).default ?? ph24,
          (srd as { default?: unknown }).default ?? srd,
        ] as Array<{ entries?: SeedRow[] }>)
      })
      .catch(() => {
        loadPromise = null
      })
  }
  return loadPromise
}

export function onBardSpells2024Loaded(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function bardSpell2024BySlug(slug: string | null | undefined): Bard2024SpellBrief | null {
  const key = (slug ?? '').trim()
  return key ? (bySlug.get(key) ?? null) : null
}

/** Resolve a sheet row by catalog id (`seed-spell-…`), slug or Russian name. */
export function bardSpell2024ForSheetSpell(spell: {
  name?: string | null
  catalog_id?: string | null
}): Bard2024SpellBrief | null {
  const catalog = (spell.catalog_id ?? '').trim()
  if (catalog) {
    const hit = bySlug.get(catalog.replace(/^seed-spell-/, ''))
    if (hit) return hit
  }
  const name = (spell.name ?? '').trim()
  return name ? (byName.get(norm(name)) ?? null) : null
}

export function bardSpells2024OnLists(
  lists: readonly string[],
  opts: { maxLevel: number; includeCantrips?: boolean },
): Bard2024SpellBrief[] {
  const wanted = new Set(lists.map(norm))
  const out: Bard2024SpellBrief[] = []
  for (const row of bySlug.values()) {
    if (row.level === 0 && opts.includeCantrips === false) continue
    if (row.level > opts.maxLevel) continue
    if (row.classes.some((id) => wanted.has(id))) out.push(row)
  }
  return out.sort((a, b) => a.level - b.level || a.nameRu.localeCompare(b.nameRu, 'ru'))
}

/** True when the sheet spell is not on the Bard list (needs Magical Secrets). Unknown spells count as on-list. */
export function isOffBardList2024(spell: {
  name?: string | null
  catalog_id?: string | null
}): boolean {
  const hit = bardSpell2024ForSheetSpell(spell)
  return hit != null && !hit.classes.includes('bard')
}
