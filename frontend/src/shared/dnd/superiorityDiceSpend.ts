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
export const SUPERIORITY_DIE_ADEPT_POOL = 'superiority_die_adept'

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
  extraManeuverIds?: string[] | null,
): ManeuverDef[] {
  const ids = [
    ...getFeaturePickList(featurePicks, classEntryId, 'combat_superiority'),
  ]
  const st =
    getFeaturePickList(featurePicks, classEntryId, SUPERIOR_TECHNIQUE_MANEUVER_PICK)[0] ??
    getFeaturePick(featurePicks, classEntryId, SUPERIOR_TECHNIQUE_MANEUVER_PICK)
  if (st && !ids.includes(st)) ids.push(st)
  for (const id of extraManeuverIds ?? []) {
    if (id && !ids.includes(id)) ids.push(id)
  }

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

/** O-05: maneuvers from Martial Adept feat enum_multi picks. */
export function martialAdeptManeuverIds(
  featGrants:
    | Array<{ applied?: { enumMultiPicks?: Record<string, string[]> } | null }>
    | null
    | undefined,
): string[] {
  const out: string[] = []
  for (const grant of featGrants ?? []) {
    const list = grant.applied?.enumMultiPicks?.maneuvers
    if (!list?.length) continue
    for (const id of list) {
      if (id && !out.includes(id)) out.push(id)
    }
  }
  return out
}

export function listSuperioritySpendOptions(input: {
  features: UnlockedFeature[]
  featurePicks: FeaturePicksState
  classEntryId: string
  /** When spending from Superior Technique d6 pool. */
  poolId?: string | null
  /** O-05: Martial Adept maneuver ids. */
  martialAdeptManeuverIds?: string[] | null
}): SuperioritySpendOption[] {
  const poolId = input.poolId ?? 'superiority_dice'
  const adeptIds = input.martialAdeptManeuverIds ?? []
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

  if (poolId === SUPERIORITY_DIE_ADEPT_POOL) {
    return adeptIds
      .map((id) => maneuverById(id))
      .filter((def): def is ManeuverDef => Boolean(def))
      .map((def) => ({
        key: `adept:${def.id}`,
        maneuverId: def.id,
        classEntryId: input.classEntryId,
        nameRu: `${def.spendLabelRu || def.nameRu} (к6 · Боевой адепт)`,
        summaryRu: def.summaryRu,
        cost: 1,
      }))
  }

  if (!hasBattleMasterPool && !stManeuver && adeptIds.length === 0) return []

  return listKnownManeuvers(
    input.featurePicks,
    input.classEntryId,
    adeptIds,
  ).map((def) => ({
    key: `${input.classEntryId}:${def.id}`,
    maneuverId: def.id,
    classEntryId: input.classEntryId,
    nameRu: def.spendLabelRu || def.nameRu,
    summaryRu: def.summaryRu,
    cost: 1,
  }))
}
