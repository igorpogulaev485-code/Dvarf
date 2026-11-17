/** Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/bardSecrets2024.selfcheck.ts */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as bard from '../../shared/dnd/bard2024Features'
import { applyLongRest } from '../../shared/dnd/rest'
import { emptyFeaturePicks, getFeaturePick, setFeaturePick } from '../../shared/dnd/featurePicks'
import { buildGrimoireShelfSources, catalogSpellMatchesShelf } from '../../shared/dnd/castProfiles'
import { guardBardSpellsChange2024 } from './bardPreparedGuard'
import { syncMagicalSecrets, MAGICAL_DISCOVERIES_ID_2024 } from './bardSecretsSync'
import {
  bardSpells2024OnLists,
  clearBardSpells2024,
  isOffBardList2024,
  registerBardSpells2024,
} from './bardSpellCatalog2024'
import { createSheetSpell, type SheetSpell, type SpellsState } from './spells'

const here = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(here, '../../shared/dnd/data/edition2024')
const readPack = (name: string) => JSON.parse(readFileSync(path.join(dataDir, name), 'utf8'))
clearBardSpells2024()
registerBardSpells2024([readPack('spells_ph24.json'), readPack('spells_srd.json')])

const ENTRY = 'class-bard'
const bardClass = (level: number) => ({ id: ENTRY, name: 'Бард', level })

function row(slug: string, over: Partial<SheetSpell> = {}): SheetSpell {
  const hit = bardSpells2024OnLists(['bard', 'wizard', 'druid', 'cleric'], { maxLevel: 9 }).find(
    (spell) => spell.slug === slug,
  )
  assert.ok(hit, `catalog has ${slug}`)
  return {
    ...createSheetSpell(),
    id: `sheet:${slug}`,
    name: hit.nameRu,
    catalog_id: hit.id,
    level: hit.level,
    prepared: true,
    class_slug: 'bard',
    ...over,
  }
}

function spellsOf(rows: SheetSpell[]): SpellsState {
  return {
    casting_ability: 'cha',
    max_prepared: 15,
    slots: {},
    pact_slots: null,
    known: rows,
  }
}

const onBard = (slug: string) =>
  bardSpells2024OnLists(['bard'], { maxLevel: 9 }).find((s) => s.slug === slug)

/* catalog: off-list classification uses the 2024 seeds */
assert.equal(isOffBardList2024(row('fireball')), true)
assert.equal(isOffBardList2024(row('cure-wounds')), false)
assert.ok(onBard('cure-wounds'))

/* off-list cap: one replacement per level + one new pick per column growth */
assert.deepEqual(
  [9, 10, 11, 12, 13, 15, 20].map(bard.magicalSecretsOffListCap2024),
  [0, 2, 4, 5, 7, 10, 19],
)

/* shelf: extra lists open leveled spells only */
const shelf = {
  ...buildGrimoireShelfSources([
    { slug: 'bard', labelRu: 'Бард', mode: 'prepared_list', aloneMaxLevel: 5 } as never,
  ])[0]!,
  extraListSlugs: ['wizard', 'druid', 'cleric'],
}
assert.equal(catalogSpellMatchesShelf(['wizard'], 3, shelf), true)
assert.equal(catalogSpellMatchesShelf(['wizard'], 0, shelf), false)
assert.equal(catalogSpellMatchesShelf(['wizard'], 3, { ...shelf, extraListSlugs: null }), false)
assert.equal(catalogSpellMatchesShelf(['wizard'], 6, shelf), false)

/* guard: no Magical Secrets below level 10 */
const picks0 = emptyFeaturePicks()
const base = [row('cure-wounds'), row('healing-word')]
const blockedBelow10 = guardBardSpellsChange2024({
  edition: '2024',
  classes: [bardClass(9)],
  prevSpells: spellsOf(base),
  nextSpells: spellsOf([...base, row('fireball')]),
  featurePicks: picks0,
})
assert.ok(blockedBelow10.blockedRu?.includes('10'))
assert.equal(blockedBelow10.spells.known.length, 2)

