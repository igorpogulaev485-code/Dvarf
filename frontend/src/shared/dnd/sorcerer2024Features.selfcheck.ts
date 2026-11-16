/** Run: npx tsx --tsconfig tsconfig.app.json src/shared/dnd/sorcerer2024Features.selfcheck.ts */
import assert from 'node:assert/strict'
import {
  activateInnateSorcery2024,
  applySorcerousRestoration2024,
  convertSlotToPoints2024,
  createSlotFromPoints2024,
  metamagicKnownLimitOrZero,
  metamagicPickGainAtLevel2024,
  resolveMetamagicOnCast2024,
  restoreFeatureUseWithSorcery2024,
  sorcerer2024Context,
  sorcerousRestorationMaxPoints2024,
} from './sorcerer2024Features'
import { METAMAGIC_2024, metamagicKnownLimit2024 } from './edition2024ClassOptions'
import {
  findWildMagicSurge2024,
  tamedSurgeChoices2024,
  WILD_MAGIC_SURGES_SORCERER_2024,
} from './wildMagicSurgesSorcerer2024'

assert.equal(metamagicKnownLimit2024(1), 0)
assert.equal(metamagicKnownLimit2024(2), 2)
assert.equal(metamagicKnownLimit2024(9), 2)
assert.equal(metamagicKnownLimit2024(10), 4)
assert.equal(metamagicKnownLimit2024(16), 4)
assert.equal(metamagicKnownLimit2024(17), 6)
assert.equal(metamagicKnownLimitOrZero(20), 6)
assert.equal(metamagicPickGainAtLevel2024(2), 2)
assert.equal(metamagicPickGainAtLevel2024(10), 2)
assert.equal(metamagicPickGainAtLevel2024(17), 2)
assert.equal(metamagicPickGainAtLevel2024(5), 0)

assert.equal(METAMAGIC_2024.find((r) => r.id === 'careful')?.nameRu, 'Аккуратное заклинание')
assert.equal(METAMAGIC_2024.find((r) => r.id === 'heightened')?.nameRu, 'Непреодолимое заклинание')
assert.equal(METAMAGIC_2024.find((r) => r.id === 'subtle')?.nameRu, 'Неуловимое заклинание')
assert.equal(METAMAGIC_2024.find((r) => r.id === 'twinned')?.cost, 1)
assert.equal(METAMAGIC_2024.find((r) => r.id === 'heightened')?.cost, 2)
assert.equal(METAMAGIC_2024.find((r) => r.id === 'seeking')?.cost, 1)

assert.equal(sorcerousRestorationMaxPoints2024(5), 2)
assert.equal(sorcerousRestorationMaxPoints2024(11), 5)

const restored = applySorcerousRestoration2024({
  sorcererLevel: 5,
  sorceryMax: 5,
  sorceryUsed: 4,
  restorationUsed: 0,
  restorationMax: 1,
})
assert.equal(restored.ok, true)
if (restored.ok) {
  assert.equal(restored.pointsRegained, 2)
  assert.equal(restored.sorceryUsed, 2)
}

const innate = activateInnateSorcery2024({
  sorcererLevel: 7,
  innateMax: 2,
  innateUsed: 2,
  innateActive: false,
  sorceryMax: 7,
  sorceryUsed: 1,
})
assert.equal(innate.ok, true)
if (innate.ok) {
  assert.equal(innate.viaIncarnate, true)
  assert.equal(innate.sorceryUsed, 3)
}

const slots = { '1': { max: 4, used: 0 }, '2': { max: 3, used: 0 } }
const created = createSlotFromPoints2024({
  slots,
  slotLevel: 2,
  sorcererLevel: 5,
  sorceryMax: 5,
  sorceryUsed: 0,
})
assert.equal(created.ok, true)
if (created.ok) {
  assert.equal(created.sorceryUsed, 3)
  assert.equal(created.slots['2']?.flexible, 1)
}

const convert = convertSlotToPoints2024({
  slots: { '1': { max: 4, used: 0 } },
  slotLevel: 1,
  sorceryMax: 5,
  sorceryUsed: 3,
})
assert.equal(convert.ok, true)
if (convert.ok) assert.equal(convert.sorceryUsed, 2)

const flags = sorcerer2024Context({
  rulesEdition: '2024',
  sorcererLevel: 20,
  innateSorceryActive: true,
  metamagicKnown: ['quickened', 'empowered', 'seeking', 'careful'],
})
assert.ok(flags)
const double = resolveMetamagicOnCast2024({
  flags: flags!,
  selection: { primaryId: 'careful', secondaryId: 'empowered', freeApotheosisOn: 'primary' },
  spell: { level: 3, casting_time: '1 действие' },
})
assert.equal(double.ok, true)
if (double.ok) {
  assert.equal(double.cost, 1) // careful free via apotheosis, empowered costs 1
  assert.equal(double.freeMetamagicThisTurnUsed, true)
}

const quickenedBlocked = resolveMetamagicOnCast2024({
  flags: { ...flags!, castLeveledSpellThisTurn: true, innateSorceryActive: false },
  selection: { primaryId: 'quickened', secondaryId: null, freeApotheosisOn: null },
  spell: { level: 1, casting_time: '1 действие' },
})
assert.equal(quickenedBlocked.ok, false)

assert.equal(WILD_MAGIC_SURGES_SORCERER_2024.length, 25)
assert.equal(findWildMagicSurge2024(20).low, 17)
assert.equal(tamedSurgeChoices2024().every((r) => !r.tamedExcluded), true)
assert.ok(tamedSurgeChoices2024().length < WILD_MAGIC_SURGES_SORCERER_2024.length)

const wings = restoreFeatureUseWithSorcery2024({
  featureId: 'dragon-wings',
  featureUsed: 1,
  sorceryMax: 14,
  sorceryUsed: 0,
})
assert.equal(wings.ok, true)
if (wings.ok) assert.equal(wings.cost, 3)

assert.equal(sorcerer2024Context({ rulesEdition: '2014', sorcererLevel: 5 }), null)

console.log('sorcerer2024Features selfcheck: ok')
