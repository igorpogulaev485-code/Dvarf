import { xpCrossedLevelThreshold, xpReadyToLevel } from './experience'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(message)
    process.exit(1)
  }
}

assert(!xpReadyToLevel(23_000, 7), 'level 7 at its floor is not ready for 8')
assert(xpReadyToLevel(34_000, 7), 'exactly the next threshold is ready')
assert(xpReadyToLevel(34_169, 7), 'xp past the threshold is ready')
assert(!xpReadyToLevel(34_169, 8), 'level 8 still needs 48 000')
assert(!xpReadyToLevel(1_000_000, 20), 'level 20 has no next threshold')

assert(xpCrossedLevelThreshold(33_999, 34_000, 7), 'crossing the threshold opens level-up')
assert(!xpCrossedLevelThreshold(34_000, 35_000, 7), 'extra xp after the threshold is not a new cross')
assert(!xpCrossedLevelThreshold(100, 200, 7), 'still short of the threshold')
assert(!xpCrossedLevelThreshold(1_000_000, 1_000_001, 20), 'level 20 never crosses')

console.log('xp level gate ok')
