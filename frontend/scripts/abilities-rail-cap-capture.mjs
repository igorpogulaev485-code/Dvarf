/**
 * Ability rail = min(content, stage) screenshots.
 * Requires API :8000 + vite :5173 + seed_mag01_chars.py
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.RAIL_CAP_BASE || 'http://127.0.0.1:5173'
const CLERIC5 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc05'

mkdirSync(ART, { recursive: true })
const out = (name) => `${ART}/${name}`

async function login(page) {
  const body = await page.evaluate(async () => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'uikit03@example.com', password: 'uikit03-dev' }),
    })
    return res.json()
  })
  if (!body.access_token) throw new Error(`login failed: ${JSON.stringify(body).slice(0, 200)}`)
  await page.evaluate(
    ({ a, r }) => {
      localStorage.setItem('dvarf.access_token', a)
      localStorage.setItem('dvarf.refresh_token', r)
      localStorage.setItem('dvarf.mobileVitals.collapsed.v2', '0')
      localStorage.setItem(
        'creed20.onboarding.v1',
        JSON.stringify({
          version: 1,
          welcomeDone: true,
          segment: 'skip',
          createHintVersion: 1,
          sheetTourDone: true,
          lobbyTourDone: true,
          dismissedPanelHelp: [],
          helpOpened: false,
          pendingReadyBridge: false,
          pendingSheetTour: false,
          pendingLobbyTour: false,
        }),
      )
    },
    { a: body.access_token, r: body.refresh_token },
  )
}

async function openCombat(page) {
  await page.goto(`${BASE}/characters/${CLERIC5}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  await page.locator('button.play-desk__mode').filter({ hasText: /^Бой$/i }).first().click()
  await page.waitForTimeout(250)
  const split = page.locator('button.play-desk__split-btn')
  if ((await split.first().getAttribute('aria-pressed')) !== 'true') {
    await split.first().click()
    await page.waitForTimeout(300)
  }
  await page.waitForSelector('.play-desk__left', { timeout: 15_000 })
}

async function collapseAbil(page) {
  const btn = page.locator('.abil-column').getByRole('button', { name: /Свернуть все/i })
  if (await btn.count()) await btn.first().click()
  await page.waitForTimeout(350)
}

async function expandAbil(page) {
  const btn = page.locator('.abil-column').getByRole('button', { name: /Развернуть все/i })
  if (await btn.count()) await btn.first().click()
  await page.waitForTimeout(350)
}

async function metrics(page) {
  return page.evaluate(() => {
    const left = document.querySelector('.play-desk__left')
    const stage = document.querySelector('.play-desk__stage')
    const list = document.querySelector('#abil-column-list')
    const foot = document.querySelector('.play-desk__rail-foot')
    if (!left || !stage || !list) return null
    const lr = left.getBoundingClientRect()
    const sr = stage.getBoundingClientRect()
    return {
      leftH: Math.round(lr.height),
      stageH: Math.round(sr.height),
      leftBottom: Math.round(lr.bottom),
      stageBottom: Math.round(sr.bottom),
      capped: left.classList.contains('is-rail-capped'),
      stageVar: left.style.getPropertyValue('--play-desk-stage-h').trim(),
      listOverflow: getComputedStyle(list).overflowY,
      listScroll: list.scrollHeight,
      listClient: list.clientHeight,
      footVisible: foot ? getComputedStyle(foot).display !== 'none' : false,
      gapBelowLeft: Math.round(sr.bottom - lr.bottom),
    }
  })
}

async function shot(page, name) {
  await page.screenshot({ path: out(name), fullPage: false })
}

async function withViewport(browser, width, fn) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await login(page)
  try {
    await fn(page, width)
  } finally {
    await context.close()
  }
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/usr/local/bin/google-chrome',
    headless: true,
  })
  try {
    for (const w of [1440, 1024]) {
      await withViewport(browser, w, async (page) => {
        await openCombat(page)

        await collapseAbil(page)
        const m1 = await metrics(page)
        console.log(`${w} collapsed`, m1)
        await shot(page, `rail-cap-${w}-collapsed.png`)

        await expandAbil(page)
        const m2 = await metrics(page)
        console.log(`${w} expanded`, m2)
        await shot(page, `rail-cap-${w}-expanded.png`)

        // «Как у Игоря»: часть карточек свёрнута, центр длинный (бой + магия)
        await collapseAbil(page)
        // Expand first two abilities only
        const chevrons = page.locator('.abil-block__label-chevron')
        const n = Math.min(2, await chevrons.count())
        for (let i = 0; i < n; i += 1) {
          const ch = chevrons.nth(i)
          const expanded = await ch.getAttribute('aria-expanded')
          if (expanded !== 'true') await ch.click()
          await page.waitForTimeout(120)
        }
        await page.waitForTimeout(300)
        const m3 = await metrics(page)
        console.log(`${w} mixed`, m3)
        await shot(page, `rail-cap-${w}-mixed-igor.png`)
      })
    }
    console.log('abilities-rail-cap-capture: ok')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
