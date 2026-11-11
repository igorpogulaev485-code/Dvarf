/**
 * One ability total: own score, bonus lines, item +N (with caps), then the
 * highest floor from items and artificer infusions.
 */

import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { buildSheetFormulaVars } from '../../shared/dnd/formulas'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import { aggregateInfusionBonuses } from '../../shared/dnd/infusionEffects'
import {
  aggregateGearEffects,
  applyGearAbilityScores,
} from './gearEffects'
import type { AttunementCharacter } from './attunementRules'
import type { AttunementSlot } from './attunement'
import { equippedArmorPieces, type InventoryItem } from './inventory'
import { applyAbilityScoreBonuses, type BonusLine } from './modifiers'
import { abilityModifier, type AbilityKey } from './sheetTypes'

export function abilitiesWithGear(input: {
  base: Record<AbilityKey, number>
  modifiers: BonusLine[]
  items: InventoryItem[]
  attunements: AttunementSlot[]
  classes: ClassLevelEntry[]
  featurePicks: FeaturePicksState
  proficiencyBonus: number
  level: number
  gate?: AttunementCharacter | null
}): Record<AbilityKey, number> {
  const ownMods = {
    str: abilityModifier(input.base.str),
    dex: abilityModifier(input.base.dex),
    con: abilityModifier(input.base.con),
    int: abilityModifier(input.base.int),
    wis: abilityModifier(input.base.wis),
    cha: abilityModifier(input.base.cha),
  }
  const ownVars = buildSheetFormulaVars({
    mods: ownMods,
    proficiencyBonus: input.proficiencyBonus,
    level: input.level,
  })
  const boosted = applyAbilityScoreBonuses(input.base, input.modifiers, ownVars)
  const gear = aggregateGearEffects({
    items: input.items,
    attunements: input.attunements,
    gate: input.gate,
  })
  const pieces = equippedArmorPieces(input.items)
  const infusions = aggregateInfusionBonuses({
    featurePicks: input.featurePicks,
    classes: input.classes,
    wearingArmor: Boolean(pieces.armor),
    wearingShield: Boolean(pieces.shield),
    items: input.items,
  })
  return applyGearAbilityScores(boosted, gear, infusions.abilityFloor)
}
