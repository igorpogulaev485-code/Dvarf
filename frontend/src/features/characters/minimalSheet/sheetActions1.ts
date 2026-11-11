/** Действия листа, группа 1. Тела функций перенесены без изменения порядка вызовов. */
import type { SheetModel } from './sheetModel'
import { totalCharacterLevel } from '../../../shared/dnd/classLevels'
import { type ClassGrantDraftSlice } from '../classEffects'
import { type BackgroundGrantDraftSlice } from '../backgroundEffects'
import { collectGrantTextSnippets, type SubclassChangeMode, type SubclassGrantDef, type SubclassGrantPicks } from '../../../shared/dnd/subclassGrants'
import {
  applySubclassGrantToDraft,
  emptySubclassPicks,
  resolveSubclassDefFromCatalog,
  subclassNeedsSetupDialog,
  type SubclassGrantDraftSlice,
} from '../subclassEffects'
import { applyConcentrationChangeToCompanions } from '../spellCompanions'
import { type CatalogEntry } from '../../../shared/api/catalog'
import { type ClassLevelEntry } from '../classLevels'
import { bridgeManeuversIntoFeaturePicks, extractManeuverIdsFromSubclassPicks } from '../../../shared/dnd/battleMasterManeuverBridge'
import {
  bridgeSwordsFightingStyle,
  swordsFightingStyleFromSubclassPicks,
} from '../../../shared/dnd/swordsFightingStyleBridge'
import { bridgeOriginPicks } from '../../../shared/dnd/pack04SorcererWarlock'
import { type FeatGrantDraftSlice } from '../featEffects'
import { listSubclassFeatureIdsAboveLevel } from '../../../shared/dnd/classFeatures'
import { clearFeaturePicksForClass, clearFeaturePicksForFeatureIds } from '../../../shared/dnd/featurePicks'
import { type WildShapeDialogResult } from '../WildShapeDialog'
import { type IdentityExtras } from '../identity'
import { reapplyRaceOverlays, syncRaceSpellsForSheetState, type RaceGrantDraftSlice } from '../raceEffects'
import { characterHasCasterClass, highestSpellSlotLevelForClasses } from '../../../shared/dnd/casterProgression'
import { withSpellFocusFlags } from '../spellFocus'
import type { Draft } from './draft'

