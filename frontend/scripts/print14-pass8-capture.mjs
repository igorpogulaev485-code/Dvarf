/**
 * PRINT-14 pass 8: Torbin 2024 header/death, 2014 coins full row, blank.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts/print14'
const PASS8 = join(ART, 'pass8-after')
const BASE = process.env.PRINT14_BASE || 'http://127.0.0.1:5173'
const TAG = 'after-'
const DARRACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const TORBIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'

mkdirSync(ART, { recursive: true })
mkdirSync(PASS8, { recursive: true })

const out = (name) => join(ART, `${TAG}${name}`)
const pass8 = (name) => join(PASS8, name)

function md5(path) {
  if (!existsSync(path)) return null
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

function keep(src, destName) {
  if (!existsSync(src)) return null
  const dest = pass8(destName)
  copyFileSync(src, dest)
  return dest
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

async function openClassic(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForSelector('.classic-sheet, .classic-stack', { timeout: 30_000 })
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
}

async function switchLayout(page, year) {
  await page.click(
    `.classic-toolbar-segmented[aria-label="Макет классического листа"] .ui-segmented__item:has-text("${year}")`,
  )
  if (year === '2024') await page.waitForSelector('.classic-lss', { timeout: 20_000 })
  else await page.waitForSelector('.classic-col--combat, .classic-abilities-stack', { timeout: 20_000 })
  await page.waitForTimeout(500)
}

async function shotPdfAndPages(page, prefix) {
  await page.emulateMedia({ media: 'print' })
  await page.waitForTimeout(350)
  await page.addStyleTag({
    content: `
      .classic-fit-scaled { transform: none !important; width: auto !important; }
      .classic-fit-spacer { height: auto !important; }
      .classic-fit-viewport, .classic-fit-spacer { overflow: visible !important; }
      .classic-stack { padding: 0 !important; gap: 0 !important; }
    `,
  })
  const pdfPath = out(`${prefix}-a4.pdf`)
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })
  const prefixPath = out(`${prefix}-print`)
  execFileSync('pdftoppm', ['-png', '-r', '150', '-f', '1', '-l', '4', pdfPath, prefixPath])
  const prints = readdirSync(ART)
    .filter((f) => f.startsWith(`${TAG}${prefix}-print-`) && f.endsWith('.png'))
    .sort()
    .map((f) => join(ART, f))
  await page.emulateMedia({ media: 'screen' })
  return { pdf: pdfPath, prints }
}

function cropCoins(printPng, destBase) {
  execFileSync(
    'python3',
    [
      '-c',
      `
from PIL import Image
import sys
im = Image.open(sys.argv[1]).convert('RGB')
w, h = im.size
# Full coin strip (3+2 rows) inside equip column — all 5 cells.
box = (0.28, 0.62, 0.68, 0.82)
c = im.crop((int(w*box[0]), int(h*box[1]), int(w*box[2]), int(h*box[3])))
c = c.resize((c.width*2, c.height*2), Image.Resampling.LANCZOS)
c.save(sys.argv[2])
print(sys.argv[2])
`,
      printPng,
      destBase,
    ],
    { stdio: 'inherit' },
  )
}

async function headerOverflow(page) {
  return page.evaluate(() => {
    const cells = [...document.querySelectorAll('.classic-lss-id-grid .classic-static, .classic-lss-id-grid .classic-fit-input')]
    return cells.map((el) => {
      const text = (el.textContent || '').trim()
      return {
        text,
        overflowW: el.scrollWidth - el.clientWidth,
        overflowH: el.scrollHeight - el.clientHeight,
        fontSize: getComputedStyle(el).fontSize,
      }
    })
  })
}

async function deathGap(page) {
  return page.evaluate(() => {
    const lines = [...document.querySelectorAll('.classic-lss-death .classic-death-line')]
    return lines.map((line) => {
      const label = line.children[0]
      const group = line.querySelector('.classic-death-bubbles')
      const bubble = group?.querySelector('.classic-bubble')
      if (!label || !bubble) return null
      const lr = label.getBoundingClientRect()
      const br = bubble.getBoundingClientRect()
      // Unscale: gap in CSS px via comparing to computed font size of label
      const gapCss = br.left - lr.right
      return {
        label: label.textContent?.trim(),
        gap: Number(gapCss.toFixed(2)),
        overlap: br.left < lr.right - 0.5,
      }
    })
  })
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--font-render-hinting=none'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await login(page)
  const report = { at: new Date().toISOString(), checks: {} }

  // Torbin 2024
  await openClassic(page, `/characters/${TORBIN}/classic`)
  await switchLayout(page, '2024')
  report.checks.header = await headerOverflow(page)
  report.checks.death = await deathGap(page)
  const { pdf: t2024pdf, prints: t2024 } = await shotPdfAndPages(page, 'torbin-2024')
  report.shots = { torbin2024: { pdf: t2024pdf, prints: t2024 } }

  // Darrack 2024 death sanity
  await openClassic(page, `/characters/${DARRACK}/classic`)
  await switchLayout(page, '2024')
  report.checks.deathDarrack = await deathGap(page)
  await shotPdfAndPages(page, 'darrack-2024')

  // Torbin 2014 + coins
  await openClassic(page, `/characters/${TORBIN}/classic`)
  await switchLayout(page, '2014')
  const { prints: t2014 } = await shotPdfAndPages(page, 'torbin')
  report.shots.torbin2014 = t2014
  const torbinP1 = out('torbin-print-1.png')
  const coinsTorbin = out('torbin-crop-coins.png')
  if (existsSync(torbinP1)) cropCoins(torbinP1, coinsTorbin)

  // Blank 2014
  await openClassic(page, '/classic/blank?layout=2014')
  const { prints: blank } = await shotPdfAndPages(page, 'blank')
  report.shots.blank = blank
  const blankP1 = out('blank-print-1.png')
  const coinsBlank = out('blank-crop-coins.png')
  if (existsSync(blankP1)) cropCoins(blankP1, coinsBlank)

  await browser.close()

  const copies = [
    ['torbin-2024-print-1.png', 'after-torbin-2024-print-1.png'],
    ['darrack-2024-print-1.png', 'after-darrack-2024-print-1.png'],
    ['torbin-print-1.png', 'after-torbin-2014-print-1.png'],
    ['torbin-crop-coins.png', 'after-torbin-crop-coins.png'],
    ['blank-print-1.png', 'after-blank-2014-print-1.png'],
    ['blank-crop-coins.png', 'after-blank-crop-coins.png'],
  ]
  const md5s = {}
  for (const [src, dest] of copies) {
    const p = keep(out(src), dest)
    if (p) md5s[dest] = md5(p)
  }
  const beforeDir = join(ART, 'pass8-before')
  if (existsSync(beforeDir)) {
    for (const f of readdirSync(beforeDir).filter((x) => x.endsWith('.png'))) {
      md5s[`before/${f}`] = md5(join(beforeDir, f))
    }
  }

  // Allow ≤6px subpixel/descender slack after autofit+wrap.
  const headerBad = (report.checks.header || []).some((c) => c.overflowW > 1.5 || c.overflowH > 6)
  const deathBad = (report.checks.death || []).some((d) => d && (d.overlap || d.gap < 4))
  report.md5 = md5s
  writeFileSync(pass8('md5s.json'), JSON.stringify(md5s, null, 2))
  writeFileSync(pass8('report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ fail: headerBad || deathBad, headerBad, deathBad, checks: report.checks, md5s }, null, 2))
  if (headerBad || deathBad) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
