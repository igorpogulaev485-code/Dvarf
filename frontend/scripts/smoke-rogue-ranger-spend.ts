/**
 * Smoke: Soulknife psi dice, Phantom soul trinkets, Ranger favored desk.
 * Run: npx tsx scripts/smoke-rogue-ranger-spend.ts
 */
import { unlockFeaturesForClasses } from '../src/shared/dnd/classFeatures'
import { desiredResourcesFromFeatures } from '../src/shared/dnd/featureResources'
import {
  emptyFeaturePicks,
  setFeaturePick,
} from '../src/shared/dnd/featurePicks'
import {
  listPsiSpendOptions,
  psionicDieLabel,
} from '../src/shared/dnd/soulknifePsiSpend'
import { listSoulTrinketBurnOptions } from '../src/shared/dnd/soulTrinketsSpend'
import {
  listKnownFavoredEnemies,
  listKnownFavoredTerrains,
} from '../src/shared/dnd/rangerFavoredDesk'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// —— Soulknife ——
const skEntry = 'r1'
const skUnlocked = unlockFeaturesForClasses({
  classes: [
    {
      id: skEntry,
      name: 'Плут',
      catalog_id: null,
      level: 17,
      subclass_name: 'Soulknife',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 17,
  subclassSlugByEntryId: { [skEntry]: 'soulknife' },
})

assert(
  skUnlocked.some((f) => f.id === 'psionic_power'),
  'psionic power',
)
assert(
  skUnlocked.some((f) => f.id === 'psi_bolstered_knack'),
  'knack unlocked',
)
assert(
  skUnlocked.some((f) => f.id === 'psychic_whispers'),
  'whispers unlocked',
)
assert(
  skUnlocked.some((f) => f.id === 'homing_strikes'),
  'homing unlocked',
)
assert(
  skUnlocked.some((f) => f.id === 'psychic_teleportation'),
  'teleport unlocked',
)

const die = psionicDieLabel(skUnlocked, skEntry)
assert(die === 'к12', `L17 die к12, got ${die}`)

const psiOpts = listPsiSpendOptions(skUnlocked)
const psiIds = new Set(psiOpts.map((o) => o.featureId))
assert(psiIds.has('psi_bolstered_knack'), 'knack in picker')
assert(psiIds.has('psychic_whispers'), 'whispers in picker')
assert(psiIds.has('homing_strikes'), 'homing in picker')
assert(psiIds.has('psychic_teleportation'), 'teleport in picker')
assert(psiIds.has('psychic_veil'), 'veil linked in picker')
assert(psiIds.has('rend_mind'), 'rend linked in picker')
assert(
  !psiIds.has('psionic_power'),
  'tracker not in picker',
)
assert(
  psiOpts.find((o) => o.featureId === 'rend_mind')?.cost === 3,
  'rend costs 3',
)
assert(
  psiOpts.find((o) => o.featureId === 'psychic_veil')?.cost === 1,
  'veil costs 1',
)

const skDesired = desiredResourcesFromFeatures({
  features: skUnlocked,
  characterLevel: 17,
  classSlugByEntryId: { [skEntry]: 'rogue' },
})
const psiPool = skDesired.find((r) => r.id.includes(':psionic_energy_dice:'))
assert(psiPool, 'psi pool desired')
assert(psiPool.max === 12, `2×PB=12 at L17, got ${psiPool.max}`)

// —— Phantom ——
const phEntry = 'r2'
const phUnlocked = unlockFeaturesForClasses({
  classes: [
    {
      id: phEntry,
      name: 'Плут',
      catalog_id: null,
      level: 9,
      subclass_name: 'Phantom',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 9,
  subclassSlugByEntryId: { [phEntry]: 'phantom' },
})
const burns = listSoulTrinketBurnOptions(phUnlocked, phEntry)
assert(burns.length === 2, `2 burn options, got ${burns.length}`)
assert(
  burns.some((b) => b.key.endsWith(':burn_wail')),
  'wail burn',
)
assert(
  burns.some((b) => b.key.endsWith(':burn_question')),
  'question burn',
)

const phDesired = desiredResourcesFromFeatures({
  features: phUnlocked,
  characterLevel: 9,
  classSlugByEntryId: { [phEntry]: 'rogue' },
})
const trinkets = phDesired.find((r) => r.id.includes(':soul_trinkets:'))
assert(trinkets, 'soul trinkets pool')
assert(trinkets.track === 'stock', 'stock track')
assert(trinkets.max === 4, `PB=4 max, got ${trinkets.max}`)

// —— Ranger favored ——
const rgEntry = 'g1'
let picks = emptyFeaturePicks()
picks = setFeaturePick(picks, rgEntry, 'favored_enemy', 'undead,fiends')
picks = setFeaturePick(picks, rgEntry, 'natural_explorer', 'forest,swamp')
const enemies = listKnownFavoredEnemies(picks, rgEntry)
const terrains = listKnownFavoredTerrains(picks, rgEntry)
assert(enemies.length === 2, '2 enemies')
assert(enemies.some((e) => e.nameRu === 'Нежить'), 'undead label')
assert(terrains.length === 2, '2 terrains')
assert(terrains.some((t) => t.nameRu === 'Лес'), 'forest label')

console.log('smoke-rogue-ranger-spend: ok', {
  die,
  psiOptions: psiOpts.map((o) => `${o.featureId}:${o.cost}`),
  psiMax: psiPool.max,
  burns: burns.map((b) => b.key),
  enemies: enemies.map((e) => e.id),
  terrains: terrains.map((t) => t.id),
})
