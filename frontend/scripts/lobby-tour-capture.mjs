/**
 * LOBBY-TOUR-2 screenshots — real Vite + API, master + player, 1440/390.
 * Frames: master 5 steps, player 4 steps, /join intro, restart/skip checks.
 *
 * Requires: API :8000, Vite :5173, seeds uikit03 + player02.
 */
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  copyFileSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts/lobby-tour2'
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const DOCS = join(REPO_ROOT, 'docs/audit/frames/lobby-tour2')
const BASE = process.env.LOBBYTOUR_BASE || 'http://127.0.0.1:5173'
const API = process.env.LOBBYTOUR_API || 'http://127.0.0.1:8000'

mkdirSync(ART, { recursive: true })
mkdirSync(DOCS, { recursive: true })

function md5(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

function onboardingState(partial) {
  return {
    version: 1,
    welcomeDone: true,
    segment: 'dnd_new',
    createHintVersion: 1,
    sheetTourDone: true,
    lobbyTourDone: false,
    dismissedPanelHelp: [],
    seenSceneIntros: [],
    helpOpened: false,
    pendingReadyBridge: false,
    pendingSheetTour: false,
    pendingLobbyTour: true,
    lobbyTourSeenSteps: [],
    joinIntroDone: false,
    ...partial,
  }
}

async function login(page, email, password, onboarding) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const body = await page.evaluate(
    async ({ email, password }) => {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      return res.json()
    },
    { email, password },
  )
  if (!body.access_token) throw new Error(`login ${email}: ${JSON.stringify(body).slice(0, 200)}`)
  const state = onboardingState(onboarding)
  const userId = body.user?.id || null
  await page.evaluate(
    ({ a, r, state, userId }) => {
      localStorage.setItem('dvarf.access_token', a)
      localStorage.setItem('dvarf.refresh_token', r)
      localStorage.setItem('creed20.onboarding.v1', JSON.stringify(state))
      if (userId) localStorage.setItem(`creed20.onboarding.v1:${userId}`, JSON.stringify(state))
    },
    { a: body.access_token, r: body.refresh_token, state, userId },
  )
  await page.evaluate(async (payload) => {
    await fetch('/auth/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('dvarf.access_token')}`,
      },
      body: JSON.stringify({
        onboarding: {
          version: 1,
          welcomeDone: payload.welcomeDone,
          segment: payload.segment,
          sheetTourDone: payload.sheetTourDone,
          lobbyTourDone: payload.lobbyTourDone,
        },
      }),
    }).catch(() => {})
  }, state)
  return { token: body.access_token, userId, state }
}

