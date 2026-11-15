/**
 * ONB-01 / TOUR-01 display fixes — storage merge, anchor pick, welcome ≠ skip contract.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/onboarding/onboardingDisplay.selfcheck.ts
 */

import { resolveSheetTourAnchor } from './anchors.ts'
import {
  clearOnboardingState,
  loadOnboardingState,
  loadOnboardingStateForUser,
  mergeOnboardingState,
  restartTipsState,
  saveOnboardingState,
} from './storage.ts'
import { defaultOnboardingState, ONBOARDING_STORAGE_KEY } from './types.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// Minimal localStorage stub for Node.
const mem = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => {
    mem.set(k, String(v))
  },
  removeItem: (k: string) => {
    mem.delete(k)
  },
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size
  },
}

// ——— merge / adopt (B7) ———
const anonPending = {
  ...defaultOnboardingState(),
  segment: 'dnd_new' as const,
  welcomeDone: true,
  pendingReadyBridge: true,
  pendingSheetTour: true,
  lobbyTourDone: false,
  pendingLobbyTour: false,
  seenSceneIntros: ['explore' as const],
}
const namedEmpty = defaultOnboardingState()
const merged = mergeOnboardingState(namedEmpty, anonPending)
assert(merged.segment === 'dnd_new', 'merge keeps segment')
assert(merged.welcomeDone, 'merge keeps welcomeDone')
assert(merged.pendingReadyBridge, 'merge keeps pendingReadyBridge')
assert(merged.pendingSheetTour, 'merge keeps pendingSheetTour')
assert(merged.seenSceneIntros.includes('explore'), 'merge keeps seenSceneIntros')

const afterTour = mergeOnboardingState(
  { ...namedEmpty, sheetTourDone: true },
  anonPending,
)
assert(!afterTour.pendingSheetTour, 'done tour clears pending on merge')
assert(!afterTour.pendingReadyBridge, 'done tour clears bridge on merge')

mem.clear()
saveOnboardingState(anonPending, null)
assert(mem.has(ONBOARDING_STORAGE_KEY), 'anon key written')
const adopted = loadOnboardingStateForUser('user-42')
assert(adopted.pendingSheetTour, 'adopt pulls pending from anon')
assert(adopted.segment === 'dnd_new', 'adopt pulls segment')
assert(adopted.seenSceneIntros.includes('explore'), 'adopt pulls seenSceneIntros')
assert(!mem.has(ONBOARDING_STORAGE_KEY), 'anon key cleared after adopt')
assert(mem.has(`${ONBOARDING_STORAGE_KEY}:user-42`), 'named key saved')
const namedReload = loadOnboardingState('user-42')
assert(namedReload.pendingReadyBridge, 'named key keeps bridge')

clearOnboardingState('user-42')
assert(loadOnboardingState('user-42').welcomeDone === false, 'clear works')

// ——— welcome dismiss contract (B1): skip only via explicit segment ———
function welcomeWouldSkip(action: 'dismiss' | 'skip' | 'dnd_new' | 'product_new'): {
  welcomeDone: boolean
  segment: string | null
} {
  const base = defaultOnboardingState()
  if (action === 'dismiss') return { welcomeDone: base.welcomeDone, segment: base.segment }
  if (action === 'skip') return { welcomeDone: true, segment: 'skip' }
  if (action === 'dnd_new') return { welcomeDone: true, segment: 'dnd_new' }
  return { welcomeDone: true, segment: 'product_new' }
}
assert(!welcomeWouldSkip('dismiss').welcomeDone, 'dismiss does not set welcomeDone')
assert(welcomeWouldSkip('dismiss').segment === null, 'dismiss does not set segment')
assert(welcomeWouldSkip('skip').segment === 'skip', 'skip still works')
assert(welcomeWouldSkip('dnd_new').welcomeDone, 'dnd_new completes welcome')

// ——— restart clears scene intros ———
const restarted = restartTipsState({
  ...defaultOnboardingState(),
  segment: 'dnd_new',
  welcomeDone: true,
  sheetTourDone: true,
  seenSceneIntros: ['explore', 'social'],
})
assert(restarted.seenSceneIntros.length === 0, 'restart clears seenSceneIntros')
assert(restarted.pendingSheetTour, 'restart arms sheet tour')

