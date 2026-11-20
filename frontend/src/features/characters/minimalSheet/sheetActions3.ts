/** Действия листа, группа 3. Тела функций перенесены без изменения порядка вызовов. */
import type { SheetModel } from './sheetModel'
import { getCharacter } from '../../../shared/api/characters'
import { ApiRequestError } from '../../../shared/api/client'
import { addMulticlassLevel, bumpClassLevel, totalCharacterLevel } from '../../../shared/dnd/classLevels'
import { applyBackgroundGrantToDraft, revokeBackgroundGrant } from '../backgroundEffects'
import {
  backgroundGrantNeedsSetupDialog,
  backgroundVariantsForRoot,
  emptyBackgroundPicks,
  isBackgroundComboboxRoot,
  resolveBackgroundGrantDef,
  type BackgroundGrantDef,
  type BackgroundGrantPicks,
} from '../../../shared/dnd/backgroundGrants'
import { reconcileSubclassSpellcasting } from '../reconcileSpellcasting'
import { listCatalogEntries, type CatalogEntry } from '../../../shared/api/catalog'
import {
  emptyRacePicks,
  isRaceComboboxRoot,
  raceGrantNeedsSetupDialog,
  raceSubraceRequired,
  resolveRaceGrantDef,
} from '../../../shared/dnd/raceGrants'
import { type GuidedWizardSession } from '../GuidedWizardDialog'
import { type LevelUpChoice } from '../LevelUpDialog'
import { applyClassAsiBonuses, asiAlreadyApplied, isAsiFeature, type AppliedClassAsi } from '../../../shared/dnd/classAsi'
import { buildPendingWizardSteps, isWizardClassName, withWizardSpellbookPicksStep, type GuidedWizardStep } from '../../../shared/dnd/pendingFeatureChoices'
import { sumFeatHpPerLevel, type AppliedFeatGrant } from '../../../shared/dnd/featGrants'
import { expectedPassiveHpBonuses } from '../../../shared/dnd/hpPassiveBonuses'
import { applyFeatGrantToDraft, revokeFeatGrantsForBackground, syncFeatProficiencyResources } from '../featEffects'
import { syncHitDicePools } from '../../../shared/dnd/classHitDice'
import { withSyncedHitDiceSummary } from '../play'
import { unlockFeaturesForClasses } from '../../../shared/dnd/classFeatures'
import { withPactTomeCantripsStep } from '../pactTomeEffects'
import { type IdentityExtras } from '../identity'
import { revokeRaceGrant, syncRaceSpellsForSheetState } from '../raceEffects'
import { characterHasCasterClass } from '../../../shared/dnd/casterProgression'
import { freeBookSlotsAtLevel } from '../../../shared/dnd/wizardSpellbook'
import { isCountedKnownForm2024 } from '../../../shared/dnd/druid2024Features'
import {
  buildPendingWizardSteps2024,
  resolveClassSlug2024,
  weaponMasteryGain2024,
} from '../../../shared/dnd/pendingFeatureChoices2024'
import { ABILITY_LABELS, type AbilityKey } from '../sheetTypes'
import { buildDraft, grantedFeatSlugFromCatalog, subclassSlugMapFromLedger, subclassTransitionMapFromLedger, type Draft } from './draft'
import {
  mergeFeaturePicksPreservingNonEmpty,
  readFeaturePicks,
  rebindStaleMetamagicPicks,
} from '../../../shared/dnd/featurePicks'
import { listSorcererClassEntryIds } from '../../../shared/dnd/sorcererMetamagicIds'

