/**
 * P24-02: Heroic Inspiration spend / grant / transfer / reroll.
 * Run: npx --yes tsx src/shared/dnd/heroicInspiration.selfcheck.ts
 */
import {
  canSpendHeroicInspiration,
  grantHeroicInspiration,
  heroicInspirationMax,
  resolveHeroicReroll,
  spendHeroicInspiration,
  usesHeroicInspiration,
} from './heroicInspiration.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(usesHeroicInspiration('2024'), '2024 uses heroic')
assert(!usesHeroicInspiration('2014'), '2014 does not')

assert(canSpendHeroicInspiration(true), 'can spend bool')
assert(!canSpendHeroicInspiration(false), 'cannot spend empty')

{
  const spent = spendHeroicInspiration(true)
  assert(spent.ok && spent.next === false, 'spend clears bool')
  const fail = spendHeroicInspiration(false)
  assert(!fail.ok, 'spend empty fails')
}

{
  const g = grantHeroicInspiration({ current: false })
  assert(g.ok && g.next === true, 'grant empty → true')
  const full = grantHeroicInspiration({ current: true })
  assert(!full.ok, 'second grant without ally fails')
  const xfer = grantHeroicInspiration({
    current: true,
    allyIdWithout: 'ally-1',
  })
  assert(xfer.ok && xfer.transferred === true && xfer.allyId === 'ally-1', 'transfer')
}

{
  assert(heroicInspirationMax(false, 3) === 1, 'book max 1')
  assert(heroicInspirationMax(true, 3) === 3, 'stack max 3')
  const stacked = grantHeroicInspiration({
    current: 1,
    stackEnabled: true,
    stackMax: 3,
  })
  assert(stacked.ok && stacked.next === 2, 'stack to 2')
}

{
  const rr = resolveHeroicReroll({ previous: 3, sides: 20, rng: () => 0.99 })
  assert(rr.next === 20 && rr.previous === 3, 'reroll uses new face')
}

console.log('heroicInspiration.selfcheck: ok')
