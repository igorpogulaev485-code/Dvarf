/**
 * Pure checks for class-list prepare availability (no DOM / API).
 * Run: npx --yes tsx src/shared/dnd/prepareAvailability.selfcheck.ts
 */

import type { CatalogEntry } from '../api/catalog'
import {
  classListPrepareSources,
  catalogSpellMatchesClassListSources,
  mergeAvailableForPrepare,
} from './prepareAvailability'
import { maxSpellLevelForClassAlone, preparesFromFullClassList } from './casterProgression'

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message)
}

assert(preparesFromFullClassList('cleric') === true, 'cleric prepares from class list')
assert(preparesFromFullClassList('druid') === true, 'druid prepares from class list')
assert(preparesFromFullClassList('paladin') === true, 'paladin prepares from class list')
assert(preparesFromFullClassList('artificer') === true, 'artificer prepares from class list')
assert(preparesFromFullClassList('wizard') === false, 'wizard uses spellbook, not full list')
assert(preparesFromFullClassList('bard') === false, 'bard is known caster')
assert(preparesFromFullClassList('sorcerer') === false, 'sorcerer is known caster')
assert(preparesFromFullClassList('warlock') === false, 'warlock is known caster')
assert(preparesFromFullClassList('ranger') === false, 'ranger 2014 is known caster')

assert(maxSpellLevelForClassAlone('full', 5) === 3, 'full caster 5 → spell level 3')
assert(maxSpellLevelForClassAlone('full', 1) === 1, 'full caster 1 → spell level 1')
assert(maxSpellLevelForClassAlone('half', 1) === 0, 'paladin 1 → no spells yet')
assert(maxSpellLevelForClassAlone('half', 2) === 1, 'paladin 2 → spell level 1')
assert(maxSpellLevelForClassAlone('half', 5) === 2, 'paladin 5 → spell level 2')
assert(maxSpellLevelForClassAlone('half_up', 1) === 1, 'artificer 1 → spell level 1')

const cleric5 = classListPrepareSources({ className: 'Жрец', level: 5 })
assert(cleric5.length === 1 && cleric5[0].slug === 'cleric', 'cleric source')
assert(cleric5[0].maxSpellLevel === 3, 'cleric 5 max spell 3')

const wizard5 = classListPrepareSources({ className: 'Волшебник', level: 5 })
assert(wizard5.length === 0, 'wizard has no class-list sources')

const bard3 = classListPrepareSources({ className: 'Бард', level: 3 })
assert(bard3.length === 0, 'bard has no class-list sources')

const multi = classListPrepareSources({
  className: '',
  level: 1,
  classes: [
    {
      id: '1',
      name: 'Жрец',
      catalog_id: null,
      level: 3,
      subclass_name: '',
      subclass_catalog_id: null,
    },
    {
      id: '2',
      name: 'Волшебник',
      catalog_id: null,
      level: 2,
      subclass_name: '',
      subclass_catalog_id: null,
    },
  ],
})
assert(multi.length === 1 && multi[0].slug === 'cleric', 'MC cleric/wizard → only cleric list')
assert(multi[0].maxSpellLevel === 2, 'MC cleric 3 alone → spell level 2 (not shared slots)')

const multiPrep = classListPrepareSources({
  className: '',
  level: 1,
  classes: [
    {
      id: '1',
      name: 'Жрец',
      catalog_id: null,
      level: 3,
      subclass_name: '',
      subclass_catalog_id: null,
    },
    {
      id: '2',
      name: 'Паладин',
      catalog_id: null,
      level: 6,
      subclass_name: '',
      subclass_catalog_id: null,
    },
  ],
})
assert(multiPrep.length === 2, 'cleric+paladin both contribute')
assert(
  multiPrep.some((s) => s.slug === 'cleric' && s.maxSpellLevel === 2),
  'cleric 3 → L2',
)
assert(
  multiPrep.some((s) => s.slug === 'paladin' && s.maxSpellLevel === 2),
  'paladin 6 → L2',
)

