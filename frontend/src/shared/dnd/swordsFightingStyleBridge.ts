/**
 * College of Swords fighting style is collected in the subclass setup
 * (`picks.fighting_style`) and also shown on the feature card
 * (`bonus_proficiencies_swords`). Bridge the setup value onto the card.
 */

import { BARD_SWORDS_FIGHTING_STYLES, type FightingStyleId } from './fightingStyles'
import {
  getFeaturePick,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'
import type { AppliedSubclassGrant, SubclassGrantPicks } from './subclassGrants'

export const SWORDS_FIGHTING_FEATURE_ID = 'bonus_proficiencies_swords'
export const SWORDS_FIGHTING_PICK_ID = 'fighting_style'

const STYLES = new Set<string>(BARD_SWORDS_FIGHTING_STYLES)

export function isSwordsFightingStyle(value: string | null | undefined): value is FightingStyleId {
  return Boolean(value && STYLES.has(value))
}

function styleFromValues(
  values: Record<string, string | string[] | undefined> | null | undefined,
): FightingStyleId | null {
  if (!values) return null
  const raw = values[SWORDS_FIGHTING_PICK_ID]
  if (typeof raw === 'string' && isSwordsFightingStyle(raw)) return raw
  return null
}

export function swordsFightingStyleFromSubclassPicks(
  picks: SubclassGrantPicks | null | undefined,
): FightingStyleId | null {
  return styleFromValues(picks?.values)
}

export function swordsFightingStyleFromGrant(
  grant: Pick<AppliedSubclassGrant, 'slug' | 'picks'>,
): FightingStyleId | null {
  if (grant.slug !== 'college_of_swords') return null
  return styleFromValues(grant.picks)
}

/** Copy the setup style onto the feature card when the card is still empty. */
export function bridgeSwordsFightingStyle(input: {
  featurePicks: FeaturePicksState
  classEntryId: string
  styleId: string | null | undefined
}): FeaturePicksState {
  if (!isSwordsFightingStyle(input.styleId) || !input.classEntryId.trim()) {
    return input.featurePicks
  }
  const existing = getFeaturePick(
    input.featurePicks,
    input.classEntryId,
    SWORDS_FIGHTING_FEATURE_ID,
  )
  if (existing) return input.featurePicks
  return setFeaturePick(
    input.featurePicks,
    input.classEntryId,
    SWORDS_FIGHTING_FEATURE_ID,
    input.styleId,
  )
}

export function hydrateSwordsFightingStyleFromGrants(input: {
  featurePicks: FeaturePicksState
  subclassGrants: Array<Pick<AppliedSubclassGrant, 'classEntryId' | 'slug' | 'picks'>>
}): { featurePicks: FeaturePicksState; bridgedClassEntryIds: string[] } {
  let next = input.featurePicks
  const bridgedClassEntryIds: string[] = []
  for (const grant of input.subclassGrants) {
    const styleId = swordsFightingStyleFromGrant(grant)
    if (!styleId) continue
    const bridged = bridgeSwordsFightingStyle({
      featurePicks: next,
      classEntryId: grant.classEntryId,
      styleId,
    })
    if (bridged === next) continue
    next = bridged
    bridgedClassEntryIds.push(grant.classEntryId)
  }
  return { featurePicks: next, bridgedClassEntryIds }
}
