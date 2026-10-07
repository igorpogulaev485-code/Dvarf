/** 2014 PHB spell-slot / prepare tables — digital sheet (incl. multiclass caster level). */

import type { ClassLevelEntry } from './classLevels'
import {
  clampPactSlots,
  clampSlot,
  type PactSlotState,
  type SpellSlotState,
  type SpellcastingAbility,
} from './spells'

export type CasterProgression = 'full' | 'half' | 'half_up' | 'pact' | 'none'

export type ClassCasterDef = {
  slug: string
  labelRu: string
  progression: CasterProgression
  ability: SpellcastingAbility | null
  /** Prepared casters: mod + level or mod + floor(level/2). Known casters: null. */
  prepare: 'mod+level' | 'mod+half' | null
}

export type SpellcastingSuggestion = {
  slug: string
  labelRu: string
  progression: CasterProgression
  casting_ability: SpellcastingAbility | null
  max_prepared: number | null
  slots: Record<string, SpellSlotState>
  pact_slots: PactSlotState | null
}

/** PHB full-caster slots by class level 1–20: counts for spell levels 1–9. */
const FULL_CASTER_SLOTS: number[][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

const CLASS_DEFS: ClassCasterDef[] = [
  { slug: 'artificer', labelRu: 'Изобретатель', progression: 'half_up', ability: 'int', prepare: 'mod+half' },
  { slug: 'barbarian', labelRu: 'Варвар', progression: 'none', ability: null, prepare: null },
  { slug: 'bard', labelRu: 'Бард', progression: 'full', ability: 'cha', prepare: null },
  { slug: 'cleric', labelRu: 'Жрец', progression: 'full', ability: 'wis', prepare: 'mod+level' },
  { slug: 'druid', labelRu: 'Друид', progression: 'full', ability: 'wis', prepare: 'mod+level' },
  { slug: 'fighter', labelRu: 'Воин', progression: 'none', ability: null, prepare: null },
  { slug: 'monk', labelRu: 'Монах', progression: 'none', ability: null, prepare: null },
  { slug: 'paladin', labelRu: 'Паладин', progression: 'half', ability: 'cha', prepare: 'mod+half' },
  { slug: 'ranger', labelRu: 'Следопыт', progression: 'half', ability: 'wis', prepare: null },
  { slug: 'rogue', labelRu: 'Плут', progression: 'none', ability: null, prepare: null },
  { slug: 'sorcerer', labelRu: 'Чародей', progression: 'full', ability: 'cha', prepare: null },
  { slug: 'warlock', labelRu: 'Колдун', progression: 'pact', ability: 'cha', prepare: null },
  { slug: 'wizard', labelRu: 'Волшебник', progression: 'full', ability: 'int', prepare: 'mod+level' },
]

const NAME_TO_SLUG: Record<string, string> = {}
for (const def of CLASS_DEFS) {
  NAME_TO_SLUG[def.slug] = def.slug
  NAME_TO_SLUG[def.labelRu.toLowerCase()] = def.slug
}

NAME_TO_SLUG['колдунья'] = 'warlock'
NAME_TO_SLUG['варлок'] = 'warlock'
NAME_TO_SLUG['маг'] = 'wizard'
NAME_TO_SLUG['жрица'] = 'cleric'
NAME_TO_SLUG['друидка'] = 'druid'
NAME_TO_SLUG['артифицер'] = 'artificer'
NAME_TO_SLUG['инженер'] = 'artificer'

function clampLevel(level: number): number {
  return Math.min(20, Math.max(1, Math.floor(level) || 1))
}

function emptySlots(): Record<string, SpellSlotState> {
  return Object.fromEntries(
    Array.from({ length: 9 }, (_, i) => [String(i + 1), { max: 0, used: 0 }]),
  )
}

function slotsFromRow(row: number[] | null): Record<string, SpellSlotState> {
  const slots = emptySlots()
  if (!row) return slots
  for (let level = 1; level <= 9; level += 1) {
    slots[String(level)] = clampSlot({ max: row[level - 1] ?? 0, used: 0 })
  }
  return slots
}

function fullCasterRow(level: number): number[] | null {
  if (level < 1) return null
  return FULL_CASTER_SLOTS[clampLevel(level) - 1] ?? null
}

/** Paladin/ranger: no slots at 1; otherwise full-caster table at ceil(level / 2). */
function halfCasterRow(level: number): number[] | null {
  const lv = clampLevel(level)
  if (lv < 2) return null
  return fullCasterRow(Math.ceil(lv / 2))
}

/** Artificer (Tasha): half caster rounded up, slots from level 1. */
function halfUpCasterRow(level: number): number[] | null {
  const lv = clampLevel(level)
  return fullCasterRow(Math.ceil(lv / 2))
}

export function warlockPactForLevel(level: number): PactSlotState {
  const lv = clampLevel(level)
  let max = 1
  if (lv >= 2) max = 2
  if (lv >= 11) max = 3
  if (lv >= 17) max = 4
  let slotLevel = 1
  if (lv >= 3) slotLevel = 2
  if (lv >= 5) slotLevel = 3
  if (lv >= 7) slotLevel = 4
  if (lv >= 9) slotLevel = 5
  return clampPactSlots({ max, used: 0, level: slotLevel })
}

export function resolveClassCasterSlug(className: string): string | null {
  const key = className.trim().toLowerCase()
  if (!key) return null
  return NAME_TO_SLUG[key] ?? null
}

/**
 * Subclass free-text → ⅓-caster Spellcasting feature (PHB 2014).
 * Matched against `ClassLevelEntry.subclass_name` (RU/EN aliases).
 * Only entries that actually grant the Spellcasting class feature.
 */
type SubclassCasterUnlock = {
  /** Parent class slug(s) this archetype belongs to. */
  classSlugs: string[]
  /** Minimum class level when Spellcasting appears. */
  minLevel: number
  /** Normalized name fragments (lowercase). */
  aliases: string[]
}

const SUBCLASS_SPELLCASTING: SubclassCasterUnlock[] = [
  {
    classSlugs: ['fighter'],
    minLevel: 3,
    aliases: [
      'eldritch knight',
      'мистический рыцарь',
      'эльдрический рыцарь',
      'рыцарь-колдун',
    ],
  },
  {
    classSlugs: ['rogue'],
    minLevel: 3,
    aliases: [
      'arcane trickster',
      'мистический ловкач',
      'мистический плут',
      'арканный плут',
      'чародейский плут',
    ],
  },
]

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** True when free-text subclass name matches a known spellcasting archetype. */
export function subclassGrantsSpellcasting(input: {
  classSlug: string | null
  subclassName: string
  classLevel: number
}): boolean {
  if (!input.classSlug) return false
  const lv = Math.max(0, Math.floor(input.classLevel))
  const name = normalizeName(input.subclassName)
  if (!name) return false
  for (const row of SUBCLASS_SPELLCASTING) {
    if (!row.classSlugs.includes(input.classSlug)) continue
    if (lv < row.minLevel) continue
    if (row.aliases.some((alias) => name.includes(alias) || alias.includes(name))) {
      return true
    }
  }
  return false
}

/**
 * True when this single class row currently has Spellcasting or Pact Magic.
 * Order: base class feature (with level gate) → subclass unlock.
 */
export function classRowHasSpellcastingFeature(row: ClassLevelEntry): boolean {
  const lv = Math.max(0, Math.floor(row.level))
  if (lv <= 0) return false
  const slug = resolveClassCasterSlug(row.name)
  const def = classCasterDef(slug)
  if (def) {
    if (def.progression === 'full' || def.progression === 'pact' || def.progression === 'half_up') {
      return true
    }
    // Paladin / ranger: Spellcasting feature from level 2.
    if (def.progression === 'half' && lv >= 2) return true
  }
  return subclassGrantsSpellcasting({
    classSlug: slug,
    subclassName: row.subclass_name,
    classLevel: lv,
  })
}

/**
 * True if any class (including multiclass / archetype) grants Spellcasting or Pact Magic.
 * Used for dragonmark «Spells of the Mark» list expansion.
 *
 * Cases covered:
 * - wizard 1 → yes
 * - paladin 1 → no; paladin 2 → yes
 * - fighter 5 → no; fighter 3 Eldritch Knight → yes
 * - fighter 3 + wizard 1 multiclass → yes
 */
export function characterHasCasterClass(classes: ClassLevelEntry[]): boolean {
  return classes.some((row) => classRowHasSpellcastingFeature(row))
}

export function classCasterDef(slug: string | null): ClassCasterDef | null {
  if (!slug) return null
  return CLASS_DEFS.find((item) => item.slug === slug) ?? null
}

export function prepareLimitFromClass(input: {
  prepare: ClassCasterDef['prepare']
  level: number
  abilityMod: number
  progression?: CasterProgression
}): number | null {
  if (!input.prepare) return null
  const lv = clampLevel(input.level)
  // Paladin/ranger get spellcasting at 2; artificer (half_up) prepares from 1.
  if (
    input.prepare === 'mod+half' &&
    lv < 2 &&
    input.progression !== 'half_up'
  ) {
    return 0
  }
  const classPart = input.prepare === 'mod+half' ? Math.floor(lv / 2) : lv
  return Math.max(1, Math.floor(input.abilityMod) + classPart)
}

/** PHB multiclass spellcaster level (warlock pact is separate). */
export function multiclassCasterLevel(classes: ClassLevelEntry[]): number {
  let total = 0
  for (const row of classes) {
    const def = classCasterDef(resolveClassCasterSlug(row.name))
    if (!def) continue
    const lv = Math.max(0, Math.floor(row.level))
    if (def.progression === 'full') total += lv
    else if (def.progression === 'half') total += Math.floor(lv / 2)
    else if (def.progression === 'half_up') total += Math.ceil(lv / 2)
  }
  return Math.min(20, Math.max(0, total))
}

export function warlockLevels(classes: ClassLevelEntry[]): number {
  return classes.reduce((acc, row) => {
    const slug = resolveClassCasterSlug(row.name)
    return slug === 'warlock' ? acc + Math.max(0, Math.floor(row.level)) : acc
  }, 0)
}

export function suggestSpellcasting(input: {
  className: string
  level: number
  abilityModFor: (ability: SpellcastingAbility) => number
  classes?: ClassLevelEntry[]
}): SpellcastingSuggestion | null {
  if (input.classes && input.classes.length > 0) {
    return suggestSpellcastingFromClasses({
      classes: input.classes,
      abilityModFor: input.abilityModFor,
    })
  }

  const slug = resolveClassCasterSlug(input.className)
  const def = classCasterDef(slug)
  if (!def) return null

  const level = clampLevel(input.level)
  let slots = emptySlots()
  let pact_slots: PactSlotState | null = null

  if (def.progression === 'full') {
    slots = slotsFromRow(fullCasterRow(level))
  } else if (def.progression === 'half') {
    slots = slotsFromRow(halfCasterRow(level))
  } else if (def.progression === 'half_up') {
    slots = slotsFromRow(halfUpCasterRow(level))
  } else if (def.progression === 'pact') {
    pact_slots = warlockPactForLevel(level)
  }

  const abilityMod = def.ability ? input.abilityModFor(def.ability) : 0
  const max_prepared = prepareLimitFromClass({
    prepare: def.prepare,
    level,
    abilityMod,
    progression: def.progression,
  })

  return {
    slug: def.slug,
    labelRu: def.labelRu,
    progression: def.progression,
    casting_ability: def.ability,
    max_prepared,
    slots,
    pact_slots,
  }
}

export function suggestSpellcastingFromClasses(input: {
  classes: ClassLevelEntry[]
  abilityModFor: (ability: SpellcastingAbility) => number
}): SpellcastingSuggestion | null {
  const classes = input.classes.filter((row) => row.name.trim() && row.level > 0)
  if (classes.length === 0) return null

  const casterLvl = multiclassCasterLevel(classes)
  const warlockLvl = warlockLevels(classes)
  const slots =
    casterLvl > 0 ? slotsFromRow(fullCasterRow(casterLvl)) : emptySlots()
  const pact_slots = warlockLvl > 0 ? warlockPactForLevel(warlockLvl) : null

  let casting_ability: SpellcastingAbility | null = null
  let max_prepared: number | null = null
  let labelRu = classes.map((row) => row.name.trim()).join(' / ')
  let slug = resolveClassCasterSlug(classes[0]?.name ?? '') ?? 'multiclass'
  let progression: CasterProgression = 'none'

  if (casterLvl > 0) progression = 'full'
  else if (warlockLvl > 0) progression = 'pact'

  for (const row of classes) {
    const def = classCasterDef(resolveClassCasterSlug(row.name))
    if (!def?.ability) continue
    if (!casting_ability) {
      casting_ability = def.ability
      slug = def.slug
      labelRu = def.labelRu
    }
    if (def.prepare) {
      const abilityMod = input.abilityModFor(def.ability)
      const prep = prepareLimitFromClass({
        prepare: def.prepare,
        level: row.level,
        abilityMod,
        progression: def.progression,
      })
      if (prep != null) {
        max_prepared = (max_prepared ?? 0) + prep
      }
    }
  }

  if (casterLvl <= 0 && warlockLvl <= 0 && !classes.some((row) => classCasterDef(resolveClassCasterSlug(row.name)))) {
    return null
  }

  return {
    slug,
    labelRu: classes.length > 1 ? `Мультикласс (${casterLvl || '—'}/${warlockLvl || '—'})` : labelRu,
    progression,
    casting_ability,
    max_prepared,
    slots,
    pact_slots,
  }
}

export function applySpellcastingSuggestion(
  current: {
    slots: Record<string, SpellSlotState>
    pact_slots: PactSlotState | null
    casting_ability: SpellcastingAbility | null
    max_prepared: number | null
  },
  suggestion: SpellcastingSuggestion,
): {
  slots: Record<string, SpellSlotState>
  pact_slots: PactSlotState | null
  casting_ability: SpellcastingAbility | null
  max_prepared: number | null
} {
  const slots: Record<string, SpellSlotState> = {}
  for (let level = 1; level <= 9; level += 1) {
    const key = String(level)
    const max = suggestion.slots[key]?.max ?? 0
    const used = current.slots[key]?.used ?? 0
    slots[key] = clampSlot({ max, used })
  }

  let pact_slots: PactSlotState | null = null
  if (suggestion.pact_slots) {
    const used = current.pact_slots?.used ?? 0
    pact_slots = clampPactSlots({
      ...suggestion.pact_slots,
      used,
    })
  }

  return {
    slots,
    pact_slots,
    casting_ability: suggestion.casting_ability,
    max_prepared: suggestion.max_prepared,
  }
}
