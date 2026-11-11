/** Pure spellcasting helpers — sheet now, party frame later. */

export type SpellcastingAbility = 'int' | 'wis' | 'cha'

export const SPELLCASTING_ABILITIES: SpellcastingAbility[] = ['int', 'wis', 'cha']

export const SPELLCASTING_ABILITY_LABELS: Record<SpellcastingAbility, string> = {
  int: 'ИНТ',
  wis: 'МУД',
  cha: 'ХАР',
}

export type SpellSlotState = {
  max: number
  used: number
}

export function isSpellcastingAbility(value: unknown): value is SpellcastingAbility {
  return value === 'int' || value === 'wis' || value === 'cha'
}

export function spellSaveDc(abilityMod: number, proficiencyBonus: number): number {
  return 8 + proficiencyBonus + abilityMod
}

export function spellAttackBonus(abilityMod: number, proficiencyBonus: number): number {
  return proficiencyBonus + abilityMod
}

export function clampSlot(slot: SpellSlotState): SpellSlotState {
  const max = Math.max(0, Math.floor(slot.max))
  const used = Math.min(max, Math.max(0, Math.floor(slot.used)))
  return { max, used }
}

/** Pip index click: free from this pip, or spend up to this pip inclusive. */
export function slotUsedAfterPipClick(currentUsed: number, pipIndex: number): number {
  if (pipIndex < currentUsed) return pipIndex
  return pipIndex + 1
}

export function levelLabel(level: number): string {
  if (level <= 0) return 'Заговоры'
  return `${level}-й уровень`
}

/** Cantrips are always available; leveled spells need prepare. */
export function countsTowardPrepareLimit(level: number): boolean {
  return level > 0
}

export function slotsRemaining(slot: SpellSlotState | undefined): number {
  if (!slot) return 0
  const clamped = clampSlot(slot)
  return Math.max(0, clamped.max - clamped.used)
}

export function canSpendSlot(
  slots: Record<string, SpellSlotState>,
  level: number,
): boolean {
  if (level <= 0) return true
  return slotsRemaining(slots[String(level)]) > 0
}

/** Slot levels ≥ spell level that still have remaining uses (upcast / same-level). */
export function availableCastSlotLevels(
  slots: Record<string, SpellSlotState>,
  spellLevel: number,
): number[] {
  if (spellLevel <= 0) return []
  const min = Math.max(1, Math.floor(spellLevel))
  const levels: number[] = []
  for (let level = min; level <= 9; level += 1) {
    if (slotsRemaining(slots[String(level)]) > 0) levels.push(level)
  }
  return levels
}

/** Spend one slot at `level` (1–9). Cantrips are a no-op success. */
export function spendSpellSlot(
  slots: Record<string, SpellSlotState>,
  level: number,
): { ok: true; slots: Record<string, SpellSlotState> } | { ok: false; reason: 'no_slot' } {
  if (level <= 0) {
    return { ok: true, slots }
  }
  const key = String(level)
  const current = clampSlot(slots[key] ?? { max: 0, used: 0 })
  if (current.max <= 0 || current.used >= current.max) {
    return { ok: false, reason: 'no_slot' }
  }
  return {
    ok: true,
    slots: {
      ...slots,
      [key]: { max: current.max, used: current.used + 1 },
    },
  }
}

export type PactSlotState = {
  max: number
  used: number
  level: number
}

export function clampPactSlots(pact: PactSlotState): PactSlotState {
  const max = Math.max(0, Math.floor(pact.max))
  const level = Math.max(1, Math.min(9, Math.floor(pact.level || 1)))
  const used = Math.min(max, Math.max(0, Math.floor(pact.used)))
  return { max, used, level }
}

/** 2014 warlock: leveled cast uses a pact slot if spell level ≤ pact level. */
export function canSpendPactSlot(pact: PactSlotState | null, spellLevel: number): boolean {
  if (!pact || spellLevel <= 0) return false
  const clamped = clampPactSlots(pact)
  return clamped.max > 0 && clamped.used < clamped.max && spellLevel <= clamped.level
}

export function spendPactSlot(
  pact: PactSlotState,
): { ok: true; pact: PactSlotState } | { ok: false; reason: 'no_slot' } {
  const clamped = clampPactSlots(pact)
  if (clamped.max <= 0 || clamped.used >= clamped.max) {
    return { ok: false, reason: 'no_slot' }
  }
  return { ok: true, pact: { ...clamped, used: clamped.used + 1 } }
}

export function canCastLeveledSpell(
  slots: Record<string, SpellSlotState>,
  pact: PactSlotState | null,
  spellLevel: number,
): boolean {
  if (spellLevel <= 0) return true
  return (
    canSpendPactSlot(pact, spellLevel) || availableCastSlotLevels(slots, spellLevel).length > 0
  )
}
