/**
 * Screenshots for Draconic Resilience HP fix → /opt/cursor/artifacts/fix-draconic-hp/
 *
 * After (feature branch): DRACONIC_HP_BASE=http://127.0.0.1:5176
 * Before (origin/main worktree): DRACONIC_HP_BEFORE_BASE=http://127.0.0.1:5177
 *
 * Wizard regression uses the SAME route on both: /dev/dice-roller-preview?edition=2014&clean=1
 * (identical sampleClassic2014Character). Hill dwarf uses /dev/draconic-hp-preview?fixture=hilldwarf
 * (preview page must exist on the before worktree for those shots).
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const OUT = process.env.DRACONIC_HP_OUT || '/opt/cursor/artifacts/fix-draconic-hp'
const AFTER = process.env.DRACONIC_HP_BASE || 'http://127.0.0.1:5176'
const BEFORE = process.env.DRACONIC_HP_BEFORE_BASE || ''
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })

async function shot(name, { width, height, base, path, waitHp }) {
  const page = await browser.newPage({ viewport: { width, height } })
  const url = `${base}${path}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(waitHp != null ? 200 : 800)
  if (waitHp != null) {
    await page.waitForFunction(
      (expected) => {
        const text = document.body?.innerText || ''
        return (
          text.includes(`/${expected}`) ||
          text.includes(`${expected} / ${expected}`) ||
          text.includes(`${expected}/${expected}`)
        )
      },
      waitHp,
      { timeout: 15_000 },
    )
    await page.waitForTimeout(400)
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
    await shot('sheet-draconic-l8', {
      ...size,
      base: AFTER,
      path: '/dev/draconic-hp-preview?fixture=sheet58&clean=1',
      waitHp: 58,
    })
    await shot('sheet-reconcile-50to58', {
      ...size,
      base: AFTER,
      path: '/dev/draconic-hp-preview?fixture=sheet50&clean=1',
      waitHp: 58,
    })
    await shot('create-at-l8', {
      ...size,
      base: AFTER,
      path: '/dev/draconic-hp-preview?fixture=create8&clean=1',
      waitHp: 58,
    })
    await shot('level-up-7', {
      ...size,
      base: AFTER,
      path: '/dev/draconic-hp-preview?fixture=level7&clean=1',
      waitHp: 51,
    })

    // Same character data on both branches: dice-roller classic sample.
    await shot('regression-wizard-2014', {
      ...size,
      base: AFTER,
      path: '/dev/dice-roller-preview?edition=2014&clean=1',
    })
    if (BEFORE) {
      await shot('regression-wizard-2014-before', {
        ...size,
        base: BEFORE,
        path: '/dev/dice-roller-preview?edition=2014&clean=1',
      })
    }

    // Hill dwarf average HP: 37 → 42 after reconcile (+5 = level).
    await shot('regression-hilldwarf', {
      ...size,
      base: AFTER,
      path: '/dev/draconic-hp-preview?fixture=hilldwarf&clean=1',
      waitHp: 42,
    })
    if (BEFORE) {
      await shot('regression-hilldwarf-before', {
        ...size,
        base: BEFORE,
        path: '/dev/draconic-hp-preview?fixture=hilldwarf&clean=1',
        waitHp: 37,
      })
    }
  }

  // Level-up dialog with explicit +1 Draconic line.
  for (const { width, height, tag } of [
    { width: 1440, height: 900, tag: '1440' },
    { width: 390, height: 844, tag: '390' },
  ]) {
    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto(`${AFTER}/dev/draconic-hp-preview?fixture=level7&clean=1`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(500)
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')]
      const hit = btns.find(
        (b) =>
          /уровень|прокач/i.test(b.textContent || '') ||
          /уровень|прокач/i.test(b.getAttribute('aria-label') || ''),
      )
      if (hit) hit.click()
    })
    await page.waitForTimeout(400)
    const plus = page.getByRole('button', { name: /\+1 уровень/i })
    if (await plus.count()) {
      await plus.first().click()
      await page.waitForTimeout(700)
    }
    await page.getByText(/Драконья устойчивость|средн/i).first().waitFor({ timeout: 8000 }).catch(() => {})
    const file = `${OUT}/level-up-7to8-${tag}.png`
    await page.screenshot({ path: file, fullPage: false })
    console.log('wrote', file)
    await page.close()
  }
} finally {
  await browser.close()
}

console.log('draconic-hp screenshots done →', OUT)
