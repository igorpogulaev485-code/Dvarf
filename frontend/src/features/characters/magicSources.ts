/**
 * Whether the character has any magic capability worth showing the spells panel.
 * Capability-based — not class-name-based (EK / AT / race / feat / gear count).
 */

import { characterHasCasterClass } from '../../shared/dnd/casterProgression'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import type { PactSlotState, SpellSlotState } from '../../shared/dnd/spells'
import {
  isFeatSheetSpell,
  isRaceSheetSpell,
  isSubclassSheetSpell,
  type SheetSpell,
} from './spells'

function hasPositiveSlots(slots: Record<string, SpellSlotState> | undefined): boolean {
  if (!slots) return false
  return Object.values(slots).some((slot) => slot && slot.max > 0)
}

function isGrantedOrKnownMagicSpell(spell: SheetSpell): boolean {
  if (isRaceSheetSpell(spell) || isFeatSheetSpell(spell) || isSubclassSheetSpell(spell)) {
    return true
  }
  if (spell.source_kind === 'feature') return true
  if (spell.id.startsWith('gear-spell:') || spell.id.startsWith('feature-spell:')) {
    return true
  }
  // Manually learned / catalog spells on the sheet also mean magic is in play.
  if (spell.catalog_id || spell.name.trim()) return true
  return false
}

/**
 * True when the play desk should treat the character as having magic access:
 * caster class (incl. Eldritch Knight / Arcane Trickster), racial / feat /
 * subclass / gear grants, known spells, or any spell / pact slots.
 */
export function characterHasMagicSources(input: {
  classes: ClassLevelEntry[]
  known: SheetSpell[]
  slots?: Record<string, SpellSlotState>
  pactSlots?: PactSlotState | null
}): boolean {
  if (characterHasCasterClass(input.classes)) return true
  if (input.pactSlots && input.pactSlots.max > 0) return true
  if (hasPositiveSlots(input.slots)) return true
  if (input.known.some(isGrantedOrKnownMagicSpell)) return true
  return false
}
