/**
 * Bridge Battle Master maneuvers from subclass setup (`maneuvers_3`, flavor_only)
 * into `feature_picks` for `combat_superiority` — the ledger the sheet archetype
 * block and superiority spend UI actually read.
 */

import { BATTLE_MASTER_MANEUVERS } from './battleMasterManeuvers'
import {
  getFeaturePickList,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'
import type { AppliedSubclassGrant, SubclassGrantPicks } from './subclassGrants'

export const COMBAT_SUPERIORITY_FEATURE_ID = 'combat_superiority'

const KNOWN_MANEUVER_IDS = new Set(BATTLE_MASTER_MANEUVERS.map((row) => row.id))

function asStringList(raw: string | string[] | undefined): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

/** Collect known PHB maneuver ids from subclass grant / setup pick values. */
export function extractManeuverIdsFromPicksValues(
  values: Record<string, string | string[]> | null | undefined,
): string[] {
  if (!values) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of Object.values(values)) {
    for (const id of asStringList(raw)) {
      if (!KNOWN_MANEUVER_IDS.has(id) || seen.has(id)) continue
      seen.add(id)
      out.push(id)
    }
  }
  return out
}

export function extractManeuverIdsFromSubclassPicks(
  picks: SubclassGrantPicks | null | undefined,
): string[] {
  return extractManeuverIdsFromPicksValues(picks?.values)
}

export function extractManeuverIdsFromSubclassGrant(
  grant: Pick<AppliedSubclassGrant, 'picks'>,
): string[] {
  return extractManeuverIdsFromPicksValues(grant.picks)
}

export type ManeuverBridgeMode = 'fill_if_empty' | 'merge_missing'

/**
 * Write maneuver ids into `feature_picks[classEntryId:combat_superiority]`.
 * - fill_if_empty: hydrate / create recovery — never overwrite sheet picks
 * - merge_missing: subclass setup confirm — add setup picks without dropping extras
 */
export function bridgeManeuversIntoFeaturePicks(input: {
  featurePicks: FeaturePicksState
  classEntryId: string
  maneuverIds: string[]
  mode: ManeuverBridgeMode
}): FeaturePicksState {
  const ids = input.maneuverIds.filter((id) => KNOWN_MANEUVER_IDS.has(id))
  if (!ids.length || !input.classEntryId.trim()) return input.featurePicks

  const existing = getFeaturePickList(
    input.featurePicks,
    input.classEntryId,
    COMBAT_SUPERIORITY_FEATURE_ID,
  )

  if (input.mode === 'fill_if_empty') {
    if (existing.length > 0) return input.featurePicks
    return setFeaturePick(
      input.featurePicks,
      input.classEntryId,
      COMBAT_SUPERIORITY_FEATURE_ID,
      ids.join(','),
    )
  }

  const merged = [...existing]
  let changed = false
  for (const id of ids) {
    if (merged.includes(id)) continue
    merged.push(id)
    changed = true
  }
  if (!changed) return input.featurePicks
  return setFeaturePick(
    input.featurePicks,
    input.classEntryId,
    COMBAT_SUPERIORITY_FEATURE_ID,
    merged.join(','),
  )
}

/** One-shot hydrate: copy subclass_grants maneuvers into empty combat_superiority picks. */
export function hydrateManeuversFromSubclassGrants(input: {
  featurePicks: FeaturePicksState
  subclassGrants: Array<Pick<AppliedSubclassGrant, 'classEntryId' | 'picks'>>
}): { featurePicks: FeaturePicksState; bridgedClassEntryIds: string[] } {
  let next = input.featurePicks
  const bridgedClassEntryIds: string[] = []
  for (const grant of input.subclassGrants) {
    const maneuverIds = extractManeuverIdsFromSubclassGrant(grant)
    if (!maneuverIds.length) continue
    const bridged = bridgeManeuversIntoFeaturePicks({
      featurePicks: next,
      classEntryId: grant.classEntryId,
      maneuverIds,
      mode: 'fill_if_empty',
    })
    if (bridged === next) continue
    next = bridged
    bridgedClassEntryIds.push(grant.classEntryId)
  }
  return { featurePicks: next, bridgedClassEntryIds }
}
