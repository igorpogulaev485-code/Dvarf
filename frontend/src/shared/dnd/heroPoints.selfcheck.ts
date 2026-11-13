/** npx --yes tsx src/shared/dnd/heroPoints.selfcheck.ts */
import {
  ensureHeroPointsResource,
  heroPointsMaxForLevel,
  heroPointsRemaining,
  refreshHeroPointsOnLevelUp,
  spendHeroPoint,
} from './heroPoints.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(heroPointsMaxForLevel(1) === 5, 'L1')
assert(heroPointsMaxForLevel(5) === 7, 'L5')
assert(heroPointsMaxForLevel(10) === 10, 'L10')

let res = ensureHeroPointsResource([], 1, true)
assert(heroPointsRemaining(res) === 5, 'grant 5 at L1')
const spent = spendHeroPoint(res)
assert(spent.ok && heroPointsRemaining(spent.resources) === 4, 'spend one')
res = refreshHeroPointsOnLevelUp(spent.resources, 4, true)
assert(heroPointsRemaining(res) === 7, 'level-up to 4 → 7, spent burned')
res = ensureHeroPointsResource([], 5, true)
assert(heroPointsRemaining(res) === 7, 'existing char L5 first enable → 7')
assert(ensureHeroPointsResource([], 1, false).length === 0, 'disabled → no grant')

console.log('heroPoints.selfcheck: ok')
