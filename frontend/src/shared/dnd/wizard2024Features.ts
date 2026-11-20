/**
 * Wizard 2024 (PHB): Memorize Spell, cantrip swap, Spell Mastery, Signature Spells
 * and the four PHB school subclasses. Pure helpers.
 *
 * Callers branch on `rules_edition === '2024'`; nothing here feeds the 2014 pack.
 */

import { parseFeatureResourceId } from './featureResources'
import { getFeaturePickList, type FeaturePicksState } from './featurePicks'
import type { SheetResource } from './rest'
import { clampResource } from './rest'
import { castingTimeToEconomyMark } from './turnEconomy'
import {
  SIGNATURE_SPELLS_FEATURE_ID,
  SPELL_MASTERY_FEATURE_ID,
  absorbDamageWithArcaneWard,
  isCounterspellOrDispel,
  setWizardCapstonePick,
  wizardFeatureSpellId,
  type WizardFeatureUseResult,
} from './wizardTradition'
import type { SpellSlotState } from './spells'

export const WIZARD_MEMORIZE_LEVEL_2024 = 5
export const WIZARD_SPELL_MASTERY_LEVEL_2024 = 18
export const WIZARD_SIGNATURE_LEVEL_2024 = 20
export const OVERCHANNEL_LEVEL_2024 = 14
export const OVERCHANNEL_MAX_SLOT_2024 = 5
export const IMPROVED_ILLUSIONS_RANGE_BONUS_FT = 60
export const SPELL_MASTERY_TIERS_2024 = [1, 2] as const

export const MEMORIZE_SPELL_NAME_RU = 'Запомнить заклинание'
export const SPELL_MASTERY_NAME_RU = 'Мастерство заклинателя'
export const SIGNATURE_SPELLS_NAME_RU = 'Фирменные заклинания'

const BLOCKED_SOURCES = new Set(['race', 'feat', 'subclass', 'feature'])

/** Structural subset of a sheet spell row. */
export type W24Spell = {
  id: string
  name: string
  level: number
  prepared?: boolean
  prepared_locked?: boolean
  prepare_source_label?: string
  in_spellbook?: boolean
  spellbook_acquisition?: string
  school?: string
  casting_time?: string
  catalog_id?: string | null
  class_slug?: string | null
  class_entry_id?: string | null
  source_kind?: string
  grant_cast?: { max: number; used: number; reset: 'short' | 'long'; label: string }
  savant_level?: number
}

export type W24Result<T> = { ok: boolean; message: string; known: T[] }

function fail<T>(known: T[], message: string): W24Result<T> {
  return { ok: false, message, known }
}

function nameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

export function isWizardClassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return key === '' || key === 'wizard' || /волшебник/.test(key)
}

/** True for rows that came from the wizard's own Spellcasting (not a feature, race, feat). */
function isSpellcastingRow(spell: W24Spell): boolean {
  if (!isWizardClassSlug(spell.class_slug)) return false
  if (spell.source_kind && BLOCKED_SOURCES.has(spell.source_kind)) return false
  if (spell.grant_cast) return false
  return true
}

export function canMemorizeSpell2024(input: {
  rulesEdition: string | null | undefined
  wizardLevel: number
}): boolean {
  return input.rulesEdition === '2024' && input.wizardLevel >= WIZARD_MEMORIZE_LEVEL_2024
}

/** Prepared Spellcasting spells that Memorize Spell may swap out. */
export function memorizeFromCandidates2024<T extends W24Spell>(
  known: T[],
  lockedIds: readonly string[] = [],
): T[] {
  const locked = new Set(lockedIds)
  return known.filter(
    (spell) =>
      spell.level > 0 &&
      spell.prepared === true &&
      !spell.prepared_locked &&
      !locked.has(spell.id) &&
      isSpellcastingRow(spell),
  )
}

/** Book spells (level 1+) that are not prepared yet. */
export function memorizeToCandidates2024<T extends W24Spell>(
  known: T[],
  input: { lockedIds?: readonly string[]; maxSpellLevel?: number } = {},
): T[] {
  const locked = new Set(input.lockedIds ?? [])
  const cap = input.maxSpellLevel ?? 9
  return known.filter(
    (spell) =>
      spell.level > 0 &&
      spell.level <= cap &&
      spell.in_spellbook !== false &&
      !spell.prepared &&
      !spell.prepared_locked &&
      !locked.has(spell.id) &&
      isSpellcastingRow(spell),
  )
}

/** Spell ids pinned by Spell Mastery / Signature Spells (never swappable by Memorize). */
export function capstoneLockedIds(featurePicks: FeaturePicksState, classEntryId: string): string[] {
  return [
    ...getFeaturePickList(featurePicks, classEntryId, SPELL_MASTERY_FEATURE_ID),
    ...getFeaturePickList(featurePicks, classEntryId, SIGNATURE_SPELLS_FEATURE_ID),
  ]
}

/**
 * Memorize Spell (L5, short rest): replace one prepared Spellcasting spell with
 * another book spell. Locked, signature, mastery and feature spells cannot be swapped.
 */
