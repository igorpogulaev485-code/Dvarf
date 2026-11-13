import { expireEffectsUntilSourceNextTurnEnd } from '../../shared/dnd/activeEffects'
import { resetTurnEconomy, type TurnEconomyState } from '../../shared/dnd/turnEconomy'
import type { PlayState } from './play'

/** T-01: тот же сброс, что «Начало моего хода» / «Новый ход» / turn_started. */
export function applyBeginMyTurn(play: PlayState): PlayState {
  const { kept } = expireEffectsUntilSourceNextTurnEnd(play.effects)
  return {
    ...play,
    effects: kept,
    turnEconomy: resetTurnEconomy(play.turnEconomy) as TurnEconomyState,
  }
}
