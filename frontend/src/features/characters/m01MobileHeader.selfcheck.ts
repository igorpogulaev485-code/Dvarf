/**
 * M-01 mobile header contracts (M01/M02/M03/M05/M10).
 * Run: npx tsx src/features/characters/m01MobileHeader.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatJumpFaceLabel } from '../../shared/dnd/jumpDistance'

const here = dirname(fileURLToPath(import.meta.url))
const vitals = readFileSync(join(here, 'MobileVitalsBar.tsx'), 'utf8')
const needs = readFileSync(join(here, 'NeedsSetupIndicator.tsx'), 'utf8')
const shell = readFileSync(
  join(here, '../../styles/22-mobile-shell.css'),
  'utf8',
)
const vitalsCss = readFileSync(
  join(here, '../../styles/23-mobile-vitals.css'),
  'utf8',
)

// M01 / Q2 — combat hot wrap stacks into two rows on phone
assert.match(shell, /\.play-desk__hot-wrap \.play-desk__hot/)
assert.match(shell, /flex-wrap:\s*wrap/)
assert.match(shell, /flex:\s*1 1 100%/)

// M02 / Q3 — collapsed: name + expand, no СИЛ, death marks, icon badge
assert.match(vitals, /mobile-vitals__collapse-who/)
assert.match(vitals, /mobile-vitals__expand/)
assert.match(vitals, /mobile-vitals__collapse-marks/)
assert.match(vitals, /iconOnly/)
assert.equal(
  /className="mobile-vitals__collapse-abil"/.test(vitals),
  false,
  'СИЛ button must leave collapsed header',
)
assert.match(vitalsCss, /\.mobile-vitals__expand[\s\S]*?min-width:\s*44px/)

// M03 — sheet presentation for needs-setup on phone
assert.match(needs, /asSheet/)
assert.match(needs, /Dialog/)
assert.match(vitals, /asSheet/)

// M05 / Q4 — name on its own full-width row
assert.match(vitals, /mobile-vitals__name-row/)
assert.match(vitalsCss, /\.mobile-vitals__name-row/)

// M10 — jump chip says «прыжок»
const jump = formatJumpFaceLabel()
assert.ok(jump.toLowerCase().includes('прыжок'), jump)
assert.ok(jump.includes('дл'), jump)

console.log('m01MobileHeader.selfcheck: ok')
