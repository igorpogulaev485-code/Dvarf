/**
 * HOT-01: HotConditionsDialog fits phone width (no page CSS overrides).
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/HotConditionsDialog.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, 'HotConditionsDialog.tsx'), 'utf8')
const css = readFileSync(join(here, '../../styles/10-number-hp-pads.css'), 'utf8')

assert.match(src, /size="wide"/)
assert.match(src, /hot-conditions__active/)
assert.match(src, /aria-label="Активные состояния"/)
assert.match(src, /Снять/)

assert.match(css, /\.hot-conditions\s*\{[\s\S]*?max-width:\s*100%/)
assert.match(css, /@media\s*\(max-width:\s*959px\)/)
assert.match(
  css,
  /hot-conditions__card\[aria-label='Истощение'\][\s\S]*?flex-direction:\s*column/,
)
assert.match(css, /\.hot-conditions__exh-select[\s\S]*?width:\s*100%/)
assert.match(css, /\.hot-conditions \.chip-row[\s\S]*?flex-wrap:\s*wrap/)

console.log('HotConditionsDialog.selfcheck: ok')
