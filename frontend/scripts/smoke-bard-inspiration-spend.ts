/**
 * Smoke: Bardic Inspiration spend options + mantle linked amount.
 * Run: npx tsx scripts/smoke-bard-inspiration-spend.ts
 */
import { unlockFeaturesForClasses } from '../src/shared/dnd/classFeatures'
import {
  bardicInspirationDieLabel,
  listBardicInspirationSpendOptions,
} from '../src/shared/dnd/bardInspirationSpend'
import {
  desiredResourcesFromFeatures,
  spendFeatureUse,
} from '../src/shared/dnd/featureResources'
import type { SheetResource } from '../src/shared/dnd/rest'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const entryId = 'b1'
const unlocked = unlockFeaturesForClasses({
  classes: [
    {
      id: entryId,
      name: 'Бард',
      catalog_id: null,
      level: 5,
      subclass_name: 'Коллегия знаний',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 5,
  abilities: { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 16 },
  subclassSlugByEntryId: { [entryId]: 'college_of_lore' },
})

const opts = listBardicInspirationSpendOptions(unlocked)
assert(
  opts.some((o) => o.featureId === 'give_bardic_inspiration'),
  'give die option',
)
assert(opts.some((o) => o.featureId === 'cutting_words'), 'cutting words')
assert(
  !opts.some((o) => o.featureId === 'font_of_inspiration'),
  'font is not a spend option',
)

const die = bardicInspirationDieLabel(unlocked, entryId)
assert(die === '1к8', `L5 die is 1к8, got ${die}`)

const desired = desiredResourcesFromFeatures({
  features: unlocked,
  characterLevel: 5,
  abilities: { cha: 16 },
  classSlugByEntryId: { [entryId]: 'bard' },
})
const bi = desired.find((r) => r.id.includes(':bardic_inspiration:'))
assert(bi, 'BI pool')
assert(bi.max === 3, `Cha 16 → 3 uses, got ${bi.max}`)
assert(bi.reset === 'short', `Font → short reset, got ${bi.reset}`)

let resources: SheetResource[] = desired.map((r) => ({
  id: r.id,
  name: r.name,
  max: r.max,
  used: 0,
  reset: r.reset,
}))

const cutting = unlocked.find((f) => f.id === 'cutting_words')!
const spent = spendFeatureUse({
  resources,
  feature: cutting,
  classSlug: 'bard',
})
assert(spent.ok, spent.message)
resources = spent.resources
const after = resources.find((r) => r.id.includes(':bardic_inspiration:'))!
assert(after.used === 1, `cutting words spends 1 BI, used=${after.used}`)

// Glamour mantle at L3
const glamour = unlockFeaturesForClasses({
  classes: [
    {
      id: 'g1',
      name: 'Бард',
      catalog_id: null,
      level: 3,
      subclass_name: 'Коллегия очарования',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 3,
  abilities: { cha: 16 },
  subclassSlugByEntryId: { g1: 'college_of_glamour' },
})
const mantleOpts = listBardicInspirationSpendOptions(glamour)
assert(
  mantleOpts.some((o) => o.featureId === 'mantle_of_inspiration'),
  'mantle of inspiration in picker',
)

console.log('smoke-bard-inspiration-spend: ok', {
  loreOptions: opts.map((o) => o.nameRu),
  die,
  biMax: bi.max,
  biReset: bi.reset,
})
