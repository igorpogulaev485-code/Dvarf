/**
 * Selfcheck: always-prepared enrichment + Artillerist seed parse.
 * Run: npx tsx frontend/src/features/characters/alwaysPreparedSpellEnrichment.selfcheck.ts
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseSubclassGrantDef } from '../../shared/dnd/subclassGrants.ts'
import { alwaysPreparedSpellNameRu } from '../../shared/dnd/alwaysPreparedSpellNamesRu.ts'
import {
  enrichAlwaysPreparedSheetSpell,
  findBundledSpellForAlwaysPrepared,
} from './alwaysPreparedSpellEnrichment.ts'
import { asAlwaysPreparedSpell, createSheetSpell } from './spells.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const seedPath = join(
  here,
  '../../../../backend/data/classes/subclass_catalog_seed_2014.json',
)
const seed = JSON.parse(readFileSync(seedPath, 'utf8')) as {
  classes: Array<{
    parent_slug?: string
    subclasses?: Array<Record<string, unknown>>
  }>
}

const artillerist = seed.classes
  .find((c) => c.parent_slug === 'artificer')
  ?.subclasses?.find((s) => s.slug === 'artillerist')
assert(artillerist, 'artillerist in seed')

const def = parseSubclassGrantDef({
  slug: 'artillerist',
  nameRu: 'Артиллерист',
  parentSlug: 'artificer',
  catalogData: artillerist,
})
assert(def, 'parse artillerist')
assert(def.alwaysPreparedSpells.length === 10, '10 artillerist spells')
assert(def.alwaysPreparedSpells[0]?.fromClassLevel === 3, 'shield from L3')
assert(def.alwaysPreparedSpells[9]?.fromClassLevel === 17, 'wall of force L17')
assert(alwaysPreparedSpellNameRu('Shield') === 'Щит', 'Shield → Щит')
assert(alwaysPreparedSpellNameRu('Cone of Cold') === 'Конус холода', 'Cone RU')

const blessEntry = findBundledSpellForAlwaysPrepared('Bless', 'Благословение')
assert(blessEntry, 'Bless in bundled catalog')
assert(blessEntry.data?.concentration === true, 'Bless concentration in data')

const enriched = asAlwaysPreparedSpell(
  enrichAlwaysPreparedSheetSpell(
    {
      ...createSheetSpell(),
      id: 'test-bless',
      name: 'Благословение',
      level: 1,
    },
    'Bless',
  ),
  { source_kind: 'subclass', label: 'Домен жизни' },
)
assert(enriched.concentration === true, 'enriched Bless sets concentration')
assert(enriched.prepared_locked === true, 'still locked')
assert(enriched.catalog_id, 'catalog_id bound')
assert(
  (enriched.duration || '').toLowerCase().includes('концентрац'),
  'duration mentions concentration',
)

console.log('alwaysPreparedSpellEnrichment.selfcheck: ok')
