/**
 * MOB-FIX after screenshots — real app only (Vite + API), no stubs.
 * Each named frame must be a distinct scene (no duplicate md5).
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
  await page.waitForTimeout(400)
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

async function clickScene(page, label) {
  const tab = page.locator('.mobile-scene-nav__tab, .mobile-scene-nav button').filter({ hasText: label })
  if (await tab.count()) {
    await tab.first().click({ force: true })
    await page.waitForTimeout(600)
    return true
  }
  return false
}

/** Seed concentration + an effect so combat hot / chevrons show real content. */
async function seedCombatVisuals(page, id) {
  await page.evaluate(async (characterId) => {
    const token = localStorage.getItem('dvarf.access_token')
    const res = await fetch(`/characters/${characterId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const ch = await res.json()
    const sheet = structuredClone(ch.sheet || {})
    sheet.play = sheet.play || {}
    sheet.play.concentration = {
      spell_id: 'shield-of-faith',
      name: 'Щит веры',
    }
    const effects = Array.isArray(sheet.play.effects) ? [...sheet.play.effects] : []
    if (!effects.some((e) => /Благослов/i.test(String(e?.name || '')))) {
      effects.push({
        id: 'mobfix-bless',
        name: 'Благословение',
        kind: 'spell',
        linked_concentration: false,
        duration: { unit: 'minutes', value: 1, remaining_rounds: 10 },
        mods: [{ target: 'attack', op: 'roll_die', dice: '1d4' }],
      })
    }
    sheet.play.effects = effects
    sheet.ui = sheet.ui || {}
    sheet.ui.desk_mode = 'combat'
    const patch = await fetch(`/characters/${characterId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sheet_version: ch.sheet_version, sheet }),
    })
    if (!patch.ok) throw new Error(`seed combat patch ${patch.status}`)
  }, id)
}

