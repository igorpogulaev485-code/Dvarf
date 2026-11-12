/** Повышение уровня и диалоги выбора класса, расы, черт и архетипа. */
import type { SheetModel } from './sheetModel'
import { type RulesEdition } from '../../../shared/api/characters'
import { totalCharacterLevel } from '../../../shared/dnd/classLevels'
import { applyClassGrantToDraft } from '../classEffects'
import { ClassSetupDialog, HomebrewClassDialog } from '../ClassSetupDialog'
import { RaceSetupDialog, HomebrewRaceDialog } from '../RaceSetupDialog'
import { BackgroundSetupDialog, HomebrewBackgroundDialog } from '../BackgroundSetupDialog'
import { SubclassSetupDialog } from '../SubclassSetupDialog'
import { SubclassChangeConfirmDialog } from '../SubclassChangeConfirmDialog'
import { GuidedWizardDialog } from '../GuidedWizardDialog'
import { ClassAsiDialog } from '../ClassAsiDialog'
import { FeatSetupDialog, type FeatSetupResult } from '../FeatSetupDialog'
import { LevelUpDialog } from '../LevelUpDialog'
import { buildPendingWizardSteps, isWizardClassName, withWizardSpellbookPicksStep, type GuidedWizardStep } from '../../../shared/dnd/pendingFeatureChoices'
import { newFeatGrantId, type AppliedFeatGrant } from '../../../shared/dnd/featGrants'
import { applyFeatGrantToDraft } from '../featEffects'
import { resolveSubclassFeatureSlug, unlockFeaturesForClasses } from '../../../shared/dnd/classFeatures'
import { withPactTomeCantripsStep } from '../pactTomeEffects'
import { characterHasCasterClass, highestSpellSlotLevelForClasses } from '../../../shared/dnd/casterProgression'
import { freeBookSlotsAtLevel, remainingFreeSpellbookSlots } from '../../../shared/dnd/wizardSpellbook'
import { wizardHasUsableSpellbook } from '../wizardSpellbookInventory'
import { addCatalogSpellToKnown } from '../spells'
import { abilityModifier } from '../sheetTypes'
import { subclassSlugMapFromLedger, subclassTransitionMapFromLedger } from './draft'

