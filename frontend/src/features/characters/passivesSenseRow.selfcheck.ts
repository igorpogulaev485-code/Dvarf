/**
 * Passives grid: three glance cards + sense tiles (ТЗ/СЗ/ИЗ/ЧВ) in the same grid.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/passivesSenseRow.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { emptyAggregatedGearEffects, listGearNamedSenses } from './gearEffects.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const part5 = read('src/features/characters/minimalSheet/useSheetEditorPart5.tsx')
const darkvision = read('src/features/characters/DarkvisionSense.tsx')
const senseTile = read('src/features/characters/PassiveSenseTile.tsx')
const deskCss = read('src/styles/19-consumables-desk.css')
const mobileCss = read('src/styles/24-mobile-topbar.css')
const etalon = read('src/pages/UiKitEtalonPreviewPage.tsx')

// Sense tiles live inside the passives grid (not a separate plaque below).
assert.match(part5, /passive-grid passive-grid--desk/)
assert.match(part5, /DarkvisionSense/)
assert.match(part5, /PassiveSenseTile/)
assert.match(part5, /listGearNamedSenses/)
assert.match(
  part5,
  /passive-grid--desk[\s\S]*?<DarkvisionSense[\s\S]*?<\/div>\s*<\/div>/,
  'DarkvisionSense must be inside passive-grid, not a plaque below',
)
assert.doesNotMatch(part5, /className="darkvision-sense"/)

assert.match(darkvision, /passive-card--sense/)
assert.match(darkvision, />ТЗ</)
assert.match(darkvision, /Тёмное зрение:/)
assert.match(darkvision, /title=\{tip\}/)
assert.match(darkvision, /aria-label=\{tip\}/)
assert.match(darkvision, /DetailsMenu/)

assert.match(senseTile, /passive-card--sense/)
assert.match(senseTile, /title=\{tip\}/)
assert.match(senseTile, /aria-label=\{tip\}/)

// Desk keeps CSS grid; auto-fit so ТЗ/СЗ fit in the same flow (no flex rebuild).
assert.match(
  deskCss,
  /\.passive-grid--desk\s*\{[^}]*grid-template-columns:\s*repeat\(\s*auto-fit/,
)
assert.doesNotMatch(deskCss, /\.passive-grid--desk\s*\{[^}]*display:\s*flex/)
assert.match(
  mobileCss,
  /mobile-abil-page__passives[\s\S]*?grid-template-columns:\s*repeat\(\s*auto-fit/,
)
assert.doesNotMatch(
  mobileCss,
  /mobile-abil-page__passives[\s\S]*?\.passive-grid--desk\s*\{[^}]*display:\s*flex/,
)

assert.match(etalon, /passive-card--sense/)
assert.match(etalon, /Тёмное зрение: 60 фт/)
assert.doesNotMatch(etalon, /darkvision-sense__summary/)

// Named sense aggregation from gear
const empty = listGearNamedSenses(emptyAggregatedGearEffects())
assert.equal(empty.length, 0)

const withSenses = listGearNamedSenses({
  ...emptyAggregatedGearEffects(),
  senses: {
    blindsight: 10,
    truesight: 60,
    tremorsense: 30,
    darkvision: 120,
  },
})
assert.deepEqual(
  withSenses.map((s) => [s.short, s.ft]),
  [
    ['СЗ', 10],
    ['ИЗ', 60],
    ['ЧВ', 30],
  ],
)

console.log('passivesSenseRow.selfcheck: ok')
