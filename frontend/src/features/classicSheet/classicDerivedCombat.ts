/**
 * Play Desk computes AC / initiative live; `sheet.combat.ac` / `.initiative`
 * store only manual overrides (null = auto). Classic must show the same
 * derived values or the blank looks empty (esp. 2024 КЗ shield).
 */

import type { CharacterDetail } from '../../shared/api/characters'
import { computeArmorClass } from '../../shared/dnd/armor'
import { unlockFeaturesForClasses } from '../../shared/dnd/classFeatures'
import {
  fightingStyleFromFeatGrants,
  naturalArmorFromFeatGrants,
  readFeatGrantLedger,
  sumFeatInitiativeBonus,
  sumFeatSpeedBonus,
} from '../../shared/dnd/featGrants'
import { findFightingStylePick, readFeaturePicks } from '../../shared/dnd/featurePicks'
import { fightingStyleAcBonus } from '../../shared/dnd/fightingStyles'
import { buildSheetFormulaVars } from '../../shared/dnd/formulas'
import { readAppliedRaceGrant } from '../../shared/dnd/raceGrants'
import { totalCharacterLevel } from '../../shared/dnd/classLevels'
import { readAttunements } from '../characters/attunement'
import { readClassLevels } from '../characters/classLevels'
import {
  aggregateGearEffects,
  applyGearAbilityScores,
} from '../characters/gearEffects'
import { equippedArmorPieces, readInventory } from '../characters/inventory'
import {
  applyBonusStack,
  bonusesForTarget,
  readModifiers,
  withInitiativeBonus,
} from '../characters/modifiers'
import {
  ABILITY_KEYS,
  abilityModifier,
  asRecord,
  type AbilityKey,
} from '../characters/sheetTypes'
import {
  classWalkSpeedBonusFt,
  resolveWalkSpeedFt,
} from '../../shared/dnd/classMovement'
import { asProfBonus } from './classicPrintShared'
import { abilityScore, combatField } from './fromApi'

function readAbilityScores(character: CharacterDetail): Record<AbilityKey, number> {
  const out = {} as Record<AbilityKey, number>
  for (const key of ABILITY_KEYS) {
    out[key] = abilityScore(character, key)
  }
  return out
}

function readNullableCombatNumber(
  character: CharacterDetail,
  key: string,
): number | null {
  const raw = combatField(character, key)
  if (raw == null || raw === '') return null
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && raw.trim() && Number.isFinite(Number(raw))) {
    return Number(raw)
  }
  return null
}

/** Auto AC matching Play Desk (override lives in combat.ac when set). */
export function classicAutoArmorClass(character: CharacterDetail): number {
  const sheet = asRecord(character.sheet)
  const inventory = readInventory(sheet)
  const attunements = readAttunements(sheet)
  const gear = aggregateGearEffects({
    items: inventory.items,
    attunements,
  })
  const baseAbilities = readAbilityScores(character)
  const abilities = applyGearAbilityScores(baseAbilities, gear)
  const mods = {
    str: abilityModifier(abilities.str),
    dex: abilityModifier(abilities.dex),
    con: abilityModifier(abilities.con),
    int: abilityModifier(abilities.int),
    wis: abilityModifier(abilities.wis),
    cha: abilityModifier(abilities.cha),
  }

  const pieces = equippedArmorPieces(inventory.items)
  const raceGrant = readAppliedRaceGrant(sheet.race_grant)
  let naturalArmor = raceGrant?.naturalArmor ?? null
  const featNatural = naturalArmorFromFeatGrants(
    readFeatGrantLedger(sheet.feat_grants),
  )
  if (featNatural && (!naturalArmor || featNatural.base > naturalArmor.base)) {
    naturalArmor = featNatural
  }

  const classes = readClassLevels(sheet, {
    className: character.class_name ?? '',
    level: character.level,
    subclassName: String(asRecord(sheet.identity).subclass_name ?? ''),
    classCatalogId: null,
  })
  const characterLevel = totalCharacterLevel(classes)
  const unlocked = unlockFeaturesForClasses({
    classes,
    characterLevel,
    abilities,
  })
  const unarmoredDefense = (() => {
    if (pieces.armor) return null
    if (unlocked.some((feature) => feature.id === 'unarmored_defense_barb')) {
      return { labelRu: 'Защита без доспехов', secondMod: 'con' as const }
    }
    if (unlocked.some((feature) => feature.id === 'unarmored_defense_monk')) {
      return { labelRu: 'Защита без доспехов', secondMod: 'wis' as const }
    }
    return null
  })()

  const base = computeArmorClass({
    dexMod: mods.dex,
    abilityMods: mods,
    armor: pieces.armor,
    shield: pieces.shield,
    naturalArmor,
    unarmoredDefense,
  })

  const featGrants = readFeatGrantLedger(sheet.feat_grants)
  const styleId =
    findFightingStylePick(readFeaturePicks(sheet.feature_picks)) ??
    fightingStyleFromFeatGrants(featGrants)
  const styleBonus = fightingStyleAcBonus({
    styleId,
    wearingArmor: Boolean(pieces.armor),
  })

  let coreAc = base.ac
  if (styleBonus > 0) coreAc += styleBonus
  if (gear.acBonus) coreAc += gear.acBonus

  const proficiencyBonus = Number(asProfBonus(character))
  const formulaVars = buildSheetFormulaVars({
    mods,
    proficiencyBonus,
    level: characterLevel,
  })
  const stacked = applyBonusStack(
    coreAc,
    bonusesForTarget(readModifiers(sheet), 'ac'),
    formulaVars,
  )
  return stacked.total
}

