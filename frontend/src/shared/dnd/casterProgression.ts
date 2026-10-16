/** 2014 PHB spell-slot / prepare tables — digital sheet (incl. multiclass caster level). */

import type { ClassLevelEntry } from './classLevels'
import {
  localFeaturePack,
  resolveClassFeatureSlug,
  resolveSubclassFeatureSlug,
} from './classFeatures'
import {
  clampPactSlots,
  clampSlot,
  type PactSlotState,
  type SpellSlotState,
  type SpellcastingAbility,
} from './spells'

export type CasterProgression = 'full' | 'half' | 'half_up' | 'third' | 'pact' | 'none'

/** Subclass overlays that unlock caster math (EK / Arcane Trickster). */
export type SubclassCasterOverlay = {
  classEntryId: string
  progression: 'third'
  ability: SpellcastingAbility | null
}

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

/**
 * Eldritch Knight / Arcane Trickster slot table by class level (PHB).
 * Levels 1–2: no slots (subclass not yet chosen).
 */
const THIRD_CASTER_SLOTS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
]

function thirdCasterRow(level: number): number[] | null {
  const lv = clampLevel(level)
  const row = THIRD_CASTER_SLOTS[lv - 1]
  if (!row || row.every((n) => n === 0)) return null
  return row
}

function overlayForClass(
  overlays: SubclassCasterOverlay[] | undefined,
  classEntryId: string,
): SubclassCasterOverlay | undefined {
  return overlays?.find((row) => row.classEntryId === classEntryId)
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
 * Subclass → Spellcasting unlock.
 * Prefer catalog/feature-pack slug (`spellcasting_*` feature at unlocked level).
 * Free-text aliases remain a temporary bridge for homebrew / unmatched names.
 */
type SubclassCasterUnlock = {
  classSlugs: string[]
  minLevel: number
  aliases: string[]
}

/** Fallback only when slug/feature pack cannot resolve the archetype. */
const SUBCLASS_SPELLCASTING_ALIASES: SubclassCasterUnlock[] = [
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

function subclassFeatureGrantsSpellcasting(input: {
  classSlug: string
  subclassSlug: string
  classLevel: number
}): boolean {
  const pack = localFeaturePack(input.classSlug)
  const features = pack?.subclasses[input.subclassSlug]
  if (!features?.length) return false
  const lv = Math.max(0, Math.floor(input.classLevel))
  return features.some(
    (feature) =>
      feature.level <= lv &&
      (feature.id.startsWith('spellcasting') ||
        feature.name_en?.toLowerCase() === 'spellcasting'),
  )
}

/** True when subclass (slug or free-text) grants Spellcasting at this class level. */
export function subclassGrantsSpellcasting(input: {
  classSlug: string | null
  subclassName: string
  classLevel: number
  /** Catalog / grant slug when known — preferred over free-text. */
  subclassSlug?: string | null
}): boolean {
  if (!input.classSlug) return false
  const lv = Math.max(0, Math.floor(input.classLevel))
  if (lv <= 0) return false

  const subclassSlug =
    input.subclassSlug?.trim() ||
    resolveSubclassFeatureSlug(input.subclassName) ||
    null

  if (subclassSlug) {
    // Prefer feature-pack class slug (same maps as unlockFeaturesForClasses).
    const featureClassSlug =
      resolveClassFeatureSlug(input.classSlug) ?? input.classSlug
    if (
      subclassFeatureGrantsSpellcasting({
        classSlug: featureClassSlug,
        subclassSlug,
        classLevel: lv,
      })
    ) {
      return true
    }
  }

  const name = normalizeName(input.subclassName)
  if (!name) return false
  for (const row of SUBCLASS_SPELLCASTING_ALIASES) {
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
export function multiclassCasterLevel(
  classes: ClassLevelEntry[],
  subclassCasters?: SubclassCasterOverlay[],
): number {
  const overlays = resolveSubclassCasterOverlays(classes, subclassCasters ?? [])
  let total = 0
  for (const row of classes) {
    const lv = Math.max(0, Math.floor(row.level))
    const overlay = overlayForClass(overlays, row.id)
    if (overlay?.progression === 'third') {
      total += Math.floor(lv / 3)
      continue
    }
    const def = classCasterDef(resolveClassCasterSlug(row.name))
    if (!def) continue
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
  subclassCasters?: SubclassCasterOverlay[]
}): SpellcastingSuggestion | null {
  if (input.classes && input.classes.length > 0) {
    return suggestSpellcastingFromClasses({
      classes: input.classes,
      abilityModFor: input.abilityModFor,
      subclassCasters: input.subclassCasters,
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

/**
 * Classes that contribute Spellcasting slots (not Pact Magic).
 * PHB: if exactly one such class, use that class's slot table — even with warlock levels.
 */
type SlotContributor =
  | {
      kind: 'base'
      row: ClassLevelEntry
      def: ClassCasterDef
    }
  | {
      kind: 'third'
      row: ClassLevelEntry
      ability: SpellcastingAbility | null
    }

/**
 * Merge catalog third-caster grants with inferred EK / Arcane Trickster from
 * subclass name / feature-pack slug (so free-text archetypes still get slots).
 */
export function resolveSubclassCasterOverlays(
  classes: ClassLevelEntry[],
  fromGrants: SubclassCasterOverlay[] = [],
): SubclassCasterOverlay[] {
  const byId = new Map<string, SubclassCasterOverlay>()
  for (const row of fromGrants) {
    if (row.progression === 'third') byId.set(row.classEntryId, row)
  }
  for (const row of classes) {
    if (byId.has(row.id)) continue
    const classSlug = resolveClassCasterSlug(row.name)
    if (!classSlug) continue
    const def = classCasterDef(classSlug)
    // Only non-caster bases unlock ⅓ tables (fighter EK / rogue AT).
    if (!def || def.progression !== 'none') continue
    const lv = Math.max(0, Math.floor(row.level))
    if (lv < 3) continue
    if (
      !subclassGrantsSpellcasting({
        classSlug,
        subclassName: row.subclass_name,
        classLevel: lv,
        subclassSlug: resolveSubclassFeatureSlug(row.subclass_name),
      })
    ) {
      continue
    }
    byId.set(row.id, {
      classEntryId: row.id,
      progression: 'third',
      ability: 'int',
    })
  }
  return [...byId.values()]
}

function slotContributors(
  classes: ClassLevelEntry[],
  overlays: SubclassCasterOverlay[],
): SlotContributor[] {
  const out: SlotContributor[] = []
  for (const row of classes) {
    const overlay = overlayForClass(overlays, row.id)
    if (overlay?.progression === 'third') {
      out.push({ kind: 'third', row, ability: overlay.ability })
      continue
    }
    const def = classCasterDef(resolveClassCasterSlug(row.name))
    if (!def) continue
    const lv = Math.max(0, Math.floor(row.level))
    // Paladin/ranger Spellcasting starts at 2 (PHB); L1 must not count as a slot source.
    if (def.progression === 'half' && lv < 2) continue
    if (
      def.progression === 'full' ||
      def.progression === 'half' ||
      def.progression === 'half_up'
    ) {
      out.push({ kind: 'base', row, def })
    }
  }
  return out
}

export function suggestSpellcastingFromClasses(input: {
  classes: ClassLevelEntry[]
  abilityModFor: (ability: SpellcastingAbility) => number
  subclassCasters?: SubclassCasterOverlay[]
}): SpellcastingSuggestion | null {
  const classes = input.classes.filter((row) => row.name.trim() && row.level > 0)
  if (classes.length === 0) return null

  const overlays = resolveSubclassCasterOverlays(classes, input.subclassCasters ?? [])
  const warlockLvl = warlockLevels(classes)
  const contributors = slotContributors(classes, overlays)
  const pact_slots = warlockLvl > 0 ? warlockPactForLevel(warlockLvl) : null

  // Exactly one Spellcasting source → class/subclass table (not MC floor formula).
  // Warlock may coexist: pact is separate and does not force the multiclass slot table.
  if (contributors.length === 1) {
    const only = contributors[0]
    if (only.kind === 'third') {
      const level = clampLevel(only.row.level)
      return {
        slug: resolveClassCasterSlug(only.row.name) ?? 'third',
        labelRu: `${only.row.name.trim()} (⅓ заклинатель)`,
        progression: 'third',
        casting_ability: only.ability,
        max_prepared: null,
        slots: slotsFromRow(thirdCasterRow(level)),
        pact_slots,
      }
    }

    const level = clampLevel(only.row.level)
    let slots = emptySlots()
    if (only.def.progression === 'full') {
      slots = slotsFromRow(fullCasterRow(level))
    } else if (only.def.progression === 'half') {
      slots = slotsFromRow(halfCasterRow(level))
    } else if (only.def.progression === 'half_up') {
      slots = slotsFromRow(halfUpCasterRow(level))
    }

    const abilityMod = only.def.ability ? input.abilityModFor(only.def.ability) : 0
    const max_prepared = prepareLimitFromClass({
      prepare: only.def.prepare,
      level,
      abilityMod,
      progression: only.def.progression,
    })

    return {
      slug: only.def.slug,
      labelRu:
        warlockLvl > 0 && classes.length > 1
          ? `${only.def.labelRu} + pact`
          : only.def.labelRu,
      progression: only.def.progression,
      casting_ability: only.def.ability,
      max_prepared,
      slots,
      pact_slots,
    }
  }

  const casterLvl = multiclassCasterLevel(classes, overlays)
  const slots =
    casterLvl > 0 ? slotsFromRow(fullCasterRow(casterLvl)) : emptySlots()

  let casting_ability: SpellcastingAbility | null = null
  let max_prepared: number | null = null
  let labelRu = classes.map((row) => row.name.trim()).join(' / ')
  let slug = resolveClassCasterSlug(classes[0]?.name ?? '') ?? 'multiclass'
  let progression: CasterProgression = 'none'

  if (casterLvl > 0) progression = 'full'
  else if (warlockLvl > 0) progression = 'pact'

  for (const row of classes) {
    const overlay = overlayForClass(overlays, row.id)
    if (overlay?.ability && !casting_ability) {
      casting_ability = overlay.ability
      slug = resolveClassCasterSlug(row.name) ?? slug
      labelRu = `${row.name.trim()} (⅓)`
    }
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

  const hasClassDef = classes.some((row) =>
    classCasterDef(resolveClassCasterSlug(row.name)),
  )
  const hasThird = overlays.some((row) => row.progression === 'third')
  if (casterLvl <= 0 && warlockLvl <= 0 && !hasClassDef && !hasThird) {
    return null
  }

  return {
    slug,
    labelRu:
      classes.length > 1 || contributors.length > 1
        ? `Мультикласс (${casterLvl || '—'}/${warlockLvl || '—'})`
        : labelRu,
    progression,
    casting_ability,
    max_prepared,
    slots,
    pact_slots,
  }
}

/** Highest spell level with at least one slot (or pact slot level). 0 = none. */
export function highestSpellSlotLevel(
  slots: Record<string, SpellSlotState>,
  pactSlots?: PactSlotState | null,
): number {
  let hi = 0
  for (let level = 1; level <= 9; level += 1) {
    if ((slots[String(level)]?.max ?? 0) > 0) hi = level
  }
  if (pactSlots && (pactSlots.max ?? 0) > 0) {
    hi = Math.max(hi, Math.max(1, Math.floor(pactSlots.level) || 1))
  }
  return hi
}

/**
 * Class spell-list slugs this character may learn from (union for multiclass).
 * Third-casters (EK / Arcane Trickster) use the wizard list.
 */
export function characterSpellListSlugs(
  classes: ClassLevelEntry[],
  subclassCasters?: SubclassCasterOverlay[],
): string[] {
  const out = new Set<string>()
  const overlays = resolveSubclassCasterOverlays(classes, subclassCasters ?? [])
  for (const row of classes) {
    if (!row.name.trim() || row.level <= 0) continue
    const slug = resolveClassCasterSlug(row.name)
    const def = classCasterDef(slug)
    if (def && def.progression !== 'none') {
      out.add(def.slug)
    }
    const overlay = overlays.find((item) => item.classEntryId === row.id)
    if (overlay?.progression === 'third') {
      out.add('wizard')
    }
  }
  return [...out]
}

/**
 * School gate for ⅓ casters who only have the wizard list via archetype
 * (no wizard levels). Cantrips stay unrestricted; leveled spells must match.
 * Returns null when no school gate applies.
 */
export function thirdCasterSchoolGate(
  classes: ClassLevelEntry[],
  subclassCasters?: SubclassCasterOverlay[],
): string[] | null {
  const hasWizardLevels = classes.some(
    (row) => resolveClassCasterSlug(row.name) === 'wizard' && row.level > 0,
  )
  if (hasWizardLevels) return null

  const overlays = resolveSubclassCasterOverlays(classes, subclassCasters ?? [])
  const schools = new Set<string>()
  for (const row of classes) {
    const overlay = overlays.find((item) => item.classEntryId === row.id)
    if (!overlay || overlay.progression !== 'third') continue
    const classSlug = resolveClassCasterSlug(row.name)
    const sub =
      resolveSubclassFeatureSlug(row.subclass_name)?.toLowerCase() ??
      normalizeName(row.subclass_name)
    if (classSlug === 'fighter' || sub.includes('eldritch') || sub.includes('рыцар')) {
      schools.add('abjuration')
      schools.add('evocation')
    } else if (
      classSlug === 'rogue' ||
      sub.includes('trickster') ||
      sub.includes('ловкач') ||
      sub.includes('плут')
    ) {
      schools.add('enchantment')
      schools.add('illusion')
    }
  }
  return schools.size ? [...schools] : null
}

/**
 * How the class learns spells (PHB 2014).
 * - known: pick a limited list; always ready (bard / sorcerer / warlock / ranger).
 * - prepared_list: whole class list available; pick cantrips + prepare up to cap
 *   (cleric / druid / paladin / artificer).
 * - spellbook: copy into the book (limited), then prepare from the book (wizard).
 */
export type SpellLearnMode = 'known' | 'prepared_list' | 'spellbook'

export type SpellLearnBudget = {
  mode: SpellLearnMode
  slug: string
  labelRu: string
  /** Cantrips the player may choose (excludes locked racial/feat grants). */
  cantrips: number
  /**
   * Max leveled spells on the known list / in the spellbook.
   * null = no learn cap (full class list — only prepare matters).
   */
  leveledKnown: number | null
  maxPrepared: number | null
}

/** PHB cantrips known by class level (index 0 = level 1). */
const CANTRIPS_BY_LEVEL: Record<string, number[]> = {
  wizard: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  cleric: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  druid: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  bard: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  sorcerer: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  warlock: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  artificer: [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4],
  // PHB ranger / paladin: no cantrips.
  ranger: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  paladin: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
}

/** PHB spells known (leveled) by class level — known casters only. */
const SPELLS_KNOWN_BY_LEVEL: Record<string, number[]> = {
  bard: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
  sorcerer: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  // Ranger spellcasting starts at 2.
  ranger: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
}

function tableAtLevel(table: number[] | undefined, level: number): number {
  if (!table || table.length === 0) return 0
  return table[clampLevel(level) - 1] ?? table[table.length - 1] ?? 0
}

/** Wizard spellbook: 6 at 1st, +2 each level after. */
export function wizardSpellbookLeveledCap(wizardLevel: number): number {
  const lv = clampLevel(wizardLevel)
  return 6 + 2 * (lv - 1)
}

export function spellLearnModeForSlug(slug: string | null): SpellLearnMode | null {
  if (!slug) return null
  if (slug === 'wizard') return 'spellbook'
  const def = classCasterDef(slug)
  if (!def || def.progression === 'none') return null
  if (def.prepare) return 'prepared_list'
  return 'known'
}

/**
 * Learn / prepare budget for create + grimoire.
 * Single-class uses that class’s PHB table; multiclass prefers the first
 * contributing caster for mode/cantrips/book size, and suggestion for prepare cap.
 */
export function resolveSpellLearnBudget(input: {
  classes: ClassLevelEntry[]
  abilityModFor: (ability: SpellcastingAbility) => number
  subclassCasters?: SubclassCasterOverlay[]
}): SpellLearnBudget | null {
  const suggestion = suggestSpellcastingFromClasses(input)
  if (!suggestion) return null

  const classes = input.classes.filter((row) => row.name.trim() && row.level > 0)
  const casterRows = classes
    .map((row) => ({
      row,
      slug: resolveClassCasterSlug(row.name),
      def: classCasterDef(resolveClassCasterSlug(row.name)),
    }))
    .filter((item) => item.def && item.def.progression !== 'none')

  // Prefer an explicit class slug from the suggestion when it is a real class.
  let focus =
    casterRows.find((item) => item.slug === suggestion.slug) ?? casterRows[0] ?? null

  // Pure third-caster (EK/AT) → treat like known (wizard list, no prepare).
  if (!focus) {
    const overlays = resolveSubclassCasterOverlays(
      classes,
      input.subclassCasters ?? [],
    )
    if (overlays.some((row) => row.progression === 'third')) {
      const host = classes.find((row) =>
        overlays.some((item) => item.classEntryId === row.id),
      )
      const level = clampLevel(host?.level ?? 1)
      // EK/AT: 2 cantrips at 3, then grow slowly — approximate with warlock-ish 2–3.
      const cantrips = level >= 10 ? 3 : level >= 3 ? 2 : 0
      const known = level >= 3 ? Math.max(0, Math.floor((level - 1) / 2)) : 0
      return {
        mode: 'known',
        slug: suggestion.slug,
        labelRu: suggestion.labelRu,
        cantrips,
        leveledKnown: known,
        maxPrepared: null,
      }
    }
    return null
  }

  const slug = focus.slug ?? suggestion.slug
  const level = clampLevel(focus.row.level)
  const mode = spellLearnModeForSlug(slug) ?? 'known'
  const cantrips = tableAtLevel(CANTRIPS_BY_LEVEL[slug], level)
  let leveledKnown: number | null = null
  if (mode === 'spellbook') {
    leveledKnown = wizardSpellbookLeveledCap(level)
  } else if (mode === 'known') {
    leveledKnown = tableAtLevel(SPELLS_KNOWN_BY_LEVEL[slug], level)
  }

  return {
    mode,
    slug,
    labelRu: focus.def?.labelRu ?? suggestion.labelRu,
    cantrips,
    leveledKnown,
    maxPrepared: suggestion.max_prepared,
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
