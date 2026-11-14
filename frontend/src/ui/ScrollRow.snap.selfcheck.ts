/**
 * HOT-01: scroll snap helpers — end = true max + trailing spacer.
 * Run: npx tsx --tsconfig tsconfig.app.json src/ui/ScrollRow.snap.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  computeEndSnapScrollLeft,
  computeEndSpacerPx,
  lastItemFullyVisible,
  leftFadeOverlapPx,
} from './ScrollRow'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'ScrollRow.tsx'),
  'utf8',
)
assert.match(src, /export function snapScrollLeft/)
assert.match(src, /export function computeEndSnapScrollLeft/)
assert.match(src, /export function computeEndSpacerPx/)
assert.match(src, /ui-scroll-row__end-spacer/)
assert.match(src, /prefer === 'end'/)
assert.match(src, /scrollPadStartPx/)

const css = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '../styles/20-pinned-spells.css',
  ),
  'utf8',
)
assert.match(css, /padding-inline:\s*6px/)
assert.match(css, /scroll-padding-inline:\s*40px/)
assert.match(css, /scroll-snap-type:\s*none/)
assert.doesNotMatch(css, /(?<!scroll-)padding-inline:\s*40px/)
assert.doesNotMatch(css, /padding-inline-end:\s*48px/)

const mobile = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../styles/22-mobile-shell.css'),
  'utf8',
)
assert.match(
  mobile,
  /\.play-desk--mobile\s+\.play-desk__hot-wrap\s+\.play-desk__hot\s*\{[\s\S]*?padding:\s*4px\s+6px/,
)
assert.match(mobile, /scroll-padding-inline:\s*52px/)
assert.doesNotMatch(mobile, /padding:\s*4px\s+52px/)
assert.doesNotMatch(mobile, /padding-inline-end:\s*60px/)

const tokens = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../styles/01-tokens-base.css'),
  'utf8',
)
assert.match(tokens, /\.ui-scroll-row__end-spacer/)

// End snap is true max — never pull back
{
  const items = [
    { left: 0, width: 168 },
    { left: 477, width: 182 },
    { left: 1149, width: 182 },
  ]
  assert.equal(computeEndSnapScrollLeft(items, 858, 858 + 479, 40), 479)
}

// Grow spacer from real max (1440-ish): bardic under fade → push forward
{
  const pad = 40
  const clientWidth = 1010
  const items = [
    { left: 0, width: 168 },
    { left: 174, width: 275 },
    { left: 477, width: 182 },
    { left: 665, width: 142 },
    { left: 813, width: 153 },
    { left: 971, width: 171 },
    { left: 1149, width: 182 },
  ]
  // Real max with spacer=110 was 443; bardic still 6px under fade
  const spacer = computeEndSpacerPx(items, clientWidth, 443, 110, pad)
  assert.ok(spacer > 110, `expected grow from 110, got ${spacer}`)
  const max = 443 + (spacer - 110)
  assert.equal(leftFadeOverlapPx(items, max, clientWidth, pad), 0)
  assert.equal(lastItemFullyVisible(items, max, clientWidth), true)
}

console.log('ScrollRow.snap.selfcheck: ok')
