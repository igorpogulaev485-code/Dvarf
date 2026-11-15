/**
 * EXP-01 screenshots: explore inventory before/after.
 * Requires API :8000 + vite :5173 + seed_exp01_chars.py (+ uikit03 user).
 *
 * EXP01_TAG=before-  → prefix for main/baseline frames
 * EXP01_TAG=         → after frames (default)
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.EXP01_BASE || 'http://127.0.0.1:5173'
const TAG = process.env.EXP01_TAG || ''
const WIZ20 = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
const ROGUE = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'
const GEAR = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3'

mkdirSync(ART, { recursive: true })
const out = (name) => `${ART}/${TAG}${name}`

function md5(path) {
  if (!existsSync(path)) return null
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

async function login(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
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
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  const expand = page.getByRole('button', { name: /Развернуть шапку/i })
  if (await expand.count()) await expand.first().click().catch(() => {})
  await page.waitForSelector('.play-desk', { timeout: 20_000 })
}

async function openExplore(page, w) {
  if (w < 960) {
    const nav = page
      .locator('.mobile-scene-nav button, .mobile-scene-nav__tab')
      .filter({ hasText: /Исследование|Ноша|Инвентар/i })
    if (await nav.count()) await nav.first().click().catch(() => {})
  }
  const tab = page.locator(
    'button.play-desk__mode[data-mode="explore"], button:has-text("Исследование")',
  )
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(500)
  await page.waitForSelector('.inventory-panel', { timeout: 15_000 })
}

async function shotClip(page, path, selector) {
  const box = await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    el.scrollIntoView({ block: 'start' })
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.left) - 4),
      y: Math.max(0, Math.round(r.top)),
      width: Math.max(80, Math.round(r.width) + 8),
      height: Math.min(
        window.innerHeight - Math.round(r.top) - 4,
        Math.max(180, Math.round(r.height) + 12),
      ),
    }
  }, selector)
  if (!box) throw new Error(`no clip for ${selector} → ${path}`)
  await page.screenshot({ path, clip: box })
}

async function shotHeader(page, path) {
  const box = await page.evaluate(() => {
    const desk = document.querySelector('.play-desk')
    if (!desk) return null
    const wide = desk.classList.contains('play-desk--wide')
    const root = wide
      ? document.querySelector('.play-desk__top')
      : document.querySelector('.play-desk__mobile-chrome')
    if (!root) return null
    const r = root.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.x)),
      y: Math.max(0, Math.round(r.y)),
      width: Math.max(80, Math.round(r.width)),
      height: Math.max(40, Math.round(r.height)),
    }
  })
  if (!box) throw new Error(`no header for ${path}`)
  await page.screenshot({ path, clip: box })
}

async function shotSceneChrome(page, path) {
  const box = await page.evaluate(() => {
    const modes =
      document.querySelector('.play-desk__modes') ||
      document.querySelector('.mobile-scene-nav') ||
      document.querySelector('.play-desk__rail')
    if (!modes) return null
    const r = modes.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.x) - 4),
      y: Math.max(0, Math.round(r.y) - 4),
      width: Math.max(80, Math.round(r.width) + 8),
      height: Math.max(40, Math.round(r.height) + 8),
    }
  })
  if (!box) {
    await page.screenshot({ path, fullPage: false })
    return
  }
  await page.screenshot({ path, clip: box })
}

async function withViewport(browser, width, fn) {
  const page = await browser.newPage({
    viewport: { width, height: width < 960 ? 844 : 900 },
    deviceScaleFactor: 1,
  })
  await login(page)
  try {
    await fn(page, width)
  } finally {
    await page.close()
  }
}

async function firstScreen(page, w, id) {
  await openSheet(page, id)
  await openExplore(page, w)
  await shotClip(page, out(`explore-first-${w}.png`), '.inventory-panel')
  await shotHeader(page, out(`hdr-pair-${w}.png`))
  if (w >= 960) await shotSceneChrome(page, out(`scene-block-pair-${w}.png`))
}

async function packFlow(page, w, id) {
  await openSheet(page, id)
  await openExplore(page, w)
  // wait for hydration
  await page.waitForTimeout(800)
  const packRow = page.locator('.inventory-card').filter({ hasText: /Набор/i }).first()
  await packRow.waitFor({ timeout: 10_000 })
  // open pack: prefer Раскрыть then glance/chevron
  const expandBtn = packRow.getByRole('button', { name: /Раскрыть/i })
  if (await expandBtn.count()) {
    await expandBtn.first().click()
    await page.waitForTimeout(600)
  } else {
    await packRow.locator('.inventory-card__glance, .inventory-card__chevron-btn').first().click()
    await page.waitForTimeout(600)
  }
  // ensure view open
  const packOpen = page.locator('.inventory-card--pack-open, .inventory-card--view, .inventory-card--expand').first()
  if (!(await packOpen.count())) {
    await page.locator('.inventory-card').filter({ hasText: /Набор/i }).first()
      .locator('.inventory-card__glance, .inventory-card__chevron-btn, h3')
      .first()
      .click()
      .catch(() => {})
    await page.waitForTimeout(400)
  }
  await shotClip(page, out(`explore-pack-view-${w}.png`), '.inventory-panel')

  const editBtn = page.getByRole('button', { name: /^Изменить$/i }).first()
  if (await editBtn.count()) {
    await editBtn.click()
    await page.waitForTimeout(400)
  }
  await shotClip(page, out(`explore-pack-edit-${w}.png`), '.inventory-panel')

  const collapsePackBtn = page.getByRole('button', { name: /Свернуть набор/i })
  if (await collapsePackBtn.count()) {
    await collapsePackBtn.first().click()
  } else {
    const collapse = page.getByRole('button', { name: /^свернуть$/i })
    if (await collapse.count()) await collapse.first().click()
  }
  await page.waitForTimeout(700)
  // Nested glance rows must disappear when pack is soft-collapsed.
  await page
    .locator('.inventory-card--nested-glance')
    .first()
    .waitFor({ state: 'detached', timeout: 5_000 })
    .catch(() => {})
  // Tight crop on the pack glance row — proves nested is hidden (≠ first-screen md5).
  const packBox = await page.evaluate(() => {
    const pack = Array.from(document.querySelectorAll('.inventory-card')).find((el) =>
      /Набор/i.test(el.textContent || ''),
    )
    const panel = document.querySelector('.inventory-panel')
    if (!pack || !panel) return null
    pack.scrollIntoView({ block: 'center' })
    const r = pack.getBoundingClientRect()
    const pr = panel.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(pr.left) - 4),
      y: Math.max(0, Math.round(r.top) - 8),
      width: Math.max(80, Math.round(pr.width) + 8),
      height: Math.min(280, Math.max(90, Math.round(r.height) + 24)),
    }
  })
  if (!packBox) throw new Error('no collapsed pack clip')
  await page.screenshot({ path: out(`explore-pack-collapsed-${w}.png`), clip: packBox })
  await page.waitForTimeout(400)
}

async function rowAndFilter(page, w) {
  await openSheet(page, GEAR)
  await openExplore(page, w)
  await page.waitForTimeout(700)
  await shotClip(page, out(`explore-row-${w}.png`), '.inventory-panel')
  const filter = page.locator('.inventory-filter').filter({ hasText: /^Надето$/i })
  if (await filter.count()) {
    await filter.first().click()
    await page.waitForTimeout(300)
  }
  await shotClip(page, out(`explore-filter-equipped-${w}.png`), '.inventory-panel')
}

async function walletAndTransfer(page, w) {
  await openSheet(page, GEAR)
  await openExplore(page, w)
  await page.waitForTimeout(500)
  const wallet = page
    .locator(
      'button.inventory-coins, button.inventory-summary__chip--wallet, button[aria-label*="кошел"], button[aria-label*="Монет"]',
    )
    .first()
  if (await wallet.count()) {
    await wallet.click()
    await page.waitForTimeout(400)
  } else {
    // fallback: any button with кошелёк text
    const alt = page.getByRole('button', { name: /кошел|зм/i }).first()
    if (await alt.count()) await alt.click()
    await page.waitForTimeout(400)
  }
  await page.screenshot({ path: out(`explore-wallet-${w}.png`) })
  // close dialog
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  if (w >= 960) {
    const transfer = page.getByRole('button', { name: /Передать монеты/i })
    if (await transfer.count()) {
      await transfer.first().click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: out('explore-transfer-coins-1440.png') })
      await page.keyboard.press('Escape')
    } else {
      writeFileSync(
        out('explore-transfer-coins-1440.note.txt'),
        'Кнопка «Передать монеты» не найдена на персонаже Плут Надет EXP (вне лобби всё равно должна быть из PlayDeskScenes).',
      )
    }
  }
}

async function shotWeightPanel(page, path) {
  const box = await page.evaluate(() => {
    const panel = document.querySelector('.inventory-panel')
    const summary = document.querySelector('.inventory-summary')
    if (!panel || !summary) return null
    summary.scrollIntoView({ block: 'start' })
    const pr = panel.getBoundingClientRect()
    const sr = summary.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(pr.left) - 4),
      y: Math.max(0, Math.round(sr.top) - 4),
      width: Math.max(80, Math.round(pr.width) + 8),
      height: Math.min(420, Math.max(220, Math.round(window.innerHeight - sr.top - 20))),
    }
  })
  if (!box) throw new Error(`no weight clip for ${path}`)
  await page.screenshot({ path, clip: box })
}

async function weightShots(page, w) {
  await openSheet(page, WIZ20)
  await openExplore(page, w)
  await page.waitForTimeout(1200)
  await shotWeightPanel(page, out(`explore-weight-wiz20-${w}.png`))

  await openSheet(page, ROGUE)
  await openExplore(page, w)
  await page.waitForTimeout(1200)
  await shotWeightPanel(page, out(`explore-weight-rogue-${w}.png`))
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-font-subpixel-positioning', '--disable-lcd-text'],
  })
  const widths = [1440, 390]
  // first + weight before pack expand so saved sheet state stays collapsed.
  for (const w of widths) {
    await withViewport(browser, w, async (page) => {
      await firstScreen(page, w, WIZ20)
    })
    await withViewport(browser, w, async (page) => {
      await weightShots(page, w)
    })
    await withViewport(browser, w, async (page) => {
      await rowAndFilter(page, w)
    })
    await withViewport(browser, w, async (page) => {
      await walletAndTransfer(page, w)
    })
  }
  // Pack flow last; collapse at end of each width.
  for (const w of widths) {
    await withViewport(browser, w, async (page) => {
      await packFlow(page, w, WIZ20)
    })
  }
  await browser.close()

  const files = [
    'explore-first-1440.png',
    'explore-first-390.png',
    'explore-pack-view-1440.png',
    'explore-pack-edit-1440.png',
    'explore-pack-collapsed-1440.png',
    'explore-row-1440.png',
    'explore-filter-equipped-1440.png',
    'explore-wallet-1440.png',
    'explore-wallet-390.png',
    'explore-weight-wiz20-1440.png',
    'explore-weight-rogue-1440.png',
    'hdr-pair-1440.png',
    'hdr-pair-390.png',
  ]
  const hashes = {}
  for (const f of files) {
    const p = out(f)
    hashes[`${TAG}${f}`] = md5(p)
  }
  writeFileSync(out('exp01-md5.json'), JSON.stringify(hashes, null, 2))
  console.log('wrote', TAG || '(after)', Object.keys(hashes).length, 'hashes')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
