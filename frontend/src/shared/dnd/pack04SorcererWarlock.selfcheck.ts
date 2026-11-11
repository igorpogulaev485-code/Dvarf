/**
 * Run: npx --yes tsx src/shared/dnd/pack04SorcererWarlock.selfcheck.ts
 */
import { applyLongRest, applyShortRest } from './rest.ts'
import { addFlexibleSpellSlot } from './spells.ts'
import { applyElementalAffinityBonus, resolveCastEffect } from './spellCatalog.ts'
import { catalogSpellMatchesShelf, type GrimoireShelfSource } from './castProfiles.ts'
import {
  ABERRANT_MIND_SPELLS,
  CLOCKWORK_SOUL_SPELLS,
  DIVINE_AFFINITY_SPELL,
  EYES_OF_THE_DARK_COST,
  LUNAR_SPELLS,
  familiarCostNote,
  invocationIsSelectable,
  normalizeLunarPhase,
  pack04ExtraClassList,
  psionicSorceryPointCost,
  spellOnWarlockExpandedList,
  warlockExpandedSlugSet,
} from './pack04SorcererWarlock.ts'
import { syncSorcererOriginSpells } from '../../features/characters/sorcererOriginSpells.ts'
import { emptyFeaturePicks, setFeaturePick } from './featurePicks.ts'
import { createSheetSpell, type SpellsState } from '../../features/characters/spells.ts'

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message)
}

assert(ABERRANT_MIND_SPELLS.length === 11, 'aberrant 10 + mind sliver')
assert(
  ABERRANT_MIND_SPELLS.filter((row) => row.fromClassLevel <= 1).length === 3,
  'aberrant level 1 set',
)
assert(CLOCKWORK_SOUL_SPELLS.length === 10, 'clockwork 10')
assert(DIVINE_AFFINITY_SPELL.good === 'Cure Wounds', 'good affinity')
assert(LUNAR_SPELLS.filter((row) => row.phase === 'full_moon').length === 5, 'full moon column')
assert(psionicSorceryPointCost(3) === 3, 'psionic cost is spell level')
assert(psionicSorceryPointCost(1) === 1, 'psionic 1st is 1, not 2')
assert(EYES_OF_THE_DARK_COST === 2, 'eyes of the dark costs 2')
assert(normalizeLunarPhase('full') === 'full_moon', 'catalog full maps to feature')
assert(familiarCostNote(0) === 'ритуал, ячейка не списана', 'ritual is not slot 1')
assert(familiarCostNote(1) === 'ячейка 1 списана', 'spent slot is named')
assert(!invocationIsSelectable('lifedrinker', 2, null), 'lifedrinker blocked at 2')
assert(!invocationIsSelectable('book_of_ancient_secrets', 2, null), 'tome book blocked at 2')
assert(invocationIsSelectable('lifedrinker', 12, 'blade'), 'lifedrinker at 12 with blade')
assert(!invocationIsSelectable('lifedrinker', 12, 'tome'), 'lifedrinker needs blade')

assert(
  spellOnWarlockExpandedList({
    spellSlug: 'fireball',
    subclassSlug: 'the_fiend',
    genieKind: null,
  }),
  'fiend fireball',
)
assert(
  spellOnWarlockExpandedList({
    spellSlug: 'burning_hands',
    subclassSlug: 'the_fiend',
    genieKind: null,
  }),
  'fiend burning hands',
)
assert(
  !spellOnWarlockExpandedList({
    spellSlug: 'burning_hands',
    subclassSlug: 'the_genie',
    genieKind: 'dao',
  }),
  'dao has no burning hands',
)
assert(
  spellOnWarlockExpandedList({
    spellSlug: 'burning_hands',
    subclassSlug: 'the_genie',
    genieKind: 'efreeti',
  }),
  'efreeti burning hands',
)
assert(
  spellOnWarlockExpandedList({
    spellSlug: 'wish',
    subclassSlug: 'the_genie',
    genieKind: 'marid',
  }),
  'genie wish',
)
assert(warlockExpandedSlugSet('the_genie', 'djinni').has('seeming'), 'djinni seeming')

