/**
 * TCE Harness Divine Power (Праведное восстановление).
 * Bonus action: spend Channel Divinity AND one daily use (proficiency bonus / long rest)
 * to regain one expended slot of level ≤ half proficiency bonus, rounded up.
 */

import type { SpellSlotState } from './spells'

export function harnessDivinePowerSlotCap(proficiencyBonus: number): number {
  const pb = Math.max(1, Math.floor(proficiencyBonus))
  return Math.max(1, Math.ceil(pb / 2))
}

export function spentSlotLevels(
  slots: Record<string, SpellSlotState | undefined>,
  cap: number,
): number[] {
  const limit = Math.max(1, Math.floor(cap))
  const levels: number[] = []
  for (let level = 1; level <= limit; level += 1) {
    const row = slots[String(level)]
    if (row && row.used > 0 && row.max > 0) levels.push(level)
  }
  return levels
}

export function restoreOneSpentSlot(
  slots: Record<string, SpellSlotState | undefined>,
  level: number,
  cap: number,
): { ok: true; slots: Record<string, SpellSlotState> } | { ok: false; reason: string } {
  const lvl = Math.floor(level)
  if (lvl < 1 || lvl > cap) {
    return { ok: false, reason: `Круг ячейки не выше ${cap} (половина бонуса мастерства, вверх)` }
  }
  const row = slots[String(lvl)]
  if (!row || row.used <= 0) {
    return { ok: false, reason: `Нет потраченной ячейки ${lvl} круга` }
  }
  const next: Record<string, SpellSlotState> = {}
  for (const [key, value] of Object.entries(slots)) {
    if (value) next[key] = { max: value.max, used: value.used }
  }
  next[String(lvl)] = { max: row.max, used: Math.max(0, row.used - 1) }
  return { ok: true, slots: next }
}
