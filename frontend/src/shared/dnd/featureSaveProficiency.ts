/**
 * Feature → save proficiency grants (Diamond Soul, etc.).
 * Contract: feature.save_proficiency = "all" | AbilityKey[]
 */

import { classGrantDefFromName } from './classGrants'
import type { AbilityScoreKey, UnlockedFeature } from './classFeatures'
import type { AppliedFeatGrant } from './featGrants'

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

/**
 * XGE Iron Mind: Wisdom save if you lack it; otherwise Intelligence or Charisma.
 * Class and feat saves count as "already have Wisdom". A previous manual pick
 * does not, when Wisdom is still missing.
 */
export function wisdomSaveAlreadyGranted(input: {
  classes: Array<{ name: string }>
  featGrants?: Array<Pick<AppliedFeatGrant, 'applied'>>
  features?: Array<Pick<UnlockedFeature, 'id' | 'save_proficiency'>>
}): boolean {
  for (const row of input.classes) {
    const grant = classGrantDefFromName(row.name)
    if (grant?.start.saves.includes('wis')) return true
  }
  for (const feat of input.featGrants ?? []) {
    if (feat.applied.savingThrows.includes('wis')) return true
  }
  for (const feature of input.features ?? []) {
    if (feature.id === 'iron_mind') continue
    const grant = feature.save_proficiency
    if (grant === 'all' || (Array.isArray(grant) && grant.includes('wis'))) return true
  }
  return false
}

export function ironMindSaveKey(input: {
  alreadyHasWisdom: boolean
  /** intelligence | charisma when Wisdom is already proficient. */
  pick: string | null | undefined
}): AbilityScoreKey | null {
  if (!input.alreadyHasWisdom) return 'wis'
  if (input.pick === 'intelligence') return 'int'
  if (input.pick === 'charisma') return 'cha'
  return null
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
