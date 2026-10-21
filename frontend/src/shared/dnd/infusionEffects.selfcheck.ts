/**
 * Selfcheck: infusion catalog + replicate-as-one + self vs ally automation.
 * Run: npx tsx src/shared/dnd/infusionEffects.selfcheck.ts
 */

import {
  ARTIFICER_INFUSIONS,
  infusionById,
  infusionOptionIdsAtLevel,
  REPLICATE_MAGIC_ITEM_ID,
  replicateItemsAtLevel,
} from './artificerInfusions'
import {
  aggregateInfusionBonuses,
  applyInfusionAbilityFloors,
  infusionShareEffectName,
} from './infusionEffects'
import {
  emptyFeaturePicks,
  setFeaturePick,
} from './featurePicks'
import {
  setActiveInfusionBindings,
} from './infusionsActive'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// One infusion for replicate — not one per item.
assert(
  ARTIFICER_INFUSIONS.some((row) => row.id === REPLICATE_MAGIC_ITEM_ID),
  'replicate_magic_item in catalog',
)
assert(
  !ARTIFICER_INFUSIONS.some((row) => row.id.startsWith('replicate_') && row.id !== REPLICATE_MAGIC_ITEM_ID),
  'no flattened replicate_* infusions',
)
assert(infusionById(REPLICATE_MAGIC_ITEM_ID)?.replicate, 'replicate flag')
assert(infusionById('replicate_bag_of_holding')?.id === REPLICATE_MAGIC_ITEM_ID, 'legacy id maps')

const at2 = infusionOptionIdsAtLevel(2)
assert(at2.includes(REPLICATE_MAGIC_ITEM_ID), 'L2 has replicate infusion')
assert(at2.includes('enhanced_defense'), 'L2 has enhanced defense')
assert(!at2.includes('boots_of_the_winding_path'), 'L2 no winding path')

const items2 = replicateItemsAtLevel(2)
assert(items2.some((r) => r.slug === 'bag_of_holding'), 'L2 bag of holding')
assert(!items2.some((r) => r.slug === 'winged_boots'), 'L2 no winged boots')

const items10 = replicateItemsAtLevel(10)
assert(items10.some((r) => r.slug === 'winged_boots'), 'L10 winged boots')
assert(items10.some((r) => r.slug === 'gauntlets_of_ogre_power'), 'L10 gauntlets')

const entry = 'art-1'
let picks = emptyFeaturePicks()
picks = setFeaturePick(
  picks,
  entry,
  'infuse_item',
  `enhanced_defense,enhanced_weapon,${REPLICATE_MAGIC_ITEM_ID},${REPLICATE_MAGIC_ITEM_ID}`,
)
picks = setActiveInfusionBindings(picks, entry, [
  { infusionId: 'enhanced_defense', target: 'self' },
  { infusionId: 'enhanced_weapon', target: 'ally-char-1' },
  {
    infusionId: REPLICATE_MAGIC_ITEM_ID,
    target: 'self',
    replicateItemSlug: 'gauntlets_of_ogre_power',
  },
])

const classes = [
  {
    id: entry,
    name: 'Изобретатель',
    catalog_id: 'artificer',
    level: 10,
    subclass_name: '',
    subclass_catalog_id: null,
  },
]

const bonuses = aggregateInfusionBonuses({
  featurePicks: picks,
  classes,
  wearingArmor: true,
  wearingShield: false,
})

assert(bonuses.acBonus === 2, `self enhanced defense +2 at L10, got ${bonuses.acBonus}`)
assert(
  bonuses.weaponAttackBonus === 0,
  'ally-targeted enhanced weapon must not buff self attack',
)
assert(bonuses.allyBindings.length === 1, 'one ally binding')
assert(
  bonuses.allyBindings[0]?.infusionId === 'enhanced_weapon',
  'ally binding is enhanced weapon',
)
assert(bonuses.abilityFloor.str === 19, 'gauntlets floor STR 19 via replicate item')

const floored = applyInfusionAbilityFloors(
  { str: 14, dex: 12, con: 13, int: 16, wis: 10, cha: 8 },
  bonuses.abilityFloor,
)
assert(floored.str === 19, 'STR raised to 19')
assert(floored.int === 16, 'INT unchanged')

const share = infusionShareEffectName(
  { infusionId: 'enhanced_defense', target: 'ally-1' },
  10,
)
assert(share.includes('Усиленная защита'), 'share name')
assert(share.includes('+2'), 'share includes +2 at L10')

const shareRep = infusionShareEffectName(
  {
    infusionId: REPLICATE_MAGIC_ITEM_ID,
    target: 'ally-1',
    replicateItemSlug: 'cloak_of_protection',
  },
  10,
)
assert(shareRep.includes('Копия магического предмета'), 'share replicate label')
assert(shareRep.includes('Плащ защиты') || shareRep.includes('+1'), 'share replicate item')

console.log('infusionEffects.selfcheck: ok')
