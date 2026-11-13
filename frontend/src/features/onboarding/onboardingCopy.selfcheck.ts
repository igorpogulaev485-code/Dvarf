/**
 * ONB-02 copy / segment invariants.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/onboarding/onboardingCopy.selfcheck.ts
 */

import { EDITION_HINT, EMPTY_CHARACTERS, HELP_DRAWER, READY_BRIDGE, TOUR_STEPS } from './copy.ru.ts'
import { SCENES_STRIP_TIP, TURN_TIPS, VITAL_TIPS } from './valueTips.ru.ts'
import { shouldShowCreateHints } from './storage.ts'
import { defaultOnboardingState, CREATE_HINT_VERSION } from './types.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const editionLower = EDITION_HINT.toLowerCase()
assert(!editionLower.includes('сменить на листе'), 'EDITION_HINT must not promise edition change on sheet')
assert(!editionLower.includes('можно сменить'), 'EDITION_HINT must not say edition can be changed later')
assert(editionLower.includes('фиксируется'), 'EDITION_HINT says edition is fixed at creation')

assert(
  EMPTY_CHARACTERS.description.includes('предыстория') &&
    EMPTY_CHARACTERS.description.includes('прокачка'),
  'empty list names full create pipeline',
)

assert(READY_BRIDGE.bodyDesktop.includes('слева'), 'desktop bridge mentions left rail')
assert(!READY_BRIDGE.bodyMobile.includes('слева характеристики'), 'mobile bridge has no left-column layout')
assert(READY_BRIDGE.bodyMobile.includes('шапк') || READY_BRIDGE.bodyMobile.includes('шапки'), 'mobile bridge points to header abilities')

const step1 = TOUR_STEPS.find((s) => s.id === 'combat_header')
assert(step1 && /ход|действи/i.test(step1.body), 'tour step 1 mentions turn / actions')
const step2 = TOUR_STEPS.find((s) => s.id === 'desk_modes')
assert(step2 && !/\bjob\b/i.test(step2.body), 'tour step 2 has no English job')
assert(!/\bjob\b/i.test(SCENES_STRIP_TIP.use), 'scenes tip has no English job')
const step4 = TOUR_STEPS.find((s) => s.id === 'actions')
assert(step4 && /ход|чип/i.test(step4.body), 'tour step 4 mentions turn economy briefly')
const step5 = TOUR_STEPS.find((s) => s.id === 'checklist')
assert(step5 && step5.anchor === 'needs-setup', 'tour step 5 prefers needs-setup anchor')

assert(
  HELP_DRAWER.map.some((row) => row.label === 'Создание' && row.text.includes('черта')),
  'help map creation order includes feat',
)
assert(
  HELP_DRAWER.map.some((row) => row.label === 'Лобби' && /стол|код|QR/i.test(row.text)),
  'help map mentions seating at table',
)

assert(VITAL_TIPS.coins.title.length > 0 && VITAL_TIPS.xp.title.length > 0, 'coins/xp tips exist')
assert(TURN_TIPS.newTurn.title === 'Новый ход', 'new-turn tip present')
assert(TURN_TIPS.marks.title.length > 0, 'marks tip present')
assert(/смерти/i.test(VITAL_TIPS.inspiration.use), 'inspiration tip excludes death saves')

const fresh = defaultOnboardingState()
fresh.segment = 'dnd_new'
assert(shouldShowCreateHints(fresh), 'create hints show for new dnd_new')
assert(
  !shouldShowCreateHints({ ...fresh, createHintVersion: CREATE_HINT_VERSION }),
  'create hints hide after createHintVersion bump',
)
assert(
  !shouldShowCreateHints({ ...fresh, segment: 'skip' }),
  'create hints hidden for skip',
)
assert(
  shouldShowCreateHints({ ...fresh, segment: 'product_new' }),
  'create hints still for product_new until version bump',
)

console.log('onboardingCopy.selfcheck ok')
