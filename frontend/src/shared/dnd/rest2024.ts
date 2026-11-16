/**
 * SRD 5.2.1 Long / Short Rest helpers for rules_edition=2024.
 * Does not change 2014 applyLongRest defaults.
 */

import {
  decrementWishLockOnLongRest2024,
  DIVINE_INTERVENTION_WISH_LOCK_PICK_ID_2024,
} from './cleric2024Features'
import type { FeaturePicksState } from './featurePicks'

export const LONG_REST_MIN_HOURS_2024 = 8
export const LONG_REST_SLEEP_HOURS_2024 = 6
export const LONG_REST_LIGHT_ACTIVITY_MAX_HOURS_2024 = 2
/** Hours that must pass before another Long Rest can start. */
export const LONG_REST_COOLDOWN_HOURS_2024 = 16

export type LongRestInterruptReason2024 =
  | 'initiative'
  | 'leveled_spell'
  | 'damage'
  | 'physical_exertion_1h'

export const LONG_REST_INTERRUPT_REASONS_2024: Array<{
  id: LongRestInterruptReason2024
  labelRu: string
}> = [
  { id: 'initiative', labelRu: 'бросок инициативы' },
  { id: 'leveled_spell', labelRu: 'заклинание не-заговор' },
  { id: 'damage', labelRu: 'любой урон' },
  { id: 'physical_exertion_1h', labelRu: 'час ходьбы или нагрузки' },
]

/**
 * Book rule: must have at least 1 Hit Point to start a Long Rest.
 * Dead / 0 HP cannot begin one.
 */
export function canStartLongRest2024(hpCurrent: number | null | undefined): boolean {
  if (hpCurrent == null || !Number.isFinite(hpCurrent)) return false
  return Math.floor(hpCurrent) >= 1
}

/**
 * Cooldown after finishing a Long Rest (hours). Caller stores last-finished timestamp.
 */
export function longRestCooldownRemainingHours2024(input: {
  hoursSinceLastLongRestFinished: number | null | undefined
}): number {
  const since = input.hoursSinceLastLongRestFinished
  if (since == null || !Number.isFinite(since)) return 0
  const left = LONG_REST_COOLDOWN_HOURS_2024 - Math.max(0, since)
  return left > 0 ? left : 0
}

export function canStartLongRestAfterCooldown2024(input: {
  hpCurrent: number | null | undefined
  hoursSinceLastLongRestFinished: number | null | undefined
}): { ok: boolean; reason?: string } {
  if (!canStartLongRest2024(input.hpCurrent)) {
    return { ok: false, reason: 'нужен хотя бы 1 хит, чтобы начать длинный отдых' }
  }
  const left = longRestCooldownRemainingHours2024(input)
  if (left > 0) {
    return {
      ok: false,
      reason: `следующий длинный отдых не раньше чем через ${left} ч (всего ${LONG_REST_COOLDOWN_HOURS_2024} ч)`,
    }
  }
  return { ok: true }
}

/**
 * After an interruption: if rested ≥ 1 hour, gain Short Rest benefits;
 * resume adds +1 hour per interruption.
 */
export function longRestExtraHoursAfterInterruptions2024(
  interruptionCount: number,
): number {
  return Math.max(0, Math.floor(interruptionCount))
}

export function shortRestMinHours2024(grittyRest: boolean, epicHeroism: boolean): number {
  if (epicHeroism && !grittyRest) return 5 / 60
  if (grittyRest) return 8
  return 1
}

export function longRestMinHours2024(grittyRest: boolean, epicHeroism: boolean): number {
  if (epicHeroism && !grittyRest) return 1
  if (grittyRest) return 7 * 24
  return LONG_REST_MIN_HOURS_2024
}

/**
 * Long Rest feature-pick upkeep (2024): ticks down the Cleric Divine Intervention
 * Wish lock for every class entry that has one.
 */
export function applyLongRestFeaturePicks2024(picks: FeaturePicksState): FeaturePicksState {
  const suffix = `:${DIVINE_INTERVENTION_WISH_LOCK_PICK_ID_2024}`
  let next = picks
  for (const key of Object.keys(picks.values)) {
    if (!key.endsWith(suffix)) continue
    next = decrementWishLockOnLongRest2024(next, key.slice(0, -suffix.length))
  }
  return next
}
