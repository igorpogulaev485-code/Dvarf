/**
 * HOT-01: scroll snap helpers — end position clears fade over whole cards.
 * Run: npx tsx --tsconfig tsconfig.app.json src/ui/ScrollRow.snap.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeEndSnapScrollLeft } from './ScrollRow'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'ScrollRow.tsx'),
  'utf8',
)
assert.match(src, /export function snapScrollLeft/)
assert.match(src, /export function computeEndSnapScrollLeft/)
assert.match(src, /prefer === 'end'/)
assert.match(src, /scrollPadStartPx/)
assert.match(src, /SCROLL_ROW_FADE_CLEARANCE_PX/)

const css = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '../styles/20-pinned-spells.css',
  ),
  'utf8',
)
assert.match(css, /padding-inline-start:\s*6px/)
assert.match(css, /padding-inline-end:\s*48px/)
assert.match(css, /scroll-padding-inline:\s*40px/)
assert.match(css, /scroll-snap-type:\s*none/)
assert.doesNotMatch(css, /(?<!scroll-)padding-inline:\s*40px/)

const mobile = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../styles/22-mobile-shell.css'),
  'utf8',
)
assert.match(
  mobile,
  /\.play-desk--mobile\s+\.play-desk__hot-wrap\s+\.play-desk__hot\s*\{[\s\S]*?padding-inline-start:\s*6px/,
)
assert.match(mobile, /padding-inline-end:\s*60px/)
assert.match(mobile, /scroll-padding-inline:\s*52px/)
assert.doesNotMatch(mobile, /padding:\s*4px\s+52px/)

// Regression: 1280-end — card flush at max under fade must pull back
// even when last card would extend past the right rim (old lastRight reject).
{
  const pad = 40
  const clientWidth = 858
  const scrollWidth = 858 + 479
  const items = [
    { left: 0, width: 168 },
    { left: 174, width: 275 },
    { left: 477, width: 182 }, // «Бардовское вдохновение» — under fade at max
    { left: 665, width: 142 },
    { left: 813, width: 153 },
    { left: 971, width: 171 },
    { left: 1149, width: 182 },
  ]
  const snapped = computeEndSnapScrollLeft(items, clientWidth, scrollWidth, pad)
  assert.ok(snapped < 479, `expected pull-back from max, got ${snapped}`)
  assert.equal(snapped, 477 - pad - 8)
  // Substantial card must clear fade
  assert.ok(477 >= snapped + pad - 1)
}

// Remnant under fade is OK — stay at max when first visible is thin
{
  const pad = 40
  const clientWidth = 400
  const scrollWidth = 800
  const max = 400
  const items = [
    { left: max - 20, width: 50 }, // thin remnant past viewLeft
    { left: max + pad + 4, width: 120 }, // clears fade
    { left: 700, width: 100 },
  ]
  const snapped = computeEndSnapScrollLeft(items, clientWidth, scrollWidth, pad)
  assert.equal(snapped, max)
}

console.log('ScrollRow.snap.selfcheck: ok')
