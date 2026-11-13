/** Сцены стола: бой, инвентарь, умения, заклинания, напарники, тексты. */
import { useMemo, useState } from 'react'
import { ApiRequestError } from '../../../shared/api/client'
import { transferLobbyInventory } from '../../../shared/api/lobbies'
import { TransferDialog, type TransferPeer } from '../TransferDialog'
import { useLobbyParty } from '../../lobby/useLobbyParty'
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
import { normalizeCampaignRules } from '../../lobby/campaignRules'
import { AttacksSettingsDialog } from '../AttacksSettingsDialog'
import { SpellsPanel } from '../SpellsPanel'
import { SpellsSettingsDialog } from '../SpellsSettingsDialog'
import { ClassFeaturesPanel } from '../ClassFeaturesPanel'
import { PietyPanel } from '../PietyPanel'
import { syncPietyChampion, type PietyState } from '../../../shared/dnd/therosPiety'
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
import {
  consumeRollDieChips,
  effectsEndingOnAttackCast,
  listRollDieChips,
  weaponBonusesFromActiveEffects,
} from '../../../shared/dnd/activeEffects'
import { resolveB04FeatureSpend } from '../b04FeatureSpend'
import { resolveB05FeatureSpend } from '../b05FeatureSpend'
import { resolveB06FeatureSpend } from '../b06FeatureSpend'
import { resolveB07FeatureSpend } from '../b07FeatureSpend'
import { resolveB08FeatureSpend } from '../b08FeatureSpend'
import { type CheckRoll } from '../deskRolls'
import {
  featResistanceTypes,
  hasFeatFlag,
} from '../../../shared/dnd/b07FeatCombat'
import { UseAllyAbilityDialog } from '../UseAllyAbilityDialog'

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

type DeskTransferMode =
  | { kind: 'item'; itemId: string; itemName: string; maxQty: number }
  | {
      kind: 'coins'
      balances: Record<'cp' | 'sp' | 'ep' | 'gp' | 'pp', number>
    }

