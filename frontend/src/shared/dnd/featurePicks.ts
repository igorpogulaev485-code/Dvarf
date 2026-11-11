/** Persistent picks for class features (fighting style, toggles, etc.). */

import { fightingStyleById } from './fightingStyles'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export type FeaturePicksState = {
  /** Key: `${classEntryId}:${featureId}` → selected option id or "on"/"off". */
  values: Record<string, string>
}

export function emptyFeaturePicks(): FeaturePicksState {
  return { values: {} }
}

export function featurePickKey(classEntryId: string, featureId: string): string {
  return `${classEntryId}:${featureId}`
}

export function readFeaturePicks(raw: unknown): FeaturePicksState {
  const root = asRecord(raw)
  const valuesRaw = asRecord(root.values ?? root)
  const values: Record<string, string> = {}
  for (const [key, value] of Object.entries(valuesRaw)) {
    if (typeof value === 'string' && value.trim()) values[key] = value.trim()
    else if (value === true) values[key] = 'on'
  }
  return { values }
}

export function featurePicksToSheet(picks: FeaturePicksState): FeaturePicksState {
  return { values: { ...picks.values } }
}

export function getFeaturePick(
  picks: FeaturePicksState,
  classEntryId: string,
  featureId: string,
): string | null {
  const value = picks.values[featurePickKey(classEntryId, featureId)]
  return value && value.trim() ? value : null
}

export function getFeaturePickList(
  picks: FeaturePicksState,
  classEntryId: string,
  featureId: string,
): string[] {
  const raw = getFeaturePick(picks, classEntryId, featureId)
  if (!raw) return []
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function setFeaturePick(
  picks: FeaturePicksState,
  classEntryId: string,
  featureId: string,
  value: string | null,
): FeaturePicksState {
  const key = featurePickKey(classEntryId, featureId)
  const next = { ...picks.values }
  if (!value || !value.trim()) delete next[key]
  else next[key] = value.trim()
  return { values: next }
}

/** Drop picks for a class entry (e.g. subclass swap / class removed). */
export function clearFeaturePicksForClass(
  picks: FeaturePicksState,
  classEntryId: string,
): FeaturePicksState {
  const prefix = `${classEntryId}:`
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(picks.values)) {
    if (!key.startsWith(prefix)) next[key] = value
  }
  return { values: next }
}

/** Drop picks for specific feature ids on a class entry. */
export function clearFeaturePicksForFeatureIds(
  picks: FeaturePicksState,
  classEntryId: string,
  featureIds: Iterable<string>,
): FeaturePicksState {
  const drop = new Set(featureIds)
  if (drop.size === 0) return picks
  const prefix = `${classEntryId}:`
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(picks.values)) {
    if (key.startsWith(prefix) && drop.has(key.slice(prefix.length))) continue
    next[key] = value
  }
  return { values: next }
}

/**
 * Multi-select chips: click toggles membership.
 * When the list is already full, clicking a new option is ignored —
 * deselect one first, then pick a replacement (no FIFO eviction).
 * Single-select (maxPicks === 1): clicking another option replaces the current.
 *
 * `stackable`: option may appear multiple times (Replicate Magic Item).
 * Click removes one occurrence; use `addFeaturePickToList` to add another.
 */
export function toggleFeaturePickInList(
  picks: FeaturePicksState,
  classEntryId: string,
  featureId: string,
  optionId: string,
  maxPicks: number,
  opts?: { stackable?: boolean },
): FeaturePicksState {
  const current = getFeaturePickList(picks, classEntryId, featureId)
  if (opts?.stackable) {
    const idx = current.lastIndexOf(optionId)
    let nextList: string[]
    if (idx >= 0) {
      nextList = current.filter((_, i) => i !== idx)
    } else if (maxPicks <= 1) {
      nextList = [optionId]
    } else if (current.length >= maxPicks) {
      nextList = current
    } else {
      nextList = [...current, optionId]
    }
    return setFeaturePick(
      picks,
      classEntryId,
      featureId,
      nextList.length ? nextList.join(',') : null,
    )
  }
  const exists = current.includes(optionId)
  let nextList: string[]
  if (exists) {
    nextList = current.filter((item) => item !== optionId)
  } else if (maxPicks <= 1) {
    nextList = [optionId]
  } else if (current.length >= maxPicks) {
    nextList = current
  } else {
    nextList = [...current, optionId]
  }
  return setFeaturePick(
    picks,
    classEntryId,
    featureId,
    nextList.length ? nextList.join(',') : null,
  )
}

/** Add one more stackable option (e.g. second Replicate Magic Item known). */
export function addFeaturePickToList(
  picks: FeaturePicksState,
  classEntryId: string,
  featureId: string,
  optionId: string,
  maxPicks: number,
): FeaturePicksState {
  const current = getFeaturePickList(picks, classEntryId, featureId)
  if (current.length >= maxPicks) return picks
  return setFeaturePick(
    picks,
    classEntryId,
    featureId,
    [...current, optionId].join(','),
  )
}

