/**
 * O-01: Tasha (TCE) option visibility on the sheet / at the table.
 *
 * - No campaign rules (sheet outside lobby) → show with «Tasha · опционально» badge.
 * - Lobby with TCE in allowed_sources → show.
 * - Lobby without TCE → hide unselected options; keep already-selected visible;
 *   table buttons stay hidden.
 */

export const TCE_OPTIONAL_BADGE_RU = 'Tasha · опционально'

/** Whether a TCE catalog option may appear in a picker. */
export function tceOptionVisible(input: {
  /** null = no campaign rules (show); true/false = lobby gate. */
  tceAllowed: boolean | null
  alreadySelected?: boolean
}): boolean {
  if (input.alreadySelected) return true
  if (input.tceAllowed === null) return true
  return input.tceAllowed === true
}

/** Table buttons for TCE options: only when the lobby book is on. */
export function tceTableVisible(tceAllowed: boolean | null): boolean {
  return tceAllowed === true
}
