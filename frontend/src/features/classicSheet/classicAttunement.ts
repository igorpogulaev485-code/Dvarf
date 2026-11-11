import type { CharacterDetail } from '../../shared/api/characters'
import {
  createAttunementSlot,
  filledAttunementCount,
  maxAttunementsForClasses,
  readAttunements,
  attunementsToSheet,
} from '../characters/attunement'
import { readClassLevels } from '../characters/classLevels'
import { asRecord } from '../characters/sheetTypes'
import { cloneSheet, type ClassicPatch } from './fromApi'

/** Slots this character can attune (3, or 4/5/6 for an artificer). */
export function classicAttunementLimit(character: CharacterDetail): number {
  const sheet = asRecord(character.sheet)
  const classes = readClassLevels(sheet, {
    className: character.class_name ?? '',
    level: character.level,
    subclassName: String(asRecord(sheet.identity).subclass_name ?? ''),
    classCatalogId: null,
  })
  return maxAttunementsForClasses(classes)
}

/** How many attunement bubbles are filled on the classic blank. */
export function classicAttunementFilled(character: CharacterDetail): number {
  const sheet = asRecord(character.sheet)
  const slots = readAttunements(sheet)
  const fromSlots = filledAttunementCount(slots)
  if (slots.length > 0 || fromSlots > 0) return fromSlots
  // Legacy classic-only counter before sheet.attunements existed.
  const used = Number(asRecord(sheet.combat).attunement_used ?? 0)
  if (!Number.isFinite(used) || used <= 0) return 0
  return Math.max(0, Math.floor(used))
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
  const nextCount = Math.max(0, Math.min(classicAttunementLimit(character), Math.floor(count)))
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
