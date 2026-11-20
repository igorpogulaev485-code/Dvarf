/** Диалоги бросков, свитков и разбора чисел. */
import type { SheetModel } from './sheetModel'
import { applyConcentrationChangeToCompanions } from '../spellCompanions'
import { AbilityBreakdownDialog } from '../AbilityBreakdownDialog'
import { AcBreakdownDialog } from '../AcBreakdownDialog'
import { TempHpReplaceDialog } from '../TempHpReplaceDialog'
import { InitiativeBreakdownDialog } from '../InitiativeBreakdownDialog'
import { SpeedBreakdownDialog } from '../SpeedBreakdownDialog'
import { Dialog, Field, Select, Stack, Text } from '../../../ui'
import { resolveHeroicReroll } from '../../../shared/dnd/heroicInspiration'
import { postSheetRollToSession } from '../postSheetRollToSession'
import { patchSeatCombat } from '../../../shared/api/lobbies'
import { ConsumableSpendPadDialog } from '../ConsumableSpendPadDialog'
import { syncAttacksHeldFromInventory } from '../AttacksPanel'
import { canWearArmor, armorProficiencyHint } from '../equipmentProficiency'
import { listShieldItems, toggleShieldInHand } from '../heldEquip'
import { HotConditionsDialog } from '../HotConditionsDialog'
import {
  applyHalflingLuckyReroll,
  applyLuckyPick,
  formatCheckRoll,
  formatSkillRoll,
} from '../deskRolls'
// formatSkillRoll used by O-02 Magical Guidance reroll toast
import {
  listRollDieChips,
  mergeDeskRollMode,
  resolveAdvantageFromEffects,
} from '../../../shared/dnd/activeEffects'
import { spendBardicInspirationOnTarget } from '../../../shared/dnd/bardicInspirationTarget2024'
import { formatSaveAdvantageNote } from '../gearEffects'
import { setConcentration } from '../../../shared/dnd/concentration'
import { equippedArmorPieces } from '../inventory'
import { CastSpellDialog } from '../CastSpellDialog'
import { collectWarlockInvocationIds } from '../../../shared/dnd/o06StylesBreathInvocations'
import { normalizeCampaignRules } from '../../lobby/campaignRules'
import { listActiveInfusionBindings } from '../../../shared/dnd/infusionsActive'
import { ScrollCastGate, useScrollSpellClasses } from '../ScrollCastGate'
import {
  consumeScrollItem,
  isCastableSpellScroll,
  resolveScrollClasses,
  scrollCastersFromProfiles,
  spellScrollCastStats,
} from '../spellScroll'
import { ignoresClassRaceLevel } from '../attunementRules'
import { abilityModifier } from '../sheetTypes'
import { getFeaturePick } from '../../../shared/dnd/featurePicks'
import {
  moonCircleSpellCastableInForm2024,
  potentSpellcastingForSheet2024,
} from '../../../shared/dnd/druid2024Features'
import { elementalAffinityPreview } from '../../../shared/dnd/pack04SorcererWarlock'
import { activeBeastWildShape } from '../wildShape'

function infusedItemIdsFor(model: SheetModel): string[] {
  const ids: string[] = []
  for (const row of model.draft.classes) {
    const artificer =
      /изобретат|artificer/i.test(row.name) ||
      (row.catalog_id ?? '').toLowerCase().includes('artificer')
    if (!artificer) continue
    for (const binding of listActiveInfusionBindings(model.draft.featurePicks, row.id)) {
      if (binding.target === 'self' && binding.itemId) ids.push(binding.itemId)
    }
  }
  return ids
}

