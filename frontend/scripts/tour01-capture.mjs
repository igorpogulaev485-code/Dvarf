/**
 * TOUR-01 screenshots — real Vite + API, no stubs.
 * Frames: tour steps × (fighter + cleric) × (1440 + 390) + scene intros + restart/skip.
 *
 * Requires: API :8000, Vite :5173, seeds uikit03 + lp01 warrior + mag01 cleric + comp01 empty.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const OUT = `${ART}/tour01`
const BASE = process.env.TOUR01_BASE || 'http://127.0.0.1:5173'
const FIGHTER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'
const CLERIC = 'cccccccc-cccc-4ccc-8ccc-cccccccccc05'
const EMPTY_COMP = 'cccccccc-cccc-4ccc-8ccc-cccccccccd01'

mkdirSync(OUT, { recursive: true })
mkdirSync(ART, { recursive: true })

function md5(path) {
  if (!existsSync(path)) return null
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

async function login(page, onboarding) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const body = await page.evaluate(async () => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'uikit03@example.com', password: 'uikit03-dev' }),
    })
    return res.json()
  })
  if (!body.access_token) throw new Error(`login failed: ${JSON.stringify(body).slice(0, 200)}`)
  const state = {
    version: 1,
    welcomeDone: true,
    segment: onboarding.segment ?? 'dnd_new',
    createHintVersion: 1,
    sheetTourDone: Boolean(onboarding.sheetTourDone),
    lobbyTourDone: true,
    dismissedPanelHelp: [],
    seenSceneIntros: onboarding.seenSceneIntros ?? [],
    helpOpened: false,
    pendingReadyBridge: Boolean(onboarding.pendingReadyBridge),
    pendingSheetTour: Boolean(onboarding.pendingSheetTour),
    pendingLobbyTour: false,
  }
  await page.evaluate(
    ({ a, r, state, collapsed, userId }) => {
      localStorage.setItem('dvarf.access_token', a)
      localStorage.setItem('dvarf.refresh_token', r)
      localStorage.setItem('dvarf.mobileVitals.collapsed.v2', collapsed ? '1' : '0')
      localStorage.setItem('creed20.onboarding.v1', JSON.stringify(state))
      if (userId) {
        localStorage.setItem(`creed20.onboarding.v1:${userId}`, JSON.stringify(state))
      }
    },
    {
      a: body.access_token,
      r: body.refresh_token,
      state,
      collapsed: onboarding.collapsed !== false,
      userId: body.user?.id || null,
    },
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
          lobbyTourDone: true,
        },
      }),
    }).catch(() => {})
  }, state)
}

async function openSheet(page, id) {
  await page.goto(`${BASE}/characters/${id}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForTimeout(700)
  await page.waitForSelector('.play-desk', { timeout: 30_000 })
}

async function setViewport(page, w) {
  await page.setViewportSize({ width: w, height: w < 960 ? 844 : 900 })
  await page.waitForTimeout(350)
}

async function shot(page, name) {
  const path = `${OUT}/${name}`
  await page.screenshot({ path, fullPage: false })
  copyFileSync(path, `${ART}/${name}`)
  return path
}

async function clickScene(page, mode, w) {
  const sel =
    w < 960
      ? `.mobile-scene-nav__tab[data-desk-mode="${mode}"]`
      : `.play-desk__mode[data-desk-mode="${mode}"]`
  const tab = page.locator(sel)
  if (await tab.count()) {
    await tab.first().click({ force: true }).catch(() => {})
  } else {
    await page.evaluate((m) => {
      const el = document.querySelector(`[data-desk-mode="${m}"]`)
      if (el instanceof HTMLElement) el.click()
    }, mode)
  }
  await page.waitForTimeout(500)
}

/** Skip a multi-step sheet tour without marking scene intros as seen. */
async function skipSheetTourIfAny(page) {
  const coach = page.locator('.onboarding-coach')
  if (!(await coach.count())) return
  const title = ((await page.locator('#onboarding-coach-title').textContent()) || '').trim()
  // Scene intros use titles Исследование/Общение/… — leave those alone.
  if (/Исследование|Общение|Способности|Напарники/.test(title)) return
  const skip = page.getByRole('button', { name: 'Пропустить' })
  if (await skip.count()) {
    await skip.click({ force: true }).catch(() => {})
    await page.waitForTimeout(250)
  }
}