/** Value shown in classic AC / КЗ field (override or auto). */
export function classicDisplayAc(character: CharacterDetail): string {
  const override = readNullableCombatNumber(character, 'ac')
  if (override != null) return String(override)
  return String(classicAutoArmorClass(character))
}

/** Initiative: override or DEX (+ feats + bonus lines), same as Play Desk. */
export function classicDisplayInitiative(character: CharacterDetail): string {
  const override = readNullableCombatNumber(character, 'initiative')
  const sheet = asRecord(character.sheet)
  const inventory = readInventory(sheet)
  const gear = aggregateGearEffects({
    items: inventory.items,
    attunements: readAttunements(sheet),
  })
  const abilities = applyGearAbilityScores(readAbilityScores(character), gear)
  const mods = {
    str: abilityModifier(abilities.str),
    dex: abilityModifier(abilities.dex),
    con: abilityModifier(abilities.con),
    int: abilityModifier(abilities.int),
    wis: abilityModifier(abilities.wis),
    cha: abilityModifier(abilities.cha),
  }
  const featGrants = readFeatGrantLedger(sheet.feat_grants)
  const core =
    override ??
    abilityModifier(abilities.dex) + sumFeatInitiativeBonus(featGrants)
  const classes = readClassLevels(sheet, {
    className: character.class_name ?? '',
    level: character.level,
    subclassName: String(asRecord(sheet.identity).subclass_name ?? ''),
    classCatalogId: null,
  })
  const formulaVars = buildSheetFormulaVars({
    mods,
    proficiencyBonus: Number(asProfBonus(character)),
    level: totalCharacterLevel(classes),
  })
  const total = withInitiativeBonus({
    core,
    modifiers: readModifiers(sheet),
    vars: formulaVars,
  }).total
  return String(total)
}

/**
 * Speed: race / stored + class movement (Fast Movement / Unarmored Movement)
 * + gear — same derivation as Play Desk.
 */
export function classicDisplaySpeed(character: CharacterDetail): string {
  const stored = readNullableCombatNumber(character, 'speed')
  const sheet = asRecord(character.sheet)
  const inventory = readInventory(sheet)
  const gear = aggregateGearEffects({
    items: inventory.items,
    attunements: readAttunements(sheet),
  })
  const race = readAppliedRaceGrant(sheet.race_grant)
  const classes = readClassLevels(sheet, {
    className: character.class_name ?? '',
    level: character.level,
    subclassName: '',
    classCatalogId: null,
  })
  const pieces = equippedArmorPieces(inventory.items)
  const wearingHeavy = pieces.armor?.kind === 'heavy'
  const wearingArmorOrShield = Boolean(pieces.armor || pieces.shield)
  const classBonus = classWalkSpeedBonusFt({
    classes,
    wearingHeavyArmor: wearingHeavy,
    wearingArmorOrShield,
  })
  const classBonusMax = classWalkSpeedBonusFt({
    classes,
    wearingHeavyArmor: false,
    wearingArmorOrShield: false,
  })
  const featBonus = sumFeatSpeedBonus(readFeatGrantLedger(sheet.feat_grants))
  const resolved = resolveWalkSpeedFt({
    storedSpeed: stored,
    raceSpeed: race?.speed ?? null,
    classBonusFt: classBonus,
    classBonusFtMax: classBonusMax,
    featBonusFt: featBonus,
    gearBonusFt: gear.speedBonusFt,
  })
  return resolved == null || resolved === 0 ? '' : String(resolved)
}

export function classicCombatDisplay(
  character: CharacterDetail,
  key: string,
): string {
  if (key === 'ac') return classicDisplayAc(character)
  if (key === 'initiative') return classicDisplayInitiative(character)
  if (key === 'speed') return classicDisplaySpeed(character)
  const v = combatField(character, key)
  return v == null ? '' : String(v)
}
