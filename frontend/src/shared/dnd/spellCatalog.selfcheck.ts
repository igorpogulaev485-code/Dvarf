/**
 * Lightweight self-check: npx --yes tsx src/shared/dnd/spellCatalog.selfcheck.ts
 * Run from frontend/.
 */
import { parseSpellCatalogData } from './spellCatalog'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

const goodberry = parseSpellCatalogData({
  schema_version: 1,
  level: 1,
  school: 'transmutation',
  casting_time: { unit: 'action', amount: 1 },
  range: 'Касание',
  components: { v: true, s: true, m: 'ветка омелы' },
  concentration: false,
  ritual: false,
  classes: ['druid', 'ranger'],
})
assert(goodberry.level === 1, 'Goodberry / Чудо-ягоды is PHB 1st-level, not a cantrip')

const fireBolt = parseSpellCatalogData({ level: 0, school: 'evocation', classes: ['wizard'] })
assert(fireBolt.level === 0, 'Fire Bolt is a cantrip')

const stringLevel = parseSpellCatalogData({
  level: '2',
  school: 'conjuration',
  classes: ['wizard'],
})
assert(stringLevel.level === 2, 'numeric string levels parse correctly')

const samples: Array<{ name: string; level: number }> = [
  { name: 'guidance', level: 0 },
  { name: 'shillelagh', level: 0 },
  { name: 'cure_wounds', level: 1 },
  { name: 'shield', level: 1 },
  { name: 'misty_step', level: 2 },
  { name: 'fireball', level: 3 },
]
for (const sample of samples) {
  const parsed = parseSpellCatalogData({ level: sample.level, school: 'evocation', classes: [] })
  assert(parsed.level === sample.level, `${sample.name} level ${sample.level}`)
}

console.log('spellCatalog.selfcheck: ok (Goodberry=1; cantrips=0; string levels ok)')
