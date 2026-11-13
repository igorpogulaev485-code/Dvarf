import {
  maneuverById,
  type ManeuverDef,
} from './battleMasterManeuvers'
import type { UnlockedFeature } from './classFeatures'
import {
  getFeaturePick,
  getFeaturePickList,
  type FeaturePicksState,
} from './featurePicks'

export const SUPERIOR_TECHNIQUE_MANEUVER_PICK = 'superior_technique_maneuver'
export const SUPERIORITY_DICE_ST_POOL = 'superiority_dice_st'

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

/** Known maneuvers for a fighter entry from feature_picks (+ Superior Technique). */
export function listKnownManeuvers(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): ManeuverDef[] {
  const ids = [
    ...getFeaturePickList(featurePicks, classEntryId, 'combat_superiority'),
  ]
  const st =
    getFeaturePickList(featurePicks, classEntryId, SUPERIOR_TECHNIQUE_MANEUVER_PICK)[0] ??
    getFeaturePick(featurePicks, classEntryId, SUPERIOR_TECHNIQUE_MANEUVER_PICK)
  if (st && !ids.includes(st)) ids.push(st)

  const rows: ManeuverDef[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) continue
    const def = maneuverById(id)
    if (def) {
      seen.add(id)
      rows.push(def)
    }
  }
  return rows
}

export function listSuperioritySpendOptions(input: {
  features: UnlockedFeature[]
  featurePicks: FeaturePicksState
  classEntryId: string
  /** When spending from Superior Technique d6 pool. */
  poolId?: string | null
}): SuperioritySpendOption[] {
  const poolId = input.poolId ?? 'superiority_dice'
  const hasBattleMasterPool = input.features.some(
    (f) =>
      f.classEntryId === input.classEntryId &&
      f.resource?.pool_id === 'superiority_dice',
  )
  const stManeuver =
    getFeaturePickList(
      input.featurePicks,
      input.classEntryId,
      SUPERIOR_TECHNIQUE_MANEUVER_PICK,
    )[0] ?? getFeaturePick(input.featurePicks, input.classEntryId, SUPERIOR_TECHNIQUE_MANEUVER_PICK)

  if (poolId === SUPERIORITY_DICE_ST_POOL) {
    const def = stManeuver ? maneuverById(stManeuver) : null
    if (!def) return []
    return [
      {
        key: `${input.classEntryId}:st:${def.id}`,
        maneuverId: def.id,
        classEntryId: input.classEntryId,
        nameRu: `${def.spendLabelRu || def.nameRu} (к6 · Превосходная техника)`,
        summaryRu: def.summaryRu,
        cost: 1,
      },
    ]
  }

  if (!hasBattleMasterPool && !stManeuver) return []

  return listKnownManeuvers(input.featurePicks, input.classEntryId).map((def) => ({
    key: `${input.classEntryId}:${def.id}`,
    maneuverId: def.id,
    classEntryId: input.classEntryId,
    nameRu: def.spendLabelRu || def.nameRu,
    summaryRu: def.summaryRu,
    cost: 1,
  }))
}
