/** P24-M03: state for the 2024 create wizard (level 1 only). */

import type { AbilityScores } from '../../shared/dnd/multiclassRules'
import type { AbilityMethod } from '../../shared/dnd/pointBuy'
import { applyStandardArrayByPriority } from '../../shared/dnd/pointBuy'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { CharacterCreate2024Request } from '../../shared/api/characters'
import type { FeatPicks } from './create2024FeatPicks'

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
   * Target level shown on the leveling stage. The create endpoint is level 1 only:
   * levels above 1 (and subclass / multiclass) are applied later on the sheet.
   */
  characterLevel: number
  subclassSlug: string | null
  multiclassSlug: string | null
  multiclassLevel: number

  cantripIds: string[]
  preparedSpellIds: string[]
}

export function createEmptyCreate2024State(): Create2024State {
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
    cantripIds: [],
    preparedSpellIds: [],
  }
}

export type Create2024CatalogBundle = {
  classes: CatalogEntry[]
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

export function classL1Spellcasting(
  classEntry: CatalogEntry | null | undefined,
): { cantrips: number; prepared_spells: number } | null {
  const data = entryData(classEntry)
  const levels = Array.isArray(data.levels) ? data.levels : []
  const l1 = levels.find((row) => row && typeof row === 'object' && (row as { level?: number }).level === 1) as
    | { spellcasting?: { cantrips?: number; prepared_spells?: number } | null }
    | undefined
  const sc = l1?.spellcasting
  if (!sc || typeof sc !== 'object') return null
  return {
    cantrips: Number(sc.cantrips || 0),
    prepared_spells: Number(sc.prepared_spells || 0),
  }
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

export function toCreate2024Request(
  state: Create2024State,
  options?: { isPreview?: boolean; isDraft?: boolean },
): CharacterCreate2024Request {
  return {
    name: state.characterName.trim() || 'Новый персонаж',
    gender: state.gender,
    is_draft: options?.isDraft ?? false,
    is_preview: options?.isPreview ?? true,
    class_slug: state.classSlug || '',
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
    class_option_picks: {
      ...state.classOptionPicks,
      client_picks: clientPicks(state),
    },
    // The API creates level 1 only (no subclass before level 3); state.subclassSlug /
    // characterLevel / multiclass* stay client-side until level-up is wired to create.
    subclass_slug: null,
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
