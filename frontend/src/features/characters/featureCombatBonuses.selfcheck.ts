/**
 * Run: npx --yes tsx src/features/characters/featureCombatBonuses.selfcheck.ts
 */
import {
  assassinate2024ExtraDamage,
  assassinateGrantsCritVsSurprised,
  critThresholdFromFeatures,
  darkvisionFtFromFeatures,
  frenzy2024Rider,
  hasDraconicResilienceFeature,
  improvedDivineSmiteRider,
  initiativeAdvantageFromFeatures,
  initiativeBonusFromFeatures,
  initiativeBonusFromRace,
  rageDamageBonusFromLevel,
} from './featureCombatBonuses.ts'
import { computeArmorClass } from '../../shared/dnd/armor.ts'
import { resolveAttackRoll } from './deskRolls.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function seq(values: number[]): () => number {
  let i = 0
  return () => {
    const v = values[i] ?? 0
    i += 1
    return v
  }
}

assert(
  initiativeBonusFromFeatures({
    features: [{ id: 'dread_ambusher' }],
    abilities: { wis: 14 },
  }) === 2,
  'dread ambusher +WIS',
)
assert(
  initiativeBonusFromFeatures({
    features: [{ id: 'rakish_audacity' }],
    abilities: { cha: 13 },
  }) === 1,
  'rakish audacity +CHA',
)
assert(
  initiativeBonusFromFeatures({
    features: [{ id: 'dread_ambusher' }, { id: 'rakish_audacity' }],
    abilities: { wis: 14, cha: 16 },
  }) === 5,
  'dread + rakish stack',
)
assert(
  initiativeBonusFromFeatures({
    features: [{ id: 'other' }],
    abilities: { wis: 20, cha: 20 },
  }) === 0,
  'no matching feature = 0',
)

// Crit threshold: 2014 Champion must stay nat-20 only (pre-pack behavior).
const champ2014L15 = [
  { id: 'improved_critical' },
  { id: 'superior_critical' },
  { id: 'remarkable_athlete' },
]
assert(
  critThresholdFromFeatures(champ2014L15, '2014') === 20,
  'Champion 2014 L15: crit threshold stays 20',
)
assert(
  critThresholdFromFeatures(champ2014L15) === 20,
  'Champion default edition (2014): crit threshold 20',
)
assert(
  critThresholdFromFeatures(champ2014L15, '2024') === 18,
  'Champion 2024 L15: crit 18–20',
)
assert(
  critThresholdFromFeatures([{ id: 'improved_critical' }], '2024') === 19,
  'Champion 2024 improved only → 19',
)
assert(
  critThresholdFromFeatures([{ id: 'improved-critical' }], '2024') === 19,
  '2024 hyphen id works',
)
assert(critThresholdFromFeatures([]) === 20, 'default crit 20')

// 2014 Remarkable Athlete must NOT become initiative advantage.
assert(
  !initiativeAdvantageFromFeatures([{ id: 'remarkable_athlete' }], '2014'),
  '2014 remarkable athlete is not init advantage',
)
assert(
  !initiativeAdvantageFromFeatures([{ id: 'remarkable_athlete' }]),
  'default edition: no init advantage from remarkable athlete',
)
assert(
  initiativeAdvantageFromFeatures([{ id: 'remarkable-athlete' }], '2024'),
  '2024 remarkable athlete → init advantage flag',
)
assert(!initiativeAdvantageFromFeatures([], '2024'), 'no remarkable = false')
assert(
  initiativeAdvantageFromFeatures([{ id: 'assassinate' }], '2024'),
  '2024 Assassinate → init advantage',
)
assert(
  !initiativeAdvantageFromFeatures([{ id: 'assassinate' }], '2014'),
  '2014 Assassinate does not auto-wire init advantage here',
)
assert(
  !assassinateGrantsCritVsSurprised([{ id: 'assassinate' }], '2024'),
  '2024 Assassinate is NOT auto-crit vs surprised',
)

assert(rageDamageBonusFromLevel(3) === 2, 'rage dmg L3=2')
assert(rageDamageBonusFromLevel(9) === 3, 'rage dmg L9=3')
assert(rageDamageBonusFromLevel(16) === 4, 'rage dmg L16=4')

const frenzyL3 = frenzy2024Rider({
  features: [{ id: 'frenzy', classLevel: 3 }],
  rulesEdition: '2024',
  raging: true,
  recklessAttack: true,
  strengthBased: true,
})
assert(frenzyL3?.dice === '2d6', `Frenzy L3 = 2d6 (rage dmg), got ${frenzyL3?.dice}`)
const frenzyL9 = frenzy2024Rider({
  features: [{ id: 'frenzy', classLevel: 9 }],
  rulesEdition: '2024',
  raging: true,
  recklessAttack: true,
  strengthBased: true,
})
assert(frenzyL9?.dice === '3d6', 'Frenzy L9 = 3d6 from rage damage, not PB')
assert(
  frenzy2024Rider({
    features: [{ id: 'frenzy', classLevel: 9 }],
    rulesEdition: '2024',
    raging: true,
    recklessAttack: true,
    strengthBased: true,
    alreadyUsedThisTurn: true,
  }) == null,
  'Frenzy once per turn',
)
assert(
  frenzy2024Rider({
    features: [{ id: 'frenzy', classLevel: 5 }],
    rulesEdition: '2014',
    raging: true,
    recklessAttack: true,
    strengthBased: true,
  }) == null,
  'Frenzy 2024 rider gated off 2014 sheets',
)
assert(
  frenzy2024Rider({
    features: [{ id: 'frenzy', classLevel: 5 }],
    rulesEdition: '2024',
    raging: true,
    recklessAttack: false,
    strengthBased: true,
  }) == null,
  'Frenzy needs Reckless Attack',
)

