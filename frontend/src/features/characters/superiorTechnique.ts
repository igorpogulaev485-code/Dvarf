/**
 * TCE Superior Technique fighting style: one Battle Master maneuver + one d6
 * superiority die (stacks with Battle Master dice; die size tracked separately).
 */

import { BATTLE_MASTER_MANEUVERS, maneuverById } from '../../shared/dnd/battleMasterManeuvers'
import {
  getFeaturePick,
  getFeaturePickList,
  listFightingStyleIds,
  setFeaturePick,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import {
  featureResourceId,
  type DesiredFeatureResource,
} from '../../shared/dnd/featureResources'

export const SUPERIOR_TECHNIQUE_STYLE = 'superior_technique'
export const SUPERIOR_TECHNIQUE_MANEUVER_ID = 'superior_technique_maneuver'
export const SUPERIOR_TECHNIQUE_POOL_ID = 'superiority_dice_st'
export const SUPERIOR_TECHNIQUE_DIE = 'к6'

const FIGHTER_STYLE_FEATURES = [
  'fighting_style',
  'fighting_style_fighter',
  'additional_fighting_style',
] as const

export function superiorTechniqueManeuverOptions(): Array<{ id: string; label: string }> {
  return BATTLE_MASTER_MANEUVERS.map((row) => ({
    id: row.id,
    label: row.spendLabelRu || row.nameRu,
  }))
}

export function isSuperiorTechniqueActive(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): boolean {
  for (const featureId of FIGHTER_STYLE_FEATURES) {
    if (getFeaturePick(featurePicks, classEntryId, featureId) === SUPERIOR_TECHNIQUE_STYLE) {
      return true
    }
  }
  // Also accept any style id list containing superior_technique.
  return listFightingStyleIds(featurePicks).includes(SUPERIOR_TECHNIQUE_STYLE)
}

export function getSuperiorTechniqueManeuverId(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): string | null {
  const ids = getFeaturePickList(
    featurePicks,
    classEntryId,
    SUPERIOR_TECHNIQUE_MANEUVER_ID,
  )
  const id = ids[0] ?? getFeaturePick(featurePicks, classEntryId, SUPERIOR_TECHNIQUE_MANEUVER_ID)
  if (!id) return null
  return maneuverById(id) ? id : null
}

export function setSuperiorTechniqueManeuver(
  featurePicks: FeaturePicksState,
  classEntryId: string,
  maneuverId: string | null,
): FeaturePicksState {
  return setFeaturePick(
    featurePicks,
    classEntryId,
    SUPERIOR_TECHNIQUE_MANEUVER_ID,
    maneuverId,
  )
}

/** Append a separate d6 superiority pool for Superior Technique. */
export function appendSuperiorTechniqueResources(input: {
  desired: DesiredFeatureResource[]
  featurePicks: FeaturePicksState
  classes: Array<{ id: string; name: string; level: number }>
}): DesiredFeatureResource[] {
  const out = [...input.desired]
  for (const row of input.classes) {
    if (!/воин|fighter/i.test(row.name.trim()) || row.level < 1) continue
    if (!isSuperiorTechniqueActive(input.featurePicks, row.id)) continue
    const id = featureResourceId('fighter', SUPERIOR_TECHNIQUE_POOL_ID, row.id)
    if (out.some((r) => r.id === id)) continue
    out.push({
      id,
      name: `Кость превосходства (Превосходная техника, ${SUPERIOR_TECHNIQUE_DIE})`,
      max: 1,
      reset: 'short',
      track: 'spend',
      classSlug: 'fighter',
      classLabelRu: 'Воин',
    })
  }
  return out
}
