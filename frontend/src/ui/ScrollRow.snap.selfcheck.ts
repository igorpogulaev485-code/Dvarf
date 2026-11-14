/**
 * HOT-01: capped end-spacer + limited end pull-back.
 * Run: npx tsx --tsconfig tsconfig.app.json src/ui/ScrollRow.snap.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SCROLL_ROW_END_SPACER_CAP_PX,
  computeEndSnapScrollLeft,
  computeEndSpacerPx,
  leftFadeOverlapPx,
  lastItemFullyVisible,
} from './ScrollRow'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'ScrollRow.tsx'),
  'utf8',
)
assert.match(src, /export function computeEndSpacerPx/)
assert.match(src, /SCROLL_ROW_END_SPACER_CAP_PX/)
assert.match(src, /naturalScrollWidth|scrollWidth with end-spacer forced/)
assert.match(src, /ui-scroll-row__end-spacer/)
assert.equal(SCROLL_ROW_END_SPACER_CAP_PX, 60)

assert.equal(computeEndSpacerPx(800, 858, 40), 0)
assert.equal(computeEndSpacerPx(1200, 858, 40), 48)
assert.equal(computeEndSpacerPx(1200, 858, 52), 60)

// 390-ish: full card under fade at max → pull back, last stays visible
{
  const pad = 52
  const clientWidth = 368
  const items = [
    { left: 6, width: 168 },
    { left: 178, width: 275 },
    { left: 457, width: 101 }, // Гнев бури — under fade at max
    { left: 562, width: 162 },
  ]
  const contentEnd = 562 + 162
  const spacer = 60
  const scrollWidth = contentEnd + spacer + 12 // padding fudge
  const max = scrollWidth - clientWidth
  const snapped = computeEndSnapScrollLeft(items, clientWidth, scrollWidth, pad)
  assert.ok(snapped <= max)
  assert.equal(lastItemFullyVisible(items, snapped, clientWidth), true)
  assert.equal(leftFadeOverlapPx(items, snapped, clientWidth, pad), 0)
}

console.log('ScrollRow.snap.selfcheck: ok')
