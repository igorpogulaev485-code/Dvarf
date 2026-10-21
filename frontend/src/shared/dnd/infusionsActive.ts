/**
 * Known vs active Artificer infusions.
 * Active bindings may target self or a lobby ally (item on their gear).
 */

import {
  getFeaturePick,
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

/**
 * Parallel map: `infusionId=self|characterId,...`
 * Missing entry → self (backward compatible).
 */
export const INFUSIONS_ACTIVE_TARGETS_FEATURE_ID = 'infusions_active_targets'

export type InfusionTargetRef = 'self' | string

export type ActiveInfusionBinding = {
  infusionId: string
  /** `self` or lobby ally character id. */
  target: InfusionTargetRef
}

function parseTargetMap(raw: string | null | undefined): Map<string, InfusionTargetRef> {
  const out = new Map<string, InfusionTargetRef>()
  if (!raw?.trim()) return out
  for (const part of raw.split(',')) {
    const chunk = part.trim()
    if (!chunk) continue
    const eq = chunk.indexOf('=')
    if (eq <= 0) continue
    const id = chunk.slice(0, eq).trim()
    const target = chunk.slice(eq + 1).trim() || 'self'
    if (!id) continue
    out.set(id, target === 'self' ? 'self' : target)
  }
  return out
}

function serializeTargetMap(bindings: ActiveInfusionBinding[]): string | null {
  const parts = bindings
    .filter((row) => row.target && row.target !== 'self')
    .map((row) => `${row.infusionId}=${row.target}`)
  return parts.length ? parts.join(',') : null
}

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

/** Active infusions with target (self or ally character id). */
export function listActiveInfusionBindings(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): ActiveInfusionBinding[] {
  const ids = listActiveInfusionIds(featurePicks, classEntryId)
  const targets = parseTargetMap(
    getFeaturePick(
      featurePicks,
      classEntryId,
      INFUSIONS_ACTIVE_TARGETS_FEATURE_ID,
    ),
  )
  return ids.map((infusionId) => ({
    infusionId,
    target: targets.get(infusionId) ?? 'self',
  }))
}

export function setActiveInfusions(
  featurePicks: FeaturePicksState,
  classEntryId: string,
  activeIds: string[],
): FeaturePicksState {
  return setActiveInfusionBindings(
    featurePicks,
    classEntryId,
    activeIds.map((infusionId) => ({ infusionId, target: 'self' as const })),
  )
}

export function setActiveInfusionBindings(
  featurePicks: FeaturePicksState,
  classEntryId: string,
  bindings: ActiveInfusionBinding[],
): FeaturePicksState {
  const known = new Set(
    getFeaturePickList(featurePicks, classEntryId, 'infuse_item'),
  )
  const cleaned = bindings.filter((row) => known.has(row.infusionId))
  const ids = cleaned.map((row) => row.infusionId)
  let next = setFeaturePick(
    featurePicks,
    classEntryId,
    INFUSIONS_ACTIVE_FEATURE_ID,
    ids.length ? ids.join(',') : null,
  )
  next = setFeaturePick(
    next,
    classEntryId,
    INFUSIONS_ACTIVE_TARGETS_FEATURE_ID,
    serializeTargetMap(cleaned),
  )
  return next
}

export function infusionSlotsMax(artificerLevel: number): number {
  return infusedItemCount(artificerLevel)
}

/** Infusions that can be placed on an ally's item (most item infusions). */
export function infusionCanTargetAlly(def: ArtificerInfusionDef | null): boolean {
  if (!def) return false
  // Homunculus is tied to the artificer's gem — self only.
  if (def.id === 'homunculus_servant') return false
  return true
}
