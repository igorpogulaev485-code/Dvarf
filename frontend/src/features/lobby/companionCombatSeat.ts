/** C-02 helpers for session table / combat track (seat-facing companions). */

import type { SeatCompanion } from '../../shared/api/lobbies'
import { companionGetsOwnInitiativeRow } from '../characters/companionCombat'

/** Active companion that rolls its own initiative (not under host). */
export function seatCompanionNeedsInitiativeRow(
  companion: SeatCompanion,
): boolean {
  if (companion.role === 'self_form' || companion.kind === 'transformed_self') {
    return false
  }
  if (companion.active === false) return false
  return companionGetsOwnInitiativeRow({
    active: companion.active ?? true,
    initiativeMode:
      companion.initiative_mode === 'with_master' ||
      companion.initiative_mode === 'own_initiative'
        ? companion.initiative_mode
        : companion.initiative_mode == null
          ? // Legacy seats without mode: keep old behaviour (own row) only if unknown.
            null
          : null,
    role: companion.role,
    kind: companion.kind,
  })
}

/**
 * With-master companions share the host turn — no separate StartCombat row.
 * If initiative_mode is missing (very old seat payload), include the row so we
 * do not silently drop combatants; C-02 parse should always send the mode.
 */
export function seatCompanionInInitiativeSeed(
  companion: SeatCompanion,
): boolean {
  if (companion.role === 'self_form' || companion.kind === 'transformed_self') {
    return false
  }
  if (companion.active === false) return false
  if (companion.initiative_mode === 'with_master') return false
  if (companion.initiative_mode === 'own_initiative') return true
  // Unknown: include (safe default for pre-C-02 rows still on wire).
  return true
}
