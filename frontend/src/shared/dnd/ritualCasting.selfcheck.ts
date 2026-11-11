/**
 * Cast without a spell slot: ritual-only grants, ritual books, at-will invocations.
 * Run: npx tsx src/shared/dnd/ritualCasting.selfcheck.ts
 */

import { emptyFeaturePicks, setFeaturePick } from './featurePicks.ts'
import {
  canCastPreparedSpellAsRitual,
  canOfferRitualCast,
  classHasRitualCasting,
} from './ritualCasting.ts'
import {
  halfLevelRoundedUp,
  isRitualCasterList,
  ritualCasterCastingAbility,
  ritualTranscriptionCost,
} from './ritualBooks.ts'
import { invocationById, invocationCastById } from './warlockInvocations.ts'
import { PACT_BOON_FEATURE_ID } from '../../features/characters/pactTomeEffects.ts'
import {
  addRitualBookEntry,
  syncCastWithoutSlotGrants,
} from '../../features/characters/castWithoutSlots.ts'
import { createSheetSpell, type SpellsState } from '../../features/characters/spells.ts'
import type { InventoryState } from '../../features/characters/inventory.ts'
import type { AppliedFeatGrant } from './featGrants.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(!classHasRitualCasting('barbarian'), 'barbarian is not a ritual class')
assert(!classHasRitualCasting('warlock'), 'warlock is not a ritual class')
assert(!classHasRitualCasting('paladin'), 'paladin is not a ritual class')
assert(classHasRitualCasting('cleric'), 'cleric keeps ritual casting')

assert(
  !canCastPreparedSpellAsRitual({
    ritual: true,
    level: 1,
    classSlug: 'paladin',
    casterSlugs: ['paladin'],
  }),
  'M47 paladin detect magic is not a class ritual',
)
assert(
  !canOfferRitualCast({
    ritual: true,
    level: 1,
    classSlug: 'paladin',
    casterSlugs: ['paladin'],
  }),
  'M47 still blocks a paladin row without an explicit grant',
)
assert(
  canOfferRitualCast({
    ritual: true,
    level: 1,
    classSlug: 'cleric',
    casterSlugs: ['cleric'],
  }),
  'prepared cleric ritual still works',
)
assert(
  canOfferRitualCast({
    ritual: true,
    level: 1,
    classSlug: 'barbarian',
    casterSlugs: ['barbarian'],
    castAccess: 'ritual_only',
  }),
  'M77 totem ritual-only grant',
)
assert(
  !canOfferRitualCast({
    ritual: true,
    level: 1,
    classSlug: 'barbarian',
    casterSlugs: ['barbarian'],
  }),
  'barbarian without the grant still cannot ritual',
)
assert(
  canOfferRitualCast({
    ritual: true,
    level: 1,
    classSlug: 'warlock',
    casterSlugs: ['warlock'],
    castAccess: 'ritual_or_slot',
  }),
  'M256 chain familiar may be a ritual',
)

assert(ritualTranscriptionCost(1).gp === 50 && ritualTranscriptionCost(1).hours === 2, '1st circle is 2h 50gp')
assert(ritualTranscriptionCost(3).gp === 150 && ritualTranscriptionCost(3).hours === 6, '3rd circle is 6h 150gp')
assert(halfLevelRoundedUp(5) === 3, 'half of 5 rounds up to 3')
assert(isRitualCasterList('sorcerer'), 'PHB ritual caster includes sorcerer')
assert(ritualCasterCastingAbility('sorcerer') === 'cha', 'sorcerer list uses Charisma')
assert(ritualCasterCastingAbility('cleric') === 'wis', 'cleric list uses Wisdom')
assert(ritualCasterCastingAbility('wizard') === 'int', 'wizard list uses Intelligence')

assert(invocationCastById('armor_of_shadows')?.mode === 'at_will', 'armor of shadows at will')
assert(invocationCastById('beast_speech')?.mode === 'at_will', 'beast speech at will')
assert(invocationCastById('mask_of_many_faces')?.mode === 'at_will', 'mask of many faces at will')
assert(invocationCastById('fiendish_vigor')?.fixedLevel === 1, 'false life stays 1st')
assert(invocationById('armor_of_shadows'), 'armor of shadows is in the PHB picker')
assert(invocationCastById('shroud_of_shadow') == null, 'XGE shroud is not invented')
assert(invocationById('tricksters_escape') == null, 'XGE trickster is not in the catalog')

function emptySpells(): SpellsState {
  return {
    casting_ability: null,
    max_prepared: null,
    slots: {},
    pact_slots: { level: 2, max: 2, used: 0 },
    known: [],
  }
}

function purse(gp: number): InventoryState {
  return { coins: { cp: 0, sp: 0, ep: 0, gp, pp: 0 }, items: [], notes: '' }
}

const feat = {
  id: 'feat-rc',
  slug: 'ritual_caster',
  picks: { enumIds: { list: 'wizard', ritual1: 'detect_magic' }, abilityKeys: {}, enumLists: {}, expertiseSkills: [], languages: [], skills: [], tools: [], weapons: [] },
} as unknown as AppliedFeatGrant

