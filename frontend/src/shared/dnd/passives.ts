/** Passive scores: 10 + skill modifier. */

export function passiveScore(skillModifier: number): number {
  return 10 + skillModifier
}

export function skillModifierFromState(input: {
  abilityMod: number
  proficiencyBonus: number
  isProficient: boolean
  isExpertise: boolean
}): number {
  if (input.isExpertise) return input.abilityMod + input.proficiencyBonus * 2
  if (input.isProficient) return input.abilityMod + input.proficiencyBonus
  return input.abilityMod
}
