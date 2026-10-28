/** Player / DM homebrew abilities on the digital sheet. */

export type CustomFeature = {
  id: string
  nameRu: string
  summaryRu: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function newCustomFeatureId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `custom-${crypto.randomUUID()}`
  }
  return `custom-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

export function readCustomFeatures(raw: unknown): CustomFeature[] {
  if (!Array.isArray(raw)) return []
  const out: CustomFeature[] = []
  for (const item of raw) {
    const row = asRecord(item)
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    const nameRu =
      typeof row.nameRu === 'string'
        ? row.nameRu.trim()
        : typeof row.name_ru === 'string'
          ? row.name_ru.trim()
          : ''
    if (!id || !nameRu) continue
    const summaryRu =
      typeof row.summaryRu === 'string'
        ? row.summaryRu
        : typeof row.summary_ru === 'string'
          ? row.summary_ru
          : ''
    out.push({ id, nameRu, summaryRu })
  }
  return out
}

export function customFeaturesToSheet(
  features: CustomFeature[],
): Record<string, unknown> {
  return {
    custom_features: features.map((row) => ({
      id: row.id,
      nameRu: row.nameRu,
      summaryRu: row.summaryRu,
    })),
  }
}
