/** B20: единый индикатор «Нужно настроить: N» в шапке листа. */

import { asiAlreadyApplied, isAsiFeature } from '../../shared/dnd/classAsi'
import type { AppliedClassAsi } from '../../shared/dnd/classAsi'
import type { SpellLearnBudget } from '../../shared/dnd/casterProgression'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import {
  buildPendingWizardSteps,
  isFeatureChoiceComplete,
} from '../../shared/dnd/pendingFeatureChoices'
import { isFeatureActiveForPlay } from '../../shared/dnd/featureReplacement'
import { isCompanionStatEmpty } from './companionAttacks'
import { shouldShowOnCompanionStrip } from './companionBackfill'
import type { CompanionEntry } from './companions'
import { isSelfForm } from './companions'
import {
  countLearnedCantripsBySlug,
  countLearnedLeveledForSlug,
  countPreparedLeveledBySlug,
  type SheetSpell,
} from './spells'

export type NeedsSetupKind =
  | 'feature_choice'
  | 'asi'
  | 'spells'
  | 'alignment'
  | 'companion'

export type NeedsSetupItem = {
  id: string
  kind: NeedsSetupKind
  label: string
  /** featureId / companionId / class slug — for navigation */
  targetId?: string
  classEntryId?: string
}

export function isIncompleteCompanionForSetup(row: CompanionEntry): boolean {
  if (isSelfForm(row)) return false
  return (
    isCompanionStatEmpty(row.stats.ac) ||
    (isCompanionStatEmpty(row.stats.hp) && isCompanionStatEmpty(row.stats.hp_max))
  )
}

export function isAlignmentEmptyForSetup(input: {
  alignment: string
  alignmentText: string
}): boolean {
  const slug = (input.alignment ?? '').trim()
  const text = (input.alignmentText ?? '').trim()
  return !slug && !text
}

/** Same pending rows as B9 «Нужно настроить» + ASI (без subclass-gate без choice). */
export function listPendingFeatureSetupItems(input: {
  unlocked: UnlockedFeature[]
  featurePicks: FeaturePicksState
  classAsi: AppliedClassAsi[]
}): NeedsSetupItem[] {
  const items: NeedsSetupItem[] = []
  const features = [...input.unlocked].sort((a, b) => {
    if (a.classEntryId !== b.classEntryId) {
      return a.classEntryId.localeCompare(b.classEntryId)
    }
    if (a.level !== b.level) return a.level - b.level
    return a.id.localeCompare(b.id)
  })

  for (const feature of features) {
    if (!isFeatureActiveForPlay(feature, input.unlocked, input.featurePicks)) {
      continue
    }
    if (isAsiFeature(feature)) {
      if (asiAlreadyApplied(input.classAsi, feature.classEntryId, feature.id)) continue
      items.push({
        id: `asi:${feature.classEntryId}:${feature.id}`,
        kind: 'asi',
        label: `Увеличение характеристик · ${feature.className} ур. ${feature.level}`,
        targetId: feature.id,
        classEntryId: feature.classEntryId,
      })
      continue
    }
    if (!feature.choice) continue
    if (isFeatureChoiceComplete(feature, input.featurePicks)) continue
    items.push({
      id: `feature:${feature.classEntryId}:${feature.id}`,
      kind: 'feature_choice',
      label: `${feature.name_ru} · ${feature.className}`,
      targetId: feature.id,
      classEntryId: feature.classEntryId,
    })
  }
  return items
}

/**
 * Невыбранные заклинания до лимита класса:
 * подготовка / известные уровневые / заговоры (бюджет > 0).
 */
export function listSpellSetupItems(input: {
  learnBudgets: SpellLearnBudget[]
  known: SheetSpell[]
}): NeedsSetupItem[] {
  const items: NeedsSetupItem[] = []
  const preparedBySlug = countPreparedLeveledBySlug(input.known)
  const cantripsBySlug = countLearnedCantripsBySlug(input.known)

  for (const budget of input.learnBudgets) {
    const slug = budget.slug.trim().toLowerCase()
    if (!slug) continue
    const label = budget.labelRu.trim() || slug

    if (budget.maxPrepared != null && budget.maxPrepared > 0) {
      const used = preparedBySlug[slug] ?? 0
      const left = budget.maxPrepared - used
      if (left > 0) {
        items.push({
          id: `spells:prep:${slug}`,
          kind: 'spells',
          label: `${label}: ещё ${left} подготовить`,
          targetId: slug,
        })
      }
    }

    if (budget.leveledKnown != null && budget.leveledKnown > 0) {
      const used = countLearnedLeveledForSlug(input.known, slug)
      const left = budget.leveledKnown - used
      if (left > 0) {
        items.push({
          id: `spells:known:${slug}`,
          kind: 'spells',
          label: `${label}: ещё ${left} известных`,
          targetId: slug,
        })
      }
    }

    if (budget.cantrips > 0) {
      const used = cantripsBySlug[slug] ?? 0
      const left = budget.cantrips - used
      if (left > 0) {
        items.push({
          id: `spells:cantrip:${slug}`,
          kind: 'spells',
          label: `${label}: ещё ${left} заговор${left === 1 ? '' : left < 5 ? 'а' : 'ов'}`,
          targetId: slug,
        })
      }
    }
  }
  return items
}

export function listCompanionSetupItems(
  companions: CompanionEntry[],
): NeedsSetupItem[] {
  return companions
    .filter((row) => shouldShowOnCompanionStrip(row) && isIncompleteCompanionForSetup(row))
    .map((row) => ({
      id: `companion:${row.id}`,
      kind: 'companion' as const,
      label: `${row.name.trim() || 'Напарник'}: нет ХП или КД`,
      targetId: row.id,
    }))
}

export function buildNeedsSetupItems(input: {
  unlocked: UnlockedFeature[]
  featurePicks: FeaturePicksState
  classAsi: AppliedClassAsi[]
  learnBudgets: SpellLearnBudget[]
  known: SheetSpell[]
  alignment: string
  alignmentText: string
  companions: CompanionEntry[]
}): NeedsSetupItem[] {
  const items: NeedsSetupItem[] = [
    ...listPendingFeatureSetupItems({
      unlocked: input.unlocked,
      featurePicks: input.featurePicks,
      classAsi: input.classAsi,
    }),
    ...listSpellSetupItems({
      learnBudgets: input.learnBudgets,
      known: input.known,
    }),
  ]
  if (
    isAlignmentEmptyForSetup({
      alignment: input.alignment,
      alignmentText: input.alignmentText,
    })
  ) {
    items.push({
      id: 'alignment',
      kind: 'alignment',
      label: 'Мировоззрение не задано',
    })
  }
  items.push(...listCompanionSetupItems(input.companions))
  return items
}

/** Sanity: wizard steps for empty picks should stay in sync with feature items. */
export function pendingFeatureSetupCountViaWizard(input: {
  unlocked: UnlockedFeature[]
  featurePicks: FeaturePicksState
  classAsi: AppliedClassAsi[]
  hasSubclassByEntryId: Record<string, boolean>
}): number {
  return buildPendingWizardSteps({
    unlocked: input.unlocked,
    featurePicks: input.featurePicks,
    classAsi: input.classAsi,
    filter: { mode: 'all_empty' },
    hasSubclassByEntryId: input.hasSubclassByEntryId,
  }).filter((step) => step.kind === 'feature_choice' || step.kind === 'asi').length
}