export function swapMemorizeSpell<T extends W24Spell>(input: {
  known: T[]
  fromId: string
  toId: string
  wizardLevel: number
  rulesEdition: string | null | undefined
  lockedIds?: readonly string[]
  maxSpellLevel?: number
}): W24Result<T> {
  const { known } = input
  if (!canMemorizeSpell2024(input)) {
    return fail(known, `${MEMORIZE_SPELL_NAME_RU}: доступно с ${WIZARD_MEMORIZE_LEVEL_2024} уровня волшебника (2024)`)
  }
  if (input.fromId === input.toId) return fail(known, 'Выбери другое заклинание из книги')
  const from = known.find((spell) => spell.id === input.fromId)
  const to = known.find((spell) => spell.id === input.toId)
  if (!from || !to) return fail(known, 'Заклинание не найдено')
  const locked = new Set(input.lockedIds ?? [])
  if (from.prepared_locked || locked.has(from.id)) {
    return fail(known, 'Закреплённое заклинание (мастерство, фирменное, умение) заменить нельзя')
  }
  if (!memorizeFromCandidates2024(known, input.lockedIds).some((spell) => spell.id === from.id)) {
    return fail(known, 'Заменить можно только подготовленное заклинание 1 круга или выше из Сотворения заклинаний')
  }
  if (to.prepared_locked || locked.has(to.id)) {
    return fail(known, 'Это заклинание закреплено умением')
  }
  if (
    !memorizeToCandidates2024(known, {
      lockedIds: input.lockedIds,
      maxSpellLevel: input.maxSpellLevel,
    }).some((spell) => spell.id === to.id)
  ) {
    return fail(known, 'Новое заклинание должно быть в книге, неподготовленным и доступного круга')
  }
  return {
    ok: true,
    message: `${MEMORIZE_SPELL_NAME_RU}: «${from.name}» → «${to.name}»`,
    known: known.map((spell) => {
      if (spell.id === from.id) return { ...spell, prepared: false }
      if (spell.id === to.id) return { ...spell, prepared: true }
      return spell
    }),
  }
}

/** Cantrips from Spellcasting (not granted by a feature, race or feat). */
export function cantripSwapFromCandidates2024<T extends W24Spell>(known: T[]): T[] {
  return known.filter(
    (spell) => spell.level === 0 && !spell.prepared_locked && isSpellcastingRow(spell),
  )
}

/**
 * Spellcasting (L1, long rest): replace one cantrip with another wizard cantrip.
 * `replacement` is built by the caller from the catalog (any id, level 0).
 */
export function swapSpellcastingCantrip2024<T extends W24Spell>(input: {
  known: T[]
  fromId: string
  replacement: T
  rulesEdition: string | null | undefined
}): W24Result<T> {
  const { known, replacement } = input
  if (input.rulesEdition !== '2024') {
    return fail(known, 'Замена заговора после долгого отдыха — правило 2024')
  }
  const from = known.find((spell) => spell.id === input.fromId)
  if (!from || !cantripSwapFromCandidates2024(known).some((spell) => spell.id === from.id)) {
    return fail(known, 'Заменить можно только заговор из Сотворения заклинаний')
  }
  if (replacement.level !== 0) return fail(known, 'Новый заговор должен быть заговором')
  const key = nameKey(replacement.name)
  const duplicate = known.some(
    (spell) =>
      spell.id !== from.id &&
      spell.level === 0 &&
      ((replacement.catalog_id && spell.catalog_id === replacement.catalog_id) ||
        nameKey(spell.name) === key),
  )
  if (duplicate || nameKey(from.name) === key) {
    return fail(known, 'Этот заговор уже известен')
  }
  return {
    ok: true,
    message: `Сотворение заклинаний: заговор «${from.name}» → «${replacement.name}»`,
    known: known.map((spell) =>
      spell.id === from.id
        ? { ...replacement, id: from.id, prepared: true, class_slug: from.class_slug ?? replacement.class_slug }
        : spell,
    ),
  }
}

export function castingTimeIsAction(raw: unknown): boolean {
  if (typeof raw !== 'string' || !raw.trim()) return false
  return castingTimeToEconomyMark(raw) === 'action'
}

export function isMasteryEligibleSpell2024(spell: W24Spell, tier: number): boolean {
  return (
    spell.level === tier &&
    spell.in_spellbook !== false &&
    isWizardClassSlug(spell.class_slug) &&
    !(spell.source_kind && BLOCKED_SOURCES.has(spell.source_kind)) &&
    castingTimeIsAction(spell.casting_time)
  )
}

/** Book spells of this level with casting time Action. */
export function masteryCandidates2024<T extends W24Spell>(
  known: T[],
  tier: number,
  excludeIds: readonly string[] = [],
): T[] {
  const skip = new Set(excludeIds)
  return known.filter((spell) => isMasteryEligibleSpell2024(spell, tier) && !skip.has(spell.id))
}

/** One spell per tier (1st, 2nd), each a book spell with casting time Action. */
export function validateSpellMasteryPicks2024<T extends W24Spell>(
  known: T[],
  ids: readonly string[],
): { ok: boolean; message: string } {
  const picked = ids.map((id) => known.find((spell) => spell.id === id))
  if (picked.some((spell) => !spell)) return { ok: false, message: 'Заклинание не найдено в книге' }
  const rows = picked as T[]
  const tiers = new Set<number>()
  for (const spell of rows) {
    if (!SPELL_MASTERY_TIERS_2024.includes(spell.level as 1 | 2)) {
      return { ok: false, message: 'Нужны заклинания 1 и 2 круга' }
    }
    if (tiers.has(spell.level)) return { ok: false, message: 'Одно заклинание на каждый круг' }
    tiers.add(spell.level)
    if (!isMasteryEligibleSpell2024(spell, spell.level)) {
      return { ok: false, message: `«${spell.name}»: время сотворения должно быть «Действие», заклинание в книге` }
    }
  }
  return { ok: true, message: '' }
}

export function masteryPickForTier<T extends W24Spell>(
  known: T[],
  ids: readonly string[],
  tier: number,
): T | null {
  for (const id of ids) {
    const spell = known.find((row) => row.id === id)
    if (spell && spell.level === tier) return spell
  }
  return null
}

