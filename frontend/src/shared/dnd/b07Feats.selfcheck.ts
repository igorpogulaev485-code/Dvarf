/**
 * B-07 acceptance selfcheck (pack criteria).
 * Run: npx tsx src/shared/dnd/b07Feats.selfcheck.ts
 */
import { computeArmorClass } from './armor.ts'
import {
  applyMediumArmorMasterCap,
  countEquippedMeleeWeapons,
  dualWielderAcBonus,
  elvenAccuracyApplies,
  featResistanceTypes,
  heavyArmorMasterFlatReduction,
  inspiringLeaderTempHp,
  chefSnackTempHp,
  chefFoodCreatureCount,
  hasFeatFlag,
} from './b07FeatCombat.ts'
import { buildBuffEffect } from './activeEffects.ts'
import {
  applyLuckyPick,
  formatCheckRoll,
  resolveAttackRoll,
  rollCheckElvenAccuracy,
  rollCheckWithLucky,
} from '../../features/characters/deskRolls.ts'
import type { AppliedFeatGrant } from './featGrants.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function grant(slug: string, flags: string[], extra?: Partial<AppliedFeatGrant['applied']>): AppliedFeatGrant {
  return {
    id: `g-${slug}`,
    featCatalogId: slug,
    slug,
    nameRu: slug,
    source: { kind: 'manual' },
    applied: {
      abilityBonuses: {},
      armorProficiencies: [],
      weaponNames: [],
      skills: [],
      tools: [],
      languages: [],
      savingThrows: [],
      initiativeBonus: 0,
      speedBonus: 0,
      passiveBonus: 0,
      hpPerLevel: 0,
      acBonusDualWield: extra?.acBonusDualWield ?? 0,
      flags,
      resource: null,
      unarmedDamage: null,
      naturalArmor: null,
      spells: [],
      expertiseSkills: [],
      benefitsRu: '',
      summaryRu: '',
      enumPicks: {},
      enumMultiPicks: {},
      ...extra,
    },
    picks: {
      abilityKeys: {},
      enumIds: {},
      enumLists: {},
      expertiseSkills: [],
      languages: [],
      skills: [],
      tools: [],
      weapons: [],
    },
  }
}

// —— Dual Wielder: studded leather AC 12 + Dex 3 = 15; +1 with two short swords → 16 ——
{
  const ledger = [grant('dual_wielder', ['dual_wielder'], { acBonusDualWield: 1 })]
  const twoSwords = [
    { equipped: true, armor_kind: 'none', weapon_grip: 'one_hand', name: 'Короткий меч' },
    { equipped: true, armor_kind: 'none', weapon_grip: 'one_hand', name: 'Короткий меч' },
  ]
  const oneSword = [
    { equipped: true, armor_kind: 'none', weapon_grip: 'one_hand', name: 'Короткий меч' },
  ]
  assert(countEquippedMeleeWeapons(twoSwords) === 2, 'two melee')
  assert(countEquippedMeleeWeapons(oneSword) === 1, 'one melee')
  const studded = { kind: 'light' as const, baseAc: 12, maxDexBonus: null, name: 'Проклёпанная кожа' }
  const base = computeArmorClass({
    dexMod: 3,
    armor: studded,
    shield: null,
  })
  assert(base.ac === 15, `studded+dex3 expected 15 got ${base.ac}`)
  assert(dualWielderAcBonus(ledger, twoSwords) === 1, 'dual +1')
  assert(dualWielderAcBonus(ledger, oneSword) === 0, 'dual 0 with one')
  assert(base.ac + dualWielderAcBonus(ledger, twoSwords) === 16, 'AC 16 with dual')
}

// —— Medium Armor Master: half plate 15 + Dex cap 3 = 18 ——
{
  const ledger = [grant('medium_armor_master', ['medium_armor_master'])]
  const half = { kind: 'medium' as const, baseAc: 15, maxDexBonus: 2, name: 'Полулаты' }
  const capped = applyMediumArmorMasterCap(half, ledger)!
  assert(capped.maxDexBonus === 3, 'maxDex 3')
  const withFeat = computeArmorClass({ dexMod: 3, armor: capped, shield: null })
  const without = computeArmorClass({ dexMod: 3, armor: half, shield: null })
  assert(without.ac === 17, `half plate no feat 17 got ${without.ac}`)
  assert(withFeat.ac === 18, `half plate mam 18 got ${withFeat.ac}`)
}

