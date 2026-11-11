/** Quick node selfcheck: npx tsx src/shared/dnd/optionalClassFeatures.selfcheck.ts */
import {
  OPTIONAL_CLASS_FEATURES_EPOCH,
  localFeaturePack,
  optionalFeatureBadgeRu,
  unlockFeaturesForClasses,
} from './classFeatures.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(OPTIONAL_CLASS_FEATURES_EPOCH >= 1, 'epoch must be set')

const expected: Record<string, string[]> = {
  barbarian: ['primal_knowledge', 'instinctive_pounce'],
  bard: ['magical_inspiration', 'bardic_versatility'],
  cleric: ['cd_harness_divine_power', 'cantrip_versatility_cleric', 'blessed_strikes'],
  druid: ['wild_companion', 'cantrip_versatility_druid'],
  fighter: ['martial_versatility_fighter'],
  monk: ['dedicated_weapon', 'ki_fueled_attack', 'quickened_healing', 'focused_aim'],
  paladin: ['cd_harness_divine_power', 'martial_versatility_paladin'],
  ranger: [
    'deft_explorer',
    'favored_foe',
    'spellcasting_focus_ranger',
    'primal_awareness_tasha',
    'martial_versatility_ranger',
    'natures_veil',
  ],
  rogue: ['steady_aim'],
  sorcerer: ['sorcerous_versatility', 'magical_guidance'],
  warlock: ['eldritch_versatility'],
  wizard: ['cantrip_formulas'],
}

for (const [slug, ids] of Object.entries(expected)) {
  const pack = localFeaturePack(slug)
  assert(pack, `pack ${slug}`)
  const byId = new Map(pack.features.map((f) => [f.id, f]))
  for (const id of ids) {
    const row = byId.get(id)
    assert(row, `${slug} missing optional ${id}`)
    assert(row.optional === true, `${slug}.${id} must be optional`)
    assert(row.source_book === 'tcoe', `${slug}.${id} source_book`)
  }
}

const rogueL3 = unlockFeaturesForClasses({
  classes: [
    {
      id: 'c1',
      name: 'Плут',
      catalog_id: null,
      level: 3,
      subclass_name: '',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 3,
})
const steady = rogueL3.find((f) => f.id === 'steady_aim')
assert(steady, 'rogue L3 unlocks steady_aim')
assert(steady.optional === true, 'steady_aim optional flag survives unlock')
assert(steady.name_ru === 'Точное прицеливание', 'steady_aim RU name')
assert(
  optionalFeatureBadgeRu(steady) === 'Tasha · опционально',
  'optional badge label',
)

const rogueL2 = unlockFeaturesForClasses({
  classes: [
    {
      id: 'c1',
      name: 'Плут',
      catalog_id: null,
      level: 2,
      subclass_name: '',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 2,
})
assert(
  !rogueL2.some((f) => f.id === 'steady_aim'),
  'rogue L2 must not unlock steady_aim',
)

const rangerL1 = unlockFeaturesForClasses({
  classes: [
    {
      id: 'r1',
      name: 'Следопыт',
      catalog_id: null,
      level: 1,
      subclass_name: '',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 1,
})
assert(
  rangerL1.some((f) => f.id === 'favored_enemy'),
  'PHB favored_enemy still unlocks',
)
assert(rangerL1.some((f) => f.id === 'favored_foe'), 'Tasha favored_foe unlocks')
const foe = rangerL1.find((f) => f.id === 'favored_foe')
assert(foe?.replaces === 'favored_enemy', 'favored_foe replaces favored_enemy')

console.log('optionalClassFeatures.selfcheck ok')