/**
 * Spell Mastery 2024: after a long rest replace ONE of the two with another
 * qualifying spell of the same level from the book.
 */
export function swapSpellMastery2024<T extends W24Spell>(input: {
  known: T[]
  picks: FeaturePicksState
  classEntryId: string
  tier: number
  toId: string
  wizardLevel: number
  rulesEdition: string | null | undefined
}): { ok: boolean; message: string; picks: FeaturePicksState } {
  const noop = (message: string) => ({ ok: false, message, picks: input.picks })
  if (input.rulesEdition !== '2024') return noop('Замена после долгого отдыха — правило 2024')
  if (input.wizardLevel < WIZARD_SPELL_MASTERY_LEVEL_2024) {
    return noop(`${SPELL_MASTERY_NAME_RU}: с ${WIZARD_SPELL_MASTERY_LEVEL_2024} уровня`)
  }
  const ids = getFeaturePickList(input.picks, input.classEntryId, SPELL_MASTERY_FEATURE_ID)
  const current = masteryPickForTier(input.known, ids, input.tier)
  if (!current) return noop('Сначала выбери заклинание этого круга')
  const target = input.known.find((spell) => spell.id === input.toId)
  if (!target) return noop('Заклинание не найдено в книге')
  if (target.id === current.id) return noop('Выбери другое заклинание')
  if (target.level !== current.level) return noop('Замена — только на заклинание того же круга')
  if (ids.includes(target.id)) return noop('Это заклинание уже выбрано')
  if (!isMasteryEligibleSpell2024(target, current.level)) {
    return noop('Нужно заклинание из книги со временем сотворения «Действие»')
  }
  const next = ids.map((id) => (id === current.id ? target.id : id))
  return {
    ok: true,
    message: `${SPELL_MASTERY_NAME_RU}: «${current.name}» → «${target.name}»`,
    picks: setWizardCapstonePick(input.picks, input.classEntryId, SPELL_MASTERY_FEATURE_ID, next),
  }
}

/** Savant free book rows tied to a class level; drop those above the new level. */
export function trimSavantSpellsOnLevelDown2024<T extends { savant_level?: number }>(
  known: T[],
  newWizardLevel: number,
): T[] {
  const next = known.filter(
    (spell) => spell.savant_level == null || spell.savant_level <= newWizardLevel,
  )
  return next.length === known.length ? known : next
}

// ---------------------------------------------------------------------------
// Subclass context
// ---------------------------------------------------------------------------

export type Wizard2024Context = {
  classEntryId: string
  level: number
  subclassSlug: string | null
}

export type Wizard2024Flags = {
  ward: boolean
  projectedWard: boolean
  spellBreaker: boolean
  spellResistance: boolean
  expertDivination: boolean
  portent: boolean
  thirdEye: boolean
  potentCantrip: boolean
  sculptSpells: boolean
  overchannel: boolean
  improvedIllusions: boolean
  phantasmalCreatures: boolean
  illusorySelf: boolean
  illusoryReality: boolean
}

export function wizard2024Context(input: {
  rulesEdition: string | null | undefined
  classes: Array<{ id: string; name: string; level: number }>
  subclassSlugByEntryId: Record<string, string | null | undefined>
}): Wizard2024Context | null {
  if (input.rulesEdition !== '2024') return null
  const row = input.classes.find((item) => /волшебник|wizard|^маг$/i.test(item.name.trim()))
  if (!row) return null
  return {
    classEntryId: row.id,
    level: row.level,
    subclassSlug: input.subclassSlugByEntryId[row.id] ?? null,
  }
}

export function wizard2024Flags(ctx: Wizard2024Context | null): Wizard2024Flags {
  const slug = ctx?.subclassSlug ?? ''
  const level = ctx?.level ?? 0
  const abjurer = slug === 'wizard__abjurer'
  const diviner = slug === 'wizard__diviner'
  const evoker = slug === 'wizard__evoker'
  const illusionist = slug === 'wizard__illusionist'
  return {
    ward: abjurer && level >= 3,
    projectedWard: abjurer && level >= 6,
    spellBreaker: abjurer && level >= 10,
    spellResistance: abjurer && level >= 14,
    expertDivination: diviner && level >= 6,
    portent: diviner && level >= 3,
    thirdEye: diviner && level >= 10,
    potentCantrip: evoker && level >= 3,
    sculptSpells: evoker && level >= 6,
    overchannel: evoker && level >= OVERCHANNEL_LEVEL_2024,
    improvedIllusions: illusionist && level >= 3,
    phantasmalCreatures: illusionist && level >= 6,
    illusorySelf: illusionist && level >= 10,
    illusoryReality: illusionist && level >= 14,
  }
}

// ---------------------------------------------------------------------------
// Rest swaps: once per rest cycle (persisted on PlayState)
// ---------------------------------------------------------------------------

export type Wizard2024RestSwapFlags = {
  /** Memorize Spell — one swap per short rest. */
  memorize?: boolean
  /** Spellcasting cantrip swap — one per long rest. */
  cantrip?: boolean
  /** Spell Mastery swap — one per long rest. */
  mastery?: boolean
  /** TCE Cantrip Formulas swap on a 2024 sheet — one per short rest. */
  cantripFormulas?: boolean
}

export type Wizard2024RestSwapKey = keyof Wizard2024RestSwapFlags

const REST_SWAP_KEYS: Wizard2024RestSwapKey[] = ['memorize', 'cantrip', 'mastery', 'cantripFormulas']
const SHORT_REST_SWAP_KEYS: Wizard2024RestSwapKey[] = ['memorize', 'cantripFormulas']

