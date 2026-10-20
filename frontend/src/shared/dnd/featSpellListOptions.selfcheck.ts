/**
 * Selfcheck: Magic Initiate class lists include XGE Toll the Dead etc.
 * Run: npx tsx src/shared/dnd/featSpellListOptions.selfcheck.ts
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  FEAT_CLASS_SPELL_LISTS,
  spellOptionsForClassList,
  type FeatSpellCatalogRow,
} from './featSpellListOptions'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const bundledPath = join(here, '../../../public/spells-2014.json')
const rows = JSON.parse(readFileSync(bundledPath, 'utf8')) as FeatSpellCatalogRow[]

assert(Array.isArray(rows) && rows.length > 100, 'bundled spells loaded')

const clericCantrips = spellOptionsForClassList({
  spells: rows,
  classSlug: 'cleric',
  level: 0,
})
const clericIds = new Set(clericCantrips.map((o) => o.id))
assert(clericIds.has('toll_the_dead'), 'cleric cantrips include toll_the_dead')
assert(clericIds.has('sacred_flame'), 'cleric cantrips include sacred_flame')
assert(clericIds.has('word_of_radiance'), 'cleric cantrips include word_of_radiance')
assert(clericIds.has('mending'), 'cleric cantrips include mending')

const warlockCantrips = spellOptionsForClassList({
  spells: rows,
  classSlug: 'warlock',
  level: 0,
})
assert(
  warlockCantrips.some((o) => o.id === 'toll_the_dead'),
  'warlock cantrips include toll_the_dead',
)

const wizardL1 = spellOptionsForClassList({
  spells: rows,
  classSlug: 'wizard',
  level: 1,
})
assert(wizardL1.length >= 20, `wizard L1 expected many, got ${wizardL1.length}`)
assert(wizardL1.some((o) => o.id === 'magic_missile'), 'wizard L1 magic_missile')

const rituals = spellOptionsForClassList({
  spells: rows,
  classSlug: 'wizard',
  level: 1,
  ritualOnly: true,
})
assert(rituals.every((o) => o.id), 'ritual options have ids')
assert(
  rituals.some((o) => o.id === 'detect_magic' || o.id === 'find_familiar'),
  'wizard rituals include detect_magic or find_familiar',
)
assert(
  !rituals.some((o) => o.id === 'magic_missile'),
  'ritual-only excludes magic_missile',
)

for (const cls of FEAT_CLASS_SPELL_LISTS) {
  const cans = spellOptionsForClassList({
    spells: rows,
    classSlug: cls,
    level: 0,
  })
  assert(cans.length >= 4, `${cls} has >=4 cantrips (got ${cans.length})`)
}

assert(
  spellOptionsForClassList({
    spells: rows,
    classSlug: 'fighter',
    level: 0,
  }).length === 0,
  'non-MI class yields empty',
)

console.log('featSpellListOptions.selfcheck: ok')
