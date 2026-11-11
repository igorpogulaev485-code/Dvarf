/**
 * Run: npx --yes tsx src/shared/dnd/battleMasterManeuverBridge.selfcheck.ts
 */
import {
  bridgeManeuversIntoFeaturePicks,
  extractManeuverIdsFromPicksValues,
  hydrateManeuversFromSubclassGrants,
} from './battleMasterManeuverBridge.ts'
import { emptyFeaturePicks, getFeaturePickList } from './featurePicks.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const picks = {
  student_of_war_tool: 'smiths_tools',
  maneuvers_3: ['parry', 'precision_attack', 'riposte'],
}

assert(
  extractManeuverIdsFromPicksValues(picks).join(',') ===
    'parry,precision_attack,riposte',
  'extract known maneuvers from subclass picks',
)

assert(
  extractManeuverIdsFromPicksValues({
    maneuvers_3: 'parry,unknown_thing,riposte',
  }).join(',') === 'parry,riposte',
  'ignore unknown ids',
)

const empty = emptyFeaturePicks()
const filled = bridgeManeuversIntoFeaturePicks({
  featurePicks: empty,
  classEntryId: 'fighter-1',
  maneuverIds: ['parry', 'precision_attack', 'riposte'],
  mode: 'fill_if_empty',
})
assert(
  getFeaturePickList(filled, 'fighter-1', 'combat_superiority').join(',') ===
    'parry,precision_attack,riposte',
  'fill_if_empty writes combat_superiority',
)

const noOverwrite = bridgeManeuversIntoFeaturePicks({
  featurePicks: filled,
  classEntryId: 'fighter-1',
  maneuverIds: ['rally'],
  mode: 'fill_if_empty',
})
assert(
  getFeaturePickList(noOverwrite, 'fighter-1', 'combat_superiority').join(',') ===
    'parry,precision_attack,riposte',
  'fill_if_empty does not overwrite existing picks',
)

const merged = bridgeManeuversIntoFeaturePicks({
  featurePicks: filled,
  classEntryId: 'fighter-1',
  maneuverIds: ['parry', 'rally'],
  mode: 'merge_missing',
})
assert(
  getFeaturePickList(merged, 'fighter-1', 'combat_superiority').join(',') ===
    'parry,precision_attack,riposte,rally',
  'merge_missing appends new ids only',
)

const hydrated = hydrateManeuversFromSubclassGrants({
  featurePicks: emptyFeaturePicks(),
  subclassGrants: [
    {
      classEntryId: 'fighter-1',
      picks: {
        maneuvers_3: ['parry', 'precision_attack', 'riposte'],
      },
    },
  ],
})
assert(
  hydrated.bridgedClassEntryIds.join(',') === 'fighter-1',
  'hydrate reports bridged class entry',
)
assert(
  getFeaturePickList(
    hydrated.featurePicks,
    'fighter-1',
    'combat_superiority',
  ).join(',') === 'parry,precision_attack,riposte',
  'hydrate copies subclass_grants → feature_picks',
)

const skipHydrate = hydrateManeuversFromSubclassGrants({
  featurePicks: filled,
  subclassGrants: [
    {
      classEntryId: 'fighter-1',
      picks: { maneuvers_3: ['rally'] },
    },
  ],
})
assert(
  skipHydrate.bridgedClassEntryIds.length === 0,
  'hydrate skips when combat_superiority already set',
)

console.log('battleMasterManeuverBridge.selfcheck: ok')
