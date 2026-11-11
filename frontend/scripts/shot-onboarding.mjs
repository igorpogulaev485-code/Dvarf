import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/opt/cursor/artifacts/screenshots'
const BASE = 'http://127.0.0.1:5173/dev/onboarding-preview'
const CHROME = '/usr/bin/google-chrome-stable'

const SCENES = [
  { id: 'welcome', wait: '.ui-dialog', name: 'onboarding_01_welcome' },
  { id: 'empty', wait: '.ui-empty', name: 'onboarding_02_empty_list' },
  { id: 'create', wait: '.onboarding-step-hint', name: 'onboarding_03_create_hint' },
  { id: 'ready', wait: '.ui-dialog', name: 'onboarding_04_ready_bridge' },
  { id: 'tour', wait: '.onboarding-coach__card', name: 'onboarding_05_sheet_tour' },
  { id: 'panels', wait: '.onboarding-help__pop', name: 'onboarding_06_panel_help' },
  { id: 'help', wait: '.onboarding-drawer', name: 'onboarding_07_help_drawer' },
  { id: 'checklist', wait: '.onboarding-checklist', name: 'onboarding_08_checklist' },
]

mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000'],
  defaultViewport: { width: 1440, height: 1000, deviceScaleFactor: 1 },
})

try {
  for (const scene of SCENES) {
    const page = await browser.newPage()
    const url = `${BASE}?scene=${scene.id}&clean=1`
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
    await page.waitForSelector(scene.wait, { timeout: 15000 })
    // coachmark remeasures over ~200ms; drawers settle after paint
    await new Promise((r) => setTimeout(r, scene.id === 'tour' ? 500 : 350))
    if (scene.id === 'tour') {
      await page.waitForFunction(() => {
        const card = document.querySelector('.onboarding-coach__card')
        if (!card) return false
        const top = card.getBoundingClientRect().top
        return top >= 0 && top < window.innerHeight - 80
      }, { timeout: 5000 })
    }
    const path = join(OUT, `${scene.name}.png`)
    await page.screenshot({ path, fullPage: false })
    console.log('ok', scene.name)
    await page.close()
  }
} finally {
  await browser.close()
}