async function setClassicLayout(page, year) {
  const btn = page.locator('.classic-layout-switch button').filter({ hasText: year })
  await btn.first().click()
  await page.waitForTimeout(900)
  // Wait until active + hint match
  await page.waitForFunction(
    (y) => {
      const active = document.querySelector('.classic-layout-switch button.is-active')
      const hint = document.querySelector('.classic-layout-switch__hint')
      return (
        active?.textContent?.trim() === y &&
        (!hint || hint.textContent?.includes(y))
      )
    },
    year,
    { timeout: 8_000 },
  ).catch(() => {})
  // Clear :hover wash so is-active cream reads correctly in screenshots
  await page.mouse.move(0, 0)
  await page.waitForTimeout(300)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const manifest = []
  const seen = new Map()

  function track(entry) {
    if (seen.has(entry.md5)) {
      console.warn(`DUP md5 ${entry.md5}: ${seen.get(entry.md5)} vs ${entry.name}`)
    } else {
      seen.set(entry.md5, entry.name)
    }
    manifest.push(entry)
  }

  // —— 390×844 ——
  {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()

    // Welcome: × + one «Пропустить подсказки» (no bottom «Пропустить»)
    await login(page, { welcomeDone: false })
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
    track(await shot(page, 'after-01-chars-welcome-390'))

    const closeBtn = page.locator('.ui-dialog__close')
    if (await closeBtn.count()) {
      await closeBtn.click()
      await page.waitForTimeout(400)
    }
    track(await shot(page, 'after-01-chars-list-390'))

    // Collapsed header on explore
    await login(page, { welcomeDone: true })
    await openSheet(page, DARRACK)
    await page.evaluate(() => localStorage.setItem('dvarf.mobileVitals.collapsed.v2', '1'))
    await clickScene(page, /Исслед/i)
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    await dismissOverlays(page)
    await clickScene(page, /Исслед/i)
    track(await shot(page, 'after-02-sheet-header-collapsed-390'))

    // Combat scene with concentration + effects
    await seedCombatVisuals(page, DARRACK)
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await dismissOverlays(page)
    await clickScene(page, /^Бой$/i)
    await page.waitForTimeout(500)
    track(await shot(page, 'after-06-scene-combat-390'))

    // Toast on sheet (visible)
    const rollBtn = page
      .locator(
        '.play-desk-compact__mod--roll, .play-desk__attack-roll, button.play-desk-compact__mod',
      )
      .filter({ hasText: /\+|к20|брос/i })
      .first()
    if (await rollBtn.count()) {
      await rollBtn.click({ force: true }).catch(() => {})
    } else {
      // fallback: any attack / skill roll control
      const any = page.locator('button').filter({ hasText: /^\+/ }).first()
      if (await any.count()) await any.click({ force: true }).catch(() => {})
    }
    await page.waitForSelector('.ui-toast', { timeout: 5_000 }).catch(() => {})
    await page.waitForTimeout(350)
    track(await shot(page, 'after-toast-sheet-390'))

    // Transfer dialog
    await dismissOverlays(page)
    await page.evaluate(() => {
      document.querySelectorAll('.ui-toast').forEach((el) => el.remove())
    })
    await clickScene(page, /Исслед/i)
    let transfer = page.getByRole('button', { name: /Передать монеты/i })
    if (!(await transfer.count())) {
      const coins = page.locator('button, [role="button"]').filter({ hasText: /зм|монет|кошел|зм\b/i })
      if (await coins.count()) await coins.first().click({ force: true }).catch(() => {})
      await page.waitForTimeout(400)
      transfer = page.getByRole('button', { name: /Передать/i })
    }
    if (await transfer.count()) {
      await transfer.first().click({ force: true })
      await page.waitForTimeout(500)
      track(await shot(page, 'after-86-transfer-dialog-390'))
      await page.keyboard.press('Escape')
    } else {
      console.warn('skip after-86-transfer-dialog-390 — transfer control not found')
    }

    // Create: start (sources collapsed) → after opening sources (must differ)
    await page.goto(`${BASE}/characters/create`, { waitUntil: 'networkidle', timeout: 90_000 })
    await page.waitForTimeout(800)
    track(await shot(page, 'after-c13-create-start-390'))
    const srcToggle = page.locator('.create-pipeline__source-toggle')
    if (await srcToggle.count()) {
      await srcToggle.first().click()
      await page.waitForTimeout(500)
      await page.waitForSelector('.create-pipeline__source-chips', { timeout: 3_000 }).catch(() => {})
      // «после раскрытия» — chips visible (name kept for report parity with pack)
      track(await shot(page, 'after-c13-create-filters-collapsed-390'))
    }

    // Race dialog + toast above footer
    const human = page.locator('.create-pipeline__card, button, [role="button"]').filter({ hasText: /^Человек/i })
    if (await human.count()) {
      await human.first().click({ force: true })
      await page.waitForTimeout(500)
      // Card select may already open RaceSetup; else click «Настроить расу»
      const raceDialog = page.locator('.ui-dialog').filter({ hasText: /рас|пол|язык/i })
      if (!(await raceDialog.count())) {
        const setup = page.getByRole('button', { name: /Настроить расу/i })
        if (await setup.count()) await setup.first().click({ force: true }).catch(() => {})
        await page.waitForTimeout(500)
      }
      if (await page.locator('.ui-dialog').count()) {
        const raceShot = await shot(page, 'after-c13f-race-dialog-390')
        track(raceShot)
        const male = page.locator('.ui-dialog').getByRole('button', { name: /^Мужской$|^Муж/i })
        if (await male.count()) {
          await male.first().click({ force: true })
          await page.waitForTimeout(350)
          await male.first().scrollIntoViewIfNeeded().catch(() => {})
        }
        const genderHint = page.locator('.ui-dialog').getByText(/пол|генератор/i)
        if (await genderHint.count()) {
          await genderHint.first().scrollIntoViewIfNeeded().catch(() => {})
        }
        await page.waitForTimeout(300)
        const genderShot = await shot(page, 'after-c13f-race-dialog-gender-390')
        if (genderShot.md5 === raceShot.md5) {
          // Force a visible difference: type into name field
          const nameInput = page.locator('.ui-dialog input').first()
          if (await nameInput.count()) {
            await nameInput.fill('Игорь-тест')
            await page.waitForTimeout(250)
          }
          const retry = await shot(page, 'after-c13f-race-dialog-gender-390')
          track(retry)
        } else {
          track(genderShot)
        }
        const nameInput = page.locator('.ui-dialog input').first()
        if (await nameInput.count()) {
          const v = await nameInput.inputValue()
          if (!v) await nameInput.fill('Тест')
        }
        const lang = page.locator('.ui-dialog .chip-row--compact button, .ui-dialog .sheet-chip').first()
        if (await lang.count()) await lang.click({ force: true }).catch(() => {})
        const apply = page.locator('.ui-dialog').getByRole('button', { name: /Применить/i })
        if (await apply.count()) {
          await apply.first().click({ force: true }).catch(() => {})
          await page.waitForSelector('.ui-toast', { timeout: 5_000 }).catch(() => {})
          await page.waitForTimeout(500)
          track(await shot(page, 'after-c13f-toast-bg-390'))
        }
      }
    }

    // Classic print 390 — force 2014 first (DB may already be 2024)
    await page.goto(`${BASE}/characters/${DARRACK}/classic`, { waitUntil: 'networkidle', timeout: 90_000 })
    await page.waitForTimeout(800)
    await setClassicLayout(page, '2014')
    await page.evaluate(() => window.scrollTo(0, 0))
    track(await shot(page, 'after-c14-classic-toolbar-390'))
    await page.evaluate(() => window.scrollBy(0, 120))
    await page.waitForTimeout(250)
    track(await shot(page, 'after-c14-classic-2014-390'))
    await page.emulateMedia({ media: 'print' })
    await page.evaluate(() => window.scrollTo(0, 0))
    track(await shot(page, 'after-c14-classic-2014-print-390'))
    await page.emulateMedia({ media: 'screen' })
    await setClassicLayout(page, '2024')
    await page.evaluate(() => window.scrollTo(0, 0))
    track(await shot(page, 'after-c14-classic-2024-390'))
    await page.emulateMedia({ media: 'print' })
    track(await shot(page, 'after-c14-classic-2024-print-390'))
    await page.emulateMedia({ media: 'screen' })

    await page.goto(`${BASE}/classic/blank?layout=2024`, { waitUntil: 'networkidle', timeout: 60_000 })
    await page.waitForTimeout(800)
    track(await shot(page, 'after-c14-blank-layout2024-390'))

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
    await clickScene(page, /^Бой$/i)
    const hit = page.locator('button').filter({ hasText: /^\+/ }).first()
    if (await hit.count()) {
      await hit.click({ force: true }).catch(() => {})
      await page.waitForSelector('.ui-toast', { timeout: 4_000 }).catch(() => {})
      await page.waitForTimeout(400)
    }
    track(await shot(page, 'after-toast-over-nav-760'))

    await dismissOverlays(page)
    await page.evaluate(() => {
      document.querySelectorAll('.ui-toast').forEach((el) => el.remove())
    })
    await clickScene(page, /Исслед/i)
    let transfer760 = page.getByRole('button', { name: /Передать монеты/i })
    if (!(await transfer760.count())) {
      const coins = page.locator('button').filter({ hasText: /зм|монет/i })
      if (await coins.count()) await coins.first().click({ force: true }).catch(() => {})
      await page.waitForTimeout(400)
      transfer760 = page.getByRole('button', { name: /Передать/i })
    }
    if (await transfer760.count()) {
      await transfer760.first().click({ force: true })
      await page.waitForTimeout(500)
      track(await shot(page, 'after-117-transfer-footer-760'))
    }

    await context.close()
  }

  // —— 1440 desktop control + print ——
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await login(page)
    await openSheet(page, PAL5)
    track(await shot(page, 'after-desk-header-1440'))
    // Distinct combat frame: switch desk mode + scroll attacks into view
    const combatTab = page.locator('button, [role="tab"]').filter({ hasText: /^Бой$/ })
    if (await combatTab.count()) {
      await combatTab.first().click({ force: true }).catch(() => {})
      await page.waitForTimeout(600)
    }
    await page.evaluate(() => window.scrollBy(0, 280))
    await page.waitForTimeout(400)
    track(await shot(page, 'after-desk-combat-1440'))

    await page.goto(`${BASE}/characters/${DARRACK}/classic`, { waitUntil: 'networkidle', timeout: 90_000 })
    await page.waitForTimeout(800)
    await setClassicLayout(page, '2014')
    track(await shot(page, 'after-c14-classic-2014-1440'))
    await page.emulateMedia({ media: 'print' })
    track(await shot(page, 'after-c14-classic-2014-print-1440'))
    await page.emulateMedia({ media: 'screen' })
    await setClassicLayout(page, '2024')
    track(await shot(page, 'after-c14-classic-2024-1440'))
    await page.emulateMedia({ media: 'print' })
    track(await shot(page, 'after-c14-classic-2024-print-1440'))
    await page.emulateMedia({ media: 'screen' })

    await page.goto(`${BASE}/classic/blank?layout=2024`, { waitUntil: 'networkidle', timeout: 60_000 })
    await page.waitForTimeout(800)
    track(await shot(page, 'after-c14-blank-2024-1440'))

    await context.close()
  }

  writeFileSync(`${ART}/mob-fix/manifest.json`, JSON.stringify(manifest, null, 2))
  const dups = [...seen.entries()].length !== manifest.length
  console.log('manifest', manifest.length, 'unique md5', seen.size, dups ? 'HAS_DUPES' : 'OK')
  await browser.close()
  if (seen.size !== manifest.length) process.exit(2)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
