/**
 * MOB-FIX after screenshots — real app only (Vite + API), no stubs.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { chromium, devices } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.MOBFIX_BASE || 'http://127.0.0.1:5173'
const DARRACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const PAL5 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7'

mkdirSync(ART, { recursive: true })
mkdirSync(`${ART}/mob-fix`, { recursive: true })

function md5(path) {
  if (!existsSync(path)) return null
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

async function login(page, { welcomeDone = true } = {}) {
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
  await page.evaluate(
    ({ a, r, welcomeDone }) => {
      localStorage.setItem('dvarf.access_token', a)
      localStorage.setItem('dvarf.refresh_token', r)
      localStorage.setItem('dvarf.mobileVitals.collapsed.v2', '1')
      localStorage.setItem(
        'creed20.onboarding.v1',
        JSON.stringify({
          version: 1,
          welcomeDone,
          segment: welcomeDone ? 'skip' : null,
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
    { a: body.access_token, r: body.refresh_token, welcomeDone },
  )
  // Keep server flag in sync so WelcomeDialog does not reappear mid-capture.
  await page.evaluate(
    async (welcomeDone) => {
      await fetch('/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('dvarf.access_token')}`,
        },
        body: JSON.stringify({
          onboarding: {
            version: 1,
            welcome_done: welcomeDone,
            segment: welcomeDone ? 'skip' : null,
            sheet_tour_done: true,
            lobby_tour_done: true,
          },
        }),
      }).catch(() => {})
    },
    welcomeDone,
  )
}

async function shot(page, name) {
  const path = `${ART}/mob-fix/${name}.png`
  await page.waitForTimeout(350)
  await page.screenshot({ path, fullPage: false })
  const hash = md5(path)
  copyFileSync(path, `${ART}/${name}.png`)
  console.log(`${name} ${hash}`)
  return { name, path, md5: hash }
}

async function dismissOverlays(page) {
  for (let i = 0; i < 4; i++) {
    const close = page.locator('.ui-dialog__close, .ui-dialog__actions button')
    if (await close.count()) {
      await close.first().click({ force: true }).catch(() => {})
      await page.waitForTimeout(200)
    }
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(150)
    if (!(await page.locator('.ui-dialog-backdrop').count())) break
  }
  await page.evaluate(() => {
    document.querySelectorAll('.ui-dialog-backdrop, .onboarding-modal, .coachmark').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
}

async function openSheet(page, id) {
  await page.goto(`${BASE}/characters/${id}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForTimeout(600)
  await dismissOverlays(page)
  await page.waitForSelector('.play-desk, .mobile-vitals', { timeout: 25_000 })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const manifest = []

  // —— 390×844 ——
  {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()

    // Welcome onboarding
    await login(page, { welcomeDone: false })
    // Clear server onboarding so welcome shows
    await page.evaluate(async () => {
      await fetch('/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('dvarf.access_token')}`,
        },
        body: JSON.stringify({ onboarding: { version: 1, welcome_done: false } }),
      }).catch(() => {})
    })
    await page.goto(`${BASE}/characters`, { waitUntil: 'networkidle', timeout: 60_000 })
    await page.waitForTimeout(800)
    manifest.push(await shot(page, 'after-01-chars-welcome-390'))

    // Dismiss welcome via × if present, else skip
    const closeBtn = page.locator('.ui-dialog__close')
    if (await closeBtn.count()) {
      await closeBtn.click()
      await page.waitForTimeout(400)
    }
    manifest.push(await shot(page, 'after-01-chars-list-390'))

    // Sheet collapsed header + resources
    await login(page, { welcomeDone: true })
    await openSheet(page, DARRACK)
    // ensure collapsed
    await page.evaluate(() => localStorage.setItem('dvarf.mobileVitals.collapsed.v2', '1'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    manifest.push(await shot(page, 'after-02-sheet-header-collapsed-390'))
    manifest.push(await shot(page, 'after-06-scene-combat-390'))

    // Transfer dialog
    await dismissOverlays(page)
    const explore = page.locator('.mobile-scene-nav__tab, .mobile-scene-nav button').filter({ hasText: /Исслед/i })
    if (await explore.count()) {
      await explore.first().click({ force: true })
      await page.waitForTimeout(500)
    }
    const transfer = page.getByRole('button', { name: /Передать монеты/i })
    if (await transfer.count()) {
      await transfer.first().click()
      await page.waitForTimeout(500)
      manifest.push(await shot(page, 'after-86-transfer-dialog-390'))
      await page.keyboard.press('Escape')
    } else {
      // open coins via vitals
      const coins = page.locator('button').filter({ hasText: /зм|монет|кошел/i })
      if (await coins.count()) await coins.first().click().catch(() => {})
      await page.waitForTimeout(400)
      const t2 = page.getByRole('button', { name: /Передать/i })
      if (await t2.count()) {
        await t2.first().click()
        await page.waitForTimeout(500)
        manifest.push(await shot(page, 'after-86-transfer-dialog-390'))
        await page.keyboard.press('Escape')
      }
    }

    // Create race step + toast
    await page.goto(`${BASE}/characters/create`, { waitUntil: 'networkidle', timeout: 90_000 })
    await page.waitForTimeout(800)
    manifest.push(await shot(page, 'after-c13-create-start-390'))
    const human = page.locator('button, [role="button"]').filter({ hasText: /^Человек/i })
    if (await human.count()) {
      await human.first().click()
      await page.waitForTimeout(400)
      const setup = page.getByRole('button', { name: /Настроить расу/i })
      if (await setup.count()) await setup.first().click()
      await page.waitForTimeout(500)
      manifest.push(await shot(page, 'after-c13f-race-dialog-390'))
      // pick gender if present
      const male = page.getByRole('button', { name: /^Мужской$|^Муж/i })
      if (await male.count()) await male.first().click()
      const apply = page.getByRole('button', { name: /Применить/i })
      if (await apply.count()) {
        // may need name
        const nameInput = page.locator('input').first()
        if (await nameInput.count()) {
          const v = await nameInput.inputValue()
          if (!v) await nameInput.fill('Тест')
        }
        await apply.first().click().catch(() => {})
        await page.waitForTimeout(700)
        manifest.push(await shot(page, 'after-c13f-toast-bg-390'))
      }
    }

    // Classic print character
    await page.goto(`${BASE}/characters/${DARRACK}/classic`, { waitUntil: 'networkidle', timeout: 90_000 })
    await page.waitForTimeout(800)
    manifest.push(await shot(page, 'after-c14-classic-toolbar-390'))
    const y2024 = page.locator('.classic-layout-switch button').filter({ hasText: '2024' })
    if (await y2024.count()) {
      await y2024.first().click()
      await page.waitForTimeout(1000)
      manifest.push(await shot(page, 'after-c14-classic-2024-390'))
    }
    const y2014 = page.locator('.classic-layout-switch button').filter({ hasText: '2014' })
    if (await y2014.count()) {
      await y2014.first().click()
      await page.waitForTimeout(800)
      manifest.push(await shot(page, 'after-c14-classic-2014-390'))
    }

    // Blank ?layout=2024
    await page.goto(`${BASE}/classic/blank?layout=2024`, { waitUntil: 'networkidle', timeout: 60_000 })
    await page.waitForTimeout(800)
    manifest.push(await shot(page, 'after-c14-blank-layout2024-390'))

    await context.close()
  }

  // —— 390×760 Safari chrome ——
  {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 760 },
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()
    await login(page)
    await openSheet(page, DARRACK)
    // trigger a toast by clicking an attack roll if possible
    const hit = page.locator('.play-desk-compact__mod--roll, button').filter({ hasText: /^\+/ }).first()
    if (await hit.count()) {
      await hit.click().catch(() => {})
      await page.waitForTimeout(600)
    }
    manifest.push(await shot(page, 'after-toast-over-nav-760'))

    // transfer footer
    const explore = page.locator('.mobile-scene-nav__tab').filter({ hasText: /Исслед/i })
    if (await explore.count()) await explore.first().click()
    await page.waitForTimeout(400)
    const transfer = page.getByRole('button', { name: /Передать монеты/i })
    if (await transfer.count()) {
      await transfer.first().click()
      await page.waitForTimeout(500)
      manifest.push(await shot(page, 'after-117-transfer-footer-760'))
    }

    await context.close()
  }

  // —— 1440 desktop control + print ——
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await login(page)
    await openSheet(page, PAL5)
    manifest.push(await shot(page, 'after-desk-combat-1440'))

    await page.goto(`${BASE}/characters/${DARRACK}/classic`, { waitUntil: 'networkidle', timeout: 90_000 })
    await page.waitForTimeout(800)
    manifest.push(await shot(page, 'after-c14-classic-2014-1440'))
    const y2024 = page.locator('.classic-layout-switch button').filter({ hasText: '2024' })
    if (await y2024.count()) {
      await y2024.first().click()
      await page.waitForTimeout(1000)
      manifest.push(await shot(page, 'after-c14-classic-2024-1440'))
    }
    await page.goto(`${BASE}/classic/blank?layout=2024`, { waitUntil: 'networkidle', timeout: 60_000 })
    await page.waitForTimeout(800)
    manifest.push(await shot(page, 'after-c14-blank-2024-1440'))

    await context.close()
  }

  writeFileSync(`${ART}/mob-fix/manifest.json`, JSON.stringify(manifest, null, 2))
  console.log('manifest', manifest.length)
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
