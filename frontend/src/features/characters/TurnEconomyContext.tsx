import { createContext, useContext } from 'react'
import type { CombatTarget } from '../lobby/combatTargets'
import type {
  CunningBonusKind,
  HideSpendTiming,
  TurnCastTiming,
  TurnEconomyMarkKey,
  TurnEconomyState,
  TurnSpendResult,
} from '../../shared/dnd/turnEconomy'

export type TurnEconomyContextValue = {
  turnEconomy: TurnEconomyState
  toggleMark: (mark: TurnEconomyMarkKey) => void
  toggleMoved: () => void
  beginMyTurn: () => void
  /** Эффективный режим кубиков (сессия ИЛИ личный). */
  diceOnTable: boolean
  diceLockedByMaster: boolean
  setPersonalDiceOnTable: (next: boolean) => void
  combatActive: boolean
  yourTurn: boolean
  /** SCN-01: combat status banner fields (null/0 when idle). */
  combatRound: number
  combatActiveName: string | null
  combatTurnsUntil: number | null
  initiativePending: boolean
  openInitiativeRoll: () => void
  openSessionId: string | null
  characterId: string
  targets: CombatTarget[]
  canAttack: () => TurnSpendResult
  spendAttack: () => void
  canCast: (timing: TurnCastTiming | null, level?: number) => TurnSpendResult
  spendCast: (input: {
    timing: TurnCastTiming | null
    name: string
    level: number
    id?: string
    quickened?: boolean
  }) => void
  canFeature: (timing: TurnCastTiming) => TurnSpendResult
  spendFeature: (timing: TurnCastTiming) => void
  /** O-02: отметить трату ци действием/бонусным (для «Атака на ци»). */
  markKiSpent: (timing: TurnCastTiming) => void
  /** O-02: «Благословенные удары» сработали в этот ход. */
  markBlessedStrikesUsed: () => void
  /** O-02: доп. урон «Избранного противника» в этот ход. */
  markFavoredFoeDamageUsed: () => void
  /** Э7: Всплеск действий → +1 доп. действие (отметку не тратит). */
  grantActionSurge: () => void
  canSearch: () => TurnSpendResult
  spendSearch: () => void
  canHide: (hasCunningAction: boolean) => TurnSpendResult & { timing?: HideSpendTiming }
  spendHide: (timing: HideSpendTiming) => void
  canSteadyAim: () => TurnSpendResult
  spendSteadyAim: () => void
  canCunningBonus: () => TurnSpendResult
  spendCunningBonus: (kind: CunningBonusKind) => void
  /** O-05: произвольный патч отметок хода (крит GWM, рывок, хиты…). */
  patchTurnEconomy: (fn: (te: TurnEconomyState) => TurnEconomyState) => void
  postRoll: (opts: {
    title: string
    total: number
    formula?: string | null
    breakdown?: string | null
    physicalDice?: boolean
    targetName?: string | null
  }) => void
  /** Открыть «Ввести своё число» для любого броска. */
  openEnterOwnNumber: (opts: {
    title: string
    mode?: 'total' | 'd20'
    modifier?: number
    onDone?: (total: number) => void
  }) => void
  /** Кубики на столе: Спас / Провал. */
  openTableSave: (title: string) => void
}

const TurnEconomyContext = createContext<TurnEconomyContextValue | null>(null)

export function TurnEconomyProvider({
  value,
  children,
}: {
  value: TurnEconomyContextValue
  children: React.ReactNode
}) {
  return (
    <TurnEconomyContext.Provider value={value}>{children}</TurnEconomyContext.Provider>
  )
}

export function useTurnEconomy(): TurnEconomyContextValue | null {
  return useContext(TurnEconomyContext)
}