async function advanceTour(page, steps = 1) {
  for (let i = 0; i < steps; i += 1) {
    const btn = page.getByRole('button', { name: /Далее|Готово/ })
    await btn.click()
    await page.waitForTimeout(400)
  }
}

async function waitCoach(page, titleRe) {
  await page.waitForSelector('.onboarding-coach', { timeout: 15_000 })
  if (titleRe) {
    await page.locator('#onboarding-coach-title').filter({ hasText: titleRe }).waitFor({
      timeout: 10_000,
    })
  }
}

async function captureTourChar(browser, charId, tag, widths) {
  const results = []
  for (const w of widths) {
    const context = await browser.newContext()
    const page = await context.newPage()
    await setViewport(page, w)
    await login(page, {
      segment: 'dnd_new',
      sheetTourDone: false,
      pendingSheetTour: true,
      pendingReadyBridge: false,
      seenSceneIntros: ['explore', 'social', 'features', 'companions'],
      collapsed: true,
    })
    await openSheet(page, charId)
    await page.waitForTimeout(500)
    // If on explore somehow, force combat before tour steps that need it —
    // SheetTour itself switches for turn step.
    await waitCoach(page, /Шапка/)
    results.push(await shot(page, `tour-01-header-${tag}-${w}.png`))

    await advanceTour(page, 1)
    await waitCoach(page, /Хот-панель/)
    results.push(await shot(page, `tour-02-hot-${tag}-${w}.png`))

    await advanceTour(page, 1)
    await waitCoach(page, /Сцены/)
    results.push(await shot(page, `tour-03-scenes-${tag}-${w}.png`))

    await advanceTour(page, 1)
    await waitCoach(page, /Ход/)
    await page.waitForTimeout(400)
    results.push(await shot(page, `tour-04-turn-${tag}-${w}.png`))

    // For help step: leave combat so we prove restart-from-help works later;
    // here just advance.
    await advanceTour(page, 1)
    await waitCoach(page, /Справка/)
    results.push(await shot(page, `tour-05-help-${tag}-${w}.png`))

    await context.close()
  }
  return results
}

async function captureHelpRestart(browser, w) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await setViewport(page, w)
  await login(page, {
    segment: 'dnd_new',
    sheetTourDone: true,
    pendingSheetTour: false,
    seenSceneIntros: ['explore', 'social', 'features', 'companions'],
    collapsed: true,
  })
  await openSheet(page, FIGHTER)
  // Open a non-combat scene first.
  await clickScene(page, 'explore', w)
  await page.waitForTimeout(400)
  // Open help and restart tips.
  const helpBtn = page.locator('[data-onboarding="help"]')
  await helpBtn.first().click()
  await page.waitForSelector('.onboarding-drawer', { timeout: 10_000 })
  await page.getByRole('button', { name: /Показать подсказки снова/i }).click()
  await page.waitForTimeout(600)
  await waitCoach(page, /Шапка/)
  // Tour should have switched context — step 1 still header.
  // Advance to turn to prove combat switch from non-combat.
  await advanceTour(page, 3)
  await waitCoach(page, /Ход/)
  const path = await shot(page, `tour-help-restart-turn-${w}.png`)
  await context.close()
  return path
}

