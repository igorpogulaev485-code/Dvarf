import { useCallback, useMemo, useState } from 'react'
import type { SheetModel } from './minimalSheet/sheetModel'
import { applyBeginMyTurnWithCompanions } from './beginMyTurn'
import {
  TurnEconomyProvider,
  type TurnEconomyContextValue,
} from './TurnEconomyContext'
import { useSheetSessionCombat } from './useSheetSessionCombat'
import { emptyTurnEconomy } from '../../shared/dnd/turnEconomy'
import {
  applyActionSurge,
  applyAttackSpend,
  applyCastSpend,
  applyCunningBonus,
  applyFeatureSpend,
  applyHideSpend,
  applySearchSpend,
  applySteadyAim,
  canCastSpell,
  canSpendAttack,
  canSpendCunningBonus,
  canSpendFeature,
  canSpendSearch,
  canSpendSteadyAim,
  castingTimeToEconomyMark,
  resolveHideTiming,
  setMoved,
  type CunningBonusKind,
  type HideSpendTiming,
  type TurnCastTiming,
  type TurnEconomyMarkKey,
} from '../../shared/dnd/turnEconomy'
import {
  markBlessedStrikesUsed as markBlessedStrikesUsedState,
  markFavoredFoeDamageUsed as markFavoredFoeDamageUsedState,
  markKiSpent as markKiSpentState,
} from '../../shared/dnd/o02TashaFeatures'
import type { ActiveEffect } from '../../shared/dnd/activeEffects'
import { postSheetRollToSession } from './postSheetRollToSession'
import {
  rollSessionCombatInitiative,
} from '../../shared/api/lobbies'
import { InitiativeRollDialog } from '../lobby/InitiativeRollDialog'
import { EnterOwnNumberDialog } from './EnterOwnNumberDialog'
import { SKILL_DEFS } from './sheetTypes'
import { Button, Dialog, Stack, Text } from '../../ui'
type Props = {
  model: SheetModel
  children: React.ReactNode
}

/**
 * T-01: полоска «Твой ход», кубики, сброс по turn_started, контекст для атак/каста.
 */
