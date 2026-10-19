/** State for the 2014 create-pipeline page. */

import type { CatalogEntry } from '../../shared/api/catalog'
import type { CharacterGender } from '../../shared/dnd/characterGender'
import type { AbilityScores } from '../../shared/dnd/multiclassRules'
import type { AbilityMethod } from '../../shared/dnd/pointBuy'
import { emptyBaseScores } from '../../shared/dnd/pointBuy'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { createClassLevel } from '../../shared/dnd/classLevels'
import type { BackgroundGrantPicks } from '../../shared/dnd/backgroundGrants'
import type { RaceGrantPicks } from '../../shared/dnd/raceGrants'
import { resolveRaceGrantDef } from '../../shared/dnd/raceGrants'
import { raceRequiresFeatPick } from '../../shared/dnd/featGrants'
import type {
  FeatGrantPicks,
  FeatGrantsPackage,
} from '../../shared/dnd/featGrants'
import type { ClassGrantPicks } from '../../shared/dnd/classGrants'
import type {
  SubclassChangeMode,
  SubclassGrantPicks,
} from '../../shared/dnd/subclassGrants'
import type { AppliedClassAsi } from '../../shared/dnd/classAsi'
import { emptyFeaturePicks, type FeaturePicksState } from '../../shared/dnd/featurePicks'

/** Canonical order. `feat` is skipped when the race does not grant a feat. */
export const CREATE_PIPELINE_STEPS = [
  'race',
  'feat',
  'background',
  'class',
  'abilities',
  'leveling',
] as const

export type CreatePipelineStepId = (typeof CREATE_PIPELINE_STEPS)[number]

export const CREATE_PIPELINE_STEP_LABELS: Record<CreatePipelineStepId, string> = {
  race: 'Раса',
  feat: 'Черта',
  background: 'Предыстория',
  class: 'Класс',
  abilities: 'Характеристики',
  leveling: 'Прокачка',
}

export const CREATE_PIPELINE_VERSION = 2 as const

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

/** Full feat setup from the dedicated create-pipeline step (race grant). */
export type FeatSetupStored = {
  entry: PipelineCatalogSnapshot
  picks: FeatGrantPicks
  applied: FeatGrantsPackage
}

export type SubclassSetupStored = {
  entry: PipelineCatalogSnapshot
  picks: SubclassGrantPicks
  /** Present when this setup replaces a previous archetype choice. */
  changeMode?: SubclassChangeMode
  changedAtClassLevel?: number
  previousEntry?: PipelineCatalogSnapshot | null
  previousPicks?: SubclassGrantPicks
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
  version: typeof CREATE_PIPELINE_VERSION
  step: CreatePipelineStepId
  characterName: string
  /** Required on race step before advance; null = not chosen yet. */
  gender: CharacterGender | null
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
  /** Subclass grant setups keyed by class entry id. */
  subclassSetups: Record<string, SubclassSetupStored>
  race: PipelineCatalogRef | null
  subrace: PipelineCatalogRef | null
  /** Full race confirm payload for re-apply on save. */
  raceSetup: RaceSetupStored | null
  /** Feat from race (featNoteRu / feat_pick path); optional catalog pick. */
  feat: PipelineCatalogRef | null
  /** Full feat package when chosen via FeatSetupDialog on the feat step. */
  featSetup: FeatSetupStored | null
  /** User acknowledged racial feat note without a catalog card. */
  featAcknowledged: boolean
  abilityMethod: AbilityMethod
  /** Scores before racial bonuses. */
  baseAbilities: AbilityScores
  classes: ClassLevelEntry[]
  hpChoices: HpLevelChoice[]
  /** Feature choice / expertise picks from GuidedWizard. */
  featurePicks: FeaturePicksState
  /** Class ASI ledger from GuidedWizard. */
  classAsi: AppliedClassAsi[]
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

function raceDefFromSetup(raceSetup: RaceSetupStored | null) {
  if (!raceSetup) return null
  return resolveRaceGrantDef({
    raceName: raceSetup.entry.name_ru,
    catalogSlug: raceSetup.entry.slug,
    catalogData: raceSetup.entry.data,
    nameRu: raceSetup.entry.name_ru,
  })
}

/** Racial feat note from stored race setup (if any). */
export function raceFeatNoteRu(raceSetup: RaceSetupStored | null): string | null {
  const note = raceDefFromSetup(raceSetup)?.featNoteRu?.trim()
  return note || null
}

/** Race grants a real feat pick (Variant Human / Custom Lineage) — catalog required. */
export function raceRequiresCatalogFeat(raceSetup: RaceSetupStored | null): boolean {
  const def = raceDefFromSetup(raceSetup)
  return Boolean(def && raceRequiresFeatPick(def))
}

/** Show the dedicated «Черта» step (feat_pick and/or legacy feat note). */
export function raceNeedsFeatStep(raceSetup: RaceSetupStored | null): boolean {
  if (raceRequiresCatalogFeat(raceSetup)) return true
  return Boolean(raceFeatNoteRu(raceSetup))
}

/** Steps shown in the shell / used for next/back (skips feat when not needed). */
export function visiblePipelineSteps(raceSetup: RaceSetupStored | null): CreatePipelineStepId[] {
  const needsFeat = raceNeedsFeatStep(raceSetup)
  return CREATE_PIPELINE_STEPS.filter((id) => id !== 'feat' || needsFeat)
}

export function createEmptyPipelineState(): CreatePipelineState {
  const classEntry = createClassLevel({ level: 1 })
  return {
    version: CREATE_PIPELINE_VERSION,
    step: 'race',
    characterName: '',
    gender: null,
    characterId: null,
    sheetVersion: null,
    background: null,
    backgroundSetup: null,
    classRef: null,
    classEntryId: classEntry.id,
    classGrantPicks: {},
    subclassSetups: {},
    race: null,
    subrace: null,
    raceSetup: null,
    feat: null,
    featSetup: null,
    featAcknowledged: false,
    abilityMethod: 'standard_array',
    baseAbilities: emptyBaseScores(8),
    classes: [classEntry],
    hpChoices: [],
    featurePicks: emptyFeaturePicks(),
    classAsi: [],
    sheetDraft: {},
    stepDirty: {},
  }
}

export function stepIndex(
  step: CreatePipelineStepId,
  steps: readonly CreatePipelineStepId[] = CREATE_PIPELINE_STEPS,
): number {
  return steps.indexOf(step)
}
