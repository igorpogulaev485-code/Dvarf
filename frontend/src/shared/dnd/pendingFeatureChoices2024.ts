/**
 * P24-M03: 2024 level-up / level-down helpers (guided wizard queue + clearing).
 * Never feeds the 2014 pack: callers branch on `rules_edition === '2024'`.
 */

import { asiAlreadyApplied, type AppliedClassAsi } from './classAsi'
import type { ClassLevelEntry } from './classLevels'
import {
  classCatalog2024,
  normalizeClassSlug2024,
  SCHOLAR_CHOICE_2024,
} from './edition2024Classes'
import {
  metamagicKnownLimit2024,
  warlockInvocationLimit2024,
  type ClassOptions2024State,
} from './edition2024ClassOptions'
import {
  BLESSED_STRIKES_MIN_LEVEL_2024,
  blessedStrikesChoice2024,
} from './cleric2024Features'
import {
  DRUID_SUBCLASS_MIN_LEVEL_2024,
  ELEMENTAL_FURY_MIN_LEVEL_2024,
  elementalFuryChoice2024,
  knownFormsBudget2024,
} from './druid2024Features'
import { metamagicPickGainAtLevel2024 } from './sorcerer2024Features'
import { invocationPickGainAtLevel2024 } from './warlock2024Features'
import { getFeatureChoicePick, type FeaturePicksState } from './featurePicks'
import {
  withWizardSpellbookPicksStep,
  type GuidedWizardStep,
} from './pendingFeatureChoices'
import { freeBookSlotsAtLevel } from './wizardSpellbook'
import {
  SAVANT_SUBCLASS_PICK_MAX_SPELL_LEVEL,
  savantFreePicksAtWizardLevel,
  savantFreeBookSlotsOnSubclass,
  wizardSavantSchool,
  WIZARD_SUBCLASS_LEVEL_2024,
} from './wizardSpellbook2024'
import {
  masteryLimitForClass,
  WEAPON_MASTERY_CLASS_RULES,
  type WeaponMasteryState,
} from './weaponMastery'

const DEFAULT_SUBCLASS_LEVEL = 3
const DEFAULT_EPIC_BOON_LEVEL = 19

export function asiFeatureId2024(classLevel: number): string {
  return `asi_${Math.max(1, Math.floor(classLevel) || 1)}`
}

export const EPIC_BOON_FEATURE_ID_2024 = 'epic_boon'

export function resolveClassSlug2024(
  row: Pick<ClassLevelEntry, 'name' | 'catalog_id'> | string | null | undefined,
): string | null {
  if (!row) return null
  if (typeof row === 'string') return normalizeClassSlug2024(row)
  return normalizeClassSlug2024(row.catalog_id) || normalizeClassSlug2024(row.name)
}

function catalogDataFor(slug: string | null | undefined): Record<string, unknown> | null {
  if (!slug) return null
  return classCatalog2024()[slug]?.data ?? null
}

export function featLevelsForClassSlug(slug: string | null | undefined): number[] {
  const raw = catalogDataFor(slug)?.feat_levels
  return Array.isArray(raw) ? raw.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : []
}

export function subclassLevelForClassSlug(slug: string | null | undefined): number {
  const raw = Number(catalogDataFor(slug)?.subclass_level)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SUBCLASS_LEVEL
}

export function epicBoonLevelForClassSlug(slug: string | null | undefined): number {
  const raw = Number(catalogDataFor(slug)?.epic_boon_level)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_EPIC_BOON_LEVEL
}

export type PendingWizardInput2024 = {
  classEntryId: string
  className: string
  /** Catalog slug or Russian class name — resolved through the 2024 catalog. */
  classSlug: string | null
  /** Class level just gained (or still pending). */
  classLevel: number
  hasSubclass: boolean
  classAsi: AppliedClassAsi[]
  /** 2024 subclass slug when already chosen (`wizard__evoker`); enables Savant picks. */
  subclassSlug?: string | null
  /** Used to skip a Scholar step that already has its Expertise pick. */
  featurePicks?: FeaturePicksState
  classOptions?: ClassOptions2024State
  /**
   * Druid: beast forms already in `known_forms` (elemental ones excluded). Omitted means
   * the caller does not track forms, so no Wild Shape known-forms step is queued.
   */
  knownFormsCount?: number
}

export const SCHOLAR_FEATURE_ID_2024 = 'scholar'
export const SCHOLAR_LEVEL_2024 = 2

export const BLESSED_STRIKES_FEATURE_ID_2024 = 'blessed_strikes'

export const ELEMENTAL_FURY_FEATURE_ID_2024 = 'elemental_fury'

