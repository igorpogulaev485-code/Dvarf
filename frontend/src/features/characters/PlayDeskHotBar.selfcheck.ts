import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hotBarScrollEdges, MOBILE_HOT_PINNED_RESOURCE_COUNT } from './PlayDeskHotBar'

const fits = hotBarScrollEdges(0, 400, 400)
assert.equal(fits.canScrollLeft, false)
assert.equal(fits.canScrollRight, false)

const atStart = hotBarScrollEdges(0, 400, 900)
assert.equal(atStart.canScrollLeft, false)
assert.equal(atStart.canScrollRight, true)

const middle = hotBarScrollEdges(200, 400, 900)
assert.equal(middle.canScrollLeft, true)
assert.equal(middle.canScrollRight, true)

const atEnd = hotBarScrollEdges(500, 400, 900)
assert.equal(atEnd.canScrollLeft, true)
assert.equal(atEnd.canScrollRight, false)

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'PlayDeskHotBar.tsx'),
  'utf8',
)
// Desktop (≥960): scroll + edge arrows stay (owner override of UX A1).
assert.equal(src.includes('Прокрутить влево'), true)
assert.equal(src.includes('Прокрутить вправо'), true)
assert.equal(src.includes('play-desk__hot-wrap'), true)
// M-02 / M07: phone-only pinned + «Ещё N» (does not replace desktop scroll).
assert.equal(MOBILE_HOT_PINNED_RESOURCE_COUNT, 2)
assert.equal(src.includes('mobileMoreOverflow'), true)
assert.equal(src.includes('play-desk__hot-more'), true)
assert.match(src, /Ещё \{/)
assert.match(src, /play-desk__pips/)
assert.match(src, /shouldUseCompactResourceTrack/)

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../styles/20-pinned-spells.css'),
  'utf8',
)
assert.match(
  css,
  /\.play-desk--wide\s+\.play-desk__hot\s*\{[\s\S]*?flex-wrap:\s*nowrap/,
)
assert.match(css, /\.play-desk__pips\s*\{[\s\S]*?gap:\s*4px/)

console.log('PlayDeskHotBar.selfcheck: ok')
