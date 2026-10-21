/** Persistent picks for class features (fighting style, toggles, etc.). */

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

/** First fighting-style pick across class entries (Defense AC, etc.). */
export function findFightingStylePick(
  picks: FeaturePicksState,
  featureIds: string[] = [
    'fighting_style_paladin',
    'fighting_style_ranger',
    'fighting_style',
    'fighting_style_fighter',
  ],
): string | null {
  for (const [key, value] of Object.entries(picks.values)) {
    const featureId = key.split(':').slice(1).join(':')
    if (featureIds.includes(featureId) && value) return value
  }
  return null
}
