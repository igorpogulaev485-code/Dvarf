/**
 * HOT-01: scroll snap helpers — end position clears fade over whole cards.
 * Run: npx tsx --tsconfig tsconfig.app.json src/ui/ScrollRow.snap.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'ScrollRow.tsx'),
  'utf8',
)
assert.match(src, /export function snapScrollLeft/)
assert.match(src, /prefer === 'end'/)
assert.match(src, /scrollPadStartPx/)
assert.match(src, /scroll-padding/)

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

console.log('ScrollRow.snap.selfcheck: ok')
