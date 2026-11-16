/** P24-M03: state for the 2024 create wizard (level 1 only). */

import type { AbilityScores } from '../../shared/dnd/multiclassRules'
import type { AbilityMethod } from '../../shared/dnd/pointBuy'
import { emptyBaseScores } from '../../shared/dnd/pointBuy'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { CharacterCreate2024Request } from '../../shared/api/characters'

export const CREATE_2024_STEPS = [
  'class',
  'background',
  'species',
  'abilities',
  'languages',
  'equipment',
  'spells',
  'summary',
] as const

export type Create2024StepId = (typeof CREATE_2024_STEPS)[number]

export const CREATE_2024_STEP_LABELS: Record<Create2024StepId, string> = {
  class: 'Класс',
  background: 'Предыстория',
  species: 'Вид',
  abilities: 'Характеристики',
  languages: 'Языки',
  equipment: 'Снаряжение',
  spells: 'Заклинания',
  summary: 'Итог',
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

  backgroundSlug: string | null
  backgroundAsiMode: '+2/+1' | '+1/+1/+1'
  backgroundAsi: Partial<Record<AbilityKey, number>>
  backgroundToolId: string | null
  backgroundEquipment: 'pack' | 'gold'
  originFeatList: string | null
  originFeatCantrips: string[]
  originFeatSpellId: string | null
  originFeatSkilled: string[]

  speciesSlug: string | null
  speciesSize: string | null
  speciesLineageId: string | null
  speciesAncestryId: string | null

  abilityMethod: AbilityMethod
  baseAbilities: AbilityScores

  languageIds: string[]

  classEquipment: string

  cantripIds: string[]
  preparedSpellIds: string[]
}

export function createEmptyCreate2024State(): Create2024State {
  return {
    step: 'class',
    characterName: '',
    gender: null,
    classSlug: null,
    classSkillIds: [],
    weaponMasteryIds: [],
    fightingStyleSlug: null,
    classOptionPicks: {},
    backgroundSlug: null,
    backgroundAsiMode: '+2/+1',
    backgroundAsi: {},
    backgroundToolId: null,
    backgroundEquipment: 'pack',
    originFeatList: null,
    originFeatCantrips: [],
    originFeatSpellId: null,
    originFeatSkilled: [],
    speciesSlug: null,
    speciesSize: null,
    speciesLineageId: null,
    speciesAncestryId: null,
    abilityMethod: 'standard_array',
    baseAbilities: emptyBaseScores(8),
    languageIds: [],
    classEquipment: 'a',
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

export function visibleCreate2024Steps(
  classEntry: CatalogEntry | null | undefined,
): Create2024StepId[] {
  const caster = isCasterAtLevel1(classEntry)
  return CREATE_2024_STEPS.filter((id) => id !== 'spells' || caster)
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
    origin_feat_list: state.originFeatList,
    origin_feat_cantrips: [...state.originFeatCantrips],
    origin_feat_spell_id: state.originFeatSpellId,
    origin_feat_skilled: [...state.originFeatSkilled],
    cantrip_ids: [...state.cantripIds],
    prepared_spell_ids: [...state.preparedSpellIds],
    class_option_picks: { ...state.classOptionPicks },
    subclass_slug: null,
  }
}
