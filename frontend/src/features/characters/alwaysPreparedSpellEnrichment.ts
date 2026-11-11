/**
 * Enrich always-prepared sheet rows from the bundled 2014 spell catalog.
 * Domain/oath grants historically only set name+level, so concentration /
 * components / duration were missing on cast (QA 2026-10-22 Bless).
 */

import bundledSpells2014 from '../../../public/spells-2014.json'
import { sheetSpellFromCatalog, type SheetSpell } from './spells'

type CatalogSpellEntry = {
  id: string
  name_ru: string
  name_en?: string
  slug?: string
  data?: Record<string, unknown>
}

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/['’]/g, "'")
}

const byEn = new Map<string, CatalogSpellEntry>()
const byRu = new Map<string, CatalogSpellEntry>()
const byId = new Map<string, CatalogSpellEntry>()
const bundledList: CatalogSpellEntry[] = []

for (const raw of bundledSpells2014 as CatalogSpellEntry[]) {
  if (!raw || typeof raw.id !== 'string') continue
  bundledList.push(raw)
  byId.set(raw.id, raw)
  if (typeof raw.slug === 'string' && raw.slug.trim()) {
    byId.set(raw.slug, raw)
  }
  if (typeof raw.name_en === 'string' && raw.name_en.trim()) {
    byEn.set(norm(raw.name_en), raw)
  }
  if (typeof raw.name_ru === 'string' && raw.name_ru.trim()) {
    byRu.set(norm(raw.name_ru), raw)
  }
}

function bundledEntryForSheetSpell(spell: {
  name?: string | null
  catalog_id?: string | null
}): CatalogSpellEntry | null {
  const catalog = spell.catalog_id?.trim()
  if (catalog) {
    const byCatalog = byId.get(catalog) ?? byEn.get(norm(catalog)) ?? byRu.get(norm(catalog))
    if (byCatalog) return byCatalog
  }
  const name = spell.name?.trim()
  if (!name) return null
  return byRu.get(norm(name)) ?? byEn.get(norm(name)) ?? null
}

/**
 * Combat fields from the 2014 catalog (components, save, damage, upcast).
 * Sheet rows keep their id, preparation and class; rules text comes from the book.
 */
export function withBundledRules<T extends SheetSpell>(spell: T): T {
  if (spell.source_kind === 'custom') return spell
  const entry = bundledEntryForSheetSpell(spell)
  if (!entry) return spell
  const fromCatalog = sheetSpellFromCatalog({
    id: entry.id,
    name_ru: entry.name_ru,
    slug: entry.slug,
    data: entry.data,
  })
  return {
    ...spell,
    components: fromCatalog.components ?? spell.components,
    attack_or_save: fromCatalog.attack_or_save || spell.attack_or_save,
    damage: fromCatalog.damage || spell.damage,
    damage_at_character_level:
      fromCatalog.damage_at_character_level ?? spell.damage_at_character_level,
    damage_at_slot_level: fromCatalog.damage_at_slot_level ?? spell.damage_at_slot_level,
    higher_levels: fromCatalog.higher_levels || spell.higher_levels,
    description: spell.description || fromCatalog.description,
    duration: spell.duration || fromCatalog.duration,
    concentration: spell.concentration || fromCatalog.concentration,
  }
}

export type BundledSpellBrief = {
  slug: string
  nameRu: string
  level: number
  classes: string[]
  attackOrSave: string
  damage: string
  range: string
  concentration: boolean
  school: string
}

/** Spells of one circle, for arcanum / psionic pickers. */
export function bundledSpellsAtLevel(level: number): BundledSpellBrief[] {
  const circle = Math.max(0, Math.min(9, Math.floor(level)))
  const out: BundledSpellBrief[] = []
  for (const row of bundledList) {
    const data = row.data ?? {}
    const spellLevel = typeof data.level === 'number' ? data.level : 0
    if (spellLevel !== circle) continue
    const slug = row.slug?.trim()
    if (!slug) continue
    const classes = Array.isArray(data.classes)
      ? data.classes.filter((item): item is string => typeof item === 'string')
      : []
    out.push({
      slug,
      nameRu: row.name_ru,
      level: spellLevel,
      classes,
      attackOrSave: typeof data.attack_or_save === 'string' ? data.attack_or_save : '',
      damage: typeof data.damage === 'string' ? data.damage : '',
      range: typeof data.range === 'string' ? data.range : '',
      concentration: data.concentration === true,
      school: typeof data.school === 'string' ? data.school : '',
    })
  }
  out.sort((a, b) => a.nameRu.localeCompare(b.nameRu, 'ru'))
  return out
}

