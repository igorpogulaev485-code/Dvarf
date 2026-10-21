/**
 * Selfcheck: full infusion catalog + self vs ally automation.
 * Run: npx tsx src/shared/dnd/infusionEffects.selfcheck.ts
 */

import {
  ARTIFICER_INFUSIONS,
  infusionById,
  infusionOptionIdsAtLevel,
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

assert(ARTIFICER_INFUSIONS.length >= 50, `full catalog size ${ARTIFICER_INFUSIONS.length}`)
assert(infusionById('replicate_bag_of_holding'), 'replicate bag of holding')
assert(infusionById('replicate_winged_boots'), 'replicate winged boots')
assert(infusionById('helm_of_awareness'), 'helm of awareness')
assert(infusionById('arcane_propulsion_armor'), 'arcane propulsion armor')

const at2 = infusionOptionIdsAtLevel(2)
assert(at2.includes('enhanced_defense'), 'L2 has enhanced defense')
assert(at2.includes('replicate_bag_of_holding'), 'L2 has bag of holding')
assert(!at2.includes('replicate_winged_boots'), 'L2 no winged boots')
assert(!at2.includes('boots_of_the_winding_path'), 'L2 no winding path')

const at10 = infusionOptionIdsAtLevel(10)
assert(at10.includes('replicate_winged_boots'), 'L10 winged boots')
assert(at10.includes('helm_of_awareness'), 'L10 helm')

const entry = 'art-1'
let picks = emptyFeaturePicks()
picks = setFeaturePick(
  picks,
  entry,
  'infuse_item',
  'enhanced_defense,enhanced_weapon,replicate_bag_of_holding,replicate_gauntlets_of_ogre_power',
)
picks = setActiveInfusionBindings(picks, entry, [
  { infusionId: 'enhanced_defense', target: 'self' },
  { infusionId: 'enhanced_weapon', target: 'ally-char-1' },
  { infusionId: 'replicate_gauntlets_of_ogre_power', target: 'self' },
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
assert(bonuses.abilityFloor.str === 19, 'gauntlets floor STR 19')

const floored = applyInfusionAbilityFloors(
  { str: 14, dex: 12, con: 13, int: 16, wis: 10, cha: 8 },
  bonuses.abilityFloor,
)
assert(floored.str === 19, 'STR raised to 19')
assert(floored.int === 16, 'INT unchanged')

const share = infusionShareEffectName(
  infusionById('enhanced_defense')!,
  10,
)
assert(share.includes('Усиленная защита'), 'share name')
assert(share.includes('+2'), 'share includes +2 at L10')

console.log('infusionEffects.selfcheck: ok')
