import assert from 'node:assert/strict'
import {
  bardHasJackOfAllTrades2014,
  halfProficiencyFloor,
  jackOfAllTradesBonus2014,
} from './bard2014JackOfAllTrades.ts'

assert.equal(halfProficiencyFloor(2), 1)
assert.equal(halfProficiencyFloor(3), 1)
assert.equal(halfProficiencyFloor(5), 2)
assert.equal(bardHasJackOfAllTrades2014(1), false)
assert.equal(bardHasJackOfAllTrades2014(2), true)

assert.equal(
  jackOfAllTradesBonus2014({
    bardLevel: 2,
    proficiencyBonus: 2,
    includesProficiency: false,
  }),
  1,
)
assert.equal(
  jackOfAllTradesBonus2014({
    bardLevel: 2,
    proficiencyBonus: 2,
    includesProficiency: true,
  }),
  0,
)
assert.equal(
  jackOfAllTradesBonus2014({
    bardLevel: 1,
    proficiencyBonus: 2,
    includesProficiency: false,
  }),
  0,
)
assert.equal(
  jackOfAllTradesBonus2014({
    bardLevel: 5,
    proficiencyBonus: 3,
    includesProficiency: false,
  }),
  1,
)

console.log('bard2014JackOfAllTrades.selfcheck: ok')
