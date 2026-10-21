/**
 * Run: npx --yes tsx src/features/characters/featureCombatBonuses.selfcheck.ts
 */
import {
  darkvisionFtFromFeatures,
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
    features: [{ id: 'other' }],
    abilities: { wis: 20 },
  }) === 0,
  'no dread = 0',
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

console.log('featureCombatBonuses.selfcheck: ok')
