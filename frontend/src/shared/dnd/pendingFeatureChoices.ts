/** Build guided-wizard queue from unlocked features + ASI ledger. */

import {
  asiAlreadyApplied,
  isAsiFeature,
  type AppliedClassAsi,
} from './classAsi'
import {
  resolveChoiceMaxPicks,
  type FeatureChoiceDef,
  type UnlockedFeature,
} from './classFeatures'
import { isExpertiseChoice } from './expertise'
import { isFeatureActiveForPlay } from './featureReplacement'
import {
  getFeaturePick,
  getFeaturePickList,
  type FeaturePicksState,
} from './featurePicks'

export type GuidedWizardStep =
  | {
      id: string
      kind: 'class_grant'
      classEntryId: string
      className: string
      mode: 'start' | 'multiclass'
    }
  | {
      id: string
      kind: 'feature_choice'
      classEntryId: string
      className: string
      classLevel: number
      featureId: string
      featureNameRu: string
      featureLevel: number
      choice: FeatureChoiceDef
    }
  | {
      id: string
      kind: 'asi'
      classEntryId: string
      className: string
      classLevel: number
      featureId: string
    }
  | {
      id: string
      kind: 'subclass'
      classEntryId: string
      className: string
      featureId: string
      featureNameRu: string
      promptRu: string
    }
  | {
      id: string
      kind: 'background'
      promptRu: string
    }
  | {
      id: string
      kind: 'feat'
      promptRu: string
      noteRu: string | null
    }
  | {
      id: string
      kind: 'spellbook_picks'
      classEntryId: string
      className: string
      classLevel: number
      /** How many free research fills to pick in this step (6 at L1, +2 per level). */
      picksNeeded: number
    }
  | {
      id: string
      kind: 'pact_tome_cantrips'
      classEntryId: string
      className: string
      classLevel: number
    }

export function backgroundWizardStep(): GuidedWizardStep {
  return {
    id: 'background',
    kind: 'background',
    promptRu:
      'Сначала предыстория (прошлое): навыки и владения лягут на лист. Потом класс — возьмёшь другие навыки, без дублей.',
  }
}

export function featWizardStep(input: { noteRu: string | null }): GuidedWizardStep {
  return {
    id: 'feat',
    kind: 'feat',
    promptRu:
      'Эта раса даёт черту с 1 уровня. Выбери её из каталога — гранты лягут на лист.',
    noteRu: input.noteRu,
  }
}

const WIZARD_CLASS_RE = /волшебник|wizard|маг/i

export function isWizardClassName(name: string): boolean {
  return WIZARD_CLASS_RE.test(name.trim())
}

/** Free spellbook research picks for a guided-wizard step. */
export function wizardSpellbookPicksStep(input: {
  classEntryId: string
  className: string
  classLevel: number
  picksNeeded: number
}): Extract<GuidedWizardStep, { kind: 'spellbook_picks' }> | null {
  const picks = Math.max(0, Math.floor(input.picksNeeded))
  if (picks <= 0) return null
  if (!isWizardClassName(input.className)) return null
  const level = Math.max(1, Math.floor(input.classLevel) || 1)
  return {
    id: `spellbook-picks:${input.classEntryId}:${level}:${picks}`,
    kind: 'spellbook_picks',
    classEntryId: input.classEntryId,
    className: input.className.trim() || 'Волшебник',
    classLevel: level,
    picksNeeded: picks,
  }
}

/**
 * Insert spellbook picks after subclass (if any), else at the front —
 * so the player fills the book as part of the same level-up fork queue.
 */
export function withWizardSpellbookPicksStep(
  steps: GuidedWizardStep[],
  input: {
    classEntryId: string
    className: string
    classLevel: number
    picksNeeded: number
  },
): GuidedWizardStep[] {
  const step = wizardSpellbookPicksStep(input)
  if (!step) return steps
  if (
    steps.some(
      (row) =>
        row.kind === 'spellbook_picks' &&
        row.classEntryId === step.classEntryId &&
        row.classLevel === step.classLevel,
    )
  ) {
    return steps
  }
  const subclassIdx = steps.findIndex((row) => row.kind === 'subclass')
  if (subclassIdx >= 0) {
    return [
      ...steps.slice(0, subclassIdx + 1),
      step,
      ...steps.slice(subclassIdx + 1),
    ]
  }
  return [step, ...steps]
}

/** Put background before class_grant / choices when create still has no background. */
export function withBackgroundStepIfNeeded(
  steps: GuidedWizardStep[],
  input: { include: boolean },
): GuidedWizardStep[] {
  if (!input.include) return steps
  if (steps.some((step) => step.kind === 'background')) return steps
  return [backgroundWizardStep(), ...steps]
}

export type PendingChoiceFilter =
  | { mode: 'all_empty' }
  | {
      mode: 'at_class_level'
      classEntryId: string
      classLevel: number
    }
  /** All incomplete picks for a class with feature.level ≤ maxClassLevel (start at N). */
  | {
      mode: 'up_to_class_level'
      classEntryId: string
      maxClassLevel: number
    }

function stepIdForFeature(feature: UnlockedFeature, kind: string): string {
  return `${kind}:${feature.classEntryId}:${feature.id}`
}

export function isFeatureChoiceComplete(
  feature: UnlockedFeature,
  featurePicks: FeaturePicksState,
): boolean {
  const choice = feature.choice
  if (!choice) return true
  const maxPicks = resolveChoiceMaxPicks(choice, feature.classLevel)
  const multi = maxPicks > 1 || Boolean(choice.max_picks_by_level)
  if (multi) {
    return getFeaturePickList(featurePicks, feature.classEntryId, feature.id).length >= maxPicks
  }
  return Boolean(getFeaturePick(featurePicks, feature.classEntryId, feature.id))
}

