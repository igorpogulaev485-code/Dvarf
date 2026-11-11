/** Диалоги отдыха и классовых ресурсов. */
import type { SheetModel } from './sheetModel'
import { dismissSelfFormsOnRest } from '../companions'
import { applyConcentrationChangeToCompanions } from '../spellCompanions'
import { SpellFormDialog } from '../SpellFormDialog'
import { FamiliarPickDialog } from '../FamiliarPickDialog'
import { spendFeatureUse } from '../../../shared/dnd/featureResources'
import { FeatureSelfFormDialog, type FeatureSelfFormDialogResult } from '../FeatureSelfFormDialog'
import { shapechangerFormLimits } from '../featureForms'
import { WildShapeDialog } from '../WildShapeDialog'
import { RestDialog } from '../RestDialog'
import { SorceryPointsSpendDialog } from '../SorceryPointsSpendDialog'
import { ChannelDivinitySpendDialog } from '../ChannelDivinitySpendDialog'
import { KiSpendDialog } from '../KiSpendDialog'
import { BardicInspirationSpendDialog } from '../BardicInspirationSpendDialog'
import { LayOnHandsSpendDialog } from '../LayOnHandsSpendDialog'
import { SuperiorityDiceSpendDialog } from '../SuperiorityDiceSpendDialog'
import { ArcaneRecoverySpendDialog } from '../ArcaneRecoverySpendDialog'
import { WizardFeatureUseDialog } from '../WizardFeatureUseDialog'
import { createCompanion } from '../companions'
import { setConcentration } from '../../../shared/dnd/concentration'
import { InfusionsActiveDialog } from '../InfusionsActiveDialog'
import { WarlockArcanumSpendDialog } from '../WarlockArcanumSpendDialog'
import { WarlockInvocationsDialog } from '../WarlockInvocationsDialog'
import { PsionicDiceSpendDialog } from '../PsionicDiceSpendDialog'
import { SoulTrinketsSpendDialog } from '../SoulTrinketsSpendDialog'
import { RangerFavoredDeskDialog } from '../RangerFavoredDeskDialog'
import { abilityModifier } from '../sheetTypes'

