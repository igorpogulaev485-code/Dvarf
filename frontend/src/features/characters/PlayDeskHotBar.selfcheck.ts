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
assert.equal(src.includes('PlayDeskHotScrollWrap'), true)
assert.equal(MOBILE_HOT_PINNED_RESOURCE_COUNT, 2)
assert.equal(src.includes('mobileMoreOverflow'), true)
assert.equal(src.includes('play-desk__hot-more'), true)
assert.match(src, /Ещё \{/)
assert.match(src, /ResourcePips/)
assert.match(src, /shouldUseCompactResourceTrack/)

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../styles/20-pinned-spells.css'),
  'utf8',
)
assert.match(
  css,
  /\.play-desk__hot-wrap\s+\.play-desk__hot[\s\S]*?\{[\s\S]*?flex-wrap:\s*nowrap/,
)
assert.match(css, /\.play-desk__pips\s*\{[\s\S]*?gap:\s*4px/)
assert.match(css, /\.play-desk__pip\s*\{[\s\S]*?width:\s*18px/)
assert.match(css, /scroll-padding-inline/)
assert.match(css, /\.play-desk__hot-res-name\s*\{[\s\S]*?text-overflow:\s*ellipsis/)
assert.match(css, /\.play-desk__hot-label\s*\{[\s\S]*?font-size:\s*0\.78rem/)
assert.doesNotMatch(src, /is-expanded/)
assert.match(src, /title=\{label/)
const scrollSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../ui/ScrollRow.tsx'),
  'utf8',
)
assert.match(scrollSrc, /ui-scroll-row__edge/)
assert.equal(scrollSrc.includes('Прокрутить влево'), true)
assert.equal(scrollSrc.includes('Прокрутить вправо'), true)
const wrapSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'PlayDeskHotScrollWrap.tsx'),
  'utf8',
)
assert.match(wrapSrc, /play-desk__hot-wrap/)

console.log('PlayDeskHotBar.selfcheck: ok')