function compactRestSwaps(flags: Wizard2024RestSwapFlags): Wizard2024RestSwapFlags | undefined {
  const next: Wizard2024RestSwapFlags = {}
  for (const key of REST_SWAP_KEYS) {
    if (flags[key] === true) next[key] = true
  }
  return Object.keys(next).length > 0 ? next : undefined
}

export function readWizard2024RestSwaps(raw: unknown): Wizard2024RestSwapFlags | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const row = raw as Record<string, unknown>
  return compactRestSwaps({
    memorize: row.memorize === true,
    cantrip: row.cantrip === true,
    mastery: row.mastery === true,
    cantripFormulas: row.cantripFormulas === true || row.cantrip_formulas === true,
  })
}

export function markWizard2024RestSwap(
  flags: Wizard2024RestSwapFlags | undefined,
  key: Wizard2024RestSwapKey,
): Wizard2024RestSwapFlags {
  return { ...(flags ?? {}), [key]: true }
}

/** Short rest frees Memorize Spell (and Cantrip Formulas); long rest frees everything. */
export function clearWizard2024RestSwaps(
  flags: Wizard2024RestSwapFlags | undefined,
  rest: 'short' | 'long',
): Wizard2024RestSwapFlags | undefined {
  if (!flags) return undefined
  if (rest === 'long') return undefined
  const next: Wizard2024RestSwapFlags = { ...flags }
  for (const key of SHORT_REST_SWAP_KEYS) delete next[key]
  return compactRestSwaps(next)
}

export function wizard2024RestSwapDone(flags: Wizard2024RestSwapFlags | undefined): {
  memorize: boolean
  cantrip: boolean
  mastery: boolean
} {
  return {
    memorize: flags?.memorize === true,
    cantrip: flags?.cantrip === true,
    mastery: flags?.mastery === true,
  }
}

// ---------------------------------------------------------------------------
// Sculpt Spells: creature limit 1 + spell level
// ---------------------------------------------------------------------------

export function sculptCreatureLimit2024(spellLevel: number): number {
  return 1 + Math.max(0, Math.floor(spellLevel) || 0)
}

/** Names split by newline, comma or semicolon; blank and duplicate rows dropped. */
export function parseSculptCreatureNames(text: string | null | undefined): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const part of (text ?? '').split(/[\n\r,;]+/)) {
    const name = part.trim()
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names
}

/** Abjurer 14: Advantage on saving throws against spells (shown as a sheet hint). */
export function spellResistanceSaveNote2024(flags: Wizard2024Flags): string {
  return flags.spellResistance
    ? 'Сопротивление заклинаниям: преимущество на спасброски против заклинаний'
    : ''
}

/** Abjurer 14: Resistance to the damage of spells (not a damage type, so a text line). */
export function spellResistanceDefenseNote2024(flags: Wizard2024Flags): string {
  return flags.spellResistance ? 'Сопротивление урону от заклинаний' : ''
}

const SCHOOL_KEYS: Array<[RegExp, string]> = [
  [/ограждени|преграждени|abjur/i, 'abjuration'],
  [/прорицани|divin/i, 'divination'],
  [/воплощени|evoc/i, 'evocation'],
  [/иллюзи|illus/i, 'illusion'],
]

export function wizardSpellSchoolKey(school: string | null | undefined): string | null {
  const raw = (school ?? '').trim()
  if (!raw) return null
  return SCHOOL_KEYS.find(([re]) => re.test(raw))?.[1] ?? null
}

export function isDispelMagicSpell(spell: { name: string }): boolean {
  const key = nameKey(spell.name)
  return key === 'рассеивание-магии' || key === 'dispel-magic'
}

export function isMinorIllusionSpell(spell: { name: string }): boolean {
  const key = nameKey(spell.name)
  return key === 'малая-иллюзия' || key === 'minor-illusion'
}

/**
 * Improved Illusions: an Illusion spell with a range of 10 feet or more reaches 60 feet further.
 * Returns the display string, or null when the rule does not apply.
 */
export function improvedIllusionsRange2024(
  spell: { name: string; range?: string | null; school?: string | null },
  flags: Pick<Wizard2024Flags, 'improvedIllusions'>,
): string | null {
  if (!flags.improvedIllusions) return null
  if (!isMinorIllusionSpell(spell) && wizardSpellSchoolKey(spell.school) !== 'illusion') return null
  const match = /(\d+)\s*(?:фт|фут|ft|feet|foot)/i.exec(spell.range ?? '')
  const base = match ? Number(match[1]) : 0
  if (base < 10) return null
  return `${base} фт → ${base + IMPROVED_ILLUSIONS_RANGE_BONUS_FT} фт (+${IMPROVED_ILLUSIONS_RANGE_BONUS_FT}, Улучшенные иллюзии)`
}

/** Casting-time override: Dispel Magic (Spell Breaker) and Minor Illusion (Improved Illusions). */
export function castTimingOverride2024(
  spell: { name: string },
  flags: Wizard2024Flags,
): 'bonus' | null {
  if (flags.spellBreaker && isDispelMagicSpell(spell)) return 'bonus'
  if (flags.improvedIllusions && isMinorIllusionSpell(spell)) return 'bonus'
  return null
}

// ---------------------------------------------------------------------------
// Subclass feature spells (always prepared, outside the book limit)
// ---------------------------------------------------------------------------

type FeatureSpellRule = {
  subclass: string
  minLevel: number
  /** Spell catalog slug. */
  slug: string
  label: string
  cantrip?: boolean
  freeCast?: { max: number; reset: 'short' | 'long' }
}

