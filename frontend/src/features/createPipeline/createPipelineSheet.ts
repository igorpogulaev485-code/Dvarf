/** Serialize create-pipeline state into a character sheet document. */

import type { AbilityScores } from '../../shared/dnd/multiclassRules'
import { mergeRacialBonuses } from '../../shared/dnd/pointBuy'
import { totalCharacterLevel } from '../../shared/dnd/classLevels'
import { emptyFeaturePicks, readFeaturePicks } from '../../shared/dnd/featurePicks'
import { readClassAsiLedger } from '../../shared/dnd/classAsi'
import { classLevelsToSheet, readClassLevels } from '../characters/classLevels'
import { xpToReachLevel } from '../../shared/dnd/experience'
import {
  CREATE_PIPELINE_VERSION,
  type CreatePipelineState,
} from './createPipelineTypes'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function buildSheetFromPipeline(
  state: CreatePipelineState,
  baseSheet: Record<string, unknown>,
  racialBonuses: Partial<AbilityScores>,
): Record<string, unknown> {
  const sheet = structuredClone(baseSheet)
  const identity = asRecord(sheet.identity)
  const abilities = asRecord(sheet.abilities)
  const combat = asRecord(sheet.combat)

  const finalAbilities = mergeRacialBonuses(state.baseAbilities, racialBonuses)
  for (const [key, score] of Object.entries(finalAbilities)) {
    abilities[key] = { ...asRecord(abilities[key]), score }
  }
  sheet.abilities = abilities

  const classes = state.classes.map((row) =>
    row.id === state.classEntryId && state.classRef
      ? {
          ...row,
          name: state.classRef.nameRu,
          catalog_id: state.classRef.id,
        }
      : row,
  )
  Object.assign(sheet, classLevelsToSheet(classes))

  identity.race_catalog_id = state.race?.id ?? null
  identity.background_catalog_id = state.background?.id ?? null
  identity.class_catalog_id = state.classRef?.id ?? null
  identity.background = state.background?.nameRu ?? identity.background ?? null
  identity.experience = xpToReachLevel(totalCharacterLevel(classes))
  sheet.identity = identity

  if (state.background?.nameRu) {
    // Keep grant ledgers from sheetDraft when present.
  }

  const mergedDraft = { ...asRecord(state.sheetDraft) }
  for (const key of [
    'background_grant',
    'race_grant',
    'class_grants',
    'subclass_grants',
    'feature_picks',
    'class_asi',
    'skills',
    'inventory',
    'weapons',
    'text_blocks',
    'spells',
    'companions',
  ]) {
    if (mergedDraft[key] !== undefined) {
      sheet[key] = mergedDraft[key]
    }
  }

  sheet.create_pipeline = {
    version: CREATE_PIPELINE_VERSION,
    step: state.step,
    abilityMethod: state.abilityMethod,
    baseAbilities: state.baseAbilities,
    hpChoices: state.hpChoices,
    characterName: state.characterName,
    classEntryId: state.classEntryId,
    background: state.background,
    classRef: state.classRef,
    race: state.race,
    subrace: state.subrace,
    feat: state.feat,
    featSetup: state.featSetup,
    featAcknowledged: state.featAcknowledged,
    backgroundSetup: state.backgroundSetup,
    raceSetup: state.raceSetup,
    classGrantPicks: state.classGrantPicks,
    subclassSetups: state.subclassSetups,
    featurePicks: state.featurePicks,
    classAsi: state.classAsi,
  }

  combat.hp_max = combat.hp_max ?? null
  combat.hp_current = combat.hp_current ?? combat.hp_max
  sheet.combat = combat

  return sheet
}

export function hydratePipelineFromSheet(
  sheet: Record<string, unknown>,
  fallback: CreatePipelineState,
): CreatePipelineState {
  const meta = asRecord(sheet.create_pipeline)
  // v1 drafts were written by an early serializeSheet; still hydrate them.
  if (meta.version !== CREATE_PIPELINE_VERSION && meta.version !== 1) return fallback
  const classGrantPicks =
    meta.classGrantPicks && typeof meta.classGrantPicks === 'object'
      ? (meta.classGrantPicks as CreatePipelineState['classGrantPicks'])
      : fallback.classGrantPicks
  const subclassSetups =
    meta.subclassSetups && typeof meta.subclassSetups === 'object'
      ? (meta.subclassSetups as CreatePipelineState['subclassSetups'])
      : fallback.subclassSetups
  const featurePicks = meta.featurePicks
    ? readFeaturePicks(meta.featurePicks)
    : sheet.feature_picks
      ? readFeaturePicks(sheet.feature_picks)
      : fallback.featurePicks ?? emptyFeaturePicks()
  const classAsi = Array.isArray(meta.classAsi)
    ? readClassAsiLedger(meta.classAsi)
    : sheet.class_asi
      ? readClassAsiLedger(sheet.class_asi)
      : fallback.classAsi
  const classes = readClassLevels(sheet, {
    className: (meta.classRef as CreatePipelineState['classRef'])?.nameRu ?? '',
    level: 1,
    subclassName: '',
    classCatalogId: (meta.classRef as CreatePipelineState['classRef'])?.id ?? null,
  })

  return {
    ...fallback,
    step: (meta.step as CreatePipelineState['step']) || fallback.step,
    characterName:
      typeof meta.characterName === 'string' ? meta.characterName : fallback.characterName,
    abilityMethod:
      (meta.abilityMethod as CreatePipelineState['abilityMethod']) || fallback.abilityMethod,
    baseAbilities:
      (meta.baseAbilities as CreatePipelineState['baseAbilities']) || fallback.baseAbilities,
    hpChoices: Array.isArray(meta.hpChoices)
      ? (meta.hpChoices as CreatePipelineState['hpChoices'])
      : fallback.hpChoices,
    classEntryId:
      typeof meta.classEntryId === 'string' ? meta.classEntryId : fallback.classEntryId,
    background:
      (meta.background as CreatePipelineState['background']) || fallback.background,
    backgroundSetup:
      (meta.backgroundSetup as CreatePipelineState['backgroundSetup']) ||
      fallback.backgroundSetup,
    classRef: (meta.classRef as CreatePipelineState['classRef']) || fallback.classRef,
    classGrantPicks,
    subclassSetups,
    race: (meta.race as CreatePipelineState['race']) || fallback.race,
    subrace: (meta.subrace as CreatePipelineState['subrace']) || fallback.subrace,
    raceSetup:
      (meta.raceSetup as CreatePipelineState['raceSetup']) || fallback.raceSetup,
    feat: (meta.feat as CreatePipelineState['feat']) || fallback.feat,
    featSetup:
      (meta.featSetup as CreatePipelineState['featSetup']) || fallback.featSetup,
    featAcknowledged: Boolean(meta.featAcknowledged),
    classes: classes.length ? classes : fallback.classes,
    featurePicks,
    classAsi,
    sheetDraft: {
      background_grant: sheet.background_grant,
      race_grant: sheet.race_grant,
      class_grants: sheet.class_grants,
      subclass_grants: sheet.subclass_grants,
      class_grant_picks: classGrantPicks,
      feature_picks: featurePicks,
      class_asi: classAsi,
      skills: sheet.skills,
      inventory: sheet.inventory,
      weapons: sheet.weapons,
      text_blocks: sheet.text_blocks,
      spells: sheet.spells,
      companions: sheet.companions,
    },
  }
}
