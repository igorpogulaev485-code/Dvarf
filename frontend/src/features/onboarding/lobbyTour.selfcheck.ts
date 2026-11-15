/**
 * LOBBY-TOUR — copy, anchors, surfaces, join intro.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/onboarding/lobbyTour.selfcheck.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JOIN_INTRO, LOBBY_TOUR } from './copy.ru.ts'
import { resolveLobbyTourAnchor } from './anchors.ts'
import { shouldShowJoinIntro, restartTipsState } from './storage.ts'
import { defaultOnboardingState } from './types.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../../..')

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

assert(LOBBY_TOUR.master.length === 5, 'master tour has 5 steps')
assert(LOBBY_TOUR.player.length === 4, 'player tour has 4 steps')
assert(
  LOBBY_TOUR.master.map((s) => s.id).join(',') ===
    'invite,roster,live_tabs,combat,more_help',
  'master step order',
)
assert(
  LOBBY_TOUR.player.map((s) => s.id).join(',') === 'table,your_turn,reaction,rewards',
  'player step order',
)

const m0 = LOBBY_TOUR.master[0]
assert(m0.surface === 'hub' && m0.anchor === 'lobby-invite', 'invite on hub')
assert(/Приглашение|код|QR|ссылк/i.test(`${m0.title} ${m0.body}`), 'invite copy')

const m1 = LOBBY_TOUR.master[1]
assert(m1.surface === 'hub' && m1.anchor === 'lobby-roster', 'roster on hub')
assert(/Состав|хит|уров/i.test(`${m1.title} ${m1.body}`), 'roster copy')

const m2 = LOBBY_TOUR.master[2]
assert(m2.surface === 'session' && m2.anchor === 'lobby-live-tabs', 'live tabs')
assert(/Стол/.test(m2.body) && /Лента/.test(m2.body) && /Заметки/.test(m2.body), 'tab labels')
assert(m2.bodyNarrow && /нажми/i.test(m2.bodyNarrow), 'narrow live tabs uses нажми')

const m3 = LOBBY_TOUR.master[3]
assert(m3.anchor === 'lobby-combat', 'combat anchor')
assert(
  /Бой/.test(m3.body) &&
    /Бросить за оставшихся/.test(m3.body) &&
    /Следующий ход/.test(m3.body),
  'combat UI labels',
)

const m4 = LOBBY_TOUR.master[4]
assert(m4.anchor === 'lobby-more', 'more anchor')
assert(
  /Ещё/.test(m4.title + m4.body) &&
    /\+ Враги/.test(m4.body) &&
    /Награды/.test(m4.body) &&
    /Справка/.test(m4.body),
  'more/rewards/help copy',
)

const p0 = LOBBY_TOUR.player[0]
assert(p0.anchor === 'lobby-own-card' && /Лист/.test(p0.body), 'player table + Лист')
assert(/Твой ход/.test(LOBBY_TOUR.player[1].body), 'your turn label')
assert(/Нет реакции/.test(LOBBY_TOUR.player[2].body), 'reaction label')
assert(/\+N опыта/.test(LOBBY_TOUR.player[3].body), 'xp toast phrasing')

assert(JOIN_INTRO.title === 'Что здесь', 'join intro title')
assert(/Сесть за стол/.test(JOIN_INTRO.body) && /код/i.test(JOIN_INTRO.body), 'join intro body')

const visible = new Set(['lobby-live-tabs', 'lobby-combat', 'lobby-own-card'])
assert(
  resolveLobbyTourAnchor('live_tabs', 'lobby-live-tabs', {
    hasVisible: (a) => visible.has(a),
  }) === 'lobby-live-tabs',
  'resolve prefers live-tabs',
)
assert(
  resolveLobbyTourAnchor('combat', 'lobby-combat', {
    hasVisible: (a) => a === 'lobby-master-toolbar',
  }) === 'lobby-master-toolbar',
  'combat falls back to toolbar',
)

const hub = readSrc('src/pages/LobbyDetailPage.tsx')
assert(/data-onboarding="lobby-invite"/.test(hub), 'hub invite anchor')
assert(/data-onboarding="lobby-roster"/.test(hub), 'hub roster anchor')
assert(/surface="hub"/.test(hub), 'hub mounts LobbyTour')

const session = readSrc('src/pages/SessionDetailPage.tsx')
assert(/data-onboarding="lobby-combat"/.test(session), 'session combat anchor')
assert(/data-onboarding="lobby-more"/.test(session), 'session more anchor')
assert(/data-onboarding="lobby-help"/.test(session), 'session help anchor')
assert(/surface="session"/.test(session), 'session mounts LobbyTour')

const tabs = readSrc('src/features/lobby/SessionLiveTabs.tsx')
assert(/data-onboarding="lobby-live-tabs"/.test(tabs), 'live tabs anchor')

const joinPage = readSrc('src/pages/JoinLobbyPage.tsx')
assert(/JoinIntroCard/.test(joinPage), 'join mounts JoinIntroCard')
assert(/data-onboarding="lobby-join"/.test(joinPage), 'join form anchor')

const fresh = defaultOnboardingState()
fresh.segment = 'dnd_new'
assert(shouldShowJoinIntro(fresh), 'join intro for dnd_new')
assert(!shouldShowJoinIntro({ ...fresh, joinIntroDone: true }), 'join intro once')
assert(!shouldShowJoinIntro({ ...fresh, segment: 'skip' }), 'no join intro for skip')

const restarted = restartTipsState({
  ...fresh,
  joinIntroDone: true,
  lobbyTourDone: true,
  lobbyTourSeenSteps: ['invite', 'roster'],
})
assert(!restarted.joinIntroDone, 'restart clears join intro')
assert(restarted.lobbyTourSeenSteps.length === 0, 'restart clears lobby steps')
assert(!restarted.lobbyTourDone, 'restart clears lobbyTourDone')

// Old copy must not linger
const copy = readSrc('src/features/onboarding/copy.ru.ts')
assert(!/Вы ведёте стол/.test(copy), 'old master title gone')
assert(!/Как сесть за стол/.test(copy), 'old seat title gone')
assert(!/Экономика хода/.test(copy.split('LOBBY_TOUR')[1] ?? ''), 'old turn_economy title gone from LOBBY_TOUR')

console.log('lobbyTour.selfcheck ok')
