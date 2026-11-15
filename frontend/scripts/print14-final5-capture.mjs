/**
 * PRINT-14 pass 14 — spell-card gallery → artifacts/print14/final5/
 * Captures Torbin/Darrack × 2014/2024; keeps every spell-card page frame.
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

const ART = process.env.PRINT14_ART || '/opt/cursor/artifacts/print14/final5'
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
  await page.emulateMedia({ media: 'screen' })
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForSelector('.classic-sheet, .classic-stack', { timeout: 30_000 })
  await page.waitForTimeout(1500)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
}

async function switchLayout(page, year) {
  await page.emulateMedia({ media: 'screen' })
  await page.waitForTimeout(200)
  const switched = await page.evaluate((y) => {
    const root = [...document.querySelectorAll('.classic-toolbar-segmented')].find((el) =>
      /Макет/.test(el.getAttribute('aria-label') || ''),
    )
    const btn = root && [...root.querySelectorAll('.ui-segmented__item')].find((b) => b.textContent?.trim() === y)
    if (!btn) return false
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return true
  }, year)
  if (!switched) throw new Error(`layout ${year} not found`)
  await page.waitForTimeout(1200)
}

/** Wait until spell-card pages finish packing (count stable + groups present). */
async function waitSpellCardPages(page) {
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll('.classic-page-spell-cards')
    if (cards.length === 0) return false
    const groups = document.querySelectorAll('.classic-spell-cards-group__title')
    return groups.length > 0
  }, { timeout: 30_000 })
  // Stabilize page count after catalog enrichment / chunking.
  let last = -1
  for (let i = 0; i < 10; i++) {
    const n = await page.locator('.classic-page-spell-cards').count()
    if (n === last && n > 0) break
    last = n
    await page.waitForTimeout(400)
  }
  await page.waitForTimeout(600)
}

async function setPencil(page, on) {
  const chip = page.locator('.classic-toolbar-chip[aria-label*="Линии под карандаш"]')
  if ((await chip.count()) === 0) return { ok: false }
  const label = await chip.getAttribute('aria-label')
  const isOn = /включены/i.test(label || '')
  if (isOn !== on) {
    await chip.click()
    await page.waitForTimeout(900)
  }
  return { ok: true }
}

async function setColor(page, mode) {
  const control = page.locator('.classic-toolbar-segmented[aria-label="Цвет печати"]')
  if ((await control.count()) === 0) return { ok: false }
  const label = mode === 'bw' ? 'Чёрно-белая' : 'Цвет'
  await control.locator(`.ui-segmented__item:has-text("${label}")`).click()
  await page.waitForTimeout(700)
  return { ok: true, mode }
}

async function pageMeta(page) {
  return page.evaluate(() => {
    const sheets = [...document.querySelectorAll('.classic-sheet')]
    return sheets.map((el, i) => {
      const label = el.getAttribute('aria-label') || el.className
      const isCards = /карточки заклинаний/i.test(label)
      const groups = [...el.querySelectorAll('.classic-spell-cards-group__title')].map(
        (h) => h.textContent?.trim() || '',
      )
      const cards = [...el.querySelectorAll('.classic-spell-card')].map((card) => {
        const name = card.querySelector('.classic-spell-card__title')?.textContent?.trim() || ''
        const school =
          [...card.querySelectorAll('.classic-spell-card__meta span')]
            .map((s) => s.textContent?.trim() || '')
            .find((t) => t && !/круг|заговор|\d+\/\d+/i.test(t)) || ''
        const facts = [...card.querySelectorAll('.classic-spell-card__facts div')].map(
          (d) => d.textContent?.replace(/\s+/g, ' ').trim() || '',
        )
        const body = (card.querySelector('.classic-spell-card__body')?.textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120)
        const englishBody = /[A-Za-z]{4,}/.test(body) && !/[А-Яа-яЁё]/.test(body)
        return { name, school, facts, bodyPreview: body, englishBody }
      })
      const sheetTop = el.getBoundingClientRect().top
      const sheetH = el.getBoundingClientRect().height
      const clipped = [...el.querySelectorAll('.classic-spell-card, .classic-spell-cards-group__title')].filter((node) => {
        const bottom = node.getBoundingClientRect().bottom - sheetTop
        return bottom > sheetH + 1
      }).map((node) => node.textContent?.trim()?.slice(0, 40) || node.className)
      return {
        n: i + 1,
        label,
        isCards,
        groups,
        cards,
        emptyFrames: el.querySelectorAll('.classic-spell-card--empty').length,
        sheetH: Math.round(sheetH),
        clipped,
      }
    })
  })
}

