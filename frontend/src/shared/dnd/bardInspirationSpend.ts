import type { UnlockedFeature } from './classFeatures'

/** Option in the Bardic Inspiration spend picker. */
export type BardicInspirationSpendOption = {
  key: string
  featureId: string
  classEntryId: string
  nameRu: string
  summaryRu: string
  cost: number
}

const BI_POOL_TRACKERS = new Set([
  'bardic_inspiration',
  'font_of_inspiration',
  'superior_inspiration',
])

/** Current inspiration die label from the unlocked BI feature (1к6…1к12). */
export function bardicInspirationDieLabel(
  features: UnlockedFeature[],
  classEntryId: string,
): string | null {
  const bi = features.find(
    (f) =>
      f.classEntryId === classEntryId &&
      f.id === 'bardic_inspiration' &&
      f.scaleValue,
  )
  return bi?.scaleValue ?? null
}

/**
 * Build BI spend options:
 * - always «отдать кость» when BI is unlocked;
 * - college features with linked_spend → bardic_inspiration (explicit amount).
 */
export function listBardicInspirationSpendOptions(
  features: UnlockedFeature[],
): BardicInspirationSpendOption[] {
  const rows: BardicInspirationSpendOption[] = []
  const seenEntries = new Set<string>()

  for (const feature of features) {
    if (feature.id !== 'bardic_inspiration') continue
    if (seenEntries.has(feature.classEntryId)) continue
    seenEntries.add(feature.classEntryId)
    const die = feature.scaleValue ? ` (${feature.scaleValue})` : ''
    rows.push({
      key: `${feature.classEntryId}:give_die`,
      featureId: 'give_bardic_inspiration',
      classEntryId: feature.classEntryId,
      nameRu: `Отдать кость вдохновения${die}`,
      summaryRu:
        'Бонусным действием — союзник в 60 фт. получает кость на атаку, проверку или спасбросок.',
      cost: 1,
    })
  }

  for (const feature of features) {
    if (BI_POOL_TRACKERS.has(feature.id)) continue
    const linked = feature.resource?.linked_spend
    if (!linked || linked.pool_id !== 'bardic_inspiration') continue
    if (typeof linked.amount !== 'number') {
      // Allow legacy linked without amount — treat as 1 die.
      // (We still require pool_id match.)
    }
    const cost = Math.max(1, Math.floor(linked.amount ?? 1))
    rows.push({
      key: `${feature.classEntryId}:${feature.id}`,
      featureId: feature.id,
      classEntryId: feature.classEntryId,
      nameRu: feature.name_ru,
      summaryRu: feature.summary_ru || feature.kind,
      cost,
    })
  }

  return rows
}
