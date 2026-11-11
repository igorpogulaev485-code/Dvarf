/** Диалоги бросков, свитков и разбора чисел. */
import type { SheetModel } from './sheetModel'
import { applyConcentrationChangeToCompanions } from '../spellCompanions'
import { AbilityBreakdownDialog } from '../AbilityBreakdownDialog'
import { AcBreakdownDialog } from '../AcBreakdownDialog'
import { InitiativeBreakdownDialog } from '../InitiativeBreakdownDialog'
import { Button, Dialog, Stack, Text } from '../../../ui'
import { ConsumableSpendPadDialog } from '../ConsumableSpendPadDialog'
import { syncAttacksHeldFromInventory } from '../AttacksPanel'
import { canWearArmor, armorProficiencyHint } from '../equipmentProficiency'
import { listShieldItems, toggleShieldInHand } from '../heldEquip'
import { HotConditionsDialog } from '../HotConditionsDialog'
import { formatSkillRoll } from '../deskRolls'
import { applyStrokeOfLuck, strokeOfLuckKind } from '../../../shared/dnd/strokeOfLuck'
import { spendFeatureUse } from '../../../shared/dnd/featureResources'
import { resolveClassFeatureSlug, type UnlockedFeature } from '../../../shared/dnd/classFeatures'
import { setConcentration } from '../../../shared/dnd/concentration'
import { equippedArmorPieces } from '../inventory'
import { CastSpellDialog } from '../CastSpellDialog'
import { listActiveInfusionBindings } from '../../../shared/dnd/infusionsActive'
import { CastScrollDialog } from '../CastScrollDialog'
import { consumeScrollItem, isCastableSpellScroll, spellScrollCastStats } from '../spellScroll'
import { abilityModifier } from '../sheetTypes'
import { getFeaturePick } from '../../../shared/dnd/featurePicks'
import { elementalAffinityPreview } from '../../../shared/dnd/pack04SorcererWarlock'

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
  return (
    <>
      <Dialog
        open={model.rollHistoryOpen}
        title="История бросков"
        primaryLabel="Закрыть"
        secondaryLabel="Отмена"
        onPrimary={() => model.setRollHistoryOpen(false)}
        onSecondary={() => model.setRollHistoryOpen(false)}
        closeOnBackdrop
        size="wide"
      >
        {model.draft.sheetUi.rollHistory.length === 0 ? (
          <Text tone="muted">Пока пусто — бросай атаки, навыки или инициативу.</Text>
        ) : (
          <Stack gap={10}>
            <div className="desk-roll-history__toolbar">
              <Text tone="muted">
                {model.draft.sheetUi.rollHistory.length} запис.
                {model.draft.sheetUi.rollHistory.length >= 50 ? ' (лимит 50)' : ''}
              </Text>
              <Button
                variant="ghost"
                onClick={() => model.patchSheetUi({ rollHistory: [] })}
              >
                Очистить
              </Button>
            </div>
            <ul className="desk-roll-history">
              {model.draft.sheetUi.rollHistory.map((row) => {
                const when = (() => {
                  try {
                    return new Date(row.at).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  } catch {
                    return ''
                  }
                })()
                return (
                  <li key={row.id} className="desk-roll-history__row">
                    {when ? (
                      <time className="desk-roll-history__time" dateTime={row.at}>
                        {when}
                      </time>
                    ) : null}
                    <span className="desk-roll-history__text">{row.text}</span>
                    {strokeOfLuckKind(row.text) ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const feature = ((model.unlockedFeatures ?? []) as UnlockedFeature[]).find(
                            (item) => item.id === 'stroke_of_luck',
                          )
                          if (!feature) {
                            model.onToast?.('Удача доступна плуту 20-го уровня')
                            return
                          }
                          const nextText = applyStrokeOfLuck(row.text)
                          if (!nextText) {
                            model.onToast?.('Этот бросок уже нельзя заменить Удачей')
                            return
                          }
                          const classSlug =
                            resolveClassFeatureSlug(feature.className ?? 'плут') ?? 'rogue'
                          const spent = spendFeatureUse({
                            resources: model.draft.play.resources,
                            feature,
                            classSlug,
                          })
                          if (!spent.ok) {
                            model.onToast?.(spent.message)
                            return
                          }
                          model.setDraft((prev) => ({
                            ...prev,
                            play: { ...prev.play, resources: spent.resources },
                            sheetUi: {
                              ...prev.sheetUi,
                              rollHistory: prev.sheetUi.rollHistory.map((item) =>
                                item.id === row.id ? { ...item, text: nextText } : item,
                              ),
                            },
                          }))
                          model.onToast?.(
                            strokeOfLuckKind(row.text) === 'attack'
                              ? 'Удача: промах становится попаданием'
                              : 'Удача: d20 проверки считается как 20',
                          )
                        }}
                      >
                        Удача
                      </Button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </Stack>
        )}
      </Dialog>

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
          Урон {model.concDamageAsk?.damage ?? 0} HP. Спас концентрации Сл{' '}
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
        elementalAffinity={elementalAffinity}
        abilities={model.effectiveAbilities}
        proficiencyBonus={model.proficiencyBonus}
        castProfiles={model.spellcastingSync.castProfiles}
        modifiers={model.draft.modifiers}
        formulaVars={model.formulaVarsBase}
        onSelectSpellVariant={model.setDeskCastSpell}
        onConfirm={model.confirmDeskCast}
        onClose={() => model.setDeskCastSpell(null)}
        onRequestRest={() => {
          model.setDeskCastSpell(null)
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

      <CastScrollDialog
        open={model.deskCastScrollId != null}
        item={
          model.deskCastScrollId
            ? model.draft.inventory.items.find((row) => row.id === model.deskCastScrollId) ?? null
            : null
        }
        onConfirm={() => {
          const itemId = model.deskCastScrollId
          if (!itemId) return
          const item = model.draft.inventory.items.find((row) => row.id === itemId)
          if (!item || !isCastableSpellScroll(item) || !item.scroll_spell) {
            model.setDeskCastScrollId(null)
            return
          }
          const binding = item.scroll_spell
          const stats = spellScrollCastStats(binding.level)
          const scrollSpellId = `scroll:${item.id}:${binding.catalog_id ?? binding.name}`
          if (
            binding.concentration &&
            model.draft.play.concentration &&
            model.draft.play.concentration.spell_id !== scrollSpellId &&
            model.draft.play.concentration.name.trim() !== binding.name.trim()
          ) {
            model.setDeskCastScrollPending({
              itemId,
              name: binding.name,
              concentration: true,
            })
            model.setDeskCastScrollId(null)
            return
          }
          model.setDraft((prev) => {
            let next = {
              ...prev,
              inventory: {
                ...prev.inventory,
                items: consumeScrollItem(prev.inventory.items, itemId),
              },
            }
            if (binding.concentration) {
              const nextConc = setConcentration({
                spellId: scrollSpellId,
                name: binding.name,
              })
              const result = applyConcentrationChangeToCompanions({
                companions: next.companions,
                previous: next.play.concentration,
                next: nextConc,
              })
              next = {
                ...next,
                companions: result.companions,
                play: {
                  ...next.play,
                  concentration: nextConc,
                },
              }
            }
            return next
          })
          model.setDeskCastScrollId(null)
          model.onToast(
            `Свиток: ${binding.name} · Сл ${stats.saveDc} · +${stats.attackBonus}${
              binding.concentration ? ' · концентрация' : ''
            } · свиток израсходован`,
          )
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
          {model.deskCastPending?.spell.name || 'Заклинание'}»? Ячейка потратится после подтверждения.
        </Text>
      </Dialog>

      <HotConditionsDialog
        open={model.hotConditionsOpen}
        edition={model.rulesEdition}
        play={model.draft.play}
        onPlayChange={(play) => model.setDraft((prev) => ({ ...prev, play }))}
        onToast={model.onToast}
        onClose={() => model.setHotConditionsOpen(false)}
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
        onClose={() => model.setAcBreakdownOpen(false)}
      />

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
          model.emitToast(
            formatSkillRoll('Инициатива', model.initiativeValue, model.effectiveRollMode()),
          )
        }}
        onClose={() => model.setInitiativeBreakdownOpen(false)}
      />

    </>
  )
}
