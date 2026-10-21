/**
 * Selfcheck: Magic Initiate class lists include XGE Toll the Dead etc.
 * Run: npx tsx src/shared/dnd/featSpellListOptions.selfcheck.ts
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  FEAT_CLASS_SPELL_LISTS,
  PACT_TOME_CANTRIP_CLASS_LISTS,
  spellOptionsForClassList,
  spellOptionsForPactTomeCantrips,
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

/** PHB baseline cantrips each Magic Initiate list must expose. */
const MI_PHB_CANTRIPS: Record<(typeof FEAT_CLASS_SPELL_LISTS)[number], string[]> = {
  bard: [
    'blade_ward',
    'dancing_lights',
    'friends',
    'light',
    'mage_hand',
    'mending',
    'message',
    'minor_illusion',
    'prestidigitation',
    'true_strike',
    'vicious_mockery',
  ],
  cleric: [
    'guidance',
    'light',
    'mending',
    'resistance',
    'sacred_flame',
    'spare_the_dying',
    'thaumaturgy',
  ],
  druid: [
    'druidcraft',
    'guidance',
    'mending',
    'poison_spray',
    'produce_flame',
    'resistance',
    'shillelagh',
    'thorn_whip',
  ],
  warlock: [
    'blade_ward',
    'chill_touch',
    'eldritch_blast',
    'friends',
    'mage_hand',
    'minor_illusion',
    'poison_spray',
    'prestidigitation',
    'true_strike',
  ],
  wizard: [
    'acid_splash',
    'blade_ward',
    'chill_touch',
    'dancing_lights',
    'fire_bolt',
    'friends',
    'light',
    'mage_hand',
    'mending',
    'message',
    'minor_illusion',
    'poison_spray',
    'prestidigitation',
    'ray_of_frost',
    'shocking_grasp',
    'true_strike',
  ],
}

for (const cls of FEAT_CLASS_SPELL_LISTS) {
  const cans = spellOptionsForClassList({
    spells: rows,
    classSlug: cls,
    level: 0,
  })
  assert(cans.length >= 4, `${cls} has >=4 cantrips (got ${cans.length})`)
  const ids = new Set(cans.map((o) => o.id))
  for (const slug of MI_PHB_CANTRIPS[cls]) {
    assert(ids.has(slug), `Magic Initiate ${cls} missing PHB cantrip ${slug}`)
  }
  const l1 = spellOptionsForClassList({
    spells: rows,
    classSlug: cls,
    level: 1,
  })
  assert(l1.length >= 8, `Magic Initiate ${cls} L1 expected many, got ${l1.length}`)
}

// Artificer class list (grimoire / prepare / Pact Tome) — PHB staples tagged.
const artificerCantrips = spellOptionsForClassList({
  spells: rows,
  classSlug: 'artificer',
  level: 0,
  anyClassList: true,
})
const artificerIds = new Set(artificerCantrips.map((o) => o.id))
for (const slug of [
  'fire_bolt',
  'mage_hand',
  'mending',
  'guidance',
  'prestidigitation',
  'ray_of_frost',
  'acid_splash',
]) {
  assert(artificerIds.has(slug), `artificer cantrips include ${slug}`)
}
assert(
  artificerCantrips.length >= 20,
  `artificer cantrips expected >=20, got ${artificerCantrips.length}`,
)
const artificerL1 = spellOptionsForClassList({
  spells: rows,
  classSlug: 'artificer',
  level: 1,
  anyClassList: true,
})
assert(
  artificerL1.length >= 16,
  `artificer L1 expected >=16, got ${artificerL1.length}`,
)
assert(
  artificerL1.some((o) => o.id === 'cure_wounds'),
  'artificer L1 includes cure_wounds',
)

assert(
  spellOptionsForClassList({
    spells: rows,
    classSlug: 'fighter',
    level: 0,
  }).length === 0,
  'non-MI class yields empty',
)

const sorcererViaAny = spellOptionsForClassList({
  spells: rows,
  classSlug: 'sorcerer',
  level: 0,
  anyClassList: true,
})
assert(sorcererViaAny.length >= 4, 'sorcerer cantrips via anyClassList')

const tome = spellOptionsForPactTomeCantrips({ spells: rows })
assert(tome.length >= 20, `tome any-list cantrips expected many, got ${tome.length}`)
assert(tome.some((o) => o.id === 'fire_bolt'), 'tome includes fire_bolt')
assert(tome.some((o) => o.id === 'sacred_flame'), 'tome includes sacred_flame')
assert(
  PACT_TOME_CANTRIP_CLASS_LISTS.includes('sorcerer'),
  'tome lists include sorcerer',
)

console.log('featSpellListOptions.selfcheck: ok')
