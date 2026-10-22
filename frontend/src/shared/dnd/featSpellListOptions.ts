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

/** Pact of the Tome: cantrips from any full caster class list (PHB/XGE tags). */
export const PACT_TOME_CANTRIP_CLASS_LISTS = [
  'artificer',
  'bard',
  'cleric',
  'druid',
  'sorcerer',
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
  /**
   * When true, any class slug is allowed (Pact of the Tome).
   * Default false keeps Magic Initiate allowlist.
   */
  anyClassList?: boolean
}): FeatSpellListOption[] {
  const classKey = input.classSlug.trim().toLowerCase()
  if (!classKey) return []
  if (!input.anyClassList && !isFeatClassSpellList(classKey)) return []
  const level = Math.max(0, Math.min(9, Math.floor(input.level)))
  const out: FeatSpellListOption[] = []
  for (const row of input.spells) {
    const slug = row.slug?.trim()
    if (!slug) continue
    const parsed = parseSpellCatalogData(row.data)
    if (parsed.level !== level) continue
    if (input.ritualOnly && !parsed.ritual) continue
    // Feat picks use the class list only — subclass-gated spells (EGW dunamancy)
    // stay out unless the DM later grants them outside this picker.
    if (parsed.subclasses.some((ref) => ref.class.trim().toLowerCase() === classKey)) {
      continue
    }
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
  anyClassList?: boolean
}): FeatSpellListOption[] {
  const byId = new Map<string, FeatSpellListOption>()
  for (const classSlug of input.classSlugs) {
    for (const opt of spellOptionsForClassList({
      spells: input.spells,
      classSlug,
      level: input.level,
      ritualOnly: input.ritualOnly,
      anyClassList: input.anyClassList,
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

/** Pact of the Tome: union of cantrips from every class list. */
export function spellOptionsForPactTomeCantrips(input: {
  spells: FeatSpellCatalogRow[]
}): FeatSpellListOption[] {
  return spellOptionsForClassLists({
    spells: input.spells,
    classSlugs: [...PACT_TOME_CANTRIP_CLASS_LISTS],
    level: 0,
    anyClassList: true,
  })
}