async function captureSheet(page, { slug, path, year }) {
  await openClassic(page, path)
  if (year) await switchLayout(page, year)
  await setPencil(page, false)
  await setColor(page, 'bw')
  await waitSpellCardPages(page)
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
    const sheetMeta = meta[i] || {}
    pages.push({
      file: destName,
      md5: md5(dest),
      label: sheetMeta.label || `page ${n}`,
      isCards: Boolean(sheetMeta.isCards),
      groups: sheetMeta.groups || [],
      cards: sheetMeta.cards || [],
      emptyFrames: sheetMeta.emptyFrames ?? 0,
      clipped: sheetMeta.clipped || [],
    })
  }

  await page.emulateMedia({ media: 'screen' })
  return { slug, pageCount: pages.length, pages, cardPages: pages.filter((p) => p.isCards) }
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--font-render-hinting=none'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await login(page)

  const jobs = [
    { slug: '2014-torbin', path: `/characters/${TORBIN}/classic`, year: '2014' },
    { slug: '2014-darrack', path: `/characters/${DARRACK}/classic`, year: '2014' },
    { slug: '2024-torbin', path: `/characters/${TORBIN}/classic`, year: '2024' },
    { slug: '2024-darrack', path: `/characters/${DARRACK}/classic`, year: '2024' },
  ]

  const report = {
    at: new Date().toISOString(),
    note:
      'Pass 14: Russian handbook translations for former EN-only spells; Чудотворство on cards in RU.',
    sheets: [],
  }

  for (const job of jobs) {
    console.log('capturing', job.slug)
    report.sheets.push(await captureSheet(page, job))
  }

  await browser.close()

  const md5s = {}
  const cardFiles = []
  for (const sheet of report.sheets) {
    for (const p of sheet.pages) {
      md5s[p.file] = p.md5
      if (p.isCards) cardFiles.push(p.file)
    }
  }
  writeFileSync(join(ART, 'md5s.json'), JSON.stringify(md5s, null, 2))
  writeFileSync(join(ART, 'report.json'), JSON.stringify(report, null, 2))

  const lines = [
    '# PRINT-14 final5 gallery (pass 14 — spell cards)',
    '',
    report.note,
    '',
    '## Кадры карточек',
    '',
  ]
  for (const sheet of report.sheets) {
    lines.push(`### \`${sheet.slug}\``)
    lines.push('')
    for (const p of sheet.cardPages) {
      lines.push(`- **${p.file}** \`${p.md5}\``)
      lines.push(`  - группы: ${p.groups.join(' · ') || '—'}`)
      for (const c of p.cards) {
        const effect = c.facts.find((f) => /^(Урон|Лечение|Хиты)\b/i.test(f)) || ''
        const warn = c.englishBody ? ' ⚠ EN body' : ''
        lines.push(
          `  - ${c.name} · ${c.school || 'без школы'}${effect ? ` · ${effect}` : ''}${warn}`,
        )
      }
      if (p.emptyFrames) lines.push(`  - ⚠ empty frames: ${p.emptyFrames}`)
      if (p.clipped?.length) lines.push(`  - ⚠ CLIPPED: ${p.clipped.join(' | ')}`)
      lines.push('')
    }
  }
  lines.push('## Таблица кадр / md5 (все страницы листа)')
  lines.push('')
  lines.push('| Кадр | md5 | карточки? |')
  lines.push('|---|---|---|')
  for (const sheet of report.sheets) {
    for (const p of sheet.pages) {
      lines.push(`| ${p.file} | \`${p.md5}\` | ${p.isCards ? 'да' : ''} |`)
    }
  }
  lines.push('')

  lines.push('## Переведённые заклинания (pass 14)')
  lines.push('')
  lines.push('Всего: **21** заклинание с EN-only `description` (из них 7 также с EN `higher_levels`).')
  lines.push('')
  const translated = [
    'augury — Гадание',
    'bestow_curse — Проклятие',
    'calm_emotions — Умиротворение',
    'commune_with_nature — Общение с природой',
    'conjure_animals — Призыв животных',
    'conjure_minor_elementals — Призыв малых элементалей',
    'conjure_woodland_beings — Призыв лесных обитателей',
    'dispel_evil_and_good — Рассеивание зла и добра',
    'divine_word — Божественное слово',
    'druidcraft — Искусство друидов',
    'greater_restoration — Высшее восстановление',
    'guards_and_wards — Стражи',
    'hallow — Святилище',
    'hellish_rebuke — Адское возмездие',
    'magic_circle — Магический круг',
    'prestidigitation — Фокусы',
    'private_sanctum — Кабинет Морденкайнена',
    'teleport — Телепортация',
    'thaumaturgy — Чудотворство',
    'unseen_servant — Невидимый слуга',
    'wish — Исполнение желаний',
  ]
  for (const row of translated) lines.push(`- ${row}`)
  lines.push('')
  lines.push('### Примеры перевода')
  lines.push('')
  lines.push('**Чудотворство:** «Вы проявляете незначительное чудо, знак сверхъестественной силы… Ваш голос гремит втрое громче обычного в течение 1 минуты.»')
  lines.push('')
  lines.push('**Адское возмездие:** «…должно совершить спасбросок Ловкости. При провале оно получает 2к10 урона огнём…» / На больших уровнях: «…ячейку 2-го уровня или выше, урон увеличивается на 1к10…»')
  lines.push('')
  lines.push('**Высшее восстановление:** «…уменьшить уровень истощения цели на один либо окончить… максимум хитов цели.»')
  lines.push('')
  lines.push('**Невидимый слуга:** «У него КД 10, 1 хит и Сила 2… бонусным действием… переместиться до 15 футов…»')
  lines.push('')
  writeFileSync(join(ART, 'REPORT.md'), lines.join('\n'))
  console.log(
    JSON.stringify(
      {
        sheets: report.sheets.map((s) => ({
          slug: s.slug,
          pages: s.pageCount,
          cardPages: s.cardPages.length,
        })),
        cardFiles,
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
