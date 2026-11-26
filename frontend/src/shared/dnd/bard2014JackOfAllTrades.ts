/**
 * Bard 2014 — Jack of All Trades (PHB): from level 2, add ⌊PB/2⌋ to any ability
 * check that does not already include proficiency (skills without training,
 * bare ability checks, and initiative).
 */

export const JACK_OF_ALL_TRADES_2014_FEATURE_ID = 'jack_of_all_trades'
export const JACK_OF_ALL_TRADES_2014_MIN_LEVEL = 2

export function halfProficiencyFloor(proficiencyBonus: number): number {
  return Math.floor(Math.max(0, proficiencyBonus) / 2)
}

export function bardHasJackOfAllTrades2014(bardLevel: number): boolean {
  return Math.max(0, Math.floor(bardLevel) || 0) >= JACK_OF_ALL_TRADES_2014_MIN_LEVEL
}

/** Bonus for an untrained skill / bare check / initiative (2014 RAW). */
export function jackOfAllTradesBonus2014(input: {
  bardLevel: number
  proficiencyBonus: number
  /** True when the roll already includes proficiency (trained skill, tool, etc.). */
  includesProficiency: boolean
}): number {
  if (!bardHasJackOfAllTrades2014(input.bardLevel)) return 0
  if (input.includesProficiency) return 0
  return halfProficiencyFloor(input.proficiencyBonus)
}