const shelf: GrimoireShelfSource = {
  slug: 'sorcerer',
  labelRu: 'Чародей',
  mode: 'known',
  aloneMaxLevel: 5,
  subclassSlug: 'divine_soul',
}
assert(
  catalogSpellMatchesShelf(['cleric'], 1, shelf, [], 'cure_wounds'),
  'divine soul learns cure wounds',
)
assert(
  catalogSpellMatchesShelf(['cleric'], 0, shelf, [], 'sacred_flame'),
  'divine soul learns sacred flame',
)
assert(
  !catalogSpellMatchesShelf(['cleric'], 1, { ...shelf, subclassSlug: 'draconic_bloodline' }, [], 'cure_wounds'),
  'red dragon does not get the cleric list',
)
assert(
  pack04ExtraClassList({
    catalogClasses: ['wizard', 'sorcerer'],
    spellSlug: 'fireball',
    shelfSlug: 'warlock',
    subclassSlug: 'the_fiend',
  }),
  'fireball joins the fiend list',
)

const created = addFlexibleSpellSlot({ '1': { max: 4, used: 0 } }, 1)
assert(created?.['1']?.max === 5 && created['1']?.flexible === 1, 'flexible slot beyond full')
const rested = applyLongRest({
  resources: [],
  slots: created!,
  pact_slots: null,
  exhaustion: 0,
  hp_max: 10,
  hit_dice_current: 1,
  hit_dice_max: 1,
})
assert(rested.slots?.['1']?.max === 4 && rested.slots['1']?.flexible == null, 'long rest drops flexible')

const short = applyShortRest({
  resources: [
    {
      id: 'feat:sorcerer:sorcery_points:s1',
      name: 'Очки чародейства',
      max: 20,
      used: 6,
      reset: 'long',
    },
  ],
})
assert(short.resources[0]?.used === 2, 'sorcerer 20 short rest regains 4')
const early = applyShortRest({
  resources: [
    {
      id: 'feat:sorcerer:sorcery_points:s1',
      name: 'Очки',
      max: 9,
      used: 6,
      reset: 'long',
    },
  ],
})
assert(early.resources[0]?.used === 6, 'below 20 no restoration')

const bolt = resolveCastEffect(
  {
    level: 0,
    damage: '1d10 огонь',
    damage_at_character_level: { '1': '1d10', '5': '2d10' },
  },
  { characterLevel: 9, slotLevel: 0, affinity: { damageType: 'огонь', amount: 3 } },
)
assert(bolt.effect.includes('2d10') && bolt.effect.includes('огонь+3'), `fire bolt affinity ${bolt.effect}`)
const meteor = applyElementalAffinityBonus('20d6 огонь, 20d6 дробящий', 'огонь', 5)
assert(meteor === '20d6 огонь+5, 20d6 дробящий', meteor)

const spells: SpellsState = {
  casting_ability: 'cha',
  max_prepared: null,
  slots: {},
  pact_slots: null,
  known: [],
}
const picks = setFeaturePick(emptyFeaturePicks(), 'c1', 'divine_magic', 'good')
const synced = syncSorcererOriginSpells({
  spells,
  classes: [
    {
      id: 'c1',
      name: 'Чародей',
      level: 9,
      subclass_name: 'Божественная душа',
    },
  ],
  featurePicks: picks,
  subclassGrants: [],
})
assert(
  synced.spells.known.some((row) => row.level === 1 && /cure|лечение|ран/i.test(row.name)),
  `divine bonus spell present: ${synced.spells.known.map((row) => row.name).join(', ')}`,
)
assert(synced.spells.known[0]?.prepared_locked === true, 'origin spell does not count as a normal known')
assert(synced.spells.known[0]?.damage || synced.spells.known[0]?.range, 'origin spell has catalog fields')

const blank = createSheetSpell()
assert(blank.id.length > 0, 'sheet spell id')

console.log('pack04SorcererWarlock.selfcheck: ok')