function spellEntry(
  id: string,
  slug: string,
  nameRu: string,
  nameEn: string,
  level: number,
  classes: string[],
): CatalogEntry {
  return {
    id,
    kind: 'spell',
    slug,
    name_ru: nameRu,
    name_en: nameEn,
    rules_edition: '2014',
    parent_id: null,
    source: 'selfcheck',
    external_ref: null,
    data: { level, classes },
    sort_order: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  }
}

const catalog: CatalogEntry[] = [
  spellEntry('bless', 'bless', 'Благословение', 'Bless', 1, ['cleric', 'paladin']),
  spellEntry('fireball', 'fireball', 'Огненный шар', 'Fireball', 3, ['sorcerer', 'wizard']),
  spellEntry('spirit', 'spirit_guardians', 'Духовные стражи', 'Spirit Guardians', 3, ['cleric']),
  spellEntry('cure', 'cure_wounds', 'Лечение ран', 'Cure Wounds', 1, [
    'bard',
    'cleric',
    'druid',
    'paladin',
    'ranger',
  ]),
]

assert(
  catalogSpellMatchesClassListSources(catalog[0], cleric5),
  'bless matches cleric 5',
)
assert(
  !catalogSpellMatchesClassListSources(catalog[1], cleric5),
  'fireball not on cleric list',
)
assert(
  catalogSpellMatchesClassListSources(catalog[2], cleric5),
  'spirit guardians L3 ok for cleric 5',
)
assert(
  !catalogSpellMatchesClassListSources(catalog[2], multi),
  'spirit guardians L3 blocked for cleric 3 alone',
)

const merged = mergeAvailableForPrepare({
  known: [
    {
      id: 'manual',
      name: 'Кастом',
      catalog_id: null,
      level: 1,
      prepared: true,
      notes: '',
      casting_time: '',
      range: '',
      attack_or_save: '',
      damage: '',
      concentration: false,
    },
    {
      id: 'on-sheet-bless',
      name: 'Благословение',
      catalog_id: 'bless',
      level: 1,
      prepared: false,
      notes: '',
      casting_time: '',
      range: '',
      attack_or_save: '',
      damage: '',
      concentration: false,
    },
  ],
  catalog,
  sources: cleric5,
  sheetSpellFromCatalog: (entry) => ({
    id: `tmp-${entry.id}`,
    name: entry.name_ru,
    catalog_id: entry.id,
    level: typeof entry.data?.level === 'number' ? entry.data.level : 0,
    prepared: false,
    notes: '',
    casting_time: '',
    range: '',
    attack_or_save: '',
    damage: '',
    concentration: false,
  }),
})

assert(merged.some((s) => s.id === 'manual'), 'keeps custom known')
assert(merged.some((s) => s.catalog_id === 'bless' && s.id === 'on-sheet-bless'), 'known wins over virtual')
assert(merged.some((s) => s.id === 'class-list:spirit'), 'adds virtual spirit guardians')
assert(merged.some((s) => s.id === 'class-list:cure'), 'adds virtual cure wounds')
assert(!merged.some((s) => s.catalog_id === 'fireball'), 'does not add wizard fireball')
assert(!merged.some((s) => s.id === 'class-list:bless'), 'no duplicate virtual bless')

const bardAvailable = mergeAvailableForPrepare({
  known: [
    {
      id: 'song',
      name: 'Злая насмешка',
      catalog_id: null,
      level: 0,
      prepared: true,
      notes: '',
      casting_time: '',
      range: '',
      attack_or_save: '',
      damage: '',
      concentration: false,
    },
    {
      id: 'healing',
      name: 'Лечение ран',
      catalog_id: 'cure',
      level: 1,
      prepared: true,
      notes: '',
      casting_time: '',
      range: '',
      attack_or_save: '',
      damage: '',
      concentration: false,
    },
  ],
  catalog,
  sources: [],
  sheetSpellFromCatalog: (entry) => ({
    id: entry.id,
    name: entry.name_ru,
    catalog_id: entry.id,
    level: 1,
    prepared: false,
    notes: '',
    casting_time: '',
    range: '',
    attack_or_save: '',
    damage: '',
    concentration: false,
  }),
})
assert(bardAvailable.length === 1 && bardAvailable[0].id === 'healing', 'known caster: only known leveled')

console.log('prepareAvailability.selfcheck: ok')
