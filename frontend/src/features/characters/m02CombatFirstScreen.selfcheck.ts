/**
 * M-02 combat first screen (M04 / M06 / M07 / M13).
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/m02CombatFirstScreen.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MOBILE_HOT_PINNED_RESOURCE_COUNT } from './PlayDeskHotBar'
import { MOBILE_SKILL_PINNED_COUNT } from './PlayDeskSkillStrip'

const here = dirname(fileURLToPath(import.meta.url))
const vitals = readFileSync(join(here, 'MobileVitalsBar.tsx'), 'utf8')
const attacks = readFileSync(join(here, 'PlayDeskAttacksCompact.tsx'), 'utf8')
const sceneTurn = readFileSync(join(here, 'SceneTurnControls.tsx'), 'utf8')
const skills = readFileSync(join(here, 'PlayDeskSkillStrip.tsx'), 'utf8')
const hot = readFileSync(join(here, 'PlayDeskHotBar.tsx'), 'utf8')
const layout = readFileSync(join(here, 'minimalSheet/PlayDeskLayout.tsx'), 'utf8')
const shell = readFileSync(join(here, '../../styles/22-mobile-shell.css'), 'utf8')

// M04 / Q1 — default collapsed when localStorage key missing (v2 key)
assert.match(vitals, /mobileVitals\.collapsed\.v2/)
assert.match(vitals, /if \(raw === null\) return true/)
assert.match(vitals, /return true/)

// M04 — bottom padding clears Bottom Scene Nav
assert.match(shell, /padding-bottom:\s*calc\(72px/)

// M13 / SCN-01 — one «Кубики на столе» in SceneTurnControls; attacks head drops duplicate
assert.match(sceneTurn, /Кубики на столе/)
assert.match(layout, /SceneTurnControls/)
assert.equal(
  /play-desk-compact__dice-toggle/.test(attacks),
  false,
  'attacks head must not duplicate dice toggle',
)

// UIKIT-02: skills + resources — one row + ScrollRow (mobileOverflow=false)
assert.equal(MOBILE_SKILL_PINNED_COUNT, 3)
assert.match(skills, /mobileOverflow/)
assert.match(skills, /PlayDeskHotScrollWrap|play-desk__hot--skills/)
assert.match(layout, /mobileOverflow=\{false\}/)
assert.match(shell, /play-desk__hot--skills/)

assert.equal(MOBILE_HOT_PINNED_RESOURCE_COUNT, 2)
assert.match(hot, /mobileMoreOverflow/)
assert.match(layout, /mobileMoreOverflow=\{false\}/)
assert.match(shell, /\.play-desk--mobile\s+\.play-desk__pip[\s\S]*?min-width:\s*18px/)
const scrollRow = readFileSync(
  join(here, '../../ui/ScrollRow.tsx'),
  'utf8',
)
assert.match(scrollRow, /Прокрутить вправо/)

console.log('m02CombatFirstScreen.selfcheck: ok')
