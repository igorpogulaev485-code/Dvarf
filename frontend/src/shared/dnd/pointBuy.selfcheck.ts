/** Quick node selfcheck: npx tsx src/shared/dnd/pointBuy.selfcheck.ts */

import {
  POINT_BUY_BUDGET,
  applyStandardArrayByPriority,
  isPointBuyValid,
  isStandardArrayComplete,
  pointBuyCostForScore,
  pointBuyRemaining,
  pointBuyTotalCost,
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

console.log('pointBuy.selfcheck: ok')