export const WIZARD_SUBCLASS_SPELL_RULES_2024: FeatureSpellRule[] = [
  { subclass: 'wizard__abjurer', minLevel: 10, slug: 'counterspell', label: 'Разрушитель заклинаний' },
  { subclass: 'wizard__abjurer', minLevel: 10, slug: 'dispel-magic', label: 'Разрушитель заклинаний' },
  {
    subclass: 'wizard__illusionist',
    minLevel: 3,
    slug: 'minor-illusion',
    label: 'Улучшенные иллюзии',
    cantrip: true,
  },
  {
    subclass: 'wizard__illusionist',
    minLevel: 6,
    slug: 'summon-beast',
    label: 'Призрачные существа',
    freeCast: { max: 1, reset: 'long' },
  },
  {
    subclass: 'wizard__illusionist',
    minLevel: 6,
    slug: 'summon-fey',
    label: 'Призрачные существа',
    freeCast: { max: 1, reset: 'long' },
  },
]

/** Phantasmal Creatures: the free cast granted by the subclass (not any other grant). */
export function isPhantasmalFreeCast2024(input: {
  flags: Wizard2024Flags
  grantLabel: string | null | undefined
}): boolean {
  if (!input.flags.phantasmalCreatures) return false
  return WIZARD_SUBCLASS_SPELL_RULES_2024.some(
    (rule) =>
      rule.subclass === 'wizard__illusionist' &&
      Boolean(rule.freeCast) &&
      rule.label === input.grantLabel,
  )
}

export function wizardSubclassSpellSlugs2024(
  subclass: string | null | undefined,
  level: number,
): string[] {
  return WIZARD_SUBCLASS_SPELL_RULES_2024.filter(
    (rule) => rule.subclass === subclass && level >= rule.minLevel,
  ).map((rule) => rule.slug)
}

function featureSpellId(classEntryId: string, slug: string): string {
  return wizardFeatureSpellId(classEntryId, slug.replace(/-/g, '_'))
}

/**
 * Keep Spell Breaker / Phantasmal Creatures / Improved Illusions spells on the sheet.
 * They are always prepared, acquisition `feature` (no free book slot), and removed
 * again when the level or subclass drops below the feature.
 * A normal book row with the same spell is locked in place instead of duplicated.
 */
export function syncWizardSubclassSpells2024<T extends W24Spell>(input: {
  known: T[]
  ctx: Wizard2024Context | null
  /** Spell row from the 2024 catalog for this slug, or null while unknown. */
  resolve: (slug: string) => T | null
}): { known: T[]; changed: boolean } {
  const ctx = input.ctx
  let known = input.known
  let changed = false
  const labels = new Set(WIZARD_SUBCLASS_SPELL_RULES_2024.map((rule) => rule.label))

  const wanted = new Map<string, FeatureSpellRule>()
  if (ctx) {
    for (const rule of WIZARD_SUBCLASS_SPELL_RULES_2024) {
      if (rule.subclass === ctx.subclassSlug && ctx.level >= rule.minLevel) {
        wanted.set(featureSpellId(ctx.classEntryId, rule.slug), rule)
      }
    }
  }

  const cleaned = known.filter((spell) => {
    if (!spell.id.startsWith('feature-spell:')) return true
    const tail = spell.id.split(':').pop() ?? ''
    const isOurs = WIZARD_SUBCLASS_SPELL_RULES_2024.some(
      (rule) => rule.slug.replace(/-/g, '_') === tail,
    )
    if (!isOurs) return true
    return wanted.has(spell.id)
  })
  if (cleaned.length !== known.length) {
    known = cleaned
    changed = true
  }

  for (const [id, rule] of wanted) {
    if (known.some((spell) => spell.id === id)) continue
    const made = input.resolve(rule.slug)
    if (!made) continue
    const key = nameKey(made.name)
    const existing = known.find(
      (spell) =>
        !spell.id.startsWith('feature-spell:') &&
        (nameKey(spell.name) === key ||
          (made.catalog_id != null && spell.catalog_id === made.catalog_id)),
    )
    if (existing) {
      if (rule.cantrip) continue
      const locked = {
        ...existing,
        prepared: true,
        prepared_locked: true,
        prepare_source_label: rule.label,
        ...(rule.freeCast && !existing.grant_cast
          ? { grant_cast: { ...rule.freeCast, used: 0, label: rule.label } }
          : {}),
      }
      known = known.map((spell) => (spell.id === existing.id ? locked : spell))
      changed = true
      continue
    }
    const row: T = {
      ...made,
      id,
      prepared: true,
      prepared_locked: true,
      prepare_source_label: rule.label,
      class_slug: 'wizard',
      class_entry_id: ctx!.classEntryId,
      ...(rule.cantrip
        ? { source_kind: 'subclass' }
        : { spellbook_acquisition: 'feature', in_spellbook: false }),
      ...(rule.freeCast ? { grant_cast: { ...rule.freeCast, used: 0, label: rule.label } } : {}),
    }
    known = [...known, row]
    changed = true
  }

  const liveLabels = new Set([...wanted.values()].map((rule) => rule.label))
  const next = known.map((spell) => {
    if (spell.id.startsWith('feature-spell:')) return spell
    if (!spell.prepare_source_label || !labels.has(spell.prepare_source_label)) return spell
    if (liveLabels.has(spell.prepare_source_label)) return spell
    changed = true
    const row = { ...spell, prepared_locked: false }
    delete row.prepare_source_label
    if (row.grant_cast && labels.has(row.grant_cast.label)) delete row.grant_cast
    return row
  })
  return { known: changed ? next : input.known, changed }
}

