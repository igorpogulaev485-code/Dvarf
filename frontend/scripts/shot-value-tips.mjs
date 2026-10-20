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

const onboarding = JSON.stringify({
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
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000'],
  defaultViewport: { width: 1440, height: 1000, deviceScaleFactor: 1 },
})

const page = await browser.newPage()
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
    onboardingJson: onboarding,
  },
)

await page.goto(`${BASE}/characters/${CHAR_ID}`, { waitUntil: 'networkidle0' })
await page.waitForSelector('.play-desk-vital--shield.has-onboarding-tip', { timeout: 25000 })
await new Promise((r) => setTimeout(r, 800))

const qCount = await page.$$eval(
  'button.onboarding-help__btn, .onboarding-value-tip__btn',
  (els) => els.length,
)
if (qCount !== 0) {
  throw new Error(`expected 0 floating/value «?» buttons, got ${qCount}`)
}

await page.screenshot({
  path: join(OUT, 'real_09_value_tips_vitals_overview.png'),
  fullPage: false,
})
console.log('ok overview, ?-buttons=', qCount)

async function hoverShot(selector, outName) {
  await page.hover(selector)
  await page.waitForSelector('.onboarding-hover-tip__card--fixed', { timeout: 4000 })
  await new Promise((r) => setTimeout(r, 250))
  await page.screenshot({ path: join(OUT, outName), fullPage: false })
  await page.mouse.move(0, 0)
  await page.waitForFunction(() => !document.querySelector('.onboarding-hover-tip__card--fixed'), {
    timeout: 3000,
  })
}

await hoverShot('.play-desk-vital--shield.has-onboarding-tip', 'real_10_value_tip_ac.png')
console.log('ok ac hover')
await hoverShot('.play-desk-header__hp.has-onboarding-tip', 'real_11_value_tip_hp.png')
console.log('ok hp hover')
await hoverShot(
  '.abil-block[data-abil="str"] .abil-block__label.has-onboarding-tip',
  'real_12_value_tip_strength.png',
)
console.log('ok str hover')

await browser.close()
