/** Quick node selfcheck: npx tsx src/shared/dnd/pointBuy.selfcheck.ts */

import {
  POINT_BUY_BUDGET,
  applyStandardArrayByPriority,
  isPointBuyValid,
  isRollScoresValid,
  isStandardArrayComplete,
  pointBuyCostForScore,
  pointBuyRemaining,
  pointBuyTotalCost,
  roll4d6DropLowest,
  rollAllAbilities,
} from './pointBuy'

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message)
}

assert(pointBuyCostForScore(8) === 0, '8 costs 0')
assert(pointBuyCostForScore(13) === 5, '13 costs 5')
assert(pointBuyCostForScore(14) === 7, '14 costs 7')
assert(pointBuyCostForScore(15) === 9, '15 costs 9')

const rogue = applyStandardArrayByPriority('rogue')
assert(rogue.dex === 15, 'rogue priority puts 15 in dex')
assert(isStandardArrayComplete(rogue), 'standard array complete')
assert(isPointBuyValid(rogue), 'standard array is valid point buy')
assert(pointBuyTotalCost(rogue) === POINT_BUY_BUDGET, 'uses full 27')
assert(pointBuyRemaining(rogue) === 0, 'remaining 0')

for (let i = 0; i < 40; i += 1) {
  const detail = roll4d6DropLowest()
  assert(detail.dice.length === 4, '4 dice')
  assert(detail.dice.every((n) => n >= 1 && n <= 6), 'd6 range')
  assert(detail.dice[detail.dropIndex] === detail.dropped, 'dropIndex matches')
  assert(detail.dice.includes(detail.dropped), 'dropped is one of dice')
  const kept = detail.dice.filter((_, i) => i !== detail.dropIndex)
  assert(
    kept.reduce((s, n) => s + n, 0) === detail.total,
    'total drops lowest',
  )
  assert(detail.total >= 3 && detail.total <= 18, 'total in 3–18')
}

const rolled = rollAllAbilities()
assert(isRollScoresValid(rolled.scores), 'full roll set valid')

console.log('pointBuy.selfcheck: ok')
