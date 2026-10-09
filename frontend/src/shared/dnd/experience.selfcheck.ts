/** Run: npx tsx src/shared/dnd/experience.selfcheck.ts */
import {
  experienceAfterLevelUp,
  levelForTotalXp,
  xpProgress,
  xpToReachLevel,
} from './experience'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// Cumulative table sanity
assert(xpToReachLevel(5) === 6500, 'L5 floor')
assert(xpToReachLevel(6) === 14000, 'L6 threshold')

// 100 short of L6, DM awards 200 → total 14100, surplus 100
{
  const before = xpProgress(13900, 5)
  assert(before.remaining === 100, 'remaining 100')
  assert(before.surplus === 0, 'no surplus yet')
  const after = xpProgress(13900 + 200, 5)
  assert(after.xp === 14100, 'total xp')
  assert(after.remaining === 0, 'threshold met')
  assert(after.surplus === 100, 'surplus 100')
  assert(after.levelsReady === 1, 'one level ready')
}

// After level-up, surplus stays on the cumulative track
{
  const xp = experienceAfterLevelUp({ experience: 14100, newCharacterLevel: 6 })
  assert(xp === 14100, 'keep surplus')
  const prog = xpProgress(xp, 6)
  assert(prog.floor === 14000, 'new floor')
  assert(prog.nextThreshold === 23000, 'next is L7')
  assert(prog.remaining === 23000 - 14100, 'progress into L7 band')
}

// Milestone level-up without enough XP → bump to floor, never wipe higher
assert(
  experienceAfterLevelUp({ experience: 6500, newCharacterLevel: 6 }) === 14000,
  'milestone bump',
)
assert(
  experienceAfterLevelUp({ experience: 20000, newCharacterLevel: 6 }) === 20000,
  'keep ahead',
)

// Big award can unlock several levels on the track
assert(levelForTotalXp(2700) === 4, '2700 → L4')
assert(xpProgress(2700, 1).levelsReady === 3, 'L1 with 2700 → 3 ready')

console.log('experience.selfcheck: ok')