export function knownFormsStepId2024(classEntryId: string, budget: number): string {
  return `known-forms:${classEntryId}:${budget}`
}

export function elementalFuryStepId2024(classEntryId: string): string {
  return `feature_choice:${classEntryId}:${ELEMENTAL_FURY_FEATURE_ID_2024}`
}

export function blessedStrikesStepId2024(classEntryId: string): string {
  return `feature_choice:${classEntryId}:${BLESSED_STRIKES_FEATURE_ID_2024}`
}

export function scholarStepId2024(classEntryId: string): string {
  return `feature_choice:${classEntryId}:${SCHOLAR_FEATURE_ID_2024}`
}

export function savantBookPicksStepId2024(
  classEntryId: string,
  classLevel: number,
  picks: number,
): string {
  return `savant-book-picks:${classEntryId}:${Math.max(1, Math.floor(classLevel) || 1)}:${picks}`
}

export function epicBoonStepId2024(classEntryId: string): string {
  return `epic-boon:${classEntryId}:${EPIC_BOON_FEATURE_ID_2024}`
}

export function parseEpicBoonStepId2024(
  stepId: string | null | undefined,
): { classEntryId: string } | null {
  const match = /^epic-boon:(.+):epic_boon$/.exec(String(stepId || ''))
  return match ? { classEntryId: match[1] } : null
}

