/** P24-M03 / M03c: state for the 2024 create wizard (level 1–20 + multiclass). */

import type { AbilityScores } from '../../shared/dnd/multiclassRules'
import { freeBookSlotsAtLevel } from '../../shared/dnd/wizardSpellbook'
import type { AbilityMethod } from '../../shared/dnd/pointBuy'
import { applyStandardArrayByPriority } from '../../shared/dnd/pointBuy'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { CharacterCreate2024Request } from '../../shared/api/characters'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { createClassLevel, totalCharacterLevel } from '../../shared/dnd/classLevels'
import { normalizeClassSlug2024 } from '../../shared/dnd/edition2024Classes'
import type { HpLevelChoice } from '../createPipeline/createPipelineTypes'
import type { FeatPicks } from './create2024FeatPicks'
import type { AsiChoice2024 } from './LevelingForks2024'

/**
 * Same shell order as the 2014 pipeline: вид → черта* → предыстория → класс →
 * характеристики → прокачка. «Черта» only shows when the species grants an origin feat.
 */
export const CREATE_2024_STEPS = [
  'species',
  'feat',
  'background',
  'class',
  'abilities',
  'leveling',
] as const

export type Create2024StepId = (typeof CREATE_2024_STEPS)[number]

export const CREATE_2024_STEP_LABELS: Record<Create2024StepId, string> = {
  species: 'Вид',
  feat: 'Черта',
  background: 'Предыстория',
  class: 'Класс',
  abilities: 'Характеристики',
  leveling: 'Прокачка',
}

export type AbilityKey = keyof AbilityScores

export type Create2024State = {
  step: Create2024StepId
  characterName: string
  gender: string | null

  classSlug: string | null
  classSkillIds: string[]
  weaponMasteryIds: string[]
  fightingStyleSlug: string | null
  classOptionPicks: Record<string, unknown>
  /** Class tool proficiencies the player chooses (bard instruments, monk, artificer). */
  classToolIds: string[]

  backgroundSlug: string | null
  backgroundAsiMode: '+2/+1' | '+1/+1/+1'
  backgroundAsi: Partial<Record<AbilityKey, number>>
  backgroundToolId: string | null
  backgroundEquipment: 'pack' | 'gold'
  /** Nested picks of the background origin feat (magic-initiate list, skilled, crafter, …). */
  originFeatPicks: FeatPicks

  speciesSlug: string | null
  speciesSize: string | null
  speciesLineageId: string | null
  speciesAncestryId: string | null
  /** Species trait picks (skills, spellcasting ability). */
  speciesPicks: FeatPicks
  /** Human «Гибкий»: extra origin feat + its nested picks. */
  speciesFeatSlug: string | null
  speciesFeatPicks: FeatPicks

  abilityMethod: AbilityMethod
  baseAbilities: AbilityScores

  languageIds: string[]

  classEquipment: string

  /**
   * P24-M03c: class rows + HP / ASI / subclass forks materialize create-at-N.
   * `characterLevel` stays as a derived convenience (= sum of class levels).
   */
  characterLevel: number
  subclassSlug: string | null
  multiclassSlug: string | null
  multiclassLevel: number
  classes: ClassLevelEntry[]
  primaryClassEntryId: string
  hpChoices: HpLevelChoice[]
  asiChoices: AsiChoice2024[]
  subclassByEntryId: Record<string, string | null>

  cantripIds: string[]
  /** Wizard only: first-level spells written into the spellbook (6 at L1, +2 per wizard level). */
  spellbookSpellIds: string[]
  preparedSpellIds: string[]
}

export function createEmptyCreate2024State(): Create2024State {
  const primary = createClassLevel({ level: 1 })
  return {
    step: 'species',
    characterName: '',
    gender: null,
    classSlug: null,
    classSkillIds: [],
    weaponMasteryIds: [],
    fightingStyleSlug: null,
    classOptionPicks: {},
    classToolIds: [],
    backgroundSlug: null,
    backgroundAsiMode: '+2/+1',
    backgroundAsi: {},
    backgroundToolId: null,
    backgroundEquipment: 'pack',
    originFeatPicks: {},
    speciesSlug: null,
    speciesSize: null,
    speciesLineageId: null,
    speciesAncestryId: null,
    speciesPicks: {},
    speciesFeatSlug: null,
    speciesFeatPicks: {},
    abilityMethod: 'standard_array',
    baseAbilities: applyStandardArrayByPriority(null),
    languageIds: [],
    classEquipment: 'a',
    characterLevel: 1,
    subclassSlug: null,
    multiclassSlug: null,
    multiclassLevel: 1,
    classes: [primary],
    primaryClassEntryId: primary.id,
    hpChoices: [],
    asiChoices: [],
    subclassByEntryId: {},
    cantripIds: [],
    spellbookSpellIds: [],
    preparedSpellIds: [],
  }
}

