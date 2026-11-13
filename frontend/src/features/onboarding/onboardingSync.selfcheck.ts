/**
 * ONB-03 — server/local merge, restart tips, lobby tour gate.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/onboarding/onboardingSync.selfcheck.ts
 */

import {
  applyServerOnboarding,
  hasLocalDurableProgress,
  isServerOnboardingEmpty,
  restartTipsState,
  shouldRunLobbyTour,
  toServerPayload,
} from './storage.ts'
import { defaultOnboardingState } from './types.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(isServerOnboardingEmpty(null), 'null server empty')
assert(isServerOnboardingEmpty(undefined), 'undefined server empty')
assert(
  isServerOnboardingEmpty({
    version: 1,
    welcomeDone: false,
    segment: null,
    sheetTourDone: false,
    lobbyTourDone: false,
  }),
  'zero flags empty',
)
assert(
  !isServerOnboardingEmpty({
    version: 1,
    welcomeDone: true,
    segment: 'dnd_new',
    sheetTourDone: false,
    lobbyTourDone: false,
  }),
  'welcomeDone is progress',
)

const localDone = {
  ...defaultOnboardingState(),
  welcomeDone: true,
  segment: 'product_new' as const,
  sheetTourDone: true,
  lobbyTourDone: true,
}
assert(hasLocalDurableProgress(localDone), 'local has progress')

const upload = applyServerOnboarding(localDone, null)
assert(upload.shouldUpload, 'empty server + local → upload')
assert(upload.state.sheetTourDone, 'keeps local sheetTourDone')

const emptyLocal = defaultOnboardingState()
const fromServer = applyServerOnboarding(emptyLocal, {
  version: 1,
  welcomeDone: true,
  segment: 'dnd_new',
  sheetTourDone: true,
  lobbyTourDone: true,
})
assert(!fromServer.shouldUpload, 'server wins, no upload')
assert(fromServer.state.welcomeDone, 'welcome from server')
assert(fromServer.state.sheetTourDone, 'sheet from server')
assert(fromServer.state.lobbyTourDone, 'lobby from server')
assert(!fromServer.state.pendingSheetTour, 'no pending when server done')

const pendingLocal = {
  ...defaultOnboardingState(),
  welcomeDone: true,
  segment: 'dnd_new' as const,
  pendingSheetTour: true,
  pendingReadyBridge: true,
}
const serverPartial = applyServerOnboarding(pendingLocal, {
  version: 1,
  welcomeDone: true,
  segment: 'dnd_new',
  sheetTourDone: false,
  lobbyTourDone: false,
})
assert(serverPartial.state.pendingSheetTour, 'keeps pending when sheet not done on server')
assert(serverPartial.state.pendingReadyBridge, 'keeps bridge pending')

const restarted = restartTipsState(localDone)
assert(!restarted.sheetTourDone, 'restart clears sheetTourDone')
assert(!restarted.lobbyTourDone, 'restart clears lobbyTourDone')
assert(restarted.pendingSheetTour, 'restart arms sheet tour')
assert(restarted.pendingLobbyTour, 'restart arms lobby tour')
assert(restarted.segment === 'product_new', 'keeps segment')

const afterSkip = restartTipsState({
  ...defaultOnboardingState(),
  segment: 'skip',
  welcomeDone: true,
  sheetTourDone: true,
  lobbyTourDone: true,
})
assert(afterSkip.segment === null, 'skip cleared')
assert(!afterSkip.welcomeDone, 'welcome again after skip')
assert(!afterSkip.pendingSheetTour, 'no sheet tour until segment chosen')
assert(afterSkip.pendingLobbyTour, 'lobby armed after skip reset')

assert(shouldRunLobbyTour(restarted), 'lobby tour after restart')
assert(
  !shouldRunLobbyTour({ ...restarted, segment: 'skip' }),
  'skip blocks lobby tour',
)
assert(
  !shouldRunLobbyTour({ ...restarted, lobbyTourDone: true }),
  'done blocks lobby tour',
)

const payload = toServerPayload(localDone)
assert(payload.version === 1, 'payload version')
assert(payload.sheetTourDone && payload.lobbyTourDone, 'payload flags')
assert(!('pendingSheetTour' in payload), 'pending stays local')

console.log('onboardingSync.selfcheck: ok')
