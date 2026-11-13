/**
 * C-01: companion templates on grant, wildfire single card, backfill (U10), attacks.
 * Run: npx tsx frontend/src/features/characters/companionsC01.selfcheck.ts
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseSubclassGrantDef } from '../../shared/dnd/subclassGrants.ts'
import {
  backfillCompanionStatsFromTemplates,
  companionStatusChip,
  isCompanionStatEmpty,
  shouldShowOnCompanionStrip,
} from './companionBackfill.ts'
import { parseCompanionActionAttacks } from './companionAttacks.ts'
import {
  companionFromTemplate,
  resolveCompanionTemplate,
} from './companionTemplates.ts'
import { createCompanion } from './companions.ts'
import {
  applySubclassGrantToDraft,
  type SubclassGrantDraftSlice,
} from './subclassEffects.ts'
import { applyWildfireSpirit } from './wildShape.ts'
import { wildfireSpiritHp } from './bestiaryCompanionStats.ts'
import { type SpellsState } from './spells.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const seed = JSON.parse(
  readFileSync(
    join(here, '../../../../backend/data/classes/subclass_catalog_seed_2014.json'),
    'utf8',
  ),
) as {
  classes: Array<{
    parent_slug?: string
    subclasses?: Array<Record<string, unknown>>
  }>
}

function findSub(parent: string, slug: string): Record<string, unknown> {
  for (const cls of seed.classes) {
    if (cls.parent_slug !== parent) continue
    for (const sub of cls.subclasses ?? []) {
      if (sub.slug === slug) return sub
    }
  }
  throw new Error(`missing ${parent}/${slug}`)
}

function emptySpells(): SpellsState {
  return {
    casting_ability: 'wis',
    max_prepared: null,
    slots: Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [String(i + 1), { max: 0, used: 0 }]),
    ),
    pact_slots: null,
    known: [],
  }
}

function emptyDraft(): SubclassGrantDraftSlice {
  return {
    identity: {
      armor: { light: false, medium: false, heavy: false, shields: false },
      weapons: { simple: false, martial: false },
      tools: [],
      languages: [],
    },
    skills: {},
    classGrants: [],
    subclassGrants: [],
    subclassTransitions: [],
    raceGrant: null,
    companions: [],
    textBlocks: [],
    spells: emptySpells(),
  } as SubclassGrantDraftSlice
}

// --- Wildfire template full block ---
{
  const tpl = resolveCompanionTemplate({
    choiceId: 'wildfire_spirit',
    pickValue: '',
    ctx: { hostClassLevel: 5, characterLevel: 5, spellMod: 3 },
  })
  assert(tpl, 'wildfire template')
  assert(tpl.kind === 'ally', 'kind ally')
  assert(tpl.stats.hp_max === 30, `hp_max L5 got ${tpl.stats.hp_max}`)
  assert(tpl.stats.ac === 13, 'ac 13')
  assert(tpl.stats.speed === 30, 'speed 30')
  assert(tpl.stats.speed_fly === 30, 'fly 30')
  assert(tpl.stats.str === 10, 'str 10')
  assert(String(tpl.stats.immunities || '').includes('огонь'), 'fire immunity')
  assert(tpl.actions.includes('Семя пламени'), 'flame seed')
  console.log('C01 wildfire template L5: ok')
}

// --- Grant creates filled inactive card ---
{
  const raw = findSub('druid', 'circle_of_wildfire')
  const def = parseSubclassGrantDef({
    slug: 'circle_of_wildfire',
    nameRu: 'Круг дикого огня',
    parentSlug: 'druid',
    catalogData: raw,
  })
  assert(def, 'wildfire def')
  const applied = applySubclassGrantToDraft({
    draft: emptyDraft(),
    classEntryId: 'druid-1',
    catalogId: 'wf',
    def,
    picks: { values: { wildfire_spirit: 'Искра' } },
    classLevel: 5,
    characterLevel: 5,
    spellMod: 3,
  })
  assert(applied, 'wildfire apply')
  const spirit = applied.draft.companions.find((c) => c.name === 'Искра')
  assert(spirit, 'named spirit')
  assert(spirit.active === false, 'not summoned')
  assert(companionStatusChip(spirit) === 'не призван', 'chip')
  assert(spirit.stats.hp_max === 30, 'hp 30')
  assert(spirit.stats.ac === 13, 'ac')
  assert(spirit.stats.speed_fly === 30, 'fly')
  assert(!isCompanionStatEmpty(spirit.actions), 'actions filled')
  console.log('C01 grant wildfire «Искра»: ok')
}

// --- Summon reuses same card, recalculates HP ---
{
  const tpl = resolveCompanionTemplate({
    choiceId: 'wildfire_spirit',
    pickValue: '',
    ctx: { hostClassLevel: 5, characterLevel: 5, spellMod: 3 },
  })
  assert(tpl, 'tpl')
  const grantCard = companionFromTemplate({
    template: tpl,
    name: 'Искра',
    source: {
      kind: 'subclass',
      labelRu: 'Дух',
      feature: 'wildfire_spirit',
      classEntryId: 'druid-1',
    },
  })
  const inactive = { ...grantCard, active: false }
  const summoned = applyWildfireSpirit({
    companions: [inactive],
    druidLevel: 5,
    spellMod: 3,
  })
  assert(summoned.length === 1, 'no duplicate')
  assert(summoned[0]!.id === inactive.id, 'same id')
  assert(summoned[0]!.active === true, 'active')
  assert(summoned[0]!.stats.hp_max === 30, 'hp still 30')

  const resummoned = applyWildfireSpirit({
    companions: [{ ...summoned[0]!, active: false }],
    druidLevel: 6,
    spellMod: 3,
  })
  assert(resummoned[0]!.stats.hp_max === 35, `resummon L6 got ${resummoned[0]!.stats.hp_max}`)
  assert(wildfireSpiritHp(6) === 35, 'formula')
  console.log('C01 wildfire single card + HP on resummon: ok')
}

// --- U10 backfill ---
{
  const emptyCannon = createCompanion({
    kind: 'eldritch_cannon',
    name: 'Баллиста',
    active: false,
    source: {
      kind: 'subclass',
      labelRu: 'Пушка',
      feature: 'eldritch_cannon',
      classEntryId: 'art-1',
    },
    stats: { hp: null, hp_max: null, ac: null, speed: null },
    actions: '—',
  })
  const manualAc = createCompanion({
    kind: 'steel_defender',
    name: 'Щит',
    active: false,
    source: {
      kind: 'subclass',
      labelRu: 'Защитник',
      feature: 'steel_defender_name',
      classEntryId: 'art-1',
    },
    stats: { hp: null, hp_max: null, ac: 17, speed: null },
    actions: '',
  })
  const first = backfillCompanionStatsFromTemplates({
    companions: [emptyCannon, manualAc],
    ctx: { hostClassLevel: 3, characterLevel: 3, hostIntMod: 3 },
  })
  assert(first.filledCount === 2, `filled ${first.filledCount}`)
  assert(first.companions[0]!.stats.hp_max != null, 'cannon hp')
  assert(first.companions[0]!.stats.ac === 18, 'cannon ac')
  assert(
    first.companions[0]!.actions.trim() && first.companions[0]!.actions !== '—',
    'cannon actions',
  )
  assert(first.companions[1]!.stats.ac === 17, 'manual AC kept')
  assert(first.companions[1]!.stats.hp_max != null, 'defender hp')

  const second = backfillCompanionStatsFromTemplates({
    companions: first.companions,
    ctx: { hostClassLevel: 3, characterLevel: 3, hostIntMod: 3 },
  })
  assert(second.filledCount === 0, 'second pass 0')
  assert(second.companions === first.companions, 'same ref')
  console.log('C01 U10 backfill: ok')
}

// --- Strip filter ---
{
  const permanent = createCompanion({
    kind: 'ally',
    name: 'Искра',
    active: false,
    source: { kind: 'subclass', labelRu: 'Дух', feature: 'wildfire_spirit' },
  })
  const spellGone = createCompanion({
    kind: 'ally',
    name: 'Фея',
    active: false,
    nature: 'summoned',
    source: { kind: 'spell', labelRu: 'Призыв феи', spellId: 'x' },
  })
  assert(shouldShowOnCompanionStrip(permanent) === true, 'permanent stays')
  assert(shouldShowOnCompanionStrip(spellGone) === false, 'spell hidden')
  console.log('C01 strip filter: ok')
}

// --- Attacks ---
{
  const tpl = resolveCompanionTemplate({
    choiceId: 'wildfire_spirit',
    pickValue: '',
    ctx: { hostClassLevel: 5, characterLevel: 5, spellMod: 4 },
  })
  assert(tpl, 'tpl2')
  const spirit = companionFromTemplate({
    template: tpl,
    name: 'Искра',
    source: { kind: 'subclass', labelRu: 'Дух', feature: 'wildfire_spirit' },
  })
  const active = { ...spirit, active: true }
  const atks = parseCompanionActionAttacks(active, {
    characterLevel: 5,
    spellMod: 4,
  })
  assert(atks.some((a) => a.name.includes('Семя')), 'has seed')
  const seed = atks.find((a) => a.name.includes('Семя'))!
  assert(seed.attackBonus >= 3, `atk ${seed.attackBonus}`)
  assert(/1к6/.test(seed.damageExpr), 'dmg')
  const inactiveAtks = parseCompanionActionAttacks(
    { ...active, active: false },
    { characterLevel: 5, spellMod: 4 },
  )
  assert(inactiveAtks.length === 0, 'inactive no atk')
  console.log('C01 companion attacks: ok')
}

// --- Artillerist grant ---
{
  const raw = findSub('artificer', 'artillerist')
  const def = parseSubclassGrantDef({
    slug: 'artillerist',
    nameRu: 'Артиллерист',
    parentSlug: 'artificer',
    catalogData: raw,
  })
  assert(def, 'art def')
  const applied = applySubclassGrantToDraft({
    draft: emptyDraft(),
    classEntryId: 'art-1',
    catalogId: 'art',
    def,
    picks: { values: { eldritch_cannon: 'force_ballista' } },
    classLevel: 3,
    characterLevel: 3,
    hostIntMod: 3,
  })
  assert(applied, 'art apply')
  const cannon = applied.draft.companions.find((c) => c.kind === 'eldritch_cannon')
  assert(cannon, 'cannon card')
  assert(cannon.active === false, 'cannon not summoned')
  assert(cannon.stats.ac === 18, 'ac 18')
  assert(cannon.stats.hp_max === 15, `hp ${cannon.stats.hp_max}`)
  console.log('C01 artillerist cannon grant: ok')
}

console.log('companionsC01.selfcheck: all ok')
