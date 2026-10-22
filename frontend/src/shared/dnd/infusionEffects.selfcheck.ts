/**
 * Selfcheck: RAW Replicate Magic Item — choose item when learning.
 * Run: npx tsx src/shared/dnd/infusionEffects.selfcheck.ts
 */

import {
  ARTIFICER_INFUSIONS,
  formatReplicateKnownId,
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
  learnReplicateMagicItem,
  listKnownInfusionIds,
  setActiveInfusionBindings,
} from './infusionsActive'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(
  ARTIFICER_INFUSIONS.some((row) => row.id === REPLICATE_MAGIC_ITEM_ID),
  'replicate_magic_item in catalog',
)
assert(
  !ARTIFICER_INFUSIONS.some(
    (row) => row.id.startsWith('replicate_') && row.id !== REPLICATE_MAGIC_ITEM_ID,
  ),
  'no flattened replicate_* infusions',
)

const at2 = infusionOptionIdsAtLevel(2)
assert(at2.includes(REPLICATE_MAGIC_ITEM_ID), 'L2 learn option has replicate')
assert(at2.includes('enhanced_defense'), 'L2 has enhanced defense')
assert(!at2.includes(formatReplicateKnownId('bag_of_holding')), 'items not in learn chips')

assert(replicateItemsAtLevel(2).some((r) => r.slug === 'bag_of_holding'), 'L2 bag')
assert(!replicateItemsAtLevel(2).some((r) => r.slug === 'winged_boots'), 'L2 no winged')
assert(replicateItemsAtLevel(10).some((r) => r.slug === 'winged_boots'), 'L10 winged')

const entry = 'art-1'
let picks = emptyFeaturePicks()
picks = setFeaturePick(
  picks,
  entry,
  'infuse_item',
  'enhanced_defense,enhanced_weapon',
)
picks = learnReplicateMagicItem(picks, entry, 'infuse_item', 'gauntlets_of_ogre_power', 8)
picks = learnReplicateMagicItem(picks, entry, 'infuse_item', 'bag_of_holding', 8)
const known = listKnownInfusionIds(picks, entry)
assert(
  known.includes(formatReplicateKnownId('gauntlets_of_ogre_power')),
  'known has gauntlets token',
)
assert(known.includes(formatReplicateKnownId('bag_of_holding')), 'known has bag token')
assert(
  infusionById(formatReplicateKnownId('bag_of_holding'))?.nameRu.includes('Сумка'),
  'label Копия: Сумка',
)

// Legacy flatten id still resolves
assert(
  infusionById('replicate_bag_of_holding')?.nameRu.includes('Сумка'),
  'legacy id resolves',
)

picks = setActiveInfusionBindings(picks, entry, [
  { infusionId: 'enhanced_defense', target: 'self' },
  { infusionId: 'enhanced_weapon', target: 'ally-char-1' },
  {
    infusionId: formatReplicateKnownId('gauntlets_of_ogre_power'),
    target: 'self',
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
assert(bonuses.weaponAttackBonus === 0, 'ally weapon not on self')
assert(bonuses.allyBindings.length === 1, 'one ally binding')
assert(bonuses.abilityFloor.str === 19, 'gauntlets floor via known replicate token')

const floored = applyInfusionAbilityFloors(
  { str: 14, dex: 12, con: 13, int: 16, wis: 10, cha: 8 },
  bonuses.abilityFloor,
)
assert(floored.str === 19, 'STR raised to 19')

const share = infusionShareEffectName(
  { infusionId: 'enhanced_defense', target: 'ally-1' },
  10,
)
assert(share.includes('Усиленная защита') && share.includes('+2'), 'share defense')

const shareRep = infusionShareEffectName(
  {
    infusionId: formatReplicateKnownId('cloak_of_protection'),
    target: 'ally-1',
  },
  10,
)
assert(shareRep.includes('Плащ защиты') || shareRep.includes('Копия'), 'share replicate')

console.log('infusionEffects.selfcheck: ok')
