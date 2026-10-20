import puppeteer from 'puppeteer-core'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/opt/cursor/artifacts/screenshots'
const CHROME = '/usr/bin/google-chrome-stable'
const BASE = 'http://127.0.0.1:5173'
const login = JSON.parse(readFileSync('/tmp/shot-login.json', 'utf8'))
const CHAR_ID = JSON.parse(readFileSync('/tmp/shot-char.json', 'utf8')).id
const USER_ID = login.user.id

mkdirSync(OUT, { recursive: true })

const onboardingTour = JSON.stringify({
  version: 1,
  segment: 'dnd_new',
  welcomeDone: true,
  createHintVersion: 1,
  sheetTourDone: false,
  dismissedPanelHelp: [],
  helpOpened: false,
  pendingReadyBridge: false,
  pendingSheetTour: true,
})

const onboardingTips = JSON.stringify({
  version: 1,
  segment: 'dnd_new',
  welcomeDone: true,
  createHintVersion: 1,
  sheetTourDone: true,
  dismissedPanelHelp: [],
  helpOpened: false,
  pendingReadyBridge: false,
  pendingSheetTour: false,
})

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=390,844'],
  defaultViewport: {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
})

const page = await browser.newPage()

async function boot(onboardingJson) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' })
  await page.evaluate(
    ({ access, refresh, userId, onboardingJson }) => {
      localStorage.setItem('dvarf.access_token', access)
      localStorage.setItem('dvarf.refresh_token', refresh)
      localStorage.setItem(`creed20.onboarding.v1:${userId}`, onboardingJson)
    },
    {
      access: login.access_token,
      refresh: login.refresh_token,
      userId: USER_ID,
      onboardingJson,
    },
  )
  await page.goto(`${BASE}/characters/${CHAR_ID}`, { waitUntil: 'networkidle0' })
}

async function ensureExpanded() {
  await page.waitForSelector('.mobile-vitals, .mobile-vitals--stripped', { timeout: 25000 })
  if (await page.$('.mobile-vitals--stripped')) {
    await page.click('.mobile-vitals__expand')
    await new Promise((r) => setTimeout(r, 300))
  }
}

async function longPress(selector) {
  const opened = await page.evaluate(async (sel) => {
    const host = document.querySelector(sel)
    if (!host) return `missing:${sel}`
    const r = host.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const touch = new Touch({
      identifier: Date.now() % 1000,
      target: host,
      clientX: x,
      clientY: y,
      pageX: x,
      pageY: y,
      screenX: x,
      screenY: y,
    })
    host.dispatchEvent(
      new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch],
      }),
    )
    await new Promise((r) => setTimeout(r, 520))
    host.dispatchEvent(
      new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        targetTouches: [],
        changedTouches: [],
      }),
    )
    return document.querySelector('.onboarding-hover-tip__card--fixed')
      ? 'ok'
      : 'no-tip'
  }, selector)
  if (opened !== 'ok') throw new Error(`longPress ${selector}: ${opened}`)
  await new Promise((r) => setTimeout(r, 200))
}

await boot(onboardingTour)
await page.waitForSelector('.onboarding-coach__card', { timeout: 25000 })
await new Promise((r) => setTimeout(r, 400))
for (let i = 1; i <= 5; i++) {
  await page.screenshot({ path: join(OUT, `mobile_tour_step${i}.png`), fullPage: false })
  console.log('tour step', i)
  await page.click('.onboarding-coach__actions button:last-child')
  await new Promise((r) => setTimeout(r, 350))
}

await boot(onboardingTips)
await ensureExpanded()
await page.screenshot({ path: join(OUT, 'mobile_09_overview.png'), fullPage: false })
console.log('overview')

await longPress('.mobile-vitals__chip--ac.has-onboarding-tip')
await page.screenshot({ path: join(OUT, 'mobile_10_longpress_ac.png'), fullPage: false })
console.log('ac')

await boot(onboardingTips)
await ensureExpanded()
await longPress('.mobile-vitals__hp.has-onboarding-tip')
await page.screenshot({ path: join(OUT, 'mobile_11_longpress_hp.png'), fullPage: false })
console.log('hp')

await boot(onboardingTips)
await ensureExpanded()
await longPress('.mobile-scene-nav__tab.has-onboarding-tip')
await page.screenshot({ path: join(OUT, 'mobile_12_longpress_scene.png'), fullPage: false })
console.log('scene')

await page.click('[data-onboarding="help"]')
await page.waitForSelector('.onboarding-drawer', { timeout: 5000 })
await new Promise((r) => setTimeout(r, 300))
await page.screenshot({ path: join(OUT, 'mobile_13_help_drawer.png'), fullPage: false })
console.log('help')

await browser.close()
