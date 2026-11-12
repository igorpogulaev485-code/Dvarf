import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hotBarScrollEdges } from './PlayDeskHotBar'

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
assert.equal(src.includes('HOT_PINNED_RESOURCE_COUNT'), false, 'no pinned/overflow split')
assert.equal(src.includes('play-desk__hot-more'), false, 'no «Ещё» dropdown markup')
assert.equal(/Ещё\s*\{/.test(src), false, 'no «Ещё N» button label')
assert.equal(src.includes('Прокрутить влево'), true)
assert.equal(src.includes('Прокрутить вправо'), true)
assert.equal(src.includes('play-desk__hot-wrap'), true)

console.log('PlayDeskHotBar.selfcheck: ok')
