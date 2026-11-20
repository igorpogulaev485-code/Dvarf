/**
 * Static contract for EnterOwnNumberDialog physical modes.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/enterOwnNumber.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formulaHintText } from './EnterOwnNumberDialog.tsx'
import { parseDamageExpression } from './deskRolls.ts'

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
assert.match(src, /primaryDisabled=\{!canConfirm\}/)
assert.match(src, /Выпало на к20/)
assert.doesNotMatch(src, /Выпало на d20/)
assert.match(src, /У тебя преимущество/)
assert.match(src, /Дополнительные кости — введи, что выпало на каждой/)
assert.match(src, /Модификатор .+ добавим сами/)

const parsed = parseDamageExpression('1к6+2 дробящий')
assert.ok(parsed)
assert.equal(parsed!.count, 1)
assert.equal(parsed!.sides, 6)
assert.equal(parsed!.modifier, 2)
const hint = formulaHintText('1к6+2 дробящий', parsed)
assert.match(hint, /Брось к6 и введи, что выпало/)
assert.match(hint, /Модификатор \+2 добавим сами/)
assert.doesNotMatch(hint, /Формула:/)
assert.doesNotMatch(hint, /введите \d+×/)

assert.match(host, /advantageMode/)
assert.match(host, /mode === 'formula'/)
assert.doesNotMatch(host, /rollBonusDiceParts/)

assert.match(attacks, /mode: 'formula'/)
assert.match(attacks, /title: `Урон: \$\{attack\.name\}`/)
assert.doesNotMatch(
  attacks.slice(
    attacks.indexOf('// Physical: ввод граней'),
    attacks.indexOf('// Physical: ввод граней') + 500,
  ),
  /Урон: \$\{attack\.name\}\$\{typeBit\}/,
)
assert.match(attacks, /formula: `\$\{expr\}\$\{typeBit\}`/)
assert.match(attacks, /advantageMode: attackMode/)

assert.match(actions, /advantageMode: mode/)
assert.match(actions, /offerPhysicalSpellFollowUp/)
assert.match(actions, /openEnterOwnNumber\(\{[\s\S]*saveTitle/)
assert.doesNotMatch(
  actions.slice(actions.indexOf('teSave?.diceOnTable'), actions.indexOf('teSave?.diceOnTable') + 400),
  /openTableSave\(saveTitle\)/,
)

console.log('enterOwnNumber.selfcheck: ok')