export function SheetDialogsRolls({ model }: { model: SheetModel }) {
  const potentSheet = potentSpellcastingForSheet2024({
    rulesEdition: model.baseCharacter.rules_edition,
    classes: model.draft.classes,
    featurePicks: model.draft.featurePicks,
    classOptions: model.draft.classOptions2024,
    wisScore: model.effectiveAbilities?.wis ?? model.draft.abilities.wis,
  })
  const sorcerer = model.draft.classes.find((row) => /чародей|sorcerer/i.test(row.name))
  const elementalAffinity = sorcerer
    ? elementalAffinityPreview({
        subclassSlug: model.subclassSlugByEntryId?.[sorcerer.id] || sorcerer.subclass_name,
        sorcererLevel: sorcerer.level,
        ancestry: getFeaturePick(model.draft.featurePicks, sorcerer.id, 'dragon_ancestor'),
        chaMod: abilityModifier(model.effectiveAbilities.cha),
      })
    : null
  const arcaneArmor = model.unlockedFeatures.some(
    (feature: { id: string }) => feature.id === 'arcane_armor',
  )
  const arcaneFirearm = model.unlockedFeatures.some(
    (feature: { id: string }) => feature.id === 'arcane_firearm',
  )
  const scrollIndex = useScrollSpellClasses(model.draft.inventory.items, model.rulesEdition)
  const scrollItem = model.deskCastScrollId
    ? model.draft.inventory.items.find((row) => row.id === model.deskCastScrollId) ?? null
    : null
  const scrollCasters = scrollCastersFromProfiles(model.spellcastingSync?.castProfiles ?? [])
  const thiefScroll = ignoresClassRaceLevel(model.draft.classes)
  return (
    <>
      {/* DICE-02a: история бросков → единый журнал панели (openDiceJournal). */}

      <Dialog
        open={model.conflictOpen}
        title="Конфликт версий листа"
        primaryLabel={model.reloading ? 'Сохраняем…' : 'Сохранить мои правки'}
        secondaryLabel="Взять с сервера"
        busy={model.reloading}
        onPrimary={() => void model.saveLocalOverServer()}
        onSecondary={() => {
          if (model.reloading) return
          void model.reloadFromServer()
        }}
        closeOnBackdrop={false}
      >
        <Text>
          На сервере уже есть более новая версия (другая вкладка, устройство или гонка автосейва).
          «Сохранить мои правки» запишет то, что на экране. «Взять с сервера» заменит экран
          серверной копией — локальные правки пропадут.
        </Text>
      </Dialog>

      <Dialog
        open={model.concDamageAsk != null}
        title="Концентрация"
        primaryLabel="Удержал"
        secondaryLabel="Сорвалось"
        primaryVariant="primary"
        onPrimary={() => {
          model.setConcDamageAsk(null)
          model.onToast('Концентрация удержана')
        }}
        onSecondary={() => {
          model.clearConcentrationDismissingCompanions(null)
          model.setConcDamageAsk(null)
          model.onToast('Концентрация сорвалась')
        }}
      >
        <Text>
          Урон {model.concDamageAsk?.damage ?? 0} хитов. Спас концентрации Сл{' '}
          {model.concDamageAsk?.dc ?? 10}
          {model.concDamageAsk?.spellName ? ` («${model.concDamageAsk.spellName}»)` : ''}. Удержал?
        </Text>
      </Dialog>

      <CastSpellDialog
        open={model.deskCastSpell != null}
        spell={model.deskCastSpell}
        spells={model.draft.spells}
        inventoryItems={model.draft.inventory.items}
        characterLevel={model.characterLevel}
        characterId={model.character.id}
        wizardRitualFromBook={model.spellLearnBudget?.mode === 'spellbook'}
        masterySpellIds={model.draft.classes
          .filter((row: { name: string }) => /волшебник|wizard/i.test(row.name))
          .flatMap((row: { id: string }) =>
            (model.draft.featurePicks.values[`${row.id}:spell_mastery`] ?? '')
              .split(',')
              .map((id: string) => id.trim())
              .filter(Boolean),
          )}
        offerPowerSurge={model.draft.play.resources.some(
          (row: { id: string }) => row.id.includes(':power_surge:'),
        )}
        embodimentRemaining={(() => {
          const pool = model.draft.play.resources.find((row) =>
            row.id.includes(':embodiment_of_the_law:'),
          )
          return Math.max(0, (pool?.max ?? 0) - (pool?.used ?? 0))
        })()}
        voiceOfAuthority={model.unlockedFeatures.some(
          (row: { id: string }) => row.id === 'voice_of_authority',
        )}
        resources={model.draft.play.resources}
        metamagicIds={model.sorcererMetamagicIds ?? []}
        rulesEdition={model.rulesEdition ?? model.baseCharacter?.rules_edition ?? '2014'}
        waiveFreeMaterialComponents={Boolean(
          (model.rulesEdition ?? model.baseCharacter?.rules_edition) === '2024' &&
            activeBeastWildShape(model.draft.companions) &&
            model.deskCastSpell &&
            (model.druidLevel >= 18 ||
              moonCircleSpellCastableInForm2024({
                rulesEdition: model.rulesEdition,
                druidLevel: model.druidLevel,
                subclassSlug: model.druidSubclassSlug,
                spell: model.deskCastSpell,
              })),
        )}
        sorcererLevel={model.draft.classes.reduce((sum, row) => {
          if (!/чародей|sorcerer/i.test(row.name)) return sum
          return sum + Math.max(0, row.level || 0)
        }, 0)}
        innateSorceryActive={model.draft.play.resources.some(
          (row) => /врождённ.*чародей/i.test(row.name) && row.activeLabel,
        )}
        initialMetamagicId={model.deskCastMetamagic ?? null}
        magicalInspirationAvailable={
          model.campaignRulesRaw != null &&
          normalizeCampaignRules(model.campaignRulesRaw).start.allowed_sources.includes(
            'tce',
          ) &&
          (model.playActiveFeatures ?? model.unlockedFeatures ?? []).some(
            (f: { id?: string }) => f.id === 'magical_inspiration',
          )
        }
        elementalAffinity={elementalAffinity}
        knownInvocationIds={collectWarlockInvocationIds({
          classes: model.draft.classes,
          featurePickValues: model.draft.featurePicks.values,
          classOptionsInvocations:
            model.baseCharacter.rules_edition === '2024'
              ? model.draft.classOptions2024?.eldritch_invocations
              : null,
        })}
        warlockLevel={
          model.draft.classes.find((row) => /колдун|warlock/i.test(row.name))?.level ??
          model.characterLevel
        }
        bardLevel={
          model.draft.classes.find((row) => /бард|bard/i.test(row.name))?.level ?? 0
        }
        potentSpellcastingBonus={potentSheet.bonus}
        potentSpellcastingClass={potentSheet.classSlug}
        potentSpellcastingRangeBonusFt={potentSheet.rangeBonusFt}
        abilities={model.effectiveAbilities}
        proficiencyBonus={model.proficiencyBonus}
        castProfiles={model.spellcastingSync.castProfiles}
        modifiers={model.spellCastModifiers}
        formulaVars={model.formulaVarsBase}
        onSelectSpellVariant={model.setDeskCastSpell}
        onConfirm={model.confirmDeskCast}
        statLock={
          model.deskScrollLock
            ? {
                saveDc: model.deskScrollLock.saveDc,
                attackBonus: model.deskScrollLock.attackBonus,
              }
            : null
        }
        scrollItemId={model.deskScrollLock?.itemId ?? null}
        onClose={() => {
          model.setDeskCastSpell(null)
          model.setDeskCastMetamagic?.(null)
          model.setDeskScrollLock(null)
        }}
        onRequestRest={() => {
          model.setDeskCastSpell(null)
          model.setDeskCastMetamagic?.(null)
          model.setRestOpen(true)
        }}
        arcaneArmor={arcaneArmor}
        arcaneFirearm={arcaneFirearm}
        infusedItemIds={infusedItemIdsFor(model)}
        onRestorePact={() => {
          model.setDraft((prev) => {
            const pact = prev.spells.pact_slots
            if (!pact || pact.used <= 0) return prev
            return {
              ...prev,
              spells: {
                ...prev.spells,
                pact_slots: { ...pact, used: 0 },
              },
            }
          })
          model.onToast('Ячейки договора восстановлены')
        }}
      />

      <ConsumableSpendPadDialog
        key={model.consumableSpendPadId ?? 'consumable-spend-pad-closed'}
        open={model.consumableSpendPadId != null}
        itemName={
          model.consumableSpendPadId
            ? model.draft.inventory.items.find((row) => row.id === model.consumableSpendPadId)?.name ??
              'Расходник'
            : 'Расходник'
        }
        maxQty={
          model.consumableSpendPadId
            ? Math.max(
                0,
                model.draft.inventory.items.find((row) => row.id === model.consumableSpendPadId)?.qty ?? 0,
              )
            : 0
        }
        onClose={() => model.setConsumableSpendPadId(null)}
        onConfirm={(amount) => {
          const itemId = model.consumableSpendPadId
          model.setConsumableSpendPadId(null)
          if (!itemId) return
          model.spendConsumableFromDesk(itemId, amount)
        }}
      />

      <ScrollCastGate
        open={model.deskCastScrollId != null}
        item={scrollItem}
        spellClasses={
          scrollItem
            ? resolveScrollClasses(scrollItem, scrollIndex.index, scrollIndex.ready)
            : null
        }
        casters={scrollCasters}
        thiefRogue13={thiefScroll}
        abilityMod={(ability) => abilityModifier(model.effectiveAbilities[ability])}
        edition={model.rulesEdition}
        onOpenCast={(spell, itemId, stats) => {
          model.setDeskScrollLock({
            itemId,
            saveDc: stats.saveDc,
            attackBonus: stats.attackBonus,
          })
          model.setDeskCastSpell(spell)
          model.setDeskCastScrollId(null)
        }}
        onConsume={(itemId, message) => {
          model.setDraft((prev) => ({
            ...prev,
            inventory: {
              ...prev.inventory,
              items: consumeScrollItem(prev.inventory.items, itemId),
            },
          }))
          model.onToast(message)
        }}
        onClose={() => model.setDeskCastScrollId(null)}
      />

      <Dialog
        open={model.deskCastScrollPending != null}
        title="Смена концентрации"
        primaryLabel="Сменить и кастовать свиток"
        secondaryLabel="Отмена"
        primaryVariant="danger"
        onPrimary={() => {
          if (!model.deskCastScrollPending) return
          const { itemId, name } = model.deskCastScrollPending
          const item = model.draft.inventory.items.find((row) => row.id === itemId)
          const binding = item?.scroll_spell
          model.setDeskCastScrollPending(null)
          if (!item || !binding || !isCastableSpellScroll(item)) return
          const stats = spellScrollCastStats(binding.level)
          const scrollSpellId = `scroll:${item.id}:${binding.catalog_id ?? binding.name}`
          model.setDraft((prev) => {
            const nextConc = setConcentration({
              spellId: scrollSpellId,
              name,
            })
            const result = applyConcentrationChangeToCompanions({
              companions: prev.companions,
              previous: prev.play.concentration,
              next: nextConc,
            })
            return {
              ...prev,
              companions: result.companions,
              inventory: {
                ...prev.inventory,
                items: consumeScrollItem(prev.inventory.items, itemId),
              },
              play: {
                ...prev.play,
                concentration: nextConc,
              },
            }
          })
          model.onToast(
            `Свиток: ${name} · Сл ${stats.saveDc} · +${stats.attackBonus} · концентрация · свиток израсходован`,
          )
        }}
        onSecondary={() => {
          if (model.deskCastScrollPending) model.setDeskCastScrollId(model.deskCastScrollPending.itemId)
          model.setDeskCastScrollPending(null)
        }}
      >
        <Text>
          Сейчас концентрация: «{model.draft.play.concentration?.name ?? '—'}». Сменить на «
          {model.deskCastScrollPending?.name ?? 'Заклинание'}» со свитка?
        </Text>
      </Dialog>

      <Dialog
        open={model.deskCastPending != null}
        title="Смена концентрации"
        primaryLabel="Сменить и кастовать"
        secondaryLabel="Отмена"
        primaryVariant="danger"
        onPrimary={() => {
          if (!model.deskCastPending) return
          const { spell, choice } = model.deskCastPending
          model.setDeskCastPending(null)
          model.runDeskCast(spell, choice)
        }}
        onSecondary={() => {
          // Return to cast picker — Cancel must not drop the cast flow.
          if (model.deskCastPending) model.setDeskCastSpell(model.deskCastPending.spell)
          model.setDeskCastPending(null)
        }}
      >
        <Text>
          Сейчас концентрация: «{model.draft.play.concentration?.name ?? '—'}». Сменить на «
          {model.deskCastPending?.spell.name || 'Заклинание'}»?
          {model.deskCastPending?.choice.noSlot
            ? ' Ячейка не тратится.'
            : ' Ячейка потратится после подтверждения.'}
        </Text>
      </Dialog>

      <HotConditionsDialog
        open={model.hotConditionsOpen}
        edition={model.rulesEdition}
        play={model.draft.play}
        onPlayChange={(play) => model.setDraft((prev) => ({ ...prev, play }))}
        onToast={model.onToast}
        onClose={() => model.setHotConditionsOpen(false)}
        mountedActive={Boolean(
          (model.draft.companions ?? []).some(
            (c: { mounted?: boolean; active?: boolean }) =>
              c.mounted && c.active !== false,
          ),
        )}
        mountedLabel={
          (
            (model.draft.companions ?? []).find(
              (c: { mounted?: boolean; active?: boolean; name?: string }) =>
                c.mounted && c.active !== false,
            ) as { name?: string } | undefined
          )?.name ?? null
        }
        immuneWarning={
          (model.unlockedFeatures ?? []).some(
            (feature: { id?: string }) => feature.id === 'fungal_body',
          ) && (model.draft.hpCurrent ?? 0) >= 1
            ? {
                slugs: ['blinded', 'deafened', 'frightened', 'poisoned'],
                reason:
                  'Грибковое тело: пока есть хотя бы 1 хит, нельзя ослепить, оглохнуть, испугать или отравить. Критическое попадание по тебе считается обычным. Отметить состояние всё равно?',
              }
            : null
        }
      />

      <AcBreakdownDialog
        open={model.acBreakdownOpen}
        totalAc={model.armorClass.ac}
        summary={model.armorClass.gearSummary}
        baseLabel={model.armorClass.baseLabel}
        shieldBonus={model.armorClass.shieldBonus}
        shieldInHand={Boolean(equippedArmorPieces(model.draft.inventory.items).shield)}
        shieldAvailable={listShieldItems(model.draft.inventory.items).length > 0}
        onToggleShield={() => {
          const shields = listShieldItems(model.draft.inventory.items)
          const anyOn = shields.some((row) => row.equipped)
          if (!anyOn && !canWearArmor('shield', model.draft.identity.armor)) {
            model.onToast(armorProficiencyHint('shield'))
            return
          }
          const result = toggleShieldInHand(model.draft.inventory.items)
          if (!result.ok) {
            model.onToast(result.reason)
            return
          }
          model.setDraft((prev) => ({
            ...prev,
            inventory: { ...prev.inventory, items: result.items },
            weapons: syncAttacksHeldFromInventory(prev.weapons, result.items),
          }))
          model.onToast(
            result.equipped
              ? `Щит «${result.name}» в руке`
              : `Щит «${result.name}» убран`,
          )
        }}
        formulaVars={model.armorClass.formulaVars}
        modifiers={model.draft.modifiers}
        onModifiersChange={(modifiers) =>
          model.setDraft((prev) => ({ ...prev, modifiers }))
        }
        formulaCandidates={model.armorClass.candidates ?? []}
        selectedFormulaKey={model.armorClass.formulaKey ?? null}
        floorNote={model.armorClass.floorApplied ?? null}
        onSelectFormula={(key) => {
          model.setDraft((prev) => ({
            ...prev,
            acFormulaKey: key,
          }))
        }}
        onClose={() => model.setAcBreakdownOpen(false)}
      />

      <TempHpReplaceDialog request={model.tempHpReplaceAsk ?? null} />

      <Dialog
        open={model.heroicRerollPending != null}
        title="Героическое вдохновение"
        primaryLabel="Перебросить"
        secondaryLabel="Не сейчас"
        onPrimary={() => {
          const pending = model.heroicRerollPending
          if (!pending) return
          const sides = Math.max(2, Math.floor(pending.sides || 20))
          const te = model.turnEconomyApi as
            | {
                diceOnTable?: boolean
                openEnterOwnNumber?: (o: {
                  title: string
                  mode?: 'total' | 'd20' | 'formula'
                  modifier?: number
                  formula?: string | null
                  onDone?: (total: number) => void
                }) => void
              }
            | undefined
          const finish = (face: number, physical: boolean) => {
            if (!model.spendHeroicInspirationReroll?.()) return
            const line = `Героическое вдохновение: ${pending.label} — переброс к${sides} → ${face} (новый результат)`
            model.emitToast?.(line)
            void postSheetRollToSession({
              openSessionId: model.character.open_session_id,
              characterId: model.character.id,
              title: `Героическое вдохновение · переброс · ${pending.label}`,
              total: face,
              formula: `1к${sides}`,
              breakdown: line,
              physicalDice: physical,
            })
          }
          // Physical: перебросить = ввести новое число (не RNG).
          if (te?.diceOnTable && te.openEnterOwnNumber) {
            model.setHeroicRerollPending?.(null)
            te.openEnterOwnNumber({
              title: `Героическое вдохновение · ${pending.label}`,
              mode: sides === 20 ? 'd20' : 'formula',
              modifier: 0,
              formula: sides === 20 ? null : `1к${sides}`,
              onDone: (total) => finish(total, true),
            })
            return
          }
          const rr = resolveHeroicReroll({ previous: 0, sides })
          finish(rr.next, false)
        }}
        onSecondary={() => model.setHeroicRerollPending?.(null)}
      >
        <Stack gap={8}>
          <Text data-testid="heroic-inspiration-reroll-chip">
            Потратить героическое вдохновение и перебросить любой кубик
            {model.heroicRerollPending
              ? ` (к${model.heroicRerollPending.sides} · ${model.heroicRerollPending.label})`
              : ''}
            ? Новый результат обязателен.
          </Text>
        </Stack>
      </Dialog>

      <Dialog
        open={Boolean(model.heroicTransferOpen)}
        title="Передать героическое вдохновение"
        primaryLabel="Передать"
        secondaryLabel="Отмена"
        primaryDisabled={!model.heroicTransferAllyId}
        onPrimary={() => {
          const allyId = model.heroicTransferAllyId
          if (!allyId) return
          if (!model.transferHeroicInspirationToAlly?.(allyId)) return
          const sessionId = model.character.open_session_id
          if (sessionId) {
            void patchSeatCombat(sessionId, allyId, { inspiration: true }).catch(() => {
              model.onToast?.('Не удалось выдать союзнику на столе — отметьте вручную')
            })
            const allies = (model.heroicTransferAllies || []) as Array<{
              id: string
              name: string
            }>
            const allyName = allies.find((a) => a.id === allyId)?.name || allyId
            void postSheetRollToSession({
              openSessionId: sessionId,
              characterId: model.character.id,
              title: `Героическое вдохновение · передача → ${allyName}`,
              total: 0,
              breakdown: `Перевёл героическое вдохновение союзнику ${allyName}`,
            })
          }
          model.setHeroicTransferOpen?.(false)
          model.setHeroicTransferAllyId?.('')
        }}
        onSecondary={() => {
          model.setHeroicTransferOpen?.(false)
          model.setHeroicTransferAllyId?.('')
        }}
      >
        <Stack gap={8}>
          <Text data-testid="heroic-inspiration-transfer">
            У вас уже есть героическое вдохновение. Можно отдать союзнику в том же лобби, у кого
            его нет.
          </Text>
          <Field label="Союзник">
            <Select
              value={model.heroicTransferAllyId || ''}
              onChange={(e) => model.setHeroicTransferAllyId?.(e.target.value)}
              data-testid="heroic-transfer-ally"
            >
              <option value="">Выберите…</option>
              {((model.heroicTransferAllies || []) as Array<{ id: string; name: string }>).map(
                (ally) => (
                  <option key={ally.id} value={ally.id}>
                    {ally.name}
                  </option>
                ),
              )}
            </Select>
          </Field>
        </Stack>
      </Dialog>

      <Dialog
        open={model.halflingLuckyPending != null}
        title="Удача: перебросить?"
        primaryLabel="Перебросить"
        secondaryLabel="Оставить 1"
        onPrimary={() => {
          const pending = model.halflingLuckyPending
          if (!pending?.hitRoll) {
            model.setHalflingLuckyPending?.(null)
            return
          }
          const rerolled = applyHalflingLuckyReroll(pending.hitRoll)
          const label = pending.text.split(':')[0] || 'Бросок'
          const bonusFlat =
            pending.hitRoll.total - pending.hitRoll.die - pending.hitRoll.modifier
          const rebuilt = formatCheckRoll(label, {
            ...rerolled,
            total: rerolled.die + rerolled.modifier + bonusFlat,
          })
          const dmgIdx = pending.text.indexOf(' · урон')
          const suffix = dmgIdx >= 0 ? pending.text.slice(dmgIdx) : ''
          model.emitToast?.(`${rebuilt}${suffix}`)
          model.setHalflingLuckyPending?.(null)
        }}
        onSecondary={() => model.setHalflingLuckyPending?.(null)}
      >
        <Stack gap={8}>
          <Text>
            На к20 выпала 1. Удача полурослика: можете перебросить — новый результат
            обязателен.
          </Text>
        </Stack>
      </Dialog>

      <Dialog
        open={model.magicalGuidanceOffer != null}
        title="Магическое наставление"
        primaryLabel="Перебросить (−1 очко)"
        secondaryLabel="Не сейчас"
        onPrimary={() => {
          const offer = model.magicalGuidanceOffer
          if (!offer) return
          const sp = model.draft.play.resources.find(
            (row: { id: string; name: string }) =>
              row.id.includes(':sorcery_points:') ||
              /очки чародейства/i.test(row.name),
          )
          if (!sp || sp.used >= sp.max) {
            model.onToast('Нет очков чародейства')
            model.setMagicalGuidanceOffer?.(null)
            return
          }
          model.setDraft((prev: typeof model.draft) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === sp.id
                  ? { ...row, used: Math.min(row.max, row.used + 1) }
                  : row,
              ),
            },
          }))
          const te = model.turnEconomyApi as
            | {
                diceOnTable?: boolean
                openEnterOwnNumber?: (o: {
                  title: string
                  mode?: 'total' | 'd20'
                  modifier?: number
                }) => void
              }
            | undefined
          if (te?.diceOnTable && te.openEnterOwnNumber) {
            te.openEnterOwnNumber({
              title: `Переброс: ${offer.label}`,
              mode: 'd20',
              modifier: offer.mod,
            })
            model.onToast(
              `Магическое наставление: −1 очко · введи новый результат (обязателен)`,
            )
          } else {
            const text = formatSkillRoll(offer.label, offer.mod, 'normal')
            model.emitToast?.(`Магическое наставление: −1 очко · ${text}`)
          }
          model.setMagicalGuidanceOffer?.(null)
        }}
        onSecondary={() => model.setMagicalGuidanceOffer?.(null)}
      >
        <Stack gap={8}>
          <Text>
            При провале проверки «{model.magicalGuidanceOffer?.label}» можно потратить 1
            очко чародейства и перебросить d20 — новый результат обязателен.
          </Text>
        </Stack>
      </Dialog>

      <Dialog
        open={model.bardicInspirationSpendOffer != null}
        title="Бардовское вдохновение"
        primaryLabel={
          model.bardicInspirationSpendOffer?.mode === 'combat_ac'
            ? `КД +${model.bardicInspirationSpendOffer.dieLabelRu}`
            : model.bardicInspirationSpendOffer?.mode === 'combat_damage'
              ? `Урон +${model.bardicInspirationSpendOffer.dieLabelRu}`
              : `Прибавить ${model.bardicInspirationSpendOffer?.dieLabelRu ?? ''}`
        }
        secondaryLabel="Не сейчас"
        onPrimary={() => {
          const offer = model.bardicInspirationSpendOffer
          if (!offer) return
          const spent = spendBardicInspirationOnTarget({
            effects: model.draft.play.effects ?? [],
            mode: offer.mode,
            effectId: offer.effectId,
          })
          if (!spent.ok) {
            model.onToast(spent.message ?? 'Не удалось потратить вдохновение')
            model.setBardicInspirationSpendOffer?.(null)
            return
          }
          model.setDraft((prev: typeof model.draft) => ({
            ...prev,
            play: { ...prev.play, effects: spent.effects },
          }))
          model.emitToast?.(
            spent.feedLineRu ??
              `Бардовское вдохновение: ${spent.dieLabelRu} → ${spent.face} · к «${offer.label}»`,
          )
          model.setBardicInspirationSpendOffer?.(null)
        }}
        onSecondary={() => model.setBardicInspirationSpendOffer?.(null)}
      >
        <Stack gap={8}>
          <Text>
            {model.bardicInspirationSpendOffer?.mode === 'combat_ac'
              ? `Реакция: прибавить ${model.bardicInspirationSpendOffer.dieLabelRu} к КД против попавшей атаки — кость потратится.`
              : model.bardicInspirationSpendOffer?.mode === 'combat_damage'
                ? `Прибавить ${model.bardicInspirationSpendOffer.dieLabelRu} к урону попавшей атаки — кость потратится.`
                : `При провале «${model.bardicInspirationSpendOffer?.label}» можно один раз бросить ${model.bardicInspirationSpendOffer?.dieLabelRu} и прибавить к Тесту к20 — это может сменить провал на успех. Кость потратится.`}
          </Text>
        </Stack>
      </Dialog>

      <Dialog
        open={model.relentlessEndurancePending != null}
        title="Непоколебимая стойкость"
        primaryLabel="Остаться с 1 хитом"
        secondaryLabel="Упасть"
        onPrimary={() => {
          model.setDraft?.((prev) => ({
            ...prev,
            hpCurrent: 1,
            play: {
              ...prev.play,
              isDying: false,
              deathSuccesses: 0,
              deathFails: 0,
            },
          }))
          void model.applyFeatureBuff?.({
            slug: 'relentless_endurance_spent',
            name: 'Непоколебимая стойкость (израсходована)',
          })
          model.onToast?.('Непоколебимая стойкость: остаётесь с 1 хитом')
          model.setRelentlessEndurancePending?.(null)
        }}
        onSecondary={() => model.setRelentlessEndurancePending?.(null)}
      >
        <Stack gap={8}>
          <Text>
            Хиты должны опуститься до 0. Использовать Непоколебимую стойкость и остаться с
            1 хитом? (1 раз до продолжительного отдыха)
          </Text>
        </Stack>
      </Dialog>

      <Dialog
        open={model.strengthOfTheGravePending != null}
        title="Сила могилы"
        primaryLabel="Успех спаса"
        secondaryLabel="Провал / упасть"
        onPrimary={() => {
          const pending = model.strengthOfTheGravePending
          const damage = Math.max(0, pending?.damage ?? 0)
          const sorcererLevel = (model.draft.classes ?? [])
            .filter((row: { name?: string; catalog_id?: string | null; level?: number }) => {
              const name = String(row.name || '')
              const catalog = String(row.catalog_id || '').toLowerCase()
              return catalog === 'sorcerer' || /чародей/i.test(name)
            })
            .reduce(
              (sum: number, row: { level?: number }) => sum + Math.max(0, row.level || 0),
              0,
            )
          const chaScore = model.draft.abilities?.cha ?? 10
          const chaMod = Math.floor((Number(chaScore) - 10) / 2)
          const hp = Math.max(1, chaMod + Math.max(1, sorcererLevel || 1))
          const dc = 5 + damage
          model.setDraft?.((prev) => ({
            ...prev,
            hpCurrent: hp,
            play: {
              ...prev.play,
              isDying: false,
              deathSuccesses: 0,
              deathFails: 0,
              resources: (prev.play.resources ?? []).map((row) => {
                if (
                  (typeof row.id === 'string' && row.id.includes(':power_of_shadow:')) ||
                  /сила\s*могил/i.test(String(row.name || ''))
                ) {
                  return { ...row, used: Math.min(row.max, (row.used ?? 0) + 1) }
                }
                return row
              }),
            },
          }))
          model.onToast?.(
            `Сила могилы: успех против Сл ${dc} — хиты = ${hp} (Хар+ур.).`,
          )
          model.setStrengthOfTheGravePending?.(null)
        }}
        onSecondary={() => model.setStrengthOfTheGravePending?.(null)}
      >
        <Stack gap={8}>
          <Text>
            Хиты опустились до 0. Совершите спасбросок Харизмы (Сл 5 + полученный урон
            {model.strengthOfTheGravePending
              ? ` = ${5 + (model.strengthOfTheGravePending.damage || 0)}`
              : ''}
            ). При успехе хиты становятся равны модификатору Харизмы + уровню чародея (1
            успешный спас до долгого отдыха).
          </Text>
        </Stack>
      </Dialog>

      <Dialog
        open={model.luckyPickPending != null}
        title="Везунчик: выберите к20"
        primaryLabel="Закрыть"
        secondaryLabel="Отмена"
        onPrimary={() => model.setLuckyPickPending?.(null)}
        onSecondary={() => model.setLuckyPickPending?.(null)}
      >
        <Stack gap={8}>
          <Text>Выберите любую из выпавших костей (решение 11).</Text>
          <div className="chip-row" role="group" aria-label="Кости удачи">
            {(model.luckyPickPending?.allDice ?? []).map((die: number, idx: number) => (
              <button
                key={`${die}-${idx}`}
                type="button"
                className="sheet-chip"
                onClick={() => {
                  const pending = model.luckyPickPending
                  if (!pending?.hitRoll) return
                  const picked = applyLuckyPick(pending.hitRoll, die)
                  const label = pending.text.split(':')[0] || 'Бросок'
                  const bonusFlat =
                    pending.hitRoll.total -
                    pending.hitRoll.die -
                    pending.hitRoll.modifier
                  const rebuilt = formatCheckRoll(label, {
                    ...picked,
                    total: picked.die + picked.modifier + bonusFlat,
                  })
                  // Keep damage suffix from original toast if present.
                  const dmgIdx = pending.text.indexOf(' · урон')
                  const suffix = dmgIdx >= 0 ? pending.text.slice(dmgIdx) : ''
                  model.emitToast?.(`${rebuilt}${suffix}`)
                  model.setLuckyPickPending?.(null)
                }}
              >
                {die}
              </button>
            ))}
          </div>
        </Stack>
      </Dialog>

      <AbilityBreakdownDialog
        open={model.abilityBreakdownKey != null}
        ability={model.abilityBreakdownKey ?? 'str'}
        baseScore={
          model.abilityBreakdownKey ? model.draft.abilities[model.abilityBreakdownKey] : 10
        }
        gearScore={
          model.abilityBreakdownKey ? model.gearAbilities[model.abilityBreakdownKey] : 10
        }
        proficientSave={
          model.abilityBreakdownKey ? model.draft.saves[model.abilityBreakdownKey] : false
        }
        proficiencyBonus={model.proficiencyBonus}
        formulaVars={model.formulaVarsBase}
        modifiers={model.draft.modifiers}
        onBaseScoreChange={(score) => {
          const key = model.abilityBreakdownKey
          if (!key) return
          model.setDraft((prev) => ({
            ...prev,
            abilities: { ...prev.abilities, [key]: score },
          }))
        }}
        onSaveProficiencyChange={(proficient) => {
          const key = model.abilityBreakdownKey
          if (!key) return
          model.setDraft((prev) => ({
            ...prev,
            saves: { ...prev.saves, [key]: proficient },
          }))
        }}
        onModifiersChange={(modifiers) =>
          model.setDraft((prev) => ({ ...prev, modifiers }))
        }
        onClose={() => model.setAbilityBreakdownKey(null)}
        saveAdvantageNote={formatSaveAdvantageNote(
          model.gearEffects.saveAdvantages,
          model.raceSaveAdvantageNotes ?? [],
        )}
      />

      <InitiativeBreakdownDialog
        open={model.initiativeBreakdownOpen}
        autoCore={model.initiativeAutoCore}
        autoLabel={model.initiativeAutoLabel || 'ЛОВ'}
        override={model.draft.initiativeOverride}
        onOverrideChange={(initiativeOverride) =>
          model.setDraft((prev) => ({ ...prev, initiativeOverride }))
        }
        formulaVars={model.formulaVarsBase}
        modifiers={model.draft.modifiers}
        onModifiersChange={(modifiers) =>
          model.setDraft((prev) => ({ ...prev, modifiers }))
        }
        onRoll={() => {
          const mode = mergeDeskRollMode(
            model.effectiveRollMode(),
            resolveAdvantageFromEffects(model.draft.play.effects, {
              rollKind: 'initiative',
            }),
          )
          const bonus = listRollDieChips(model.draft.play.effects ?? [], 'initiative').map(
            (chip) => ({ dice: chip.dice, label: chip.name }),
          )
          const te = model.turnEconomyApi as
            | {
                diceOnTable?: boolean
                openEnterOwnNumber?: (o: {
                  title: string
                  mode?: 'total' | 'd20' | 'formula'
                  modifier?: number
                  advantageMode?: 'normal' | 'advantage' | 'disadvantage'
                  bonusDice?: Array<{ dice: string; label: string }> | null
                }) => void
              }
            | undefined
          if (te?.diceOnTable && te.openEnterOwnNumber) {
            te.openEnterOwnNumber({
              title: 'Инициатива',
              mode: 'd20',
              modifier: model.initiativeValue,
              advantageMode: mode,
              bonusDice: bonus.length ? bonus : null,
            })
            model.applyBardInitiativeInspiration()
            return
          }
          model.emitToast(
            formatSkillRoll(
              'Инициатива',
              model.initiativeValue,
              mode,
              undefined,
              undefined,
              null,
              bonus,
            ),
          )
          model.applyBardInitiativeInspiration()
        }}
        onClose={() => model.setInitiativeBreakdownOpen(false)}
      />

      <SpeedBreakdownDialog
        open={Boolean(model.speedBreakdownOpen)}
        channels={[
          {
            target: 'speed',
            label: 'Ходьба',
            baseFt: model.displaySpeedAuto ?? model.draft.speed,
            baseHint: 'раса / класс / снаряжение / эффекты',
          },
          {
            target: 'speed_climb',
            label: 'Лазание',
            baseFt: model.draft.climbSpeed,
            baseHint: 'из расы / листа',
          },
          {
            target: 'speed_swim',
            label: 'Плавание',
            baseFt: model.draft.swimSpeed,
            baseHint: 'из расы / листа',
          },
          {
            target: 'speed_fly',
            label: 'Полёт',
            baseFt: model.displayFlySpeedAuto ?? model.draft.flySpeed,
            baseHint: 'из расы / эффектов',
          },
        ]}
        formulaVars={model.formulaVarsBase}
        modifiers={model.draft.modifiers}
        onModifiersChange={(modifiers) =>
          model.setDraft((prev) => ({ ...prev, modifiers }))
        }
        onClose={() => model.setSpeedBreakdownOpen(false)}
      />

    </>
  )
}
