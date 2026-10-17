import type { UnlockedFeature } from './classFeatures'

/** Option in the Soulknife psionic energy dice spend picker. */
export type PsiSpendOption = {
  key: string
  featureId: string
  classEntryId: string
  nameRu: string
  summaryRu: string
  cost: number
  via: 'shared_pool' | 'linked'
}

const PSI_POOL_TRACKERS = new Set(['psionic_power'])

/** Die size label from Psionic Power scale (к6…к12). */
export function psionicDieLabel(
  features: UnlockedFeature[],
  classEntryId: string,
): string | null {
  const power = features.find(
    (f) =>
      f.classEntryId === classEntryId &&
      f.id === 'psionic_power' &&
      f.scaleValue,
  )
  return power?.scaleValue ?? null
}

export function psiSharedSpendCost(feature: UnlockedFeature): number {
  return Math.max(1, Math.floor(feature.resource?.spend_cost ?? 1))
}

export function psiLinkedSpendCost(feature: UnlockedFeature): number | null {
  const linked = feature.resource?.linked_spend
  if (!linked || linked.pool_id !== 'psionic_energy_dice') return null
  if (typeof linked.amount !== 'number') return null
  return Math.max(1, Math.floor(linked.amount))
}

/**
 * Build psi-dice spend options from unlocked Soulknife features.
 * - Shared-pool options (Knack, Whispers, Homing, Teleport).
 * - Linked options with explicit amount (Veil reuse, Rend Mind reuse).
 */
export function listPsiSpendOptions(features: UnlockedFeature[]): PsiSpendOption[] {
  const rows: PsiSpendOption[] = []

  for (const feature of features) {
    const resource = feature.resource
    if (!resource?.pool_id) continue

    if (resource.pool_id === 'psionic_energy_dice') {
      if (PSI_POOL_TRACKERS.has(feature.id)) continue
      rows.push({
        key: `${feature.classEntryId}:${feature.id}`,
        featureId: feature.id,
        classEntryId: feature.classEntryId,
        nameRu: feature.name_ru,
        summaryRu: feature.summary_ru || feature.kind,
        cost: psiSharedSpendCost(feature),
        via: 'shared_pool',
      })
      continue
    }

    const linkedCost = psiLinkedSpendCost(feature)
    if (linkedCost == null) continue
    rows.push({
      key: `${feature.classEntryId}:${feature.id}`,
      featureId: feature.id,
      classEntryId: feature.classEntryId,
      nameRu: feature.name_ru,
      summaryRu: feature.summary_ru || feature.kind,
      cost: linkedCost,
      via: 'linked',
    })
  }

  return rows
}