const seeded = emptySpells()
seeded.known = [
  {
    ...createSheetSpell(),
    id: 'feat-spell:feat-rc:ritual1:detect_magic',
    name: 'Обнаружение магии',
    level: 1,
    feat_grant: 'innate',
    grant_cast: { max: 1, used: 0, reset: 'long', label: 'Черта' },
    prepared: true,
    prepared_locked: true,
  },
]

const withBook = syncCastWithoutSlotGrants({
  spells: seeded,
  inventory: purse(0),
  featurePicks: emptyFeaturePicks(),
  featGrants: [feat],
  classes: [{ id: 'fighter', name: 'Воин', level: 4 }],
  characterLevel: 4,
})
assert(withBook.changed, 'ritual caster sync')
const ritualRow = withBook.spells.known.find((row) => row.name.includes('Обнаружение'))
assert(ritualRow?.cast_access === 'ritual_only', 'feat row is ritual only')
assert(!ritualRow?.grant_cast, '1/day charge removed')
assert(ritualRow?.casting_ability === 'int', 'wizard list casts with Intelligence')
assert(withBook.inventory.items.some((item) => item.catalog_slug === 'ritual_book'), 'book in inventory')
assert(
  canOfferRitualCast({
    ritual: true,
    level: 1,
    classSlug: ritualRow?.class_slug,
    casterSlugs: [],
    castAccess: ritualRow?.cast_access,
  }),
  'the book row can be a ritual',
)

const again = syncCastWithoutSlotGrants({
  ...{
    spells: withBook.spells,
    inventory: withBook.inventory,
    featurePicks: emptyFeaturePicks(),
    featGrants: [feat],
    classes: [{ id: 'fighter', name: 'Воин', level: 4 }],
    characterLevel: 4,
  },
})
assert(!again.changed, 'ritual caster sync is stable')

const warlockId = 'lock'
let picks = setFeaturePick(emptyFeaturePicks(), warlockId, PACT_BOON_FEATURE_ID, 'tome')
picks = setFeaturePick(picks, warlockId, 'eldritch_invocations', 'book_of_ancient_secrets,armor_of_shadows,beast_speech')
const ancient = syncCastWithoutSlotGrants({
  spells: emptySpells(),
  inventory: purse(0),
  featurePicks: picks,
  featGrants: [],
  classes: [{ id: warlockId, name: 'Колдун', level: 5 }],
  characterLevel: 5,
})
assert(
  ancient.inventory.items.some((item) => item.catalog_slug === 'book_of_shadows'),
  'book of shadows exists',
)
assert(
  ancient.spells.known.some((row) => row.cast_access === 'at_will' && /доспех/i.test(row.name)),
  'mage armor at will',
)
assert(
  ancient.spells.known.some((row) => row.cast_access === 'at_will' && /животн/i.test(row.name)),
  'speak with animals at will',
)
const free = addRitualBookEntry({
  spells: ancient.spells,
  inventory: ancient.inventory,
  featurePicks: picks,
  featGrants: [],
  classes: [{ id: warlockId, name: 'Колдун', level: 5 }],
  characterLevel: 5,
  kind: 'ancient_secrets',
  slug: 'detect_magic',
})
assert(free.ok, free.message ?? 'starter ritual')
assert(free.inventory.coins.gp === 0, 'first ancient secret is free')
assert(
  free.spells.known.some((row) => row.ritual_book === 'ancient_secrets' && row.cast_access === 'ritual_only'),
  'book row is ritual only',
)

const monkId = 'monk'
const monkPicks = setFeaturePick(emptyFeaturePicks(), monkId, 'elemental_disciplines', 'sweeping_cinder_strike')
const elements = syncCastWithoutSlotGrants({
  spells: emptySpells(),
  inventory: purse(0),
  featurePicks: monkPicks,
  featGrants: [],
  classes: [{ id: monkId, name: 'Монах', level: 3, subclass_name: 'Путь четырёх стихий' }],
  characterLevel: 3,
})
const burning = elements.spells.known.find((row) => row.cast_access === 'feature')
assert(burning?.feature_spend?.poolId === 'ki', 'discipline spends ki')
assert(burning?.feature_spend?.cost === 2, 'burning hands is 2 ki')
assert(!burning?.class_slug || burning.class_slug === 'monk', 'discipline is not a slot class')
const elementsAgain = syncCastWithoutSlotGrants({
  spells: elements.spells,
  inventory: elements.inventory,
  featurePicks: monkPicks,
  featGrants: [],
  classes: [{ id: monkId, name: 'Монах', level: 3, subclass_name: 'Путь четырёх стихий' }],
  characterLevel: 3,
})
assert(!elementsAgain.changed, 'elemental sync is stable')
const ancientAgain = syncCastWithoutSlotGrants({
  spells: free.spells,
  inventory: free.inventory,
  featurePicks: picks,
  featGrants: [],
  classes: [{ id: warlockId, name: 'Колдун', level: 5 }],
  characterLevel: 5,
})
assert(!ancientAgain.changed, 'ancient secrets sync is stable')

console.log('ritualCasting.selfcheck: ok')
