/**
 * SOC-01 selfcheck: npx tsx --tsconfig tsconfig.app.json src/features/characters/socialScene.selfcheck.ts
 */
import { EMPTY_PHYSIQUE, type PhysiqueFields } from './identity'
import {
  createTextPart,
  type TextBlock,
} from './textBlocks'
import {
  APPEARANCE_KEY,
  appearancePlain,
  blockHasPlayerContent,
  blockViewPreview,
  countFilledPhysique,
  emptyPersonalityBlocks,
  emptyPersonalityLine,
  filterChipVisible,
  isPhysiqueValueFilled,
  listBlocksForFilter,
  physiqueGlancePreview,
  physiqueHasContent,
  visibleSocialFilters,
} from './socialScene'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

function block(
  key: string,
  label: string,
  value: string,
  opts?: Partial<TextBlock>,
): TextBlock {
  return {
    key,
    defaultLabel: label,
    customLabel: null,
    isHidden: false,
    value,
    isCustom: false,
    resourceId: null,
    parts: [createTextPart(value)],
    ...opts,
  }
}

const emptySheet: TextBlock[] = [
  block('personality', 'Черты характера', ''),
  block('ideals', 'Идеалы', ''),
  block('bonds', 'Привязанности', ''),
  block('flaws', 'Слабости', ''),
  block(APPEARANCE_KEY, 'Внешность', ''),
  block('background', 'Предыстория', ''),
  block('quests', 'Цели и задачи', ''),
  block('traits', 'Умения и особенности', 'не на этой сцене'),
]

// 1) Empty personality collapses into one summary line (appearance excluded).
const empties = emptyPersonalityBlocks(emptySheet)
assert(empties.length === 6, 'six empty personality cards (no appearance)')
assert(
  !empties.some((row) => row.key === APPEARANCE_KEY),
  'appearance not in empty personality list',
)
const line = emptyPersonalityLine(emptySheet)
assert(line.startsWith('Не заполнено:'), 'empty line prefix')
assert(line.includes('Черты характера'), 'empty line lists traits')
assert(line.includes('· заполнить'), 'empty line ends with fill cue')
assert(!line.includes('Внешность'), 'appearance not in empty summary line')

// 2) Filled block view preview — no editor fields, 2–3 lines.
const filled = block(
  'personality',
  'Черты характера',
  'Строка один\nСтрока два\nСтрока три\nСтрока четыре лишняя',
)
assert(blockHasPlayerContent(filled), 'filled has content')
const preview = blockViewPreview(filled.value)
assert(preview.includes('Строка один'), 'view keeps first line')
assert(preview.includes('Строка три'), 'view keeps third line')
assert(!preview.includes('Строка четыре'), 'view clips after 3 lines')
assert(!preview.includes('Заголовок блока'), 'view is not editor chrome')
assert(!preview.includes('Текст…'), 'view has no textarea placeholder')

// 3) Appearance card does not duplicate physique as a list row.
const listed = listBlocksForFilter(emptySheet, 'personality')
assert(
  !listed.some((row) => row.key === APPEARANCE_KEY),
  'appearance never listed as a personality card',
)
assert(
  !listBlocksForFilter(emptySheet, 'all').some((row) => row.key === APPEARANCE_KEY),
  'appearance never listed under all',
)

// 4) Filters without content are not shown.
const chipsEmptyNotes = visibleSocialFilters(emptySheet, { hasPhysiqueUi: true })
assert(
  chipsEmptyNotes.some((row) => row.id === 'personality'),
  'personality stays when empty summary exists',
)
assert(
  !chipsEmptyNotes.some((row) => row.id === 'notes'),
  'notes chip hidden when no notes',
)
assert(
  !chipsEmptyNotes.some((row) => row.id === 'hidden'),
  'hidden chip hidden when none hidden',
)
assert(
  !chipsEmptyNotes.some((row) => row.id === 'resource'),
  'resource chip hidden when none',
)

const withNote = [
  ...emptySheet,
  block('notes-1', 'Заметка', 'секрет', { isCustom: true, key: 'notes-1' }),
]
assert(
  filterChipVisible('notes', withNote, { hasPhysiqueUi: true }),
  'notes chip appears when a note exists',
)

const withHidden = [
  ...emptySheet,
  block('ideals', 'Идеалы', 'честь', { isHidden: true }),
]
assert(
  filterChipVisible('hidden', withHidden, { hasPhysiqueUi: false }),
  'hidden chip appears when a block is hidden',
)

// 5) Physique placeholders are never treated as filled values.
const blank: PhysiqueFields = { ...EMPTY_PHYSIQUE }
assert(countFilledPhysique(blank) === 0, 'blank physique count 0')
assert(!isPhysiqueValueFilled(''), 'empty string not filled')
assert(!isPhysiqueValueFilled('   '), 'whitespace not filled')
assert(
  !physiqueHasContent(blank, block(APPEARANCE_KEY, 'Внешность', '')),
  'placeholders alone are not content',
)
assert(
  physiqueGlancePreview(blank, block(APPEARANCE_KEY, 'Внешность', '')) === '',
  'glance preview empty when only placeholders would apply',
)

const typed: PhysiqueFields = {
  ...EMPTY_PHYSIQUE,
  height: '5 футов',
  eyes: 'карие',
}
assert(countFilledPhysique(typed) === 2, 'counts only real values')
assert(physiqueHasContent(typed, undefined), 'typed physique has content')
assert(
  appearancePlain(block(APPEARANCE_KEY, 'Внешность', '  шрам  ')) === 'шрам',
  'appearance plain trims',
)
assert(
  physiqueGlancePreview(typed, block(APPEARANCE_KEY, 'Внешность', 'шрам на щеке')).includes(
    'шрам',
  ),
  'glance merges description text',
)

// Filled personality shows in list; empties do not.
const mixed = [
  block('personality', 'Черты характера', 'храбрый'),
  block('ideals', 'Идеалы', ''),
  block(APPEARANCE_KEY, 'Внешность', 'борода'),
]
const personalityList = listBlocksForFilter(mixed, 'personality')
assert(
  personalityList.length === 1 && personalityList[0].key === 'personality',
  'only filled personality cards listed',
)
assert(emptyPersonalityBlocks(mixed).some((row) => row.key === 'ideals'), 'ideals still empty')

console.log('socialScene.selfcheck OK')
