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
const strip = readFileSync(join(here, 'TurnEconomyStrip.tsx'), 'utf8')
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

// M13 — one «Кубики на столе» (strip keeps it; attacks head drops duplicate)
assert.match(strip, /Кубики на столе/)
assert.equal(
  /play-desk-compact__dice-toggle/.test(attacks),
  false,
  'attacks head must not duplicate dice toggle',
)

// M06 — skill wrap + «Ещё»
assert.equal(MOBILE_SKILL_PINNED_COUNT, 4)
assert.match(skills, /mobileOverflow/)
assert.match(skills, /Ещё \{/)
assert.match(layout, /mobileOverflow=\{!model\.isPlayDesk\}/)
assert.match(shell, /play-desk__hot--skills-mobile|play-desk__hot--skills/)
assert.match(shell, /grid-template-columns:\s*repeat\(2/)

// M07 — mobile resources pinned + «Ещё N»; desktop scroll untouched in code path
assert.equal(MOBILE_HOT_PINNED_RESOURCE_COUNT, 2)
assert.match(hot, /mobileMoreOverflow/)
assert.match(hot, /Ещё \{/)
assert.match(layout, /mobileMoreOverflow=\{!model\.isPlayDesk\}/)
assert.match(hot, /Прокрутить вправо/)
assert.match(shell, /\.play-desk__pip[\s\S]*?min-width:\s*44px/)

console.log('m02CombatFirstScreen.selfcheck: ok')
