import type { UnlockedFeature } from './classFeatures'

/** Option shown in the Ki spend picker (desk + features). */
export type KiSpendOption = {
  key: string
  featureId: string
  classEntryId: string
  nameRu: string
  summaryRu: string
  cost: number
  costMax?: number
  /** How to apply: shared ki pool vs linked_spend on a stub pool. */
  via: 'shared_pool' | 'linked'
}

const KI_POOL_TRACKERS = new Set(['ki', 'perfect_self'])

/** Cost for a feature that spends from the shared Ki pool. */
export function kiSharedSpendCost(feature: UnlockedFeature): number {
  return Math.max(1, Math.floor(feature.resource?.spend_cost ?? 1))
}

/** Cost range for a feature that pays Ki via linked_spend. */
export function kiLinkedSpendCost(feature: UnlockedFeature): {
  cost: number
  costMax?: number
} | null {
  const linked = feature.resource?.linked_spend
  if (!linked || linked.pool_id !== 'ki') return null
  // Require explicit amount so vague “ки (см. описание)” stubs stay out of the picker.
  if (typeof linked.amount !== 'number') return null
  const cost = Math.max(1, Math.floor(linked.amount))
  const costMax =
    typeof linked.amount_max === 'number'
      ? Math.max(cost, Math.floor(linked.amount_max))
      : undefined
  return { cost, costMax }
}

/**
 * Build Ki spend options from unlocked monk features.
 * - Class options share `pool_id: ki` (Flurry, Stun, …).
 * - Tradition options usually use `linked_spend` → ki.
 * - Empty Body expands into invisibility (4) and astral (8).
 */
export function listKiSpendOptions(features: UnlockedFeature[]): KiSpendOption[] {
  const rows: KiSpendOption[] = []

  for (const feature of features) {
    const resource = feature.resource
    if (!resource?.pool_id) continue

    if (resource.pool_id === 'ki') {
      if (KI_POOL_TRACKERS.has(feature.id)) continue

      if (feature.id === 'empty_body') {
        rows.push({
          key: `${feature.classEntryId}:empty_body`,
          featureId: feature.id,
          classEntryId: feature.classEntryId,
          nameRu: 'Пустое тело (невидимость)',
          summaryRu:
            '4 ки → невидимость 1 мин (+сопротивление всем уронам кроме силового).',
          cost: 4,
          via: 'shared_pool',
        })
        rows.push({
          key: `${feature.classEntryId}:empty_body_astral`,
          featureId: feature.id,
          classEntryId: feature.classEntryId,
          nameRu: 'Пустое тело (астрал)',
          summaryRu: '8 ки → проекция в астрал.',
          cost: 8,
          via: 'shared_pool',
        })
        continue
      }

      rows.push({
        key: `${feature.classEntryId}:${feature.id}`,
        featureId: feature.id,
        classEntryId: feature.classEntryId,
        nameRu: feature.name_ru,
        summaryRu: feature.summary_ru || feature.kind,
        cost: kiSharedSpendCost(feature),
        via: 'shared_pool',
      })
      continue
    }

    const linked = kiLinkedSpendCost(feature)
    if (!linked) continue
    rows.push({
      key: `${feature.classEntryId}:${feature.id}`,
      featureId: feature.id,
      classEntryId: feature.classEntryId,
      nameRu: feature.name_ru,
      summaryRu: feature.summary_ru || feature.kind,
      cost: linked.cost,
      costMax: linked.costMax,
      via: 'linked',
    })
  }

  return rows
}
