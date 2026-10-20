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
await page.waitForSelector('.onboarding-value-tip__btn', { timeout: 25000 })
await new Promise((r) => setTimeout(r, 800))

async function clickTip(selector) {
  const el = await page.$(selector)
  if (!el) throw new Error(`missing tip: ${selector}`)
  const box = await el.boundingBox()
  if (!box) throw new Error(`no box: ${selector}`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForSelector('.onboarding-value-tip__pop--portal', { timeout: 5000 })
  await new Promise((r) => setTimeout(r, 250))
}

async function closeTip() {
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('.onboarding-value-tip__pop--portal'), {
    timeout: 3000,
  })
  await new Promise((r) => setTimeout(r, 150))
}

await page.screenshot({
  path: join(OUT, 'real_09_value_tips_vitals_overview.png'),
  fullPage: false,
})
console.log('ok overview')

await clickTip('.play-desk-vital--shield .onboarding-value-tip__btn')
await page.screenshot({
  path: join(OUT, 'real_10_value_tip_ac.png'),
  fullPage: false,
})
console.log('ok ac')

await closeTip()
await clickTip('.play-desk-header__hp .onboarding-value-tip__btn')
await page.screenshot({
  path: join(OUT, 'real_11_value_tip_hp.png'),
  fullPage: false,
})
console.log('ok hp')

await closeTip()
await clickTip('.abil-block[data-abil="str"] .onboarding-value-tip__btn')
await page.screenshot({
  path: join(OUT, 'real_12_value_tip_strength.png'),
  fullPage: false,
})
console.log('ok str')

await browser.close()
