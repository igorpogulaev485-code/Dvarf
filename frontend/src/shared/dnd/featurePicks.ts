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

export function toggleFeaturePickInList(
  picks: FeaturePicksState,
  classEntryId: string,
  featureId: string,
  optionId: string,
  maxPicks: number,
): FeaturePicksState {
  const current = getFeaturePickList(picks, classEntryId, featureId)
  const exists = current.includes(optionId)
  let nextList: string[]
  if (exists) {
    nextList = current.filter((item) => item !== optionId)
  } else if (current.length >= maxPicks) {
    nextList = [...current.slice(1), optionId]
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
