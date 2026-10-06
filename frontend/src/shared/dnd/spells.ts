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