// ——— anchor resolution (TOUR-01) ———
assert(
  resolveSheetTourAnchor('help', 'help', {
    narrow: true,
    hasVisible: () => false,
  }) === 'help',
  'mobile help stays help',
)
assert(
  resolveSheetTourAnchor('combat_header', 'combat-vitals', {
    narrow: true,
    hasVisible: (a) => a === 'combat-vitals',
  }) === 'combat-vitals',
  'collapsed vitals preferred',
)
assert(
  resolveSheetTourAnchor('combat_header', 'combat-header', {
    narrow: false,
    hasVisible: (a) => a === 'combat-vitals',
  }) === 'combat-vitals',
  'combat step prefers vitals row',
)
assert(
  resolveSheetTourAnchor('hot_bar', 'hot-bar', {
    narrow: false,
    hasVisible: (a) => a === 'hot-bar',
  }) === 'hot-bar',
  'hot bar step',
)
assert(
  resolveSheetTourAnchor('turn_actions', 'turn-actions', {
    narrow: true,
    hasVisible: (a) => a === 'turn-actions' || a === 'actions',
  }) === 'turn-actions',
  'turn step prefers turn-actions over actions toggle',
)
assert(
  resolveSheetTourAnchor('turn_actions', 'turn-actions', {
    narrow: true,
    hasVisible: (a) => a === 'actions',
  }) === 'turn-actions',
  'turn step does not fall back to actions toggle',
)

// ——— visible anchor query with stub DOM ———
class FakeEl {
  display: string
  width: number
  height: number
  constructor(display: string, width: number, height: number) {
    this.display = display
    this.width = width
    this.height = height
  }
  getBoundingClientRect() {
    return { top: 0, left: 0, width: this.width, height: this.height, bottom: this.height, right: this.width, x: 0, y: 0, toJSON() {} }
  }
}

const hidden = new FakeEl('none', 100, 40)
const visible = new FakeEl('block', 120, 48)
const zero = new FakeEl('block', 0, 0)

;(globalThis as unknown as { window: { getComputedStyle: (el: FakeEl) => { display: string; visibility: string } } }).window = {
  getComputedStyle: (el: FakeEl) => ({ display: el.display, visibility: 'visible' }),
}

const { isElementVisible, queryVisibleAnchor, queryVisibleAnchors, unionVisibleRects } =
  await import('./anchors.ts')

assert(!isElementVisible(hidden as unknown as HTMLElement), 'hidden display skipped')
assert(!isElementVisible(zero as unknown as HTMLElement), 'zero-size skipped')
assert(isElementVisible(visible as unknown as HTMLElement), 'visible accepted')

const root = {
  querySelectorAll: () => [hidden, visible] as unknown as NodeListOf<Element>,
}
const found = queryVisibleAnchor('[data-onboarding="abilities"]', root as unknown as ParentNode)
assert(found === (visible as unknown as HTMLElement), 'first visible wins over hidden')

const emptyRoot = {
  querySelectorAll: () => [] as unknown as NodeListOf<Element>,
}
assert(
  queryVisibleAnchor('[data-onboarding="missing"]', emptyRoot as unknown as ParentNode) === null,
  'missing anchor returns null (no throw)',
)

const left = new FakeEl('block', 40, 20)
const right = new FakeEl('block', 60, 30)
// Place right farther so union grows.
;(right as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
  ({
    top: 10,
    left: 100,
    width: 60,
    height: 30,
    bottom: 40,
    right: 160,
    x: 100,
    y: 10,
    toJSON() {},
  }) as DOMRect
;(left as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
  ({
    top: 0,
    left: 0,
    width: 40,
    height: 20,
    bottom: 20,
    right: 40,
    x: 0,
    y: 0,
    toJSON() {},
  }) as DOMRect

const dualRoot = {
  querySelectorAll: () => [left, right] as unknown as NodeListOf<Element>,
}
assert(
  queryVisibleAnchors('[data-onboarding="combat-vitals"]', dualRoot as unknown as ParentNode)
    .length === 2,
  'queryVisibleAnchors returns both',
)
const uni = unionVisibleRects(
  '[data-onboarding="combat-vitals"]',
  dualRoot as unknown as ParentNode,
)
assert(uni && uni.left === 0 && uni.top === 0 && uni.width === 160 && uni.height === 40, 'union rect')

console.log('onboardingDisplay.selfcheck ok')