// —— Heavy Armor Master: 10 slash nonmag → 7; fire stays 10 ——
{
  const ledger = [grant('heavy_armor_master', ['heavy_armor_master'])]
  const slash = heavyArmorMasterFlatReduction({
    ledger,
    armorKind: 'heavy',
    damageType: 'slashing',
    nonmagical: true,
    amount: 10,
  })
  assert(slash.amount === 7, `HAM slash 7 got ${slash.amount}`)
  const fire = heavyArmorMasterFlatReduction({
    ledger,
    armorKind: 'heavy',
    damageType: 'fire',
    nonmagical: true,
    amount: 10,
  })
  assert(fire.amount === 10, 'HAM fire unchanged')
}

// —— Inspiring Leader: paladin 4 Cha 16 → 7 temp ——
{
  assert(inspiringLeaderTempHp(4, 3) === 7, 'inspiring 7')
  const fx = buildBuffEffect({
    name: 'Воодушевляющий лидер',
    slug: 'inspiring_leader',
    classLevel: 4,
    casterMod: 3,
  })
  assert(fx?.slug === 'inspiring_leader', 'inspiring slug')
  const temp = fx?.mods?.find((m) => m.target === 'temp_hp')
  assert(temp?.value === 7, `inspiring temp 7 got ${temp?.value}`)
}

// —— Chef TCE: snacks = PB; food creatures = 4+PB ——
{
  assert(chefSnackTempHp(3) === 3, 'chef snack PB')
  assert(chefFoodCreatureCount(3) === 7, 'chef food 4+PB')
}

// —— Infernal constitution resistances ——
{
  const rows = featResistanceTypes([
    grant('infernal_constitution', ['infernal_constitution']),
    grant('ember', ['ember_of_the_fire_giant', 'resist_fire']),
  ])
  const types = new Set(rows.map((r) => r.type))
  assert(types.has('cold') && types.has('poison') && types.has('fire'), 'feat resists')
}

// —— Lucky: advantage → 3 dice, pick any ——
{
  let i = 0
  const seq = [0.05, 0.45, 0.95] // → 2, 10, 20
  const rng = () => seq[i++] ?? 0
  const roll = rollCheckWithLucky(0, 'advantage', rng)
  assert(roll.allDice?.length === 3, 'lucky 3 dice')
  assert(roll.needsPick, 'lucky needs pick')
  const picked = applyLuckyPick(roll, 20)
  assert(picked.die === 20 && picked.total === 20, 'pick 20')
  const text = formatCheckRoll('Атака', { ...roll, allDice: [2, 10, 20] })
  assert(text.includes('2/10/20'), `format 3 dice: ${text}`)
}

// —— Elven Accuracy: 3d20 keep highest ——
{
  let i = 0
  const seq = [0.1, 0.2, 0.9]
  const rng = () => seq[i++] ?? 0
  const roll = rollCheckElvenAccuracy(2, rng)
  assert(roll.allDice?.length === 3, 'elven 3')
  assert(roll.featLabel === 'эльф.точн.', 'elven label')
  assert(
    elvenAccuracyApplies({
      ledger: [grant('elven_accuracy', ['elven_accuracy'])],
      mode: 'advantage',
      abilityKey: 'dex',
    }),
    'elven applies',
  )
  assert(
    !elvenAccuracyApplies({
      ledger: [grant('elven_accuracy', ['elven_accuracy'])],
      mode: 'advantage',
      abilityKey: 'str',
    }),
    'elven not str',
  )
}

// —— Attack path with elven ——
{
  let i = 0
  const seq = [0.05, 0.1, 0.95, 0.5, 0.5]
  const rng = () => seq[i++] ?? 0.5
  const strike = resolveAttackRoll({
    name: 'Рапира',
    attackBonus: 5,
    damageExpr: '1d8+3',
    damageType: 'колющий',
    mode: 'advantage',
    elvenAccuracy: true,
    rng,
  })
  assert(strike.text.includes('эльф.точн.') || (strike.allDice?.length ?? 0) >= 3, strike.text)
}

assert(hasFeatFlag([grant('war_caster', ['war_caster'])], 'war_caster'), 'war caster flag')

console.log('b07Feats.selfcheck: ok')
