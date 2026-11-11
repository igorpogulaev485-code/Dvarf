/**
 * Q6 multiclass known vs prepare copy.
 * Run: npx tsx frontend/src/shared/dnd/spellAccessUi.selfcheck.ts
 */

import {
  multiclassSpellAccessHint,
  spellLearnModeBlurbRu,
  spellLearnModeLabelRu,
  spellAccessUiCopy,
} from './spellAccessUi.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(spellLearnModeLabelRu('known') === 'Известные', 'known label')
assert(spellLearnModeLabelRu('prepared_list') === 'Подготовка', 'prep label')
assert(spellLearnModeLabelRu('spellbook') === 'Книга', 'book label')
assert(spellLearnModeBlurbRu('known').includes('сразу готовы'), 'known blurb')

const single = multiclassSpellAccessHint([{ labelRu: 'Бард', mode: 'known' }])
assert(single.includes('Бард'), 'single names class')
assert(!single.includes('Мультикласс'), 'single is not MC banner')

const mc = multiclassSpellAccessHint([
  { labelRu: 'Бард', mode: 'known' },
  { labelRu: 'Жрец', mode: 'prepared_list' },
])
assert(mc.includes('Мультикласс'), 'MC banner')
assert(mc.includes('Известные'), 'MC known mode')
assert(mc.includes('Подготовка'), 'MC prepare mode')
assert(mc.includes('Бард') && mc.includes('Жрец'), 'MC both classes')
assert(mc.includes('Ячейки общие'), 'MC shared slots note')

const knownCopy = spellAccessUiCopy('known', 'create')
assert(!knownCopy.usesPrepare, 'known has no prepare dialog')
assert(knownCopy.poolLabel === 'Известно', 'known pool')

const prepCopy = spellAccessUiCopy('prepared_list', 'sheet')
assert(prepCopy.readyLabel === 'Подготовлено', 'prep ready')

console.log('spellAccessUi.selfcheck: all ok')