export function PlayDeskScenes({ model }: { model: SheetModel }) {
  const [divineSmiteIntent, setDivineSmiteIntent] = useState<DivineSmiteIntent>({
    slotLevel: null,
    vsUndeadOrFiend: false,
  })
  const [ritualBookOpen, setRitualBookOpen] = useState(false)
  const [transferBusy, setTransferBusy] = useState(false)
  const [transferMode, setTransferMode] = useState<DeskTransferMode | null>(null)
  /** U09: deep-link from attack → inventory card. */
  const [focusInventoryItemId, setFocusInventoryItemId] = useState<string | null>(null)

  function openInventoryItem(itemId: string) {
    model.setDeskMode('explore')
    model.setActivePanel('inventory')
    setFocusInventoryItemId(itemId)
  }

  const party = useLobbyParty(model.baseCharacter.id)
  const transferPeers: TransferPeer[] = useMemo(
    () =>
      party.options
        .filter((o) => !o.isSelf)
        .map((o) => ({
          lobby_id: party.lobbyId || model.baseCharacter.lobby_id || '',
          lobby_name: party.lobbyName || 'Лобби',
          character_id: o.character_id,
          character_name: o.character_name,
        }))
        .filter((p) => Boolean(p.lobby_id)),
    [
      party.options,
      party.lobbyId,
      party.lobbyName,
      model.baseCharacter.lobby_id,
    ],
  )
  const [pendingAllyBuff, setPendingAllyBuff] = useState<{
    slug: string
    name: string
    classLevel?: number
    casterMod?: number | null
    option?: string | null
    slotLevel?: number | null
    auraAllyDefaultOff?: boolean
  } | null>(null)
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
            companions={model.draft.companions}
            characterLevel={model.characterLevel}
            spellMod={abilityModifier(
              model.effectiveAbilities[
                model.draft.spells.casting_ability === 'int' ||
                model.draft.spells.casting_ability === 'wis' ||
                model.draft.spells.casting_ability === 'cha'
                  ? model.draft.spells.casting_ability
                  : 'wis'
              ],
            )}
            openSessionId={model.character.open_session_id}
            characterId={model.character.id}
            hpTemp={model.draft.play.hpTemp}
            abilities={model.effectiveAbilities}
            proficiencyBonus={model.proficiencyBonus}
            gearBonusesByItem={model.gearEffects.byItem}
            effectWeaponBonus={weaponBonusesFromActiveEffects(model.draft.play.effects)}
            activeEffects={model.draft.play.effects ?? []}
            fightingStyleId={model.activeFightingStyleId}
            fightingStyleIds={model.fightingStyleIds}
            infusionByItem={model.infusionBonuses.weaponByItem}
            shillelagh={model.draft.play.shillelagh ?? null}
            martialArtsDie={model.martialArtsDie}
            resources={model.draft.play.resources}
            inventoryItems={model.draft.inventory.items}
            favoriteConsumableIds={model.draft.sheetUi.combatConsumableFavoriteIds}
            combatFeatures={model.playActiveFeatures}
            hasCunningAction={(model.unlockedFeatures ?? []).some(
              (f: { id?: string }) => f.id === 'cunning_action',
            )}
            spells={model.draft.spells}
            onSpellsChange={(spells) => model.setDraft((prev) => ({ ...prev, spells }))}
            divineSmiteIntent={divineSmiteIntent}
            onDivineSmiteIntent={setDivineSmiteIntent}
            rollMode={model.attackRollMode()}
            elvenAccuracy={hasFeatFlag(model.draft.featGrants, 'elven_accuracy')}
            luckyArmed={Boolean(model.luckyRollArmed)}
            onLuckySpent={() => {
              model.spendLuckyPoint?.()
              model.setLuckyRollArmed?.(false)
            }}
            onLuckyPickNeeded={(input: {
              allDice: number[]
              text: string
              hitRoll: CheckRoll
            }) => {
              model.setLuckyPickPending?.(input)
            }}
            onHalflingLuckyNeeded={(input: {
              text: string
              hitRoll: CheckRoll
            }) => {
              model.setHalflingLuckyPending?.(input)
            }}
            raceSlug={model.draft.raceGrant?.slug ?? null}
            savageAttacker={hasFeatFlag(model.draft.featGrants, 'savage_attacker')}
            flamesOfPhlegethos={hasFeatFlag(
              model.draft.featGrants,
              'flames_of_phlegethos',
            )}
            bonusDice={listRollDieChips(model.draft.play.effects ?? [], 'attack').map((chip) => ({
              dice: chip.dice,
              label: chip.name,
            }))}
            damageRiders={listRollDieChips(model.draft.play.effects ?? [], 'damage').map((chip) => ({
              effectId: chip.effectId,
              name: chip.name,
              dice: chip.dice,
              once: chip.once,
              damageType: chip.damageType ?? null,
              optional: chip.optional,
              defaultChecked: chip.defaultChecked,
              meleeOnly: String(chip.condition || '').startsWith('next_melee_'),
              spendCharge: chip.spendCharge,
            }))}
            onConsumeOnceBuffDice={() => {
              const chips = listRollDieChips(model.draft.play.effects ?? [], 'attack').filter(
                (chip) => chip.once,
              )
              const ending = effectsEndingOnAttackCast(model.draft.play.effects ?? [])
              if (ending.length) {
                const names = ending.map((row) => row.name).join(', ')
                const ok =
                  typeof window !== 'undefined'
                    ? window.confirm(`Закончить «${names}»?`)
                    : true
                if (ok) {
                  const drop = new Set(ending.map((row) => row.id))
                  model.setDraft((prev) => ({
                    ...prev,
                    play: {
                      ...prev.play,
                      effects: (prev.play.effects ?? []).filter((row) => !drop.has(row.id)),
                    },
                  }))
                }
              }
              if (!chips.length) return
              model.setDraft((prev) => ({
                ...prev,
                play: {
                  ...prev.play,
                  effects: consumeRollDieChips(prev.play.effects ?? [], chips),
                },
              }))
            }}
            onConsumeDamageRiders={(used) => {
              if (!used.length) return
              model.setDraft((prev) => ({
                ...prev,
                play: {
                  ...prev.play,
                  effects: consumeRollDieChips(
                    prev.play.effects ?? [],
                    used.map((row) => ({
                      effectId: row.effectId,
                      name: '',
                      dice: '',
                      once: row.once,
                      rollKind: 'damage' as const,
                      spendCharge: row.spendCharge,
                    })),
                  ),
                },
              }))
            }}
            preferMagicEmpty={model.hasMagicSources}
            onOpenSettings={() => model.setAttacksSettingsOpen(true)}
            onAddAttack={() => model.setAttacksSettingsOpen(true)}
            onOpenInventory={() => {
              model.setDeskMode('explore')
              model.setActivePanel('inventory')
            }}
            onOpenItem={openInventoryItem}
            formulaVars={model.formulaVarsBase}
            onCombatFeatureToggle={(featureId, active) => {
              if (featureId === 'reckless_attack') {
                model.setDeskRollMode(active ? 'advantage' : 'normal')
                if (active && typeof model.applyFeatureBuff === 'function') {
                  void model.applyFeatureBuff({
                    slug: 'reckless_attack',
                    name: 'Безрассудная атака',
                  })
                }
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
            formulaVars={model.formulaVarsBase}
            onChange={(weapons) => model.setDraft((prev) => ({ ...prev, weapons }))}
            onClose={() => model.setAttacksSettingsOpen(false)}
            onOpenItem={openInventoryItem}
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
          formulaVars={model.formulaVarsBase}
          onOpenItem={openInventoryItem}
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
        encumbranceVariant={normalizeCampaignRules(model.campaignRulesRaw).homebrew.encumbrance}
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
        focusItemId={focusInventoryItemId}
        onFocusItemConsumed={() => setFocusInventoryItemId(null)}
        onToast={model.onToast}
        onTransferItem={(item) =>
          setTransferMode({
            kind: 'item',
            itemId: item.id,
            itemName: item.name || 'Предмет',
            maxQty: Math.max(1, item.qty || 1),
          })
        }
        onTransferCoins={() =>
          setTransferMode({
            kind: 'coins',
            balances: {
              cp: model.draft.inventory.coins.cp ?? 0,
              sp: model.draft.inventory.coins.sp ?? 0,
              ep: model.draft.inventory.coins.ep ?? 0,
              gp: model.draft.inventory.coins.gp ?? 0,
              pp: model.draft.inventory.coins.pp ?? 0,
            },
          })
        }
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
      <TransferDialog
        open={transferMode != null}
        busy={transferBusy}
        peers={transferPeers}
        mode={transferMode}
        onClose={() => setTransferMode(null)}
        onSubmit={(payload) => {
          const lobbyId = payload.lobby_id || party.lobbyId || model.baseCharacter.lobby_id
          if (!lobbyId) {
            model.onToast('Нужно быть в лобби, чтобы передать')
            return
          }
          void (async () => {
            setTransferBusy(true)
            try {
              const result = await transferLobbyInventory(lobbyId, {
                from_character_id: model.baseCharacter.id,
                to_character_id: payload.to_character_id,
                item_id: payload.item_id,
                qty: payload.qty,
                coin_currency: payload.coin_currency,
                coin_amount: payload.coin_amount,
                session_id: model.baseCharacter.open_session_id ?? null,
              })
              // Локально сразу убрать у отправителя — получатель подтянет через WS.
              model.setDraft((prev) => {
                const inv = { ...prev.inventory }
                if (payload.item_id) {
                  const qty = Math.max(1, payload.qty ?? 1)
                  inv.items = prev.inventory.items
                    .map((row) => {
                      if (row.id !== payload.item_id) return row
                      const nextQty = Math.max(0, (row.qty || 0) - qty)
                      return nextQty <= 0 ? null : { ...row, qty: nextQty }
                    })
                    .filter((row): row is NonNullable<typeof row> => row != null)
                } else if (payload.coin_currency && payload.coin_amount) {
                  const key = payload.coin_currency
                  inv.coins = {
                    ...prev.inventory.coins,
                    [key]: Math.max(
                      0,
                      (prev.inventory.coins[key] ?? 0) - payload.coin_amount,
                    ),
                  }
                }
                return { ...prev, inventory: inv }
              })
              model.onToast(result.summary)
              setTransferMode(null)
            } catch (err) {
              model.onToast(
                err instanceof ApiRequestError
                  ? err.message
                  : 'Не удалось передать',
              )
            } finally {
              setTransferBusy(false)
            }
          })()
        }}
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
      <PietyPanel
        piety={model.draft.piety}
        onChange={(nextPiety: PietyState) =>
          model.setDraft((prev) => {
            const reverted = syncPietyChampion({
              ...prev,
              piety: { ...prev.piety, score: 0 },
            })
            return {
              ...reverted,
              piety: { ...nextPiety, champion_applied: 0 },
            }
          })
        }
      />
      <ClassFeaturesPanel
        classes={model.draft.classes}
        characterLevel={model.characterLevel}
        abilities={model.draft.abilities}
        subclassSlugByEntryId={model.subclassSlugByEntryId}
        subclassTransitionByEntryId={model.subclassTransitionByEntryId}
        requestedFilter={model.featuresFilterRequest}
        onRequestedFilterConsumed={() => model.setFeaturesFilterRequest(null)}
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
              effects: model.draft.play.effects,
              infusionResistances: model.infusionBonuses?.resistances,
              featResistances: featResistanceTypes(model.draft.featGrants),
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
        onFeatureBuffApply={(input) => {
          const b04 = resolveB04FeatureSpend({
            featureId: input.featureId,
            featureNameRu: input.featureNameRu,
            classEntryId: input.classEntryId,
            classLevel: input.classLevel,
            featurePicks: model.draft.featurePicks,
            abilities: model.draft.abilities,
          })
          const b05 =
            b04.kind === 'none'
              ? resolveB05FeatureSpend({
                  featureId: input.featureId,
                  featureNameRu: input.featureNameRu,
                  classEntryId: input.classEntryId,
                  classLevel: input.classLevel,
                  abilities: model.draft.abilities,
                  proficiencyBonus: model.proficiencyBonus,
                })
              : { kind: 'none' as const }
          const b06 =
            b04.kind === 'none' && b05.kind === 'none'
              ? resolveB06FeatureSpend({
                  featureId: input.featureId,
                  featureNameRu: input.featureNameRu,
                  classEntryId: input.classEntryId,
                  classLevel: input.classLevel,
                  featurePicks: model.draft.featurePicks,
                  abilities: model.draft.abilities,
                  attunedMagicItemCount: (model.draft.attunements ?? []).filter(
                    (slot: { item_id?: string | null }) => Boolean(slot.item_id),
                  ).length,
                })
              : { kind: 'none' as const }
          const b07 =
            b04.kind === 'none' && b05.kind === 'none' && b06.kind === 'none'
              ? resolveB07FeatureSpend({
                  featureId: input.featureId,
                  featureNameRu: input.featureNameRu,
                  characterLevel: model.characterLevel,
                  proficiencyBonus: model.proficiencyBonus,
                  abilities: model.draft.abilities,
                })
              : { kind: 'none' as const }
          const b08 =
            b04.kind === 'none' &&
            b05.kind === 'none' &&
            b06.kind === 'none' &&
            b07.kind === 'none'
              ? resolveB08FeatureSpend({
                  featureId: input.featureId,
                  featureNameRu: input.featureNameRu,
                  characterLevel: model.characterLevel,
                  proficiencyBonus: model.proficiencyBonus,
                  abilities: model.draft.abilities,
                  raceSlug: model.draft.raceGrant?.slug ?? null,
                  revelationId:
                    (model.draft.raceGrant as { revelationId?: string | null } | null)
                      ?.revelationId ?? null,
                  seasonId:
                    (model.draft.raceGrant as { seasonId?: string | null } | null)
                      ?.seasonId ?? null,
                })
              : { kind: 'none' as const }
          const action =
            b04.kind !== 'none'
              ? b04
              : b05.kind !== 'none'
                ? b05
                : b06.kind !== 'none'
                  ? b06
                  : b07.kind !== 'none'
                    ? b07
                    : b08
          if (action.kind === 'heal') {
            model.setDraft((prev) => ({
              ...prev,
              hpCurrent: Math.min(
                prev.hpMax ?? action.amount,
                (prev.hpCurrent ?? 0) + action.amount,
              ),
            }))
            model.onToast(action.label)
            return
          }
          if (action.kind === 'temp_hp') {
            const amount = action.amount
            const current = model.draft.play.hpTemp || 0
            const applyTemp = () => {
              model.setDraft((prev) => ({
                ...prev,
                play: { ...prev.play, hpTemp: amount },
              }))
            }
            if (action.forceReplace || current <= 0) {
              applyTemp()
            } else if (model.askTempHpReplace) {
              void model.askTempHpReplace({ current, incoming: amount }).then(
                (choice: 'keep' | 'replace') => {
                  if (choice === 'replace') applyTemp()
                },
              )
            } else {
              applyTemp()
            }
            model.onToast(action.label)
            return
          }
          if (action.kind !== 'buff') return
          if ('clearConcentration' in action && action.clearConcentration) {
            model.clearConcentrationDismissingCompanions?.(null)
          }
          if (action.targetsSelf === false) {
            setPendingAllyBuff({
              slug: action.slug,
              name: action.name || input.featureNameRu,
              classLevel: action.classLevel,
              casterMod: action.casterMod,
              option: action.option,
              slotLevel:
                'slotLevel' in action ? action.slotLevel : undefined,
              auraAllyDefaultOff:
                'auraAllyDefaultOff' in action
                  ? Boolean(action.auraAllyDefaultOff)
                  : action.slug.startsWith('aura_of_'),
            })
            return
          }
          void model
            .applyFeatureBuff({
              slug: action.slug,
              name: action.name,
              classLevel: action.classLevel,
              casterMod: action.casterMod,
              option: action.option,
              slotLevel:
                action.kind === 'buff' && 'slotLevel' in action
                  ? action.slotLevel
                  : undefined,
              auraAllyDefaultOff:
                action.kind === 'buff' && 'auraAllyDefaultOff' in action
                  ? action.auraAllyDefaultOff
                  : undefined,
            })
            .then((res: { error?: string } | undefined) => {
              if (res?.error) model.onToast(res.error)
              else if (action.slug === 'rage') model.onToast('В ярости')
            })
        }}
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
        focusCompanionId={model.focusCompanionId}
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
        attackHost={{
          characterLevel: model.characterLevel,
          proficiencyBonus: model.proficiencyBonus,
          spellMod: abilityModifier(
            model.effectiveAbilities[
              model.draft.spells.casting_ability === 'int' ||
              model.draft.spells.casting_ability === 'wis' ||
              model.draft.spells.casting_ability === 'cha'
                ? model.draft.spells.casting_ability
                : 'wis'
            ],
          ),
        }}
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
        onOpenFeatures={() => {
          model.setDeskMode('features')
          model.setActivePanel('features')
        }}
      />

      </div>

      </div>{/* scene-wrap */}
      {pendingAllyBuff ? (
        <UseAllyAbilityDialog
          open
          characterId={String(model.baseCharacter.id)}
          characterName={
            model.draft.name?.trim() || model.baseCharacter.name || 'Персонаж'
          }
          abilityName={pendingAllyBuff.name}
          targetCount={1}
          onClose={() => setPendingAllyBuff(null)}
          onConfirm={(targetIds) => {
            const targets =
              targetIds.length > 0
                ? targetIds
                : [String(model.baseCharacter.id)]
            void model
              .applyFeatureBuff?.({
                slug: pendingAllyBuff.slug,
                name: pendingAllyBuff.name,
                targets,
                classLevel: pendingAllyBuff.classLevel,
                casterMod: pendingAllyBuff.casterMod,
                option: pendingAllyBuff.option,
                slotLevel: pendingAllyBuff.slotLevel,
                auraAllyDefaultOff: pendingAllyBuff.auraAllyDefaultOff,
              })
              .then((res: { error?: string } | undefined) => {
                if (res?.error) model.onToast(res.error)
                else
                  model.onToast(
                    `${pendingAllyBuff.name}: целей ${targets.length}`,
                  )
              })
            setPendingAllyBuff(null)
          }}
          onToast={model.onToast}
        />
      ) : null}

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
