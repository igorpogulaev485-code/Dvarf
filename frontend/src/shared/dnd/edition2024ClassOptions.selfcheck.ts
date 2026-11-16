/** P24-M02a+ options selfcheck — npm run selfcheck:p24-m02a-options */
import assert from 'node:assert/strict'
import {
  applyMetamagicSpend2024,
  metamagicKnownLimit2024,
  resolveBrutalStrike2024,
  resolveCunningStrike2024,
  resolveDivineSenseChannel2024,
  resolveRageExtend2024,
  warlockInvocationLimit2024,
} from './edition2024ClassOptions'

assert.equal(warlockInvocationLimit2024(5), 5)
assert.equal(metamagicKnownLimit2024(5), 2)
assert.equal(metamagicKnownLimit2024(10), 3)
assert.equal(metamagicKnownLimit2024(17), 4)

const meta = applyMetamagicSpend2024({
  known: ['quickened', 'careful'],
  optionId: 'quickened',
  sorceryPointsMax: 5,
  sorceryPointsUsed: 2,
})
assert.equal(meta.ok, true)
if (meta.ok) assert.equal(meta.cost, 2)

const cunning = resolveCunningStrike2024({
  optionIds: ['trip'],
  rogueLevel: 5,
  sneakAttackDice: 3,
  dexMod: 3,
  proficiencyBonus: 3,
})
assert.equal(cunning.ok, true)
if (cunning.ok) {
  assert.equal(cunning.diceSpent, 1)
  assert.equal(cunning.dc, 14)
}

const brutal = resolveBrutalStrike2024({
  optionIds: ['hamstring-blow'],
  barbarianLevel: 9,
  recklessUsed: true,
  attackHasAdvantage: true,
  attackHasDisadvantage: false,
})
assert.equal(brutal.ok, true)
if (brutal.ok) assert.equal(brutal.extraDamage, '1d10')

const rage = resolveRageExtend2024({
  active: true,
  roundsExtended: 0,
  reason: 'save',
})
assert.equal(rage.ok, true)

const sense = resolveDivineSenseChannel2024(1)
assert.equal(sense.ok, true)

console.log('edition2024ClassOptions.selfcheck: ok')
