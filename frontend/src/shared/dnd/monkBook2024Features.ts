/**
 * P24-M02B-monk: AU Warrior of the Mystic Arts helpers.
 * Callers must branch on rules_edition === '2024'; does not feed the 2014 pack.
 */

export const M02B_MONK_BOOK_SLUGS = ['monk__warrior-of-the-mystic-arts'] as const

export type M02bMonkBookSlug = (typeof M02B_MONK_BOOK_SLUGS)[number]

export function isM02bMonkBookSubclass(slug: string | null | undefined): boolean {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  return (M02B_MONK_BOOK_SLUGS as readonly string[]).includes(key)
}

export function isMysticArtsMonk2024(slug: string | null | undefined): boolean {
  return (
    String(slug || '')
      .trim()
      .toLowerCase() === 'monk__warrior-of-the-mystic-arts'
  )
}

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL for this pack)                                    */
/* ------------------------------------------------------------------ */

export const MYSTIC_ARTS_NAME_RU = 'Мистический воин'
export const MYSTIC_SPELLCASTING_NAME_RU = 'Сотворение заклинаний'
export const MYSTIC_FIGHTING_STYLE_NAME_RU = 'Стиль мистического воина'
export const MYSTIC_FOCUS_NAME_RU = 'Мистическая сосредоточенность'
export const FOCUSED_STRIKE_NAME_RU = 'Сфокусированный удар'
export const IMPROVED_MYSTIC_FIGHTING_STYLE_NAME_RU = 'Улучшенный стиль мистического воина'

export const MYSTIC_FOCUS_FEATURE_ID = 'mystic-focus'
export const MYSTIC_FIGHTING_STYLE_FEATURE_ID = 'mystic-fighting-style'
export const FOCUSED_STRIKE_FEATURE_ID = 'focused-strike'
export const IMPROVED_MYSTIC_FIGHTING_STYLE_FEATURE_ID = 'improved-mystic-fighting-style'

/** Feature-pick key: target suffers disadvantage on saves vs your spells until your next turn. */
export const FOCUSED_STRIKE_SAVE_DISADV_PICK_KEY = 'focused_strike_spell_save_disadv'

/**
 * Table «Восстановление ячеек заклинаний» (slot level → focus cost + monk level gate).
 * Slot 5+ cannot be restored.
 */
export const MYSTIC_FOCUS_SLOT_RESTORE: ReadonlyArray<{
  slotLevel: number
  focusCost: number
  minMonkLevel: number
}> = [
  { slotLevel: 1, focusCost: 2, minMonkLevel: 6 },
  { slotLevel: 2, focusCost: 3, minMonkLevel: 7 },
  { slotLevel: 3, focusCost: 5, minMonkLevel: 13 },
  { slotLevel: 4, focusCost: 6, minMonkLevel: 19 },
]

export function mysticFocusSlotRestoreCost2024(
  slotLevel: number,
  monkLevel: number,
): number | null {
  const row = MYSTIC_FOCUS_SLOT_RESTORE.find((r) => r.slotLevel === slotLevel)
  if (!row) return null
  if (Math.max(0, Math.floor(monkLevel || 0)) < row.minMonkLevel) return null
  return row.focusCost
}

/** Slot → focus: restore focus equal to spent slot level (no action). */
export function mysticFocusPointsFromSlot2024(slotLevel: number): number {
  const lv = Math.max(1, Math.min(9, Math.floor(slotLevel || 0)))
  return lv
}

export function mysticFocusCanRestoreSlot2024(slotLevel: number, monkLevel: number): boolean {
  return mysticFocusSlotRestoreCost2024(slotLevel, monkLevel) != null
}