const assassinExtra = assassinate2024ExtraDamage({
  features: [{ id: 'assassinate', classLevel: 11 }],
  rulesEdition: '2024',
  applyRound1Bonus: true,
})
assert(assassinExtra?.amount === 11, 'Assassinate SA extra = rogue level')
assert(
  assassinate2024ExtraDamage({
    features: [{ id: 'assassinate', classLevel: 11 }],
    rulesEdition: '2024',
    applyRound1Bonus: false,
  }) == null,
  'Assassinate extra off when chip off',
)

const frenzyInRoll = resolveAttackRoll({
  name: 'Секира',
  attackBonus: 5,
  damageExpr: '1d12+3',
  extraDamages: [{ expression: frenzyL3!.dice, type: null, label: frenzyL3!.rollLabel! }],
  rng: seq([0.5, 0, 0.5, 0.75]), // hit 11, d12=1, 2d6=4+5
})
assert(
  frenzyInRoll.text.includes('Бешенство') && frenzyInRoll.text.includes('2d6'),
  `Frenzy dice used in strike: ${frenzyInRoll.text}`,
)

const assassinInRoll = resolveAttackRoll({
  name: 'Кинжал',
  attackBonus: 7,
  damageExpr: `1d4+4+${assassinExtra!.amount}`,
  rng: seq([0.5, 0.5]),
})
assert(
  assassinInRoll.damageTotal != null && assassinInRoll.damageTotal >= 4 + 11,
  `Assassinate flat level used in damageExpr, got ${assassinInRoll.damageTotal}`,
)

// Attack roll: 2014 path ignores Champion features (threshold 20).
const roll2014 = resolveAttackRoll({
  name: 'Меч',
  attackBonus: 5,
  damageExpr: '1d8+3',
  critThreshold: critThresholdFromFeatures(champ2014L15, '2014'),
  rng: seq([0.9, 0.5]), // d20 → 19
})
assert(!roll2014.crit, 'Champion 2014: natural 19 is not a crit')

const roll2024 = resolveAttackRoll({
  name: 'Меч',
  attackBonus: 5,
  damageExpr: '1d8+3',
  critThreshold: critThresholdFromFeatures(champ2014L15, '2024'),
  rng: seq([0.9, 0.5]), // d20 → 19
})
assert(roll2024.crit, 'Champion 2024 L15: natural 19 is a crit')

// Draconic AC: 2014 stays 13+DEX; hyphen alias only on 2024.
assert(
  hasDraconicResilienceFeature([{ id: 'draconic_resilience' }], '2014'),
  '2014 underscore id matches',
)
assert(
  !hasDraconicResilienceFeature([{ id: 'draconic-resilience' }], '2014'),
  '2014 ignores hyphen alias',
)
assert(
  hasDraconicResilienceFeature([{ id: 'draconic-resilience' }], '2024'),
  '2024 accepts hyphen alias',
)

const ac2014 = computeArmorClass({
  dexMod: 2,
  abilityMods: { dex: 2, cha: 3 },
  armor: null,
  shield: null,
  extraFormulas: [
    {
      key: 'draconic_resilience',
      label: 'Драконья устойчивость',
      base: 13,
      dexCap: null,
      allowsShield: true,
    },
  ],
})
assert(ac2014.ac === 15, `2014 draconic AC 13+DEX(+2)=15, got ${ac2014.ac}`)

const ac2024 = computeArmorClass({
  dexMod: 2,
  abilityMods: { dex: 2, cha: 3 },
  armor: null,
  shield: null,
  extraFormulas: [
    {
      key: 'draconic_resilience',
      label: 'Драконья устойчивость',
      base: 10 + 3,
      dexCap: null,
      allowsShield: true,
    },
  ],
})
assert(ac2024.ac === 15, `2024 draconic AC 10+CHA(+3)+DEX(+2)=15, got ${ac2024.ac}`)

assert(
  darkvisionFtFromFeatures({ features: [{ id: 'umbral_sight' }], baseDarkvision: 0 }) === 60,
  'umbral grants 60',
)
assert(
  darkvisionFtFromFeatures({
    features: [{ id: 'umbral_sight' }],
    baseDarkvision: 60,
    rulesEdition: '2014',
  }) === 90,
  'umbral +30 if already have DV (2014)',
)
assert(
  darkvisionFtFromFeatures({
    features: [{ id: 'umbral_sight' }],
    baseDarkvision: 60,
    rulesEdition: '2024',
  }) === 120,
  'umbral +60 if already have DV (2024)',
)
assert(
  darkvisionFtFromFeatures({ features: [], baseDarkvision: 60 }) === 60,
  'no umbral keeps base',
)

assert(
  initiativeBonusFromRace({
    grant: {
      combatBonuses: { initiative: 'proficiency_bonus' },
    },
    proficiencyBonus: 6,
  }) === 6,
  'race Hare-Trigger PB',
)
assert(
  initiativeBonusFromRace({ grant: null, proficiencyBonus: 6 }) === 0,
  'no race grant = 0',
)

assert(improvedDivineSmiteRider([{ id: 'divine_smite' }]) == null, 'smite slot is not the improved rider')
const improved = improvedDivineSmiteRider([{ id: 'improved_divine_smite' }])
assert(
  improved != null && improved.dice === '1d8' && improved.type === 'излучением',
  'improved divine smite is +1d8 radiant',
)
assert(
  improvedDivineSmiteRider([
    { id: 'divine_strike_war' },
    { id: 'improved_divine_smite' },
  ])?.dice === '1d8',
  'improved smite stacks beside cleric divine strike data',
)

console.log('featureCombatBonuses.selfcheck: ok')
