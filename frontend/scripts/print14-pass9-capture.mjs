/**
 * PRINT-14 pass 9: empty blank 2014/2024 (no filled defaults); 2014 skills left-align.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts/print14'
const PASS9 = join(ART, 'pass9-after')
const BASE = process.env.PRINT14_BASE || 'http://127.0.0.1:5173'
const TAG = 'after-'
const TORBIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'

mkdirSync(ART, { recursive: true })
mkdirSync(PASS9, { recursive: true })

const out = (name) => join(ART, `${TAG}${name}`)
const pass9 = (name) => join(PASS9, name)

function md5(path) {
  if (!existsSync(path)) return null
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

function keep(src, destName) {
  if (!existsSync(src)) return null
  const dest = pass9(destName)
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

function cropSkills2014(printPng, destBase) {
  execFileSync(
    'python3',
    [
      '-c',
      `
from PIL import Image
import sys
im = Image.open(sys.argv[1]).convert('RGB')
w, h = im.size
# Skills panel (left column) on 2014 page 1
box = (0.02, 0.28, 0.34, 0.72)
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

async function blankInkAudit(page) {
  return page.evaluate(() => {
    const sheet = document.querySelector('.classic-sheet')
    if (!sheet) return { error: 'no sheet' }
    const texts = []
    const walk = (el) => {
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = (node.textContent || '').trim()
          if (t) texts.push(t)
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = node.tagName
          if (tag === 'INPUT' || tag === 'TEXTAREA') {
            const v = (node.value || '').trim()
            if (v) texts.push(`[input]${v}`)
          } else {
            walk(node)
          }
        }
      }
    }
    walk(sheet)
    const bad = texts.filter((t) =>
      /^(ур\.\s*\d+|10|\+0|0|2|1к8)$/i.test(t) ||
      /^\[input\](ур\.\s*\d+|10|\+0|0|2|1к8)$/i.test(t),
    )
    return { sample: texts.slice(0, 40), bad }
  })
}

async function skillSpacingAudit(page) {
  return page.evaluate(() => {
    const names = [...document.querySelectorAll('.classic-panel--skills .classic-check__name')]
    return names.map((el) => {
      const text = el.textContent || ''
      const cs = getComputedStyle(el)
      return {
        text,
        hasDoubleSpace: /  /.test(text),
        wordSpacing: cs.wordSpacing,
        textAlign: cs.textAlign,
      }
    })
  })
}

async function main() {
  // Clear prior after- frames that this pass rewrites
  for (const f of readdirSync(ART)) {
    if (
      f.startsWith('after-blank-') ||
      f.startsWith('after-torbin-print') ||
      f === 'after-torbin-crop-skills.png' ||
      f.startsWith('after-blank-2024')
    ) {
      try {
        // keep other accepted frames
      } catch {}
    }
  }

  const browser = await chromium.launch({ headless: true, args: ['--font-render-hinting=none'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await login(page)
  const report = { at: new Date().toISOString(), checks: {} }

  // Blank 2014
  await openClassic(page, '/classic/blank?layout=2014')
  report.checks.blank2014Ink = await blankInkAudit(page)
  report.checks.blank2014Skills = await skillSpacingAudit(page)
  const { prints: blank2014 } = await shotPdfAndPages(page, 'blank')

  // Blank 2024
  await openClassic(page, '/classic/blank?layout=2024')
  report.checks.blank2024Ink = await blankInkAudit(page)
  const { prints: blank2024 } = await shotPdfAndPages(page, 'blank-2024')

  // Torbin 2014 skills crop
  await openClassic(page, `/characters/${TORBIN}/classic`)
  await switchLayout(page, '2014')
  report.checks.torbinSkills = await skillSpacingAudit(page)
  const { prints: t2014 } = await shotPdfAndPages(page, 'torbin')
  const torbinP1 = out('torbin-print-1.png')
  const skillsCrop = out('torbin-crop-skills.png')
  if (existsSync(torbinP1)) cropSkills2014(torbinP1, skillsCrop)

  await browser.close()

  const copies = [
    ['blank-print-1.png', 'after-blank-2014-print-1.png'],
    ['blank-2024-print-1.png', 'after-blank-2024-print-1.png'],
    ['torbin-print-1.png', 'after-torbin-2014-print-1.png'],
    ['torbin-crop-skills.png', 'after-torbin-crop-skills.png'],
  ]
  const md5s = {}
  for (const [src, dest] of copies) {
    const p = keep(out(src), dest)
    if (p) md5s[dest] = md5(p)
  }

  const blankBad =
    (report.checks.blank2014Ink?.bad || []).length > 0 ||
    (report.checks.blank2024Ink?.bad || []).length > 0
  const skillBad = (report.checks.torbinSkills || []).some(
    (s) => s.hasDoubleSpace || s.wordSpacing !== '0px' || s.textAlign !== 'left',
  )

  report.md5 = md5s
  report.shots = { blank2014, blank2024, torbin2014: t2014 }
  writeFileSync(pass9('md5s.json'), JSON.stringify(md5s, null, 2))
  writeFileSync(pass9('report.json'), JSON.stringify(report, null, 2))
  console.log(
    JSON.stringify(
      {
        fail: blankBad || skillBad,
        blankBad,
        skillBad,
        blank2014Bad: report.checks.blank2014Ink?.bad,
        blank2024Bad: report.checks.blank2024Ink?.bad,
        skillSample: (report.checks.torbinSkills || []).slice(0, 5),
        md5s,
      },
      null,
      2,
    ),
  )
  if (blankBad || skillBad) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
