/** Run: npx tsx src/features/classicSheet/classicFitScale.selfcheck.ts */
import {
  CLASSIC_FIT_SCALE_MAX,
  CLASSIC_FIT_SCALE_MIN,
  classicScreenFitScale,
  CLASSIC_SHEET_WIDTH_PX,
} from './classicFitScale.ts'
import { CLASSIC_PAGE_WIDTH_MM, CLASSIC_PAGE_WIDTH_PX } from './classicPageSize.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(CLASSIC_PAGE_WIDTH_MM === 210, 'A4 width mm')
assert(CLASSIC_SHEET_WIDTH_PX === CLASSIC_PAGE_WIDTH_PX, 'sheet width uses A4 px')
assert(classicScreenFitScale(0, CLASSIC_PAGE_WIDTH_PX) === 1, 'zero available → 1')
assert(classicScreenFitScale(CLASSIC_PAGE_WIDTH_PX, 0) === 1, 'zero sheet → 1')
assert(classicScreenFitScale(CLASSIC_PAGE_WIDTH_PX, CLASSIC_PAGE_WIDTH_PX) === 1, 'exact fit → 1')

const wide = classicScreenFitScale(1600, CLASSIC_PAGE_WIDTH_PX)
assert(wide > 1 && wide <= CLASSIC_FIT_SCALE_MAX, `wide scale ${wide}`)

const narrow = classicScreenFitScale(300, CLASSIC_PAGE_WIDTH_PX)
assert(narrow < 1 && narrow >= CLASSIC_FIT_SCALE_MIN, `narrow scale ${narrow}`)

const tiny = classicScreenFitScale(100, CLASSIC_PAGE_WIDTH_PX)
assert(tiny === CLASSIC_FIT_SCALE_MIN, `tiny clamped ${tiny}`)

const huge = classicScreenFitScale(5000, CLASSIC_PAGE_WIDTH_PX)
assert(huge === CLASSIC_FIT_SCALE_MAX, `huge clamped ${huge}`)

console.log('classicFitScale.selfcheck: ok')
