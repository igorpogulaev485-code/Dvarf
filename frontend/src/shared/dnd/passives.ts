/** Passive scores: 10 + skill modifier. */

export function passiveScore(skillModifier: number): number {
  return 10 + skillModifier
}

export function skillModifierFromState(input: {
  abilityMod: number
  proficiencyBonus: number
  isProficient: boolean
  isExpertise: boolean
  magicBonus?: number
}): number {
  const magic = input.magicBonus ?? 0
  if (input.isExpertise) return input.abilityMod + input.proficiencyBonus * 2 + magic
  if (input.isProficient) return input.abilityMod + input.proficiencyBonus + magic
  return input.abilityMod + magic
}
