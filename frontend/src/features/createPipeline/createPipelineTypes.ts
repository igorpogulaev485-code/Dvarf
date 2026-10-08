/** State for the 2014 create-pipeline page. */

import type { CatalogEntry } from '../../shared/api/catalog'
import type { AbilityScores } from '../../shared/dnd/multiclassRules'
import type { AbilityMethod } from '../../shared/dnd/pointBuy'
import { emptyBaseScores } from '../../shared/dnd/pointBuy'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { createClassLevel } from '../../shared/dnd/classLevels'
import type { BackgroundGrantPicks } from '../../shared/dnd/backgroundGrants'
import type { RaceGrantPicks } from '../../shared/dnd/raceGrants'
import type { ClassGrantPicks } from '../../shared/dnd/classGrants'

export const CREATE_PIPELINE_STEPS = [
  'background',
  'class',
  'race',
  'abilities',
  'leveling',
] as const

export type CreatePipelineStepId = (typeof CREATE_PIPELINE_STEPS)[number]

export const CREATE_PIPELINE_STEP_LABELS: Record<CreatePipelineStepId, string> = {
  background: 'Предыстория',
  class: 'Класс',
  race: 'Раса',
  abilities: 'Характеристики',
  leveling: 'Прокачка',
}

export type PipelineCatalogRef = {
  id: string
  slug: string
  nameRu: string
}

/** Serializable catalog snapshot so apply can re-run without a network round-trip. */
export type PipelineCatalogSnapshot = {
  id: string
  slug: string
  name_ru: string
  name_en: string | null
  parent_id: string | null
  data: Record<string, unknown>
  source?: string | null
}

export type BackgroundSetupStored = {
  entry: PipelineCatalogSnapshot
  picks: BackgroundGrantPicks
}

export type RaceSetupStored = {
  /** Applied race or subrace entry. */
  entry: PipelineCatalogSnapshot
  /** Root race when `entry` is a subrace. */
  rootEntry: PipelineCatalogSnapshot | null
  picks: RaceGrantPicks
}

export type HpGainMode = 'average' | 'roll'

export type HpLevelChoice = {
  /** Stable key: `${classEntryId}:${classLevel}` */
  key: string
  classEntryId: string
  classLevel: number
  mode: HpGainMode
  /** Rolled face when mode=roll (before CON). */
  rolled?: number | null
}

export type CreatePipelineState = {
  version: 1
  step: CreatePipelineStepId
  characterName: string
  /** Persisted draft character id, if saved. */
  characterId: string | null
  sheetVersion: number | null
  background: PipelineCatalogRef | null
  /** Full background confirm payload for re-apply on save. */
  backgroundSetup: BackgroundSetupStored | null
  classRef: PipelineCatalogRef | null
  classEntryId: string
  /** Class grant picks keyed by class entry id. */
  classGrantPicks: Record<string, ClassGrantPicks>
  race: PipelineCatalogRef | null
  subrace: PipelineCatalogRef | null
  /** Full race confirm payload for re-apply on save. */
  raceSetup: RaceSetupStored | null
  abilityMethod: AbilityMethod
  /** Scores before racial bonuses. */
  baseAbilities: AbilityScores
  classes: ClassLevelEntry[]
  hpChoices: HpLevelChoice[]
  /** Full sheet-shaped draft for grants / picks / spells. */
  sheetDraft: Record<string, unknown>
  /** Step-local dirty flags — clearing on back navigation. */
  stepDirty: Partial<Record<CreatePipelineStepId, boolean>>
}

export function catalogSnapshot(entry: CatalogEntry): PipelineCatalogSnapshot {
  return {
    id: entry.id,
    slug: entry.slug,
    name_ru: entry.name_ru,
    name_en: entry.name_en,
    parent_id: entry.parent_id,
    data: entry.data ?? {},
    source: entry.source,
  }
}

export function createEmptyPipelineState(): CreatePipelineState {
  const classEntry = createClassLevel({ level: 1 })
  return {
    version: 1,
    step: 'background',
    characterName: '',
    characterId: null,
    sheetVersion: null,
    background: null,
    backgroundSetup: null,
    classRef: null,
    classEntryId: classEntry.id,
    classGrantPicks: {},
    race: null,
    subrace: null,
    raceSetup: null,
    abilityMethod: 'standard_array',
    baseAbilities: emptyBaseScores(8),
    classes: [classEntry],
    hpChoices: [],
    sheetDraft: {},
    stepDirty: {},
  }
}

export function stepIndex(step: CreatePipelineStepId): number {
  return CREATE_PIPELINE_STEPS.indexOf(step)
}
