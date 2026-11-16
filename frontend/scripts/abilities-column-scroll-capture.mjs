/**
 * Ability column scroll screenshots (cleric5 with magic split).
 * Requires API :8000 + vite :5173 + seed_mag01_chars.py
 *
 *   ABIL_SCROLL_MODE=before|after node scripts/abilities-column-scroll-capture.mjs
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.ABIL_SCROLL_BASE || 'http://127.0.0.1:5173'
const MODE = process.env.ABIL_SCROLL_MODE || 'after'
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

async function openSheet(page, id) {
  await page.goto(`${BASE}/characters/${id}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  const expand = page.getByRole('button', { name: /Развернуть шапку/i })
  if (await expand.count()) await expand.first().click().catch(() => {})
  await page.waitForSelector('.play-desk', { timeout: 25_000 })
}

async function openCombat(page, w) {
  if (w < 960) {
    const nav = page.locator('.mobile-scene-nav button, .mobile-scene-nav__tab').filter({ hasText: /Бой/i })
    if (await nav.count()) await nav.first().click().catch(() => {})
  }
  const tab = page
    .locator('button.play-desk__mode[data-desk-mode="combat"], button.play-desk__mode')
    .filter({ hasText: /^Бой$/i })
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(350)
  if (w >= 960) {
    const split = page.locator('button.play-desk__split-btn').filter({ hasText: /магия/i })
    if (await split.count()) {
      const pressed = await split.first().getAttribute('aria-pressed')
      if (pressed !== 'true') await split.first().click().catch(() => {})
      await page.waitForTimeout(300)
    }
  }
}

async function collapseAbilities(page) {
  const btn = page.getByRole('button', {
    name: /Свернуть все характеристики|Свернуть все/i,
  })
  const scoped = page.locator('.abil-column').getByRole('button', { name: /Свернуть все/i })
  if (await scoped.count()) await scoped.first().click()
  else if (await btn.count()) await btn.first().click()
  await page.waitForTimeout(250)
}

async function expandAbilities(page) {
  const scoped = page.locator('.abil-column').getByRole('button', { name: /Развернуть все/i })
  if (await scoped.count()) await scoped.first().click()
  await page.waitForTimeout(250)
}

async function withViewport(browser, width, height, fn) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await login(page)
  try {
    await fn(page)
  } finally {
    await context.close()
  }
}

async function shotDesk(page, name) {
  await page.screenshot({ path: out(name), fullPage: false })
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/usr/local/bin/google-chrome',
    headless: true,
  })
  try {
    // 1440 expanded / collapsed
    await withViewport(browser, 1440, 900, async (page) => {
      await openSheet(page, CLERIC5)
      await openCombat(page, 1440)
      await expandAbilities(page)
      await shotDesk(page, `abil-scroll-1440-expanded-${MODE}.png`)
      await collapseAbilities(page)
      await shotDesk(page, `abil-scroll-1440-collapsed-${MODE}.png`)
    })

    // 1024 tablet
    await withViewport(browser, 1024, 900, async (page) => {
      await openSheet(page, CLERIC5)
      await openCombat(page, 1024)
      await expandAbilities(page)
      await shotDesk(page, `abil-scroll-1024-expanded-${MODE}.png`)
      await collapseAbilities(page)
      await shotDesk(page, `abil-scroll-1024-collapsed-${MODE}.png`)
    })

    // 390 phone — abilities often behind mobile page; still check combat desk
    await withViewport(browser, 390, 844, async (page) => {
      await openSheet(page, CLERIC5)
      await openCombat(page, 390)
      // Open mobile abilities if button exists
      const abilBtn = page.getByRole('button', { name: /Характеристики|Способности|Сила/i })
      const railOpen = page.locator('.mobile-abil-page, [data-onboarding="abilities"]')
      const openAbil = page.locator('button').filter({ hasText: /Характеристики/i })
      if (await openAbil.count()) await openAbil.first().click().catch(() => {})
      await page.waitForTimeout(400)
      if (await page.locator('.abil-column').count()) {
        await expandAbilities(page)
      }
      await shotDesk(page, `abil-scroll-390-${MODE}.png`)
      void abilBtn
      void railOpen
    })

    console.log(`abilities-column-scroll-capture: ${MODE} ok`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
