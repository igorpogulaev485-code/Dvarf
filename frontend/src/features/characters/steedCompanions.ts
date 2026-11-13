/**
 * C-03: Find Steed / Find Greater Steed — one permanent spirit-mount slot.
 */

import {
  createCompanion,
  isSteedCompanion,
  type CompanionEntry,
  type SteedSpiritType,
} from './companions'
import { mergeBestiaryPickIntoCompanion } from './bestiaryCompanionStats'
import type { BestiaryFormPick } from './wildShape'
import type { SheetSpell } from './spells'

export const FIND_STEED_SLUG = 'find_steed'
export const FIND_GREATER_STEED_SLUG = 'find_greater_steed'

export const FIND_STEED_OFFICIAL_SLUGS = [
  'warhorse',
  'pony',
  'camel',
  'elk',
  'mastiff',
] as const

export const FIND_GREATER_STEED_OFFICIAL_SLUGS = [
  'griffon',
  'pegasus',
  'peryton',
  'dire_wolf',
  'rhinoceros',
  'saber_toothed_tiger',
] as const

const STEED_FEATURES = new Set([
  'spell:find_steed',
  'spell:find_greater_steed',
  'find_steed',
  'find_greater_steed',
])

export function isFindSteedSpellSlug(slug: string | null | undefined): boolean {
  return slug === FIND_STEED_SLUG || slug === FIND_GREATER_STEED_SLUG
}

export function isFindSteedSpell(spell: Pick<SheetSpell, 'name'>): boolean {
  const key = spell.name
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
  return (
    key.includes('поиск скакуна') ||
    key.includes('поиск высшего скакуна') ||
    key.includes('find steed') ||
    key.includes('find greater steed')
  )
}

export function steedOfficialSlugs(slug: string): readonly string[] {
  return slug === FIND_GREATER_STEED_SLUG
    ? FIND_GREATER_STEED_OFFICIAL_SLUGS
    : FIND_STEED_OFFICIAL_SLUGS
}

export function findExistingSteed(
  companions: CompanionEntry[],
): CompanionEntry | undefined {
  return companions.find((row) => isSteedCompanion(row))
}

const SPIRIT_TYPE_RU: Record<SteedSpiritType, string> = {
  celestial: 'небожитель',
  fey: 'фея',
  fiend: 'исчадие',
}

/** Raise INT to at least 6 (steed spirit). */
export function applySteedIntFloor(
  companion: CompanionEntry,
  languageRu?: string,
): CompanionEntry {
  const intScore = companion.stats.int ?? 2
  const raised = Math.max(6, Math.floor(intScore))
  const lang = languageRu?.trim() || 'один язык хозяина'
  const telepathy = 'телепатия 1 миля'
  const typeNote = companion.steed_spirit_type
    ? `дух-${SPIRIT_TYPE_RU[companion.steed_spirit_type]}`
    : 'дух-скакун'
  const bits = [
    typeNote,
    `Интеллект ${raised}`,
    `понимает: ${lang}`,
    telepathy,
  ]
  const mark = bits.join(' · ')
  return {
    ...companion,
    stats: { ...companion.stats, int: raised },
    notes: companion.notes.includes('телепатия 1 миля')
      ? companion.notes
      : `${companion.notes}${companion.notes.trim() ? ' · ' : ''}${mark}`,
  }
}

export function applyFindSteedCompanion(input: {
  companions: CompanionEntry[]
  pick: BestiaryFormPick
  spell: SheetSpell | null
  slug: string
  spiritType: SteedSpiritType
  languageRu?: string
  slotLevel?: number
}): { companions: CompanionEntry[]; name: string; refreshed: boolean } {
  const feature = `spell:${input.slug}`
  const labelRu = `Заклинание: ${input.spell?.name || (input.slug === FIND_GREATER_STEED_SLUG ? 'Поиск высшего скакуна' : 'Поиск скакуна')}`
  const existing = findExistingSteed(input.companions)
  const source = {
    kind: 'spell' as const,
    labelRu,
    feature,
    spellId: input.spell?.id,
  }

  const base = createCompanion({
    id: existing?.id,
    kind: 'other',
    name: input.pick.name_ru,
    nature: 'summoned',
    active: true,
    initiativeMode: 'with_master',
    commandCost: 'bonus',
    source,
    steed_spirit_type: input.spiritType,
    mounted: existing?.mounted ?? false,
    notes: labelRu,
  })
  const withStats = mergeBestiaryPickIntoCompanion({
    companion: base,
    pick: input.pick,
  })
  const withFloor = applySteedIntFloor(
    {
      ...withStats,
      steed_spirit_type: input.spiritType,
      source,
      active: true,
      death: null,
      initiativeMode: 'with_master',
      commandCost: 'bonus',
      nature: 'summoned',
      mounted: existing?.mounted ?? false,
    },
    input.languageRu,
  )
  // Full heal on re-cast.
  const hpMax = withFloor.stats.hp_max
  const refreshed: CompanionEntry = {
    ...withFloor,
    stats: {
      ...withFloor.stats,
      hp: hpMax != null ? hpMax : withFloor.stats.hp,
      int: Math.max(6, withFloor.stats.int ?? 6),
    },
  }

  if (existing) {
    return {
      companions: input.companions.map((row) =>
        row.id === existing.id ? { ...refreshed, id: existing.id } : row,
      ),
      name: refreshed.name,
      refreshed: true,
    }
  }
  // Drop any duplicate steed features just in case.
  const withoutOld = input.companions.filter(
    (row) => !STEED_FEATURES.has((row.source?.feature ?? '').toLowerCase()),
  )
  return {
    companions: [...withoutOld, refreshed],
    name: refreshed.name,
    refreshed: false,
  }
}
