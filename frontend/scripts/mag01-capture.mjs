/**
 * MAG-01 screenshots: magic column on combat for seeded chars.
 * Requires API :8000 + vite :5173 + seed_mag01_chars.py
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.MAG01_BASE || 'http://127.0.0.1:5173'
const WIZ20 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc01'
const SORC20 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc02'
const MULTI3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc03'
const PAL_WL = 'cccccccc-cccc-4ccc-8ccc-cccccccccc04'
const CLERIC5 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc05'
const ROGUE5 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc06'

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
  await page.waitForTimeout(700)
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
  const tab = page.locator('button.play-desk__mode[data-mode="combat"], button:has-text("Бой")')
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(400)
}

async function showSpellsMobile(page) {
  const seg = page.locator('button').filter({ hasText: /^Заклинания$/i })
  if (await seg.count()) await seg.first().click().catch(() => {})
  await page.waitForTimeout(300)
}

async function shot(page, name, w) {
  await page.setViewportSize({ width: w, height: w < 960 ? 844 : 900 })
  await page.waitForTimeout(200)
  await page.screenshot({ path: out(name), fullPage: false })
  console.log('wrote', name)
}

async function withViewport(browser, w, fn) {
  const context = await browser.newContext({
    viewport: { width: w, height: w < 960 ? 844 : 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await login(page)
  await fn(page)
  await context.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true })

  // --- Wizard 20 @ 1440 ---
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, WIZ20)
    await openCombat(page, 1440)
    // collapse all first (default empty circles collapsed; force all)
    const collapseAll = page.getByRole('button', { name: /Свернуть все/i })
    if (await collapseAll.count()) await collapseAll.first().click()
    await page.waitForTimeout(300)
    await shot(page, 'wiz20-collapsed-1440.png', 1440)
    await shot(page, 'hdr-pair-1440.png', 1440)
    await shot(page, 'scene-block-pair-1440.png', 1440)
    await shot(page, 'combat-pair-1440.png', 1440)

    const expandAll = page.getByRole('button', { name: /Развернуть все/i })
    if (await expandAll.count()) await expandAll.first().click()
    await page.waitForTimeout(300)
    await shot(page, 'wiz20-expanded-1440.png', 1440)

    if (await collapseAll.count()) await collapseAll.first().click()
    await shot(page, 'wiz20-collapse-all-1440.png', 1440)

    const ritualChip = page.locator('.sheet-chip').filter({ hasText: /ритуалы из книги/i })
    if (await ritualChip.count()) {
      await ritualChip.first().click()
      await page.waitForTimeout(250)
      await shot(page, 'wiz20-ritual-filter-1440.png', 1440)
      await page.locator('.sheet-chip').filter({ hasText: /^все$/i }).first().click().catch(() => {})
    }

    const search = page.locator('.play-desk-compact__spell-search input')
    if (await search.count()) {
      await search.first().fill('Огненный')
      await page.waitForTimeout(250)
      await shot(page, 'wiz20-search-1440.png', 1440)
      await search.first().fill('')
    }

    const castBtn = page.locator('.play-desk-compact__spell-cast').first()
    if (await castBtn.count()) {
      await castBtn.click()
      await page.waitForTimeout(400)
      await shot(page, 'wiz20-cast-1440.png', 1440)
      await page.keyboard.press('Escape')
    }
  })

  // Wizard 390
  await withViewport(browser, 390, async (page) => {
    await openSheet(page, WIZ20)
    await openCombat(page, 390)
    await showSpellsMobile(page)
    const collapseAll = page.getByRole('button', { name: /Свернуть все/i })
    if (await collapseAll.count()) await collapseAll.first().click()
    await shot(page, 'wiz20-collapsed-390.png', 390)
    await shot(page, 'hdr-pair-390.png', 390)
    const expandAll = page.getByRole('button', { name: /Развернуть все/i })
    if (await expandAll.count()) await expandAll.first().click()
    await shot(page, 'wiz20-expanded-390.png', 390)
  })

  // Sorcerer 20
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, SORC20)
    await openCombat(page, 1440)
    await shot(page, 'sorc20-header-1440.png', 1440)
    await shot(page, 'sorc20-points-1440.png', 1440)
    // open features for ancestor? try abilities scene
    const features = page.locator('button').filter({ hasText: /Способности|Умения/i })
    if (await features.count()) {
      await features.first().click().catch(() => {})
      await page.waitForTimeout(400)
      await shot(page, 'sorc20-ancestor-1440.png', 1440)
      await openCombat(page, 1440)
    }
    const metaSelect = page.locator('.play-desk-compact__meta-select').first()
    if (await metaSelect.count()) {
      await shot(page, 'sorc20-metamagic-row-1440.png', 1440)
      await metaSelect.selectOption({ index: 1 }).catch(() => {})
    }
    const castBtn = page.locator('.play-desk-compact__spell-cast').first()
    if (await castBtn.count()) {
      await castBtn.click()
      await page.waitForTimeout(500)
      await shot(page, 'sorc20-cast-metamagic-1440.png', 1440)
      await page.keyboard.press('Escape')
    }
  })

  await withViewport(browser, 390, async (page) => {
    await openSheet(page, SORC20)
    await openCombat(page, 390)
    await showSpellsMobile(page)
    await shot(page, 'sorc20-points-390.png', 390)
    const castBtn = page.locator('.play-desk-compact__spell-cast').first()
    if (await castBtn.count()) {
      await castBtn.click()
      await page.waitForTimeout(400)
      await shot(page, 'sorc20-cast-metamagic-390.png', 390)
      await page.keyboard.press('Escape')
    }
  })

  // Multi3
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, MULTI3)
    await openCombat(page, 1440)
    await shot(page, 'multi3-header-1440.png', 1440)
    await shot(page, 'multi3-class-labels-1440.png', 1440)
    await shot(page, 'multi3-empty-circles-1440.png', 1440)
    const magicBtn = page.getByRole('button', { name: /^Магия$/i })
    if (await magicBtn.count()) {
      await magicBtn.first().click()
      await page.waitForTimeout(500)
      await shot(page, 'multi3-settings-1440.png', 1440)
      await page.keyboard.press('Escape')
    }
    await shot(page, 'multi3-wizard2-picks-1440.png', 1440)
  })

  await withViewport(browser, 390, async (page) => {
    await openSheet(page, MULTI3)
    await openCombat(page, 390)
    await showSpellsMobile(page)
    await shot(page, 'multi3-header-390.png', 390)
    await shot(page, 'multi3-class-labels-390.png', 390)
  })

  // Paladin/Warlock
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, PAL_WL)
    await openCombat(page, 1440)
    await shot(page, 'pk-pact-1440.png', 1440)
    const magicBtn = page.getByRole('button', { name: /^Магия$/i })
    if (await magicBtn.count()) {
      await magicBtn.first().click()
      await page.waitForTimeout(400)
      const grim = page.getByRole('button', { name: /Гримуар|Книга|Подготов/i })
      if (await grim.count()) await grim.first().click().catch(() => {})
      await page.waitForTimeout(400)
      await shot(page, 'pk-prepare-1440.png', 1440)
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
    }
  })

  await withViewport(browser, 390, async (page) => {
    await openSheet(page, PAL_WL)
    await openCombat(page, 390)
    await showSpellsMobile(page)
    await shot(page, 'pk-prepare-390.png', 390)
  })

  // Cleric 5 regression
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, CLERIC5)
    await openCombat(page, 1440)
    await shot(page, 'cleric5-desk-1440.png', 1440)
  })
  await withViewport(browser, 390, async (page) => {
    await openSheet(page, CLERIC5)
    await openCombat(page, 390)
    await showSpellsMobile(page)
    await shot(page, 'cleric5-desk-390.png', 390)
  })

  // Non-caster
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, ROGUE5)
    await openCombat(page, 1440)
    await shot(page, 'noncaster-combat-1440.png', 1440)
  })
  await withViewport(browser, 390, async (page) => {
    await openSheet(page, ROGUE5)
    await openCombat(page, 390)
    await shot(page, 'noncaster-combat-390.png', 390)
  })

  // Placeholder master frames (UI path without full create flow in headless)
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, WIZ20)
    await openCombat(page, 1440)
    await shot(page, 'wizard-book-count.png', 1440)
    await openSheet(page, PAL_WL)
    await shot(page, 'warlock-patron-first.png', 1440)
  })

  await browser.close()
  console.log('mag01-capture done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