export function SheetDialogsResources({ model }: { model: SheetModel }) {
  return (
    <>
      <RestDialog
        open={model.restOpen}
        level={model.characterLevel}
        hpCurrent={model.draft.hpCurrent}
        hpMax={model.draft.hpMax}
        constitutionMod={abilityModifier(model.draft.abilities.con)}
        play={model.draft.play}
        spells={model.draft.spells}
        featureDesiredResources={model.featureDesiredResources}
        onPlayChange={(play) =>
          model.setDraft((prev) => {
            const result = applyConcentrationChangeToCompanions({
              companions: prev.companions,
              previous: prev.play.concentration,
              next: play.concentration,
            })
            return {
              ...prev,
              play,
              companions: result.companions,
            }
          })
        }
        onSpellsChange={(spells) => model.setDraft((prev) => ({ ...prev, spells }))}
        onCombatChange={(patch) =>
          model.setDraft((prev) => ({
            ...prev,
            ...(patch.hpCurrent !== undefined ? { hpCurrent: patch.hpCurrent } : {}),
          }))
        }
        onCompanionRest={(kind) => {
          let dismissed: string[] = []
          model.setDraft((prev) => {
            const result = dismissSelfFormsOnRest(prev.companions, kind)
            dismissed = result.dismissedNames
            return { ...prev, companions: result.companions }
          })
          if (dismissed.length) {
            model.onToast(`Отдых: облик сброшен (${dismissed.join(', ')})`)
          }
        }}
        onToast={model.onToast}
        onClose={() => model.setRestOpen(false)}
      />

      <SorceryPointsSpendDialog
        open={model.sorcerySpendId != null}
        resource={model.sorceryResource}
        metamagicIds={model.sorcererMetamagicIds}
        slots={model.draft.spells.slots}
        onSetUsed={(used) => {
          if (!model.sorcerySpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === model.sorcerySpendId ? { ...row, used } : row,
              ),
            },
          }))
        }}
        onSlotsChange={(slots) =>
          model.setDraft((prev) => ({
            ...prev,
            spells: { ...prev.spells, slots },
          }))
        }
        onToast={model.onToast}
        onClose={() => model.setSorcerySpendId(null)}
      />

      <ChannelDivinitySpendDialog
        open={model.channelDivinitySpendId != null}
        resource={model.channelDivinityResource}
        features={model.unlockedFeatures}
        onSpend={(label) => {
          if (!model.channelDivinitySpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === model.channelDivinitySpendId && row.used < row.max
                  ? { ...row, used: row.used + 1 }
                  : row,
              ),
            },
          }))
          model.onToast(`${label}: −1 Божественный канал`)
          model.setChannelDivinitySpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setChannelDivinitySpendId(null)}
      />

      <KiSpendDialog
        open={model.kiSpendId != null}
        resource={model.kiResource}
        features={model.unlockedFeatures}
        onSpend={(label, cost) => {
          if (!model.kiSpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== model.kiSpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          model.onToast(`${label}: −${cost} ки`)
          model.setKiSpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setKiSpendId(null)}
      />

      {model.wildShapeFork ? (
        <WildShapeDialog
          open
          onClose={() => model.setWildShapeFork(null)}
          features={model.unlockedFeatures.filter(
            (f: { classEntryId?: string }) =>
              f.classEntryId === model.wildShapeFork.classEntryId,
          )}
          resources={model.draft.play.resources}
          companions={model.draft.companions}
          knownForms={model.draft.knownForms}
          classSlug={model.wildShapeFork.classSlug}
          classEntryId={model.wildShapeFork.classEntryId}
          druidLevel={model.druidLevel}
          subclassSlug={model.druidSubclassSlug}
          hostHp={model.draft.hpCurrent ?? 0}
          hostHpMax={model.draft.hpMax ?? 0}
          edition={model.rulesEdition === '2024' ? '2024' : '2014'}
          onConfirm={(result) => {
            model.applyWildShapeResult(result)
            model.setWildShapeFork(null)
          }}
        />
      ) : null}

      <WizardFeatureUseDialog
        open={model.wizardFeatureUse != null}
        request={model.wizardFeatureUse}
        resources={model.draft.play.resources}
        featurePicks={model.draft.featurePicks}
        classes={model.draft.classes}
        intelligenceScore={model.draft.abilities.int ?? 10}
        onClose={() => model.setWizardFeatureUse(null)}
        onConfirm={(result) => {
          if (!result.ok) {
            model.onToast(result.message)
            return
          }
          model.setDraft((prev) => {
            let companions = prev.companions
            if (result.companion) {
              const next = createCompanion({
                id: result.companion.id,
                name: result.companion.name,
                notes: result.companion.notes,
                kind: 'familiar',
                role: 'ally',
                nature: 'summoned',
                control: 'with_master',
                active: true,
                source: {
                  kind: 'feature',
                  labelRu: 'Проявить разум',
                  feature: 'manifest_mind',
                  classEntryId: model.wizardFeatureUse?.classEntryId,
                },
              })
              companions = [
                ...companions.filter((row) => row.id !== next.id),
                next,
              ]
            }
            const exhaustion = Math.min(
              6,
              Math.max(0, (prev.play.exhaustion ?? 0) + result.exhaustionDelta),
            )
            return {
              ...prev,
              companions,
              play: {
                ...prev.play,
                resources: result.resources,
                exhaustion,
                concentration: result.concentrationName
                  ? setConcentration({
                      spellId: `feature:${model.wizardFeatureUse?.featureId ?? 'wizard'}`,
                      name: result.concentrationName,
                    })
                  : prev.play.concentration,
              },
            }
          })
          model.onToast(result.message)
          model.setWizardFeatureUse(null)
        }}
      />

      {model.featureSelfForm ? (
        <FeatureSelfFormDialog
          open
          onClose={() => model.setFeatureSelfForm(null)}
          limits={shapechangerFormLimits()}
          companions={model.draft.companions}
          knownForms={model.draft.knownForms}
          hostHp={model.draft.hpCurrent ?? 0}
          hostHpMax={model.draft.hpMax ?? 0}
          edition={model.rulesEdition === '2024' ? '2024' : '2014'}
          onConfirm={(result: FeatureSelfFormDialogResult) => {
            const spent = spendFeatureUse({
              resources: model.draft.play.resources,
              feature: model.featureSelfForm.feature,
              classSlug: model.featureSelfForm.classSlug,
            })
            if (!spent.ok) {
              model.onToast(spent.message)
              return
            }
            model.setDraft((prev) => ({
              ...prev,
              companions: result.companions,
              knownForms: result.knownForms,
              play: { ...prev.play, resources: spent.resources },
            }))
            model.onToast(result.toast)
            model.setFeatureSelfForm(null)
          }}
        />
      ) : null}

      {model.pendingSpellSelfForm ? (
        <SpellFormDialog
          open
          spell={model.pendingSpellSelfForm.spell}
          slug={model.pendingSpellSelfForm.slug}
          companions={model.draft.companions}
          knownForms={model.draft.knownForms}
          characterLevel={model.characterLevel}
          hostHp={model.draft.hpCurrent ?? 0}
          hostHpMax={model.draft.hpMax ?? 0}
          edition={model.rulesEdition === '2024' ? '2024' : '2014'}
          onConfirm={model.applySpellSelfFormResult}
          onClose={() => {
            model.setPendingSpellSelfForm(null)
            model.onToast(
              'Облик не выбран — концентрация активна; карточку можно не создавать',
            )
          }}
        />
      ) : null}

      {model.pendingFamiliar ? (
        <FamiliarPickDialog
          open
          mode={model.pendingFamiliar.mode}
          spell={model.pendingFamiliar.spell}
          slotLevel={model.pendingFamiliar.slotLevel}
          companions={model.draft.companions}
          characterLevel={model.characterLevel}
          druidLevel={
            model.draft.classes.find((row) => /друид|druid/i.test(row.name))?.level ??
            1
          }
          edition={model.rulesEdition === '2024' ? '2024' : '2014'}
          onConfirm={model.applyFamiliarPickResult}
          onClose={() => {
            model.setPendingFamiliar(null)
            model.onToast('Фамильяр не выбран — каст уже списан; можно кастануть снова')
          }}
        />
      ) : null}

      <BardicInspirationSpendDialog
        open={model.bardicInspirationSpendId != null}
        resource={model.bardicInspirationResource}
        features={model.unlockedFeatures}
        onSpend={(label, cost) => {
          if (!model.bardicInspirationSpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== model.bardicInspirationSpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          model.onToast(`${label}: −${cost} Бардовское вдохновение`)
          model.setBardicInspirationSpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setBardicInspirationSpendId(null)}
      />

      <LayOnHandsSpendDialog
        open={model.layOnHandsSpendId != null}
        resource={model.layOnHandsResource}
        onSpend={(label, cost) => {
          if (!model.layOnHandsSpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== model.layOnHandsSpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          model.onToast(`${label}: −${cost} из пула Возложения рук`)
          model.setLayOnHandsSpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setLayOnHandsSpendId(null)}
      />

      <SuperiorityDiceSpendDialog
        open={model.superioritySpendId != null}
        resource={model.superiorityResource}
        features={model.unlockedFeatures}
        featurePicks={model.draft.featurePicks}
        onSpend={(label, cost) => {
          if (!model.superioritySpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== model.superioritySpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          model.onToast(`${label}: −${cost} кость превосходства`)
          model.setSuperioritySpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setSuperioritySpendId(null)}
      />

      <ArcaneRecoverySpendDialog
        open={model.arcaneRecoverySpendId != null}
        resource={model.arcaneRecoveryResource}
        wizardLevel={model.arcaneRecoveryWizardLevel}
        slots={model.draft.spells.slots}
        onRecover={(slots, label) => {
          if (!model.arcaneRecoverySpendId) return
          model.setDraft((prev) => ({
            ...prev,
            spells: { ...prev.spells, slots },
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === model.arcaneRecoverySpendId && row.used < row.max
                  ? { ...row, used: row.used + 1 }
                  : row,
              ),
            },
          }))
          model.onToast(label)
          model.setArcaneRecoverySpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setArcaneRecoverySpendId(null)}
      />

      <InfusionsActiveDialog
        open={model.infusionsSpendId != null && model.infusionsContext != null}
        resource={model.infusionsResource}
        characterId={model.baseCharacter.id}
        characterName={model.draft.name?.trim() || model.baseCharacter.name || 'Изобретатель'}
        classEntryId={model.infusionsContext?.classEntryId ?? ''}
        artificerLevel={model.infusionsContext?.level ?? 1}
        featurePicks={model.draft.featurePicks}
        onFeaturePicksChange={(featurePicks) =>
          model.setDraft((prev) => ({ ...prev, featurePicks }))
        }
        onSlotsUsedChange={(used) => {
          if (!model.infusionsSpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === model.infusionsSpendId
                  ? { ...row, used: Math.min(row.max, Math.max(0, used)) }
                  : row,
              ),
            },
          }))
        }}
        onToast={model.onToast}
        onClose={() => model.setInfusionsSpendId(null)}
        items={model.draft.inventory.items}
      />

      <WarlockArcanumSpendDialog
        open={model.arcanumSpendId != null}
        resource={model.arcanumResource}
        features={model.unlockedFeatures}
        resources={model.draft.play.resources}
        onSpend={(poolResourceId, label) => {
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === poolResourceId && row.used < row.max
                  ? { ...row, used: row.used + 1 }
                  : row,
              ),
            },
          }))
          model.onToast(`${label}: −1`)
          model.setArcanumSpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setArcanumSpendId(null)}
      />

      <WarlockInvocationsDialog
        open={model.invocationsOpen != null}
        classEntryId={model.invocationsOpen?.classEntryId ?? ''}
        featurePicks={model.draft.featurePicks}
        onToast={model.onToast}
        onClose={() => model.setInvocationsOpen(null)}
      />

      <PsionicDiceSpendDialog
        open={model.psionicSpendId != null}
        resource={model.psionicResource}
        features={model.unlockedFeatures}
        onSpend={(label, cost) => {
          if (!model.psionicSpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== model.psionicSpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          model.onToast(`${label}: −${cost} пси`)
          model.setPsionicSpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setPsionicSpendId(null)}
      />

      <SoulTrinketsSpendDialog
        open={model.soulTrinketsSpendId != null}
        resource={model.soulTrinketsResource}
        features={model.unlockedFeatures}
        onBurn={(label) => {
          if (!model.soulTrinketsSpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === model.soulTrinketsSpendId && row.used > 0
                  ? { ...row, used: row.used - 1 }
                  : row,
              ),
            },
          }))
          model.onToast(`${label}: −1 частица`)
          model.setSoulTrinketsSpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setSoulTrinketsSpendId(null)}
      />

      <RangerFavoredDeskDialog
        open={model.rangerFavoredOpen != null}
        classEntryId={model.rangerFavoredOpen?.classEntryId ?? ''}
        featurePicks={model.draft.featurePicks}
        onToast={model.onToast}
        onClose={() => model.setRangerFavoredOpen(null)}
      />

    </>
  )
}
