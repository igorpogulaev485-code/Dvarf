import { useCallback, useMemo, useState } from 'react'
import type { SheetModel } from './minimalSheet/sheetModel'
import { applyBeginMyTurn } from './beginMyTurn'
import { TurnEconomyStrip } from './TurnEconomyStrip'
import {
  TurnEconomyProvider,
  type TurnEconomyContextValue,
} from './TurnEconomyContext'
import { useSheetSessionCombat } from './useSheetSessionCombat'
import { emptyTurnEconomy } from '../../shared/dnd/turnEconomy'
import {
  applyAttackSpend,
  applyCastSpend,
  applyFeatureSpend,
  canSpendAttack,
  canSpendCast,
  canSpendFeature,
  castingTimeToEconomyMark,
  type TurnCastTiming,
  type TurnEconomyMarkKey,
} from '../../shared/dnd/turnEconomy'
import { postSheetRollToSession } from './postSheetRollToSession'
import {
  rollSessionCombatInitiative,
} from '../../shared/api/lobbies'
import { InitiativeRollDialog } from '../lobby/InitiativeRollDialog'
import { EnterOwnNumberDialog } from './EnterOwnNumberDialog'
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

  const beginMyTurn = useCallback(() => {
    model.setDraft((prev) => ({
      ...prev,
      play: applyBeginMyTurn(prev.play),
    }))
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
      beginMyTurn,
      diceOnTable,
      diceLockedByMaster,
      setPersonalDiceOnTable,
      combatActive: combat.combatActive,
      yourTurn: combat.yourTurn,
      openSessionId,
      characterId,
      targets: combat.targets,
      canAttack: () => canSpendAttack(economy),
      spendAttack: () => patchEconomy(applyAttackSpend),
      canCast: (timing) => canSpendCast(economy, timing),
      spendCast: (input) =>
        patchEconomy((te) =>
          applyCastSpend(te, {
            timing: input.timing,
            name: input.name,
            level: input.level,
            id: input.id,
          }),
        ),
      canFeature: (timing) => canSpendFeature(economy, timing),
      spendFeature: (timing) => patchEconomy((te) => applyFeatureSpend(te, timing)),
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
      beginMyTurn,
      diceOnTable,
      diceLockedByMaster,
      setPersonalDiceOnTable,
      combat.combatActive,
      combat.yourTurn,
      combat.targets,
      openSessionId,
      characterId,
      patchEconomy,
    ],
  )

  // expose for cast dialog hooks that live on model
  model.turnEconomyApi = ctx
  model.castingTimeToEconomyMark = castingTimeToEconomyMark

  const activeName = combat.activeEntry?.name ?? null
  const showNewTurn = !combat.combatActive

  return (
    <TurnEconomyProvider value={ctx}>
      <TurnEconomyStrip
        combatActive={combat.combatActive}
        yourTurn={combat.yourTurn}
        round={combat.round}
        activeName={activeName}
        turnsUntil={combat.turnsUntil}
        initiativePending={combat.initiativePending}
        turnEconomy={economy}
        onToggleMark={toggleMark}
        onBeginTurn={beginMyTurn}
        onRollInitiative={() => setInitiativeOpen(true)}
        showNewTurnButton={showNewTurn}
        diceOnTable={diceOnTable}
        diceLockedByMaster={diceLockedByMaster}
        onDiceOnTableChange={setPersonalDiceOnTable}
      />
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
