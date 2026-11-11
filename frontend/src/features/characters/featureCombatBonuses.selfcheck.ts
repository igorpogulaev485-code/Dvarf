/**
 * Run: npx --yes tsx src/features/characters/featureCombatBonuses.selfcheck.ts
 */
import {
  darkvisionFtFromFeatures,
  improvedDivineSmiteRider,
  initiativeBonusFromFeatures,
  initiativeBonusFromRace,
} from './featureCombatBonuses.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
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
