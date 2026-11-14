/** Quick node selfcheck: npx tsx src/ui/resourceTrackDisplay.selfcheck.ts */
import {
  RESOURCE_PIP_INLINE_MAX,
  shouldUseCompactResourceTrack,
} from './resourceTrackDisplay'

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message)
}

assert(RESOURCE_PIP_INLINE_MAX === 5, 'SCN-01 threshold must stay 5')
assert(!shouldUseCompactResourceTrack(0), '0 → pips off / null upstream')
assert(!shouldUseCompactResourceTrack(5), 'exactly 5 still pips')
assert(shouldUseCompactResourceTrack(6), '6+ compact')
assert(shouldUseCompactResourceTrack(25), 'Lay on Hands L5 compact')
assert(shouldUseCompactResourceTrack(45), 'Lay on Hands L9 compact')
assert(shouldUseCompactResourceTrack(100), 'Lay on Hands L20 compact')
assert(!shouldUseCompactResourceTrack(Number.NaN), 'NaN → not compact')

console.log('resourceTrackDisplay.selfcheck ok')