export function installSheetActions3(model: SheetModel) {
  model.requestOrApplyRaceGrant = async function requestOrApplyRaceGrant(selected: CatalogEntry) {
    if (!isRaceComboboxRoot(selected)) {
      model.onToast(`«${selected.name_ru}» — выбери корневую расу; подраса будет в попапе`)
      return
    }
    const rootDef = resolveRaceGrantDef({
      raceName: selected.name_ru,
      catalogSlug: selected.slug,
      catalogData: selected.data,
      nameRu: selected.name_ru,
    })
    if (!rootDef) {
      model.onToast(`Раса «${selected.name_ru}» пока без пакета эффектов — выставь вручную`)
      model.setDraft((prev) => ({
        ...prev,
        raceName: selected.name_ru,
        raceCatalogId: selected.id,
      }))
      return
    }

    let allRaces = model.raceCatalogCacheRef.current
    if (!allRaces) {
      try {
        allRaces = await listCatalogEntries({
          kind: 'race',
          edition: model.rulesEdition,
        })
        model.raceCatalogCacheRef.current = allRaces
      } catch {
        model.onToast('Не удалось загрузить справочник рас — попробуй ещё раз')
        return
      }
    }

    const subraces = allRaces
      .filter((row: { parent_id: string | null }) => row.parent_id === selected.id)
      .sort((a: { sort_order: number; name_ru: string }, b: { sort_order: number; name_ru: string }) => a.sort_order - b.sort_order || a.name_ru.localeCompare(b.name_ru, 'ru'))
    const subraceRequired = raceSubraceRequired(selected.data)

    if (subraces.length > 0 || raceGrantNeedsSetupDialog(rootDef)) {
      model.setIdentityOpen(false)
      model.setRaceGrantPicker({
        root: selected,
        subraces,
        subraceRequired,
      })
      return
    }

    model.commitRaceGrant({
      selected,
      picks: emptyRacePicks(),
      def: rootDef,
    })
  }

  model.openRaceSetupFromNeedsSetup = async function openRaceSetupFromNeedsSetup() {
    const raceCatalogId = model.draft.raceCatalogId
    const grant = model.draft.raceGrant
    if (!raceCatalogId && !grant) {
      model.setIdentityOpen(true)
      return
    }
    let allRaces = model.raceCatalogCacheRef.current
    if (!allRaces) {
      try {
        allRaces = await listCatalogEntries({
          kind: 'race',
          edition: model.rulesEdition,
        })
        model.raceCatalogCacheRef.current = allRaces
      } catch {
        model.onToast('Не удалось загрузить справочник рас')
        return
      }
    }
    const selected =
      allRaces.find((row: { id: string }) => row.id === raceCatalogId) ??
      allRaces.find((row: { slug: string }) => row.slug === grant?.slug) ??
      null
    if (!selected) {
      model.setIdentityOpen(true)
      return
    }
    const root =
      selected.parent_id != null
        ? allRaces.find((row: { id: string }) => row.id === selected.parent_id) ?? selected
        : selected
    const subraces = allRaces
      .filter((row: { parent_id: string | null }) => row.parent_id === root.id)
      .sort((a: { sort_order: number; name_ru: string }, b: { sort_order: number; name_ru: string }) => a.sort_order - b.sort_order || a.name_ru.localeCompare(b.name_ru, 'ru'))
    model.setIdentityOpen(false)
    model.setRaceGrantPicker({
      root,
      subraces,
      subraceRequired: raceSubraceRequired(root.data),
    })
  }

  model.applyHomebrewRace = function applyHomebrewRace(name: string) {
    model.setDraft((prev) => {
      const cleared = revokeRaceGrant(model.raceSliceFrom(prev))
      return {
        ...model.mergeRaceSlice(prev, cleared),
        raceName: name,
        raceCatalogId: null,
      }
    })
    model.onToast(`Хомбрю-раса «${name}»: название на листе. Остальное заполни сам.`)
  }

  model.resumeWizardAfterBackground = function resumeWizardAfterBackground() {
    model.setPausedWizardForBackground((paused) => {
      if (!paused) return null
      const bgIndex = paused.steps.findIndex((step) => step.kind === 'background')
      const nextIndex = bgIndex >= 0 ? bgIndex + 1 : paused.index + 1
      if (nextIndex >= paused.steps.length) {
        model.onToast('Теперь выбери класс — навыки предыстории уже на листе, дубли не предложим')
        model.setGuidedWizard(null)
        return null
      }
      model.setGuidedWizard({ ...paused, index: nextIndex })
      return null
    })
  }

  model.commitBackgroundGrant = function commitBackgroundGrant(input: {
    selected: CatalogEntry
    picks: BackgroundGrantPicks
    def?: BackgroundGrantDef | null
  }) {
    let summary: string | null = null
    let incompleteExpertise: GuidedWizardStep[] = []
    const grantedFeatSlug = grantedFeatSlugFromCatalog(input.selected)
    model.setDraft((prev) => {
      const prevSlug = prev.identity.backgroundSlug
      let base: Draft = prev
      if (prevSlug && prevSlug !== input.selected.slug) {
        base = model.mergeFeatSlice(
          base,
          revokeFeatGrantsForBackground({
            draft: model.featSliceFrom(base),
            backgroundSlug: prevSlug,
          }),
        )
      }
      const applied = applyBackgroundGrantToDraft({
        draft: model.backgroundSliceFrom(base),
        selected: input.selected,
        picks: input.picks,
        def: input.def,
      })
      if (!applied) return prev
      summary = applied.summary
      const backgroundMerged = model.mergeBackgroundSlice(base, applied.draft)
      const merged = {
        ...backgroundMerged,
        backgroundCatalogId: input.selected.id,
        identity: {
          ...backgroundMerged.identity,
          background: input.selected.name_ru,
          backgroundSlug: input.selected.slug,
        },
      }
      // Довыбор Expertise после фона (если ещё не выбрана) — навыки фона уже в пуле.
      if (!model.pausedWizardForBackground) {
        const unlocked = unlockFeaturesForClasses({
          classes: merged.classes,
          characterLevel: totalCharacterLevel(merged.classes),
          abilities: merged.abilities,
          subclassSlugByEntryId: subclassSlugMapFromLedger(merged),
          subclassTransitionByEntryId: subclassTransitionMapFromLedger(
            merged.subclassTransitions,
          ),
        })
        const hasSubclass: Record<string, boolean> = {}
        for (const row of merged.classes) {
          hasSubclass[row.id] = Boolean(row.subclass_catalog_id || row.subclass_name.trim())
        }
        incompleteExpertise = buildPendingWizardSteps({
          unlocked,
          featurePicks: merged.featurePicks,
          classAsi: merged.classAsi,
          filter: { mode: 'all_empty' },
          hasSubclassByEntryId: hasSubclass,
        }).filter(
          (step) =>
            step.kind === 'feature_choice' &&
            step.choice.options_from === 'expertise_skills_tools',
        )
      }
      return merged
    })
    if (summary) model.onToast(`Предыстория «${input.selected.name_ru}»: ${summary}`)
    if (model.pausedWizardForBackground) {
      model.resumeWizardAfterBackground()
      return
    }
    if (incompleteExpertise.length > 0 && !model.guidedWizard) {
      model.openGuidedWizard({ steps: incompleteExpertise, index: 0 })
    }
    if (
      grantedFeatSlug &&
      !model.draft.featGrants.some((row) => row.slug === grantedFeatSlug)
    ) {
      model.setBackgroundFeatSlug(grantedFeatSlug)
    }
  }

  model.requestOrApplyBackgroundGrant = async function requestOrApplyBackgroundGrant(selected: CatalogEntry) {
    if (!isBackgroundComboboxRoot(selected)) {
      model.onToast(
        `«${selected.name_ru}» — выбери корневую предысторию; вариант будет в попапе`,
      )
      return
    }

    let allBackgrounds = model.backgroundCatalogCacheRef.current
    if (!allBackgrounds) {
      try {
        allBackgrounds = await listCatalogEntries({
          kind: 'background',
          edition: model.rulesEdition,
        })
        model.backgroundCatalogCacheRef.current = allBackgrounds
      } catch {
        model.onToast('Не удалось загрузить справочник предысторий — попробуй ещё раз')
        return
      }
    }

    const variants = backgroundVariantsForRoot(selected, allBackgrounds)
    const def = resolveBackgroundGrantDef({
      backgroundName: selected.name_ru,
      catalogSlug: selected.slug,
      catalogData: selected.data,
      nameRu: selected.name_ru,
    })
    if (!def) {
      model.onToast(
        `Предыстория «${selected.name_ru}» пока без пакета эффектов — выставь вручную`,
      )
      model.setDraft((prev) => {
        const cleared = revokeBackgroundGrant(model.backgroundSliceFrom(prev))
        return {
          ...model.mergeBackgroundSlice(prev, cleared),
          identity: { ...cleared.identity, background: selected.name_ru },
          backgroundCatalogId: selected.id,
        }
      })
      model.resumeWizardAfterBackground()
      return
    }

    if (variants.length > 0 || backgroundGrantNeedsSetupDialog(def)) {
      model.setIdentityOpen(false)
      model.setBackgroundGrantPicker({ root: selected, variants })
      return
    }

    model.commitBackgroundGrant({
      selected,
      picks: emptyBackgroundPicks(),
      def,
    })
  }

  model.applyHomebrewBackground = function applyHomebrewBackground(name: string) {
    model.setDraft((prev) => {
      const cleared = revokeBackgroundGrant(model.backgroundSliceFrom(prev))
      let merged = model.mergeBackgroundSlice(prev, cleared)
      const prevSlug = prev.identity.backgroundSlug
      if (prevSlug) {
        merged = model.mergeFeatSlice(
          merged,
          revokeFeatGrantsForBackground({
            draft: model.featSliceFrom(merged),
            backgroundSlug: prevSlug,
          }),
        )
      }
      return {
        ...merged,
        identity: { ...merged.identity, background: name, backgroundSlug: null },
        backgroundCatalogId: null,
      }
    })
    model.onToast(
      `Хомбрю-предыстория «${name}»: название на листе. Остальное заполни сам.`,
    )
  }

  model.applyLevelUp = function applyLevelUp(choice: LevelUpChoice) {
    if (totalCharacterLevel(model.draft.classes) >= 20) return

    const existedBefore =
      choice.type === 'multiclass'
        ? model.draft.classes.some(
            (row) => row.name.trim().toLowerCase() === choice.name.trim().toLowerCase(),
          )
        : true

    const nextClasses =
      choice.type === 'same'
        ? bumpClassLevel(model.draft.classes, choice.classId)
        : addMulticlassLevel(model.draft.classes, {
            name: choice.name,
            catalog_id: choice.catalog_id,
          })
    const newMulticlassRow =
      choice.type === 'multiclass' && !existedBefore
        ? nextClasses.find(
            (row) => row.name.trim().toLowerCase() === choice.name.trim().toLowerCase(),
          ) ?? null
        : null

    const nextLevel = totalCharacterLevel(nextClasses)
    const gain = Math.max(0, Math.floor(choice.hpGain))
    const leveledRow =
      choice.type === 'same'
        ? nextClasses.find((row) => row.id === choice.classId) ?? null
        : newMulticlassRow ??
          nextClasses.find(
            (row) => row.name.trim().toLowerCase() === choice.name.trim().toLowerCase(),
          ) ??
          null

    let tableChanged = false
    model.setDraft((prev) => {
      const toughBonus = sumFeatHpPerLevel(prev.featGrants)
      const prevMax = prev.hpMax
      const nextMax = prevMax == null ? gain + toughBonus : prevMax + gain + toughBonus
      const prevCurrent = prev.hpCurrent
      const nextCurrent =
        prevCurrent == null ? nextMax : Math.min(nextMax, prevCurrent + gain + toughBonus)
      const hitDiceByClass = syncHitDicePools({
        classes: nextClasses,
        previous: prev.play.hitDiceByClass,
      })
      const withClasses: Draft = {
        ...prev,
        classes: nextClasses,
        hpMax: nextMax,
        hpCurrent: nextCurrent,
        play: withSyncedHitDiceSummary({
          ...prev.play,
          hitDiceByClass,
          hitDie: choice.hitDie ?? prev.play.hitDie,
        }),
      }
      const withFeatPools = model.mergeFeatSlice(
        withClasses,
        syncFeatProficiencyResources({
          ...model.featSliceFrom(withClasses),
          totalLevel: nextLevel,
        }),
      )
      const withRaceSpells = !withFeatPools.raceGrant
        ? withFeatPools
        : {
            ...withFeatPools,
            spells: syncRaceSpellsForSheetState({
              spells: withFeatPools.spells,
              grant: withFeatPools.raceGrant,
              characterLevel: nextLevel,
              hasCasterClass: characterHasCasterClass(nextClasses),
              raceLabelRu: withFeatPools.raceName,
            }),
          }
      const reconciled = reconcileSubclassSpellcasting({
        classes: nextClasses,
        abilities: withRaceSpells.abilities,
        slice: model.subclassSliceFrom(withRaceSpells),
      })
      tableChanged = reconciled.tableChanged
      const merged = model.mergeSubclassSlice(withRaceSpells, reconciled.slice)
      const draconicResilience = (model.unlockedFeatures ?? []).some(
        (f: { id?: string }) => f.id === 'draconic_resilience',
      )
      return {
        ...merged,
        passiveHpBonuses: expectedPassiveHpBonuses({
          classes: nextClasses,
          draconicResilience,
          raceSlug: merged.raceGrant?.slug ?? null,
        }),
      }
    })
    model.setLevelUpOpen(false)
    const sheetEdition = model.baseCharacter?.rules_edition ?? model.rulesEdition ?? '2014'
    if (sheetEdition === '2024') {
      const hpNote2024 = ` · хиты +${Math.max(0, Math.floor(choice.hpGain))}`
      const slotNote2024 = tableChanged ? ' · ячейки 2024 обновлены' : ''
      const masterySlug = resolveClassSlug2024(leveledRow)
      const masteryGain = leveledRow
        ? weaponMasteryGain2024(masterySlug, leveledRow.level)
        : 0
      const masteryNote =
        masteryGain > 0
          ? ` · Оружейное мастерство +${masteryGain}: выбери виды на листе`
          : ''
      model.onToast(
        choice.type === 'same'
          ? `Уровень класса +1${hpNote2024}${slotNote2024}${masteryNote}`
          : `Мультикласс: ${choice.name.trim()} 1${hpNote2024}${slotNote2024}${masteryNote}`,
      )

      if (newMulticlassRow) {
        model.requestOrApplyClassGrant({
          classEntryId: newMulticlassRow.id,
          className: newMulticlassRow.name,
          mode: 'multiclass',
          catalogSlug: choice.type === 'multiclass' ? choice.catalog_slug : null,
          catalogData: choice.type === 'multiclass' ? choice.catalog_data : null,
          classesOverride: nextClasses,
        })
        return
      }

      if (leveledRow && choice.type === 'same') {
        const steps = buildPendingWizardSteps2024({
          classEntryId: leveledRow.id,
          className: leveledRow.name,
          classSlug: masterySlug,
          classLevel: leveledRow.level,
          hasSubclass: Boolean(leveledRow.subclass_catalog_id || leveledRow.subclass_name.trim()),
          classAsi: model.draft.classAsi,
          subclassSlug: model.subclassSlugByEntryId[leveledRow.id] || leveledRow.subclass_catalog_id,
          featurePicks: model.draft.featurePicks,
          classOptions: model.draft.classOptions2024,
          knownFormsCount: model.draft.knownForms.filter(isCountedKnownForm2024).length,
        })
        if (steps.length > 0) {
          model.openGuidedWizard({ steps, index: 0 })
        }
      }
      return
    }
    const hpNote = ` · хиты +${Math.max(0, Math.floor(choice.hpGain))}`
    const slotNote = tableChanged
      ? ` · ячейки по таблице ${model.baseCharacter.rules_edition === '2024' ? 'класса' : '2014'}`
      : ''
    model.onToast(
      choice.type === 'same'
        ? `Уровень класса +1${hpNote}${slotNote}`
        : `Мультикласс: ${choice.name.trim()} 1${hpNote}${slotNote}`,
    )

    if (newMulticlassRow) {
      model.requestOrApplyClassGrant({
        classEntryId: newMulticlassRow.id,
        className: newMulticlassRow.name,
        mode: 'multiclass',
        catalogSlug: choice.type === 'multiclass' ? choice.catalog_slug : null,
        catalogData: choice.type === 'multiclass' ? choice.catalog_data : null,
        classesOverride: nextClasses,
      })
    }

    if (leveledRow && choice.type === 'same') {
      const unlocked = unlockFeaturesForClasses({
        classes: nextClasses,
        characterLevel: nextLevel,
        abilities: model.draft.abilities,
        subclassSlugByEntryId: model.subclassSlugByEntryId,
        subclassTransitionByEntryId: model.subclassTransitionByEntryId,
      })
      const hasSubclass: Record<string, boolean> = {}
      for (const row of nextClasses) {
        hasSubclass[row.id] = Boolean(row.subclass_catalog_id || row.subclass_name.trim())
      }
      let steps = buildPendingWizardSteps({
        unlocked,
        featurePicks: model.draft.featurePicks,
        classAsi: model.draft.classAsi,
        filter: {
          mode: 'at_class_level',
          classEntryId: leveledRow.id,
          classLevel: leveledRow.level,
        },
        hasSubclassByEntryId: hasSubclass,
      })
      if (isWizardClassName(leveledRow.name) && leveledRow.level >= 2) {
        steps = withWizardSpellbookPicksStep(steps, {
          classEntryId: leveledRow.id,
          className: leveledRow.name,
          classLevel: leveledRow.level,
          picksNeeded: freeBookSlotsAtLevel(leveledRow.level),
        })
      }
      steps = withPactTomeCantripsStep(steps, {
        classEntryId: leveledRow.id,
        className: leveledRow.name,
        classLevel: leveledRow.level,
        featurePicks: model.draft.featurePicks,
      })
      if (
        !hasSubclass[leveledRow.id] &&
        steps.some((step) => step.kind === 'subclass')
      ) {
        model.onToast(
          `У «${leveledRow.name}» на ${leveledRow.level} ур. выбери архетип в развилках`,
        )
      }
      if (steps.length > 0) {
        model.openGuidedWizard({ steps, index: 0 })
        return
      }
      // Gear path: ClassAsiDialog (feat pick) when wizard has nothing pending.
      const asiAtLevel = unlocked.find(
        (feature) =>
          feature.classEntryId === leveledRow.id &&
          feature.source === 'class' &&
          feature.level === leveledRow.level &&
          isAsiFeature(feature),
      )
      if (
        asiAtLevel &&
        !asiAlreadyApplied(model.draft.classAsi, leveledRow.id, asiAtLevel.id)
      ) {
        model.setPendingAsi({
          classEntryId: leveledRow.id,
          className: leveledRow.name,
          classLevel: leveledRow.level,
          featureId: asiAtLevel.id,
        })
      }
    }
  }

  model.confirmClassAsi = function confirmClassAsi(entry: AppliedClassAsi, featGrant?: AppliedFeatGrant) {
    model.setDraft((prev) => {
      let next: Draft = {
        ...prev,
        abilities: applyClassAsiBonuses(prev.abilities, entry.bonuses),
        classAsi: [...prev.classAsi, entry],
      }
      if (featGrant) {
        next = model.mergeFeatSlice(
          next,
          applyFeatGrantToDraft({ draft: model.featSliceFrom(next), grant: featGrant }),
        )
      }
      return next
    })
    model.setPendingAsi(null)
    if (featGrant) {
      model.onToast(`Увеличение характеристик → черта «${featGrant.nameRu}»`)
      return
    }
    const bits = Object.entries(entry.bonuses)
      .filter(([, amount]) => amount)
      .map(([key, amount]) => `${ABILITY_LABELS[key as AbilityKey]}+${amount}`)
    model.onToast(bits.length ? `Увеличение характеристик: ${bits.join(', ')}` : 'Увеличение характеристик записано')
  }

  model.finishWizardQueue = function finishWizardQueue(prev: GuidedWizardSession) {
    const last = prev.steps[prev.index]
    if (last?.kind === 'background') {
      model.onToast('Теперь выбери класс — навыки предыстории уже на листе, дубли не предложим')
    } else if (last?.kind === 'feature_choice' || last?.kind === 'asi' || last?.kind === 'class_grant') {
      if (!model.draft.raceName.trim()) {
        model.onToast('Класс готов. Дальше — раса (если даст черту, мастер подскажет)')
      }
    }
    return null
  }

  model.advanceGuidedWizard = function advanceGuidedWizard(nextIndex: number) {
    model.setGuidedWizard((prev) => {
      if (!prev) return null
      if (nextIndex >= prev.steps.length) return model.finishWizardQueue(prev)
      return { ...prev, index: nextIndex }
    })
  }

  model.skipGuidedWizardStep = function skipGuidedWizardStep() {
    model.setGuidedWizard((prev) => {
      if (!prev) return null
      const nextIndex = prev.index + 1
      if (nextIndex >= prev.steps.length) return model.finishWizardQueue(prev)
      return { ...prev, index: nextIndex }
    })
  }

  model.patchIdentity = function patchIdentity(patch: Partial<IdentityExtras>) {
    model.setDraft((prev) => ({ ...prev, identity: { ...prev.identity, ...patch } }))
  }

  model.reloadFromServer = async function reloadFromServer() {
    model.setReloading(true)
    model.setError(null)
    try {
      const fresh = await getCharacter(model.baseCharacter.id)
      model.baseCharacterRef.current = fresh
      model.sheetVersionRef.current = fresh.sheet_version
      model.setBaseCharacter(fresh)
      model.setDraft(buildDraft(fresh))
      model.setSheetVersion(fresh.sheet_version)
      model.setConflictOpen(false)
      model.conflictOpenRef.current = false
      model.skipAutosaveRef.current = true
      model.onSaved(fresh)
      model.onToast('Лист обновлён с сервера')
      model.setSaveStatus('saved')
    } catch (err) {
      model.setError(err instanceof ApiRequestError ? err.message : 'Не удалось обновить лист')
    } finally {
      model.setReloading(false)
    }
  }

/** Keep on-screen edits: adopt server version number, then overwrite with local draft. */
  model.saveLocalOverServer = async function saveLocalOverServer() {
    model.setReloading(true)
    model.setError(null)
    try {
      const fresh = await getCharacter(model.baseCharacterRef.current.id)
      model.baseCharacterRef.current = fresh
      model.sheetVersionRef.current = fresh.sheet_version
      model.setBaseCharacter(fresh)
      model.setSheetVersion(fresh.sheet_version)
      model.setConflictOpen(false)
      model.conflictOpenRef.current = false
      // Preserve server metamagic (and other non-empty picks) if this tab never had them.
      const liveDraft = model.draftRef.current
      const liveIds = listSorcererClassEntryIds(liveDraft.classes)
      const localPicks = rebindStaleMetamagicPicks({
        featurePicks: liveDraft.featurePicks,
        liveClassEntryIds: liveIds,
      })
      const serverPicks = rebindStaleMetamagicPicks({
        featurePicks: readFeaturePicks(
          (fresh.sheet as Record<string, unknown> | undefined)?.feature_picks,
        ),
        liveClassEntryIds: liveIds,
      })
      const mergedPicks = mergeFeaturePicksPreservingNonEmpty(localPicks, serverPicks)
      const nextDraft = { ...liveDraft, featurePicks: mergedPicks }
      model.draftRef.current = nextDraft
      model.setDraft(nextDraft)
      const ok = await model.persistDraft({ quiet: true, conflictRetry: true })
      if (ok) {
        model.onToastRef.current('Твои правки сохранены')
      }
    } catch (err) {
      model.setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить правки')
      model.setConflictOpen(true)
      model.conflictOpenRef.current = true
    } finally {
      model.setReloading(false)
    }
  }
}