// ---------------------------------------------------------------------------
// Spell slots
// ---------------------------------------------------------------------------

export function slotRemaining2024(
  slots: Record<string, SpellSlotState>,
  level: number,
): number {
  const slot = slots[String(level)]
  if (!slot) return 0
  return Math.max(0, slot.max - slot.used)
}

export function slotUsed2024(slots: Record<string, SpellSlotState>, level: number): number {
  const slot = slots[String(level)]
  if (!slot) return 0
  return Math.max(0, Math.min(slot.max, slot.used))
}

export function restoreSlot2024(
  slots: Record<string, SpellSlotState>,
  level: number,
): Record<string, SpellSlotState> | null {
  const slot = slots[String(level)]
  if (!slot || slotUsed2024(slots, level) <= 0) return null
  return { ...slots, [String(level)]: { ...slot, used: slot.used - 1 } }
}

/** Expert Divination: highest expended slot below the cast one, never above 5th. */
export function expertDivinationRestoreLevel2024(
  slots: Record<string, SpellSlotState>,
  castLevel: number,
): number | null {
  if (castLevel < 2) return null
  for (let level = Math.min(5, castLevel - 1); level >= 1; level -= 1) {
    if (slotUsed2024(slots, level) > 0) return level
  }
  return null
}

export function applyExpertDivination2024(
  slots: Record<string, SpellSlotState>,
  castLevel: number,
): { slots: Record<string, SpellSlotState>; level: number | null } {
  const level = expertDivinationRestoreLevel2024(slots, castLevel)
  if (level == null) return { slots, level: null }
  return { slots: restoreSlot2024(slots, level) ?? slots, level }
}

// ---------------------------------------------------------------------------
// Overchannel
// ---------------------------------------------------------------------------

/**
 * Necrotic d12 per slot level for the Nth use before a long rest:
 * 1st use is free, 2nd = 2d12, 3rd = 3d12, …
 */
export function overchannelDicePerLevel2024(useNumber: number): number {
  const n = Math.max(0, Math.floor(useNumber))
  return n <= 1 ? 0 : n
}

export function overchannelNecroticDice2024(useNumber: number, slotLevel: number): number {
  const level = Math.min(OVERCHANNEL_MAX_SLOT_2024, Math.max(1, Math.floor(slotLevel) || 1))
  return overchannelDicePerLevel2024(useNumber) * level
}

export function overchannelUseCount2024(row: SheetResource | null | undefined): number {
  if (!row) return 0
  return row.useCount ?? (row.used > 0 ? 1 : 0)
}

export function rollD12s(count: number, rng: () => number = Math.random): number[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, () => 1 + Math.floor(rng() * 12))
}

/** Temp HP first, then current HP (necrotic ignores resistance and immunity). */
export function applySelfDamage2024(input: {
  hpCurrent: number | null
  hpTemp: number
  amount: number
}): { hpCurrent: number | null; hpTemp: number } {
  let rest = Math.max(0, Math.floor(input.amount))
  const absorbed = Math.min(Math.max(0, input.hpTemp), rest)
  rest -= absorbed
  return {
    hpTemp: Math.max(0, input.hpTemp) - absorbed,
    hpCurrent: input.hpCurrent == null ? null : Math.max(0, input.hpCurrent - rest),
  }
}

// ---------------------------------------------------------------------------
// Feature use (2024 dialog)
// ---------------------------------------------------------------------------

export const THIRD_EYE_MODES_2024 = [
  { id: 'darkvision', label: 'Тёмное зрение 120 фт.' },
  { id: 'comprehension', label: 'Лучшее понимание: чтение любых языков' },
  { id: 'see_invisibility', label: 'Видение невидимого без ячейки' },
] as const

/** Feature ids that open the 2024 use dialog (wizard subclass cards). */
export const WIZARD_2024_USE_FEATURE_IDS = new Set([
  'portent',
  'the_third_eye',
  'overchannel',
  'illusory_self',
  'illusory_reality',
  'arcane_ward',
  'projected_ward',
  'spell_breaker',
  'expert_divination',
  'sculpt_spells',
])

/** Calc cards (no pool) that get a «use» button in the 2024 panel. */
export const WIZARD_2024_CARD_BUTTONS: Record<string, string> = {
  projected_ward: 'Поглотить урон…',
  spell_breaker: 'Вернуть ячейку…',
  expert_divination: 'Вернуть ячейку…',
  sculpt_spells: 'Защитить существ…',
  illusory_reality: 'Сделать реальным…',
}

export function wizard2024UseFeatureId(featureId: string): boolean {
  return WIZARD_2024_USE_FEATURE_IDS.has(featureId)
}

export type Wizard2024UseInput = {
  featureId: string
  resourceId: string | null
  resources: SheetResource[]
  classEntryId: string
  slots: Record<string, SpellSlotState>
  mode?: string | null
  slotLevel?: number | null
  castLevel?: number | null
  amount?: number | null
  target?: string | null
  dieIndex?: number | null
  rng?: () => number
}

function poolRow(input: Wizard2024UseInput, poolId: string): SheetResource | null {
  if (input.resourceId) {
    const byId = input.resources.find((row) => row.id === input.resourceId)
    if (byId) return byId
  }
  return (
    input.resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.poolId === poolId && parsed.classEntryId === input.classEntryId
    }) ??
    input.resources.find((row) => parseFeatureResourceId(row.id)?.poolId === poolId) ??
    null
  )
}

