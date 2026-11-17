/**
 * Autotest: metamagic selection must survive conflict rebase and stale keys.
 * Reproduces the prod wipe: older tab autosave conflicts, retries with empty
 * local feature_picks, and previously overwrote server metamagic.
 */
import assert from 'node:assert/strict'
import { createClassLevel } from './classLevels.ts'
import {
  emptyFeaturePicks,
  getFeaturePickList,
  mergeFeaturePicksPreservingNonEmpty,
  readFeaturePicks,
  rebindStaleMetamagicPicks,
  setFeaturePick,
} from './featurePicks.ts'
import {
  collectSorcererMetamagicIds,
  listSorcererClassEntryIds,
} from './sorcererMetamagicIds.ts'

const liveId = 'live-sorcerer-entry'
const staleId = 'stale-sorcerer-entry'

// --- readFeaturePicks accepts legacy array multi-picks ---
const fromArray = readFeaturePicks({
  values: { [`${liveId}:metamagic`]: ['quickened', 'twinned'] },
})
assert.equal(fromArray.values[`${liveId}:metamagic`], 'quickened,twinned')

// --- conflict: empty local must not wipe server metamagic ---
const server = setFeaturePick(
  emptyFeaturePicks(),
  liveId,
  'metamagic',
  'quickened,twinned',
)
const localEmpty = emptyFeaturePicks()
const mergedKeepServer = mergeFeaturePicksPreservingNonEmpty(localEmpty, server)
assert.deepEqual(
  getFeaturePickList(mergedKeepServer, liveId, 'metamagic').sort(),
  ['quickened', 'twinned'],
  'conflict rebase keeps server metamagic when local is empty',
)

// --- conflict: local non-empty wins (intentional edit) ---
const localEdit = setFeaturePick(emptyFeaturePicks(), liveId, 'metamagic', 'subtle,distant')
const mergedLocalWins = mergeFeaturePicksPreservingNonEmpty(localEdit, server)
assert.deepEqual(
  getFeaturePickList(mergedLocalWins, liveId, 'metamagic').sort(),
  ['distant', 'subtle'],
  'local metamagic edit wins over server on conflict',
)

// --- full wipe scenario (phone chose, desk rest retries) ---
function simulateConflictRetry(input: {
  localPicks: ReturnType<typeof emptyFeaturePicks>
  serverPicks: ReturnType<typeof emptyFeaturePicks>
  classEntryId: string
}) {
  const liveIds = [input.classEntryId]
  const local = rebindStaleMetamagicPicks({
    featurePicks: input.localPicks,
    liveClassEntryIds: liveIds,
  })
  const remote = rebindStaleMetamagicPicks({
    featurePicks: input.serverPicks,
    liveClassEntryIds: liveIds,
  })
  return mergeFeaturePicksPreservingNonEmpty(local, remote)
}

const afterDeskRest = simulateConflictRetry({
  classEntryId: liveId,
  localPicks: emptyFeaturePicks(), // desk never saw the phone pick
  serverPicks: setFeaturePick(
    emptyFeaturePicks(),
    liveId,
    'metamagic',
    'empowered,extended',
  ),
})
assert.deepEqual(
  getFeaturePickList(afterDeskRest, liveId, 'metamagic').sort(),
  ['empowered', 'extended'],
  'desk rest conflict retry must not drop phone metamagic',
)

// --- stale key rebind for settings card ---
const orphan = setFeaturePick(emptyFeaturePicks(), staleId, 'metamagic', 'careful,heightened')
const rebound = rebindStaleMetamagicPicks({
  featurePicks: orphan,
  liveClassEntryIds: [liveId],
})
assert.deepEqual(
  getFeaturePickList(rebound, liveId, 'metamagic').sort(),
  ['careful', 'heightened'],
  'orphan *:metamagic moves onto live class entry',
)
assert.equal(
  rebound.values[`${staleId}:metamagic`],
  undefined,
  'stale metamagic key removed after rebind',
)

// --- rebind + merge when server has stale key and local is empty ---
const serverStale = setFeaturePick(
  emptyFeaturePicks(),
  staleId,
  'metamagic',
  'quickened,twinned',
)
const recovered = simulateConflictRetry({
  classEntryId: liveId,
  localPicks: emptyFeaturePicks(),
  serverPicks: serverStale,
})
assert.deepEqual(
  getFeaturePickList(recovered, liveId, 'metamagic').sort(),
  ['quickened', 'twinned'],
  'stale server metamagic survives conflict and rebinds to live id',
)

// --- listSorcererClassEntryIds / collect still see rebound picks ---
const classes = [
  createClassLevel({
    id: liveId,
    name: 'Чародей',
    level: 8,
    catalog_id: 'de750e12-7212-5b2d-a3b1-ed8231bb5fdd',
  }),
]
assert.deepEqual(listSorcererClassEntryIds(classes), [liveId])
assert.deepEqual(
  collectSorcererMetamagicIds({ classes, featurePicks: recovered }).sort(),
  ['quickened', 'twinned'],
)

console.log('featurePicks.metamagicPersist.selfcheck: ok')
