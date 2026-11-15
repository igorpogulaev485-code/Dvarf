/**
 * ONB-02 / TOUR-01 copy / segment invariants.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/onboarding/onboardingCopy.selfcheck.ts
 */

import {
  EDITION_HINT,
  EMPTY_CHARACTERS,
  HELP_DRAWER,
  READY_BRIDGE,
  SCENE_INTRO,
  TOUR_STEPS,
} from './copy.ru.ts'
import { SCENES_STRIP_TIP, TURN_TIPS, VITAL_TIPS } from './valueTips.ru.ts'
import { shouldShowCreateHints, shouldShowSceneIntros } from './storage.ts'
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
assert(READY_BRIDGE.withTour === 'Как читать лист', 'ready bridge CTA matches UI label')

assert(TOUR_STEPS.length === 5, 'sheet tour has exactly 5 steps')
assert(
  TOUR_STEPS.map((s) => s.id).join(',') ===
    'combat_header,hot_bar,desk_modes,turn_actions,help',
  'tour step ids order',
)

const step1 = TOUR_STEPS.find((s) => s.id === 'combat_header')
assert(step1 && /хит/i.test(step1.body) && /КД/i.test(step1.body), 'step 1 mentions hits and AC')
assert(step1 && /отдых/i.test(step1.body), 'step 1 mentions rest')
assert(step1 && !/ход|действи|бонусн|реакц/i.test(step1.body), 'step 1 does not talk about turn')
assert(step1 && !/Нужно настроить|needs-setup/i.test(step1.body), 'step 1 has no needs-setup')

const step2 = TOUR_STEPS.find((s) => s.id === 'hot_bar')
assert(step2 && step2.anchor === 'hot-bar', 'step 2 anchors hot-bar')
assert(step2 && /Следующий раунд/i.test(step2.body), 'step 2 names Следующий раунд')
assert(step2 && /концентрац/i.test(step2.body), 'step 2 mentions concentration')
assert(step2 && /в любой сцене/i.test(step2.body), 'step 2 says visible in any scene')
assert(step2 && !/не сцена|всегда на месте/i.test(step2.body), 'step 2 dropped old phrasing')

const step3 = TOUR_STEPS.find((s) => s.id === 'desk_modes')
assert(step3 && !/\bjob\b/i.test(step3.body), 'tour step 3 has no English job')
assert(step3 && /Бой/.test(step3.body) && /Исследование/.test(step3.body), 'step 3 names scenes')
assert(!/\bjob\b/i.test(SCENES_STRIP_TIP.use), 'scenes tip has no English job')

const step4 = TOUR_STEPS.find((s) => s.id === 'turn_actions')
assert(step4 && step4.anchor === 'turn-actions', 'step 4 anchors turn-actions')
assert(
  step4 && /Действие/.test(step4.body) && /Бонусное/.test(step4.body) && /Реакция/.test(step4.body),
  'step 4 names turn row labels',
)

const step5 = TOUR_STEPS.find((s) => s.id === 'help')
assert(step5 && step5.anchor === 'help', 'step 5 anchors help')
assert(step5 && /Справка/.test(step5.body), 'step 5 mentions Справка')
assert(step5 && /Показать подсказки снова/.test(step5.body), 'step 5 mentions restart tips')
assert(
  TOUR_STEPS.every((s) => !/Нужно настроить|needs-setup/i.test(`${s.title} ${s.body} ${s.anchor}`)),
  'tour copy never mentions needs-setup badge',
)

assert(/справочник/i.test(SCENE_INTRO.explore.body) && /КД/i.test(SCENE_INTRO.explore.body), 'explore intro about catalog + AC')
assert(!/середине хода|стычк/i.test(SCENE_INTRO.explore.body), 'explore intro dropped awkward fight phrasing')
assert(SCENE_INTRO.social.body.includes('внешность') || SCENE_INTRO.social.body.includes('личност'), 'social intro')
assert(SCENE_INTRO.features.body.includes('Использовать'), 'features intro names Использовать')
assert(/фамильяр/i.test(SCENE_INTRO.companions.body) && /пусто/i.test(SCENE_INTRO.companions.body), 'companions intro neutral empty hint')
assert(!/класс не даёт/i.test(SCENE_INTRO.companions.body), 'companions intro does not blame class')

assert(
  HELP_DRAWER.map.some((row) => row.label === 'Создание' && row.text.includes('черта')),
  'help map creation order includes feat',
)
assert(
  HELP_DRAWER.map.some((row) => row.label === 'Лобби' && /стол|код|QR/i.test(row.text)),
  'help map mentions seating at table',
)
assert(/карточки сцен/i.test(HELP_DRAWER.restartTipsHint), 'restart hint mentions scene cards')

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
assert(shouldShowSceneIntros(fresh), 'scene intros for dnd_new')
assert(shouldShowSceneIntros({ ...fresh, segment: 'product_new' }), 'scene intros for product_new')
assert(!shouldShowSceneIntros({ ...fresh, segment: 'skip' }), 'no scene intros for skip')

console.log('onboardingCopy.selfcheck ok')
