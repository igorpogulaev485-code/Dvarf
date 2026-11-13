/** Run: npx tsx src/features/classicSheet/classicOverflow.selfcheck.ts */
import {
  buildExtraEmptyNotePages,
  chunkCompanionPages,
  chunkOverflowText,
  spellLinesForPage,
  spellOverflowPageCount,
} from './classicOverflow.ts'
import { SPELL_LINE_COUNTS } from './classicSpells.ts'
import type { SheetSpell } from '../characters/spells.ts'
import type { CompanionEntry } from '../characters/companions.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function spell(level: number, name: string, i: number): SheetSpell {
  return {
    id: `s-${level}-${i}`,
    name,
    catalog_id: null,
    level,
    prepared: true,
    notes: '',
    casting_time: '',
    range: '',
    attack_or_save: '',
    damage: '',
    concentration: false,
  }
}

const level1Count = SPELL_LINE_COUNTS[1] ?? 13
const many = Array.from({ length: level1Count + 5 }, (_, i) => spell(1, `Spell ${i}`, i))
const first = spellLinesForPage(many, 1, 0, false)
assert(first.length === level1Count, `first page ${first.length}`)
assert(first.every((row) => row), 'first page filled')
const second = spellLinesForPage(many, 1, 1, false)
assert(second.length === 5, `overflow rows ${second.length}`)
assert(spellOverflowPageCount(many, [1]) === 1, 'one overflow page')

const companions: CompanionEntry[] = Array.from({ length: 7 }, (_, i) => ({
  id: `c${i}`,
  name: `Comp ${i}`,
  kind: 'other',
  notes: '',
  stats: { hp: 1, hp_max: 1, ac: 10, speed: 30 },
}))
const pages = chunkCompanionPages(companions, false)
assert(pages.length === 2, `companion pages ${pages.length}`)
assert(pages[0].length === 6, 'first companion page 6')
assert(pages[1].length === 1, 'second companion page remainder')

const emptyPencil = chunkCompanionPages([], true)
assert(emptyPencil.length === 1 && emptyPencil[0].length === 6, 'pencil empty companions')

assert(buildExtraEmptyNotePages(0, 0, true) === 1, 'pencil spare when no notes')
assert(buildExtraEmptyNotePages(3, 0, false) === 0, 'no spare without pencil')
assert(buildExtraEmptyNotePages(3, 2, false) === 2, 'explicit extra pages')

const chunks = chunkOverflowText('a'.repeat(100) + '\n' + 'b'.repeat(100), 80)
assert(chunks.length >= 2, `text chunks ${chunks.length}`)

console.log('classicOverflow.selfcheck: ok')
