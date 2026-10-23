/** Quick node selfcheck: npx tsx src/shared/dnd/featureReplacement.selfcheck.ts */
import { unlockFeaturesForClasses } from './classFeatures.ts'
import { emptyFeaturePicks } from './featurePicks.ts'
import {
  filterActiveFeaturesForPlay,
  findReplaceTargets,
  findReplacerForFeature,
  isFeatureActiveForPlay,
  replacementStatusForFeature,
  replacementStatusLabelRu,
  setReplacementTaken,
} from './featureReplacement.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const ranger = unlockFeaturesForClasses({
  classes: [
    {
      id: 'r1',
      name: 'Следопыт',
      catalog_id: null,
      level: 10,
      subclass_name: '',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 10,
})

const enemy = ranger.find((f) => f.id === 'favored_enemy')
const foe = ranger.find((f) => f.id === 'favored_foe')
const explorer = ranger.find((f) => f.id === 'natural_explorer')
const deft = ranger.find((f) => f.id === 'deft_explorer')
const hide = ranger.find((f) => f.id === 'hide_in_plain_sight')
const veil = ranger.find((f) => f.id === 'natures_veil')
assert(enemy && foe && explorer && deft && hide && veil, 'ranger pair features')

let picks = emptyFeaturePicks()

assert(
  replacementStatusForFeature(enemy, ranger, picks) === 'active',
  'default PHB favored_enemy active',
)
assert(
  replacementStatusForFeature(foe, ranger, picks) === 'available',
  'default Tasha favored_foe available',
)
assert(
  replacementStatusLabelRu('available') === 'Доступно для замены',
  'available label',
)
assert(isFeatureActiveForPlay(enemy, ranger, picks), 'PHB play-active by default')
assert(!isFeatureActiveForPlay(foe, ranger, picks), 'Tasha not play-active by default')

picks = setReplacementTaken(picks, 'r1', 'favored_foe', true)
assert(
  replacementStatusForFeature(foe, ranger, picks) === 'active',
  'taken Tasha active',
)
assert(
  replacementStatusForFeature(enemy, ranger, picks) === 'replaced',
  'PHB replaced when Tasha taken',
)
assert(
  replacementStatusLabelRu('replaced') === 'Заменено',
  'replaced label',
)

const active = filterActiveFeaturesForPlay(ranger, picks)
assert(
  active.some((f) => f.id === 'favored_foe'),
  'filter keeps favored_foe',
)
assert(
  !active.some((f) => f.id === 'favored_enemy'),
  'filter drops favored_enemy',
)
assert(
  active.some((f) => f.id === 'natural_explorer'),
  'unrelated PHB still active',
)
assert(
  !active.some((f) => f.id === 'deft_explorer'),
  'untaken deft_explorer filtered out',
)

picks = setReplacementTaken(picks, 'r1', 'natures_veil', true)
assert(
  replacementStatusForFeature(veil, ranger, picks) === 'active',
  'veil active when taken',
)
assert(
  replacementStatusForFeature(hide, ranger, picks) === 'replaced',
  'hide replaced when veil taken',
)

assert(findReplacerForFeature(enemy, ranger)?.id === 'favored_foe', 'replacer lookup')
assert(
  findReplaceTargets(foe, ranger).some((t) => t.id === 'favored_enemy'),
  'targets lookup',
)

// Cleric Blessed Strikes ↔ domain Divine Strike / Potent Spellcasting
const cleric = unlockFeaturesForClasses({
  classes: [
    {
      id: 'c1',
      name: 'Жрец',
      catalog_id: null,
      level: 8,
      subclass_name: 'Домен жизни',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 8,
  subclassSlugByEntryId: { c1: 'life_domain' },
})
const blessed = cleric.find((f) => f.id === 'blessed_strikes')
const divineStrike = cleric.find((f) => f.id === 'divine_strike_life')
assert(blessed && divineStrike, 'cleric blessed / divine strike')
assert(
  findReplacerForFeature(divineStrike, cleric)?.id === 'blessed_strikes',
  'blessed replaces domain strike',
)
let clericPicks = emptyFeaturePicks()
assert(
  replacementStatusForFeature(divineStrike, cleric, clericPicks) === 'active',
  'domain strike active by default',
)
clericPicks = setReplacementTaken(clericPicks, 'c1', 'blessed_strikes', true)
assert(
  replacementStatusForFeature(divineStrike, cleric, clericPicks) === 'replaced',
  'domain strike replaced',
)

console.log('featureReplacement.selfcheck ok')
