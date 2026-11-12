/** Сцены стола: бой, инвентарь, умения, заклинания, напарники, тексты. */
import { useState } from 'react'
import { ignoresClassRaceLevel } from '../attunementRules'
import { spellReadyToCast } from '../itemSpellCast'
import { useScrollSpellClasses } from '../ScrollCastGate'
import {
  resolveScrollClasses,
  scrollCastersFromProfiles,
  scrollCastBlockReason,
} from '../spellScroll'
import type { SheetModel } from './sheetModel'
import type { DivineSmiteIntent } from '../divineSmite'
import { type RulesEdition } from '../../../shared/api/characters'
import { applyConcentrationChangeToCompanions, concentrationEndNotice } from '../spellCompanions'
import { AttacksPanel, syncAttacksHeldFromInventory } from '../AttacksPanel'
import { AttunementDialog } from '../AttunementDialog'
import { filledAttunementCount, maxAttunementsForClasses } from '../attunement'
import { InventoryPanel } from '../InventoryPanel'
import { AttacksSettingsDialog } from '../AttacksSettingsDialog'
import { SpellsPanel } from '../SpellsPanel'
import { SpellsSettingsDialog } from '../SpellsSettingsDialog'
import { ClassFeaturesPanel } from '../ClassFeaturesPanel'
import { CompanionsPanel } from '../CompanionsPanel'
import { getActiveSelfForm } from '../companions'
import { healSelfForm, rollDice, starryFormDice } from '../wildShape'
import { TextBlocksPanel } from '../TextBlocksPanel'
import { PlayDeskAttacksCompact } from '../PlayDeskAttacksCompact'
import { PlayDeskSpellsCompact } from '../PlayDeskSpellsCompact'
import { equipInventoryItem, equippedArmorPieces } from '../inventory'
import { withSpellFocusFlags } from '../spellFocus'
import { syncWizardSpellbookWithInventory } from '../wizardSpellbookInventory'
import { abilityModifier } from '../sheetTypes'
import { sheetDamageProfile } from '../gearEffects'