export type BundledRitualOption = {
  slug: string
  nameRu: string
  nameEn: string
  level: number
  classes: string[]
}

/** Leveled spells with the ritual tag, for ritual-book copy pickers. */
export function bundledRitualOptions(): BundledRitualOption[] {
  const out: BundledRitualOption[] = []
  for (const row of bundledList) {
    const slug = row.slug?.trim()
    if (!slug) continue
    const data = row.data ?? {}
    if (data.ritual !== true) continue
    const level = typeof data.level === 'number' ? data.level : 0
    if (level <= 0) continue
    const classes = Array.isArray(data.classes)
      ? data.classes.filter((item): item is string => typeof item === 'string')
      : []
    out.push({
      slug,
      nameRu: row.name_ru,
      nameEn: row.name_en?.trim() || row.name_ru,
      level,
      classes: classes.map((item) => item.trim().toLowerCase()),
    })
  }
  out.sort((a, b) => a.level - b.level || a.nameRu.localeCompare(b.nameRu, 'ru'))
  return out
}

/** Bundled 2014 row by catalog slug (fireball, command, …). */
export function bundledSpellBySlug(slug: string): CatalogSpellEntry | null {
  const key = slug.trim()
  if (!key) return null
  return byId.get(key) ?? null
}

/** Resolve catalog entry by English seed name or Russian sheet label. */
export function findBundledSpellForAlwaysPrepared(
  englishName: string,
  nameRu?: string,
): CatalogSpellEntry | null {
  const en = englishName.trim()
  if (en) {
    const hit = byEn.get(norm(en))
    if (hit) return hit
  }
  const ru = nameRu?.trim()
  if (ru) {
    const hit = byRu.get(norm(ru))
    if (hit) return hit
  }
  return null
}

/**
 * Merge catalog mechanics onto an always-prepared stub while keeping the
 * stable subclass spell id / prepared_locked flags from `base`.
 */
export function enrichAlwaysPreparedSheetSpell(
  base: SheetSpell,
  englishName: string,
): SheetSpell {
  const entry = findBundledSpellForAlwaysPrepared(englishName, base.name)
  if (!entry) return base
  const fromCatalog = sheetSpellFromCatalog({
    id: entry.id,
    name_ru: entry.name_ru,
    slug: entry.slug,
    data: entry.data,
  })
  return {
    ...fromCatalog,
    ...base,
    catalog_id: base.catalog_id ?? fromCatalog.catalog_id,
    name: fromCatalog.name || base.name,
    level: Number.isFinite(base.level) ? base.level : fromCatalog.level,
    casting_time: base.casting_time || fromCatalog.casting_time,
    range: base.range || fromCatalog.range,
    attack_or_save: base.attack_or_save || fromCatalog.attack_or_save,
    damage: base.damage || fromCatalog.damage,
    concentration: Boolean(base.concentration || fromCatalog.concentration),
    duration: base.duration || fromCatalog.duration,
    ritual: base.ritual ?? fromCatalog.ritual,
    school: base.school || fromCatalog.school,
    source_book: base.source_book || fromCatalog.source_book,
    components: base.components ?? fromCatalog.components,
    description: base.description || fromCatalog.description,
    higher_levels: base.higher_levels || fromCatalog.higher_levels,
    damage_at_character_level:
      base.damage_at_character_level ?? fromCatalog.damage_at_character_level,
    damage_at_slot_level:
      base.damage_at_slot_level ?? fromCatalog.damage_at_slot_level,
    applies_to_allies: base.applies_to_allies ?? fromCatalog.applies_to_allies,
    ally_target_count: base.ally_target_count ?? fromCatalog.ally_target_count,
  }
}