export type Create2024CatalogBundle = {
  classes: CatalogEntry[]
  subclasses: CatalogEntry[]
  backgrounds: CatalogEntry[]
  species: CatalogEntry[]
  feats: CatalogEntry[]
  weapons: CatalogEntry[]
  spells: CatalogEntry[]
  /** Armor + gear + tools + weapons — used for Russian item names. */
  items: CatalogEntry[]
}

export type LanguageOption = {
  id: string
  name_ru: string
  kind: string
}

export type LanguagesBundle = {
  common_id: string
  choice_count: number
  languages: LanguageOption[]
  class_special: LanguageOption[]
}

export function entryData(entry: CatalogEntry | null | undefined): Record<string, unknown> {
  return entry?.data && typeof entry.data === 'object' ? entry.data : {}
}

type ClassLevelSpellcastingRow = {
  level?: number
  spellcasting?: {
    cantrips?: number
    prepared_spells?: number
    slots?: Record<string, number> | null
    pact_slots?: { slot_level?: number; count?: number } | null
  } | null
}

function classLevelRows(classEntry: CatalogEntry | null | undefined): ClassLevelSpellcastingRow[] {
  const data = entryData(classEntry)
  return Array.isArray(data.levels) ? (data.levels as ClassLevelSpellcastingRow[]) : []
}

export type ClassSpellcastingBudget = {
  cantrips: number
  prepared_spells: number
  maxSlotLevel: number
}

export function classL1Spellcasting(
  classEntry: CatalogEntry | null | undefined,
): ClassSpellcastingBudget | null {
  return classSpellcastingAtLevel(classEntry, 1)
}

/** Spellcasting budgets + highest non-zero slot circle at a class level. */
export function classSpellcastingAtLevel(
  classEntry: CatalogEntry | null | undefined,
  level: number,
  opts?: { divineOrder?: string | null },
): ClassSpellcastingBudget | null {
  const lv = Math.max(1, Math.min(20, Math.floor(level) || 1))
  const row = classLevelRows(classEntry).find((item) => item?.level === lv)
  const sc = row?.spellcasting
  if (!sc || typeof sc !== 'object') return null
  const slots = sc.slots && typeof sc.slots === 'object' ? sc.slots : {}
  let maxSlotLevel = 0
  for (const [key, value] of Object.entries(slots)) {
    const circle = Number(key)
    const n = Number(value)
    if (Number.isFinite(circle) && circle >= 1 && Number.isFinite(n) && n > 0) {
      maxSlotLevel = Math.max(maxSlotLevel, circle)
    }
  }
  const pact = sc.pact_slots
  if (pact && Number(pact.count) > 0 && Number(pact.slot_level) >= 1) {
    maxSlotLevel = Math.max(maxSlotLevel, Number(pact.slot_level))
  }
  let cantrips = Number(sc.cantrips || 0)
  // Cleric 2024 Thaumaturge: +1 cantrip beyond the table column (not counted in table).
  if (
    classEntry?.slug === 'cleric' &&
    String(opts?.divineOrder || '').toLowerCase() === 'thaumaturge'
  ) {
    cantrips += 1
  }
  return {
    cantrips,
    prepared_spells: Number(sc.prepared_spells || 0),
    maxSlotLevel,
  }
}

export const WIZARD_CLASS_SLUG = 'wizard'

/** 6 free first-level spells at wizard level 1 (same table as 2014). */
export const WIZARD_BOOK_SPELLS_AT_L1 = freeBookSlotsAtLevel(1)

/** Wizards write spells into a spellbook first, then prepare from it. */
export function usesSpellbook(classSlug: string | null | undefined): boolean {
  return classSlug === WIZARD_CLASS_SLUG
}

export function isCasterAtLevel1(classEntry: CatalogEntry | null | undefined): boolean {
  const sc = classL1Spellcasting(classEntry)
  return Boolean(sc && (sc.cantrips > 0 || sc.prepared_spells > 0))
}

/** Species that grants an extra origin feat (human «Гибкий»). */
export function speciesGrantsOriginFeat(species: CatalogEntry | null | undefined): boolean {
  if (!species) return false
  return species.slug === 'human' || Boolean(entryData(species).origin_feat_choice)
}

/** Steps for next/back: the feat step is skipped unless the species grants an origin feat. */
export function visibleCreate2024Steps(
  species: CatalogEntry | null | undefined,
): Create2024StepId[] {
  const needsFeat = speciesGrantsOriginFeat(species)
  return CREATE_2024_STEPS.filter((id) => id !== 'feat' || needsFeat)
}

function classSlugOf(row: ClassLevelEntry, fallback: string | null): string {
  return (
    normalizeClassSlug2024(row.catalog_id) ||
    normalizeClassSlug2024(row.name) ||
    fallback ||
    ''
  )
}

