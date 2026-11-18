import { expireEffectsUntilSourceNextTurnEnd } from '../../shared/dnd/activeEffects'
import { parseFeatureResourceId } from '../../shared/dnd/featureResources'
import { clampResource, type SheetResource } from '../../shared/dnd/rest'
import {
  SHADOW_WALK_POOL_ID,
  SPELLFIRE_BURST_POOL_ID,
} from '../../shared/dnd/sorcererBook2024Features'
import { resetTurnEconomy, type TurnEconomyState } from '../../shared/dnd/turnEconomy'
import type { CompanionEntry } from './companions'
import { resetCompanionsForHostTurn } from './companionCombat'
import type { PlayState } from './play'

/** Refresh once-per-turn / last-hop desk markers on begin-my-turn. */
export function resetSorcererBookTurnResources(
  resources: SheetResource[],
): SheetResource[] {
  return resources.map((row) => {
    const poolId = parseFeatureResourceId(row.id)?.poolId
    if (poolId === SPELLFIRE_BURST_POOL_ID) {
      return clampResource({ ...row, used: 0, activeLabel: undefined })
    }
    if (poolId === SHADOW_WALK_POOL_ID && row.activeLabel) {
      return clampResource({ ...row, activeLabel: undefined })
    }
    return row
  })
}

/** T-01: тот же сброс, что «Начало моего хода» / «Новый ход» / turn_started. */
export function applyBeginMyTurn(play: PlayState): PlayState {
  const { kept } = expireEffectsUntilSourceNextTurnEnd(play.effects)
  return {
    ...play,
    effects: kept,
    resources: resetSorcererBookTurnResources(play.resources),
    turnEconomy: resetTurnEconomy(play.turnEconomy) as TurnEconomyState,
  }
}

/** C-02: host turn start also resets with_master companion marks / Dodge. */
export function applyBeginMyTurnWithCompanions(input: {
  play: PlayState
  companions: CompanionEntry[]
}): { play: PlayState; companions: CompanionEntry[] } {
  return {
    play: applyBeginMyTurn(input.play),
    companions: resetCompanionsForHostTurn(input.companions),
  }
}
