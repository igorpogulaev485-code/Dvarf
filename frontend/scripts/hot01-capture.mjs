/**
 * HOT-01: pair screenshots of real Play Desk hot bar (cleric / loaded).
 * Requires API + vite + seed_uikit03_hot_chars.py.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const DARRACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const TORBIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
const WIDTHS = [1920, 1440, 1280, 1024, 768, 390]
const HDR_WIDTHS = [1440, 1024, 390]

mkdirSync(ART, { recursive: true })

async function login(page) {
  const body = await page.evaluate(async () => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'uikit03@example.com', password: 'uikit03-dev' }),
    })
    return res.json()
  })
  if (!body.access_token) throw new Error(`login failed: ${JSON.stringify(body).slice(0, 200)}`)
  await page.evaluate(({ a, r }) => {
    localStorage.setItem('dvarf.access_token', a)
    localStorage.setItem('dvarf.refresh_token', r)
    localStorage.setItem('dvarf.mobileVitals.collapsed.v2', '0')
    // Skip onboarding welcome so the real Play Desk is visible
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
  }, { a: body.access_token, r: body.refresh_token })
}

async function dismissOnboarding(page) {
  const skip = page.getByRole('button', { name: /Пропустить|уже знаком|Играл/i })
  if (await skip.count()) {
    await skip.first().click().catch(() => {})
    await page.waitForTimeout(300)
  }
  const skip2 = page.locator('button').filter({ hasText: /Пропустить подсказки/i })
  if (await skip2.count()) {
    await skip2.first().click().catch(() => {})
    await page.waitForTimeout(300)
  }
  await page.evaluate(() => {
    document.querySelectorAll('[data-onboarding], .onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
}

async function openSheet(page, id) {
  await page.goto(`http://127.0.0.1:5173/characters/${id}`, {
    waitUntil: 'networkidle',
    timeout: 90_000,
  })
  await page.waitForTimeout(900)
  await dismissOnboarding(page)
  await page.evaluate(() => {
    document.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'))
    document.querySelectorAll('.ui-chip.is-tip-open').forEach((el) => el.classList.remove('is-tip-open'))
  })
  const expand = page.locator('button[aria-expanded="false"]').filter({ hasText: /Развер|Основн/i })
  if (await expand.count()) await expand.first().click().catch(() => {})
  await page.waitForTimeout(250)
  await page.waitForSelector('.play-desk__hot-wrap .play-desk__hot, .play-desk__hot', {
    timeout: 20_000,
  })
}

async function hotProbe(page) {
  return page.evaluate(() => {
    const hot = document.querySelector('.play-desk__hot-wrap .play-desk__hot, .play-desk__hot')
    if (!hot) return { error: 'no hot' }
    const names = [...hot.querySelectorAll('.play-desk__hot-res-name')].map((el) =>
      (el.textContent || '').trim(),
    )
    const counts = names.reduce((acc, n) => {
      acc[n] = (acc[n] || 0) + 1
      return acc
    }, {})
    const dups = Object.entries(counts).filter(([, c]) => c > 1)
    const label = hot.querySelector('.play-desk__hot-label')
    const labelFs = label ? getComputedStyle(label).fontSize : null
    const resName = hot.querySelector('.play-desk__hot-res-name')
    const resFs = resName ? getComputedStyle(resName).fontSize : null
    const resFw = resName ? getComputedStyle(resName).fontWeight : null
    const heights = [...hot.querySelectorAll('.play-desk__hot-item--res')].map((el) =>
      Math.round(el.getBoundingClientRect().height),
    )
    return {
      names,
      dups,
      labelFs,
      resFs,
      resFw,
      heights,
      scrollWidth: hot.scrollWidth,
      clientWidth: hot.clientWidth,
    }
  })
}

async function scrollHot(page, toEnd) {
  await page.evaluate((end) => {
    const hot = document.querySelector('.play-desk__hot-wrap .play-desk__hot, .play-desk__hot')
    if (!hot) return
    hot.scrollLeft = end ? hot.scrollWidth : 0
    hot.dispatchEvent(new Event('scroll'))
  }, toEnd)
  await page.waitForTimeout(200)
}

async function shotHotCrop(page, path) {
  const box = await page.evaluate(() => {
    const wrap = document.querySelector('.play-desk__hot-wrap') || document.querySelector('.play-desk__hot')
    if (!wrap) return null
    const r = wrap.getBoundingClientRect()
    return {
      x: Math.max(0, r.x - 8),
      y: Math.max(0, r.y - 8),
      width: Math.min(window.innerWidth - 4, r.width + 16),
      height: Math.min(220, r.height + 24),
    }
  })
  if (!box) throw new Error('no hot box')
  await page.screenshot({ path, clip: box })
}

async function shotHeader(page, path) {
  const box = await page.evaluate(() => {
    const desk = document.querySelector('.play-desk')
    const wide = desk?.classList.contains('play-desk--wide')
    const root =
      document.querySelector(wide ? '.play-desk__top' : '.play-desk__mobile-chrome') ||
      document.querySelector('.play-desk__top') ||
      document.querySelector('.mobile-vitals') ||
      document.querySelector('.play-desk')
    if (!root) return null
    const r = root.getBoundingClientRect()
    const width = Math.max(1, Math.min(window.innerWidth - 2, Math.round(r.width) || window.innerWidth - 2))
    const height = Math.max(1, Math.min(window.innerHeight - 4, Math.round(r.height + 8) || 200))
    return {
      x: Math.max(0, Math.round(r.x)),
      y: Math.max(0, Math.round(r.y)),
      width,
      height,
    }
  })
  if (!box || box.width < 2 || box.height < 2) {
    await page.screenshot({ path, fullPage: false })
    return
  }
  await page.screenshot({ path, clip: box })
}

async function composePair(page, w, state, clericPath, loadPath, outPath) {
  // Use sharp if available; else stack via canvas in page
  await page.setViewportSize({ width: Math.max(w, 400), height: 900 })
  const stacked = await page.evaluate(
    async ({ a, b, labelA, labelB }) => {
      async function load(src) {
        const img = new Image()
        img.src = src
        await img.decode()
        return img
      }
      const ia = await load(a)
      const ib = await load(b)
      const pad = 28
      const width = Math.max(ia.width, ib.width) + 24
      const height = ia.height + ib.height + pad * 3 + 36
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#f4f1ea'
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#2d2d2a'
      ctx.font = '600 14px "IBM Plex Sans", sans-serif'
      ctx.fillText(labelA, 12, 18)
      ctx.drawImage(ia, 12, pad)
      ctx.fillText(labelB, 12, pad + ia.height + 22)
      ctx.drawImage(ib, 12, pad * 2 + ia.height + 18)
      return canvas.toDataURL('image/png')
    },
    {
      a: `data:image/png;base64,${(await import('node:fs')).readFileSync(clericPath).toString('base64')}`,
      b: `data:image/png;base64,${(await import('node:fs')).readFileSync(loadPath).toString('base64')}`,
      labelA: `жрец · ${w}px`,
      labelB: `нагрузка · ${w}px`,
    },
  )
  const b64 = stacked.replace(/^data:image\/png;base64,/, '')
  writeFileSync(outPath, Buffer.from(b64, 'base64'))
}

const report = { probes: {}, files: [] }

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage()
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
await login(page)

for (const w of WIDTHS) {
  const h = w <= 390 ? 844 : 900
  await page.setViewportSize({ width: w, height: h })

  for (const state of ['start', 'end']) {
    // cleric
    await openSheet(page, DARRACK)
    await scrollHot(page, state === 'end')
    const clericProbe = await hotProbe(page)
    const clericTmp = `${ART}/_tmp-cleric-${w}-${state}.png`
    await shotHotCrop(page, clericTmp)

    // loaded
    await openSheet(page, TORBIN)
    await scrollHot(page, state === 'end')
    const loadProbe = await hotProbe(page)
    const loadTmp = `${ART}/_tmp-load-${w}-${state}.png`
    await shotHotCrop(page, loadTmp)

    const out = `${ART}/hotbar-pair-${w}-${state}.png`
    await composePair(page, w, state, clericTmp, loadTmp, out)
    report.files.push(out)
    report.probes[`${w}-${state}`] = { cleric: clericProbe, load: loadProbe }
  }
}

for (const w of HDR_WIDTHS) {
  const h = w <= 390 ? 844 : 900
  await page.setViewportSize({ width: w, height: h })
  await openSheet(page, DARRACK)
  const cTmp = `${ART}/_tmp-hdr-cleric-${w}.png`
  await shotHeader(page, cTmp)
  await openSheet(page, TORBIN)
  const lTmp = `${ART}/_tmp-hdr-load-${w}.png`
  await shotHeader(page, lTmp)
  const out = `${ART}/hdr-pair-${w}.png`
  await composePair(page, w, 'hdr', cTmp, lTmp, out)
  report.files.push(out)
}

writeFileSync(`${ART}/hot01-report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
