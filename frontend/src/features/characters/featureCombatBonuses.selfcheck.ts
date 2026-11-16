/**
 * Run: npx --yes tsx src/features/characters/featureCombatBonuses.selfcheck.ts
 */
import {
  critThresholdFromFeatures,
  darkvisionFtFromFeatures,
  hasDraconicResilienceFeature,
  improvedDivineSmiteRider,
  initiativeAdvantageFromFeatures,
  initiativeBonusFromFeatures,
  initiativeBonusFromRace,
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
  darkvisionFtFromFeatures({ features: [{ id: 'umbral_sight' }], baseDarkvision: 60 }) === 90,
  'umbral +30 if already have DV',
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