export function toCreate2024Request(
  state: Create2024State,
  options?: { isPreview?: boolean; isDraft?: boolean },
): CharacterCreate2024Request {
  const primarySlug = state.classSlug || ''
  let classLevels = state.classes
    .filter((row) => row.level > 0 && (row.name.trim() || row.catalog_id || primarySlug))
    .map((row, index) => {
      const slug = classSlugOf(row, index === 0 ? primarySlug : null) || primarySlug
      const sub = state.subclassByEntryId[row.id] || null
      return {
        slug,
        level: Math.max(1, Math.floor(row.level)),
        subclass_slug: sub,
      }
    })
    .filter((row) => Boolean(row.slug))
  if (!classLevels.length && primarySlug) {
    classLevels = [
      {
        slug: primarySlug,
        level: Math.max(1, Math.floor(state.characterLevel || 1)),
        subclass_slug: state.subclassSlug || null,
      },
    ]
  } else if (classLevels.length === 1 && state.characterLevel > classLevels[0]!.level) {
    // Legacy state that only bumped characterLevel without syncing classes[].
    classLevels = [
      {
        ...classLevels[0]!,
        level: Math.max(1, Math.floor(state.characterLevel)),
        subclass_slug: classLevels[0]!.subclass_slug || state.subclassSlug || null,
      },
    ]
  }
  const total =
    classLevels.reduce((sum, row) => sum + row.level, 0) ||
    totalCharacterLevel(state.classes) ||
    state.characterLevel ||
    1
  const primarySubclass = classLevels[0]?.subclass_slug || state.subclassSlug || null

  const hpChoices = state.hpChoices.map((row) => {
    const cls = state.classes.find((c) => c.id === row.classEntryId)
    const slug = cls ? classSlugOf(cls, primarySlug) : primarySlug
    return {
      class_slug: slug,
      class_level: row.classLevel,
      mode: row.mode,
      rolled: row.rolled ?? null,
    }
  })

  const asiChoices = state.asiChoices.map((row) => ({
    class_slug: row.classSlug,
    class_level: row.classLevel,
    kind: row.kind,
    abilities: (row.abilities || {}) as Record<string, number>,
    feat_slug: row.featSlug || null,
    note_ru: row.noteRu || null,
  }))

  return {
    name: state.characterName.trim() || 'Новый персонаж',
    gender: state.gender,
    is_draft: options?.isDraft ?? false,
    is_preview: options?.isPreview ?? true,
    class_slug: primarySlug,
    background_slug: state.backgroundSlug || '',
    species_slug: state.speciesSlug || '',
    ability_method: state.abilityMethod,
    base_abilities: { ...state.baseAbilities },
    background_asi_mode: state.backgroundAsiMode,
    background_asi: Object.fromEntries(
      Object.entries(state.backgroundAsi).filter(([, v]) => typeof v === 'number' && v > 0),
    ),
    language_ids: [...state.languageIds],
    class_skill_ids: [...state.classSkillIds],
    weapon_mastery_ids: [...state.weaponMasteryIds],
    fighting_style_slug: state.fightingStyleSlug,
    background_tool_id: state.backgroundToolId,
    background_equipment: state.backgroundEquipment,
    class_equipment: state.classEquipment,
    species_size: state.speciesSize,
    species_lineage_id: state.speciesLineageId,
    species_ancestry_id: state.speciesAncestryId,
    origin_feat_list: state.originFeatPicks.list?.[0] ?? null,
    origin_feat_cantrips: [...(state.originFeatPicks.cantrips ?? [])],
    origin_feat_spell_id: state.originFeatPicks.spell?.[0] ?? null,
    origin_feat_skilled: [...(state.originFeatPicks.skilled ?? [])],
    cantrip_ids: [...state.cantripIds],
    prepared_spell_ids: [...state.preparedSpellIds],
    spellbook_spell_ids: [...state.spellbookSpellIds],
    class_option_picks: {
      ...state.classOptionPicks,
      client_picks: clientPicks(state),
    },
    subclass_slug: total >= 3 ? primarySubclass : null,
    class_levels: total > 1 ? classLevels : undefined,
    hp_choices: total > 1 ? hpChoices : [],
    asi_choices: total > 1 ? asiChoices : [],
  }
}

/** Nested origin/species/class tool picks validated by the 2024 create endpoint. */
function clientPicks(state: Create2024State): Record<string, unknown> {
  return {
    class_tools: [...state.classToolIds],
    origin_feat_picks: { ...state.originFeatPicks },
    species_picks: { ...state.speciesPicks },
    species_feat: state.speciesFeatSlug
      ? { slug: state.speciesFeatSlug, picks: { ...state.speciesFeatPicks } }
      : null,
  }
}
