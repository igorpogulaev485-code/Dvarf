/**
 * Static contract for EnterOwnNumberDialog physical modes.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/enterOwnNumber.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, 'EnterOwnNumberDialog.tsx'), 'utf8')
const host = readFileSync(join(here, 'TurnEconomyDeskHost.tsx'), 'utf8')
const attacks = readFileSync(join(here, 'PlayDeskAttacksCompact.tsx'), 'utf8')
const actions = readFileSync(join(here, 'minimalSheet/sheetActions4.ts'), 'utf8')

assert.match(src, /mode === 'formula'/)
assert.match(src, /needsTwoD20/)
assert.match(src, /enter-own-d20-a/)
assert.match(src, /enter-own-d20-b/)
assert.match(src, /enter-own-bonus-dice/)
assert.match(src, /enter-own-face-/)
assert.match(src, /Доп\. кости — введите выпавшее/)

assert.match(host, /advantageMode/)
assert.match(host, /mode === 'formula'/)
assert.doesNotMatch(host, /rollBonusDiceParts/)

assert.match(attacks, /mode: 'formula'/)
assert.match(attacks, /Урон: \$\{attack\.name\}/)
assert.match(attacks, /advantageMode: attackMode/)

assert.match(actions, /advantageMode: mode/)
assert.match(actions, /offerPhysicalSpellFollowUp/)
assert.match(actions, /openEnterOwnNumber\(\{[\s\S]*saveTitle/)
assert.doesNotMatch(
  actions.slice(actions.indexOf('teSave?.diceOnTable'), actions.indexOf('teSave?.diceOnTable') + 400),
  /openTableSave\(saveTitle\)/,
)

console.log('enterOwnNumber.selfcheck: ok')
