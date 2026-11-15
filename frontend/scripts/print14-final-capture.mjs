/**
 * PRINT-14 final gallery: every print page for blank/Torbin/Darrack × 2014/2024,
 * plus pencil-on and explicit B&W variants. No UI changes — capture only.
 */
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  rmSync,
  copyFileSync,
  renameSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts/print14/final'
const BASE = process.env.PRINT14_BASE || 'http://127.0.0.1:5173'
const DARRACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const TORBIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'

mkdirSync(ART, { recursive: true })
const CLEAR = process.env.PRINT14_CLEAR === '1'
if (CLEAR) {
  for (const f of readdirSync(ART)) {
    if (f.endsWith('.png') || f.endsWith('.pdf') || f.endsWith('.json') || f.endsWith('.md')) {
      rmSync(join(ART, f), { force: true })
    }
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

async function openClassic(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForSelector('.classic-sheet, .classic-stack', { timeout: 30_000 })
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
}

async function switchLayout(page, year) {
  const seg = page.locator(
    `.classic-toolbar-segmented[aria-label="Макет классического листа"], .classic-toolbar-segmented[aria-label="Макет пустого бланка"]`,
  )
  await seg.locator(`.ui-segmented__item:has-text("${year}")`).click()
  await page.waitForTimeout(700)
}

async function setPencil(page, on) {
  const chip = page.locator('.classic-toolbar-chip[aria-label*="Линии под карандаш"]')
  if ((await chip.count()) === 0) return { ok: false, reason: 'no pencil control (blank page)' }
  const label = await chip.getAttribute('aria-label')
  const isOn = /включены/i.test(label || '')
  if (isOn !== on) {
    await chip.click()
    await page.waitForTimeout(900)
  }
  const after = await chip.getAttribute('aria-label')
  return { ok: true, label: after }
}

async function setColor(page, mode) {
  // mode: 'bw' | 'color'
  const control = page.locator('.classic-toolbar-segmented[aria-label="Цвет печати"]')
  if ((await control.count()) === 0) return { ok: false, reason: 'no color control (blank page)' }
  const label = mode === 'bw' ? 'Чёрно-белая' : 'Цвет'
  await control.locator(`.ui-segmented__item:has-text("${label}")`).click()
  await page.waitForTimeout(900)
  return { ok: true, mode }
}

async function pageMeta(page) {
  return page.evaluate(() => {
    const root = document.querySelector('.classic-print-page')
    return {
      color: root?.getAttribute('data-classic-color') || null,
      sheets: [...document.querySelectorAll('.classic-sheet')].map((el, i) => ({
        n: i + 1,
        label: el.getAttribute('aria-label') || el.className,
        hasWordmark: Boolean(el.querySelector('.classic-brand__wordmark')),
        brandStrong: el.querySelector('.classic-brand strong')?.textContent || null,
        brandText: (el.querySelector('.classic-brand')?.innerText || '').replace(/\s+/g, ' ').trim(),
      })),
    }
  })
}

async function captureSheet(page, { slug, path, year, pencil, color }) {
  await openClassic(page, path)
  if (year) await switchLayout(page, year)
  const settings = { pencil: null, color: null }
  if (pencil != null) settings.pencil = await setPencil(page, pencil)
  if (color != null) settings.color = await setColor(page, color)
  await page.waitForTimeout(400)
  const meta = await pageMeta(page)

  await page.emulateMedia({ media: 'print' })
  await page.waitForTimeout(350)
  await page.addStyleTag({
    content: `
      .classic-fit-scaled { transform: none !important; width: auto !important; }
      .classic-fit-spacer { height: auto !important; }
      .classic-fit-viewport, .classic-fit-spacer { overflow: visible !important; }
      .classic-stack { padding: 0 !important; gap: 0 !important; }
      .no-print { display: none !important; }
    `,
  })

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

  const pages = []
  for (let i = 0; i < rawPages.length; i++) {
    const n = i + 1
    const destName = `${slug}-p${n}.png`
    const dest = join(ART, destName)
    const src = join(ART, rawPages[i])
    let ok = false
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        try {
          renameSync(src, dest)
        } catch {
          copyFileSync(src, dest)
          rmSync(src, { force: true })
        }
        ok = true
        break
      } catch (err) {
        if (attempt === 5) throw err
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250 * (attempt + 1))
      }
    }
    if (!ok) throw new Error(`failed to place ${destName}`)
    pages.push({
      file: destName,
      md5: md5(dest),
      label: meta.sheets[i]?.label || `page ${n}`,
      hasWordmark: meta.sheets[i]?.hasWordmark ?? null,
      brandStrong: meta.sheets[i]?.brandStrong ?? null,
    })
  }

  await page.emulateMedia({ media: 'screen' })
  return { slug, settings, colorAttr: meta.color, pageCount: pages.length, pages }
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--font-render-hinting=none'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await login(page)

  const jobs = [
    { slug: '2014-blank', path: '/classic/blank?layout=2014', year: null },
    { slug: '2014-torbin', path: `/characters/${TORBIN}/classic`, year: '2014' },
    { slug: '2014-darrack', path: `/characters/${DARRACK}/classic`, year: '2014' },
    { slug: '2024-blank', path: '/classic/blank?layout=2024', year: null },
    { slug: '2024-torbin', path: `/characters/${TORBIN}/classic`, year: '2024' },
    { slug: '2024-darrack', path: `/characters/${DARRACK}/classic`, year: '2024' },
    // variants
    {
      slug: '2014-darrack-pencil',
      path: `/characters/${DARRACK}/classic`,
      year: '2014',
      pencil: true,
    },
    {
      slug: '2014-torbin-bw',
      path: `/characters/${TORBIN}/classic`,
      year: '2014',
      color: 'bw',
    },
  ]

  const report = {
    at: new Date().toISOString(),
    brandNote:
      '2014 стр.1–3: столбик КриD20 (ClassicBrandWordmark). Доп. страницы 2014 (напарники/заметки/карточки заклинаний) и весь 2024: плашка «D&D» — код не меняли.',
    sheets: [],
  }

  for (const job of jobs) {
    const existing = readdirSync(ART).filter((f) => f.startsWith(`${job.slug}-p`) && f.endsWith('.png'))
    if (existing.length > 0 && process.env.PRINT14_FORCE !== '1') {
      console.log('skip existing', job.slug, existing.length, 'pages')
      const pages = existing
        .sort((a, b) => Number(a.match(/-p(\d+)/)?.[1] || 0) - Number(b.match(/-p(\d+)/)?.[1] || 0))
        .map((file, i) => ({
          file,
          md5: md5(join(ART, file)),
          label: `existing p${i + 1}`,
          hasWordmark: null,
          brandStrong: null,
        }))
      report.sheets.push({
        slug: job.slug,
        settings: { skipped: true },
        colorAttr: null,
        pageCount: pages.length,
        pages,
      })
      continue
    }
    console.log('capturing', job.slug)
    const result = await captureSheet(page, job)
    report.sheets.push(result)
  }

  await browser.close()

  const md5s = {}
  for (const sheet of report.sheets) {
    for (const p of sheet.pages) md5s[p.file] = p.md5
  }
  writeFileSync(join(ART, 'md5s.json'), JSON.stringify(md5s, null, 2))
  writeFileSync(join(ART, 'report.json'), JSON.stringify(report, null, 2))

  // Markdown report
  const lines = [
    '# PRINT-14 final gallery',
    '',
    report.brandNote,
    '',
    '## Страницы по листам',
    '',
  ]
  for (const sheet of report.sheets) {
    lines.push(`### \`${sheet.slug}\` (${sheet.pageCount} стр.)`)
    lines.push('')
    for (const p of sheet.pages) {
      const brand = p.hasWordmark
        ? 'столбик КриD20'
        : p.brandStrong
          ? `«${p.brandStrong}»`
          : 'без плашки'
      lines.push(`- p${p.file.match(/-p(\d+)\.png$/)?.[1]}: ${p.label} · ${brand} · \`${p.md5}\``)
    }
    lines.push('')
  }
  lines.push('## Таблица кадр / md5')
  lines.push('')
  lines.push('| Кадр | md5 |')
  lines.push('|---|---|')
  for (const [file, hash] of Object.entries(md5s).sort()) {
    lines.push(`| ${file} | \`${hash}\` |`)
  }
  lines.push('')
  writeFileSync(join(ART, 'REPORT.md'), lines.join('\n'))
  console.log(JSON.stringify({ sheets: report.sheets.map((s) => ({ slug: s.slug, n: s.pageCount })), files: Object.keys(md5s).length }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
