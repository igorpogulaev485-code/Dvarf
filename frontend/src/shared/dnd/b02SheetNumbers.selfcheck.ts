/**
 * B-02 acceptance numbers.
 * Run: npx tsx src/shared/dnd/b02SheetNumbers.selfcheck.ts
 */
import { computeArmorClass } from './armor.ts'
import {
  acBonusFromActiveEffects,
  acFormulasFromActiveEffects,
  acMinFromActiveEffects,
  applySpeedModsToWalk,
  buildBuffEffect,
  chooseTempHpPool,
  clampHpAfterMaxLoss,
  defensesFromActiveEffects,
  hpMaxBonusFromSingleEffect,
  speedModsFromActiveEffects,
  tempHpGrantFromEffect,
  weaponBonusesFromActiveEffects,
} from './activeEffects.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

// Wizard 3, DEX 14 (+2), no armor: 12 → Mage Armor 15; + Shield reaction → 20
{
  const mage = buildBuffEffect({ name: 'Доспехи мага', slotLevel: 1 })!
  const formulas = acFormulasFromActiveEffects([mage])
  assert(formulas.length === 1 && formulas[0].base === 13, 'mage armor formula')
  const base = computeArmorClass({
    dexMod: 2,
    armor: null,
    shield: null,
    extraFormulas: formulas,
  })
  assert(base.ac === 15, `mage armor AC 15 got ${base.ac}`)
  const shieldFx = buildBuffEffect({ name: 'Щит' })!
  assert(acBonusFromActiveEffects([shieldFx]) === 5, 'shield +5')
  assert(base.ac + 5 === 20, 'mage + shield reaction = 20')
}

// Lizardfolk monk DEX 16 WIS 18: UD 17 beats natural 16; manual natural → 16
{
  const natural = {
    base: 13,
    mod: 'dex' as const,
    allowsShield: true,
    labelRu: 'Природная броня',
  }
  const ud = {
    labelRu: 'Защита без доспехов',
    secondMod: 'wis' as const,
    allowsShield: false,
  }
  const auto = computeArmorClass({
    dexMod: 3,
    abilityMods: { dex: 3, wis: 4 },
    armor: null,
    shield: null,
    naturalArmor: natural,
    unarmoredDefense: ud,
  })
  assert(auto.ac === 17, `lizardfolk monk auto 17 got ${auto.ac}`)
  assert(auto.formulaKey === 'unarmored_wis', `key ${auto.formulaKey}`)
  const manual = computeArmorClass({
    dexMod: 3,
    abilityMods: { dex: 3, wis: 4 },
    armor: null,
    shield: null,
    naturalArmor: natural,
    unarmoredDefense: ud,
    preferredFormulaKey: 'природная_броня',
  })
  // slugKey of «Природная броня»
  const naturalKey = auto.candidates.find((c) => c.label === 'Природная броня')?.key
  const picked = computeArmorClass({
    dexMod: 3,
    abilityMods: { dex: 3, wis: 4 },
    armor: null,
    shield: null,
    naturalArmor: natural,
    unarmoredDefense: ud,
    preferredFormulaKey: naturalKey,
  })
  assert(picked.ac === 16, `manual natural 16 got ${picked.ac}`)
  void manual
}

// Monk with shield: UD unavailable → 10+3+2 = 15
{
  const withShield = computeArmorClass({
    dexMod: 3,
    abilityMods: { dex: 3, wis: 3 },
    armor: null,
    shield: { kind: 'shield', baseAc: 2 },
    unarmoredDefense: {
      labelRu: 'Защита без доспехов',
      secondMod: 'wis',
      allowsShield: false,
    },
  })
  assert(withShield.ac === 15, `monk+shield 15 got ${withShield.ac}`)
  const noShield = computeArmorClass({
    dexMod: 3,
    abilityMods: { dex: 3, wis: 3 },
    armor: null,
    shield: null,
    unarmoredDefense: {
      labelRu: 'Защита без доспехов',
      secondMod: 'wis',
      allowsShield: false,
    },
  })
  assert(noShield.ac === 16, `monk no shield 16 got ${noShield.ac}`)
}

// Barkskin floor
{
  const bark = buildBuffEffect({ name: 'Дубовая кора' })!
  const floor = acMinFromActiveEffects([bark])
  assert(floor?.value === 16, 'barkskin floor 16')
  const soft = computeArmorClass({
    dexMod: 1,
    armor: null,
    shield: null,
    acMinFloor: floor,
  })
  assert(soft.ac === 16 && soft.floorApplied, `barkskin raises 11→16 got ${soft.ac}`)
  const plate = computeArmorClass({
    dexMod: 0,
    armor: { kind: 'heavy', baseAc: 18, name: 'Латы' },
    shield: null,
    acMinFloor: floor,
  })
  assert(plate.ac === 18 && !plate.floorApplied, 'plate stays 18')
}

// False life / temp HP replace
{
  const fl = buildBuffEffect({ name: 'Псевдожизнь', slotLevel: 1 })!
  const grant = tempHpGrantFromEffect(fl, () => 0) // d4 → 1 + 4 = 5
  assert(grant === 5, `false life min 5 got ${grant}`)
  assert(chooseTempHpPool(3, 7, 'replace') === 7, 'replace larger')
  assert(chooseTempHpPool(3, 7, 'keep') === 3, 'keep smaller')
}

// Aid 3rd level: +10 max/current; end clamps
{
  const aid = buildBuffEffect({ name: 'Подмога', slotLevel: 3 })!
  assert(hpMaxBonusFromSingleEffect(aid) === 10, 'aid 3rd +10')
  const end = clampHpAfterMaxLoss({ hpCurrent: 50, hpMaxBefore: 54, lostMax: 10 })
  assert(end.hpMax === 44 && end.hpCurrent === 44, 'clamp to new max')
  const stay = clampHpAfterMaxLoss({ hpCurrent: 40, hpMaxBefore: 54, lostMax: 10 })
  assert(stay.hpCurrent === 40, 'current stays if under new max')
}

// Haste: +2 AC, speed ×2
{
  const haste = buildBuffEffect({ name: 'Ускорение' })!
  assert(acBonusFromActiveEffects([haste]) === 2, 'haste +2 AC')
  const speed = speedModsFromActiveEffects([haste])
  assert(applySpeedModsToWalk(30, speed) === 60, 'haste speed 60')
}

// Stoneskin nonmagical B/P/S
{
  const skin = buildBuffEffect({ name: 'Каменная кожа' })!
  const defs = defensesFromActiveEffects([skin])
  assert(
    defs.filter((d) => d.nonmagical && d.kind === 'resistance').length === 3,
    'stoneskin 3 nonmagical resists',
  )
}

// Magic weapon 2nd: +1/+1
{
  const mw = buildBuffEffect({ name: 'Магическое оружие', slotLevel: 2 })!
  const w = weaponBonusesFromActiveEffects([mw])
  assert(w.attack === 1 && w.damage === 1, 'magic weapon +1')
  const mw6 = buildBuffEffect({ name: 'Магическое оружие', slotLevel: 6 })!
  assert(weaponBonusesFromActiveEffects([mw6]).attack === 3, 'magic weapon 6th +3')
}

// Shield of faith still +2 (B-01)
{
  const sof = buildBuffEffect({ name: 'Щит веры' })!
  assert(acBonusFromActiveEffects([sof]) === 2, 'sof still +2')
}

console.log('b02SheetNumbers.selfcheck: ok')
