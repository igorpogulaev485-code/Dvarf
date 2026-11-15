/**
 * PRINT-14 screenshots: real classic 2014 sheet (not stubs).
 * PRINT14_BASE / PRINT14_TAG — as before.
 * Also builds side-by-side with official WotC pages.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts/print14'
const BASE = process.env.PRINT14_BASE || 'http://127.0.0.1:5173'
const TAG = process.env.PRINT14_TAG || 'after-'

const DARRACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const TORBIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
const SORC = 'cccccccc-cccc-4ccc-8ccc-cccccccccc02'

mkdirSync(ART, { recursive: true })
const out = (name) => join(ART, `${TAG}${name}`)

function md5(path) {
  if (!existsSync(path)) return null
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

async function openClassic(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForSelector('.classic-sheet, .classic-stack', { timeout: 30_000 })
  await page.waitForTimeout(800)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
}

async function shotPdfAndPages(page, prefix) {
  await page.emulateMedia({ media: 'print' })
  await page.waitForTimeout(400)
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

async function shotEquipCloseup(page, slug) {
  await page.emulateMedia({ media: 'print' })
  await page.waitForTimeout(200)
  const el = await page.$('.classic-equip')
  if (!el) return null
  const path = out(`${slug}-equip-close.png`)
  await el.screenshot({ path, type: 'png' })
  await page.emulateMedia({ media: 'screen' })
  return path
}


function cropRegions(printPng, slug) {
  // Crop key regions from A4 raster for the audit report.
  try {
    execFileSync(
      'python3',
      [
        '-c',
        `
from PIL import Image
import sys, os
src, dest_prefix = sys.argv[1:3]
im = Image.open(src).convert('RGB')
w, h = im.size
regions = {
  'abilities': (0.02, 0.11, 0.30, 0.72),
  'skills': (0.12, 0.22, 0.34, 0.58),
  'combat': (0.28, 0.12, 0.68, 0.42),
  'attacks': (0.28, 0.40, 0.68, 0.62),
  'equip': (0.28, 0.55, 0.68, 0.95),
  'left-bottom': (0.02, 0.55, 0.32, 0.98),
  'traits': (0.66, 0.12, 0.98, 0.55),
}
os.makedirs(os.path.dirname(dest_prefix), exist_ok=True)
for name, (x0,y0,x1,y1) in regions.items():
  c = im.crop((int(w*x0), int(h*y0), int(w*x1), int(h*y1)))
  c = c.resize((c.width*2, c.height*2), Image.Resampling.LANCZOS)
  c.save(f'{dest_prefix}-{name}.png')
  print(f'{dest_prefix}-{name}.png')
`,
        printPng,
        out(`${slug}-crop`),
      ],
      { stdio: 'inherit' },
    )
  } catch (err) {
    console.error('crop failed', err)
  }
}

async function shotToolbar(page, slug) {
  const el = await page.$('.classic-print-toolbar')
  if (!el) return null
  const path = out(`${slug}-toolbar.png`)
  await el.screenshot({ path, type: 'png' })
  return path
}

async function captureChar(page, id, slug) {
  await openClassic(page, `/characters/${id}/classic`)
  const toolbar = await shotToolbar(page, slug)
  const equip = await shotEquipCloseup(page, slug)
  const { pdf, prints } = await shotPdfAndPages(page, slug)
  return { pdf, prints, equip, toolbar }
}

async function captureBlank(page) {
  await openClassic(page, '/classic/blank')
  const equip = await shotEquipCloseup(page, 'blank')
  const { pdf, prints } = await shotPdfAndPages(page, 'blank')
  return { pdf, prints, equip }
}

function sideBySide(left, right, dest, labelLeft, labelRight) {
  // Use ImageMagick if available, else ffmpeg montage via python PIL
  try {
    execFileSync(
      'python3',
      [
        '-c',
        `
from PIL import Image, ImageDraw, ImageFont
import sys
left, right, dest, la, ra = sys.argv[1:6]
a = Image.open(left).convert('RGB')
b = Image.open(right).convert('RGB')
h = max(a.height, b.height)
# scale to same height
def fit(im, h):
  w = int(im.width * h / im.height)
  return im.resize((w, h), Image.Resampling.LANCZOS)
a = fit(a, h)
b = fit(b, h)
gap = 24
bar = 36
out = Image.new('RGB', (a.width + b.width + gap, h + bar), (255,255,255))
out.paste(a, (0, bar))
out.paste(b, (a.width + gap, bar))
d = ImageDraw.Draw(out)
d.text((8, 10), la, fill=(0,0,0))
d.text((a.width + gap + 8, 10), ra, fill=(0,0,0))
out.save(dest, quality=92)
print(dest)
`,
        left,
        right,
        dest,
        labelLeft,
        labelRight,
      ],
      { stdio: 'inherit' },
    )
  } catch (err) {
    console.error('side-by-side failed', err)
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--font-render-hinting=none'],
  })
  const page = await browser.newPage()
  await login(page)

  const report = { base: BASE, tag: TAG, at: new Date().toISOString(), shots: {} }
  report.shots.darrack = await captureChar(page, DARRACK, 'darrack')
  report.shots.torbin = await captureChar(page, TORBIN, 'torbin')
  report.shots.sorcerer = await captureChar(page, SORC, 'sorcerer20')
  report.shots.blank = await captureBlank(page)

  // Toolbar 2014/2024 switch (must match main; do not regress FIX-01).
  await openClassic(page, `/characters/${DARRACK}/classic`)
  const switchEl = await page.$('.classic-toolbar-segmented[aria-label="Макет классического листа"]')
  if (!switchEl) throw new Error('layout SegmentedControl missing — 2014/2024 toolbar regress')
  const years = await page.$$eval(
    '.classic-toolbar-segmented[aria-label="Макет классического листа"] .ui-segmented__item',
    (btns) => btns.map((b) => (b.textContent || '').trim()),
  )
  if (!years.includes('2014') || !years.includes('2024')) {
    throw new Error(`layout switch years=${JSON.stringify(years)}`)
  }
  report.shots.toolbar = await shotToolbar(page, 'toolbar-switch')

  // Switch to 2024 via toolbar (URL ?layout= is blank-only).
  await page.click(
    '.classic-toolbar-segmented[aria-label="Макет классического листа"] .ui-segmented__item:has-text("2024")',
  )
  await page.waitForSelector('.classic-lss', { timeout: 20_000 })
  await page.waitForTimeout(600)
  const { pdf: pdf2024, prints: prints2024 } = await shotPdfAndPages(page, 'darrack-2024')
  report.shots.darrack2024 = { pdf: pdf2024, prints: prints2024 }
  await page.click(
    '.classic-toolbar-segmented[aria-label="Макет классического листа"] .ui-segmented__item:has-text("2014")',
  )
  await page.waitForSelector('.classic-col--combat', { timeout: 20_000 })

  // ——— Settings panel + typography / color / notes ———
  await openClassic(page, `/characters/${TORBIN}/classic`)
  await page.click('.classic-edit-toggle')
  await page.waitForSelector('.classic-print-typo', { timeout: 10_000 })
  const typoBar = await page.$('.classic-print-typo')
  if (typoBar) {
    await typoBar.screenshot({ path: out('settings-panel.png'), type: 'png' })
  }
  report.shots.settingsPanel = out('settings-panel.png')

  await page.click('.classic-print-typo button:has-text("Сбросить настройки текста")')
  await page.waitForTimeout(800)
  await page.selectOption('.classic-print-typo .classic-print-typo__field:has-text("Гарнитура") select', 'serif')
  await page.waitForTimeout(600)
  await page.waitForFunction(
    () => document.querySelector('.classic-print-page')?.getAttribute('data-classic-font') === 'serif',
  )
  let nameFf = await page.$eval('.classic-name .classic-static', (el) => getComputedStyle(el).fontFamily)
  console.log('serif name font', nameFf)
  await page.locator('.classic-name--banner, .classic-name').first().screenshot({
    path: out('settings-name-serif.png'),
    type: 'png',
  })

  await page.selectOption('.classic-print-typo .classic-print-typo__field:has-text("Гарнитура") select', 'sans')
  await page.waitForFunction(
    () => document.querySelector('.classic-print-page')?.getAttribute('data-classic-font') === 'sans',
  )
  await page.waitForTimeout(400)
  nameFf = await page.$eval('.classic-name .classic-static', (el) => getComputedStyle(el).fontFamily)
  console.log('sans name font', nameFf)
  await page.locator('.classic-name--banner, .classic-name').first().screenshot({
    path: out('settings-name-sans.png'),
    type: 'png',
  })
  const { prints: torbinSans } = await shotPdfAndPages(page, 'settings-torbin-sans')
  report.shots.torbinSans = torbinSans

  // Handwritten name (long) via ToggleChip
  await page.click('.classic-print-typo .ui-toggle-chip:has-text("Имя рукописным")')
  await page.waitForFunction(
    () => document.querySelector('.classic-print-page')?.getAttribute('data-classic-name-script') === '1',
  )
  await page.waitForTimeout(500)
  nameFf = await page.$eval('.classic-name .classic-static', (el) => getComputedStyle(el).fontFamily)
  console.log('script long font', nameFf)
  await page.locator('.classic-name--banner, .classic-name').first().screenshot({
    path: out('settings-name-script-long.png'),
    type: 'png',
  })

  // Short name script via Darrack
  await openClassic(page, `/characters/${DARRACK}/classic`)
  const active2024 = await page
    .locator(
      '.classic-toolbar-segmented[aria-label="Макет классического листа"] .ui-segmented__item.is-on:has-text("2024")',
    )
    .count()
  if (active2024) {
    await page.click(
      '.classic-toolbar-segmented[aria-label="Макет классического листа"] .ui-segmented__item:has-text("2014")',
    )
    await page.waitForSelector('.classic-name', { timeout: 20_000 })
  }
  await page.click('.classic-edit-toggle')
  await page.waitForSelector('.classic-print-typo')
  await page.click('.classic-print-typo button:has-text("Сбросить настройки текста")')
  await page.waitForTimeout(600)
  await page.click('.classic-print-typo .ui-toggle-chip:has-text("Имя рукописным")')
  await page.waitForFunction(
    () => document.querySelector('.classic-print-page')?.getAttribute('data-classic-name-script') === '1',
  )
  await page.waitForSelector('.classic-name .classic-static', { timeout: 15_000 })
  await page.waitForTimeout(400)
  await page.locator('.classic-name').first().screenshot({
    path: out('settings-name-script-short.png'),
    type: 'png',
  })

  await page.click('.classic-toolbar-segmented[aria-label="Цвет печати"] .ui-segmented__item:has-text("Цвет")')
  await page.waitForTimeout(500)
  const { prints: colorPrints } = await shotPdfAndPages(page, 'settings-color')
  report.shots.color = colorPrints

  await page.click(
    '.classic-toolbar-segmented[aria-label="Цвет печати"] .ui-segmented__item:has-text("Чёрно-белая")',
  )
  await page.waitForTimeout(400)
  const { prints: bwPrints } = await shotPdfAndPages(page, 'settings-bw')
  report.shots.bw = bwPrints

  const pencilChip = page.locator('.classic-toolbar-chip:has-text("Линии под карандаш")')
  if (await pencilChip.count()) {
    const on = await pencilChip.getAttribute('aria-checked')
    if (on === 'true') await pencilChip.click()
    await page.waitForTimeout(300)
    await shotToolbar(page, 'settings-pencil-off')
    await pencilChip.click()
    await page.waitForTimeout(300)
    await shotToolbar(page, 'settings-pencil-on')
  }
  for (let i = 0; i < 2; i++) {
    await page.click('.classic-toolbar-stepper button[aria-label="Больше страниц заметок"]')
    await page.waitForTimeout(200)
  }
  const { pdf: notesPdf, prints: notesPrints } = await shotPdfAndPages(page, 'settings-notes2')
  report.shots.notes2 = { pdf: notesPdf, prints: notesPrints }
  if (notesPrints.length < 2) {
    console.warn('expected ≥2 PDF pages with 2 extra note pages, got', notesPrints.length)
  }

  await page.click(
    '.classic-toolbar-segmented[aria-label="Макет классического листа"] .ui-segmented__item:has-text("2024")',
  )
  await page.waitForSelector('.classic-lss', { timeout: 20_000 })
  await page.waitForTimeout(500)
  const { prints: lssSettings } = await shotPdfAndPages(page, 'settings-2024')
  report.shots.settings2024 = lssSettings

  // Large crops from PDF pages for audit
  for (const slug of ['darrack', 'blank', 'torbin']) {
    const p1 = join(ART, `${TAG}${slug}-print-1.png`)
    if (existsSync(p1)) cropRegions(p1, slug)
  }
  const spellPage = join(ART, `${TAG}sorcerer20-print-3.png`)
  if (existsSync(spellPage)) {
    try {
      execFileSync(
        'python3',
        [
          '-c',
          `
from PIL import Image
import sys
im = Image.open(sys.argv[1]).convert('RGB')
w, h = im.size
im.save(sys.argv[2])
c = im.crop((int(w*0.05), int(h*0.28), int(w*0.95), int(h*0.92)))
c = c.resize((c.width*2, c.height*2), Image.Resampling.LANCZOS)
c.save(sys.argv[3])
`,
          spellPage,
          out('sorcerer20-spells-page.png'),
          out('sorcerer20-crop-spells.png'),
        ],
        { stdio: 'inherit' },
      )
    } catch (err) {
      console.error('spell crop failed', err)
    }
  }

  // Side-by-side with official
  const pairs = [
    ['darrack-print-1.png', 'official-2014-1.png', 'compare-darrack-p1.png', 'Dvarf 2014', 'WotC 2014'],
    ['sorcerer20-print-3.png', 'official-2014-3.png', 'compare-spells.png', 'Dvarf spells', 'WotC spells'],
    ['blank-print-1.png', 'official-2014-1.png', 'compare-blank-p1.png', 'Dvarf blank', 'WotC 2014'],
  ]
  for (const [ours, official, dest, la, ra] of pairs) {
    const left = join(ART, `${TAG}${ours}`)
    const right = join(ART, official)
    if (existsSync(left) && existsSync(right)) {
      sideBySide(left, right, join(ART, `${TAG}${dest}`), la, ra)
    }
  }

  const files = readdirSync(ART)
    .filter((f) => (f.startsWith(TAG) || f.startsWith('official-')) && (f.endsWith('.png') || f.endsWith('.pdf')))
    .sort()
  const hashes = {}
  const seen = new Map()
  const dupes = []
  for (const f of files) {
    const h = md5(join(ART, f))
    hashes[f] = h
    // Skip intentional near-duplicates from settings matrix / per-char toolbars.
    if (/-(darrack|torbin|sorcerer20)-toolbar\.png$/.test(f)) continue
    if (/^after-settings-(bw|notes2|2024)-print-/.test(f)) continue
    if (seen.has(h)) dupes.push([f, seen.get(h)])
    else seen.set(h, f)
  }
  report.md5 = hashes
  report.dupes = dupes
  writeFileSync(join(ART, 'md5s.json'), JSON.stringify(hashes, null, 2))
  writeFileSync(out('report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ tag: TAG, files: files.length, dupes: dupes.length }, null, 2))
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
