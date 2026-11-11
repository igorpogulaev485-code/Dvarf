/** Действия листа, группа 2. Тела функций перенесены без изменения порядка вызовов. */
import type { SheetModel } from './sheetModel'
import { totalCharacterLevel } from '../../../shared/dnd/classLevels'
import type { ClassGrantDef, ClassGrantPicks } from '../../../shared/dnd/classGrants'
import { grantNeedsSetupDialog, resolveClassGrantDef } from '../../../shared/dnd/classGrants'
import { applyClassGrantToDraft, revokeClassGrant, type ClassGrantDraftSlice } from '../classEffects'
import { reapplyBackgroundOverlays } from '../backgroundEffects'
import { revokeSubclassGrant } from '../subclassEffects'
import { type CatalogEntry } from '../../../shared/api/catalog'
import { type RaceGrantDef, type RaceGrantPicks } from '../../../shared/dnd/raceGrants'
import { type ClassLevelEntry } from '../classLevels'
import { type GuidedWizardSession } from '../GuidedWizardDialog'
import { type AppliedClassAsi } from '../../../shared/dnd/classAsi'
import { syncSkillsExpertiseFromPicks } from '../../../shared/dnd/expertise'
import {
  backgroundWizardStep,
  buildPendingWizardSteps,
  featWizardStep,
  isWizardClassName,
  listUnlockedExpertiseKeys,
  withBackgroundStepIfNeeded,
  withWizardSpellbookPicksStep,
  type GuidedWizardStep,
} from '../../../shared/dnd/pendingFeatureChoices'
import { newFeatGrantId, type AppliedFeatGrant } from '../../../shared/dnd/featGrants'
import { applyFeatGrantToDraft, revokeFeatGrantsForRace } from '../featEffects'
import { syncHitDicePools } from '../../../shared/dnd/classHitDice'
import { buildMaxHpByLevels } from '../../../shared/dnd/multiclassRules'
import { clampCharacterLevel, xpToReachLevel } from '../../../shared/dnd/experience'
import { withSyncedHitDiceSummary } from '../play'
import { unlockFeaturesForClasses } from '../../../shared/dnd/classFeatures'
import { clearFeaturePicksForClass, type FeaturePicksState } from '../../../shared/dnd/featurePicks'
import { sanitizeFeaturePicksForPactBoons, withPactTomeCantripsStep } from '../pactTomeEffects'
import { applyRaceGrantToDraft, reapplyRaceOverlays, type RaceGrantDraftSlice } from '../raceEffects'
import { characterHasCasterClass } from '../../../shared/dnd/casterProgression'
import { withSpellFocusFlags } from '../spellFocus'
import { freeBookSlotsAtLevel, remainingFreeSpellbookSlots } from '../../../shared/dnd/wizardSpellbook'
import { syncWizardSpellbookWithInventory } from '../wizardSpellbookInventory'
import { abilityModifier } from '../sheetTypes'
import { subclassSlugMapFromLedger, subclassTransitionMapFromLedger, type Draft } from './draft'