export function TurnEconomyDeskHost({ model, children }: Props) {
  const characterId = String(model.character?.id ?? model.baseCharacter?.id ?? '')
  const openSessionId =
    (model.character?.open_session_id as string | null | undefined) ?? null
  const [initiativeOpen, setInitiativeOpen] = useState(false)
  const [initBusy, setInitBusy] = useState(false)
  const [enterOpen, setEnterOpen] = useState(false)
  const [enterCtx, setEnterCtx] = useState<{
    title: string
    mode: 'total' | 'd20'
    modifier: number
    onDone?: (total: number) => void
  } | null>(null)
  const [tableSaveOpen, setTableSaveOpen] = useState(false)
  const [tableSaveTitle, setTableSaveTitle] = useState('Спасбросок')
  const [skillOffer, setSkillOffer] = useState<'search' | 'stealth' | null>(null)

  const beginMyTurn = useCallback(() => {
    model.setDraft((prev) => {
      const next = applyBeginMyTurnWithCompanions({
        play: prev.play,
        companions: prev.companions,
      })
      return {
        ...prev,
        play: next.play,
        companions: next.companions,
      }
    })
  }, [model])

  const combat = useSheetSessionCombat(openSessionId, characterId, {
    onTurnStarted: (payload) => {
      if (payload.character_id === characterId) beginMyTurn()
    },
    onTurnEconomyReset: () => beginMyTurn(),
  })

  const economy = model.draft.play.turnEconomy ?? emptyTurnEconomy()
  const personalPref = Boolean(model.draft.sheetUi.diceOnTablePref)
  const sessionDice = combat.diceOnTableSession
  const diceLockedByMaster = sessionDice
  const diceOnTable = sessionDice || personalPref

  const toggleMark = useCallback(
    (mark: TurnEconomyMarkKey) => {
      model.setDraft((prev) => {
        const te = prev.play.turnEconomy ?? emptyTurnEconomy()
        const next = { ...te }
        if (mark === 'action') {
          next.action = !te.action
          if (!next.action) next.actionSpentAs = null
        } else if (mark === 'bonus') next.bonus = !te.bonus
        else if (mark === 'reaction') next.reaction = !te.reaction
        else next.objectInteraction = !te.objectInteraction
        return {
          ...prev,
          play: { ...prev.play, turnEconomy: next },
        }
      })
    },
    [model],
  )

  const toggleMoved = useCallback(() => {
    model.setDraft((prev) => {
      const te = prev.play.turnEconomy ?? emptyTurnEconomy()
      return {
        ...prev,
        play: {
          ...prev.play,
          turnEconomy: setMoved(te, !te.moved),
        },
      }
    })
  }, [model])

  const setPersonalDiceOnTable = useCallback(
    (next: boolean) => {
      if (diceLockedByMaster) return
      model.setDraft((prev) => ({
        ...prev,
        sheetUi: { ...prev.sheetUi, diceOnTablePref: next },
      }))
    },
    [model, diceLockedByMaster],
  )

  const patchEconomy = useCallback(
    (fn: (te: typeof economy) => typeof economy) => {
      model.setDraft((prev) => ({
        ...prev,
        play: {
          ...prev.play,
          turnEconomy: fn(prev.play.turnEconomy ?? emptyTurnEconomy()),
        },
      }))
    },
    [model],
  )

  const ctx: TurnEconomyContextValue = useMemo(
    () => ({
      turnEconomy: economy,
      toggleMark,
      toggleMoved,
      beginMyTurn,
      diceOnTable,
      diceLockedByMaster,
      setPersonalDiceOnTable,
      combatActive: combat.combatActive,
      yourTurn: combat.yourTurn,
      combatRound: combat.round,
      combatActiveName: combat.activeEntry?.name ?? null,
      combatTurnsUntil: combat.turnsUntil,
      initiativePending: combat.initiativePending,
      openInitiativeRoll: () => setInitiativeOpen(true),
      openSessionId,
      characterId,
      targets: combat.targets,
      canAttack: () => canSpendAttack(economy),
      spendAttack: () => patchEconomy(applyAttackSpend),
      canCast: (timing, level = 0) => canCastSpell(economy, { timing, level }),
      spendCast: (input) =>
        patchEconomy((te) =>
          applyCastSpend(te, {
            timing: input.timing,
            name: input.name,
            level: input.level,
            id: input.id,
            quickened: input.quickened,
          }),
        ),
      canFeature: (timing) => canSpendFeature(economy, timing),
      spendFeature: (timing) => patchEconomy((te) => applyFeatureSpend(te, timing)),
      markKiSpent: (timing) => patchEconomy((te) => markKiSpentState(te, timing)),
      markBlessedStrikesUsed: () =>
        patchEconomy((te) => markBlessedStrikesUsedState(te)),
      markFavoredFoeDamageUsed: () =>
        patchEconomy((te) => markFavoredFoeDamageUsedState(te)),
      grantActionSurge: () => patchEconomy(applyActionSurge),
      canSearch: () => canSpendSearch(economy),
      spendSearch: () => patchEconomy(applySearchSpend),
      canHide: (hasCunningAction) => resolveHideTiming(economy, hasCunningAction),
      spendHide: (timing: HideSpendTiming) =>
        patchEconomy((te) => applyHideSpend(te, timing)),
      canSteadyAim: () => canSpendSteadyAim(economy),
      spendSteadyAim: () => {
        if (!canSpendSteadyAim(economy).ok) return
        model.setDraft((prev) => {
          const te = prev.play.turnEconomy ?? emptyTurnEconomy()
          const nextTe = applySteadyAim(te)
          const effect: ActiveEffect = {
            id:
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `steady-aim-${Date.now()}`,
            name: 'Точное прицеливание',
            kind: 'feature',
            slug: 'steady_aim',
            origin: 'feature',
            source_character_id: characterId || null,
            source_name: null,
            linked_concentration: false,
            mods: [
              { target: 'advantage', op: 'advantage', condition: 'attack', once: true },
              { target: 'speed', op: 'set', value: 0 },
            ],
            duration: { unit: 'until_source_next_turn_end' },
          }
          const withoutOld = (prev.play.effects ?? []).filter(
            (row) => row.slug !== 'steady_aim',
          )
          return {
            ...prev,
            play: {
              ...prev.play,
              turnEconomy: nextTe,
              effects: [...withoutOld, effect],
            },
          }
        })
      },
      canCunningBonus: () => canSpendCunningBonus(economy),
      spendCunningBonus: (kind: CunningBonusKind) => {
        if (!canSpendCunningBonus(economy).ok) return
        patchEconomy((s) => applyCunningBonus(s, kind))
        const label =
          kind === 'dash' ? 'Рывок' : kind === 'disengage' ? 'Отход' : 'Засада'
        if (characterId) {
          void postSheetRollToSession({
            openSessionId,
            characterId,
            title: `Хитрое действие: ${label}`,
            total: 0,
            formula: null,
            breakdown: 'бонусное действие',
          })
        }
      },
      patchTurnEconomy: (fn) => patchEconomy(fn),
      postRoll: (opts) => {
        if (!characterId) return
        void postSheetRollToSession({
          openSessionId,
          characterId,
          title: opts.title,
          total: opts.total,
          formula: opts.formula,
          breakdown: opts.breakdown,
          physicalDice: opts.physicalDice ?? diceOnTable,
          targetName: opts.targetName,
        })
      },
      openEnterOwnNumber: (opts) => {
        setEnterCtx({
          title: opts.title,
          mode: opts.mode ?? 'total',
          modifier: opts.modifier ?? 0,
          onDone: opts.onDone,
        })
        setEnterOpen(true)
      },
      openTableSave: (title) => {
        setTableSaveTitle(title)
        setTableSaveOpen(true)
      },
    }),
    [
      economy,
      toggleMark,
      toggleMoved,
      beginMyTurn,
      diceOnTable,
      diceLockedByMaster,
      setPersonalDiceOnTable,
      combat.combatActive,
      combat.yourTurn,
      combat.round,
      combat.activeEntry?.name,
      combat.turnsUntil,
      combat.initiativePending,
      combat.targets,
      openSessionId,
      characterId,
      patchEconomy,
      model,
    ],
  )

  // expose for cast dialog hooks that live on model
  model.turnEconomyApi = ctx
  model.castingTimeToEconomyMark = castingTimeToEconomyMark

  const rollOfferedSkill = useCallback(
    (key: 'investigation' | 'perception' | 'stealth') => {
      const def = SKILL_DEFS.find((s) => s.key === key)
      const label = def?.label ?? key
      const mod =
        typeof model.skillModFor === 'function'
          ? Number(model.skillModFor(key) ?? 0)
          : 0
      const rollSkill = model.rollModeSkill as
        | ((s: { key: string; label: string; mod: number }) => void)
        | undefined
      if (diceOnTable) {
        setEnterCtx({
          title: `Проверка: ${label}`,
          mode: 'd20',
          modifier: mod,
        })
        setEnterOpen(true)
        setSkillOffer(null)
        return
      }
      rollSkill?.({ key, label, mod })
      setSkillOffer(null)
    },
    [diceOnTable, model],
  )

  return (
    <TurnEconomyProvider value={ctx}>
      {children}
      <InitiativeRollDialog
        open={initiativeOpen}
        busy={initBusy}
        entry={combat.pendingEntry}
        seat={
          combat.session?.seats?.find((s) => s.character_id === characterId) ??
          null
        }
        onClose={() => setInitiativeOpen(false)}
        onRoll={({ advantage }) => {
          if (!openSessionId || !characterId) return
          setInitBusy(true)
          void rollSessionCombatInitiative(openSessionId, {
            character_id: characterId,
            mode: 'roll',
            advantage: advantage ?? undefined,
          })
            .then(() => {
              setInitiativeOpen(false)
              combat.reload()
            })
            .finally(() => setInitBusy(false))
        }}
        onManual={(value) => {
          if (!openSessionId || !characterId) return
          setInitBusy(true)
          void rollSessionCombatInitiative(openSessionId, {
            character_id: characterId,
            mode: 'manual',
            value,
          })
            .then(() => {
              setInitiativeOpen(false)
              combat.reload()
            })
            .finally(() => setInitBusy(false))
        }}
      />
      <EnterOwnNumberDialog
        open={enterOpen}
        title={enterCtx?.title ?? 'Ввести своё число'}
        mode={enterCtx?.mode ?? 'total'}
        modifier={enterCtx?.modifier ?? 0}
        onClose={() => setEnterOpen(false)}
        onConfirm={({ total }) => {
          enterCtx?.onDone?.(total)
          if (characterId) {
            void postSheetRollToSession({
              openSessionId,
              characterId,
              title: enterCtx?.title ?? 'Бросок',
              total,
              physicalDice: true,
            })
          }
          model.onToast?.(`${enterCtx?.title ?? 'Бросок'}: ${total} 🎲 (кубик на столе)`)
          setEnterOpen(false)
        }}
      />
      <Dialog
        open={skillOffer != null}
        title={skillOffer === 'stealth' ? 'Засада' : 'Поиск'}
        primaryLabel="Позже"
        primaryVariant="secondary"
        secondaryLabel="Отмена"
        closeOnBackdrop
        onPrimary={() => setSkillOffer(null)}
        onSecondary={() => setSkillOffer(null)}
      >
        <Stack gap={10}>
          <Text tone="muted">
            Отметка поставлена. Можно сразу бросить навык — или закрыть и бросить
            из полосы навыков (обычный чип навыка отметку не тратит).
          </Text>
          {skillOffer === 'stealth' ? (
            <Button type="button" onClick={() => rollOfferedSkill('stealth')}>
              Скрытность
            </Button>
          ) : (
            <div className="combat-target-picker__table-actions">
              <Button type="button" onClick={() => rollOfferedSkill('investigation')}>
                Анализ
              </Button>
              <Button type="button" onClick={() => rollOfferedSkill('perception')}>
                Внимательность
              </Button>
            </div>
          )}
        </Stack>
      </Dialog>
      <Dialog
        open={tableSaveOpen}
        title={tableSaveTitle}
        primaryLabel="Закрыть"
        primaryVariant="secondary"
        secondaryLabel="Отмена"
        closeOnBackdrop
        onPrimary={() => setTableSaveOpen(false)}
        onSecondary={() => setTableSaveOpen(false)}
      >
        <Stack gap={10}>
          <Text tone="muted">Кубики на столе: отметьте исход без цифрового броска.</Text>
          <div className="combat-target-picker__table-actions">
            <Button
              type="button"
              onClick={() => {
                if (characterId) {
                  void postSheetRollToSession({
                    openSessionId,
                    characterId,
                    title: `${tableSaveTitle} · спас`,
                    total: 1,
                    physicalDice: true,
                  })
                }
                model.onToast?.(`${tableSaveTitle}: спас 🎲`)
                setTableSaveOpen(false)
              }}
            >
              Спас
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (characterId) {
                  void postSheetRollToSession({
                    openSessionId,
                    characterId,
                    title: `${tableSaveTitle} · провал`,
                    total: 0,
                    physicalDice: true,
                  })
                }
                model.onToast?.(`${tableSaveTitle}: провал 🎲`)
                setTableSaveOpen(false)
              }}
            >
              Провал
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTableSaveOpen(false)
                setEnterCtx({
                  title: tableSaveTitle,
                  mode: 'd20',
                  modifier: 0,
                })
                setEnterOpen(true)
              }}
            >
              Ввести своё число
            </Button>
          </div>
        </Stack>
      </Dialog>
    </TurnEconomyProvider>
  )
}

export type { TurnCastTiming }
