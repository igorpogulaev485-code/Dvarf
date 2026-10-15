import {
  getFeaturePickList,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'
import {
  infusionById,
  infusedItemCount,
  type ArtificerInfusionDef,
} from './artificerInfusions'

/** feature_picks key for which known infusions are currently on items. */
export const INFUSIONS_ACTIVE_FEATURE_ID = 'infusions_active'

export function listKnownInfusions(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): ArtificerInfusionDef[] {
  const ids = getFeaturePickList(featurePicks, classEntryId, 'infuse_item')
  const rows: ArtificerInfusionDef[] = []
  for (const id of ids) {
    const def = infusionById(id)
    if (def) rows.push(def)
  }
  return rows
}

export function listActiveInfusionIds(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): string[] {
  const known = new Set(
    getFeaturePickList(featurePicks, classEntryId, 'infuse_item'),
  )
  return getFeaturePickList(
    featurePicks,
    classEntryId,
    INFUSIONS_ACTIVE_FEATURE_ID,
  ).filter((id) => known.has(id))
}

export function setActiveInfusions(
  featurePicks: FeaturePicksState,
  classEntryId: string,
  activeIds: string[],
): FeaturePicksState {
  const known = new Set(
    getFeaturePickList(featurePicks, classEntryId, 'infuse_item'),
  )
  const cleaned = activeIds.filter((id) => known.has(id))
  return setFeaturePick(
    featurePicks,
    classEntryId,
    INFUSIONS_ACTIVE_FEATURE_ID,
    cleaned.length ? cleaned.join(',') : null,
  )
}

export function infusionSlotsMax(artificerLevel: number): number {
  return infusedItemCount(artificerLevel)
}
