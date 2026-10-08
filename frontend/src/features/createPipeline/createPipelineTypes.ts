/** State for the 2014 create-pipeline page. */

import type { AbilityScores } from '../../shared/dnd/multiclassRules'
import type { AbilityMethod } from '../../shared/dnd/pointBuy'
import { emptyBaseScores } from '../../shared/dnd/pointBuy'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { createClassLevel } from '../../shared/dnd/classLevels'

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
  /** Applied background grant blob lives in sheetDraft. */
  classRef: PipelineCatalogRef | null
  classEntryId: string
  race: PipelineCatalogRef | null
  subrace: PipelineCatalogRef | null
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

export function createEmptyPipelineState(): CreatePipelineState {
  const classEntry = createClassLevel({ level: 1 })
  return {
    version: 1,
    step: 'background',
    characterName: '',
    characterId: null,
    sheetVersion: null,
    background: null,
    classRef: null,
    classEntryId: classEntry.id,
    race: null,
    subrace: null,
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
