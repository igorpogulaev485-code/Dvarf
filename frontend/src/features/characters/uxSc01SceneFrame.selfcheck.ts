/**
 * SC-01 scene frame: weapon-first combat panel, «Ещё» slot, no carpet.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/uxSc01SceneFrame.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const attacks = readFileSync(join(here, 'PlayDeskAttacksCompact.tsx'), 'utf8')
const strip = readFileSync(join(here, 'TurnEconomyStrip.tsx'), 'utf8')
const layout = readFileSync(join(here, 'minimalSheet/PlayDeskLayout.tsx'), 'utf8')
const effects = readFileSync(join(here, 'ActiveEffectsPanel.tsx'), 'utf8')
const hot = readFileSync(join(here, 'PlayDeskHotBar.tsx'), 'utf8')

const headIdx = attacks.indexOf('<h3>Атаки</h3>')
const detailsIdx = attacks.indexOf('<details className="play-desk-attacks-more">')
const detailsEndIdx = attacks.indexOf('</details>', detailsIdx)
const listIdx = attacks.indexOf(
  'play-desk-compact__list play-desk-compact__list--dense',
  detailsEndIdx,
)
assert.ok(headIdx >= 0, 'attacks head')
assert.ok(detailsIdx > headIdx, '«Ещё» after head')
assert.ok(detailsEndIdx > detailsIdx, '«Ещё» closes')
assert.ok(listIdx > detailsEndIdx, 'weapon list after «Ещё»')

assert.match(attacks, /Ещё \/ Действия хода/)

// First-screen chrome (before opening «Ещё») must not show cover / PHB carpet.
const firstScreen = attacks.slice(headIdx, detailsIdx)
assert.doesNotMatch(firstScreen, /Без укрытия/)
assert.doesNotMatch(firstScreen, /Стабилизировать/)
assert.doesNotMatch(firstScreen, /TurnEconomyCombatActions/)
assert.doesNotMatch(firstScreen, /TurnEconomyChips/)

// Inside «Ещё»: cover row + combat actions stay available.
const moreBody = attacks.slice(detailsIdx, detailsEndIdx)
assert.match(moreBody, /Без укрытия/)
assert.match(moreBody, /TurnEconomyCombatActions/)
assert.match(moreBody, /turnEco\.combatActive\s*\?\s*\(\s*<TurnEconomyChips/)

// After «Ещё»: optional hero chips then weapons (эталон a2ea6e18).
const afterMore = attacks.slice(detailsEndIdx, listIdx)
assert.match(afterMore, /deskCombatFeatures/)
assert.doesNotMatch(afterMore, /Без укрытия/)
assert.doesNotMatch(afterMore, /TurnEconomyCombatActions/)

// M-02: one «Кубики на столе» in TurnEconomyStrip; not in attacks head.
assert.match(strip, /Кубики на столе/)
assert.equal(/play-desk-compact__dice-toggle/.test(attacks), false)
assert.doesNotMatch(strip, /TurnEconomyCombatActions/)
assert.doesNotMatch(strip, /<TurnEconomyChips/)

// Desktop combat: no skill strip (phone keeps it).
assert.match(
  layout,
  /!model\.isPlayDesk && model\.draft\.sheetUi\.deskMode === 'combat'/,
)

// Empty effects / hot empties collapsed.
assert.match(effects, /if \(rows\.length === 0\) \{\s*return null/s)
assert.doesNotMatch(effects, /tone="muted">Нет активных/)
assert.doesNotMatch(hot, /Концентрация: —/)
assert.match(hot, /conditionsOn \? `Состояния: \$\{conditionsLabel\}` : 'Состояния'/)
assert.match(hot, /\{concentration \? \(/)

console.log('uxSc01SceneFrame.selfcheck: ok')
