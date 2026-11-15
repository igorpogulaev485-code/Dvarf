/**
 * SC-02 combat map: turn marks + grouped actions; cover only in attack dialogs.
 * CMB-02: everyTurn row removed; chips live inside Действие/Бонусное/Реакция.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/uxSc02CombatMap.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const attacks = readFileSync(join(here, 'PlayDeskAttacksCompact.tsx'), 'utf8')
const picker = readFileSync(join(here, 'CombatTargetPicker.tsx'), 'utf8')
const enter = readFileSync(join(here, 'EnterOwnNumberDialog.tsx'), 'utf8')
const mods = readFileSync(join(here, 'TargetModifiersFields.tsx'), 'utf8')
const actions = readFileSync(join(here, 'TurnEconomyCombatActions.tsx'), 'utf8')

assert.match(mods, /\+ Укрытие \/ состояние цели/)
assert.match(picker, /modifiersSlot/)
assert.match(picker, /combat-target-picker__chips/)
assert.match(picker, /Атаковать \$\{selected\.name\}/)
assert.match(picker, /rememberKey/)
assert.match(enter, /modifiersSlot/)
assert.match(attacks, /targetModifiersSlot/)
assert.match(attacks, /modifiersSlot=\{targetModifiersSlot\}/)
assert.match(attacks, /modifiersSlot=\{enterNumberCtx \? targetModifiersSlot/)
assert.match(attacks, /rememberKey=\{/)
const chipsIdx = picker.indexOf('combat-target-picker__chips')
const modsSlotIdx = picker.indexOf('{modifiersSlot}')
assert.ok(chipsIdx >= 0 && modsSlotIdx > chipsIdx, 'targets before modifiersSlot')

const headIdx = attacks.indexOf('<h3>Атаки</h3>')
const listIdx = attacks.indexOf(
  'play-desk-compact__list play-desk-compact__list--dense',
  headIdx,
)
assert.ok(headIdx >= 0 && listIdx > headIdx, 'attacks head → list')
const tabChrome = attacks.slice(headIdx, listIdx)
assert.doesNotMatch(tabChrome, /Без укрытия/)
assert.doesNotMatch(tabChrome, /Цель уклоняется/)
assert.doesNotMatch(tabChrome, /Цель опрокинута/)
assert.doesNotMatch(tabChrome, /Цель опутана/)
assert.doesNotMatch(tabChrome, /Паралич\/без сознания/)
assert.doesNotMatch(tabChrome, /Источник страха виден/)
assert.doesNotMatch(tabChrome, /Невидимый обнаружен/)
assert.doesNotMatch(tabChrome, /Цель под водой/)
assert.doesNotMatch(tabChrome, /Цель верхом/)
assert.doesNotMatch(tabChrome, /Силовой удар −5\/\+10/)

assert.doesNotMatch(attacks, /TurnEconomyChips/)
assert.match(attacks, /play-desk-turn-actions-wrap/)
assert.match(attacks, /mode="all"/)
assert.doesNotMatch(attacks, /mode="everyTurn"/)
assert.doesNotMatch(attacks, /mode="more"/)

assert.match(actions, /play-desk-turn-actions__tab/)
assert.match(actions, /play-desk-turn-actions__mark/)
assert.match(actions, /Снять отметку/)
assert.match(actions, /Хитрое действие/)
assert.match(actions, /Точное прицеливание/)
assert.match(actions, /Атака вторым оружием/)
assert.match(actions, /mode === 'everyTurn'/)

console.log('uxSc02CombatMap.selfcheck: ok')
