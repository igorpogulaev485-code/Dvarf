/**
 * SC-01 scene frame: weapon-first combat panel, turn actions, no carpet.
 * CMB-02: «Действия хода» = grouped tabs (not details «Ещё»).
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/uxSc01SceneFrame.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const attacks = readFileSync(join(here, 'PlayDeskAttacksCompact.tsx'), 'utf8')
const strip = readFileSync(join(here, 'TurnEconomyStrip.tsx'), 'utf8')
const sceneTurn = readFileSync(join(here, 'SceneTurnControls.tsx'), 'utf8')
const layout = readFileSync(join(here, 'minimalSheet/PlayDeskLayout.tsx'), 'utf8')
const effects = readFileSync(join(here, 'ActiveEffectsPanel.tsx'), 'utf8')
const hot = readFileSync(join(here, 'PlayDeskHotBar.tsx'), 'utf8')

const headIdx = attacks.indexOf('<h3>Атаки</h3>')
const turnIdx = attacks.indexOf('play-desk-turn-actions-wrap')
const listIdx = attacks.indexOf(
  'play-desk-compact__list play-desk-compact__list--dense',
  turnIdx,
)
assert.ok(headIdx >= 0, 'attacks head')
assert.ok(turnIdx > headIdx, 'turn actions after head')
assert.ok(listIdx > turnIdx, 'weapon list after turn actions')

assert.match(attacks, /Действия хода|play-desk-turn-actions/)
assert.doesNotMatch(attacks, /Ещё \/ Действия хода/)

// First-screen chrome (before opening a group) must not show cover carpet.
const firstScreen = attacks.slice(headIdx, turnIdx)
assert.doesNotMatch(firstScreen, /Без укрытия/)
assert.doesNotMatch(firstScreen, /Стабилизировать/)

// TurnEconomyCombatActions is the grouped control (not buried only in details).
assert.match(attacks, /TurnEconomyCombatActions/)
assert.match(attacks, /mode="all"/)
assert.doesNotMatch(attacks, /mode="everyTurn"/)

// After turn chrome: optional hero chips then weapons.
const afterTurn = attacks.slice(turnIdx, listIdx)
assert.match(afterTurn, /deskCombatFeatures/)
assert.doesNotMatch(afterTurn, /Без укрытия/)

// SCN-01: «Кубики на столе» / «Новый ход» in SceneTurnControls; not in attacks head.
assert.match(sceneTurn, /Кубики на столе/)
assert.match(sceneTurn, /Новый ход/)
assert.match(layout, /SceneTurnControls/)
assert.doesNotMatch(strip, /Кубики на столе/)
assert.equal(/play-desk-compact__dice-toggle/.test(attacks), false)
assert.doesNotMatch(strip, /TurnEconomyCombatActions/)
assert.doesNotMatch(strip, /<TurnEconomyChips/)
assert.match(hot, /play-desk__hot-item--states-empty|data-scn01-states-empty/)

assert.match(
  layout,
  /UIKIT-02: полоска навыков[\s\S]*?deskMode === 'combat'[\s\S]{0,200}?PlayDeskSkillStrip/,
)
assert.match(layout, /PlayDeskSkillStrip[\s\S]{0,240}?mobileOverflow=\{false\}/)
assert.doesNotMatch(
  layout,
  /mobile-combat-seg-stack[\s\S]{0,800}?PlayDeskSkillStrip/,
)

assert.match(effects, /if \(rows\.length === 0\) \{\s*return null/s)
assert.doesNotMatch(effects, /tone="muted">Нет активных/)
assert.doesNotMatch(hot, /Концентрация: —/)
assert.match(hot, /play-desk__hot-item--states/)
assert.match(hot, /play-desk__hot-cond-more/)
assert.match(hot, /HotConditionsDialog|onOpenConditions/)
assert.match(hot, /\{concentration \? \(/)

console.log('uxSc01SceneFrame.selfcheck: ok')
