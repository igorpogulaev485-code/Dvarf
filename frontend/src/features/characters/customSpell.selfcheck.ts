import {
  CUSTOM_SPELL_SOURCE_DEFAULT,
  addCustomSpellToKnown,
  createCustomSheetSpell,
  isCustomSheetSpell,
  isGrantedSpellHighlight,
  spellSourceBadge,
  updateCustomSheetSpell,
} from './spells'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

const draft = createCustomSheetSpell({
  name: '  Плазменный шар  ',
  level: 3,
  casting_time: '1 действие',
  range: '120 футов',
  duration: 'Мгновенная',
  concentration: false,
  ritual: false,
  components: { v: true, s: true, m: 'пыль плазмы' },
  attack_or_save: 'Ловкость',
  damage: '8к6 огонь',
  school: 'evocation',
  description: 'Взрыв плазмы.',
  higher_levels: '+1к6 за круг выше 3',
  applies_to_allies: true,
  ally_target_count: 2,
})

assert(draft.name === 'Плазменный шар', 'trim name')
assert(draft.catalog_id === null, 'no catalog id')
assert(draft.source_kind === 'custom', 'source_kind custom')
assert(draft.source_book === CUSTOM_SPELL_SOURCE_DEFAULT, 'default source Хомбрю')
assert(isCustomSheetSpell(draft), 'isCustom')
assert(draft.applies_to_allies === true, 'allies')
assert(draft.ally_target_count === 2, 'ally count')
assert(draft.higher_levels?.includes('1к6'), 'upcast text')

const badge = spellSourceBadge(draft)
assert(badge?.kind === 'custom', 'badge kind')
assert(badge?.label === 'Хомбрю', 'badge label')
assert(!isGrantedSpellHighlight(draft), 'custom is not grant highlight')

const renamed = updateCustomSheetSpell(draft, {
  name: 'Ионный шар',
  level: 3,
  source_book: 'Домашний сеттинг',
  higher_levels: draft.higher_levels,
})
assert(renamed.id === draft.id, 'keep id')
assert(renamed.name === 'Ионный шар', 'rename')
assert(spellSourceBadge(renamed)?.label === 'Домашний сеттинг', 'custom source label')

let known = addCustomSpellToKnown([], {
  name: 'Искра',
  level: 0,
  school: 'evocation',
})
assert(known.length === 1, 'added cantrip')
assert(known[0]?.prepared === true, 'cantrip prepared')

known = addCustomSpellToKnown([], {
  name: 'Гром',
  level: 1,
  school: 'evocation',
}, { prepare: true, maxPrepared: 4 })
assert(known[0]?.prepared === true, 'leveled prepared')

console.log('customSpell.selfcheck ok')
