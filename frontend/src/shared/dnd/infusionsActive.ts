/**
 * Known vs active Artificer infusions.
 * Active bindings may target self or a lobby ally.
 *
 * Replicate Magic Item (RAW): known id already includes the chosen item
 * (`replicate_magic_item:<slug>[~N]`). Activation only toggles that known slot.
 */

import {
  addFeaturePickToList,
  getFeaturePick,
  getFeaturePickList,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'
import {
  formatReplicateKnownId,
  infusionById,
  infusedItemCount,
  nextReplicateInstance,
  normalizeKnownInfusionId,
  parseReplicateItemRef,
  REPLICATE_MAGIC_ITEM_ID,
  replicateItemBySlug,
  type ArtificerInfusionDef,
} from './artificerInfusions'

export const INFUSIONS_ACTIVE_FEATURE_ID = 'infusions_active'
export const INFUSIONS_ACTIVE_TARGETS_FEATURE_ID = 'infusions_active_targets'

export type InfusionTargetRef = 'self' | string

export type ActiveInfusionBinding = {
  /** Exact known pick id (may be `replicate_magic_item:bag_of_holding`). */
  infusionId: string
  target: InfusionTargetRef
  /** Derived from infusionId for replicate; kept for callers/effects. */
  replicateItemSlug?: string | null
}

function slugFromId(infusionId: string): string | null {
  return parseReplicateItemRef(infusionId)?.slug ?? null
}

/** Known ids with legacy replicate_* → replicate_magic_item:<slug>. */
export function listKnownInfusionIds(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): string[] {
  const out: string[] = []
  for (const raw of getFeaturePickList(featurePicks, classEntryId, 'infuse_item')) {
    const id = normalizeKnownInfusionId(raw)
    if (id) out.push(id)
  }
  return out
}

export function countKnownInfusion(
  featurePicks: FeaturePicksState,
  classEntryId: string,
  infusionId: string,
): number {
  const want = normalizeKnownInfusionId(infusionId) ?? infusionId
  return listKnownInfusionIds(featurePicks, classEntryId).filter((id) => id === want)
    .length
}

/** One def per known pick (duplicates kept — two Bags of Holding = two rows). */
export function listKnownInfusions(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): ArtificerInfusionDef[] {
  const rows: ArtificerInfusionDef[] = []
  for (const id of listKnownInfusionIds(featurePicks, classEntryId)) {
    const def = infusionById(id)
    if (def) rows.push(def)
  }
  return rows
}

function parseTargetsOrdered(
  raw: string | null | undefined,
  tokens: string[],
): InfusionTargetRef[] {
  if (!raw?.trim()) return tokens.map(() => 'self')
  // Legacy map: `id=target,id2=target2`
  if (raw.includes('=')) {
    const map = new Map<string, InfusionTargetRef>()
    for (const part of raw.split(',')) {
      const chunk = part.trim()
      if (!chunk) continue
      const eq = chunk.indexOf('=')
      if (eq <= 0) continue
      const id = chunk.slice(0, eq).trim()
      const target = chunk.slice(eq + 1).trim() || 'self'
      if (id) map.set(id, target === 'self' ? 'self' : target)
    }
    return tokens.map((token) => map.get(token) ?? 'self')
  }
  // Parallel list: `self,allyId,self`
  const parts = raw.split(',').map((p) => p.trim())
  return tokens.map((_, i) => {
    const t = parts[i] ?? 'self'
    return !t || t === 'self' ? 'self' : t
  })
}

function serializeTargetsOrdered(bindings: ActiveInfusionBinding[]): string | null {
  if (!bindings.some((row) => row.target && row.target !== 'self')) return null
  return bindings.map((row) => (row.target === 'self' ? 'self' : row.target)).join(',')
}

export function listActiveInfusionIds(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): string[] {
  return listActiveInfusionBindings(featurePicks, classEntryId).map(
    (row) => row.infusionId,
  )
}

export function listActiveInfusionBindings(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): ActiveInfusionBinding[] {
  const known = listKnownInfusionIds(featurePicks, classEntryId)
  const knownAvailable = new Map<string, number>()
  for (const id of known) {
    knownAvailable.set(id, (knownAvailable.get(id) ?? 0) + 1)
  }
  const used = new Map<string, number>()
  const rawTokens = getFeaturePickList(
    featurePicks,
    classEntryId,
    INFUSIONS_ACTIVE_FEATURE_ID,
  )
  const tokens: string[] = []
  for (const raw of rawTokens) {
    const id = normalizeKnownInfusionId(raw)
    if (!id) continue
    const have = knownAvailable.get(id) ?? 0
    const took = used.get(id) ?? 0
    if (took >= have) continue
    used.set(id, took + 1)
    tokens.push(id)
  }
  const targets = parseTargetsOrdered(
    getFeaturePick(
      featurePicks,
      classEntryId,
      INFUSIONS_ACTIVE_TARGETS_FEATURE_ID,
    ),
    tokens,
  )
  return tokens.map((infusionId, i) => ({
    infusionId,
    target: targets[i] ?? 'self',
    replicateItemSlug: slugFromId(infusionId),
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
    activeIds.map((infusionId) => ({
      infusionId,
      target: 'self' as const,
      replicateItemSlug: slugFromId(infusionId),
    })),
  )
}

export function setActiveInfusionBindings(
  featurePicks: FeaturePicksState,
  classEntryId: string,
  bindings: ActiveInfusionBinding[],
): FeaturePicksState {
  const knownAvailable = new Map<string, number>()
  for (const id of listKnownInfusionIds(featurePicks, classEntryId)) {
    knownAvailable.set(id, (knownAvailable.get(id) ?? 0) + 1)
  }
  const used = new Map<string, number>()
  const cleaned: ActiveInfusionBinding[] = []
  for (const row of bindings) {
    const id = normalizeKnownInfusionId(row.infusionId)
    if (!id) continue
    const have = knownAvailable.get(id) ?? 0
    const took = used.get(id) ?? 0
    if (took >= have) continue
    used.set(id, took + 1)
    cleaned.push({
      infusionId: id,
      target: row.target || 'self',
      replicateItemSlug: slugFromId(id),
    })
  }
  const tokens = cleaned.map((row) => row.infusionId)
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
    serializeTargetsOrdered(cleaned),
  )
  return next
}

export function infusionSlotsMax(artificerLevel: number): number {
  return infusedItemCount(artificerLevel)
}

export function infusionCanTargetAlly(def: ArtificerInfusionDef | null): boolean {
  if (!def) return false
  // Homunculus is tied to the artificer's gem — self only.
  if (def.id === 'homunculus_servant') return false
  return true
}

/** True if this option chip is the learn-time Replicate entry (not a concrete item). */
export function isReplicateLearnOption(optionId: string): boolean {
  return optionId === REPLICATE_MAGIC_ITEM_ID
}

/**
 * Learn Replicate Magic Item with a chosen table item (RAW — choose at learn time).
 * Adds `replicate_magic_item:<slug>[~N]` to known infusions.
 */
export function learnReplicateMagicItem(
  featurePicks: FeaturePicksState,
  classEntryId: string,
  featureId: string,
  slug: string,
  maxPicks: number,
): FeaturePicksState {
  if (!replicateItemBySlug(slug)) return featurePicks
  const known = listKnownInfusionIds(featurePicks, classEntryId)
  if (known.length >= maxPicks) return featurePicks
  const instance = nextReplicateInstance(known, slug)
  const token = formatReplicateKnownId(slug, instance)
  return addFeaturePickToList(
    featurePicks,
    classEntryId,
    featureId,
    token,
    maxPicks,
  )
}

/** Remove one known infusion pick (core id or replicate token). */
export function unlearnInfusionPick(
  featurePicks: FeaturePicksState,
  classEntryId: string,
  featureId: string,
  optionId: string,
): FeaturePicksState {
  const current = getFeaturePickList(featurePicks, classEntryId, featureId)
  const want = normalizeKnownInfusionId(optionId) ?? optionId
  const idx = current.findIndex(
    (raw) => raw === optionId || (normalizeKnownInfusionId(raw) ?? raw) === want,
  )
  if (idx < 0) return featurePicks
  const nextList = current.filter((_, i) => i !== idx)
  return setFeaturePick(
    featurePicks,
    classEntryId,
    featureId,
    nextList.length ? nextList.join(',') : null,
  )
}
