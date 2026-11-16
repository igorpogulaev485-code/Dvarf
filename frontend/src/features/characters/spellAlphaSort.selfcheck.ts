/**
 * Spells inside each circle sort А→Я by Russian display name.
 * Covers compact Play Desk + full SpellsPanel via groupSpellsByLevel.
 *
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/spellAlphaSort.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  compareSpellDisplayName,
  groupSpellsByLevel,
  type SheetSpell,
} from './spells.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const spellsSrc = read('src/features/characters/spells.ts')
const compact = read('src/features/characters/PlayDeskSpellsCompact.tsx')
const panel = read('src/features/characters/SpellsPanel.tsx')

assert.match(spellsSrc, /localeCompare\([^,]+,\s*['"]ru['"]/)
assert.match(spellsSrc, /sensitivity:\s*['"]base['"]/)
assert.match(compact, /groupSpellsByLevel/)
assert.match(panel, /groupSpellsByLevel/)

assert.equal(compareSpellDisplayName('Волна грома', 'Туманное облако'), -1)
assert.equal(compareSpellDisplayName('приказ', 'Приказ'), 0)
assert.ok(compareSpellDisplayName('ёж', 'еж') === 0)

function stub(name: string, level: number): SheetSpell {
  return {
    id: name,
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

const grouped = groupSpellsByLevel([
  stub('Туманное облако', 1),
  stub('Волна грома', 1),
  stub('Приказ', 1),
  stub('Чудотворство', 0),
  stub('Священное пламя', 0),
  stub('Указание', 0),
  stub('Помощь', 2),
  stub('Духовные стражи', 2),
  stub('Удержание личности', 2),
])

assert.deepEqual(
  grouped.map((g) => g.level),
  [0, 1, 2],
  'circles stay ordered by level',
)
assert.deepEqual(
  grouped[0]!.spells.map((s) => s.name),
  ['Священное пламя', 'Указание', 'Чудотворство'],
)
assert.deepEqual(
  grouped[1]!.spells.map((s) => s.name),
  ['Волна грома', 'Приказ', 'Туманное облако'],
)
assert.deepEqual(
  grouped[2]!.spells.map((s) => s.name),
  ['Духовные стражи', 'Помощь', 'Удержание личности'],
)

console.log('spellAlphaSort.selfcheck: ok')
