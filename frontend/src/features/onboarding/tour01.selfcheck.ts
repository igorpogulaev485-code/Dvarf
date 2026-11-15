/**
 * TOUR-01 — sheet tour 5 steps + scene intro cards.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/onboarding/tour01.selfcheck.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCENE_INTRO, TOUR_STEPS } from './copy.ru.ts'
import { resolveSheetTourAnchor } from './anchors.ts'
import {
  isSceneIntroSeen,
  restartTipsState,
  shouldShowSceneIntros,
} from './storage.ts'
import { defaultOnboardingState } from './types.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function match(src: string, re: RegExp, msg: string): void {
  assert(re.test(src), msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(join(here, rel), 'utf8')

assert(TOUR_STEPS.length === 5, '5 tour steps')
assert(
  !TOUR_STEPS.some((s) => /needs-setup|abilities|checklist/i.test(`${s.id}:${s.anchor}`)),
  'no legacy needs-setup / abilities / checklist steps',
)

const sheetTour = read('SheetTour.tsx')
match(sheetTour, /ensureCombatTourSurface/, 'tour switches to combat for turn step')
match(sheetTour, /turn_actions/, 'tour has turn_actions step')
match(sheetTour, /__missing__/, 'no floating hole when anchor hidden')

const sceneIntro = read('SceneIntroCard.tsx')
match(sceneIntro, /Понятно/, 'scene card primary')
match(sceneIntro, /SCENE_INTRO/, 'uses SCENE_INTRO copy')
match(sceneIntro, /below-start/, 'scene card sits under panel, left-aligned')
match(
  sheetTour,
  /Сверху имя и хиты\. Нажми хиты, чтобы изменить, а стрелку — чтобы увидеть КД, скорость и отдых\./,
  'mobile step 1 matches collapsed vitals (hits + expand)',
)
assert(!/companionsEmpty/.test(sceneIntro), 'no special empty companions branch')

const header = read('../characters/PlayDeskHeader.tsx')
assert(
  (header.match(/data-onboarding="combat-vitals"/g) || []).length >= 2,
  'desktop combat-vitals on mid + right (union spotlight)',
)

const coach = read('Coachmark.tsx')
match(coach, /unionVisibleRects/, 'coachmark unions multi-node anchors')

const vitals = read('../characters/MobileVitalsBar.tsx')
assert(
  /mobile-vitals--collapsed[\s\S]{0,240}?data-onboarding="combat-vitals"/.test(vitals),
  'collapsed mobile header keeps combat-vitals anchor',
)
assert(
  /mobile-vitals__collapse-hp[\s\S]{0,200}?setHpPadOpen\(true\)/.test(vitals),
  'collapsed hits open HP pad',
)
assert(
  /mobile-vitals__expand[\s\S]{0,120}?setCollapsed\(false\)/.test(vitals),
  'expand arrow reveals full vitals (AC/speed/rest)',
)

const hot = read('../characters/PlayDeskHotBar.tsx')
match(hot, /dataOnboarding="hot-bar"/, 'hot bar onboarding anchor')

const turn = read('../characters/TurnEconomyCombatActions.tsx')
match(turn, /data-onboarding="turn-actions"/, 'turn row onboarding anchor')

const detail = read('../../pages/CharacterDetailPage.tsx')
match(detail, /sceneIntroEnabled/, 'sheet page wires scene intros')
match(
  detail,
  /onChoose=\{\(segment\) => \{[\s\S]*?setTourArmed\(false\)/,
  'welcome choose does not start sheet tour',
)
assert(!/armSheetTour\(\)/.test(detail), 'CharacterDetailPage does not call armSheetTour')

assert(
  resolveSheetTourAnchor('turn_actions', 'turn-actions', {
    narrow: true,
    hasVisible: (a) => a === 'actions',
  }) === 'turn-actions',
  'never spotlight Атаки/Заклинания toggle for turn step',
)

const state = {
  ...defaultOnboardingState(),
  segment: 'product_new' as const,
  seenSceneIntros: ['explore' as const],
}
assert(shouldShowSceneIntros(state), 'product_new sees scene cards')
assert(isSceneIntroSeen(state, 'explore'), 'explore already seen')
assert(!isSceneIntroSeen(state, 'social'), 'social not seen')
const afterRestart = restartTipsState({ ...state, sheetTourDone: true })
assert(afterRestart.seenSceneIntros.length === 0, 'restart re-arms scene cards')
assert(SCENE_INTRO.features.title === 'Способности', 'features title')

console.log('tour01.selfcheck ok')
