/**
 * Before/after screenshots: collapsed & expanded spell circles (cleric).
 * Requires API :8000 + vite :5173 + seed_mag01_chars.py
 *
 * Usage:
 *   SPELLS_COLLAPSE_MODE=before node scripts/spells-collapse-align-capture.mjs
 *   SPELLS_COLLAPSE_MODE=after  node scripts/spells-collapse-align-capture.mjs
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.SPELLS_COLLAPSE_BASE || 'http://127.0.0.1:5173'
const MODE = process.env.SPELLS_COLLAPSE_MODE || 'after' // before | after
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

function spellsRoot(page) {
  return page.locator('.play-desk-compact--spells').first()
}

async function openCombatSpells(page, w) {
  if (w < 960) {
    const nav = page.locator('.mobile-scene-nav button, .mobile-scene-nav__tab').filter({ hasText: /Бой/i })
    if (await nav.count()) await nav.first().click().catch(() => {})
  }
  const tab = page.locator('button.play-desk__mode[data-mode="combat"], button.play-desk__mode').filter({ hasText: /^Бой$/i })
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(350)
  if (w < 960) {
    const seg = page.locator('.mobile-combat-seg__btn, button').filter({ hasText: /^Заклинания$/i })
    if (await seg.count()) await seg.first().click().catch(() => {})
    await page.waitForTimeout(300)
  }
  await spellsRoot(page).waitFor({ timeout: 15_000 })
}

async function collapseAll(page) {
  const btn = spellsRoot(page).getByRole('button', { name: /Свернуть все круги заклинаний|Свернуть все/i })
  if (await btn.count()) await btn.first().click()
  await page.waitForTimeout(250)
}

async function expandAll(page) {
  const btn = spellsRoot(page).getByRole('button', { name: /Развернуть все круги заклинаний|Развернуть все/i })
  if (await btn.count()) await btn.first().click()
  await page.waitForTimeout(250)
}

async function shotPanel(page, name) {
  const panel = spellsRoot(page)
  await panel.screenshot({ path: out(name) })
}

async function withViewport(browser, width, fn) {
  const context = await browser.newContext({
    viewport: { width, height: width >= 960 ? 900 : 844 },
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

const browser = await chromium.launch({ headless: true })
try {
  for (const w of [1440, 390]) {
    await withViewport(browser, w, async (page) => {
      await openSheet(page, CLERIC5)
      await openCombatSpells(page, w)
      await collapseAll(page)
      await shotPanel(page, `cleric-spells-collapsed-${w}-${MODE}.png`)
      await expandAll(page)
      await shotPanel(page, `cleric-spells-expanded-${w}-${MODE}.png`)
    })
  }
  console.log(JSON.stringify({ ok: true, mode: MODE, art: ART }, null, 2))
} finally {
  await browser.close()
}
