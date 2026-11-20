/**
 * ONB-02 / TOUR-01 copy / segment invariants.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/onboarding/onboardingCopy.selfcheck.ts
 */

import {
  EDITION_HINT,
  EDITION_HINT_2014,
  EDITION_HINT_2024,
  EMPTY_CHARACTERS,
  HELP_DRAWER,
  JOIN_INTRO,
  LOBBY_TOUR,
  READY_BRIDGE,
  SCENE_INTRO,
  TOUR_STEPS,
} from './copy.ru.ts'
import { EDITION_2024_DIFF } from './edition2024Diff.ru.ts'
import { SCENES_STRIP_TIP, TURN_TIPS, VITAL_TIPS } from './valueTips.ru.ts'
import {
  shouldShowCreateHints,
  shouldShowJoinIntro,
  shouldShowSceneIntros,
} from './storage.ts'
import { defaultOnboardingState, CREATE_HINT_VERSION } from './types.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(EDITION_HINT === EDITION_HINT_2014, 'EDITION_HINT defaults to 2014 copy')
for (const [label, hint] of [
  ['EDITION_HINT_2014', EDITION_HINT_2014],
  ['EDITION_HINT_2024', EDITION_HINT_2024],
] as const) {
  const lower = hint.toLowerCase()
  assert(!lower.includes('сменить на листе'), `${label} must not promise edition change on sheet`)
  assert(!lower.includes('можно сменить'), `${label} must not say edition can be changed later`)
  assert(lower.includes('фиксируется'), `${label} says edition is fixed at creation`)
}
assert(EDITION_HINT_2014.includes('2014'), '2014 hint names 2014')
assert(EDITION_HINT_2024.includes('2024'), '2024 hint names 2024')
assert(/вид/i.test(EDITION_HINT_2024), '2024 hint mentions вид')

assert(EDITION_2024_DIFF.items.length === 6, '2024 diff coach has 6 bullets')
for (const id of ['species', 'heroic', 'exhaustion', 'rest', 'mastery', 'surprise'] as const) {
  assert(
    EDITION_2024_DIFF.items.some((item) => item.id === id),
    `2024 diff item ${id}`,
  )
}

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
assert(/тур лобби/i.test(HELP_DRAWER.restartTipsHint), 'restart hint mentions lobby tour')
assert(/\/join/i.test(HELP_DRAWER.restartTipsHint), 'restart hint mentions join card')

assert(LOBBY_TOUR.master.length === 5, 'lobby master 5 steps')
assert(LOBBY_TOUR.player.length === 4, 'lobby player 4 steps')
assert(JOIN_INTRO.title === 'Что здесь', 'join intro title')
assert(/Сесть за стол/.test(JOIN_INTRO.body), 'join intro CTA')

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
assert(shouldShowJoinIntro(fresh), 'join intro for dnd_new')
assert(!shouldShowJoinIntro({ ...fresh, joinIntroDone: true }), 'join intro once')
assert(!shouldShowJoinIntro({ ...fresh, segment: 'skip' }), 'no join intro for skip')

console.log('onboardingCopy.selfcheck ok')