export function buildPendingWizardSteps2024(input: PendingWizardInput2024): GuidedWizardStep[] {
  const slug = resolveClassSlug2024(input.classSlug)
  if (!slug) return []
  const level = Math.max(1, Math.floor(input.classLevel) || 1)
  const steps: GuidedWizardStep[] = []

  const subclassLevel = subclassLevelForClassSlug(slug)
  if (level >= subclassLevel && !input.hasSubclass) {
    steps.push({
      id: `subclass:${input.classEntryId}:${slug}_subclass`,
      kind: 'subclass',
      classEntryId: input.classEntryId,
      className: input.className,
      featureId: `${slug}_subclass`,
      featureNameRu: 'Подкласс',
      promptRu: `Выбери подкласс для «${input.className}» — с ${subclassLevel} уровня он даёт умения.`,
    })
  }

  if (slug === 'sorcerer') {
    const gain = metamagicPickGainAtLevel2024(level)
    if (gain > 0) {
      const known = input.classOptions?.metamagic ?? []
      const limit = metamagicKnownLimit2024(level)
      const need = Math.max(0, limit - known.length)
      const picksNeeded = Math.min(gain, need)
      if (picksNeeded > 0) {
        steps.push({
          id: `metamagic-picks:${input.classEntryId}:${level}`,
          kind: 'metamagic_picks',
          classEntryId: input.classEntryId,
          className: input.className,
          classLevel: level,
          picksNeeded,
        })
      }
    }
  }

  if (slug === 'warlock') {
    const gain = invocationPickGainAtLevel2024(level)
    if (gain > 0) {
      const known = input.classOptions?.eldritch_invocations ?? []
      const limit = warlockInvocationLimit2024(level)
      const picksNeeded = Math.min(gain, Math.max(0, limit - known.length))
      if (picksNeeded > 0) {
        steps.push({
          id: `invocation-picks:${input.classEntryId}:${level}`,
          kind: 'invocation_picks',
          classEntryId: input.classEntryId,
          className: input.className,
          classLevel: level,
          picksNeeded,
        })
      }
    }
  }

  if (featLevelsForClassSlug(slug).includes(level)) {
    const featureId = asiFeatureId2024(level)
    if (!asiAlreadyApplied(input.classAsi, input.classEntryId, featureId)) {
      steps.push({
        id: `asi:${input.classEntryId}:${featureId}`,
        kind: 'asi',
        classEntryId: input.classEntryId,
        className: input.className,
        classLevel: level,
        featureId,
      })
    }
  }

  if (
    level >= epicBoonLevelForClassSlug(slug) &&
    !asiAlreadyApplied(input.classAsi, input.classEntryId, EPIC_BOON_FEATURE_ID_2024)
  ) {
    steps.push({
      id: epicBoonStepId2024(input.classEntryId),
      kind: 'feat',
      promptRu: `Эпический дар: на ${level} уровне «${input.className}» открывает эпический дар вместо обычной черты. Выбери его из каталога.`,
      noteRu: 'Эпический дар (2024) — черта категории «Эпический дар»; гранты лягут на лист.',
    })
  }

  if (slug === 'cleric' && level >= BLESSED_STRIKES_MIN_LEVEL_2024) {
    const picked = input.featurePicks
      ? Boolean(
          getFeatureChoicePick(
            input.featurePicks,
            input.classEntryId,
            BLESSED_STRIKES_FEATURE_ID_2024,
            blessedStrikesChoice2024.id,
          ),
        )
      : false
    if (!picked) {
      steps.push({
        id: blessedStrikesStepId2024(input.classEntryId),
        kind: 'feature_choice',
        classEntryId: input.classEntryId,
        className: input.className,
        classLevel: level,
        featureId: BLESSED_STRIKES_FEATURE_ID_2024,
        featureNameRu: blessedStrikesChoice2024.label_ru,
        featureLevel: BLESSED_STRIKES_MIN_LEVEL_2024,
        choice: blessedStrikesChoice2024,
      })
    }
  }

  if (slug === 'druid' && input.knownFormsCount != null) {
    const budget = knownFormsBudget2024(level)
    if (budget > 0 && input.knownFormsCount < budget) {
      steps.push({
        id: knownFormsStepId2024(input.classEntryId, budget),
        kind: 'known_forms',
        classEntryId: input.classEntryId,
        className: input.className,
        classLevel: level,
        budget,
        subclassSlug: input.subclassSlug ?? null,
      })
    }
  }

  if (slug === 'druid' && level >= ELEMENTAL_FURY_MIN_LEVEL_2024) {
    const picked = input.featurePicks
      ? Boolean(
          getFeatureChoicePick(
            input.featurePicks,
            input.classEntryId,
            ELEMENTAL_FURY_FEATURE_ID_2024,
            elementalFuryChoice2024.id,
          ),
        )
      : false
    if (!picked) {
      steps.push({
        id: elementalFuryStepId2024(input.classEntryId),
        kind: 'feature_choice',
        classEntryId: input.classEntryId,
        className: input.className,
        classLevel: level,
        featureId: ELEMENTAL_FURY_FEATURE_ID_2024,
        featureNameRu: elementalFuryChoice2024.label_ru,
        featureLevel: ELEMENTAL_FURY_MIN_LEVEL_2024,
        choice: elementalFuryChoice2024,
      })
    }
  }

  // Level 1 book (6 spells) is filled by create; every later wizard level adds 2.
  if (slug === 'wizard' && level >= 2) {
    let scholarStep: GuidedWizardStep | null = null
    if (level === SCHOLAR_LEVEL_2024) {
      const picked = input.featurePicks
        ? Boolean(
            getFeatureChoicePick(
              input.featurePicks,
              input.classEntryId,
              SCHOLAR_FEATURE_ID_2024,
              SCHOLAR_CHOICE_2024.id,
            ),
          )
        : false
      if (!picked) {
        scholarStep = {
          id: scholarStepId2024(input.classEntryId),
          kind: 'feature_choice',
          classEntryId: input.classEntryId,
          className: input.className,
          classLevel: level,
          featureId: SCHOLAR_FEATURE_ID_2024,
          featureNameRu: SCHOLAR_CHOICE_2024.label_ru,
          featureLevel: SCHOLAR_LEVEL_2024,
          choice: SCHOLAR_CHOICE_2024,
        }
      }
    }
    const withBook = withWizardSpellbookPicksStep(steps, {
      classEntryId: input.classEntryId,
      className: input.className,
      classLevel: level,
      picksNeeded: freeBookSlotsAtLevel(level),
    })
    const savant = savantBookPicksStep2024(input, level)
    const ordered = scholarStep ? [scholarStep, ...withBook] : withBook
    if (!savant) return ordered
    const bookIdx = ordered.findIndex(
      (row) => row.kind === 'spellbook_picks' && row.classEntryId === input.classEntryId,
    )
    return bookIdx >= 0
      ? [...ordered.slice(0, bookIdx + 1), savant, ...ordered.slice(bookIdx + 1)]
      : [...ordered, savant]
  }

  return steps
}

/**
 * 2024 school Savant: free school spells in the book. Two picks (≤ 2nd) when the
 * subclass is taken, then one per new slot tier. While the subclass is not chosen yet
 * (level 3), the step is queued after the subclass step; the school is resolved at run time.
 */
function savantBookPicksStep2024(
  input: PendingWizardInput2024,
  level: number,
): Extract<GuidedWizardStep, { kind: 'spellbook_picks' }> | null {
  let picks = 0
  let maxSpellLevel = 0
  if (!input.hasSubclass && level === WIZARD_SUBCLASS_LEVEL_2024) {
    picks = savantFreeBookSlotsOnSubclass()
    maxSpellLevel = SAVANT_SUBCLASS_PICK_MAX_SPELL_LEVEL
  } else if (input.hasSubclass && wizardSavantSchool(input.subclassSlug)) {
    ;({ picks, maxSpellLevel } = savantFreePicksAtWizardLevel({
      wizardLevel: level,
      subclassSlug: input.subclassSlug,
    }))
  }
  if (picks <= 0) return null
  return {
    id: savantBookPicksStepId2024(input.classEntryId, level, picks),
    kind: 'spellbook_picks',
    classEntryId: input.classEntryId,
    className: input.className.trim() || 'Волшебник',
    classLevel: level,
    picksNeeded: picks,
    savant: { maxSpellLevel },
  }
}