function mergeToolNames(base: string[], extra: string[]): string[] {
  const seen = new Set(base.map((name) => name.trim().toLowerCase()))
  const out = [...base]
  for (const name of extra) {
    const key = name.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

function withConditionImmunities(
  defense: string,
  rows: Array<{ name: string }>,
): string {
  const names = [...new Set(rows.map((row) => row.name.trim()).filter(Boolean))]
  if (!names.length) return defense
  const extra = `Имм. состояний: ${names.join(', ')}`
  return defense ? `${defense} · ${extra}` : extra
}
import { formatDefenseSummary } from '../../../shared/dnd/damageTypes'
import { getFeaturePick } from '../../../shared/dnd/featurePicks'
import { elementalAffinityPreview } from '../../../shared/dnd/pack04SorcererWarlock'
import { totalCharacterLevel } from '../../../shared/dnd/classLevels'
import { RitualBookCopyDialog, ritualBookButtonLabel } from '../RitualBookCopyDialog'

export function PlayDeskScenes({ model }: { model: SheetModel }) {
  const [divineSmiteIntent, setDivineSmiteIntent] = useState<DivineSmiteIntent>({
    slotLevel: null,
    vsUndeadOrFiend: false,
  })
  const [ritualBookOpen, setRitualBookOpen] = useState(false)
  const scrollIndex = useScrollSpellClasses(
    model.draft.inventory.items,
    model.baseCharacter.rules_edition as RulesEdition,
  )
  const scrollCasters = scrollCastersFromProfiles(model.spellcastingSync?.castProfiles ?? [])
  const thiefScroll = ignoresClassRaceLevel(model.draft.classes)
  const scrollCastBlock = (item: (typeof model.draft.inventory.items)[number]) =>
    scrollCastBlockReason(
      item,
      scrollCasters,
      thiefScroll,
      resolveScrollClasses(item, scrollIndex.index, scrollIndex.ready),
    )
  const ritualInput = {
    spells: model.draft.spells,
    inventory: model.draft.inventory,
    featurePicks: model.draft.featurePicks,
    featGrants: model.draft.featGrants,
    classes: model.draft.classes,
    subclassSlugByEntryId: model.subclassSlugByEntryId,
    characterLevel: totalCharacterLevel(model.draft.classes),
  }
  const ritualLabel = ritualBookButtonLabel(ritualInput)
  const sorcerer = model.draft.classes.find((row) => /чародей|sorcerer/i.test(row.name))
  const elementalAffinity = sorcerer
    ? elementalAffinityPreview({
        subclassSlug: model.subclassSlugByEntryId?.[sorcerer.id] || sorcerer.subclass_name,
        sorcererLevel: sorcerer.level,
        ancestry: getFeaturePick(model.draft.featurePicks, sorcerer.id, 'dragon_ancestor'),
        chaMod: abilityModifier(model.effectiveAbilities.cha),
      })
    : null
  return (
    <>
      <div className="play-desk__scene-wrap">
      <div className="play-desk__stage-panel" hidden={model.stageHidden('attacks')}>
      {model.showCompact('attacks') ? (
        <>
          <PlayDeskAttacksCompact
            weapons={
              getActiveSelfForm(model.draft.companions)?.form?.form_source_ref?.startsWith(
                'starry_form:archer',
              )
                ? [
                    ...model.draft.weapons,
                    {
                      id: 'starry-archer',
                      name: 'Лучистый лук',
                      catalog_id: null,
                      source_kind: 'class' as const,
                      ability: 'wis' as const,
                      is_proficient: true,
                      damage: starryFormDice(
                        model.draft.classes.find((row) => /друид|druid/i.test(row.name))?.level ??
                          model.characterLevel,
                      ),
                      damage_type: 'лучистый',
                    },
                  ]
                : model.draft.weapons
            }
            hpTemp={model.draft.play.hpTemp}
            abilities={model.effectiveAbilities}
            proficiencyBonus={model.proficiencyBonus}
            gearBonusesByItem={model.gearEffects.byItem}
            fightingStyleId={model.activeFightingStyleId}
            fightingStyleIds={model.fightingStyleIds}
            infusionByItem={model.infusionBonuses.weaponByItem}
            shillelagh={model.draft.play.shillelagh ?? null}
            martialArtsDie={model.martialArtsDie}
            resources={model.draft.play.resources}
            inventoryItems={model.draft.inventory.items}
            favoriteConsumableIds={model.draft.sheetUi.combatConsumableFavoriteIds}
            combatFeatures={model.playActiveFeatures}
            spells={model.draft.spells}
            onSpellsChange={(spells) => model.setDraft((prev) => ({ ...prev, spells }))}
            divineSmiteIntent={divineSmiteIntent}
            onDivineSmiteIntent={setDivineSmiteIntent}
            rollMode={model.attackRollMode()}
            preferMagicEmpty={model.hasMagicSources}
            onOpenSettings={() => model.setAttacksSettingsOpen(true)}
            onAddAttack={() => model.setAttacksSettingsOpen(true)}
            onOpenInventory={() => {
              model.setDeskMode('explore')
              model.setActivePanel('inventory')
            }}
            onCombatFeatureToggle={(featureId, active) => {
              if (featureId === 'reckless_attack') {
                model.setDeskRollMode(active ? 'advantage' : 'normal')
              }
            }}
            onToast={model.emitToast}
            onSpendResource={model.spendResourceOrOpenSorcery}
            onToggleConsumableFavorite={model.toggleCombatFavorite}
            onCastScroll={(itemId) => model.setDeskCastScrollId(itemId)}
            scrollCastBlock={scrollCastBlock}
            onSpendConsumable={model.spendConsumableFromDesk}
            onOpenConsumableSpendPad={(itemId) => model.setConsumableSpendPadId(itemId)}
            consumableSpendLog={model.consumableSpendLog}
            onUndoConsumableSpend={model.undoConsumableSpendFromLog}
            onToggleActivation={(attack) => {
              if (!attack.activation) return
              const turningOn = !attack.mode_active
              const poolId = attack.activation.resource_id
              if (turningOn && poolId) {
                const pool = model.draft.play.resources.find((row) => row.id === poolId)
                if (pool && pool.used >= pool.max) {
                  model.onToast('Нет зарядов режима')
                  return
                }
              }
              model.setDraft((prev) => {
                let resources = prev.play.resources
                if (turningOn && poolId) {
                  const pool = resources.find((row) => row.id === poolId)
                  if (pool && pool.used >= pool.max) return prev
                  if (pool) {
                    resources = resources.map((row) =>
                      row.id === pool.id ? { ...row, used: Math.min(row.max, row.used + 1) } : row,
                    )
                  }
                }
                return {
                  ...prev,
                  play: resources === prev.play.resources ? prev.play : { ...prev.play, resources },
                  weapons: prev.weapons.map((row) =>
                    row.id === attack.id ? { ...row, mode_active: turningOn } : row,
                  ),
                }
              })
            }}
            onToggleHeld={(attack) => {
              if (!attack.inventory_item_id) return
              model.setDraft((prev) => {
                const item = prev.inventory.items.find(
                  (row) => row.id === attack.inventory_item_id,
                )
                if (!item) return prev
                const items = equipInventoryItem(
                  prev.inventory.items,
                  item.id,
                  !item.equipped,
                )
                return {
                  ...prev,
                  inventory: { ...prev.inventory, items },
                  weapons: syncAttacksHeldFromInventory(prev.weapons, items),
                }
              })
            }}
          />
          <AttacksSettingsDialog
            open={model.attacksSettingsOpen}
            weapons={model.draft.weapons}
            abilities={model.effectiveAbilities}
            proficiencyBonus={model.proficiencyBonus}
            weaponProficiency={model.draft.identity.weapons}
            gearBonusesByItem={model.gearEffects.byItem}
            martialArtsDie={model.martialArtsDie}
            onChange={(weapons) => model.setDraft((prev) => ({ ...prev, weapons }))}
            onClose={() => model.setAttacksSettingsOpen(false)}
            onToggleHeld={(attack) => {
              if (!attack.inventory_item_id) return
              model.setDraft((prev) => {
                const item = prev.inventory.items.find(
                  (row) => row.id === attack.inventory_item_id,
                )
                if (!item) return prev
                const items = equipInventoryItem(
                  prev.inventory.items,
                  item.id,
                  !item.equipped,
                )
                return {
                  ...prev,
                  inventory: { ...prev.inventory, items },
                  weapons: syncAttacksHeldFromInventory(prev.weapons, items),
                }
              })
            }}
          />
        </>
      ) : (
        <AttacksPanel
          edition={model.baseCharacter.rules_edition as RulesEdition}
          weapons={model.draft.weapons}
          abilities={model.effectiveAbilities}
          proficiencyBonus={model.proficiencyBonus}
          weaponProficiency={model.draft.identity.weapons}
          gearBonusesByItem={model.gearEffects.byItem}
          fightingStyleId={model.activeFightingStyleId}
          fightingStyleIds={model.fightingStyleIds}
          infusionByItem={model.infusionBonuses.weaponByItem}
          shillelagh={model.draft.play.shillelagh ?? null}
          martialArtsDie={model.martialArtsDie}
          onChange={(weapons) => model.setDraft((prev) => ({ ...prev, weapons }))}
          onToggleHeld={(attack) => {
            if (!attack.inventory_item_id) return
            model.setDraft((prev) => {
              const item = prev.inventory.items.find(
                (row) => row.id === attack.inventory_item_id,
              )
              if (!item) return prev
              const items = equipInventoryItem(
                prev.inventory.items,
                item.id,
                !item.equipped,
              )
              return {
                ...prev,
                inventory: { ...prev.inventory, items },
                weapons: syncAttacksHeldFromInventory(prev.weapons, items),
              }
            })
          }}
        />
      )}

      </div>

      <div className="play-desk__stage-panel" hidden={model.stageHidden('inventory')}>
      <InventoryPanel
        edition={model.baseCharacter.rules_edition as RulesEdition}
        inventory={model.draft.inventory}
        strengthScore={model.effectiveAbilities?.str ?? model.draft.abilities.str}
        armorProficiency={model.draft.identity.armor}
        weapons={model.draft.weapons}
        autoAc={model.armorClass.ac}
        acHint={model.armorClass.summary}
        attunementFilled={filledAttunementCount(model.draft.attunements)}
        attunementLimit={maxAttunementsForClasses(model.draft.classes)}
        favoriteConsumableIds={model.draft.sheetUi.combatConsumableFavoriteIds}
        onToggleConsumableFavorite={model.toggleCombatFavorite}
        onCastScroll={(itemId) => model.setDeskCastScrollId(itemId)}
        scrollCastBlock={scrollCastBlock}
        onOpenAttunement={() => model.setAttunementDialogOpen(true)}
        /* Header owns CoinPad only on wide desk; compact uses panel-local pad. */
        onOpenCoins={() => model.setCoinPadOpen(true)}
        onToast={model.onToast}
        onChange={(inventory) =>
          model.setDraft((prev) => {
            const focusSpells = withSpellFocusFlags(prev.spells, inventory.items)
            const isWizard =
              model.spellLearnBudget?.mode === 'spellbook' ||
              prev.classes.some((row) => /волшебник|wizard|маг/i.test(row.name))
            const synced = syncWizardSpellbookWithInventory({
              isWizard,
              spells: focusSpells,
              items: inventory.items,
            })
            if (synced.message) queueMicrotask(() => model.onToast(synced.message!))
            return {
              ...prev,
              inventory,
              weapons: syncAttacksHeldFromInventory(prev.weapons, inventory.items),
              spells: synced.spells,
            }
          })
        }
        onWeaponsChange={(weapons) => model.setDraft((prev) => ({ ...prev, weapons }))}
      />
      <AttunementDialog
        open={model.attunementDialogOpen}
        onClose={() => model.setAttunementDialogOpen(false)}
        attunements={model.draft.attunements}
        inventoryItems={model.draft.inventory.items}
        character={{
          classes: model.draft.classes,
          raceCatalogId: model.draft.raceCatalogId,
          raceSlug: model.draft.raceGrant?.slug ?? null,
          raceParentSlug: model.draft.raceGrant?.parentSlug ?? null,
          alignmentSlug: model.draft.identity.alignment,
          alignmentUnresolved: Boolean(model.draft.identity.alignmentText),
        }}
        onChange={model.applyAttunements}
        onPatchItem={(itemId, patch) =>
          model.setDraft((prev) => ({
            ...prev,
            inventory: {
              ...prev.inventory,
              items: prev.inventory.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item,
              ),
            },
          }))
        }
      />

      </div>

      <div className="play-desk__stage-panel" hidden={model.stageHidden('features')}>
      {/* Features: ClassFeaturesPanel glance→expand — no compact/full flip. */}
      <ClassFeaturesPanel
        classes={model.draft.classes}
        characterLevel={model.characterLevel}
        abilities={model.draft.abilities}
        subclassSlugByEntryId={model.subclassSlugByEntryId}
        subclassTransitionByEntryId={model.subclassTransitionByEntryId}
        resources={model.draft.play.resources}
        onResourcesChange={(resources) =>
          model.setDraft((prev) => ({
            ...prev,
            play: { ...prev.play, resources },
          }))
        }
        featurePicks={model.draft.featurePicks}
        onFeaturePicksChange={model.applyFeaturePicksWithExpertise}
        skills={model.draft.skills}
        tools={mergeToolNames(model.draft.identity.tools, model.gearEffects.toolProficiencies)}
        classAsi={model.draft.classAsi}
        spells={model.draft.spells}
        onSpellsChange={(spells) => model.setDraft((prev) => ({ ...prev, spells }))}
        divineSmiteIntent={divineSmiteIntent}
        onDivineSmiteIntent={setDivineSmiteIntent}
        edition={model.rulesEdition}
        wearingHeavyArmor={
          equippedArmorPieces(model.draft.inventory.items).armor?.kind === 'heavy'
        }
        companions={model.draft.companions}
        onCompanionsChange={(companions) =>
          model.setDraft((prev) => ({ ...prev, companions }))
        }
        featGrants={model.draft.featGrants}
        darkvision={model.effectiveDarkvisionFt}
        defenseSummary={withConditionImmunities(
          formatDefenseSummary(
            sheetDamageProfile({
              raceSlug: model.draft.raceGrant?.slug,
              raceResistances: model.draft.raceGrant?.damageResistances,
              gear: model.gearEffects,
            }),
          ),
          model.gearEffects.conditionImmunities,
        )}
        raceName={model.draft.raceName}
        raceTraitCards={model.draft.raceGrant?.traitCards ?? []}
        raceTraitsText={model.draft.raceGrant?.traitsText ?? ''}
        backgroundName={
          model.draft.identity.background?.trim() ||
          model.draft.backgroundGrant?.slug ||
          ''
        }
        backgroundFeature={model.resolvedBackgroundFeature}
        customFeatures={model.draft.customFeatures}
        onCustomFeaturesChange={(customFeatures) =>
          model.setDraft((prev) => ({ ...prev, customFeatures }))
        }
        onToast={model.onToast}
        onOpenInfusions={(classEntryId) => {
          const row = model.draft.play.resources.find(
            (r) =>
              r.id.includes(':infusion_slots:') &&
              r.id.endsWith(`:${classEntryId}`),
          )
          if (row) model.setInfusionsSpendId(row.id)
          else model.onToast('Пул активных инфузий ещё не синхронизирован')
        }}
        onOpenInvocations={(classEntryId) =>
          model.setInvocationsOpen({ classEntryId })
        }
        onCastPactChainFamiliar={(classEntryId) =>
          model.openPactChainFamiliarCast(classEntryId)
        }
        onOpenRangerFavored={(classEntryId) =>
          model.setRangerFavoredOpen({ classEntryId })
        }
        onOpenSoulTrinkets={(classEntryId) => {
          const row = model.draft.play.resources.find(
            (r) =>
              r.id.includes(':soul_trinkets:') &&
              r.id.endsWith(`:${classEntryId}`),
          )
          if (row) model.setSoulTrinketsSpendId(row.id)
          else model.onToast('Пул частиц души ещё не синхронизирован')
        }}
        onWildShapeFork={(request) => model.setWildShapeFork(request)}
        onOpenRecovery={(id) => model.setArcaneRecoverySpendId(id)}
        hpCurrent={model.draft.hpCurrent}
        hpMax={model.draft.hpMax}
        onHpChange={(hp) => model.setDraft((prev) => ({ ...prev, hpCurrent: hp }))}
        onFeatureSelfForm={(request) => model.setFeatureSelfForm(request)}
        inventoryItems={model.draft.inventory.items}
        onInventoryChange={(items) =>
          model.setDraft((prev) => ({
            ...prev,
            inventory: { ...prev.inventory, items },
          }))
        }
        concentration={model.draft.play.concentration}
        onConcentrationChange={(concentration) => {
          let notice: string | null = null
          model.setDraft((prev) => {
            const result = applyConcentrationChangeToCompanions({
              companions: prev.companions,
              previous: prev.play.concentration,
              next: concentration,
            })
            notice = concentrationEndNotice(result)
            return {
              ...prev,
              companions: result.companions,
              play: { ...prev.play, concentration },
            }
          })
          if (notice) model.onToast(notice)
        }}
        onWizardFeatureUse={(request) => model.setWizardFeatureUse(request)}
        onMoonFormSlotHeal={({ slotLevel, diceCount, diceSize }) => {
          const form = model.draft.companions.find(
            (c) => c.role === 'self_form' && c.active,
          )
          if (!form || form.stats.hp == null) return null
          const rolled = rollDice(diceCount, diceSize)
          let message = ''
          model.setDraft((prev) => {
            const healed = healSelfForm({
              companions: prev.companions,
              amount: rolled.total,
              formId: form.id,
            })
            message = `Исцеление в облике: ячейка ${slotLevel} → ${diceCount}к${diceSize} = ${rolled.total} [${rolled.rolls.join('+')}] · ${healed.message}`
            return { ...prev, companions: healed.companions }
          })
          return message || null
        }}
      />

      </div>

      <div
        className={`play-desk__stage-panel${model.deskSplit && model.splitSecondary === 'spells' ? ' is-pinned' : ''}`}
        hidden={model.stageHidden('spells')}
      >
      {model.showCompact('spells') ? (
        <>
          <PlayDeskSpellsCompact
            spells={model.draft.spells}
            abilities={model.effectiveAbilities}
            proficiencyBonus={model.proficiencyBonus}
            modifiers={model.spellCastModifiers}
            formulaVars={model.formulaVarsBase}
            learnBudget={model.spellLearnBudget}
            learnBudgets={model.spellLearnBudgets}
            classes={model.draft.classes}
            elementalAffinity={elementalAffinity}
            castProfiles={model.spellcastingSync.castProfiles}
            characterLevel={model.characterLevel}
            pinned={model.deskSplit && model.splitSecondary === 'spells'}
            concentration={model.draft.play.concentration}
            edition={model.rulesEdition}
            settingsLabel={model.isPlayDesk ? 'Магия' : 'Книга'}
            onOpenSettings={() => {
              if (!model.isPlayDesk) model.setMobileSpellSurface('book')
              model.setSpellsSettingsOpen(true)
            }}
            onSpellsChange={(spells) => model.setDraft((prev) => ({ ...prev, spells }))}
            onCastSpell={(spell) => {
              void spellReadyToCast(spell, model.rulesEdition).then((ready) =>
                model.setDeskCastSpell(ready),
              )
            }}
            ritualBookLabel={ritualLabel}
            onOpenRitualBook={() => setRitualBookOpen(true)}
            onConcentrateSpell={(spell) => model.setDeskCastSpell(spell)}
            onClearSplit={
              model.deskSplit && model.splitSecondary === 'spells'
                ? () => model.patchSheetUi({ deskSplit: false })
                : undefined
            }
            onSlotUsedChange={(level, used) => {
              const key = String(level)
              model.setDraft((prev) => {
                const slot = prev.spells.slots[key] ?? { max: 0, used: 0 }
                const nextUsed = Math.min(slot.max, Math.max(0, used))
                if (nextUsed === slot.used) return prev
                return {
                  ...prev,
                  spells: {
                    ...prev.spells,
                    slots: {
                      ...prev.spells.slots,
                      [key]: { ...slot, used: nextUsed },
                    },
                  },
                }
              })
            }}
            onPactUsedChange={(used) => {
              model.setDraft((prev) => {
                const pact = prev.spells.pact_slots
                if (!pact) return prev
                const nextUsed = Math.min(pact.max, Math.max(0, used))
                if (nextUsed === pact.used) return prev
                return {
                  ...prev,
                  spells: {
                    ...prev.spells,
                    pact_slots: { ...pact, used: nextUsed },
                  },
                }
              })
            }}
          />
          <SpellsSettingsDialog
            open={model.spellsSettingsOpen}
            edition={model.rulesEdition}
            className={model.classSummary || model.primaryClass?.name || ''}
            level={model.characterLevel}
            classes={model.draft.classes}
            featurePicks={model.draft.featurePicks}
            subclassCasters={model.subclassCastersForSpells}
            spells={model.draft.spells}
            abilities={model.effectiveAbilities}
            proficiencyBonus={model.proficiencyBonus}
            modifiers={model.spellCastModifiers}
            formulaVars={model.formulaVarsBase}
            onModifiersChange={(modifiers) =>
              model.setDraft((prev) => ({ ...prev, modifiers }))
            }
            suggestion={model.spellcastingSync.suggestion}
            knownCaster={model.spellcastingSync.knownCaster}
            coins={model.draft.inventory.coins}
            onCoinsChange={(coins) =>
              model.setDraft((prev) => ({
                ...prev,
                inventory: { ...prev.inventory, coins },
              }))
            }
            inventoryItems={model.draft.inventory.items}
            onInventoryItemsChange={(items) =>
              model.setDraft((prev) => ({
                ...prev,
                inventory: { ...prev.inventory, items },
              }))
            }
            onChangeInventory={({ coins, items }) =>
              model.setDraft((prev) => ({
                ...prev,
                inventory: { ...prev.inventory, coins, items },
              }))
            }
            title={model.isPlayDesk ? 'Магия' : 'Книга заклинаний'}
            onChange={(spells) => model.setDraft((prev) => ({ ...prev, spells }))}
            onClose={() => {
              model.setSpellsSettingsOpen(false)
              if (!model.isPlayDesk) model.setMobileSpellSurface('combat')
            }}
            onToast={model.onToast}
          />
        </>
      ) : (
        <SpellsPanel
          edition={model.baseCharacter.rules_edition as RulesEdition}
          className={model.classSummary || model.primaryClass?.name || ''}
          level={model.characterLevel}
          classes={model.draft.classes}
          subclassCasters={model.subclassCastersForSpells}
          spells={model.draft.spells}
          characterId={model.character.id}
          companions={model.draft.companions}
          onCompanionsChange={(update) =>
            model.setDraft((prev) => ({
              ...prev,
              companions:
                typeof update === 'function' ? update(prev.companions) : update,
            }))
          }
          knownForms={model.draft.knownForms}
          onKnownFormsChange={(knownForms) =>
            model.setDraft((prev) => ({ ...prev, knownForms }))
          }
          hostHp={model.draft.hpCurrent}
          hostHpMax={model.draft.hpMax}
          abilities={model.effectiveAbilities}
          proficiencyBonus={model.proficiencyBonus}
          modifiers={model.spellCastModifiers}
          formulaVars={model.formulaVarsBase}
          inventoryItems={model.draft.inventory.items}
          inventory={model.draft.inventory}
          concentration={model.draft.play.concentration}
          onChange={(spells) => model.setDraft((prev) => ({ ...prev, spells }))}
          resources={model.draft.play.resources}
          voiceOfAuthority={model.unlockedFeatures.some(
            (row: { id: string }) => row.id === 'voice_of_authority',
          )}
          ritualBookLabel={ritualLabel}
          onOpenRitualBook={() => setRitualBookOpen(true)}
          onResourcesChange={(resources) =>
            model.setDraft((prev) => ({
              ...prev,
              play: { ...prev.play, resources },
            }))
          }
          masterySpellIds={model.draft.classes
            .filter((row) => /волшебник|wizard/i.test(row.name))
            .flatMap((row) =>
              (model.draft.featurePicks.values[`${row.id}:spell_mastery`] ?? '')
                .split(',')
                .map((id) => id.trim())
                .filter(Boolean),
            )}
          offerPowerSurge={model.draft.play.resources.some((row) =>
            row.id.includes(':power_surge:'),
          )}
          onInventoryChange={(inventory) =>
            model.setDraft((prev) => {
              const focusSpells = withSpellFocusFlags(prev.spells, inventory.items)
              const isWizard =
                model.spellLearnBudget?.mode === 'spellbook' ||
                prev.classes.some((row) => /волшебник|wizard|маг/i.test(row.name))
              const synced = syncWizardSpellbookWithInventory({
                isWizard,
                spells: focusSpells,
                items: inventory.items,
              })
              if (synced.message) queueMicrotask(() => model.onToast(synced.message!))
              return { ...prev, inventory, spells: synced.spells }
            })
          }
          onConcentrationChange={(concentration) => {
            let notice: string | null = null
            model.setDraft((prev) => {
              const result = applyConcentrationChangeToCompanions({
                companions: prev.companions,
                previous: prev.play.concentration,
                next: concentration,
              })
              notice = concentrationEndNotice(result)
              return {
                ...prev,
                companions: result.companions,
                play: { ...prev.play, concentration },
              }
            })
            if (notice) model.onToast(notice)
          }}
          onToast={model.onToast}
        />
      )}

      </div>

      <div className="play-desk__stage-panel" hidden={model.stageHidden('companions')}>
      {/* Companions: CompanionsPanel glance→expand — no compact/full flip. */}
      <CompanionsPanel
        companions={model.draft.companions}
        onChange={(companions) => model.setDraft((prev) => ({ ...prev, companions }))}
        hostHp={model.draft.hpCurrent}
        onHostHpChange={(hp) =>
          model.setDraft((prev) => ({ ...prev, hpCurrent: hp }))
        }
        moonHealEnabled={model.unlockedFeatures.some(
          (f: { id: string }) => f.id === 'combat_wild_shape',
        )}
        spells={model.draft.spells}
        onSpellsChange={(spells) => model.setDraft((prev) => ({ ...prev, spells }))}
        onToast={model.onToast}
        onFormDamaged={(damage) => {
          if (!model.draft.play.concentration || damage <= 0) return
          model.setConcDamageAsk({
            damage,
            spellName: model.draft.play.concentration.name,
            dc: Math.max(10, Math.floor(damage / 2)),
          })
        }}
        onCastPactChainFamiliar={
          model.pactChainFamiliarReady
            ? () => model.openPactChainFamiliarCast()
            : undefined
        }
      />

      </div>

      <div className="play-desk__stage-panel" hidden={model.stageHidden('texts')}>
      {/* Social: TextBlocksPanel glance→expand — no compact/full flip. */}
      <TextBlocksPanel
        blocks={model.draft.textBlocks}
        onChange={(textBlocks) => model.setDraft((prev) => ({ ...prev, textBlocks }))}
        resources={model.draft.play.resources}
        onResourcesChange={(resources) =>
          model.setDraft((prev) => ({
            ...prev,
            play: { ...prev.play, resources },
          }))
        }
        physique={model.draft.identity.physique}
        onPhysiqueChange={(physique) =>
          model.setDraft((prev) => ({
            ...prev,
            identity: { ...prev.identity, physique },
          }))
        }
      />

      </div>

      </div>{/* scene-wrap */}
      <RitualBookCopyDialog
        open={ritualBookOpen}
        input={ritualInput}
        onClose={() => setRitualBookOpen(false)}
        onApply={(next) => {
          model.setDraft((prev) => ({
            ...prev,
            spells: next.spells,
            inventory: next.inventory,
          }))
          if (next.message) model.onToast(next.message)
        }}
      />
    </>
  )
}
