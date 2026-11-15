/**
 * PRINT-14 post-merge smoke — 2014/2024 Darrack p1 + p4 → artifacts/print14/final6/
 */
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  copyFileSync,
  renameSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'

const ART = process.env.PRINT14_ART || '/opt/cursor/artifacts/print14/final6'
const BASE = process.env.PRINT14_BASE || 'http://127.0.0.1:5173'
const DARRACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
/** Keep only these print pages after pdftoppm. */
const KEEP_PAGES = new Set([1, 4])

mkdirSync(ART, { recursive: true })
for (const f of readdirSync(ART)) {
  if (f.endsWith('.png') || f.endsWith('.pdf') || f.endsWith('.json') || f.endsWith('.md')) {
    rmSync(join(ART, f), { force: true })
  }
}

function md5(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

async function login(page) {
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
    ({ a, r }) => {
      localStorage.setItem('dvarf.access_token', a)
      localStorage.setItem('dvarf.refresh_token', r)
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

async function openClassic(page) {
  await page.emulateMedia({ media: 'screen' })
  await page.goto(`${BASE}/characters/${DARRACK}/classic?v=${Date.now()}`, {
    waitUntil: 'networkidle',
    timeout: 90_000,
  })
  await page.waitForSelector('.classic-sheet, .classic-stack', { timeout: 30_000 })
  await page.waitForTimeout(1200)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
}

async function switchLayout(page, year) {
  await page.emulateMedia({ media: 'screen' })
  const switched = await page.evaluate((y) => {
    const root = [...document.querySelectorAll('.classic-toolbar-segmented')].find((el) =>
      /Макет/.test(el.getAttribute('aria-label') || ''),
    )
    const btn =
      root && [...root.querySelectorAll('.ui-segmented__item')].find((b) => b.textContent?.trim() === y)
    if (!btn) return false
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return true
  }, year)
  if (!switched) throw new Error(`layout ${year} not found`)
  await page.waitForTimeout(1500)
}

async function setPencil(page, on) {
  const chip = page.locator('.classic-toolbar-chip[aria-label*="Линии под карандаш"]')
  if ((await chip.count()) === 0) return
  const label = await chip.getAttribute('aria-label')
  const isOn = /включены/i.test(label || '')
  if (isOn !== on) {
    await chip.click()
    await page.waitForTimeout(800)
  }
}

async function setColor(page, mode) {
  const control = page.locator('.classic-toolbar-segmented[aria-label="Цвет печати"]')
  if ((await control.count()) === 0) return
  const label = mode === 'bw' ? 'Чёрно-белая' : 'Цвет'
  await control.locator(`.ui-segmented__item:has-text("${label}")`).click()
  await page.waitForTimeout(600)
}

async function capture(page, year) {
  await openClassic(page)
  await switchLayout(page, year)
  await setPencil(page, false)
  await setColor(page, 'bw')
  await page.waitForTimeout(800)

  await page.emulateMedia({ media: 'print' })
  await page.waitForTimeout(400)
  await page.addStyleTag({
    content: `
      .classic-fit-scaled { transform: none !important; width: auto !important; }
      .classic-fit-spacer { height: auto !important; }
      .classic-fit-viewport, .classic-fit-spacer { overflow: visible !important; }
      .classic-stack { padding: 0 !important; gap: 0 !important; }
      .no-print { display: none !important; }
    `,
  })

  const slug = `${year}-darrack`
  const pdfPath = join(ART, `${slug}.pdf`)
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })
  const prefix = join(ART, `${slug}-raw`)
  execFileSync('pdftoppm', ['-png', '-r', '150', pdfPath, prefix])

  const rawPages = readdirSync(ART)
    .filter((f) => f.startsWith(`${slug}-raw-`) && f.endsWith('.png'))
    .sort((a, b) => {
      const na = Number(a.match(/-raw-(\d+)\.png$/)?.[1] || 0)
      const nb = Number(b.match(/-raw-(\d+)\.png$/)?.[1] || 0)
      return na - nb
    })

  const kept = []
  for (let i = 0; i < rawPages.length; i++) {
    const n = i + 1
    const src = join(ART, rawPages[i])
    if (!KEEP_PAGES.has(n)) {
      rmSync(src, { force: true })
      continue
    }
    const destName = `${slug}-p${n}.png`
    const dest = join(ART, destName)
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        try {
          renameSync(src, dest)
        } catch {
          copyFileSync(src, dest)
          rmSync(src, { force: true })
        }
        break
      } catch (err) {
        if (attempt === 5) throw err
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250 * (attempt + 1))
      }
    }
    kept.push({ file: destName, md5: md5(dest), page: n })
  }
  await page.emulateMedia({ media: 'screen' })
  return { slug, pages: kept }
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--font-render-hinting=none'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await login(page)

  const sheets = []
  for (const year of ['2014', '2024']) {
    console.log('capturing', year)
    sheets.push(await capture(page, year))
  }
  await browser.close()

  const md5s = {}
  for (const sheet of sheets) {
    for (const p of sheet.pages) md5s[p.file] = p.md5
  }
  writeFileSync(join(ART, 'md5s.json'), JSON.stringify(md5s, null, 2))
  writeFileSync(
    join(ART, 'REPORT.md'),
    [
      '# PRINT-14 final6 (post-merge main)',
      '',
      'После merge origin/main (MOB-FIX + TOUR-01) в ветку PRINT-14.',
      '',
      '| Кадр | md5 |',
      '|---|---|',
      ...Object.entries(md5s).map(([f, h]) => `| ${f} | \`${h}\` |`),
      '',
    ].join('\n'),
  )
  console.log(JSON.stringify({ sheets, md5s }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
