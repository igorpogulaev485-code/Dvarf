/** Serialize create-pipeline state into a character sheet document. */

import type { AbilityScores } from '../../shared/dnd/multiclassRules'
import { mergeRacialBonuses } from '../../shared/dnd/pointBuy'
import { totalCharacterLevel } from '../../shared/dnd/classLevels'
import { classLevelsToSheet } from '../characters/classLevels'
import { xpToReachLevel } from '../../shared/dnd/experience'
import type { CreatePipelineState } from './createPipelineTypes'

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
    version: 1,
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
  if (meta.version !== 1) return fallback
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
    classRef: (meta.classRef as CreatePipelineState['classRef']) || fallback.classRef,
    race: (meta.race as CreatePipelineState['race']) || fallback.race,
    subrace: (meta.subrace as CreatePipelineState['subrace']) || fallback.subrace,
    sheetDraft: {
      background_grant: sheet.background_grant,
      race_grant: sheet.race_grant,
      class_grants: sheet.class_grants,
      subclass_grants: sheet.subclass_grants,
      feature_picks: sheet.feature_picks,
      class_asi: sheet.class_asi,
      skills: sheet.skills,
      inventory: sheet.inventory,
      weapons: sheet.weapons,
      text_blocks: sheet.text_blocks,
      spells: sheet.spells,
      companions: sheet.companions,
    },
  }
}