/* guard: level 10 opens off-list picks up to the cap, bard-list picks are free */
let known = [...base]
let picks = picks0
const step = (next: SheetSpell[], level = 10) => {
  const out = guardBardSpellsChange2024({
    edition: '2024',
    classes: [bardClass(level)],
    prevSpells: spellsOf(known),
    nextSpells: spellsOf(next),
    featurePicks: picks,
  })
  if (!out.blockedRu) {
    known = out.spells.known
    picks = out.featurePicks
  }
  return out
}
assert.equal(step([...known, row('fireball')]).blockedRu, null)
assert.equal(step([...known, row('counterspell')]).blockedRu, null)
const third = step([...known, row('magic-missile')])
assert.ok(third.blockedRu?.includes('2/2'), 'cap 2 at level 10')
assert.equal(step([...known, row('fear')]).blockedRu, null, 'bard-list spell is not off-list')

/* guard: replace exactly ONE prepared spell per bard level */
const dropFirst = known.filter((spell) => spell.id !== 'sheet:healing-word')
assert.equal(step(dropFirst).blockedRu, null, 'first drop spends the level replacement')
assert.ok(getFeaturePick(picks, ENTRY, bard.BARD_PREPARED_SWAP_PICK_ID_2024)?.startsWith('10:'))
const dropSecond = known.filter((spell) => spell.id !== 'sheet:cure-wounds')
assert.ok(step(dropSecond).blockedRu?.includes('уже использована'), 'second drop at same level is blocked')
const unprepared = known.map((spell) =>
  spell.id === 'sheet:cure-wounds' ? { ...spell, prepared: false } : spell,
)
assert.ok(step(unprepared).blockedRu, 'unpreparing counts as a drop too')
assert.equal(step([...known, row('sleep')]).blockedRu, null, 'refill the replaced slot')
/* gaining a level reopens one replacement */
assert.equal(
  step(known.filter((spell) => spell.id !== 'sheet:cure-wounds'), 11).blockedRu,
  null,
  'level 11 reopens a replacement',
)
/* take the last dropped spell back refunds the replacement at that level */
const refund = step([...known, row('cure-wounds')], 11)
assert.equal(refund.blockedRu, null)
assert.equal(getFeaturePick(picks, ENTRY, bard.BARD_PREPARED_SWAP_PICK_ID_2024), null)

/* guard: whole-list rebuild (long-rest style) is refused */
const rebuilt = known.map((spell) => ({ ...spell, prepared: false }))
assert.ok(step(rebuilt, 11).blockedRu)

/* guard: 2014 and non-bard sheets are untouched */
const free2014 = guardBardSpellsChange2024({
  edition: '2014',
  classes: [bardClass(10)],
  prevSpells: spellsOf(known),
  nextSpells: spellsOf([]),
  featurePicks: picks0,
})
assert.equal(free2014.blockedRu, null)
assert.equal(free2014.spells.known.length, 0)
assert.equal(
  guardBardSpellsChange2024({
    edition: '2024',
    classes: [{ id: 'c', name: 'Жрец', level: 10 }],
    prevSpells: spellsOf(known),
    nextSpells: spellsOf([]),
    featurePicks: picks0,
  }).blockedRu,
  null,
)

/* long rest never rebuilds the bard prepared list */
assert.equal(bard.BARD_LONG_REST_REBUILDS_PREPARED_2024, false)
assert.equal(bard.bardPreparedAfterLongRest2024(known), known)
const rested = applyLongRest({
  resources: [],
  slots: { '1': { max: 4, used: 4 } },
  pact_slots: null,
  exhaustion: 0,
  hp_max: 30,
  hit_dice_current: 1,
  hit_dice_max: 5,
  rules_edition: '2024',
  hp_current: 5,
})
assert.equal(rested.slots?.['1']?.used, 0)
assert.equal('known' in rested, false)