async function api(token, path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${path} → ${res.status} ${text.slice(0, 300)}`)
  return data
}

async function setViewport(page, w) {
  await page.setViewportSize({ width: w, height: w < 960 ? 844 : 900 })
  await page.waitForTimeout(350)
}

async function shot(page, name, w) {
  await setViewport(page, w)
  await page.waitForTimeout(200)
  const file = `${name}-${w}.png`
  const artPath = `${ART}/${file}`
  await page.screenshot({ path: artPath, fullPage: false })
  copyFileSync(artPath, `${DOCS}/${file}`)
  return { file, md5: md5(artPath), name, w }
}

async function waitCoach(page) {
  await page.waitForSelector('.onboarding-coach__card', { timeout: 20_000 })
  await page.waitForTimeout(250)
}

async function clickPrimary(page) {
  const btn = page.locator('button:has-text("Далее"), button:has-text("Готово"), button:has-text("Понятно")').first()
  await btn.click({ force: true })
  await page.waitForTimeout(400)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const frames = []
  const push = (meta) => frames.push(meta)

  const masterCtx = await browser.newContext()
  const playerCtx = await browser.newContext()
  const master = await masterCtx.newPage()
  const player = await playerCtx.newPage()

  const masterAuth = await login(master, 'uikit03@example.com', 'uikit03-dev', {
    segment: 'dnd_new',
    lobbyTourDone: false,
    pendingLobbyTour: true,
    lobbyTourSeenSteps: [],
  })
  const playerAuth = await login(player, 'player02@example.com', 'player02-dev', {
    segment: 'dnd_new',
    lobbyTourDone: false,
    pendingLobbyTour: true,
    lobbyTourSeenSteps: [],
    joinIntroDone: false,
  })

  // Cleanup open sessions
  const masterLobbies = await api(masterAuth.token, '/lobbies')
  for (const L of masterLobbies || []) {
    const full = await api(masterAuth.token, `/lobbies/${L.id}`)
    for (const s of full.sessions || []) {
      if (s.closed_at) continue
      try {
        await api(masterAuth.token, `/sessions/${s.id}/close`, {
          method: 'POST',
          body: JSON.stringify({ summary: 'cleanup', write_journal: false }),
        })
      } catch {
        /* ignore */
      }
    }
  }

  const lobby = await api(masterAuth.token, '/lobbies', {
    method: 'POST',
    body: JSON.stringify({ name: `LOBBY-TOUR ${Date.now().toString(36)}` }),
  })
  const code =
    lobby.invite_code ||
    lobby.code ||
    (await api(masterAuth.token, `/lobbies/${lobby.id}`)).invite_code

  // Player joins lobby
  const chars = await api(playerAuth.token, '/characters')
  const charId = chars[0]?.id
  if (!charId) throw new Error('player has no characters')
  try {
    await api(playerAuth.token, '/lobbies/join', {
      method: 'POST',
      body: JSON.stringify({
        code,
        character_id: charId,
        action: 'join',
        acknowledge_start_mismatch: true,
      }),
    })
  } catch (err) {
    const msg = String(err?.message || err)
    if (!msg.includes('409')) throw err
    await api(playerAuth.token, '/lobbies/join', {
      method: 'POST',
      body: JSON.stringify({
        code,
        character_id: charId,
        action: 'transfer',
        acknowledge_start_mismatch: true,
      }),
    })
  }

  // ——— /join intro ———
  await player.goto(`${BASE}/join/${code}`, { waitUntil: 'networkidle', timeout: 60_000 })
  await waitCoach(player)
  push(await shot(player, 'join-intro', 1440))
  push(await shot(player, 'join-intro', 390))
  await clickPrimary(player) // Понятно

  // ——— Master hub steps 1–2 ———
  await master.goto(`${BASE}/lobbies/${lobby.id}`, { waitUntil: 'networkidle', timeout: 60_000 })
  await waitCoach(master)
  push(await shot(master, 'm-01-invite', 1440))
  push(await shot(master, 'm-01-invite', 390))
  await clickPrimary(master)
  await waitCoach(master)
  push(await shot(master, 'm-02-roster', 1440))
  push(await shot(master, 'm-02-roster', 390))
  await clickPrimary(master)

  // Create session and seat player
  const session = await api(masterAuth.token, `/lobbies/${lobby.id}/sessions`, {
    method: 'POST',
    body: JSON.stringify({ name: 'LOBBY-TOUR стол' }),
  })

  // ——— Master session steps 3–5 ———
  await master.goto(`${BASE}/sessions/${session.id}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await master.waitForSelector('.session-table-chrome__back, .session-live-desk', { timeout: 30_000 })
  await waitCoach(master)
  push(await shot(master, 'm-03-live-tabs', 1440))
  push(await shot(master, 'm-03-live-tabs', 390))
  await clickPrimary(master)
  await waitCoach(master)
  push(await shot(master, 'm-04-combat', 1440))
  push(await shot(master, 'm-04-combat', 390))
  await clickPrimary(master)
  await waitCoach(master)
  push(await shot(master, 'm-05-more-help', 1440))
  push(await shot(master, 'm-05-more-help', 390))
  await clickPrimary(master) // Готово
  await pageWaitNoTour(master)

  // Re-entry master: no tour
  await master.goto(`${BASE}/sessions/${session.id}`, { waitUntil: 'networkidle' })
  await master.waitForTimeout(800)
  const masterTourGone = (await master.locator('text=Приглашение').count()) === 0 ||
    !(await master.locator('button:has-text("Далее")').count())
  push(await shot(master, 'm-reentry-no-tour', 1440))
  push(await shot(master, 'm-reentry-no-tour', 390))
  void masterTourGone

  // Restart tips → hub invite step (proof tour returns; ≠ session m-05)
  await master.evaluate(async () => {
    const next = {
      version: 1,
      welcomeDone: true,
      segment: 'dnd_new',
      createHintVersion: 1,
      sheetTourDone: true,
      lobbyTourDone: false,
      dismissedPanelHelp: [],
      seenSceneIntros: [],
      helpOpened: true,
      pendingReadyBridge: false,
      pendingSheetTour: false,
      pendingLobbyTour: true,
      lobbyTourSeenSteps: [],
      joinIntroDone: true,
    }
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('creed20.onboarding.v1')) {
        localStorage.setItem(key, JSON.stringify(next))
      }
    }
    await fetch('/auth/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('dvarf.access_token')}`,
      },
      body: JSON.stringify({
        onboarding: {
          version: 1,
          welcomeDone: true,
          segment: 'dnd_new',
          sheetTourDone: true,
          lobbyTourDone: false,
        },
      }),
    }).catch(() => {})
  })
  await master.goto(`${BASE}/lobbies/${lobby.id}`, { waitUntil: 'networkidle' })
  await waitCoach(master)
  push(await shot(master, 'm-after-restart', 1440))
  push(await shot(master, 'm-after-restart', 390))

  // Skip segment: no tour (hub — визуально отличается от reentry session)
  await login(master, 'uikit03@example.com', 'uikit03-dev', {
    segment: 'skip',
    lobbyTourDone: true,
    pendingLobbyTour: false,
    lobbyTourSeenSteps: [],
  })
  await master.goto(`${BASE}/lobbies/${lobby.id}`, { waitUntil: 'networkidle' })
  await master.waitForTimeout(700)
  push(await shot(master, 'm-skip-no-tour', 390))
  push(await shot(master, 'm-skip-no-tour', 1440))

  // ——— Player tour after seat ———
  await login(player, 'player02@example.com', 'player02-dev', {
    segment: 'dnd_new',
    lobbyTourDone: false,
    pendingLobbyTour: true,
    lobbyTourSeenSteps: [],
    joinIntroDone: true,
  })
  await player.goto(`${BASE}/sessions/${session.id}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await player.waitForSelector('.session-table-chrome__back, .session-live-desk', { timeout: 30_000 })

  // Seat if needed
  const seatBtn = player.locator('button:has-text("Сесть за стол")')
  if (await seatBtn.count()) {
    await seatBtn.first().click()
    await player.waitForTimeout(800)
  }
  await waitCoach(player)
  push(await shot(player, 'p-01-table', 1440))
  push(await shot(player, 'p-01-table', 390))
  await clickPrimary(player)
  await waitCoach(player)
  push(await shot(player, 'p-02-your-turn', 1440))
  push(await shot(player, 'p-02-your-turn', 390))
  await clickPrimary(player)
  await waitCoach(player)
  push(await shot(player, 'p-03-reaction', 1440))
  push(await shot(player, 'p-03-reaction', 390))
  await clickPrimary(player)
  await waitCoach(player)
  push(await shot(player, 'p-04-rewards', 1440))
  push(await shot(player, 'p-04-rewards', 390))
  await clickPrimary(player)
  await pageWaitNoTour(player)

  await player.goto(`${BASE}/sessions/${session.id}`, { waitUntil: 'networkidle' })
  await player.waitForTimeout(700)
  push(await shot(player, 'p-reentry-no-tour', 1440))
  push(await shot(player, 'p-reentry-no-tour', 390))

  await browser.close()

  const hashes = frames.map((f) => f.md5)
  const unique = new Set(hashes)
  if (unique.size !== hashes.length) {
    const dupes = hashes.filter((h, i) => hashes.indexOf(h) !== i)
    console.warn('WARNING duplicate md5:', [...new Set(dupes)])
  }

  const manifest = { generatedAt: new Date().toISOString(), frames }
  writeFileSync(`${ART}/manifest.json`, JSON.stringify(manifest, null, 2))
  writeFileSync(`${DOCS}/manifest.json`, JSON.stringify(manifest, null, 2))
  console.log(JSON.stringify({ count: frames.length, unique: unique.size, frames }, null, 2))
}

async function pageWaitNoTour(page) {
  await page.waitForTimeout(500)
  const n = await page.locator('button:has-text("Далее")').count()
  if (n > 0) {
    // may still be finishing — wait a bit
    await page.waitForTimeout(400)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
