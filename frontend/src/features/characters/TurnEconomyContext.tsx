import { createContext, useContext } from 'react'
import type { CombatTarget } from '../lobby/combatTargets'
import type {
  TurnCastTiming,
  TurnEconomyMarkKey,
  TurnEconomyState,
  TurnSpendResult,
} from '../../shared/dnd/turnEconomy'

export type TurnEconomyContextValue = {
  turnEconomy: TurnEconomyState
  toggleMark: (mark: TurnEconomyMarkKey) => void
  beginMyTurn: () => void
  /** Эффективный режим кубиков (сессия ИЛИ личный). */
  diceOnTable: boolean
  diceLockedByMaster: boolean
  setPersonalDiceOnTable: (next: boolean) => void
  combatActive: boolean
  yourTurn: boolean
  openSessionId: string | null
  characterId: string
  targets: CombatTarget[]
  canAttack: () => TurnSpendResult
  spendAttack: () => void
  canCast: (timing: TurnCastTiming | null) => TurnSpendResult
  spendCast: (input: {
    timing: TurnCastTiming | null
    name: string
    level: number
    id?: string
  }) => void
  canFeature: (timing: TurnCastTiming) => TurnSpendResult
  spendFeature: (timing: TurnCastTiming) => void
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
