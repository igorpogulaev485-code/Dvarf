/**
 * 2014 regression: same non-sorcerer (wizard) on origin/main vs fix branch.
 * Captures combat top (scrollTop=0) + cast dialog at 1440 and 390.
 *
 * Env:
 *   FIX_BEFORE_BASE  vite of origin/main (default http://127.0.0.1:5174)
 *   FIX_AFTER_BASE   vite of fix branch (default http://127.0.0.1:5173)
 *   FIX_API          API (default http://127.0.0.1:8000)
 *   FIX_EMAIL / FIX_PASS / FIX_WIZ_ID from live-meta-grant-ids.json if unset
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { chromium } from 'playwright'

const OUT = '/opt/cursor/artifacts'
mkdirSync(OUT, { recursive: true })
const out = (n) => `${OUT}/${n}`
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex')

const API = process.env.FIX_API || 'http://127.0.0.1:8000'
const BEFORE = process.env.FIX_BEFORE_BASE || 'http://127.0.0.1:5174'
const AFTER = process.env.FIX_AFTER_BASE || 'http://127.0.0.1:5173'

const ids = JSON.parse(readFileSync(out('live-meta-grant-ids.json'), 'utf8'))
const EMAIL = process.env.FIX_EMAIL || ids.email
const PASS = process.env.FIX_PASS || 'meta-grant-dev'
const WIZ_ID = process.env.FIX_WIZ_ID || ids.wizId

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

async function login(page, access, refresh) {
  await page.goto(`${page._fixBase}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ({ a, r }) => {
      localStorage.setItem('dvarf.access_token', a)
      localStorage.setItem('dvarf.refresh_token', r)
      localStorage.setItem('dvarf.mobileVitals.collapsed.v2', '0')
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
    { a: access, r: refresh },
  )
}

async function openSheet(page, id) {
  await page.goto(`${page._fixBase}/characters/${id}`, {
    waitUntil: 'networkidle',
    timeout: 90_000,
  })
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  await page.waitForSelector('.play-desk', { timeout: 30_000 })
}

async function openCombat(page, width) {
  if (width < 960) {
    const nav = page.locator('.mobile-scene-nav button, .mobile-scene-nav__tab').filter({ hasText: /Бой/i })
    if (await nav.count()) await nav.first().click().catch(() => {})
  }
  const tab = page.locator('button.play-desk__mode').filter({ hasText: /^Бой$/i })
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(400)
}

async function showSpellsMobile(page) {
  const seg = page.locator('.mobile-combat-seg__btn, button').filter({ hasText: /^Заклинания$/i })
  if (await seg.count()) await seg.first().click().catch(() => {})
  await page.waitForTimeout(300)
}

async function sheetTopShot(page, name) {
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    document.querySelector('.play-desk')?.scrollTo?.(0, 0)
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0
  })
  await page.waitForTimeout(200)
  await page.screenshot({ path: out(name), fullPage: false })
}

async function captureSide(browser, { label, base, access, refresh, width, height, tag }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  page._fixBase = base
  await login(page, access, refresh)
  await openSheet(page, WIZ_ID)
  await openCombat(page, width)
  if (width < 960) await showSpellsMobile(page)
  await sheetTopShot(page, `reg-wiz5-combat-top-${label}-${tag}.png`)

  const wizRoot = page.locator('.play-desk-compact--spells').first()
  await wizRoot.waitFor({ timeout: 20_000 })
  const expand = wizRoot.getByRole('button', { name: /Развернуть все/i })
  if (await expand.count()) await expand.first().click().catch(() => {})
  await page.waitForTimeout(350)
  const clicked = await page.evaluate(() => {
    const rootEl = document.querySelector('.play-desk-compact--spells')
    if (!rootEl) return 'no-root'
    const row = [...rootEl.querySelectorAll('.play-desk-compact__row.is-spell')].find((r) =>
      (r.textContent || '').includes('Волшебная стрела'),
    )
    if (!row) return 'no-row'
    const btn = [...row.querySelectorAll('button')].find((b) =>
      /каст/i.test((b.textContent || '').trim()),
    )
    if (!btn) return 'no-button'
    btn.click()
    return 'ok'
  })
  if (clicked !== 'ok') throw new Error(`${label} wizard cast click failed: ${clicked}`)
  await page.getByRole('heading', { name: /Кастовать заклинание/i }).waitFor({ timeout: 15_000 })
  await page.waitForTimeout(250)
  const dialog = page.locator('.ui-dialog').filter({ hasText: /Кастовать заклинание/i })
  const meta = await dialog.locator('[data-testid="cast-metamagic-block"]').count()
  writeFileSync(
    out(`reg-wiz5-cast-meta-count-${label}-${tag}.json`),
    JSON.stringify({ metamagicBlocks: meta }, null, 2),
  )
  await page.screenshot({ path: out(`reg-wiz5-cast-${label}-${tag}.png`), fullPage: false })
  await dialog.getByRole('button', { name: /^Отмена$/i }).click()
  await page.close()
}

const browser = await chromium.launch({ headless: true })
try {
  const auth = await api('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASS } })
  const access = auth.access_token
  const refresh = auth.refresh_token

  for (const vp of [
    { width: 1440, height: 900, tag: '1440' },
    { width: 390, height: 844, tag: '390' },
  ]) {
    await captureSide(browser, {
      label: 'before',
      base: BEFORE,
      access,
      refresh,
      ...vp,
    })
    await captureSide(browser, {
      label: 'after',
      base: AFTER,
      access,
      refresh,
      ...vp,
    })
  }

  const pairs = [
    'reg-wiz5-combat-top-before-1440.png',
    'reg-wiz5-combat-top-after-1440.png',
    'reg-wiz5-combat-top-before-390.png',
    'reg-wiz5-combat-top-after-390.png',
    'reg-wiz5-cast-before-1440.png',
    'reg-wiz5-cast-after-1440.png',
    'reg-wiz5-cast-before-390.png',
    'reg-wiz5-cast-after-390.png',
  ]
  const summary = { wizId: WIZ_ID, email: EMAIL, beforeBase: BEFORE, afterBase: AFTER, md5: {}, compare: {} }
  for (const name of pairs) summary.md5[name] = md5(out(name))

  for (const tag of ['1440', '390']) {
    for (const kind of ['combat-top', 'cast']) {
      const a = `reg-wiz5-${kind}-before-${tag}.png`
      const b = `reg-wiz5-${kind}-after-${tag}.png`
      const same = summary.md5[a] === summary.md5[b]
      summary.compare[`${kind}-${tag}`] = { same, before: summary.md5[a], after: summary.md5[b] }
      if (!same) {
        // side-by-side via sharp if available, else leave note
        try {
          const { default: sharp } = await import('sharp')
          const left = sharp(out(a))
          const right = sharp(out(b))
          const metaL = await left.metadata()
          const metaR = await right.metadata()
          const h = Math.max(metaL.height || 0, metaR.height || 0)
          const w = (metaL.width || 0) + (metaR.width || 0)
          const canvas = sharp({
            create: { width: w, height: h, channels: 3, background: { r: 30, g: 30, b: 30 } },
          })
          const lBuf = await left.toBuffer()
          const rBuf = await right.toBuffer()
          await canvas
            .composite([
              { input: lBuf, left: 0, top: 0 },
              { input: rBuf, left: metaL.width || 0, top: 0 },
            ])
            .png()
            .toFile(out(`reg-wiz5-${kind}-diff-sidebyside-${tag}.png`))
        } catch (e) {
          summary.compare[`${kind}-${tag}`].diffNote = String(e?.message || e)
        }
      }
    }
  }

  writeFileSync(out('reg-wiz5-md5.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
} finally {
  await browser.close()
}
