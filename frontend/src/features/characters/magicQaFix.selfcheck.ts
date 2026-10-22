/**
 * QA 22.10 confirmed magic fixes — grant pipeline evidence.
 * Run: npx tsx frontend/src/features/characters/magicQaFix.selfcheck.ts
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseSubclassGrantDef } from '../../shared/dnd/subclassGrants.ts'
import { resolveCastEffect } from '../../shared/dnd/spellCatalog.ts'
import {
  applySubclassGrantToDraft,
  syncSubclassAlwaysPreparedSpells,
  type SubclassGrantDraftSlice,
} from './subclassEffects.ts'
import { createSheetSpell, type SpellsState } from './spells.ts'

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
    casting_ability: 'int',
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
  }
}

// --- C1: Life Domain Bless gets concentration ---
{
  const life = findSub('cleric', 'life_domain')
  const def = parseSubclassGrantDef({
    slug: 'life_domain',
    nameRu: 'Домен жизни',
    parentSlug: 'cleric',
    catalogData: life,
  })
  assert(def, 'life domain parse')
  const applied = applySubclassGrantToDraft({
    draft: emptyDraft(),
    classEntryId: 'cleric-1',
    catalogId: 'life',
    def,
    classLevel: 1,
    maxSpellLevel: 1,
  })
  assert(applied, 'life apply')
  const bless = applied.draft.spells.known.find((s) => s.name === 'Благословение')
  assert(bless, 'Bless granted')
  assert(bless.concentration === true, 'C1 Bless concentration')
  assert(bless.prepared_locked === true, 'Bless locked')
  assert(bless.catalog_id, 'Bless catalog_id')
  console.log('C1 Bless concentration: ok')
}

// --- B1: Artillerist 10 at L20; gated at L3 ---
{
  const art = findSub('artificer', 'artillerist')
  const def = parseSubclassGrantDef({
    slug: 'artillerist',
    nameRu: 'Артиллерист',
    parentSlug: 'artificer',
    catalogData: art,
  })
  assert(def, 'artillerist parse')
  assert(def.alwaysPreparedSpells.length === 10, '10 specialty spells in def')

  const artPicks = { values: { eldritch_cannon: 'force_ballista' } }

  const at3 = applySubclassGrantToDraft({
    draft: emptyDraft(),
    classEntryId: 'art-1',
    catalogId: 'art',
    def,
    picks: artPicks,
    classLevel: 3,
    maxSpellLevel: 1,
  })
  assert(at3, 'art L3 apply')
  assert(at3.draft.spells.known.length === 2, `L3 grants 2, got ${at3.draft.spells.known.length}`)
  assert(
    at3.draft.spells.known.some((s) => s.name === 'Щит'),
    'Shield at L3',
  )

  const at20 = applySubclassGrantToDraft({
    draft: emptyDraft(),
    classEntryId: 'art-1',
    catalogId: 'art',
    def,
    picks: artPicks,
    classLevel: 20,
    maxSpellLevel: 5,
  })
  assert(at20, 'art L20 apply')
  assert(
    at20.draft.spells.known.length === 10,
    `L20 grants 10, got ${at20.draft.spells.known.length}`,
  )
  assert(
    at20.draft.subclassGrants[0]?.alwaysPreparedSpells?.every(
      (s) => s.fromClassLevel != null,
    ),
    'fromClassLevel kept in snapshot',
  )

  const synced = syncSubclassAlwaysPreparedSpells({
    draft: {
      ...at20.draft,
      // Simulate mid-level sheet that still has full snapshot but class is 5
      spells: { ...at20.draft.spells, known: [...at20.draft.spells.known] },
    },
    maxSpellLevel: 2,
    classLevelsByEntryId: { 'art-1': 5 },
  })
  assert(
    synced.spells.known.length === 4,
    `sync L5/slot2 → 4 spells, got ${synced.spells.known.length}`,
  )
  console.log('B1 Artillerist grants: ok')
}

// --- E1: Fire Bolt scale on card path ---
{
  const effect = resolveCastEffect(
    {
      level: 0,
      damage: '1d10 огонь',
      damage_at_character_level: {
        '1': '1d10',
        '5': '2d10',
        '11': '3d10',
        '17': '4d10',
      },
    },
    { characterLevel: 20, slotLevel: 1 },
  )
  assert(effect.effect.startsWith('4d10'), `E1 expected 4d10, got ${effect.effect}`)
  console.log('E1 Fire Bolt scale: ok')
}

// unused import guard for createSheetSpell in case future expands
void createSheetSpell

console.log('magicQaFix.selfcheck: all ok')
