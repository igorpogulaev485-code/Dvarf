/**
 * PRINT-14 pass 7: after frames + stuck-words eye-pass + toolbar 1440/390.
 * Writes to /opt/cursor/artifacts/print14/ with TAG=after- plus pass7-after/.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts/print14'
const PASS7 = join(ART, 'pass7-after')
const BASE = process.env.PRINT14_BASE || 'http://127.0.0.1:5173'
const TAG = 'after-'

const DARRACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const TORBIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'

mkdirSync(ART, { recursive: true })
mkdirSync(PASS7, { recursive: true })

const out = (name) => join(ART, `${TAG}${name}`)
const pass7 = (name) => join(PASS7, name)

function md5(path) {
  if (!existsSync(path)) return null
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

function keep(src, destName) {
  if (!existsSync(src)) return null
  const dest = pass7(destName)
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
  if (year === '2024') {
    await page.waitForSelector('.classic-lss', { timeout: 20_000 })
  } else {
    await page.waitForSelector('.classic-col--combat, .classic-abilities-stack', { timeout: 20_000 })
  }
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
  execFileSync('pdftoppm', ['-png', '-r', '150', '-f', '1', '-l', '6', pdfPath, prefixPath])
  const prints = readdirSync(ART)
    .filter((f) => f.startsWith(`${TAG}${prefix}-print-`) && f.endsWith('.png'))
    .sort()
    .map((f) => join(ART, f))
  await page.emulateMedia({ media: 'screen' })
  return { pdf: pdfPath, prints }
}

/** Eye-pass: space glyphs in multi-word labels must stay visibly open. */
async function eyePassStuckWords(page) {
  return page.evaluate(() => {
    const stuck = []
    const roots = [
      ...document.querySelectorAll('.classic-check__name'),
      ...document.querySelectorAll('.classic-coin__mark'),
      ...document.querySelectorAll('.classic-lss-coin-mark'),
      ...document.querySelectorAll('.classic-fit-caption'),
      ...document.querySelectorAll('.classic-ability__label'),
    ]
    for (const el of roots) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (!text.includes(' ')) continue
      const node = el.firstChild
      if (!node || node.nodeType !== Node.TEXT_NODE) continue
      const fs = parseFloat(getComputedStyle(el).fontSize) || 12
      const minSpace = Math.max(1.2, fs * 0.18)
      for (let i = 0; i < text.length; i++) {
        if (text[i] !== ' ') continue
        const range = document.createRange()
        range.setStart(node, i)
        range.setEnd(node, i + 1)
        const w = range.getBoundingClientRect().width
        if (w < minSpace) {
          stuck.push({ text, spaceWidth: Number(w.toFixed(2)), minSpace: Number(minSpace.toFixed(2)) })
          break
        }
      }
    }
    return stuck
  })
}

