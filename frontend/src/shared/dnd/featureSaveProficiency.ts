/**
 * Feature → save proficiency grants (Diamond Soul, etc.).
 * Contract: feature.save_proficiency = "all" | AbilityKey[]
 */

import type { AbilityScoreKey, UnlockedFeature } from './classFeatures'

const ALL_SAVES: AbilityScoreKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export function saveProficiencyKeysFromFeatures(
  features: UnlockedFeature[],
): AbilityScoreKey[] {
  const out = new Set<AbilityScoreKey>()
  for (const feature of features) {
    const grant = feature.save_proficiency
    if (!grant) continue
    if (grant === 'all') {
      for (const key of ALL_SAVES) out.add(key)
      continue
    }
    for (const key of grant) out.add(key)
  }
  return ALL_SAVES.filter((key) => out.has(key))
}

/** Force-enable feature-granted saves; never clears manual extras. */
export function applyFeatureSaveProficiencies<
  T extends Record<AbilityScoreKey, boolean>,
>(saves: T, features: UnlockedFeature[]): T {
  const keys = saveProficiencyKeysFromFeatures(features)
  if (!keys.length) return saves
  let changed = false
  const next = { ...saves }
  for (const key of keys) {
    if (!next[key]) {
      next[key] = true as T[AbilityScoreKey]
      changed = true
    }
  }
  return changed ? next : saves
}
