/**
 * SC-02 combat map: А/Б/В на сцене «Бой», укрытие только в окне атаки.
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
/* Targets block must appear before modifiersSlot in the picker body */
const chipsIdx = picker.indexOf('combat-target-picker__chips')
const modsSlotIdx = picker.indexOf('{modifiersSlot}')
assert.ok(chipsIdx >= 0 && modsSlotIdx > chipsIdx, 'targets before modifiersSlot')

// No permanent cover / 9-check carpet on the combat tab body.
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

// Turn marks (В): outside «Ещё», only when combatActive.
assert.match(
  attacks,
  /turnEco\.combatActive \? \(\s*<TurnEconomyChips[\s\S]*?className="chip-row play-desk-turn-marks"/,
)
const moreIdx = attacks.indexOf('<details className="play-desk-attacks-more">')
const moreEnd = attacks.indexOf('</details>', moreIdx)
const moreBody = attacks.slice(moreIdx, moreEnd)
assert.doesNotMatch(moreBody, /TurnEconomyChips/)
assert.doesNotMatch(moreBody, /Без укрытия/)
assert.match(moreBody, /mode="more"/)

// Every-turn class chips (А) near weapons, not only inside «Ещё».
assert.match(attacks, /mode="everyTurn"/)
assert.match(actions, /mode === 'everyTurn'/)
assert.match(actions, /Хитрое действие/)
assert.match(actions, /Точное прицеливание/)
assert.match(actions, /Атака вторым оружием/)

// Every-turn block sits before weapon list.
const everyIdx = attacks.indexOf('mode="everyTurn"')
assert.ok(everyIdx > moreEnd && everyIdx < listIdx, 'everyTurn between Ещё and weapons')

console.log('uxSc02CombatMap.selfcheck: ok')
