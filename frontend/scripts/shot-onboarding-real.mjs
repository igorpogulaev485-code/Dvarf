/**
 * Screenshots of onboarding on the REAL app (Play Desk / characters list),
 * against local backend with AUTH_EMAIL_STUB.
 */
import puppeteer from 'puppeteer-core'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/opt/cursor/artifacts/screenshots'
const CHROME = '/usr/bin/google-chrome-stable'
const BASE = 'http://127.0.0.1:5173'
const login = JSON.parse(readFileSync('/tmp/shot-login.json', 'utf8'))
const CHAR_ID = JSON.parse(readFileSync('/tmp/shot-char.json', 'utf8')).id
const USER_ID = login.user.id

mkdirSync(OUT, { recursive: true })

function onboardingState(patch) {
  return JSON.stringify({
    version: 1,
    segment: null,
    welcomeDone: false,
    createHintVersion: 0,
    sheetTourDone: false,
    dismissedPanelHelp: [],
    helpOpened: false,
    pendingReadyBridge: false,
    pendingSheetTour: false,
    ...patch,
  })
}

async function withAuth(page, { onboarding } = {}) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' })
  await page.evaluate(
    ({ access, refresh, userId, onboardingJson }) => {
      localStorage.setItem('dvarf.access_token', access)
      localStorage.setItem('dvarf.refresh_token', refresh)
      localStorage.setItem(`creed20.onboarding.v1:${userId}`, onboardingJson)
      // also clear guest key
      localStorage.removeItem('creed20.onboarding.v1')
    },
    {
      access: login.access_token,
      refresh: login.refresh_token,
      userId: USER_ID,
      onboardingJson: onboarding,
    },
  )
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`)
  await page.screenshot({ path, fullPage: false })
  console.log('ok', name)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000'],
  defaultViewport: { width: 1440, height: 1000, deviceScaleFactor: 1 },
})

try {
  // 1) Welcome over real characters list
  {
    const page = await browser.newPage()
    await withAuth(page, {
      onboarding: onboardingState({ welcomeDone: false, segment: null }),
    })
    await page.goto(`${BASE}/characters`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('.ui-dialog', { timeout: 15000 })
    await new Promise((r) => setTimeout(r, 400))
    await shot(page, 'real_01_welcome_on_characters')
    await page.close()
  }

  // 2) Empty-style list chrome: dismiss welcome, show list with hero + Справка
  {
    const page = await browser.newPage()
    await withAuth(page, {
      onboarding: onboardingState({
        welcomeDone: true,
        segment: 'dnd_new',
      }),
    })
    await page.goto(`${BASE}/characters`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('.character-grid, .ui-empty', { timeout: 15000 })
    await new Promise((r) => setTimeout(r, 500))
    await shot(page, 'real_02_characters_list')
    // open help drawer from toolbar
    const helpBtn = await page.$('button::-p-text(Справка)')
    if (helpBtn) {
      await helpBtn.click()
    } else {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) =>
          b.textContent?.includes('Справка'),
        )
        btn?.click()
      })
    }
    await page.waitForSelector('.onboarding-drawer', { timeout: 10000 })
    await new Promise((r) => setTimeout(r, 400))
    await shot(page, 'real_03_help_drawer_on_list')
    await page.close()
  }

  // 3) Ready bridge on real sheet route
  {
    const page = await browser.newPage()
    await withAuth(page, {
      onboarding: onboardingState({
        welcomeDone: true,
        segment: 'dnd_new',
        pendingReadyBridge: true,
        pendingSheetTour: true,
      }),
    })
    await page.goto(`${BASE}/characters/${CHAR_ID}`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('.ui-dialog', { timeout: 20000 })
    await new Promise((r) => setTimeout(r, 600))
    await shot(page, 'real_04_ready_bridge_on_sheet')
    await page.close()
  }

  // 4) Sheet tour on real Play Desk
  {
    const page = await browser.newPage()
    await withAuth(page, {
      onboarding: onboardingState({
        welcomeDone: true,
        segment: 'dnd_new',
        pendingReadyBridge: false,
        pendingSheetTour: true,
        sheetTourDone: false,
      }),
    })
    await page.goto(`${BASE}/characters/${CHAR_ID}`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('.play-desk, .play-desk--wide, .play-desk--mobile', {
      timeout: 25000,
    })
    // arm tour via evaluate if CharacterDetail effect needs a tick
    await page.evaluate(() => {
      // ensure pending is set
    })
    await page.waitForSelector('.onboarding-coach__card', { timeout: 20000 })
    await page.waitForFunction(() => {
      const card = document.querySelector('.onboarding-coach__card')
      if (!card) return false
      const t = card.getBoundingClientRect().top
      return t >= 0 && t < window.innerHeight - 40
    }, { timeout: 8000 })
    await new Promise((r) => setTimeout(r, 400))
    await shot(page, 'real_05_sheet_tour_step1')

    // click Далее a couple times for step 2/3 if possible
    for (const step of [2, 3]) {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('.onboarding-coach__card button')].find((b) =>
          b.textContent?.includes('Далее'),
        )
        btn?.click()
      })
      await new Promise((r) => setTimeout(r, 500))
      await shot(page, `real_05_sheet_tour_step${step}`)
    }
    await page.close()
  }

  // 5) Panel ? on real sheet (no tour)
  {
    const page = await browser.newPage()
    await withAuth(page, {
      onboarding: onboardingState({
        welcomeDone: true,
        segment: 'dnd_new',
        sheetTourDone: true,
        pendingReadyBridge: false,
        pendingSheetTour: false,
      }),
    })
    await page.goto(`${BASE}/characters/${CHAR_ID}`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('.play-desk', { timeout: 25000 })
    await new Promise((r) => setTimeout(r, 800))
    // open combat header help or attacks help
    const opened = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.onboarding-help__btn')]
      if (!btns.length) return false
      btns[0].click()
      return true
    })
    if (opened) {
      await page.waitForSelector('.onboarding-help__pop', { timeout: 5000 })
      await new Promise((r) => setTimeout(r, 300))
    }
    await shot(page, 'real_06_panel_help_on_desk')

    // open Справка on sheet topbar
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        b.textContent?.trim() === 'Справка',
      )
      btn?.click()
    })
    await page.waitForSelector('.onboarding-drawer', { timeout: 8000 })
    await new Promise((r) => setTimeout(r, 400))
    await shot(page, 'real_07_help_drawer_on_sheet')
    await page.close()
  }

  // 6) Create pipeline hint on real create page
  {
    const page = await browser.newPage()
    await withAuth(page, {
      onboarding: onboardingState({
        welcomeDone: true,
        segment: 'dnd_new',
        sheetTourDone: true,
      }),
    })
    await page.goto(`${BASE}/characters/create`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('.create-pipeline, .onboarding-step-hint', { timeout: 20000 })
    await new Promise((r) => setTimeout(r, 600))
    await shot(page, 'real_08_create_step_hint')
    await page.close()
  }

  writeFileSync(
    join(OUT, 'real_shots_meta.json'),
    JSON.stringify({ userId: USER_ID, characterId: CHAR_ID, at: new Date().toISOString() }, null, 2),
  )
} finally {
  await browser.close()
}