export type LevelDownClearInput2024 = {
  classEntryId: string
  /** Class level before −1. */
  beforeLevel: number
  classAsi: AppliedClassAsi[]
  featurePicks: FeaturePicksState
  /** Feature ids with their class level for this class (from the 2024 progression). */
  features: Array<{ id: string; level: number }>
}

/** What a −1 class level drops: ASI ledger rows and feature picks above the new level. */
export function clearAsiAndOptionsAboveLevel(input: LevelDownClearInput2024): {
  keptAsi: AppliedClassAsi[]
  revokedAsi: AppliedClassAsi[]
  featurePicks: FeaturePicksState
} {
  const newLevel = Math.max(0, input.beforeLevel - 1)
  const keptAsi: AppliedClassAsi[] = []
  const revokedAsi: AppliedClassAsi[] = []
  for (const entry of input.classAsi) {
    if (entry.classEntryId === input.classEntryId && entry.atClassLevel > newLevel) {
      revokedAsi.push(entry)
    } else {
      keptAsi.push(entry)
    }
  }

  const prefix = `${input.classEntryId}:`
  const dropIds = new Set(
    input.features.filter((feature) => feature.level > newLevel).map((feature) => feature.id),
  )
  const values: Record<string, string> = {}
  for (const [key, value] of Object.entries(input.featurePicks.values)) {
    if (key.startsWith(prefix) && dropIds.has(key.slice(prefix.length))) continue
    values[key] = value
  }
  return { keptAsi, revokedAsi, featurePicks: { values } }
}

/** True when −1 drops the class below the level where its subclass is chosen. */
export function subclassDropsOnLevelDown2024(
  slug: string | null | undefined,
  beforeLevel: number,
): boolean {
  return beforeLevel - 1 < subclassLevelForClassSlug(slug)
}

/** Trim invocations / metamagic / weapon masteries that no longer fit the lower class level. */
export function trimClassOptionsForLevel2024(input: {
  slug: string | null | undefined
  newLevel: number
  classOptions: ClassOptions2024State
  weaponMastery: WeaponMasteryState
}): { classOptions: ClassOptions2024State; weaponMastery: WeaponMasteryState } {
  const level = Math.max(1, Math.floor(input.newLevel) || 1)
  let classOptions = input.classOptions
  if (input.slug === 'warlock') {
    const cap = warlockInvocationLimit2024(level)
    if (classOptions.eldritch_invocations.length > cap) {
      classOptions = {
        ...classOptions,
        eldritch_invocations: classOptions.eldritch_invocations.slice(0, cap),
      }
    }
  }
  if (input.slug === 'sorcerer') {
    const cap = metamagicKnownLimit2024(level)
    if (classOptions.metamagic.length > cap) {
      classOptions = { ...classOptions, metamagic: classOptions.metamagic.slice(0, cap) }
    }
  }
  if (input.slug === 'druid') {
    if (level < ELEMENTAL_FURY_MIN_LEVEL_2024 && classOptions.elemental_fury) {
      classOptions = { ...classOptions, elemental_fury: null }
    }
    if (level < DRUID_SUBCLASS_MIN_LEVEL_2024 && classOptions.land_choice) {
      classOptions = { ...classOptions, land_choice: null }
    }
  }
  let weaponMastery = input.weaponMastery
  const rule = input.slug ? WEAPON_MASTERY_CLASS_RULES[input.slug] : undefined
  if (rule && weaponMastery.sourceClass === input.slug) {
    const cap = masteryLimitForClass(rule, level)
    if (weaponMastery.known.length > cap) {
      weaponMastery = {
        ...weaponMastery,
        known: weaponMastery.known.slice(0, cap),
        baseline: weaponMastery.baseline.slice(0, cap),
      }
    }
  }
  return { classOptions, weaponMastery }
}

/** Weapon mastery slots gained by the class level just taken (0 when no growth). */
export function weaponMasteryGain2024(
  slug: string | null | undefined,
  newLevel: number,
): number {
  const rule = slug ? WEAPON_MASTERY_CLASS_RULES[slug] : undefined
  if (!rule?.enabled) return 0
  const before = newLevel <= 1 ? 0 : masteryLimitForClass(rule, newLevel - 1)
  return Math.max(0, masteryLimitForClass(rule, newLevel) - before)
}
