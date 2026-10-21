/**
 * Known vs active Artificer infusions.
 * Active bindings may target self or a lobby ally (item on their gear).
 * Replicate Magic Item stores the chosen item slug on the binding.
 */

import {
  getFeaturePick,
  getFeaturePickList,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'
import {
  formatReplicateActiveToken,
  infusionById,
  infusedItemCount,
  normalizeKnownInfusionId,
  parseReplicateItemRef,
  REPLICATE_MAGIC_ITEM_ID,
  replicateItemBySlug,
  type ArtificerInfusionDef,
} from './artificerInfusions'

/** feature_picks key for which known infusions are currently on items. */
export const INFUSIONS_ACTIVE_FEATURE_ID = 'infusions_active'

/**
 * Parallel map: `token=self|characterId,...`
 * Token is infusion id or `replicate_magic_item:<slug>`.
 * Missing entry → self (backward compatible).
 */
export const INFUSIONS_ACTIVE_TARGETS_FEATURE_ID = 'infusions_active_targets'

export type InfusionTargetRef = 'self' | string

export type ActiveInfusionBinding = {
  infusionId: string
  /** `self` or lobby ally character id. */
  target: InfusionTargetRef
  /** Set when infusionId is Replicate Magic Item. */
  replicateItemSlug?: string | null
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

function bindingToken(row: ActiveInfusionBinding): string {
  if (
    row.infusionId === REPLICATE_MAGIC_ITEM_ID ||
    parseReplicateItemRef(row.infusionId)
  ) {
    const slug = row.replicateItemSlug?.trim()
    if (slug) return formatReplicateActiveToken(slug)
    // Legacy / incomplete — keep bare id
    return REPLICATE_MAGIC_ITEM_ID
  }
  return row.infusionId
}

function parseActiveToken(token: string): ActiveInfusionBinding {
  const parsed = parseReplicateItemRef(token)
  if (parsed) {
    return {
      infusionId: REPLICATE_MAGIC_ITEM_ID,
      target: 'self',
      replicateItemSlug: parsed.slug,
    }
  }
  return { infusionId: token, target: 'self', replicateItemSlug: null }
}

function serializeTargetMap(bindings: ActiveInfusionBinding[]): string | null {
  const parts = bindings
    .filter((row) => row.target && row.target !== 'self')
    .map((row) => `${bindingToken(row)}=${row.target}`)
  return parts.length ? parts.join(',') : null
}

/** Known infusion ids with legacy replicate_* collapsed to replicate_magic_item (keeps multiplicity). */
export function listKnownInfusionIds(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): string[] {
  return getFeaturePickList(featurePicks, classEntryId, 'infuse_item').map(
    normalizeKnownInfusionId,
  )
}

export function countKnownInfusion(
  featurePicks: FeaturePicksState,
  classEntryId: string,
  infusionId: string,
): number {
  const want = normalizeKnownInfusionId(infusionId)
  return listKnownInfusionIds(featurePicks, classEntryId).filter((id) => id === want)
    .length
}

export function listKnownInfusions(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): ArtificerInfusionDef[] {
  const seen = new Set<string>()
  const rows: ArtificerInfusionDef[] = []
  for (const id of listKnownInfusionIds(featurePicks, classEntryId)) {
    if (seen.has(id)) continue
    seen.add(id)
    const def = infusionById(id)
    if (def) rows.push(def)
  }
  return rows
}

export function listActiveInfusionIds(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): string[] {
  return listActiveInfusionBindings(featurePicks, classEntryId).map(
    (row) => row.infusionId,
  )
}

/** Active infusions with target (self or ally) + optional replicate item. */
export function listActiveInfusionBindings(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): ActiveInfusionBinding[] {
  const knownCounts = new Map<string, number>()
  for (const id of listKnownInfusionIds(featurePicks, classEntryId)) {
    knownCounts.set(id, (knownCounts.get(id) ?? 0) + 1)
  }
  const usedCounts = new Map<string, number>()
  const targets = parseTargetMap(
    getFeaturePick(
      featurePicks,
      classEntryId,
      INFUSIONS_ACTIVE_TARGETS_FEATURE_ID,
    ),
  )
  const out: ActiveInfusionBinding[] = []
  for (const token of getFeaturePickList(
    featurePicks,
    classEntryId,
    INFUSIONS_ACTIVE_FEATURE_ID,
  )) {
    const binding = parseActiveToken(token)
    const knownId = binding.infusionId
    if (!knownCounts.has(knownId)) continue
    const used = usedCounts.get(knownId) ?? 0
    if (used >= (knownCounts.get(knownId) ?? 0)) continue
    usedCounts.set(knownId, used + 1)
    // Drop replicate rows without a valid item slug.
    if (knownId === REPLICATE_MAGIC_ITEM_ID) {
      if (!binding.replicateItemSlug || !replicateItemBySlug(binding.replicateItemSlug)) {
        continue
      }
    }
    out.push({
      ...binding,
      target: targets.get(token) ?? targets.get(knownId) ?? 'self',
    })
  }
  return out
}

export function setActiveInfusions(
  featurePicks: FeaturePicksState,
  classEntryId: string,
  activeIds: string[],
): FeaturePicksState {
  return setActiveInfusionBindings(
    featurePicks,
    classEntryId,
    activeIds.map((raw) => {
      const parsed = parseReplicateItemRef(raw)
      if (parsed) {
        return {
          infusionId: REPLICATE_MAGIC_ITEM_ID,
          target: 'self' as const,
          replicateItemSlug: parsed.slug,
        }
      }
      return { infusionId: raw, target: 'self' as const, replicateItemSlug: null }
    }),
  )
}

export function setActiveInfusionBindings(
  featurePicks: FeaturePicksState,
  classEntryId: string,
  bindings: ActiveInfusionBinding[],
): FeaturePicksState {
  const knownCounts = new Map<string, number>()
  for (const id of listKnownInfusionIds(featurePicks, classEntryId)) {
    knownCounts.set(id, (knownCounts.get(id) ?? 0) + 1)
  }
  const usedCounts = new Map<string, number>()
  const cleaned: ActiveInfusionBinding[] = []
  for (const row of bindings) {
    const id = normalizeKnownInfusionId(row.infusionId)
    const known = knownCounts.get(id) ?? 0
    if (!known) continue
    const used = usedCounts.get(id) ?? 0
    if (used >= known) continue
    if (id === REPLICATE_MAGIC_ITEM_ID) {
      const slug = row.replicateItemSlug?.trim()
      if (!slug || !replicateItemBySlug(slug)) continue
      cleaned.push({
        infusionId: REPLICATE_MAGIC_ITEM_ID,
        target: row.target || 'self',
        replicateItemSlug: slug,
      })
    } else {
      cleaned.push({
        infusionId: id,
        target: row.target || 'self',
        replicateItemSlug: null,
      })
    }
    usedCounts.set(id, used + 1)
  }
  const tokens = cleaned.map(bindingToken)
  let next = setFeaturePick(
    featurePicks,
    classEntryId,
    INFUSIONS_ACTIVE_FEATURE_ID,
    tokens.length ? tokens.join(',') : null,
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

/** How many active replicate copies are already slotted. */
export function countActiveReplicate(
  bindings: ActiveInfusionBinding[],
): number {
  return bindings.filter((row) => row.infusionId === REPLICATE_MAGIC_ITEM_ID).length
}