export function installSheetActions2(model: SheetModel) {
  model.applyHomebrewSubclass = function applyHomebrewSubclass(classEntryId: string, name: string) {
    model.setDraft((prev) => {
      const cleared = revokeSubclassGrant(model.subclassSliceFrom(prev), classEntryId, {
        copyTextToNotes: true,
      })
      const merged = model.mergeSubclassSlice(prev, cleared)
      return {
        ...merged,
        featurePicks: clearFeaturePicksForClass(merged.featurePicks, classEntryId),
        classes: merged.classes.map((row) =>
          row.id === classEntryId
            ? { ...row, subclass_name: name, subclass_catalog_id: null }
            : row,
        ),
        identity:
          merged.classes[0]?.id === classEntryId
            ? { ...merged.identity, subclassName: name }
            : merged.identity,
      }
    })
    model.onToast(`Хомбрю-архетип «${name}»: только имя на листе`)
  }

  model.mergeGrantSlice = function mergeGrantSlice(prev: Draft, slice: ClassGrantDraftSlice): Draft {
    const focusSpells = withSpellFocusFlags(prev.spells, slice.inventory.items)
    const isWizard = prev.classes.some((row) =>
      /волшебник|wizard|маг/i.test(row.name),
    )
    const synced = syncWizardSpellbookWithInventory({
      isWizard,
      spells: focusSpells,
      items: slice.inventory.items,
    })
    const merged: Draft = {
      ...prev,
      identity: slice.identity,
      saves: slice.saves,
      skills: slice.skills,
      classGrants: slice.classGrants,
      hpMax: slice.hpMax,
      hpCurrent: slice.hpCurrent,
      inventory: slice.inventory,
      weapons: slice.weapons,
      spells: synced.spells,
      play: {
        ...prev.play,
        hitDie: slice.playHitDie,
      },
    }
    if (synced.message) {
      queueMicrotask(() => model.onToast(synced.message!))
    }
    const restored = reapplyRaceOverlays(model.raceSliceFrom(merged), {
      characterLevel: totalCharacterLevel(merged.classes),
      hasCasterClass: characterHasCasterClass(merged.classes),
      raceLabelRu: merged.raceName,
    })
    return model.mergeRaceSlice(merged, restored)
  }

  model.mergeRaceSlice = function mergeRaceSlice(prev: Draft, slice: RaceGrantDraftSlice): Draft {
    const merged: Draft = {
      ...prev,
      identity: slice.identity,
      skills: slice.skills,
      abilities: slice.abilities,
      speed: slice.speed,
      climbSpeed: slice.climbSpeed,
      swimSpeed: slice.swimSpeed,
      flySpeed: slice.flySpeed,
      textBlocks: slice.textBlocks,
      weapons: slice.weapons,
      // Race spells replace known list — re-attach focus flags from current inventory.
      spells: withSpellFocusFlags(slice.spells, prev.inventory.items),
      raceGrant: slice.raceGrant,
    }
    const restoredBg = reapplyBackgroundOverlays(model.backgroundSliceFrom(merged))
    return model.mergeBackgroundSlice(merged, restoredBg)
  }

  model.grantModeForClassRow = function grantModeForClassRow(prev: Draft, classEntryId: string): 'start' | 'multiclass' {
    const existing = prev.classGrants.find((row) => row.classEntryId === classEntryId)
    if (existing) return existing.mode
    if (prev.classes.length <= 1) return 'start'
    const index = prev.classes.findIndex((row) => row.id === classEntryId)
    return index <= 0 ? 'start' : 'multiclass'
  }

  model.applyFeaturePicksWithExpertise = function applyFeaturePicksWithExpertise(featurePicks: FeaturePicksState) {
    model.setDraft((prev) => {
      const sanitized = sanitizeFeaturePicksForPactBoons({
        featurePicks,
        classes: prev.classes,
      })
      const unlocked = unlockFeaturesForClasses({
        classes: prev.classes,
        characterLevel: totalCharacterLevel(prev.classes),
        abilities: prev.abilities,
        subclassSlugByEntryId: subclassSlugMapFromLedger(prev),
        subclassTransitionByEntryId: subclassTransitionMapFromLedger(
          prev.subclassTransitions,
        ),
      })
      const keys = listUnlockedExpertiseKeys(unlocked)
      return {
        ...prev,
        featurePicks: sanitized,
        skills: syncSkillsExpertiseFromPicks({
          skills: prev.skills,
          featurePicks: sanitized,
          expertiseKeys: keys,
        }),
      }
    })
    model.setGuidedWizard((prev) => {
      if (!prev) return null
      const step = prev.steps[prev.index]
      if (
        !step ||
        (step.kind !== 'feature_choice' && step.kind !== 'pact_tome_cantrips')
      ) {
        return prev
      }
      const classRow = model.draft.classes.find((row) => row.id === step.classEntryId)
      if (!classRow) return prev
      const sanitized = sanitizeFeaturePicksForPactBoons({
        featurePicks,
        classes: model.draft.classes,
      })
      const nextSteps = withPactTomeCantripsStep(prev.steps, {
        classEntryId: step.classEntryId,
        className: classRow.name,
        classLevel: classRow.level,
        featurePicks: sanitized,
      })
      if (nextSteps === prev.steps) return prev
      return { ...prev, steps: nextSteps }
    })
  }

  model.openGuidedWizard = function openGuidedWizard(session: GuidedWizardSession) {
    model.setIdentityOpen(false)
    if (session.steps.length === 0) {
      model.setGuidedWizard(null)
      return
    }
    model.setGuidedWizard({ ...session, index: Math.min(session.index, session.steps.length - 1) })
  }

  model.jumpDraftToClassLevel = function jumpDraftToClassLevel(prev: Draft, classEntryId: string, targetLevel: number): Draft {
    const level = clampCharacterLevel(targetLevel)
    const nextClasses = prev.classes.map((row) =>
      row.id === classEntryId ? { ...row, level } : row,
    )
    const conMod = abilityModifier(prev.abilities.con)
    const hpBuilt = buildMaxHpByLevels({
      classes: nextClasses.map((row) => ({ name: row.name, level: row.level })),
      constitutionMod: conMod,
    })
    const hitDiceByClass = syncHitDicePools({
      classes: nextClasses,
      previous: prev.play.hitDiceByClass,
    })
    const totalLevel = totalCharacterLevel(nextClasses)
    return {
      ...prev,
      classes: nextClasses,
      hpMax: hpBuilt?.total ?? prev.hpMax,
      hpCurrent: hpBuilt?.total ?? prev.hpCurrent,
      identity: {
        ...prev.identity,
        experience: xpToReachLevel(totalLevel),
      },
      play: withSyncedHitDiceSummary({
        ...prev.play,
        hitDiceByClass,
      }),
    }
  }

  model.buildChoiceStepsForClass = function buildChoiceStepsForClass(input: {
    classEntryId: string
    classLevel: number
    /** When set, queue all incomplete picks with feature.level ≤ max (start at N). */
    upToLevel?: number
    featurePicks?: FeaturePicksState
    classAsi?: AppliedClassAsi[]
    unlocked?: typeof model.unlockedFeatures
    hasSubclass?: Record<string, boolean>
    /** Create flow: insert background before Expertise / ASI. */
    includeBackground?: boolean
    hasBackgroundGrant?: boolean
  }): GuidedWizardStep[] {
    const maxLevel = input.upToLevel ?? input.classLevel
    let steps = buildPendingWizardSteps({
      unlocked: input.unlocked ?? model.unlockedFeatures,
      featurePicks: input.featurePicks ?? model.draft.featurePicks,
      classAsi: input.classAsi ?? model.draft.classAsi,
      filter:
        maxLevel > input.classLevel || input.upToLevel != null
          ? {
              mode: 'up_to_class_level',
              classEntryId: input.classEntryId,
              maxClassLevel: maxLevel,
            }
          : {
              mode: 'at_class_level',
              classEntryId: input.classEntryId,
              classLevel: input.classLevel,
            },
      hasSubclassByEntryId: input.hasSubclass ?? model.hasSubclassByEntryId,
    })
    steps = withBackgroundStepIfNeeded(steps, {
      include: Boolean(input.includeBackground) && !input.hasBackgroundGrant,
    })
    const classRow = model.draft.classes.find((row) => row.id === input.classEntryId)
    if (classRow && isWizardClassName(classRow.name)) {
      const wizardLevel = Math.max(1, maxLevel)
      const freeLeft = remainingFreeSpellbookSlots(model.draft.spells.known, wizardLevel)
      if (freeLeft > 0) {
        steps = withWizardSpellbookPicksStep(steps, {
          classEntryId: input.classEntryId,
          className: classRow.name,
          classLevel: wizardLevel,
          picksNeeded:
            input.upToLevel != null
              ? freeLeft
              : wizardLevel <= 1
                ? Math.min(6, freeLeft)
                : Math.min(freeBookSlotsAtLevel(wizardLevel), freeLeft),
        })
      }
    }
    if (classRow) {
      steps = withPactTomeCantripsStep(steps, {
        classEntryId: input.classEntryId,
        className: classRow.name,
        classLevel: Math.max(1, maxLevel),
        featurePicks: input.featurePicks ?? model.draft.featurePicks,
      })
    }
    return steps
  }

  model.commitClassGrant = function commitClassGrant(input: {
    classEntryId: string
    className: string
    mode: 'start' | 'multiclass'
    picks: ClassGrantPicks
    def?: ClassGrantDef | null
    catalogSlug?: string | null
    catalogData?: Record<string, unknown> | null
  }) {
    let summary: string | null = null
    model.setDraft((prev) => {
      const applied = applyClassGrantToDraft({
        draft: model.draftSliceFrom(prev),
        classEntryId: input.classEntryId,
        className: input.className,
        mode: input.mode,
        picks: input.picks,
        def: input.def,
        catalogSlug: input.catalogSlug,
        catalogData: input.catalogData,
      })
      if (!applied) return prev
      summary = applied.summary
      return model.mergeGrantSlice(prev, applied.draft)
    })
    if (summary) {
      model.onToast(
        `${input.mode === 'start' ? 'Старт' : 'Мультикласс'} «${input.className}»: ${summary}`,
      )
    }
  }

  model.requestOrApplyClassGrant = function requestOrApplyClassGrant(input: {
    classEntryId: string
    className: string
    mode: 'start' | 'multiclass'
    catalogSlug?: string | null
    catalogData?: Record<string, unknown> | null
    /** When setDraft for the class row hasn't flushed yet (MC / catalog pick). */
    classesOverride?: ClassLevelEntry[]
  }) {
    const def = resolveClassGrantDef({
      className: input.className,
      catalogSlug: input.catalogSlug,
      catalogData: input.catalogData,
    })
    if (!def) {
      model.onToast(`Класс «${input.className}» пока без пакета владений — выставь вручную`)
      return
    }
    const baseClasses = input.classesOverride ?? model.draft.classes
    const classRow = baseClasses.find((row) => row.id === input.classEntryId)
    const classLevel = classRow?.level ?? 1
    // Имя класса могло только что смениться в setDraft — для unlock берём input.className.
    const classesForUnlock = baseClasses.map((row) =>
      row.id === input.classEntryId ? { ...row, name: input.className } : row,
    )
    const unlockedForGrant = unlockFeaturesForClasses({
      classes: classesForUnlock,
      characterLevel: totalCharacterLevel(classesForUnlock),
      abilities: model.draft.abilities,
      subclassSlugByEntryId: model.subclassSlugByEntryId,
      subclassTransitionByEntryId: model.subclassTransitionByEntryId,
    })
    // Feature/ASI picks only — background is prepended before class_grant when needed.
    const choiceSteps = model.buildChoiceStepsForClass({
      classEntryId: input.classEntryId,
      classLevel,
      unlocked: unlockedForGrant,
    })
    if (grantNeedsSetupDialog(def, input.mode)) {
      // Background first (if missing), then class_grant; after confirm rebuild choices.
      const classGrantStep: GuidedWizardStep = {
        id: `class_grant:${input.classEntryId}`,
        kind: 'class_grant',
        classEntryId: input.classEntryId,
        className: input.className,
        mode: input.mode,
      }
      model.openGuidedWizard({
        steps: withBackgroundStepIfNeeded(
          [
            classGrantStep,
            ...(input.mode === 'start' && model.pendingStartingLevel > 1 ? [] : choiceSteps),
          ],
          {
            include: input.mode === 'start' && !model.draft.backgroundGrant,
          },
        ),
        index: 0,
        grant: {
          def,
          catalogSlug: input.catalogSlug ?? null,
          catalogData: input.catalogData ?? null,
        },
      })
      return
    }
    model.commitClassGrant({
      classEntryId: input.classEntryId,
      className: input.className,
      mode: input.mode,
      picks: { skills: [], tools: [], equipmentPackageId: null },
      def,
      catalogSlug: input.catalogSlug,
      catalogData: input.catalogData,
    })
    if (input.mode === 'start' && model.pendingStartingLevel > 1) {
      let remaining: GuidedWizardStep[] = []
      model.setDraft((prev) => {
        const jumped = model.jumpDraftToClassLevel(prev, input.classEntryId, model.pendingStartingLevel)
        const unlocked = unlockFeaturesForClasses({
          classes: jumped.classes,
          characterLevel: totalCharacterLevel(jumped.classes),
          abilities: jumped.abilities,
          subclassSlugByEntryId: subclassSlugMapFromLedger(jumped),
          subclassTransitionByEntryId: subclassTransitionMapFromLedger(
            jumped.subclassTransitions,
          ),
        })
        const hasSubclass: Record<string, boolean> = {}
        for (const row of jumped.classes) {
          hasSubclass[row.id] = Boolean(row.subclass_catalog_id || row.subclass_name.trim())
        }
        // Background already done (or was earlier in queue) — only feature/ASI picks.
        remaining = buildPendingWizardSteps({
          unlocked,
          featurePicks: jumped.featurePicks,
          classAsi: jumped.classAsi,
          filter: {
            mode: 'up_to_class_level',
            classEntryId: input.classEntryId,
            maxClassLevel: model.pendingStartingLevel,
          },
          hasSubclassByEntryId: hasSubclass,
        })
        return jumped
      })
      model.setPendingStartingLevel(1)
      model.onCreateGuideConsumed?.()
      model.onToast(`Старт с ${model.pendingStartingLevel} ур. — пройди выборы умений`)
      model.openGuidedWizard({ steps: remaining, index: 0 })
      return
    }
    if (choiceSteps.length > 0) {
      model.openGuidedWizard({
        steps: withBackgroundStepIfNeeded(choiceSteps, {
          include: input.mode === 'start' && !model.draft.backgroundGrant,
        }),
        index: 0,
      })
    } else if (input.mode === 'start' && !model.draft.backgroundGrant) {
      model.openGuidedWizard({ steps: [backgroundWizardStep()], index: 0 })
    }
  }

  model.applyHomebrewClass = function applyHomebrewClass(classEntryId: string, name: string) {
    model.setDraft((prev) => {
      const cleared = revokeClassGrant(model.draftSliceFrom(prev), classEntryId)
      const merged = model.mergeGrantSlice(prev, cleared)
      return {
        ...merged,
        classes: merged.classes.map((row: { id: string }) =>
          row.id === classEntryId
            ? { ...row, name, catalog_id: null }
            : row,
        ),
        identity:
          merged.classes[0]?.id === classEntryId
            ? merged.identity
            : merged.identity,
      }
    })
    model.onToast(`Хомбрю-класс «${name}»: название на листе. Остальное заполни сам.`)
  }

  model.commitRaceGrant = function commitRaceGrant(input: {
    selected: CatalogEntry
    picks: RaceGrantPicks
    def?: RaceGrantDef | null
    featResult?: import('../FeatSetupDialog').FeatSetupResult | null
  }) {
    let summary: string | null = null
    let incompleteExpertise: GuidedWizardStep[] = []
    model.setDraft((prev) => {
      const clearedFeats = prev.raceCatalogId
        ? revokeFeatGrantsForRace({
            draft: model.featSliceFrom(prev),
            raceCatalogId: prev.raceCatalogId,
          })
        : model.featSliceFrom(prev)
      const base = model.mergeFeatSlice(prev, clearedFeats)
      const applied = applyRaceGrantToDraft({
        draft: model.raceSliceFrom(base),
        selected: input.selected,
        picks: input.picks,
        def: input.def,
        characterLevel: totalCharacterLevel(base.classes),
        hasCasterClass: characterHasCasterClass(base.classes),
      })
      if (!applied) return prev
      summary = applied.summary
      let next: Draft = {
        ...model.mergeRaceSlice(base, applied.draft),
        raceName: input.selected.name_ru,
        raceCatalogId: input.selected.id,
      }
      if (input.featResult) {
        const grant: AppliedFeatGrant = {
          id: newFeatGrantId(),
          featCatalogId: input.featResult.entry.id,
          slug: input.featResult.entry.slug,
          nameRu: input.featResult.entry.name_ru,
          source: {
            kind: 'race',
            raceCatalogId: input.selected.id,
            raceSlug: input.selected.slug,
          },
          applied: input.featResult.applied,
          picks: input.featResult.picks,
        }
        next = model.mergeFeatSlice(
          next,
          applyFeatGrantToDraft({ draft: model.featSliceFrom(next), grant }),
        )
        summary = summary
          ? `${summary}; черта «${grant.nameRu}»`
          : `черта «${grant.nameRu}»`
      }
      const unlocked = unlockFeaturesForClasses({
        classes: next.classes,
        characterLevel: totalCharacterLevel(next.classes),
        abilities: next.abilities,
        subclassSlugByEntryId: subclassSlugMapFromLedger(next),
        subclassTransitionByEntryId: subclassTransitionMapFromLedger(
          next.subclassTransitions,
        ),
      })
      const hasSubclass: Record<string, boolean> = {}
      for (const row of next.classes) {
        hasSubclass[row.id] = Boolean(row.subclass_catalog_id || row.subclass_name.trim())
      }
      incompleteExpertise = buildPendingWizardSteps({
        unlocked,
        featurePicks: next.featurePicks,
        classAsi: next.classAsi,
        filter: { mode: 'all_empty' },
        hasSubclassByEntryId: hasSubclass,
      }).filter(
        (step) =>
          step.kind === 'feature_choice' &&
          step.choice.options_from === 'expertise_skills_tools',
      )
      return next
    })
    if (summary) model.onToast(`Раса «${input.selected.name_ru}»: ${summary}`)
    const featNote = input.def?.featNoteRu ?? null
    const followUp: GuidedWizardStep[] = [...incompleteExpertise]
    if (featNote) {
      followUp.push(featWizardStep({ noteRu: featNote }))
    }
    // Довыбор Expertise + черта с 1 ур. (человек и др.), если ещё в мастере.
    if (followUp.length > 0 && !model.guidedWizard) {
      model.openGuidedWizard({ steps: followUp, index: 0 })
    }
  }
}
