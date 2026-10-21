/**
 * Smoke: Artificer active infusions + Warlock invocations / arcanum.
 * Run: npx tsx scripts/smoke-infusions-invocations.ts
 */
import { unlockFeaturesForClasses } from '../src/shared/dnd/classFeatures'
import { desiredResourcesFromFeatures } from '../src/shared/dnd/featureResources'
import {
  emptyFeaturePicks,
  setFeaturePick,
} from '../src/shared/dnd/featurePicks'
import {
  infusionCanTargetAlly,
  infusionSlotsMax,
  listActiveInfusionBindings,
  listActiveInfusionIds,
  listKnownInfusions,
  setActiveInfusionBindings,
  setActiveInfusions,
} from '../src/shared/dnd/infusionsActive'
import {
  infusionById,
  REPLICATE_MAGIC_ITEM_ID,
  replicateItemsAtLevel,
} from '../src/shared/dnd/artificerInfusions'
import { listKnownInvocations } from '../src/features/characters/WarlockInvocationsDialog'
import { listWarlockArcanumOptions } from '../src/features/characters/WarlockArcanumSpendDialog'
import { parseInfusionSlotsResourceId } from '../src/features/characters/InfusionsActiveDialog'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// —— Artificer infusions ——
const artEntry = 'a1'
const artUnlocked = unlockFeaturesForClasses({
  classes: [
    {
      id: artEntry,
      name: 'Изобретатель',
      catalog_id: null,
      level: 6,
      subclass_name: '',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 6,
  subclassSlugByEntryId: {},
})
assert(
  artUnlocked.some((f) => f.id === 'infuse_item'),
  'infuse_item unlocked',
)
assert(
  artUnlocked.some((f) => f.resource?.pool_id === 'infusion_slots'),
  'infusion_slots pool on feature',
)
assert(infusionSlotsMax(2) === 2, 'L2 slots 2')
assert(infusionSlotsMax(6) === 3, 'L6 slots 3')
assert(infusionSlotsMax(10) === 4, 'L10 slots 4')

let picks = emptyFeaturePicks()
picks = setFeaturePick(
  picks,
  artEntry,
  'infuse_item',
  'enhanced_defense,enhanced_weapon,repeating_shot,returning_weapon',
)
const known = listKnownInfusions(picks, artEntry)
assert(known.length === 4, `4 known infusions, got ${known.length}`)
assert(listActiveInfusionIds(picks, artEntry).length === 0, 'none active yet')

picks = setActiveInfusions(picks, artEntry, [
  'enhanced_defense',
  'enhanced_weapon',
  'repeating_shot',
])
assert(
  listActiveInfusionIds(picks, artEntry).length === 3,
  '3 active at L6 max',
)

// Drop unknown id + keep only known
picks = setActiveInfusions(picks, artEntry, [
  'enhanced_defense',
  'not_a_real_infusion',
])
assert(
  listActiveInfusionIds(picks, artEntry).join(',') === 'enhanced_defense',
  'unknown filtered',
)

// Ally targeting: armor infusion on teammate, weapon on self
picks = setFeaturePick(
  picks,
  artEntry,
  'infuse_item',
  'enhanced_defense,enhanced_weapon,repeating_shot,returning_weapon',
)
picks = setActiveInfusionBindings(picks, artEntry, [
  { infusionId: 'enhanced_defense', target: 'ally-fighter-1' },
  { infusionId: 'enhanced_weapon', target: 'self' },
])
const bindings = listActiveInfusionBindings(picks, artEntry)
assert(bindings.length === 2, '2 bindings with ally target')
assert(
  bindings.find((b) => b.infusionId === 'enhanced_defense')?.target ===
    'ally-fighter-1',
  'enhanced defense on ally',
)
assert(
  bindings.find((b) => b.infusionId === 'enhanced_weapon')?.target === 'self',
  'enhanced weapon on self',
)
assert(
  infusionCanTargetAlly(infusionById('enhanced_defense')),
  'enhanced defense can target ally',
)
assert(
  !infusionCanTargetAlly(infusionById('homunculus_servant')),
  'homunculus self-only',
)

// Replicate Magic Item: one known infusion, item chosen on activate
picks = setFeaturePick(
  picks,
  artEntry,
  'infuse_item',
  `enhanced_defense,${REPLICATE_MAGIC_ITEM_ID},${REPLICATE_MAGIC_ITEM_ID},returning_weapon`,
)
assert(
  listKnownInfusions(picks, artEntry).some((d) => d.id === REPLICATE_MAGIC_ITEM_ID),
  'known includes replicate_magic_item once',
)
assert(
  replicateItemsAtLevel(6).some((r) => r.slug === 'boots_of_elvenkind'),
  'L6 replicate table has boots of elvenkind',
)
assert(
  !replicateItemsAtLevel(6).some((r) => r.slug === 'winged_boots'),
  'L6 replicate table no winged boots',
)
picks = setActiveInfusionBindings(picks, artEntry, [
  {
    infusionId: REPLICATE_MAGIC_ITEM_ID,
    target: 'self',
    replicateItemSlug: 'bag_of_holding',
  },
  {
    infusionId: REPLICATE_MAGIC_ITEM_ID,
    target: 'ally-fighter-1',
    replicateItemSlug: 'goggles_of_night',
  },
])
const repBindings = listActiveInfusionBindings(picks, artEntry)
assert(repBindings.length === 2, 'two active replicate copies')
assert(
  repBindings.every((b) => b.infusionId === REPLICATE_MAGIC_ITEM_ID),
  'both are replicate_magic_item',
)
assert(
  repBindings.map((b) => b.replicateItemSlug).sort().join(',') ===
    'bag_of_holding,goggles_of_night',
  'items stored on bindings',
)

const artDesired = desiredResourcesFromFeatures({
  features: artUnlocked,
  characterLevel: 6,
  classSlugByEntryId: { [artEntry]: 'artificer' },
})
const infusionPool = artDesired.find((r) => r.id.includes(':infusion_slots:'))
assert(infusionPool, 'infusion_slots desired')
assert(infusionPool.max === 3, `L6 max 3, got ${infusionPool.max}`)
assert(infusionPool.track === 'stock', 'stock track')
const parsed = parseInfusionSlotsResourceId(infusionPool.id)
assert(parsed?.classEntryId === artEntry, 'parse resource id')

// —— Warlock invocations ——
const wlEntry = 'w1'
const wlUnlocked = unlockFeaturesForClasses({
  classes: [
    {
      id: wlEntry,
      name: 'Колдун',
      catalog_id: null,
      level: 11,
      subclass_name: '',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 11,
  subclassSlugByEntryId: {},
})
assert(
  wlUnlocked.some((f) => f.id === 'eldritch_invocations'),
  'eldritch_invocations unlocked',
)
assert(
  wlUnlocked.filter((f) => f.resource?.pool_id?.startsWith('mystic_arcanum_'))
    .length >= 1,
  'arcanum 6 at L11',
)

let wlPicks = emptyFeaturePicks()
assert(
  listKnownInvocations(wlPicks, wlEntry).length === 0,
  'no invocations until picked',
)
wlPicks = setFeaturePick(
  wlPicks,
  wlEntry,
  'eldritch_invocations',
  'agonizing_blast,devils_sight,eldritch_spear',
)
const invs = listKnownInvocations(wlPicks, wlEntry)
assert(invs.length === 3, `3 invocations, got ${invs.length}`)
assert(
  invs.some((i) => i.id === 'agonizing_blast'),
  'agonizing blast',
)

const arcanumOpts = listWarlockArcanumOptions(wlUnlocked, wlEntry)
assert(arcanumOpts.length >= 1, 'at least arcanum 6')
assert(
  arcanumOpts.every((f) => f.resource?.pool_id?.startsWith('mystic_arcanum_')),
  'all arcanum pools',
)

const wlDesired = desiredResourcesFromFeatures({
  features: wlUnlocked,
  characterLevel: 11,
  classSlugByEntryId: { [wlEntry]: 'warlock' },
})
assert(
  wlDesired.some((r) => r.id.includes(':mystic_arcanum_6:')),
  'arcanum 6 resource',
)

console.log('smoke-infusions-invocations: ok', {
  infusionMaxL6: infusionPool.max,
  knownInfusions: known.map((i) => i.id),
  invocations: invs.map((i) => i.id),
  arcanum: arcanumOpts.map((f) => f.id),
})