export function SheetDialogsSetup({ model }: { model: SheetModel }) {
  return (
    <>
      <LevelUpDialog
        open={model.levelUpOpen}
        edition={model.baseCharacter.rules_edition as RulesEdition}
        classes={model.draft.classes}
        abilities={model.draft.abilities}
        constitutionMod={abilityModifier(model.draft.abilities.con)}
        draconicResilience={(model.unlockedFeatures ?? []).some(
          (f: { id?: string }) => f.id === 'draconic_resilience',
        )}
        onConfirm={model.applyLevelUp}
        onClose={() => model.setLevelUpOpen(false)}
      />

      <GuidedWizardDialog
        open={model.guidedWizard != null}
        session={model.guidedWizard}
        abilities={model.draft.abilities}
        skills={model.draft.skills}
        tools={model.draft.identity.tools}
        featurePicks={model.draft.featurePicks}
        expertiseKeys={model.expertiseKeys}
        onFeaturePicksChange={model.applyFeaturePicksWithExpertise}
        onConfirmClassGrant={(picks) => {
          if (!model.guidedWizard?.grant || !model.guidedWizard.steps[model.guidedWizard.index]) return
          const step = model.guidedWizard.steps[model.guidedWizard.index]
          if (step.kind !== 'class_grant') return
          const grantMeta = model.guidedWizard.grant
          const jumpTo =
            step.mode === 'start' && model.pendingStartingLevel > 1 ? model.pendingStartingLevel : 1
          const blockedSkill = new Set(model.draft.backgroundGrant?.skills ?? [])
          const blockedTool = new Set(
            (model.draft.backgroundGrant?.tools ?? []).map((name) => name.trim().toLowerCase()),
          )
          const cleanPicks = {
            ...picks,
            skills: picks.skills.filter((key) => !blockedSkill.has(key)),
            tools: picks.tools.filter(
              (name) => !blockedTool.has(name.trim().toLowerCase()),
            ),
          }
          let remaining: GuidedWizardStep[] = []
          let summary: string | null = null
          model.setDraft((prev) => {
            const applied = applyClassGrantToDraft({
              draft: model.draftSliceFrom(prev),
              classEntryId: step.classEntryId,
              className: step.className,
              mode: step.mode,
              picks: cleanPicks,
              def: grantMeta.def,
              catalogSlug: grantMeta.catalogSlug,
              catalogData: grantMeta.catalogData,
            })
            if (!applied) return prev
            summary = applied.summary
            let next = model.mergeGrantSlice(prev, applied.draft)
            if (jumpTo > 1) {
              next = model.jumpDraftToClassLevel(next, step.classEntryId, jumpTo)
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
              hasSubclass[row.id] = Boolean(
                row.subclass_catalog_id || row.subclass_name.trim(),
              )
            }
            const classLevel =
              next.classes.find((row: { id: string; level: number }) => row.id === step.classEntryId)?.level ?? 1
            remaining = buildPendingWizardSteps({
              unlocked,
              featurePicks: next.featurePicks,
              classAsi: next.classAsi,
              filter:
                jumpTo > 1
                  ? {
                      mode: 'up_to_class_level',
                      classEntryId: step.classEntryId,
                      maxClassLevel: jumpTo,
                    }
                  : {
                      mode: 'at_class_level',
                      classEntryId: step.classEntryId,
                      classLevel,
                    },
              hasSubclassByEntryId: hasSubclass,
            })
            if (isWizardClassName(step.className)) {
              const wizardLevel =
                next.classes.find((row: { id: string; level: number }) => row.id === step.classEntryId)?.level ??
                classLevel
              const freeLeft = remainingFreeSpellbookSlots(
                next.spells.known,
                wizardLevel,
              )
              if (freeLeft > 0) {
                remaining = withWizardSpellbookPicksStep(remaining, {
                  classEntryId: step.classEntryId,
                  className: step.className,
                  classLevel: wizardLevel,
                  // Jump to N: catch up all free research; L1 start: up to 6.
                  picksNeeded:
                    jumpTo > 1
                      ? freeLeft
                      : wizardLevel <= 1
                        ? Math.min(6, freeLeft)
                        : Math.min(freeBookSlotsAtLevel(wizardLevel), freeLeft),
                })
              }
            }
            remaining = withPactTomeCantripsStep(remaining, {
              classEntryId: step.classEntryId,
              className: step.className,
              classLevel:
                next.classes.find((row: { id: string; level: number }) => row.id === step.classEntryId)?.level ??
                classLevel,
              featurePicks: next.featurePicks,
            })
            return next
          })
          if (summary) {
            model.onToast(
              `${step.mode === 'start' ? 'Старт' : 'Мультикласс'} «${step.className}»: ${summary}`,
            )
          }
          if (jumpTo > 1) {
            model.onToast(`Уровень класса → ${jumpTo}. Дальше — умения и ASI.`)
            model.setPendingStartingLevel(1)
            model.onCreateGuideConsumed?.()
          }
          model.openGuidedWizard({ steps: remaining, index: 0 })
        }}
        edition={model.rulesEdition}
        backgroundName={model.draft.identity.background}
        blockedSkillKeys={model.draft.backgroundGrant?.skills ?? []}
        blockedToolNames={model.draft.backgroundGrant?.tools ?? []}
        onSelectBackground={(entry) => {
          if (model.guidedWizard) {
            model.setPausedWizardForBackground(model.guidedWizard)
            model.setGuidedWizard(null)
          }
          void model.requestOrApplyBackgroundGrant(entry)
        }}
        onConfirmAsi={model.confirmClassAsi}
        onAdvance={model.advanceGuidedWizard}
        onSkipStep={model.skipGuidedWizardStep}
        onClose={() => model.setGuidedWizard(null)}
        onToast={model.onToast}
        subclassParentCatalogIdByEntryId={Object.fromEntries(
          model.draft.classes.map((row) => [row.id, row.catalog_id]),
        )}
        selectedSubclassNameByEntryId={Object.fromEntries(
          model.draft.classes.map((row) => [row.id, row.subclass_name]),
        )}
        onPickSubclass={(classEntryId, entry) => {
          model.beginSubclassSelection({
            classEntryId,
            selected: entry,
            advanceWizardAfter: true,
          })
        }}
        spellbookPicksContext={(() => {
          const step = model.guidedWizard?.steps[model.guidedWizard.index]
          if (!step || step.kind !== 'spellbook_picks') return null
          const slotCap = highestSpellSlotLevelForClasses(
            model.draft.classes,
            model.subclassCastersForSpells,
          )
          return {
            maxSpellLevel: Math.max(1, slotCap || 1),
            blockedCatalogIds: model.draft.spells.known
              .map((spell) => spell.catalog_id)
              .filter((id): id is string => Boolean(id)),
            hasBook: wizardHasUsableSpellbook(model.draft.spells),
            classListSlugs: ['wizard'],
            subclassSlug: (() => {
              const wizard = model.draft.classes.find((row) => {
                const n = row.name.trim().toLowerCase()
                return n === 'волшебник' || n === 'wizard' || n === 'маг'
              })
              const raw = wizard?.subclass_name?.trim() || ''
              if (!raw) return null
              return (
                resolveSubclassFeatureSlug(raw) ??
                raw.toLowerCase().replace(/\s+/g, '_')
              )
            })(),
          }
        })()}
        onConfirmSpellbookPicks={(entries) => {
          const step = model.guidedWizard?.steps[model.guidedWizard.index]
          const acquisition =
            step?.kind === 'spellbook_picks' && step.classLevel <= 1
              ? 'starting'
              : 'level_up'
          model.setDraft((prev) => {
            let known = prev.spells.known
            for (const entry of entries) {
              known = addCatalogSpellToKnown(known, entry, {
                prepare: false,
                spellbook_acquisition: acquisition,
                in_spellbook: true,
              })
            }
            return {
              ...prev,
              spells: { ...prev.spells, known },
            }
          })
        }}
      />

      <ClassAsiDialog
        open={model.pendingAsi != null}
        edition={model.baseCharacter.rules_edition as RulesEdition}
        className={model.pendingAsi?.className ?? ''}
        classLevel={model.pendingAsi?.classLevel ?? 1}
        featureId={model.pendingAsi?.featureId ?? ''}
        classEntryId={model.pendingAsi?.classEntryId ?? ''}
        abilities={model.draft.abilities}
        armor={model.draft.identity.armor}
        hasSpellcasting={characterHasCasterClass(model.draft.classes)}
        hasMartialWeapons={model.draft.identity.weapons.martial}
        raceSlug={model.draft.raceGrant?.slug ?? null}
        raceParentSlug={model.draft.raceGrant?.parentSlug ?? null}
        size={model.draft.identity.size}
        characterLevel={model.characterLevel}
        takenFeatSlugs={model.draft.featGrants.map((row) => row.slug)}
        classSlugs={model.draft.classGrants.map((row) => row.slug)}
        backgroundSlug={model.draft.identity.backgroundSlug}
        ownedFeatEnums={model.ownedFeatEnums}
        proficientSkills={model.proficientSkills}
        onConfirm={model.confirmClassAsi}
        onSkip={() => model.setPendingAsi(null)}
      />

      <ClassSetupDialog
        open={model.grantPicker != null}
        def={model.grantPicker?.def ?? null}
        mode={model.grantPicker?.mode ?? 'start'}
        blockedSkillKeys={model.draft.backgroundGrant?.skills ?? []}
        blockedToolNames={model.draft.backgroundGrant?.tools ?? []}
        edition={model.baseCharacter.rules_edition as RulesEdition}
        onClose={() => model.setGrantPicker(null)}
        onConfirm={(picks) => {
          if (!model.grantPicker) return
          model.commitClassGrant({
            classEntryId: model.grantPicker.classEntryId,
            className: model.grantPicker.className,
            mode: model.grantPicker.mode,
            picks,
            def: model.grantPicker.def,
            catalogSlug: model.grantPicker.catalogSlug,
            catalogData: model.grantPicker.catalogData,
          })
          model.setGrantPicker(null)
          const choiceSteps = model.buildChoiceStepsForClass({
            classEntryId: model.grantPicker.classEntryId,
            classLevel:
              model.draft.classes.find((row) => row.id === model.grantPicker.classEntryId)?.level ?? 1,
          })
          if (choiceSteps.length > 0) {
            model.openGuidedWizard({ steps: choiceSteps, index: 0 })
          }
        }}
      />

      <HomebrewClassDialog
        open={model.homebrewPicker != null}
        initialName={model.homebrewPicker?.initialName ?? ''}
        onClose={() => model.setHomebrewPicker(null)}
        onConfirm={(name) => {
          if (!model.homebrewPicker) return
          model.applyHomebrewClass(model.homebrewPicker.classEntryId, name)
          model.setHomebrewPicker(null)
        }}
      />

      <RaceSetupDialog
        open={model.raceGrantPicker != null}
        edition={model.baseCharacter.rules_edition as RulesEdition}
        root={model.raceGrantPicker?.root ?? null}
        subraces={model.raceGrantPicker?.subraces ?? []}
        subraceRequired={model.raceGrantPicker?.subraceRequired ?? false}
        abilities={model.draft.abilities}
        armor={model.draft.identity.armor}
        hasSpellcasting={characterHasCasterClass(model.draft.classes)}
        hasMartialWeapons={model.draft.identity.weapons.martial}
        characterLevel={model.characterLevel}
        takenSlugs={model.draft.featGrants.map((row) => row.slug)}
        classSlugs={model.draft.classGrants.map((row) => row.slug)}
        backgroundSlug={model.draft.identity.backgroundSlug}
        ownedFeatEnums={model.ownedFeatEnums}
        proficientSkills={model.proficientSkills}
        characterName={model.draft.name}
        gender={model.draft.identity.gender}
        enableNameGeneration={false}
        onClose={() => model.setRaceGrantPicker(null)}
        onConfirm={(result) => {
          if (result.characterName.trim()) {
            model.setDraft((prev) => ({ ...prev, name: result.characterName.trim() }))
          }
          model.patchIdentity({ gender: result.gender })
          model.commitRaceGrant({
            selected: result.entry,
            picks: result.picks,
            def: result.def,
            featResult: result.featResult,
          })
          model.setRaceGrantPicker(null)
        }}
      />

      <FeatSetupDialog
        open={model.backgroundFeatSlug != null}
        edition={model.baseCharacter.rules_edition as RulesEdition}
        title="Черта предыстории"
        abilities={model.draft.abilities}
        armor={model.draft.identity.armor}
        hasSpellcasting={characterHasCasterClass(model.draft.classes)}
        hasMartialWeapons={model.draft.identity.weapons.martial}
        raceSlug={model.draft.raceGrant?.slug ?? null}
        raceParentSlug={model.draft.raceGrant?.parentSlug ?? null}
        size={model.draft.identity.size}
        characterLevel={model.characterLevel}
        takenSlugs={model.draft.featGrants.map((row) => row.slug)}
        classSlugs={model.draft.classGrants.map((row) => row.slug)}
        backgroundSlug={model.draft.identity.backgroundSlug}
        ownedFeatEnums={model.ownedFeatEnums}
        proficientSkills={model.proficientSkills}
        forcedSlug={model.backgroundFeatSlug}
        onClose={() => model.setBackgroundFeatSlug(null)}
        onConfirm={(result: FeatSetupResult) => {
          const bgSlug = model.draft.identity.backgroundSlug
          if (!bgSlug) {
            model.setBackgroundFeatSlug(null)
            return
          }
          const grant: AppliedFeatGrant = {
            id: newFeatGrantId(),
            featCatalogId: result.entry.id,
            slug: result.entry.slug,
            nameRu: result.entry.name_ru,
            source: { kind: 'background', backgroundSlug: bgSlug },
            applied: result.applied,
            picks: result.picks,
          }
          model.setDraft((prev) =>
            model.mergeFeatSlice(
              prev,
              applyFeatGrantToDraft({ draft: model.featSliceFrom(prev), grant }),
            ),
          )
          model.setBackgroundFeatSlug(null)
          model.onToast(`Предыстория: черта «${grant.nameRu}»`)
        }}
      />

      <FeatSetupDialog
        open={model.giftFeatOpen}
        edition={model.baseCharacter.rules_edition as RulesEdition}
        title="Черта от мастера"
        abilities={model.draft.abilities}
        armor={model.draft.identity.armor}
        hasSpellcasting={characterHasCasterClass(model.draft.classes)}
        hasMartialWeapons={model.draft.identity.weapons.martial}
        raceSlug={model.draft.raceGrant?.slug ?? null}
        raceParentSlug={model.draft.raceGrant?.parentSlug ?? null}
        size={model.draft.identity.size}
        characterLevel={model.characterLevel}
        takenSlugs={model.draft.featGrants.map((row) => row.slug)}
        classSlugs={model.draft.classGrants.map((row) => row.slug)}
        backgroundSlug={model.draft.identity.backgroundSlug}
        ownedFeatEnums={model.ownedFeatEnums}
        proficientSkills={model.proficientSkills}
        onClose={() => model.setGiftFeatOpen(false)}
        onConfirm={(result: FeatSetupResult) => {
          const grant: AppliedFeatGrant = {
            id: newFeatGrantId(),
            featCatalogId: result.entry.id,
            slug: result.entry.slug,
            nameRu: result.entry.name_ru,
            source: { kind: 'manual' },
            applied: result.applied,
            picks: result.picks,
          }
          model.setDraft((prev) =>
            model.mergeFeatSlice(
              prev,
              applyFeatGrantToDraft({ draft: model.featSliceFrom(prev), grant }),
            ),
          )
          model.setGiftFeatOpen(false)
          model.onToast(`Мастер: черта «${grant.nameRu}»`)
        }}
      />

      <HomebrewRaceDialog
        open={model.raceHomebrewOpen}
        initialName={model.draft.raceName}
        onClose={() => model.setRaceHomebrewOpen(false)}
        onConfirm={(name) => {
          model.applyHomebrewRace(name)
          model.setRaceHomebrewOpen(false)
        }}
      />

      <BackgroundSetupDialog
        open={model.backgroundGrantPicker != null}
        root={model.backgroundGrantPicker?.root ?? null}
        variants={model.backgroundGrantPicker?.variants ?? []}
        blockedLanguageNames={[
          ...(model.draft.raceGrant?.languages ?? []),
          ...(model.draft.identity.languages ?? []),
        ]}
        onClose={() => {
          model.setBackgroundGrantPicker(null)
          // Cancel from wizard: restore queue on the background step.
          if (model.pausedWizardForBackground) {
            model.setGuidedWizard(model.pausedWizardForBackground)
            model.setPausedWizardForBackground(null)
          }
        }}
        onConfirm={(result) => {
          model.commitBackgroundGrant({
            selected: result.entry,
            picks: result.picks,
            def: result.def,
          })
          model.setBackgroundGrantPicker(null)
        }}
      />

      <HomebrewBackgroundDialog
        open={model.backgroundHomebrewOpen}
        initialName={model.draft.identity.background}
        onClose={() => model.setBackgroundHomebrewOpen(false)}
        onConfirm={(name) => {
          model.applyHomebrewBackground(name)
          model.setBackgroundHomebrewOpen(false)
        }}
      />

      <SubclassChangeConfirmDialog
        open={model.subclassChange != null}
        fromName={model.subclassChange?.fromName ?? ''}
        toName={model.subclassChange?.selected.name_ru ?? ''}
        classLevel={model.subclassChange?.classLevel ?? 1}
        textSnippets={model.subclassChange?.textSnippets ?? []}
        onClose={() => model.setSubclassChange(null)}
        onConfirm={({ mode, copyTextToNotes }) => {
          if (!model.subclassChange) return
          const pending = model.subclassChange
          model.setSubclassChange(null)
          model.beginSubclassSelection({
            classEntryId: pending.classEntryId,
            selected: pending.selected,
            copyOldTextToNotes: copyTextToNotes,
            previousDef: pending.previousDef,
            changeMode: mode,
            changedAtClassLevel: pending.classLevel,
            previousNameRu: pending.fromName,
            previousCatalogId: pending.previousCatalogId,
            previousSlug: pending.previousSlug,
          })
        }}
      />

      <SubclassSetupDialog
        open={model.subclassSetup != null}
        def={model.subclassSetup?.def ?? null}
        onClose={() => {
          model.setSubclassSetup(null)
          if (model.pausedWizardForSubclass) {
            model.setGuidedWizard(model.pausedWizardForSubclass)
            model.setPausedWizardForSubclass(null)
          }
        }}
        onConfirm={(picks) => {
          if (!model.subclassSetup) return
          model.commitSubclassGrant({
            classEntryId: model.subclassSetup.classEntryId,
            selected: model.subclassSetup.selected,
            def: model.subclassSetup.def,
            picks,
            copyOldTextToNotes: model.subclassSetup.copyOldTextToNotes,
            previousDef: model.subclassSetup.previousDef,
            changeMode: model.subclassSetup.changeMode,
            changedAtClassLevel: model.subclassSetup.changedAtClassLevel,
            previousNameRu: model.subclassSetup.previousNameRu,
            previousCatalogId: model.subclassSetup.previousCatalogId,
            previousSlug: model.subclassSetup.previousSlug,
            advanceWizardAfter: model.subclassSetup.advanceWizardAfter,
          })
          model.setSubclassSetup(null)
        }}
      />
    </>
  )
}