/* Lore discoveries: sync materializes always-prepared rows beyond the column */
const lore = { [ENTRY]: 'bard__lore' }
const discoveryPicks = setFeaturePick(emptyFeaturePicks(), ENTRY, MAGICAL_DISCOVERIES_ID_2024, 'entangle,guidance')
const synced = syncMagicalSecrets({
  spells: spellsOf([row('cure-wounds')]),
  featurePicks: discoveryPicks,
  classes: [bardClass(6)],
  edition: '2024',
  subclassSlugByEntryId: lore,
})
assert.equal(synced.changed, true)
const rows = synced.spells.known.filter((spell) => spell.id.startsWith('feature-spell:magical_discoveries:'))
assert.equal(rows.length, 2)
assert.ok(rows.every((spell) => spell.prepared && spell.prepared_locked))
assert.ok(rows.some((spell) => spell.level === 0), 'cantrip discovery allowed')
assert.ok(rows.every((spell) => spell.catalog_id?.startsWith('seed-spell-')), '2024 catalog rows')
/* always prepared: they do not spend the bard prepared column */
assert.equal(bard.isBardPreparedBudgetRow2024(rows[0]!, 'bard'), false)
const again = syncMagicalSecrets({
  spells: synced.spells,
  featurePicks: discoveryPicks,
  classes: [bardClass(6)],
  edition: '2024',
  subclassSlugByEntryId: lore,
})
assert.equal(again.changed, false)
/* only Wizard / Druid / Cleric lists; circle bounded by bard slots */
const bardOnlyPick = setFeaturePick(emptyFeaturePicks(), ENTRY, MAGICAL_DISCOVERIES_ID_2024, 'vicious-mockery,wish')
const rejected = syncMagicalSecrets({
  spells: spellsOf([]),
  featurePicks: bardOnlyPick,
  classes: [bardClass(6)],
  edition: '2024',
  subclassSlugByEntryId: lore,
})
assert.equal(rejected.spells.known.length, 0)
/* rollback 6 -> 5 and losing the College remove them */
const down = syncMagicalSecrets({
  spells: synced.spells,
  featurePicks: discoveryPicks,
  classes: [bardClass(5)],
  edition: '2024',
  subclassSlugByEntryId: lore,
})
assert.equal(down.spells.known.some((spell) => spell.id.includes('magical_discoveries')), false)
const noCollege = syncMagicalSecrets({
  spells: synced.spells,
  featurePicks: discoveryPicks,
  classes: [bardClass(6)],
  edition: '2024',
  subclassSlugByEntryId: { [ENTRY]: 'bard__valor' },
})
assert.equal(noCollege.spells.known.some((spell) => spell.id.includes('magical_discoveries')), false)
/* trim helper clears the picks below level 6 */
const trimmed = bard.trimBard2024PicksOnLevelDown(discoveryPicks, ENTRY, 5)
assert.equal(getFeaturePick(trimmed, ENTRY, MAGICAL_DISCOVERIES_ID_2024), null)
assert.equal(getFeaturePick(bard.trimBard2024PicksOnLevelDown(discoveryPicks, ENTRY, 6), ENTRY, MAGICAL_DISCOVERIES_ID_2024), 'entangle,guidance')
/* 2014 secrets 10/14/18 never apply to a 2024 sheet */
const old2014 = setFeaturePick(emptyFeaturePicks(), ENTRY, 'magical_secrets_10', 'fireball,counterspell')
assert.equal(
  syncMagicalSecrets({
    spells: spellsOf([]),
    featurePicks: old2014,
    classes: [bardClass(10)],
    edition: '2024',
    subclassSlugByEntryId: lore,
  }).spells.known.length,
  0,
)

console.log('bardSecrets2024.selfcheck ok')
