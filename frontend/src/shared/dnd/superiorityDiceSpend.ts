import {
  maneuverById,
  type ManeuverDef,
} from './battleMasterManeuvers'
import type { UnlockedFeature } from './classFeatures'
import {
  getFeaturePickList,
  type FeaturePicksState,
} from './featurePicks'

export type SuperioritySpendOption = {
  key: string
  maneuverId: string
  classEntryId: string
  nameRu: string
  summaryRu: string
  cost: number
}

/** Die size label from Combat Superiority / Improved (к8 → к12). */
export function superiorityDieLabel(
  features: UnlockedFeature[],
  classEntryId: string,
): string | null {
  const improved = features.find(
    (f) =>
      f.classEntryId === classEntryId &&
      f.id === 'improved_combat_superiority' &&
      f.scaleValue,
  )
  if (improved?.scaleValue) return improved.scaleValue
  const base = features.find(
    (f) =>
      f.classEntryId === classEntryId &&
      f.id === 'combat_superiority' &&
      f.scaleValue,
  )
  return base?.scaleValue ?? null
}

/** Known maneuvers for a fighter entry from feature_picks. */
export function listKnownManeuvers(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): ManeuverDef[] {
  const ids = getFeaturePickList(featurePicks, classEntryId, 'combat_superiority')
  const rows: ManeuverDef[] = []
  for (const id of ids) {
    const def = maneuverById(id)
    if (def) rows.push(def)
  }
  return rows
}

export function listSuperioritySpendOptions(input: {
  features: UnlockedFeature[]
  featurePicks: FeaturePicksState
  classEntryId: string
}): SuperioritySpendOption[] {
  const hasPool = input.features.some(
    (f) =>
      f.classEntryId === input.classEntryId &&
      f.resource?.pool_id === 'superiority_dice',
  )
  if (!hasPool) return []

  return listKnownManeuvers(input.featurePicks, input.classEntryId).map((def) => ({
    key: `${input.classEntryId}:${def.id}`,
    maneuverId: def.id,
    classEntryId: input.classEntryId,
    nameRu: def.nameRu,
    summaryRu: def.summaryRu,
    cost: 1,
  }))
}