function patchRow(
  resources: SheetResource[],
  id: string,
  patch: (row: SheetResource) => SheetResource,
): SheetResource[] {
  return resources.map((row) => (row.id === id ? clampResource(patch(row)) : row))
}

function done(
  input: Wizard2024UseInput,
  message: string,
  extra: Partial<WizardFeatureUseResult> = {},
): WizardFeatureUseResult {
  return {
    ok: true,
    message,
    resources: input.resources,
    exhaustionDelta: 0,
    concentrationName: null,
    activeLabels: [],
    companion: null,
    ...extra,
  }
}

function refuse(input: Wizard2024UseInput, message: string): WizardFeatureUseResult {
  return { ...done(input, message), ok: false }
}

export function applyWizard2024FeatureUse(input: Wizard2024UseInput): WizardFeatureUseResult {
  const slotLevel = Math.floor(input.slotLevel ?? 0)
  switch (input.featureId) {
    case 'portent': {
      const row = poolRow(input, 'portent')
      const dice = row?.dice ?? []
      const value = dice[input.dieIndex ?? 0]
      if (!row || value == null) return refuse(input, 'Нет записанной кости знамения')
      const nextDice = dice.filter((_, index) => index !== (input.dieIndex ?? 0))
      const target = (input.target ?? '').trim()
      return done(
        input,
        `Знамение: ${target || 'Тест к20'} заменён на ${value}. Решение — до броска, один раз за ход. Кость потрачена.`,
        {
          resources: patchRow(input.resources, row.id, (item) => ({
            ...item,
            dice: nextDice,
            used: nextDice.length,
            track: 'stock',
          })),
        },
      )
    }
    case 'the_third_eye': {
      const row = poolRow(input, 'the_third_eye')
      if (!row) return refuse(input, 'Ресурс умения не найден')
      if (row.used >= row.max) return refuse(input, 'Третий глаз уже использован до отдыха')
      const mode = THIRD_EYE_MODES_2024.find((item) => item.id === input.mode) ?? THIRD_EYE_MODES_2024[0]
      return done(
        input,
        `Третий глаз (бонусное действие): ${mode.label}. До короткого или долгого отдыха.`,
        {
          resources: patchRow(input.resources, row.id, (item) => ({
            ...item,
            used: item.used + 1,
            activeLabel: mode.label,
          })),
          activeLabels: [mode.label],
        },
      )
    }
    case 'overchannel': {
      const row = poolRow(input, 'overchannel')
      if (!row) return refuse(input, 'Ресурс умения не найден')
      if (slotLevel < 1 || slotLevel > OVERCHANNEL_MAX_SLOT_2024) {
        return refuse(input, 'Перегрузка: ячейка заклинания от 1 до 5 круга')
      }
      const useNumber = overchannelUseCount2024(row) + 1
      const resources = patchRow(input.resources, row.id, (item) => ({
        ...item,
        used: item.max,
        useCount: useNumber,
      }))
      if (useNumber === 1) {
        return done(
          input,
          `Перегрузка: максимальный урон заклинания (${slotLevel} круг). Первый раз без вреда.`,
          { resources },
        )
      }
      const dice = overchannelNecroticDice2024(useNumber, slotLevel)
      const rolls = rollD12s(dice, input.rng)
      const damage = rolls.reduce((sum, value) => sum + value, 0)
      return done(
        input,
        `Перегрузка №${useNumber}: максимальный урон. Вы получаете ${damage} некротического урона (${dice}к12 = ${useNumber}к12 × ${slotLevel}); игнорирует сопротивление и иммунитет.`,
        { resources, selfDamage: damage },
      )
    }
    case 'illusory_self': {
      const row = poolRow(input, 'illusory_self')
      if (!row) return refuse(input, 'Ресурс умения не найден')
      if (input.mode === 'recover') {
        if (row.used <= 0) return refuse(input, 'Умение и так доступно')
        if (slotLevel < 2) return refuse(input, 'Нужна ячейка 2 круга или выше')
        if (slotRemaining2024(input.slots, slotLevel) <= 0) {
          return refuse(input, `Нет свободной ячейки ${slotLevel} круга`)
        }
        return done(
          input,
          `Собственная иллюзорность восстановлена (ячейка ${slotLevel} круга, действие не нужно).`,
          {
            resources: patchRow(input.resources, row.id, (item) => ({ ...item, used: 0 })),
            spendSlotLevel: slotLevel,
          },
        )
      }
      if (row.used >= row.max) {
        return refuse(input, 'Использовано. Верни ячейкой 2 круга или выше, либо после отдыха')
      }
      return done(
        input,
        'Собственная иллюзорность (реакция): атака по вам автоматически промахивается, иллюзия рассеивается.',
        { resources: patchRow(input.resources, row.id, (item) => ({ ...item, used: item.used + 1 })) },
      )
    }
    case 'illusory_reality':
      return done(
        input,
        'Иллюзорная реальность (бонусное действие, пока идёт заклинание школы иллюзии с ячейкой): один неживой немагический предмет иллюзии реален 1 минуту, без урона и состояний. Отметка ручная.',
      )
    case 'arcane_ward': {
      const row = poolRow(input, 'arcane_ward')
      if (!row?.wardCreated) return refuse(input, 'Щит ещё не создан — сотвори заклинание ограждения ячейкой')
      if (slotLevel < 1) return refuse(input, 'Выбери ячейку')
      if (slotRemaining2024(input.slots, slotLevel) <= 0) {
        return refuse(input, `Нет свободной ячейки ${slotLevel} круга`)
      }
      const gain = Math.min(row.max - row.used, slotLevel * 2)
      if (gain <= 0) return refuse(input, 'Щит уже полон')
      return done(
        input,
        `Волшебный щит +${gain} (${row.used + gain}/${row.max}): бонусное действие, ячейка ${slotLevel} круга.`,
        {
          resources: patchRow(input.resources, row.id, (item) => ({
            ...item,
            used: item.used + gain,
            track: 'stock',
            wardCreated: true,
          })),
          spendSlotLevel: slotLevel,
        },
      )
    }
    case 'projected_ward': {
      const amount = Math.max(0, Math.floor(input.amount ?? 0))
      if (amount <= 0) return refuse(input, 'Укажи урон по существу')
      const ward = poolRow(input, 'arcane_ward')
      if (!ward?.wardCreated || ward.used <= 0) return refuse(input, 'Щит не создан или пуст')
      const result = absorbDamageWithArcaneWard(input.resources, amount)
      const target = (input.target ?? '').trim() || 'Союзник'
      return done(
        input,
        `Проецированный щит (реакция): ${target} — щит поглощает ${result.absorbed}${
          result.remaining > 0 ? `, остаток урона ${result.remaining} получает ${target}` : ''
        }. Щит ${Math.max(0, ward.used - result.absorbed)}/${ward.max}.`,
        { resources: result.resources },
      )
    }
    case 'spell_breaker': {
      if (slotLevel < 1) return refuse(input, 'Выбери ячейку, которая не должна расходоваться')
      if (slotUsed2024(input.slots, slotLevel) <= 0) {
        return refuse(input, `Нет потраченной ячейки ${slotLevel} круга`)
      }
      return done(
        input,
        `Разрушитель заклинаний: заклинание не пресекло — ячейка ${slotLevel} круга возвращена.`,
        { restoreSlotLevel: slotLevel },
      )
    }
    case 'expert_divination': {
      const cast = Math.floor(input.castLevel ?? 0)
      if (cast < 2) return refuse(input, 'Нужно прорицание 2 круга или выше')
      if (slotLevel < 1 || slotLevel >= cast || slotLevel > 5) {
        return refuse(input, 'Вернуть можно ячейку ниже использованной, не выше 5 круга')
      }
      if (slotUsed2024(input.slots, slotLevel) <= 0) {
        return refuse(input, `Нет потраченной ячейки ${slotLevel} круга`)
      }
      return done(input, `Эксперт прорицания: ячейка ${slotLevel} круга возвращена.`, {
        restoreSlotLevel: slotLevel,
      })
    }
    case 'sculpt_spells': {
      if (slotLevel < 1) return refuse(input, 'Выбери круг заклинания воплощения')
      const limit = sculptCreatureLimit2024(slotLevel)
      const names = parseSculptCreatureNames(input.target)
      if (names.length > limit) {
        return refuse(input, `Защитить можно не больше ${limit} существ (1 + круг ${slotLevel}), указано ${names.length}`)
      }
      const who = names.length > 0 ? `: ${names.join(', ')}` : ''
      return done(
        input,
        `Построение заклинаний: защищены: ${names.length} (лимит ${limit} = 1 + ${slotLevel} круг)${who}. Автоматически успешный спасбросок, 0 урона.`,
      )
    }
    default:
      return refuse(input, 'Нечего применять')
  }
}