async function assertNoClipDeath(page) {
  return page.evaluate(() => {
    const death = document.querySelector('.classic-lss-death')
    const sheet = document.querySelector('.classic-lss-p1, .classic-sheet')
    if (!death || !sheet) return { ok: false, reason: 'missing' }
    const dr = death.getBoundingClientRect()
    const sr = sheet.getBoundingClientRect()
    const bubbles = [...death.querySelectorAll('.classic-bubble')].map((b) => b.getBoundingClientRect())
    const overflowRight = Math.max(0, ...bubbles.map((b) => b.right - sr.right), dr.right - sr.right)
    return {
      ok: overflowRight < 1.5,
      overflowRight: Number(overflowRight.toFixed(2)),
      bubbles: bubbles.length,
    }
  })
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--font-render-hinting=none'],
  })
  const report = { at: new Date().toISOString(), base: BASE, checks: {}, md5: {} }

  // ——— Torbin 2014: skills stuck-words + coins ———
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await login(page)
  await openClassic(page, `/characters/${TORBIN}/classic`)
  await switchLayout(page, '2014')
  const stuck2014 = await eyePassStuckWords(page)
  report.checks.stuckWords2014 = stuck2014
  if (stuck2014.length) {
    console.warn('stuck words 2014', stuck2014)
  }
  const { pdf: torbinPdf, prints: torbinPrints } = await shotPdfAndPages(page, 'torbin')
  report.shots = { torbinPdf, torbinPrints }

  // ——— Darrack 2024 full sheet ———
  await openClassic(page, `/characters/${DARRACK}/classic`)
  await switchLayout(page, '2024')
  const hp = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('.classic-lss-hp input')].map((i) => i.value)
    const subclass = document.querySelector('.classic-lss-id-grid label:nth-child(4) input')?.value
    return { inputs, subclass }
  })
  report.checks.darrackHp2024 = hp
  const deathFit = await assertNoClipDeath(page)
  report.checks.deathFit = deathFit
  const stuck2024 = await eyePassStuckWords(page)
  report.checks.stuckWords2024 = stuck2024
  const { pdf: darrack2024Pdf, prints: darrack2024Prints } = await shotPdfAndPages(page, 'darrack-2024')
  report.shots.darrack2024 = { pdf: darrack2024Pdf, prints: darrack2024Prints }

  // ——— Torbin 2024 ———
  await openClassic(page, `/characters/${TORBIN}/classic`)
  await switchLayout(page, '2024')
  const torbinHp = await page.evaluate(() =>
    [...document.querySelectorAll('.classic-lss-hp input')].map((i) => i.value),
  )
  report.checks.torbinHp2024 = torbinHp
  const { pdf: torbin2024Pdf, prints: torbin2024Prints } = await shotPdfAndPages(page, 'torbin-2024')
  report.shots.torbin2024 = { pdf: torbin2024Pdf, prints: torbin2024Prints }

  // ——— Blank coins ———
  await openClassic(page, '/classic/blank')
  const blankCoins = await page.evaluate(() =>
    [...document.querySelectorAll('.classic-coin__mark')].map((el) => (el.textContent || '').trim()),
  )
  report.checks.blankCoins = blankCoins

  // ——— Toolbar 1440 ———
  await openClassic(page, `/characters/${DARRACK}/classic`)
  await switchLayout(page, '2024')
  const toolbar1440Path = out('toolbar-1440.png')
  await page.locator('.classic-print-toolbar').screenshot({ path: toolbar1440Path, type: 'png' })
  const toolbarGeom1440 = await page.evaluate(() => {
    const bar = document.querySelector('.classic-print-toolbar')
    const cta = document.querySelector('.classic-print-cta')
    const blank = document.querySelector('.classic-blank-link')
    const sw = document.querySelector('.classic-toolbar-switch')
    const br = bar?.getBoundingClientRect()
    const cr = cta?.getBoundingClientRect()
    return {
      barWidth: br?.width,
      ctaTop: cr?.top,
      ctaRight: cr?.right,
      barRight: br?.right,
      ctaClipped: cr && br ? cr.right > br.right + 1 : null,
      blankText: blank?.textContent?.trim() || null,
      switchRest: sw?.querySelector('.ui-toggle-chip__rest')?.textContent?.trim() || null,
      switchChecked: sw?.getAttribute('aria-checked'),
      printPrimary: cta?.querySelector('.ui-button--primary') != null,
    }
  })
  report.checks.toolbar1440 = toolbarGeom1440

  // ——— Toolbar 390 ———
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(400)
  const toolbar390Path = out('toolbar-390.png')
  await page.locator('.classic-print-toolbar').screenshot({ path: toolbar390Path, type: 'png' })
  const toolbarGeom390 = await page.evaluate(() => {
    const bar = document.querySelector('.classic-print-toolbar')
    const cta = document.querySelector('.classic-print-cta')
    const br = bar?.getBoundingClientRect()
    const cr = cta?.getBoundingClientRect()
    const overflowX = bar ? bar.scrollWidth - bar.clientWidth : 0
    return {
      overflowX,
      ctaClipped: cr && br ? cr.right > br.right + 1 || cr.left < br.left - 1 : null,
      printPrimary: cta?.querySelector('.ui-button--primary') != null,
      barHeight: br?.height,
    }
  })
  report.checks.toolbar390 = toolbarGeom390

  await browser.close()

  // Crop skills/equip from torbin 2014 p1
  const torbinP1 = out('torbin-print-1.png')
  if (existsSync(torbinP1)) {
    execFileSync(
      'python3',
      [
        '-c',
        `
from PIL import Image
import sys
im = Image.open(sys.argv[1]).convert('RGB')
w, h = im.size
def crop(name, box):
  c = im.crop((int(w*box[0]), int(h*box[1]), int(w*box[2]), int(h*box[3])))
  c = c.resize((c.width*2, c.height*2), Image.Resampling.LANCZOS)
  c.save(sys.argv[2] + '-' + name + '.png')
crop('skills', (0.10, 0.20, 0.36, 0.58))
crop('equip', (0.28, 0.55, 0.68, 0.95))
`,
        torbinP1,
        out('torbin-crop'),
      ],
      { stdio: 'inherit' },
    )
  }

  // Assemble pass7-after copies requested by Igor
  const copies = [
    ['darrack-2024-print-1.png', 'after-darrack-2024-print-1.png'],
    ['darrack-2024-print-2.png', 'after-darrack-2024-print-2.png'],
    ['darrack-2024-print-3.png', 'after-darrack-2024-print-3.png'],
    ['darrack-2024-print-4.png', 'after-darrack-2024-print-4.png'],
    ['torbin-2024-print-1.png', 'after-torbin-2024-print-1.png'],
    ['torbin-2024-print-2.png', 'after-torbin-2024-print-2.png'],
    ['torbin-2024-print-3.png', 'after-torbin-2024-print-3.png'],
    ['torbin-2024-print-4.png', 'after-torbin-2024-print-4.png'],
    ['torbin-crop-skills.png', 'after-torbin-crop-skills.png'],
    ['torbin-crop-equip.png', 'after-torbin-crop-equip.png'],
    ['toolbar-1440.png', 'after-toolbar-1440.png'],
    ['toolbar-390.png', 'after-toolbar-390.png'],
    ['darrack-2024-a4.pdf', 'after-darrack-2024.pdf'],
    ['torbin-2024-a4.pdf', 'after-torbin-2024.pdf'],
  ]
  const md5s = {}
  for (const [srcName, destName] of copies) {
    const src = out(srcName)
    const dest = keep(src, destName)
    if (dest) md5s[destName] = md5(dest)
  }
  // Also keep before md5s reference
  const beforeDir = join(ART, 'pass7-before')
  if (existsSync(beforeDir)) {
    for (const f of readdirSync(beforeDir).filter((x) => x.endsWith('.png') || x.endsWith('.pdf'))) {
      md5s[`before/${f}`] = md5(join(beforeDir, f))
    }
  }

  report.md5 = md5s
  const fail =
    stuck2014.length > 0 ||
    stuck2024.length > 0 ||
    !deathFit.ok ||
    !(hp.inputs?.[0] && hp.inputs?.[2]) ||
    toolbarGeom390.overflowX > 2 ||
    toolbarGeom390.ctaClipped ||
    !toolbarGeom1440.printPrimary ||
    blankCoins.some((c) => /-|ММ|СМ/.test(c))

  writeFileSync(pass7('md5s.json'), JSON.stringify(md5s, null, 2))
  writeFileSync(pass7('report.json'), JSON.stringify(report, null, 2))
  writeFileSync(out('pass7-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ fail, checks: report.checks, md5Count: Object.keys(md5s).length }, null, 2))
  if (fail) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