export function installSheetActions1(model: SheetModel) {
  model.applyWildShapeResult = function applyWildShapeResult(result: WildShapeDialogResult) {
    model.setDraft((prev) => ({
      ...prev,
      companions: result.companions,
      knownForms: result.knownForms,
      play: {
        ...prev.play,
        resources: result.resources,
        ...(result.hpTemp != null
          ? { hpTemp: Math.max(prev.play.hpTemp, result.hpTemp) }
          : {}),
      },
    }))
    if (result.toast) model.onToast(result.toast)
  }

  model.clearConcentrationDismissingCompanions = function clearConcentrationDismissingCompanions(
    next: typeof model.draft.play.concentration | null = null,
  ) {
    let dismissed: string[] = []
    model.setDraft((prev) => {
      const result = applyConcentrationChangeToCompanions({
        companions: prev.companions,
        previous: prev.play.concentration,
        next,
      })
      dismissed = result.dismissedNames
      return {
        ...prev,
        companions: result.companions,
        play: { ...prev.play, concentration: next },
      }
    })
    if (dismissed.length) {
      model.onToast(
        `Концентрация снята · напарник неактивен: ${dismissed.join(', ')}`,
      )
    }
  }

/** Refresh mark-list racial spells after class / subclass / level changes. */
  model.withRaceSpellsSynced = function withRaceSpellsSynced(prev: Draft, nextClasses: ClassLevelEntry[]): Draft {
    if (!prev.raceGrant) {
      return { ...prev, classes: nextClasses }
    }
    const spells = syncRaceSpellsForSheetState({
      spells: prev.spells,
      grant: prev.raceGrant,
      characterLevel: totalCharacterLevel(nextClasses),
      hasCasterClass: characterHasCasterClass(nextClasses),
      raceLabelRu: prev.raceName,
    })
    return { ...prev, classes: nextClasses, spells }
  }

  model.patchClass = function patchClass(classId: string, patch: Partial<ClassLevelEntry>) {
    model.setDraft((prev) => {
      const nextClasses = prev.classes.map((row) =>
        row.id === classId ? { ...row, ...patch } : row,
      )
      const next = model.withRaceSpellsSynced(prev, nextClasses)
      return {
        ...next,
        identity:
          prev.classes[0]?.id === classId && patch.subclass_name !== undefined
            ? { ...next.identity, subclassName: patch.subclass_name }
            : next.identity,
      }
    })
  }

  model.draftSliceFrom = function draftSliceFrom(prev: Draft): ClassGrantDraftSlice {
    return {
      identity: prev.identity,
      saves: prev.saves,
      skills: prev.skills,
      classGrants: prev.classGrants,
      playHitDie: prev.play.hitDie,
      hpMax: prev.hpMax,
      hpCurrent: prev.hpCurrent,
      constitutionScore: prev.abilities.con,
      characterLevel: totalCharacterLevel(prev.classes),
      inventory: prev.inventory,
      weapons: prev.weapons,
    }
  }

  model.raceSliceFrom = function raceSliceFrom(prev: Draft): RaceGrantDraftSlice {
    const classSkills = new Set([
      ...prev.classGrants.flatMap((row) => row.skills),
      ...prev.subclassGrants.flatMap((row) => row.skills),
      ...(prev.backgroundGrant?.skills ?? []),
    ])
    const classTools = new Set([
      ...prev.classGrants.flatMap((row) =>
        row.tools.map((item) => item.trim().toLowerCase()).filter(Boolean),
      ),
      ...prev.subclassGrants.flatMap((row) =>
        row.tools.map((item) => item.trim().toLowerCase()).filter(Boolean),
      ),
      ...(prev.backgroundGrant?.tools ?? []).map((item) =>
        item.trim().toLowerCase(),
      ),
    ])
    const classArmor = new Set([
      ...prev.classGrants.flatMap((row) => row.armorKeys),
      ...prev.subclassGrants.flatMap((row) => row.armorKeys),
    ]) as Set<keyof IdentityExtras['armor']>
    const classGrantedWeaponExtras = new Set([
      ...prev.classGrants.flatMap((row) =>
        (row.weaponExtras ?? []).map((item) => item.trim().toLowerCase()),
      ),
      ...prev.subclassGrants.flatMap((row) =>
        (row.weaponExtras ?? []).map((item) => item.trim().toLowerCase()),
      ),
      ...(prev.backgroundGrant?.weaponExtras ?? []).map((item) =>
        item.trim().toLowerCase(),
      ),
    ])
    return {
      identity: prev.identity,
      skills: prev.skills,
      abilities: prev.abilities,
      speed: prev.speed,
      climbSpeed: prev.climbSpeed,
      swimSpeed: prev.swimSpeed,
      flySpeed: prev.flySpeed,
      textBlocks: prev.textBlocks,
      weapons: prev.weapons,
      spells: prev.spells,
      raceGrant: prev.raceGrant,
      classGrantedSkills: classSkills,
      classGrantedTools: classTools,
      classGrantedArmor: classArmor,
      classGrantedWeaponExtras,
    }
  }

  model.backgroundSliceFrom = function backgroundSliceFrom(prev: Draft): BackgroundGrantDraftSlice {
    const featSkills = prev.featGrants.flatMap((row) => row.applied.skills)
    const featTools = prev.featGrants
      .flatMap((row) => row.applied.tools)
      .map((item) => item.trim().toLowerCase())
    const featLang = prev.featGrants
      .flatMap((row) => row.applied.languages)
      .map((item) => item.toLowerCase())
    const protectedSkills = new Set([
      ...prev.classGrants.flatMap((row) => row.skills),
      ...prev.subclassGrants.flatMap((row) => row.skills),
      ...(prev.raceGrant?.skills ?? []),
      ...featSkills,
    ])
    const protectedTools = new Set([
      ...prev.classGrants.flatMap((row) =>
        row.tools.map((item) => item.trim().toLowerCase()).filter(Boolean),
      ),
      ...prev.subclassGrants.flatMap((row) =>
        row.tools.map((item) => item.trim().toLowerCase()).filter(Boolean),
      ),
      ...(prev.raceGrant?.tools ?? []).map((item) => item.trim().toLowerCase()),
      ...featTools,
    ])
    const protectedLanguages = new Set([
      ...(prev.raceGrant?.languages ?? []).map((item) => item.toLowerCase()),
      ...featLang,
    ])
    const protectedWeaponExtras = new Set([
      ...prev.classGrants.flatMap((row) =>
        (row.weaponExtras ?? []).map((item) => item.trim().toLowerCase()),
      ),
      ...prev.subclassGrants.flatMap((row) =>
        (row.weaponExtras ?? []).map((item) => item.trim().toLowerCase()),
      ),
      ...(prev.raceGrant?.weaponNames ?? []).map((item) => item.toLowerCase()),
    ])
    return {
      identity: prev.identity,
      skills: prev.skills,
      inventory: prev.inventory,
      textBlocks: prev.textBlocks,
      weapons: prev.weapons,
      backgroundGrant: prev.backgroundGrant,
      protectedSkills,
      protectedTools,
      protectedLanguages,
      protectedWeaponExtras,
    }
  }

  model.mergeBackgroundSlice = function mergeBackgroundSlice(prev: Draft, slice: BackgroundGrantDraftSlice): Draft {
    return {
      ...prev,
      identity: slice.identity,
      skills: slice.skills,
      inventory: slice.inventory,
      textBlocks: slice.textBlocks,
      weapons: slice.weapons,
      spells: withSpellFocusFlags(prev.spells, slice.inventory.items),
      backgroundGrant: slice.backgroundGrant,
      backgroundCatalogId: slice.backgroundGrant?.backgroundCatalogId ?? null,
    }
  }

  model.featSliceFrom = function featSliceFrom(prev: Draft): FeatGrantDraftSlice {
    return {
      abilities: prev.abilities,
      saves: prev.saves,
      skills: prev.skills,
      speed: prev.speed,
      hpMax: prev.hpMax,
      hpCurrent: prev.hpCurrent,
      featGrants: prev.featGrants,
      identity: {
        languages: prev.identity.languages,
        tools: prev.identity.tools,
        armor: prev.identity.armor,
      },
      textBlocks: prev.textBlocks,
      resources: prev.play.resources,
      spells: prev.spells,
      totalLevel: totalCharacterLevel(prev.classes),
    }
  }

  model.mergeFeatSlice = function mergeFeatSlice(prev: Draft, slice: FeatGrantDraftSlice): Draft {
    return {
      ...prev,
      abilities: slice.abilities,
      saves: slice.saves,
      skills: slice.skills,
      speed: slice.speed,
      hpMax: slice.hpMax,
      hpCurrent: slice.hpCurrent,
      featGrants: slice.featGrants,
      textBlocks: slice.textBlocks,
      spells: slice.spells,
      identity: {
        ...prev.identity,
        languages: slice.identity.languages,
        tools: slice.identity.tools,
        armor: slice.identity.armor,
      },
      play: {
        ...prev.play,
        resources: slice.resources,
      },
    }
  }

  model.subclassSliceFrom = function subclassSliceFrom(prev: Draft): SubclassGrantDraftSlice {
    return {
      identity: prev.identity,
      skills: prev.skills,
      classGrants: prev.classGrants,
      subclassGrants: prev.subclassGrants,
      subclassTransitions: prev.subclassTransitions,
      raceGrant: prev.raceGrant,
      companions: prev.companions,
      textBlocks: prev.textBlocks,
      spells: prev.spells,
    }
  }

  model.mergeSubclassSlice = function mergeSubclassSlice(prev: Draft, slice: SubclassGrantDraftSlice): Draft {
    const merged: Draft = {
      ...prev,
      identity: slice.identity,
      skills: slice.skills,
      subclassGrants: slice.subclassGrants,
      subclassTransitions: slice.subclassTransitions,
      companions: slice.companions,
      textBlocks: slice.textBlocks,
      spells: slice.spells,
    }
    const restored = reapplyRaceOverlays(model.raceSliceFrom(merged))
    return model.mergeRaceSlice(merged, restored)
  }

  model.commitSubclassGrant = function commitSubclassGrant(input: {
    classEntryId: string
    selected: CatalogEntry
    def: SubclassGrantDef
    picks: SubclassGrantPicks
    copyOldTextToNotes?: boolean
    previousDef?: SubclassGrantDef | null
    changeMode?: SubclassChangeMode | 'initial'
    changedAtClassLevel?: number
    previousNameRu?: string
    previousCatalogId?: string | null
    previousSlug?: string
    advanceWizardAfter?: boolean
  }) {
    let summary: string | null = null
    const changeMode = input.changeMode ?? 'initial'
    model.setDraft((prev) => {
      const maxSpellLevel = highestSpellSlotLevelForClasses(
        prev.classes,
        prev.subclassGrants
          .filter((row) => row.caster?.progression === 'third')
          .map((row) => ({
            classEntryId: row.classEntryId,
            progression: 'third' as const,
            ability: row.caster?.ability ?? null,
          })),
      )
      const classLevel =
        prev.classes.find((row) => row.id === input.classEntryId)?.level ?? 1
      const applied = applySubclassGrantToDraft({
        draft: model.subclassSliceFrom(prev),
        classEntryId: input.classEntryId,
        catalogId: input.selected.id,
        def: input.def,
        picks: input.picks,
        copyOldTextToNotes: input.copyOldTextToNotes,
        previousDef: input.previousDef ?? null,
        changeMode,
        classLevel,
        changedAtClassLevel: input.changedAtClassLevel ?? classLevel,
        previousNameRu: input.previousNameRu,
        previousCatalogId: input.previousCatalogId,
        previousSlug: input.previousSlug,
        maxSpellLevel,
      })
      if (!applied) return prev
      summary = applied.summary
      const withGrant = model.mergeSubclassSlice(prev, applied.draft)
      const row = withGrant.classes.find((item) => item.id === input.classEntryId)
      const watermark =
        input.changedAtClassLevel ??
        row?.level ??
        1
      let nextPicks = withGrant.featurePicks
      if (changeMode === 'future_only') {
        const dropIds = [
          ...listSubclassFeatureIdsAboveLevel({
            className: row?.name ?? '',
            subclassSlug: input.previousSlug ?? input.previousDef?.slug,
            minLevel: watermark,
          }),
          ...listSubclassFeatureIdsAboveLevel({
            className: row?.name ?? '',
            subclassSlug: input.def.slug,
            minLevel: watermark,
          }),
        ]
        nextPicks = clearFeaturePicksForFeatureIds(
          withGrant.featurePicks,
          input.classEntryId,
          dropIds,
        )
      } else if (changeMode === 'replace_all') {
        nextPicks = clearFeaturePicksForClass(withGrant.featurePicks, input.classEntryId)
      }
      // Battle Master: maneuvers_3 → combat_superiority (sheet archetype block / spend)
      nextPicks = bridgeOriginPicks({
        featurePicks: nextPicks,
        classEntryId: input.classEntryId,
        subclassSlug: input.def.slug,
        grantPicks: input.picks,
      })
      nextPicks = bridgeManeuversIntoFeaturePicks({
        featurePicks: nextPicks,
        classEntryId: input.classEntryId,
        maneuverIds: extractManeuverIdsFromSubclassPicks(input.picks),
        mode: 'merge_missing',
      })
      nextPicks = bridgeSwordsFightingStyle({
        featurePicks: nextPicks,
        classEntryId: input.classEntryId,
        styleId: swordsFightingStyleFromSubclassPicks(input.picks),
      })
      return {
        ...withGrant,
        featurePicks: nextPicks,
        classes: withGrant.classes.map((item) =>
          item.id === input.classEntryId
            ? {
                ...item,
                subclass_name: input.selected.name_ru,
                subclass_catalog_id: input.selected.id,
              }
            : item,
        ),
        identity:
          withGrant.classes[0]?.id === input.classEntryId
            ? { ...withGrant.identity, subclassName: input.selected.name_ru }
            : withGrant.identity,
      }
    })
    if (summary) {
      model.onToast(`Архетип «${input.selected.name_ru}»: ${summary}`)
    }
    if (input.advanceWizardAfter) {
      model.advanceGuidedWizardAfterSubclass()
    }
  }

  model.advanceGuidedWizardAfterSubclass = function advanceGuidedWizardAfterSubclass() {
    model.setPausedWizardForSubclass((paused) => {
      if (paused) {
        const nextIndex = paused.index + 1
        if (nextIndex >= paused.steps.length) {
          model.setGuidedWizard(null)
        } else {
          model.setGuidedWizard({ ...paused, index: nextIndex })
        }
        return null
      }
      model.setGuidedWizard((prev) => {
        if (!prev) return null
        const nextIndex = prev.index + 1
        if (nextIndex >= prev.steps.length) return null
        return { ...prev, index: nextIndex }
      })
      return null
    })
  }

  model.beginSubclassSelection = function beginSubclassSelection(input: {
    classEntryId: string
    selected: CatalogEntry
    copyOldTextToNotes?: boolean
    previousDef?: SubclassGrantDef | null
    changeMode?: SubclassChangeMode | 'initial'
    changedAtClassLevel?: number
    previousNameRu?: string
    previousCatalogId?: string | null
    previousSlug?: string
    advanceWizardAfter?: boolean
  }) {
    const def = resolveSubclassDefFromCatalog({
      nameRu: input.selected.name_ru,
      slug: input.selected.slug,
      catalogData: input.selected.data,
    })
    if (!def) {
      model.patchClass(input.classEntryId, {
        subclass_name: input.selected.name_ru,
        subclass_catalog_id: input.selected.id,
      })
      model.onToast(`Архетип «${input.selected.name_ru}» без пакета грантов — только имя`)
      if (input.advanceWizardAfter) model.advanceGuidedWizardAfterSubclass()
      return
    }
    if (subclassNeedsSetupDialog(def)) {
      // Pause wizard so archetype forks open in SubclassSetup alone (same as
      // background setup — avoids stacking under the wizard at z-index 50).
      if (input.advanceWizardAfter && model.guidedWizard) {
        model.setPausedWizardForSubclass(model.guidedWizard)
        model.setGuidedWizard(null)
      }
      model.setSubclassSetup({
        classEntryId: input.classEntryId,
        selected: input.selected,
        def,
        copyOldTextToNotes: Boolean(input.copyOldTextToNotes),
        previousDef: input.previousDef ?? null,
        changeMode: input.changeMode,
        changedAtClassLevel: input.changedAtClassLevel,
        previousNameRu: input.previousNameRu,
        previousCatalogId: input.previousCatalogId,
        previousSlug: input.previousSlug,
        advanceWizardAfter: input.advanceWizardAfter,
      })
      return
    }
    model.commitSubclassGrant({
      classEntryId: input.classEntryId,
      selected: input.selected,
      def,
      picks: emptySubclassPicks(),
      copyOldTextToNotes: input.copyOldTextToNotes,
      previousDef: input.previousDef ?? null,
      changeMode: input.changeMode,
      changedAtClassLevel: input.changedAtClassLevel,
      previousNameRu: input.previousNameRu,
      previousCatalogId: input.previousCatalogId,
      previousSlug: input.previousSlug,
      advanceWizardAfter: input.advanceWizardAfter,
    })
  }

  model.requestSubclassChange = function requestSubclassChange(classEntryId: string, selected: CatalogEntry) {
    const existing = model.draft.subclassGrants.find((row) => row.classEntryId === classEntryId)
    const transition = model.draft.subclassTransitions.find(
      (row) => row.classEntryId === classEntryId,
    )
    const row = model.draft.classes.find((item) => item.id === classEntryId)
    const currentCatalogId =
      row?.subclass_catalog_id ||
      transition?.activeCatalogId ||
      existing?.catalogId ||
      null
    if (currentCatalogId && currentCatalogId !== selected.id) {
      const previousSlug =
        transition?.mode === 'future_only'
          ? transition.previousSlug || existing?.slug || ''
          : existing?.slug || transition?.previousSlug || ''
      const previousDef = resolveSubclassDefFromCatalog({
        nameRu: row?.subclass_name || existing?.slug || '',
        slug: existing?.slug || previousSlug,
        catalogData: null,
        parentSlug: existing?.parentSlug,
      })
      model.setSubclassChange({
        classEntryId,
        selected,
        def:
          resolveSubclassDefFromCatalog({
            nameRu: selected.name_ru,
            slug: selected.slug,
            catalogData: selected.data,
          }) ??
          ({
            slug: selected.slug,
            labelRu: selected.name_ru,
            nameEn: selected.name_en ?? '',
            parentSlug: '',
            grantsLevel: 3,
            source: 'phb',
            sheetGrants: {
              armor: [],
              weapons: { simple: false, martial: false, extras: [] },
              toolsFixed: [],
              skillsFixed: [],
              languagesFixed: [],
              skillChoices: null,
              languageChoices: null,
              caster: null,
            },
            choices: [],
            alwaysPreparedSpells: [],
            featuresByLevel: {},
          } satisfies SubclassGrantDef),
        fromName: row?.subclass_name || existing?.slug || '',
        textSnippets: collectGrantTextSnippets({ def: previousDef, grant: existing ?? null }),
        previousDef,
        previousSlug: existing?.slug || previousSlug,
        previousCatalogId: existing?.catalogId ?? null,
        classLevel: row?.level ?? 1,
      })
      return
    }
    model.beginSubclassSelection({ classEntryId, selected })
  }
}