// ---------------------------------------------------------------------------
// Cast follow-ups
// ---------------------------------------------------------------------------

export type Wizard2024CastNote = {
  slots: Record<string, SpellSlotState>
  notes: string[]
}

/** Spell Breaker: Counterspell / Dispel Magic cast through a slot may get the slot back when it fails. */
export function spellBreakerRefundOffer2024(input: {
  flags: Wizard2024Flags
  spell: { name: string; level: number }
  slotLevel: number
  viaSlot: boolean
}): { slotLevel: number } | null {
  if (!input.flags.spellBreaker || !input.viaSlot || input.spell.level <= 0) return null
  if (!isCounterspellOrDispel(input.spell)) return null
  const slotLevel = Math.floor(input.slotLevel)
  return slotLevel >= 1 ? { slotLevel } : null
}

/** Notes and slot refunds that follow a cast (slot-based hooks only). */
export function wizard2024CastFollowUp(input: {
  flags: Wizard2024Flags
  slots: Record<string, SpellSlotState>
  spell: { name: string; level: number; school?: string; damage?: string; attack_or_save?: string }
  slotLevel: number
  viaSlot: boolean
}): Wizard2024CastNote {
  const notes: string[] = []
  let slots = input.slots
  const school = wizardSpellSchoolKey(input.spell.school)
  const leveled = input.spell.level > 0
  if (leveled && input.viaSlot) {
    if (input.flags.expertDivination && school === 'divination' && input.slotLevel >= 2) {
      const restored = applyExpertDivination2024(slots, input.slotLevel)
      slots = restored.slots
      notes.push(
        restored.level != null
          ? `Эксперт прорицания: ячейка ${restored.level} круга вернулась`
          : 'Эксперт прорицания: нет потраченной ячейки ниже',
      )
    }
    if (input.flags.spellBreaker && isCounterspellOrDispel(input.spell)) {
      notes.push('Разрушитель заклинаний: не пресекло — «Вернуть ячейку» в этом уведомлении или на карточке умения')
    }
    if (input.flags.sculptSpells && school === 'evocation') {
      notes.push(`Построение: защити до ${1 + input.slotLevel} существ`)
    }
  }
  if (!leveled && input.flags.potentCantrip && (input.spell.damage || input.spell.attack_or_save)) {
    notes.push('Мощные заговоры: при промахе или успехе спасброска — половина урона')
  }
  return { slots, notes }
}
