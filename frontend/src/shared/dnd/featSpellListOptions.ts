/**
 * Build spell_one options from the live spell catalog (Magic Initiate, Ritual Caster).
 * Avoids rotting hardcoded PHB subsets in feat JSON.
 */

import { parseSpellCatalogData } from './spellCatalog'

export type FeatSpellListOption = {
  id: string
  label_ru: string
  level?: number
  lists?: string[]
}

export type FeatSpellCatalogRow = {
  slug: string
  name_ru: string
  data: Record<string, unknown>
}

/** Class lists Magic Initiate / Ritual Caster may pick from. */
export const FEAT_CLASS_SPELL_LISTS = [
  'bard',
  'cleric',
  'druid',
  'warlock',
  'wizard',
] as const

export type FeatClassSpellList = (typeof FEAT_CLASS_SPELL_LISTS)[number]

export function isFeatClassSpellList(value: string): value is FeatClassSpellList {
  return (FEAT_CLASS_SPELL_LISTS as readonly string[]).includes(value)
}

/**
 * Options for one class + spell level (+ optional ritual-only).
 * Sorted by Russian name; id = catalog slug.
 */
export function spellOptionsForClassList(input: {
  spells: FeatSpellCatalogRow[]
  classSlug: string
  level: number
  ritualOnly?: boolean
}): FeatSpellListOption[] {
  const classKey = input.classSlug.trim().toLowerCase()
  if (!classKey || !isFeatClassSpellList(classKey)) return []
  const level = Math.max(0, Math.min(9, Math.floor(input.level)))
  const out: FeatSpellListOption[] = []
  for (const row of input.spells) {
    const slug = row.slug?.trim()
    if (!slug) continue
    const parsed = parseSpellCatalogData(row.data)
    if (parsed.level !== level) continue
    if (input.ritualOnly && !parsed.ritual) continue
    const classes = parsed.classes.map((c) => c.trim().toLowerCase())
    if (!classes.includes(classKey)) continue
    out.push({
      id: slug,
      label_ru: row.name_ru?.trim() || slug,
      level: parsed.level,
      lists: [classKey],
    })
  }
  out.sort((a, b) => a.label_ru.localeCompare(b.label_ru, 'ru'))
  return out
}

/** All options across allowed lists (for selfcheck / bulk). */
export function spellOptionsForClassLists(input: {
  spells: FeatSpellCatalogRow[]
  classSlugs: string[]
  level: number
  ritualOnly?: boolean
}): FeatSpellListOption[] {
  const byId = new Map<string, FeatSpellListOption>()
  for (const classSlug of input.classSlugs) {
    for (const opt of spellOptionsForClassList({
      spells: input.spells,
      classSlug,
      level: input.level,
      ritualOnly: input.ritualOnly,
    })) {
      const prev = byId.get(opt.id)
      if (!prev) {
        byId.set(opt.id, opt)
        continue
      }
      const lists = new Set([...(prev.lists ?? []), ...(opt.lists ?? [])])
      byId.set(opt.id, { ...prev, lists: [...lists] })
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.label_ru.localeCompare(b.label_ru, 'ru'),
  )
}
