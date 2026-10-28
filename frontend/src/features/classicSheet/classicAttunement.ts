import type { CharacterDetail } from '../../shared/api/characters'
import {
  MAX_ATTUNEMENTS,
  createAttunementSlot,
  filledAttunementCount,
  readAttunements,
  attunementsToSheet,
} from '../characters/attunement'
import { asRecord } from '../characters/sheetTypes'
import { cloneSheet, type ClassicPatch } from './fromApi'

/** How many attunement bubbles are filled on the classic blank. */
export function classicAttunementFilled(character: CharacterDetail): number {
  const sheet = asRecord(character.sheet)
  const slots = readAttunements(sheet)
  const fromSlots = filledAttunementCount(slots)
  if (slots.length > 0 || fromSlots > 0) return fromSlots
  // Legacy classic-only counter before sheet.attunements existed.
  const used = Number(asRecord(sheet.combat).attunement_used ?? 0)
  if (!Number.isFinite(used) || used <= 0) return 0
  return Math.max(0, Math.min(MAX_ATTUNEMENTS, Math.floor(used)))
}

/**
 * Set filled attunement count to `count` (0…MAX).
 * Keeps existing slot names/ids when reducing; pads blank slots when increasing.
 * Syncs legacy combat.attunement_used so old readers stay aligned.
 */
export function patchClassicAttunementCount(
  character: CharacterDetail,
  count: number,
): ClassicPatch {
  const nextCount = Math.max(0, Math.min(MAX_ATTUNEMENTS, Math.floor(count)))
  const sheet = cloneSheet(asRecord(character.sheet))
  const current = readAttunements(sheet)
  const next = current.slice(0, nextCount)
  while (next.length < nextCount) {
    next.push(createAttunementSlot({ name: '' }))
  }
  Object.assign(sheet, attunementsToSheet(next))
  const combat = asRecord(sheet.combat)
  combat.attunement_used = nextCount
  sheet.combat = combat
  return { sheet }
}
