/**
 * PRINT-15: before/after frames for classic 2024 blank redesign.
 * Writes to /opt/cursor/artifacts/print15/ and copies into repo artifacts/print15/.
 *
 * Env:
 *   PRINT15_BEFORE_BASE — vite on main worktree (default http://127.0.0.1:5174)
 *   PRINT15_AFTER_BASE  — vite on branch (default http://127.0.0.1:5173)
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts/print15'
const REPO_ART = join(process.cwd(), '..', 'artifacts', 'print15')
const BEFORE = process.env.PRINT15_BEFORE_BASE || 'http://127.0.0.1:5174'
const AFTER = process.env.PRINT15_AFTER_BASE || 'http://127.0.0.1:5173'

mkdirSync(ART, { recursive: true })
mkdirSync(join(ART, 'before'), { recursive: true })
mkdirSync(join(ART, 'after'), { recursive: true })
mkdirSync(REPO_ART, { recursive: true })

function md5(path) {
  if (!existsSync(path)) return null
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

async function openPreview(page, base, { fixture, layout } = {}) {
  await page.goto(`${base}/dev/classic-sheet-preview`, {
    waitUntil: 'networkidle',
    timeout: 90_000,
  })
  await page.waitForSelector('.classic-sheet, .classic-stack', { timeout: 30_000 })
  if (fixture === 'print15') {
    const btn = page.locator('[data-testid="classic-fixture-print15"]')
    if (await btn.count()) await btn.click()
  } else if (fixture === 'torin') {
    await page.getByRole('button', { name: 'Торин' }).click()
  }
  if (layout) {
    await page
      .locator('.classic-layout-switch[aria-label="Макет классического листа"]')
      .getByRole('button', { name: layout, exact: true })
      .click()
    if (layout === '2024') await page.waitForSelector('.classic-lss', { timeout: 20_000 })
    else await page.waitForSelector('.classic-col--combat, .classic-abilities-stack', { timeout: 20_000 })
  }
  await page.waitForTimeout(600)
}

async function openBlank(page, base, layout) {
  const q = layout === '2024' ? '?layout=2024' : ''
  await page.goto(`${base}/classic/blank${q}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForSelector('.classic-sheet', { timeout: 30_000 })
  await page.waitForTimeout(500)
}

async function setColor(page, mode) {
  // Preview page has no color toggle — set data attribute for color mode shots.
  await page.evaluate((m) => {
    document.querySelector('.classic-print-page')?.setAttribute('data-classic-color', m)
  }, mode)
  await page.waitForTimeout(200)
}

async function shotScreen(page, dest, width = 1280) {
  await page.setViewportSize({ width, height: 900 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: dest, fullPage: false })
}

async function shotA4Pages(page, destPrefix, { color = 'bw', maxPages = 4 } = {}) {
  await setColor(page, color)
  await page.emulateMedia({ media: 'print' })
  await page.waitForTimeout(350)
  await page.addStyleTag({
    content: `
      .classic-fit-scaled { transform: none !important; width: auto !important; }
      .classic-fit-spacer { height: auto !important; }
      .classic-fit-viewport, .classic-fit-spacer { overflow: visible !important; }
      .classic-stack { padding: 0 !important; gap: 0 !important; }
      .classic-print-toolbar, .no-print { display: none !important; }
    `,
  })
  const pdfPath = `${destPrefix}-a4.pdf`
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })
  execFileSync('pdftoppm', [
    '-png',
    '-r',
    '150',
    '-f',
    '1',
    '-l',
    String(maxPages),
    pdfPath,
    `${destPrefix}-print`,
  ])
  await page.emulateMedia({ media: 'screen' })
  return pdfPath
}

function mirrorToRepo(relPath) {
  const src = join(ART, relPath)
  if (!existsSync(src)) return
  const dest = join(REPO_ART, relPath)
  mkdirSync(join(dest, '..'), { recursive: true })
  copyFileSync(src, dest)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const report = { frames: [], md5: {} }

  // ——— BEFORE (main) ———
  await openPreview(page, BEFORE, { fixture: 'torin', layout: '2024' })
  await shotScreen(page, join(ART, 'before/1280-hero-2024.png'))
  report.frames.push('before/1280-hero-2024.png')

  await shotA4Pages(page, join(ART, 'before/hero-2024-bw'), { color: 'bw' })
  report.frames.push('before/hero-2024-bw-print-1.png')

  await openPreview(page, BEFORE, { fixture: 'torin', layout: '2024' })
  await shotA4Pages(page, join(ART, 'before/hero-2024-color'), { color: 'color' })
  report.frames.push('before/hero-2024-color-print-1.png')

  await openBlank(page, BEFORE, '2024')
  await shotA4Pages(page, join(ART, 'before/blank-2024-bw'), { color: 'bw' })
  report.frames.push('before/blank-2024-bw-print-1.png')

  await openPreview(page, BEFORE, { fixture: 'torin', layout: '2014' })
  await shotA4Pages(page, join(ART, 'before/hero-2014-bw'), { color: 'bw', maxPages: 1 })
  report.frames.push('before/hero-2014-bw-print-1.png')

  // ——— AFTER (branch) ———
  await openPreview(page, AFTER, { fixture: 'print15', layout: '2024' })
  await shotScreen(page, join(ART, 'after/1280-hero-2024.png'))
  report.frames.push('after/1280-hero-2024.png')

  await shotA4Pages(page, join(ART, 'after/hero-2024-bw'), { color: 'bw' })
  report.frames.push('after/hero-2024-bw-print-1.png')

  await openPreview(page, AFTER, { fixture: 'print15', layout: '2024' })
  await shotA4Pages(page, join(ART, 'after/hero-2024-color'), { color: 'color' })
  report.frames.push('after/hero-2024-color-print-1.png')

  await openBlank(page, AFTER, '2024')
  await shotA4Pages(page, join(ART, 'after/blank-2024-bw'), { color: 'bw' })
  report.frames.push('after/blank-2024-bw-print-1.png')

  await openBlank(page, AFTER, '2024')
  await shotA4Pages(page, join(ART, 'after/blank-2024-color'), { color: 'color', maxPages: 1 })
  report.frames.push('after/blank-2024-color-print-1.png')

  await openPreview(page, AFTER, { fixture: 'torin', layout: '2014' })
  await shotA4Pages(page, join(ART, 'after/hero-2014-bw'), { color: 'bw', maxPages: 1 })
  report.frames.push('after/hero-2014-bw-print-1.png')

  // Extra: weapons + traits crop from after A4 p1
  const p1 = join(ART, 'after/hero-2024-bw-print-1.png')
  if (existsSync(p1)) {
    const cropWeapons = join(ART, 'after/crop-weapons.png')
    const cropTraits = join(ART, 'after/crop-traits.png')
    const cropHeader = join(ART, 'after/crop-header.png')
    execFileSync(
      'python3',
      [
        '-c',
        `
from PIL import Image
import sys
im = Image.open(sys.argv[1]).convert('RGB')
w, h = im.size
def crop(box, dest):
    c = im.crop((int(w*box[0]), int(h*box[1]), int(w*box[2]), int(h*box[3])))
    c = c.resize((c.width*2, c.height*2), Image.Resampling.LANCZOS)
    c.save(dest)
crop((0.02, 0.02, 0.98, 0.28), sys.argv[2])
crop((0.38, 0.32, 0.98, 0.55), sys.argv[3])
crop((0.38, 0.52, 0.98, 0.82), sys.argv[4])
`,
        p1,
        cropHeader,
        cropWeapons,
        cropTraits,
      ],
      { stdio: 'inherit' },
    )
    report.frames.push('after/crop-header.png', 'after/crop-weapons.png', 'after/crop-traits.png')
  }

  // Page count check (hero 2024 should not spill endlessly)
  const pdf = join(ART, 'after/hero-2024-bw-a4.pdf')
  if (existsSync(pdf)) {
    const info = execFileSync('pdfinfo', [pdf], { encoding: 'utf8' })
    const m = /Pages:\s+(\d+)/.exec(info)
    report.pages = m ? Number(m[1]) : null
  }

  // 2014 regression: before/after md5 of page 1
  const b2014 = join(ART, 'before/hero-2014-bw-print-1.png')
  const a2014 = join(ART, 'after/hero-2014-bw-print-1.png')
  report.md5['before/hero-2014-bw-print-1.png'] = md5(b2014)
  report.md5['after/hero-2014-bw-print-1.png'] = md5(a2014)
  report.same2014 = report.md5['before/hero-2014-bw-print-1.png'] === report.md5['after/hero-2014-bw-print-1.png']

  for (const f of readdirSync(ART, { recursive: true })) {
    const full = join(ART, f)
    if (!f.endsWith('.png') && !f.endsWith('.pdf')) continue
    report.md5[f] = md5(full)
    mirrorToRepo(f)
  }

  writeFileSync(join(ART, 'md5s.json'), JSON.stringify(report, null, 2))
  copyFileSync(join(ART, 'md5s.json'), join(REPO_ART, 'md5s.json'))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