/** Archetype / patron gate features without a choice block. */
export function isSubclassGateFeature(feature: Pick<UnlockedFeature, 'choice' | 'name_en' | 'id' | 'source'>): boolean {
  if (feature.source !== 'class') return false
  if (feature.choice) return false
  const en = (feature.name_en ?? '').toLowerCase()
  if (
    en.includes('archetype') ||
    en.includes('patron') ||
    en.includes('college') ||
    en.includes('divine domain') ||
    en.includes('sacred oath') ||
    en.includes('druid circle') ||
    en.includes('monastic tradition') ||
    en.includes('sorcerous origin') ||
    en.includes('otherworldly') ||
    en.includes('primal path') ||
    en.includes('arcane tradition') ||
    en.includes('artificer specialist')
  ) {
    return true
  }
  return (
    feature.id === 'otherworldly_patron' ||
    feature.id === 'primal_path' ||
    feature.id === 'arcane_tradition' ||
    feature.id === 'artificer_specialist' ||
    feature.id.endsWith('_archetype') ||
    feature.id.includes('patron')
  )
}

function matchesFilter(feature: UnlockedFeature, filter: PendingChoiceFilter): boolean {
  if (filter.mode === 'all_empty') return true
  if (filter.mode === 'up_to_class_level') {
    return (
      feature.classEntryId === filter.classEntryId &&
      feature.level <= filter.maxClassLevel
    )
  }
  return (
    feature.classEntryId === filter.classEntryId &&
    feature.level === filter.classLevel
  )
}

export function buildPendingWizardSteps(input: {
  unlocked: UnlockedFeature[]
  featurePicks: FeaturePicksState
  classAsi: AppliedClassAsi[]
  filter: PendingChoiceFilter
  /** classEntryId → has subclass selected */
  hasSubclassByEntryId: Record<string, boolean>
}): GuidedWizardStep[] {
  const steps: GuidedWizardStep[] = []
  const seen = new Set<string>()

  // Stable order: subclass gates → feature choices (expertise first) → ASI
  const features = [...input.unlocked].sort((a, b) => {
    if (a.classEntryId !== b.classEntryId) return a.classEntryId.localeCompare(b.classEntryId)
    if (a.level !== b.level) return a.level - b.level
    const aExp = isExpertiseChoice(a.choice) ? 0 : 1
    const bExp = isExpertiseChoice(b.choice) ? 0 : 1
    if (aExp !== bExp) return aExp - bExp
    return a.id.localeCompare(b.id)
  })

  for (const feature of features) {
    if (!matchesFilter(feature, input.filter)) continue
    // B4: skip PHB rows replaced by Tasha and untaken optional alternatives.
    if (
      !isSubclassGateFeature(feature) &&
      !isFeatureActiveForPlay(feature, input.unlocked, input.featurePicks)
    ) {
      continue
    }

    if (isSubclassGateFeature(feature)) {
      if (input.hasSubclassByEntryId[feature.classEntryId]) continue
      const id = stepIdForFeature(feature, 'subclass')
      if (seen.has(id)) continue
      seen.add(id)
      steps.push({
        id,
        kind: 'subclass',
        classEntryId: feature.classEntryId,
        className: feature.className,
        featureId: feature.id,
        featureNameRu: feature.name_ru,
        promptRu: `Выбери «${feature.name_ru}» — без архетипа часть умений этого уровня не откроется.`,
      })
      continue
    }

    if (isAsiFeature(feature)) {
      if (asiAlreadyApplied(input.classAsi, feature.classEntryId, feature.id)) continue
      const id = stepIdForFeature(feature, 'asi')
      if (seen.has(id)) continue
      seen.add(id)
      steps.push({
        id,
        kind: 'asi',
        classEntryId: feature.classEntryId,
        className: feature.className,
        // Ledger / −1 level: level when ASI was gained (4/8/12…), not current class level.
        classLevel: feature.level,
        featureId: feature.id,
      })
      continue
    }

    if (!feature.choice) continue
    if (isFeatureChoiceComplete(feature, input.featurePicks)) continue
    const id = stepIdForFeature(feature, 'feature_choice')
    if (seen.has(id)) continue
    seen.add(id)
    steps.push({
      id,
      kind: 'feature_choice',
      classEntryId: feature.classEntryId,
      className: feature.className,
      classLevel: feature.classLevel,
      featureId: feature.id,
      featureNameRu: feature.name_ru,
      featureLevel: feature.level,
      choice: feature.choice,
    })
  }

  return steps
}

/** Expertise feature keys currently unlocked (for sync/revoke). */
export function listUnlockedExpertiseKeys(
  unlocked: UnlockedFeature[],
): Array<{ classEntryId: string; featureId: string }> {
  return unlocked
    .filter((feature) => isExpertiseChoice(feature.choice))
    .map((feature) => ({
      classEntryId: feature.classEntryId,
      featureId: feature.id,
    }))
}

/** Drop feature_picks for class features above newLevel (level-down). */
export function clearFeaturePicksAboveClassLevel(input: {
  featurePicks: FeaturePicksState
  classEntryId: string
  /** All known features for this class (unlocked at any level we care about). */
  features: Array<{ id: string; level: number }>
  newClassLevel: number
}): FeaturePicksState {
  const prefix = `${input.classEntryId}:`
  const dropIds = new Set(
    input.features
      .filter((feature) => feature.level > input.newClassLevel)
      .map((feature) => feature.id),
  )
  if (dropIds.size === 0) return input.featurePicks
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(input.featurePicks.values)) {
    if (!key.startsWith(prefix)) {
      next[key] = value
      continue
    }
    const featureId = key.slice(prefix.length)
    if (dropIds.has(featureId)) continue
    next[key] = value
  }
  return { values: next }
}
