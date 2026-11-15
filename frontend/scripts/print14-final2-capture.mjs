/**
 * PRINT-14 pass 11 gallery → artifacts/print14/final2/
 * Full set + explicit Color/B&W for Darrack 2014 and 2024.
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

const ART = process.env.PRINT14_ART || '/opt/cursor/artifacts/print14/final2'
const BASE = process.env.PRINT14_BASE || 'http://127.0.0.1:5173'
const DARRACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const TORBIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'

mkdirSync(ART, { recursive: true })
for (const f of readdirSync(ART)) {
  if (f.endsWith('.png') || f.endsWith('.pdf') || f.endsWith('.json') || f.endsWith('.md')) {
    rmSync(join(ART, f), { force: true })
  }
}

function md5(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

async function loginFixed(page) {
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
  // Wait for spell catalog enrichment on cards (async).
  await page.waitForTimeout(1200)
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
  await page.waitForTimeout(900)
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
  const control = page.locator('.classic-toolbar-segmented[aria-label="Цвет печати"]')
  if ((await control.count()) === 0) return { ok: false, reason: 'no color control (blank page)' }
  const label = mode === 'bw' ? 'Чёрно-белая' : 'Цвет'
  await control.locator(`.ui-segmented__item:has-text("${label}")`).click()
  await page.waitForTimeout(900)
  const attr = await page.evaluate(
    () => document.querySelector('.classic-print-page')?.getAttribute('data-classic-color') || null,
  )
  return { ok: true, mode, attr }
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
        brandStrong: el.querySelector('.classic-brand strong')?.getAttribute('aria-label')
          || el.querySelector('.classic-brand strong')?.textContent
          || null,
        brandText: (el.querySelector('.classic-brand')?.innerText || '').replace(/\s+/g, ' ').trim(),
        serviceCaption: (() => {
          const t = el.innerText || ''
          if (/НЕТ В ОФИЦИАЛЬНОМ|НЕ СЕКЦИИ БЛАНКА|СВОБОДНЫЕ БЛОКИ ИЗ ЦИФРОВОГО/i.test(t)) return true
          return false
        })(),
      })),
    }
  })
}

async function captureSheet(page, { slug, path, year, pencil, color }) {
  await openClassic(page, path)
  if (year) await switchLayout(page, year)
  const settings = { pencil: null, color: null }
  // Always turn pencil off unless requested — avoids skewed page counts from prior PATCH.
  if (pencil != null) settings.pencil = await setPencil(page, pencil)
  else settings.pencil = await setPencil(page, false)
  // Always set color explicitly — prior jobs PATCH the character and stick.
  settings.color = await setColor(page, color != null ? color : 'bw')
  await page.waitForTimeout(500)
  const meta = await pageMeta(page)

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
      serviceCaption: meta.sheets[i]?.serviceCaption ?? null,
    })
  }

  await page.emulateMedia({ media: 'screen' })
  return { slug, settings, colorAttr: meta.color, pageCount: pages.length, pages }
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--font-render-hinting=none'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await loginFixed(page)

  const jobs = [
    { slug: '2014-blank', path: '/classic/blank?layout=2014', year: null },
    { slug: '2014-torbin', path: `/characters/${TORBIN}/classic`, year: '2014' },
    { slug: '2014-darrack', path: `/characters/${DARRACK}/classic`, year: '2014' },
    { slug: '2024-blank', path: '/classic/blank?layout=2024', year: null },
    { slug: '2024-torbin', path: `/characters/${TORBIN}/classic`, year: '2024' },
    { slug: '2024-darrack', path: `/characters/${DARRACK}/classic`, year: '2024' },
    {
      slug: '2014-darrack-pencil',
      path: `/characters/${DARRACK}/classic`,
      year: '2014',
      pencil: true,
    },
    {
      slug: '2014-darrack-bw',
      path: `/characters/${DARRACK}/classic`,
      year: '2014',
      color: 'bw',
    },
    {
      slug: '2014-darrack-color',
      path: `/characters/${DARRACK}/classic`,
      year: '2014',
      color: 'color',
    },
    {
      slug: '2024-darrack-bw',
      path: `/characters/${DARRACK}/classic`,
      year: '2024',
      color: 'bw',
    },
    {
      slug: '2024-darrack-color',
      path: `/characters/${DARRACK}/classic`,
      year: '2024',
      color: 'color',
    },
  ]

  const report = {
    at: new Date().toISOString(),
    colorModeNote:
      'Переключатель «Цвет печати»: ЧБ — белая бумага (#fff), серые колонки (#e8e8e8), нейтральные чернила; Цвет — кремовая бумага (--c-paper #f3ebe0), тёплый tint панелей (--c-paper-tint), чуть более тёплые чернила. На печать уходит printBackground, поэтому отличие видно и в PDF/PNG.',
    brandNote:
      'Везде столбик КриD20 (ClassicBrandWordmark) + подпись 5E · год. Служебные подписи сняты. Порядок: бланк → заклинания/карточки → Напарники/Заметки (один раз, если есть/включены).',
    sheets: [],
  }

  for (const job of jobs) {
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

  const lines = [
    '# PRINT-14 final2 gallery (pass 11)',
    '',
    report.brandNote,
    '',
    report.colorModeNote,
    '',
    '## Страницы по листам',
    '',
  ]
  for (const sheet of report.sheets) {
    lines.push(`### \`${sheet.slug}\` (${sheet.pageCount} стр., color=${sheet.colorAttr})`)
    lines.push('')
    for (const p of sheet.pages) {
      const brand = p.hasWordmark
        ? 'столбик КриD20'
        : p.brandStrong
          ? `«${p.brandStrong}»`
          : 'без плашки'
      const svc = p.serviceCaption ? ' · ⚠ служебная подпись' : ''
      lines.push(
        `- p${p.file.match(/-p(\d+)\.png$/)?.[1]}: ${p.label} · ${brand}${svc} · \`${p.md5}\``,
      )
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

  // Color vs BW sanity
  const pairs = [
    ['2014-darrack-bw-p1.png', '2014-darrack-color-p1.png'],
    ['2024-darrack-bw-p1.png', '2024-darrack-color-p1.png'],
  ]
  lines.push('## ЧБ vs Цвет (p1 md5)')
  lines.push('')
  for (const [bw, color] of pairs) {
    const same = md5s[bw] && md5s[color] && md5s[bw] === md5s[color]
    lines.push(
      `- ${bw} vs ${color}: ${same ? '⚠ одинаковы' : 'различаются'} (\`${md5s[bw]}\` / \`${md5s[color]}\`)`,
    )
  }
  lines.push('')

  writeFileSync(join(ART, 'REPORT.md'), lines.join('\n'))
  console.log(
    JSON.stringify(
      {
        sheets: report.sheets.map((s) => ({
          slug: s.slug,
          n: s.pageCount,
          color: s.colorAttr,
        })),
        files: Object.keys(md5s).length,
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
