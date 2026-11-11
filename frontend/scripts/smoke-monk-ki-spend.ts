/**
 * Smoke: monk Ki spend options + spend_cost / linked amount.
 * Run: npx tsx scripts/smoke-monk-ki-spend.ts
 */
import { unlockFeaturesForClasses } from '../src/shared/dnd/classFeatures'
import {
  desiredResourcesFromFeatures,
  spendFeatureUse,
  spendPoolUses,
} from '../src/shared/dnd/featureResources'
import { listKiSpendOptions } from '../src/shared/dnd/monkKiSpend'
import type { SheetResource } from '../src/shared/dnd/rest'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const entryId = 'c1'
const unlocked = unlockFeaturesForClasses({
  classes: [
    {
      id: entryId,
      name: 'Монах',
      catalog_id: null,
      level: 18,
      subclass_name: 'Путь тени',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 18,
  subclassSlugByEntryId: { [entryId]: 'way_of_shadow' },
})

const kiOpts = listKiSpendOptions(unlocked)
const ids = new Set(kiOpts.map((o) => o.featureId))
assert(ids.has('flurry_of_blows'), 'flurry in picker')
assert(ids.has('patient_defense'), 'patient defense in picker')
assert(ids.has('stunning_strike'), 'stun in picker')
assert(ids.has('empty_body'), 'empty body in picker')
assert(ids.has('shadow_arts'), 'shadow arts in picker')
assert(
  kiOpts.some((o) => o.featureId === 'empty_body' && o.cost === 4),
  'empty body invis 4',
)
assert(
  kiOpts.some((o) => o.featureId === 'empty_body' && o.cost === 8),
  'empty body astral 8',
)
assert(
  kiOpts.find((o) => o.featureId === 'shadow_arts')?.cost === 2,
  'shadow arts costs 2',
)

const desired = desiredResourcesFromFeatures({
  features: unlocked,
  characterLevel: 18,
  classSlugByEntryId: { [entryId]: 'monk' },
})
const kiDesired = desired.find((r) => r.id.includes(':ki:'))
assert(kiDesired, 'ki pool desired')
assert(kiDesired.max === 18, `ki max 18 got ${kiDesired.max}`)

let resources: SheetResource[] = desired.map((r) => ({
  id: r.id,
  name: r.name,
  max: r.max,
  used: 0,
  reset: r.reset,
}))

const flurry = unlocked.find((f) => f.id === 'flurry_of_blows')!
const spentFlurry = spendFeatureUse({
  resources,
  feature: flurry,
  classSlug: 'monk',
})
assert(spentFlurry.ok, spentFlurry.message)
resources = spentFlurry.resources
const kiPool = resources.find((r) => r.id.includes(':ki:'))!
assert(kiPool.used === 1, `flurry spends 1 ki, used=${kiPool.used}`)

const shadow = unlocked.find((f) => f.id === 'shadow_arts')!
const spentShadow = spendFeatureUse({
  resources,
  feature: shadow,
  classSlug: 'monk',
})
assert(spentShadow.ok, spentShadow.message)
resources = spentShadow.resources
const kiAfterShadow = resources.find((r) => r.id.includes(':ki:'))!
assert(
  kiAfterShadow.used === 3,
  `shadow arts +2 ki → used 3, got ${kiAfterShadow.used}`,
)

const empty = spendPoolUses({
  resources,
  classSlug: 'monk',
  poolId: 'ki',
  classEntryId: entryId,
  amount: 4,
  label: 'Пустое тело',
})
assert(empty.ok, empty.message)
assert(
  empty.resources.find((r) => r.id.includes(':ki:'))!.used === 7,
  'empty body −4',
)

console.log('smoke-monk-ki-spend: ok', {
  options: kiOpts.length,
  sample: kiOpts.slice(0, 5).map((o) => `${o.nameRu}−${o.cost}`),
})
