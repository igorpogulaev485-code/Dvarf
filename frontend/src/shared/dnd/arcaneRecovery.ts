import { clampSlot, type SpellSlotState } from './spells'

/** PHB: recover slot levels summing to ≤ ceil(wizardLevel / 2), no 6+. */
export function arcaneRecoveryBudget(wizardLevel: number): number {
  const level = Math.max(1, Math.min(20, Math.floor(wizardLevel)))
  return Math.ceil(level / 2)
}

export const ARCANE_RECOVERY_MAX_SLOT_LEVEL = 5

/** How many spent slots of this level can still be recovered. */
export function spentSlotsAtLevel(
  slots: Record<string, SpellSlotState>,
  level: number,
): number {
  const slot = clampSlot(slots[String(level)] ?? { max: 0, used: 0 })
  return Math.max(0, slot.used)
}

export function recoverySelectionCost(
  recoverByLevel: Record<number, number>,
): number {
  let total = 0
  for (const [levelRaw, countRaw] of Object.entries(recoverByLevel)) {
    const level = Number(levelRaw)
    const count = Math.max(0, Math.floor(countRaw))
    if (!Number.isFinite(level) || level < 1) continue
    total += level * count
  }
  return total
}

/**
 * Validate and apply Arcane Recovery: reduce `used` on chosen slot levels,
 * within budget and without touching 6+.
 */
export function applyArcaneRecovery(input: {
  slots: Record<string, SpellSlotState>
  wizardLevel: number
  recoverByLevel: Record<number, number>
}):
  | { ok: true; slots: Record<string, SpellSlotState>; cost: number }
  | { ok: false; reason: string } {
  const budget = arcaneRecoveryBudget(input.wizardLevel)
  const next: Record<string, SpellSlotState> = { ...input.slots }
  let cost = 0

  for (let level = 1; level <= ARCANE_RECOVERY_MAX_SLOT_LEVEL; level += 1) {
    const want = Math.max(0, Math.floor(input.recoverByLevel[level] ?? 0))
    if (want <= 0) continue
    const spent = spentSlotsAtLevel(input.slots, level)
    if (want > spent) {
      return {
        ok: false,
        reason: `Ячеек ${level} ур. потрачено только ${spent}`,
      }
    }
    cost += level * want
    const key = String(level)
    const current = clampSlot(next[key] ?? { max: 0, used: 0 })
    next[key] = clampSlot({ ...current, used: current.used - want })
  }

  // Reject any attempt to touch 6+ via stray keys
  for (const [levelRaw, countRaw] of Object.entries(input.recoverByLevel)) {
    const level = Number(levelRaw)
    const count = Math.max(0, Math.floor(countRaw))
    if (count <= 0) continue
    if (level > ARCANE_RECOVERY_MAX_SLOT_LEVEL) {
      return { ok: false, reason: 'Нельзя восстанавливать ячейки 6+ уровня' }
    }
  }

  if (cost <= 0) {
    return { ok: false, reason: 'Выбери хотя бы одну ячейку' }
  }
  if (cost > budget) {
    return {
      ok: false,
      reason: `Сумма уровней ${cost} > лимита ${budget}`,
    }
  }

  return { ok: true, slots: next, cost }
}
