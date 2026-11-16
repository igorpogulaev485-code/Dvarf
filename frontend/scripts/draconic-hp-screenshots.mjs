/**
 * Screenshots for Draconic Resilience HP fix → /opt/cursor/artifacts/fix-draconic-hp/
 *
 * Run (from frontend/):
 *   node scripts/draconic-hp-screenshots.mjs
 * Optional: DRACONIC_HP_BASE=http://127.0.0.1:5173
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const OUT = process.env.DRACONIC_HP_OUT || '/opt/cursor/artifacts/fix-draconic-hp'
const BASE = process.env.DRACONIC_HP_BASE || 'http://127.0.0.1:5176'
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })

async function shot(name, { width, height, fixture, waitHp }) {
  const page = await browser.newPage({ viewport: { width, height } })
  const url = `${BASE}/dev/draconic-hp-preview?fixture=${fixture}&clean=1`
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="draconic-hp-preview"]')
  if (waitHp != null) {
    await page.waitForFunction(
      (expected) => {
        const text = document.body?.innerText || ''
        // Match "58" near hit points / vitals without false positives on XP.
        return (
          text.includes(`/${expected}`) ||
          text.includes(`${expected} / ${expected}`) ||
          new RegExp(`\\b${expected}\\b`).test(text)
        )
      },
      waitHp,
      { timeout: 15_000 },
    )
    await page.waitForTimeout(400)
  } else {
    await page.waitForTimeout(800)
  }
  const tag = width <= 500 ? '390' : '1440'
  const file = `${OUT}/${name}-${tag}.png`
  await page.screenshot({ path: file, fullPage: false })
  await page.close()
  console.log('wrote', file)
}

const sizes = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]

try {
  for (const size of sizes) {
    await shot('sheet-draconic-l8', { ...size, fixture: 'sheet58', waitHp: 58 })
    await shot('sheet-reconcile-50to58', { ...size, fixture: 'sheet50', waitHp: 58 })
    await shot('create-at-l8', { ...size, fixture: 'create8', waitHp: 58 })
    await shot('level-up-7', { ...size, fixture: 'level7', waitHp: 51 })
    await shot('regression-wizard-2014', { ...size, fixture: 'wizard' })
  }
} finally {
  await browser.close()
}

console.log('draconic-hp screenshots done →', OUT)