/**
 * Feature ids whose pick is a fighting style.
 * Earlier ids win when the same style was stored twice (champion's second style).
 */
export const FIGHTING_STYLE_FEATURE_IDS = [
  'fighting_style',
  'fighting_style_fighter',
  'fighting_style_paladin',
  'fighting_style_ranger',
  'bonus_proficiencies_swords',
  'additional_fighting_style',
] as const

function fightingStyleFeatureRank(featureId: string): number {
  const index = FIGHTING_STYLE_FEATURE_IDS.indexOf(
    featureId as (typeof FIGHTING_STYLE_FEATURE_IDS)[number],
  )
  return index < 0 ? FIGHTING_STYLE_FEATURE_IDS.length : index
}

export function isFightingStyleFeatureId(featureId: string): boolean {
  return (FIGHTING_STYLE_FEATURE_IDS as readonly string[]).includes(featureId)
}

function featureIdFromPickKey(key: string): string {
  return key.split(':').slice(1).join(':')
}

function classEntryIdFromPickKey(key: string, featureId: string): string {
  return key.slice(0, Math.max(0, key.length - featureId.length - 1))
}

/** Every fighting style currently stored, in feature priority order. */
export function listFightingStyleIds(picks: FeaturePicksState): string[] {
  const keys = Object.keys(picks.values).sort((a, b) => {
    const rank = fightingStyleFeatureRank(featureIdFromPickKey(a)) - fightingStyleFeatureRank(featureIdFromPickKey(b))
    return rank !== 0 ? rank : a.localeCompare(b)
  })
  const ids: string[] = []
  for (const key of keys) {
    const featureId = featureIdFromPickKey(key)
    if (!isFightingStyleFeatureId(featureId)) continue
    for (const part of (picks.values[key] ?? '').split(',')) {
      const id = part.trim()
      if (fightingStyleById(id) && !ids.includes(id)) ids.push(id)
    }
  }
  return ids
}

/**
 * Styles already taken on other features. The current feature keeps its own pick
 * visible so the player can see it, but cannot select it on a second card.
 */
export function fightingStylesTakenElsewhere(
  picks: FeaturePicksState,
  except: { classEntryId: string; featureId: string },
): Set<string> {
  const taken = new Set<string>()
  const exceptKey = `${except.classEntryId}:${except.featureId}`
  for (const [key, value] of Object.entries(picks.values)) {
    if (key === exceptKey) continue
    const featureId = featureIdFromPickKey(key)
    if (!isFightingStyleFeatureId(featureId)) continue
    for (const part of value.split(',')) {
      const id = part.trim()
      if (fightingStyleById(id)) taken.add(id)
    }
  }
  return taken
}

/**
 * A style can be taken once per character, including another class
 * (College of Swords, paladin, ranger).
 */
export function dropDuplicateFightingStyles(picks: FeaturePicksState): FeaturePicksState {
  const seen = new Set<string>()
  let next = picks
  const keys = Object.keys(picks.values).sort((a, b) => {
    const rank = fightingStyleFeatureRank(featureIdFromPickKey(a)) - fightingStyleFeatureRank(featureIdFromPickKey(b))
    return rank !== 0 ? rank : a.localeCompare(b)
  })
  for (const key of keys) {
    const featureId = featureIdFromPickKey(key)
    if (!isFightingStyleFeatureId(featureId)) continue
    const classEntryId = classEntryIdFromPickKey(key, featureId)
    const raw = picks.values[key] ?? ''
    const kept: string[] = []
    for (const part of raw.split(',')) {
      const id = part.trim()
      if (!id) continue
      if (!fightingStyleById(id)) {
        kept.push(id)
        continue
      }
      if (seen.has(id)) continue
      seen.add(id)
      kept.push(id)
    }
    const value = kept.join(',')
    if (value !== raw) {
      next = setFeaturePick(next, classEntryId, featureId, value || null)
    }
  }
  return next
}

/** First fighting-style pick across class entries (Defense AC, etc.). */
export function findFightingStylePick(
  picks: FeaturePicksState,
  featureIds: string[] = [...FIGHTING_STYLE_FEATURE_IDS],
): string | null {
  const wanted = new Set(featureIds)
  const keys = Object.keys(picks.values).sort((a, b) => {
    const rank =
      fightingStyleFeatureRank(featureIdFromPickKey(a)) -
      fightingStyleFeatureRank(featureIdFromPickKey(b))
    return rank !== 0 ? rank : a.localeCompare(b)
  })
  for (const key of keys) {
    const featureId = featureIdFromPickKey(key)
    if (!wanted.has(featureId)) continue
    const first = (picks.values[key] ?? '').split(',')[0]?.trim()
    if (first) return first
  }
  return null
}
