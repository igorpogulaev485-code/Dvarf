/**
 * B4 V1: PHB ↔ Tasha optional replacement pairs.
 * Statuses: Активно / Доступно для замены / Заменено.
 * Taking the optional marks the PHB target as replaced (mandatory swap).
 */

import {
  getFeaturePick,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'

export type FeatureReplacementStatus = 'active' | 'available' | 'replaced'

export type ReplacementFeatureRef = {
  id: string
  classEntryId: string
  name_ru?: string
  optional?: boolean
  replaces?: string
}

/** Pick value stored on the optional feature when the player takes it. */
export const REPLACEMENT_TAKEN_VALUE = 'on'

export function featureMatchesReplaceTarget(
  featureId: string,
  replaces: string,
): boolean {
  if (featureId === replaces) return true
  // Cleric Blessed Strikes replaces domain Divine Strike / Potent Spellcasting.
  if (replaces === 'divine_strike_or_potent_spellcasting') {
    return (
      featureId.startsWith('divine_strike_') ||
      featureId.startsWith('potent_spellcasting_')
    )
  }
  return false
}

export function isReplacementTaken(
  picks: FeaturePicksState,
  classEntryId: string,
  optionalFeatureId: string,
): boolean {
  return getFeaturePick(picks, classEntryId, optionalFeatureId) === REPLACEMENT_TAKEN_VALUE
}

export function setReplacementTaken(
  picks: FeaturePicksState,
  classEntryId: string,
  optionalFeatureId: string,
  taken: boolean,
): FeaturePicksState {
  return setFeaturePick(
    picks,
    classEntryId,
    optionalFeatureId,
    taken ? REPLACEMENT_TAKEN_VALUE : null,
  )
}

/** Find the optional that replaces this feature (same class entry), if any. */
export function findReplacerForFeature(
  feature: ReplacementFeatureRef,
  unlocked: ReplacementFeatureRef[],
): ReplacementFeatureRef | null {
  for (const row of unlocked) {
    if (row.classEntryId !== feature.classEntryId) continue
    if (!row.replaces) continue
    if (featureMatchesReplaceTarget(feature.id, row.replaces)) return row
  }
  return null
}

/** Find unlocked PHB/domain targets this optional would replace. */
export function findReplaceTargets(
  optional: ReplacementFeatureRef,
  unlocked: ReplacementFeatureRef[],
): ReplacementFeatureRef[] {
  if (!optional.replaces) return []
  return unlocked.filter(
    (row) =>
      row.classEntryId === optional.classEntryId &&
      featureMatchesReplaceTarget(row.id, optional.replaces!),
  )
}

export function replacementStatusForFeature(
  feature: ReplacementFeatureRef,
  unlocked: ReplacementFeatureRef[],
  picks: FeaturePicksState,
): FeatureReplacementStatus {
  if (feature.replaces) {
    return isReplacementTaken(picks, feature.classEntryId, feature.id)
      ? 'active'
      : 'available'
  }
  const replacer = findReplacerForFeature(feature, unlocked)
  if (replacer) {
    return isReplacementTaken(picks, feature.classEntryId, replacer.id)
      ? 'replaced'
      : 'active'
  }
  return 'active'
}

/** True when the feature should drive play desk, resources, and pending choices. */
export function isFeatureActiveForPlay(
  feature: ReplacementFeatureRef,
  unlocked: ReplacementFeatureRef[],
  picks: FeaturePicksState,
): boolean {
  return replacementStatusForFeature(feature, unlocked, picks) === 'active'
}

export function filterActiveFeaturesForPlay<T extends ReplacementFeatureRef>(
  features: T[],
  picks: FeaturePicksState,
): T[] {
  return features.filter((feature) =>
    isFeatureActiveForPlay(feature, features, picks),
  )
}

export function replacementStatusLabelRu(
  status: FeatureReplacementStatus,
): string {
  if (status === 'available') return 'Доступно для замены'
  if (status === 'replaced') return 'Заменено'
  return 'Активно'
}
