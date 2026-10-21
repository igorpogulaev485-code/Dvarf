/**
 * «Все доступные» for prepare-from-class-list casters (cleric / druid / paladin / artificer).
 * Multiclass: each such class contributes its own list up to that class’s alone max spell level.
 * Wizard and known casters are excluded — their available set stays `spells.known`.
 */

import type { CatalogEntry } from '../api/catalog'
import type { ClassLevelEntry } from './classLevels'
import {
  classCasterDef,
  maxSpellLevelForClassAlone,
  preparesFromFullClassList,
  resolveClassCasterSlug,
} from './casterProgression'

export type ClassListPrepareSource = {
  slug: string
  labelRu: string
  classLevel: number
  /** Highest spell level (1–9) preparable from this class list; 0 = none yet. */
  maxSpellLevel: number
}

/** Minimal spell shape used when merging available lists. */
export type PrepareListSpell = {
  id: string
  name: string
  catalog_id: string | null
  level: number
  prepared: boolean
  notes: string
  casting_time: string
  range: string
  attack_or_save: string
  damage: string
  concentration: boolean
  source_kind?: string
  race_grant?: 'innate' | 'spell_list'
}

export function classListPrepareSources(input: {
  className: string
  level: number
  classes?: ClassLevelEntry[]
}): ClassListPrepareSource[] {
  const rows =
    input.classes && input.classes.length > 0
      ? input.classes.filter((row) => row.name.trim() && row.level > 0)
      : input.className.trim()
        ? [
            {
              id: 'legacy',
              name: input.className,
              catalog_id: null,
              level: input.level,
              subclass_name: '',
              subclass_catalog_id: null,
            },
          ]
        : []

  const out: ClassListPrepareSource[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const slug = resolveClassCasterSlug(row.name)
    if (!preparesFromFullClassList(slug) || !slug) continue
    const def = classCasterDef(slug)
    if (!def) continue
    const maxSpellLevel = maxSpellLevelForClassAlone(def.progression, row.level)
    if (maxSpellLevel <= 0) continue
    if (seen.has(slug)) {
      // Same class twice (unusual): keep the higher alone-max.
      const existing = out.find((item) => item.slug === slug)
      if (existing && maxSpellLevel > existing.maxSpellLevel) {
        existing.maxSpellLevel = maxSpellLevel
        existing.classLevel = Math.max(existing.classLevel, Math.floor(row.level))
      }
      continue
    }
    seen.add(slug)
    out.push({
      slug,
      labelRu: def.labelRu,
      classLevel: Math.floor(row.level),
      maxSpellLevel,
    })
  }

  return out
}

export function catalogEntryClasses(entry: CatalogEntry): string[] {
  const raw = entry.data?.classes
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : []
}

export function catalogEntryLevel(entry: CatalogEntry): number {
  const level = entry.data?.level
  return typeof level === 'number' && Number.isFinite(level)
    ? Math.max(0, Math.min(9, Math.floor(level)))
    : 0
}

/** Stable id for a class-list row that is not yet on the sheet. */
export function classListVirtualSpellId(catalogId: string): string {
  return `class-list:${catalogId}`
}

export function isClassListVirtualSpell(spell: { id: string }): boolean {
  return spell.id.startsWith('class-list:')
}

/**
 * Does this catalog spell belong to any of the character’s class-list prepare sources
 * at an allowed level?
 */
export function catalogSpellMatchesClassListSources(
  entry: CatalogEntry,
  sources: ClassListPrepareSource[],
): boolean {
  if (sources.length === 0) return false
  const level = catalogEntryLevel(entry)
  if (level <= 0) return false
  const classes = catalogEntryClasses(entry)
  return sources.some(
    (source) => classes.includes(source.slug) && level <= source.maxSpellLevel,
  )
}

/**
 * Merge sheet known leveled spells with catalog class-list spells (virtual, unprepared).
 * Known rows win when the same catalog_id is already on the sheet.
 */
export function mergeAvailableForPrepare(input: {
  known: PrepareListSpell[]
  catalog: CatalogEntry[]
  sources: ClassListPrepareSource[]
  sheetSpellFromCatalog: (entry: CatalogEntry) => PrepareListSpell
}): PrepareListSpell[] {
  const { known, catalog, sources, sheetSpellFromCatalog } = input
  const out: PrepareListSpell[] = []
  const seenCatalog = new Set<string>()

  for (const spell of known) {
    if (spell.level <= 0) continue
    out.push(spell)
    if (spell.catalog_id) seenCatalog.add(spell.catalog_id)
  }

  if (sources.length === 0) return out

  for (const entry of catalog) {
    if (seenCatalog.has(entry.id)) continue
    if (!catalogSpellMatchesClassListSources(entry, sources)) continue
    const virtual = sheetSpellFromCatalog(entry)
    out.push({
      ...virtual,
      id: classListVirtualSpellId(entry.id),
      prepared: false,
    })
    seenCatalog.add(entry.id)
  }

  return out
}

export function describeClassListSources(sources: ClassListPrepareSource[]): string {
  if (sources.length === 0) return ''
  return sources
    .map((source) => `${source.labelRu} 1–${source.maxSpellLevel}`)
    .join(', ')
}
