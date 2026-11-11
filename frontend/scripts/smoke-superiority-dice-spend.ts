/**
 * Smoke: Battle Master superiority dice options from feature picks.
 * Run: npx tsx scripts/smoke-superiority-dice-spend.ts
 */
import { unlockFeaturesForClasses } from '../src/shared/dnd/classFeatures'
import { desiredResourcesFromFeatures } from '../src/shared/dnd/featureResources'
import {
  emptyFeaturePicks,
  setFeaturePick,
} from '../src/shared/dnd/featurePicks'
import {
  listSuperioritySpendOptions,
  superiorityDieLabel,
} from '../src/shared/dnd/superiorityDiceSpend'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const entryId = 'f1'
const unlocked = unlockFeaturesForClasses({
  classes: [
    {
      id: entryId,
      name: 'Воин',
      catalog_id: null,
      level: 10,
      subclass_name: 'Мастер боевых искусств',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 10,
  subclassSlugByEntryId: { [entryId]: 'battle_master' },
})

assert(
  unlocked.some((f) => f.id === 'combat_superiority'),
  'combat superiority unlocked',
)
assert(
  unlocked.some((f) => f.resource?.pool_id === 'superiority_dice'),
  'superiority pool',
)

const die = superiorityDieLabel(unlocked, entryId)
assert(die === 'к10', `L10 die к10, got ${die}`)

let picks = emptyFeaturePicks()
assert(
  listSuperioritySpendOptions({
    features: unlocked,
    featurePicks: picks,
    classEntryId: entryId,
  }).length === 0,
  'no maneuvers until picked',
)

picks = setFeaturePick(
  picks,
  entryId,
  'combat_superiority',
  'precision_attack,trip_attack,rally',
)
const opts = listSuperioritySpendOptions({
  features: unlocked,
  featurePicks: picks,
  classEntryId: entryId,
})
assert(opts.length === 3, `3 maneuvers, got ${opts.length}`)
assert(
  opts.some((o) => o.maneuverId === 'precision_attack'),
  'precision',
)
assert(opts.every((o) => o.cost === 1), 'each costs 1 die')

const desired = desiredResourcesFromFeatures({
  features: unlocked,
  characterLevel: 10,
  classSlugByEntryId: { [entryId]: 'fighter' },
})
const pool = desired.find((r) => r.id.includes(':superiority_dice:'))
assert(pool, 'pool desired')
assert(pool.max === 5, `L10 BM has 5 dice (scale 7→5? wait) got ${pool.max}`)
// PHB: 4 at 3, 5 at 7, 6 at 15 — L10 = 5
assert(pool.reset === 'short', 'short rest')

console.log('smoke-superiority-dice-spend: ok', {
  die,
  maneuvers: opts.map((o) => o.nameRu),
  poolMax: pool.max,
})
