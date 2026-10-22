/**
 * QA 22.10 confirmed magic fixes — grant pipeline evidence.
 * Run: npx tsx frontend/src/features/characters/magicQaFix.selfcheck.ts
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { highestSpellSlotLevelForClasses } from '../../shared/dnd/casterProgression.ts'
import { parseSubclassGrantDef } from '../../shared/dnd/subclassGrants.ts'
import { resolveCastEffect } from '../../shared/dnd/spellCatalog.ts'
import { hydrateAlwaysPreparedMechanics } from './hydrateAlwaysPrepared.ts'
import {
  applySubclassGrantToDraft,
  syncSubclassAlwaysPreparedSpells,
  type SubclassGrantDraftSlice,
} from './subclassEffects.ts'
import { asAlwaysPreparedSpell, createSheetSpell, type SpellsState } from './spells.ts'

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

// --- Hydrate legacy Bless stub on open ---
{
  const stub = asAlwaysPreparedSpell(
    {
      ...createSheetSpell(),
      id: 'legacy-bless',
      name: 'Благословение',
      level: 1,
      concentration: false,
    },
    { source_kind: 'subclass', label: 'Домен жизни' },
  )
  const hydrated = hydrateAlwaysPreparedMechanics([stub])
  assert(hydrated.changed, 'hydrate detects legacy Bless')
  assert(hydrated.known[0]?.concentration === true, 'hydrate sets concentration')
  console.log('hydrate legacy Bless: ok')
}

// --- Q1 RAW: domain/oath gated by class-alone max, not shared multiclass slots ---
{
  const life = findSub('cleric', 'life_domain')
  const devotion = findSub('paladin', 'oath_of_devotion')
  const lifeDef = parseSubclassGrantDef({
    slug: 'life_domain',
    nameRu: 'Домен жизни',
    parentSlug: 'cleric',
    catalogData: life,
  })
  const devotionDef = parseSubclassGrantDef({
    slug: 'oath_of_devotion',
    nameRu: 'Клятва преданности',
    parentSlug: 'paladin',
    catalogData: devotion,
  })
  assert(lifeDef && devotionDef, 'Q1 domain/oath parse')

  // Cleric4 alone → spell level 2; shared MC slots with Paladin4 would be 3 — must NOT unlock L3 domain.
  {
    const slotCap = highestSpellSlotLevelForClasses([
      {
        id: 'cleric-1',
        name: 'Жрец',
        catalog_id: 'cleric',
        level: 4,
        subclass_name: 'Домен жизни',
        subclass_catalog_id: 'life',
      },
      {
        id: 'paladin-1',
        name: 'Паладин',
        catalog_id: 'paladin',
        level: 4,
        subclass_name: 'Клятва преданности',
        subclass_catalog_id: 'devotion',
      },
    ])
    assert(slotCap === 3, `Q1 shared slot cap → 3, got ${slotCap}`)

    let draft = emptyDraft()
    const lifeApplied = applySubclassGrantToDraft({
      draft,
      classEntryId: 'cleric-1',
      catalogId: 'life',
      def: lifeDef,
      classLevel: 4,
      maxSpellLevel: slotCap,
    })
    assert(lifeApplied, 'Q1 life apply')
    draft = lifeApplied.draft
    const devotionApplied = applySubclassGrantToDraft({
      draft,
      classEntryId: 'paladin-1',
      catalogId: 'devotion',
      def: devotionDef,
      classLevel: 4,
      maxSpellLevel: slotCap,
    })
    assert(devotionApplied, 'Q1 devotion apply')
    const lifeSpells = devotionApplied.draft.spells.known.filter((s) =>
      s.id.includes('life_domain') || s.id.includes('cleric-1'),
    )
    // Life domain rows use subclassSpellId(classEntryId, slug, …)
    const lifeOnly = devotionApplied.draft.subclassGrants
      .find((g) => g.slug === 'life_domain')
      ?.grantedSpellIds.length
    assert(lifeOnly === 4, `Q1 Life at Cleric4 → 4 spells (≤L2), got ${lifeOnly}`)
    const palOnly = devotionApplied.draft.subclassGrants.find(
      (g) => g.slug === 'oath_of_devotion',
    )?.grantedSpellIds.length
    assert(palOnly === 2, `Q1 Devotion at Paladin4 → 2 spells (≤L1), got ${palOnly}`)
    const names = devotionApplied.draft.spells.known.map((s) => s.name)
    for (const name of [
      'Множественное лечение ран',
      'Маяк надежды',
      'Общение',
      'Небесный огонь',
    ]) {
      assert(!names.includes(name), `Q1 must not grant ${name}`)
    }
    void lifeSpells
  }

  // Cleric1 / Wizard9: shared slots = 5, but Life domain alone only 1st circle.
  {
    const slotCap = highestSpellSlotLevelForClasses([
      {
        id: 'cleric-1',
        name: 'Жрец',
        catalog_id: 'cleric',
        level: 1,
        subclass_name: 'Домен жизни',
        subclass_catalog_id: 'life',
      },
      {
        id: 'wizard-1',
        name: 'Волшебник',
        catalog_id: 'wizard',
        level: 9,
        subclass_name: '',
        subclass_catalog_id: null,
      },
    ])
    assert(slotCap === 5, `Q1 Cleric1/Wiz9 shared → 5, got ${slotCap}`)
    const applied = applySubclassGrantToDraft({
      draft: emptyDraft(),
      classEntryId: 'cleric-1',
      catalogId: 'life',
      def: lifeDef,
      classLevel: 1,
      maxSpellLevel: slotCap,
    })
    assert(applied, 'Q1 life@1 apply')
    assert(
      applied.draft.spells.known.length === 2,
      `Q1 Life Cleric1 → 2 spells, got ${applied.draft.spells.known.length}`,
    )
    assert(
      applied.draft.spells.known.every((s) => s.level <= 1),
      'Q1 Life Cleric1 only 1st circle despite shared L5 slots',
    )
  }

  // Orphan legacy L5 domain row (empty grantedSpellIds) is stripped on sync.
  {
    const orphan = asAlwaysPreparedSpell(
      {
        ...createSheetSpell(),
        id: 'orphan-mass-cure',
        name: 'Множественное лечение ран',
        level: 5,
      },
      { source_kind: 'subclass', label: 'Домен жизни' },
    )
    const draft = emptyDraft()
    draft.spells.known = [orphan]
    const synced = syncSubclassAlwaysPreparedSpells({
      draft,
      maxSpellLevel: 9,
      classLevelsByEntryId: {},
    })
    assert(
      !synced.spells.known.some((s) => s.id === 'orphan-mass-cure'),
      'Q1 orphan subclass always-prepared stripped',
    )
  }

  console.log('Q1 RAW class-alone domain/oath + orphan strip: ok')
}

// --- Q4: remaining Artificer specialists have 10 always-prepared ---
{
  for (const slug of ['alchemist', 'battle_smith', 'armorer'] as const) {
    const raw = findSub('artificer', slug)
    const def = parseSubclassGrantDef({
      slug,
      nameRu: String(raw.name_ru || slug),
      parentSlug: 'artificer',
      catalogData: raw,
    })
    assert(def, `${slug} parse`)
    assert(
      def.alwaysPreparedSpells.length === 10,
      `${slug} expected 10 APS, got ${def.alwaysPreparedSpells.length}`,
    )
    assert(
      def.alwaysPreparedSpells.every((s) => s.fromClassLevel != null),
      `${slug} fromClassLevel on all`,
    )
    const picks =
      slug === 'armorer'
        ? { values: { armor_model: 'guardian' } }
        : slug === 'battle_smith'
          ? { values: { steel_defender_name: 'Страж' } }
          : { values: {} }
    const at3 = applySubclassGrantToDraft({
      draft: emptyDraft(),
      classEntryId: `${slug}-1`,
      catalogId: slug,
      def,
      picks,
      classLevel: 3,
      maxSpellLevel: 1,
    })
    assert(at3, `${slug} L3 apply`)
    assert(
      at3.draft.spells.known.length === 2,
      `${slug} L3 → 2 spells, got ${at3.draft.spells.known.length}`,
    )
  }
  console.log('Q4 Artificer specialists APS: ok')
}

// --- Q4: druid circle spells (Spores / Stars / Wildfire) ---
{
  const expect: Record<string, number> = {
    circle_of_spores: 9,
    circle_of_stars: 2,
    circle_of_wildfire: 10,
  }
  for (const [slug, n] of Object.entries(expect)) {
    const raw = findSub('druid', slug)
    const def = parseSubclassGrantDef({
      slug,
      nameRu: String(raw.name_ru || slug),
      parentSlug: 'druid',
      catalogData: raw,
    })
    assert(def, `${slug} parse`)
    assert(
      def.alwaysPreparedSpells.length === n,
      `${slug} expected ${n}, got ${def.alwaysPreparedSpells.length}`,
    )
    const picks =
      slug === 'circle_of_stars'
        ? { values: { star_map: 'scroll' } }
        : { values: {} }
    const at2 = applySubclassGrantToDraft({
      draft: emptyDraft(),
      classEntryId: `${slug}-1`,
      catalogId: slug,
      def,
      picks,
      classLevel: 2,
      maxSpellLevel: 1,
    })
    assert(at2, `${slug} L2 apply`)
    const unlocked = at2.draft.spells.known.length
    assert(unlocked >= 1, `${slug} L2 grants ≥1, got ${unlocked}`)
  }
  console.log('Q4 Druid Spores/Stars/Wildfire APS: ok')
}

// --- Q2: EGW dunamancy subclass tags ---
{
  const spellsPath = join(here, '../../../../frontend/public/spells-2014.json')
  const rows = JSON.parse(readFileSync(spellsPath, 'utf8')) as Array<{
    slug: string
    source?: string
    data?: {
      classes?: string[]
      subclasses?: Array<{ class?: string; subclass?: string }>
    }
  }>
  const egw = rows.filter((r) => r.source === 'egw-2014')
  assert(egw.length === 15, `EGW count ${egw.length}`)
  for (const row of egw) {
    assert(
      JSON.stringify(row.data?.classes) === JSON.stringify(['wizard']),
      `${row.slug} classes`,
    )
    const subs = row.data?.subclasses ?? []
    assert(subs.length === 2, `${row.slug} subclasses len`)
    const keys = new Set(subs.map((s) => `${s.class}/${s.subclass}`))
    assert(keys.has('wizard/chronurgy_magic'), `${row.slug} chronurgy`)
    assert(keys.has('wizard/graviturgy_magic'), `${row.slug} graviturgy`)
  }
  const encode = rows.find((r) => r.slug === 'encode_thoughts')
  assert(encode, 'encode_thoughts')
  assert(
    JSON.stringify(encode.data?.classes) === JSON.stringify(['wizard']),
    'encode_thoughts wizard',
  )
  assert(!(encode.data?.subclasses?.length), 'encode_thoughts no subclass gate')
  console.log('Q2 EGW dunamancy tags: ok')
}

// --- Q4: Circle of the Land by land_type ---
{
  const raw = findSub('druid', 'circle_of_the_land')
  const def = parseSubclassGrantDef({
    slug: 'circle_of_the_land',
    nameRu: 'Круг земли',
    parentSlug: 'druid',
    catalogData: raw,
  })
  assert(def, 'land parse')
  assert(def.alwaysPreparedSpells.length === 64, `land aps ${def.alwaysPreparedSpells.length}`)
  const arctic = def.alwaysPreparedSpells.filter(
    (s) => s.requiresChoice?.value === 'arctic',
  )
  assert(arctic.length === 8, `arctic ${arctic.length}`)

  const at3 = applySubclassGrantToDraft({
    draft: emptyDraft(),
    classEntryId: 'druid-1',
    catalogId: 'land',
    def,
    picks: { values: { land_type: 'arctic' } },
    classLevel: 3,
    maxSpellLevel: 2,
  })
  assert(at3, 'land L3 apply')
  assert(at3.draft.spells.known.length === 2, `arctic L3 known ${at3.draft.spells.known.length}`)
  assert(
    at3.draft.subclassGrants[0]?.alwaysPreparedSpells?.length === 8,
    'snapshot stores full arctic table',
  )

  const desert = applySubclassGrantToDraft({
    draft: emptyDraft(),
    classEntryId: 'druid-1',
    catalogId: 'land',
    def,
    picks: { values: { land_type: 'desert' } },
    classLevel: 9,
    maxSpellLevel: 5,
  })
  assert(desert, 'desert L9')
  assert(
    desert.draft.spells.known.length === 8,
    `desert L9 known ${desert.draft.spells.known.length}`,
  )
  const names = desert.draft.spells.known.map((s) => s.name)
  assert(names.some((n) => /тишина|silence/i.test(n) || n.includes('Тишина')), 'desert has Silence')
  console.log('Q4 Circle of the Land APS: ok')
}

console.log('magicQaFix.selfcheck: all ok')