async function captureSceneIntros(browser) {
  const paths = []
  const scenes = [
    { mode: 'explore', title: /Исследование/, empty: false },
    { mode: 'social', title: /Общение/, empty: false },
    { mode: 'features', title: /Способности/, empty: false },
    { mode: 'companions', title: /Напарники/, empty: true },
  ]
  for (const w of [1440, 390]) {
    for (const scene of scenes) {
      const context = await browser.newContext()
      const page = await context.newPage()
      await setViewport(page, w)
      const charId = scene.empty ? EMPTY_COMP : FIGHTER
      // Only the target scene is unseen — avoids a blocking card from another mode.
      const others = scenes.map((s) => s.mode).filter((m) => m !== scene.mode)
      await login(page, {
        segment: 'product_new',
        sheetTourDone: true,
        pendingSheetTour: false,
        seenSceneIntros: others,
        collapsed: true,
      })
      await openSheet(page, charId)
      await skipSheetTourIfAny(page)
      await clickScene(page, scene.mode, w)
      await waitCoach(page, scene.title)
      paths.push(await shot(page, `scene-${scene.mode}-intro-${w}.png`))
      // Dismiss and re-enter — should NOT show again.
      await page.getByRole('button', { name: 'Понятно' }).click({ force: true })
      await page.waitForTimeout(300)
      await clickScene(page, 'combat', w)
      await page.waitForTimeout(300)
      await clickScene(page, scene.mode, w)
      await page.waitForTimeout(500)
      const still = await page.locator('.onboarding-coach').count()
      if (still !== 0) throw new Error(`scene intro reappeared for ${scene.mode}@${w}`)
      paths.push(await shot(page, `scene-${scene.mode}-again-${w}.png`))
      await context.close()
    }
  }

  // After «Показать подсказки снова» — scene card returns.
  {
    const context = await browser.newContext()
    const page = await context.newPage()
    await setViewport(page, 1440)
    await login(page, {
      segment: 'product_new',
      sheetTourDone: true,
      pendingSheetTour: false,
      seenSceneIntros: ['explore', 'social', 'features', 'companions'],
      collapsed: true,
    })
    await openSheet(page, FIGHTER)
    await page.locator('[data-onboarding="help"]').first().click()
    await page.getByRole('button', { name: /Показать подсказки снова/i }).click()
    await page.waitForSelector('.onboarding-coach', { timeout: 10_000 })
    const skip = page.locator('.onboarding-coach__actions button').filter({ hasText: 'Пропустить' })
    if (await skip.count()) await skip.click({ force: true })
    await page.waitForTimeout(400)
    for (let i = 0; i < 5 && (await page.locator('.onboarding-coach').count()); i += 1) {
      await page.locator('.onboarding-coach__actions button').last().click({ force: true }).catch(() => {})
      await page.waitForTimeout(200)
    }
    await clickScene(page, 'explore', 1440)
    await waitCoach(page, /Исследование/)
    paths.push(await shot(page, 'scene-explore-after-restart-1440.png'))
    await context.close()
  }

  // Skip segment — no scene cards.
  {
    const context = await browser.newContext()
    const page = await context.newPage()
    await setViewport(page, 390)
    await login(page, {
      segment: 'skip',
      sheetTourDone: true,
      pendingSheetTour: false,
      seenSceneIntros: [],
      collapsed: true,
    })
    await openSheet(page, FIGHTER)
    await clickScene(page, 'explore', 390)
    await page.waitForTimeout(600)
    const count = await page.locator('.onboarding-coach').count()
    if (count !== 0) throw new Error('skip segment showed scene intro')
    paths.push(await shot(page, 'scene-explore-skip-390.png'))
    await context.close()
  }

  return paths
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const all = []
  try {
    all.push(...(await captureTourChar(browser, FIGHTER, 'fighter', [1440, 390])))
    all.push(...(await captureTourChar(browser, CLERIC, 'cleric', [1440, 390])))
    all.push(await captureHelpRestart(browser, 1440))
    all.push(await captureHelpRestart(browser, 390))
    all.push(...(await captureSceneIntros(browser)))
  } finally {
    await browser.close()
  }

  const rows = all.map((p) => {
    const name = p.split('/').pop()
    return { name, md5: md5(p) }
  })
  const hashes = rows.map((r) => r.md5)
  const dup = hashes.filter((h, i) => hashes.indexOf(h) !== i)
  if (dup.length) {
    console.error('DUPLICATE md5:', dup)
    throw new Error('duplicate frame md5')
  }
  writeFileSync(`${OUT}/md5.json`, JSON.stringify(rows, null, 2))
  console.log(JSON.stringify(rows, null, 2))
  console.log('tour01-capture ok', rows.length, 'frames')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
