/** Run: npx tsx src/features/classicSheet/classicFitScale.selfcheck.ts */
import {
  CLASSIC_FIT_SCALE_MAX,
  CLASSIC_FIT_SCALE_MIN,
  classicScreenFitScale,
} from './classicFitScale.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(classicScreenFitScale(0, 816) === 1, 'zero available → 1')
assert(classicScreenFitScale(816, 0) === 1, 'zero sheet → 1')
assert(classicScreenFitScale(816, 816) === 1, 'exact fit → 1')

const wide = classicScreenFitScale(1600, 816)
assert(wide > 1 && wide <= CLASSIC_FIT_SCALE_MAX, `wide scale ${wide}`)

const narrow = classicScreenFitScale(300, 816)
assert(narrow < 1 && narrow >= CLASSIC_FIT_SCALE_MIN, `narrow scale ${narrow}`)

const tiny = classicScreenFitScale(100, 816)
assert(tiny === CLASSIC_FIT_SCALE_MIN, `tiny clamped ${tiny}`)

const huge = classicScreenFitScale(5000, 816)
assert(huge === CLASSIC_FIT_SCALE_MAX, `huge clamped ${huge}`)

console.log('classicFitScale.selfcheck: ok')
