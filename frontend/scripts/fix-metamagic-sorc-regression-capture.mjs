/**
 * 2014 sorcerer regression: same character on origin/main vs fix.
 * Frames: combat top + Abilities (metamagic card), 1440 & 390, scrollTop=0.
 * Footer «Редакция / vN» masked (autosave bumps sheet_version between shots).
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
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
const SORC_ID = process.env.FIX_SORC_ID || ids.sorcId

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

async function login(page, base, access, refresh) {
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
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

async function openSheet(page, base, id) {
  await page.goto(`${base}/characters/${id}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  await page.waitForSelector('.play-desk', { timeout: 30_000 })
}

async function hideVersionChrome(page) {
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach((el) => {
      if (!(el instanceof HTMLElement)) return
      const t = el.textContent || ''
      if (/Сохранено.*Редакция|Редакция 2014\s*•\s*v\d+/i.test(t) && t.length < 80) {
        el.style.visibility = 'hidden'
      }
    })
  })
}

async function openCombat(page, width) {
  if (width < 960) {
    const tab = page.locator('.mobile-scene-nav__tab').filter({ hasText: /Бой/i })
    if (await tab.count()) await tab.first().click()
  } else {
    await page.locator('button.play-desk__mode').filter({ hasText: /^Бой$/i }).first().click()
  }
  await page.waitForTimeout(400)
}

async function openFeatures(page, width) {
  if (width < 960) {
    const tab = page.locator('.mobile-scene-nav__tab').filter({ hasText: /Способн/i })
    if (await tab.count()) await tab.first().click()
  } else {
    await page.locator('button.play-desk__mode').filter({ hasText: /^Способности$/i }).first().click()
  }
  await page.waitForTimeout(500)
  await page
    .waitForFunction(() => /Метамагия/.test(document.body.innerText), null, { timeout: 15_000 })
    .catch(() => {})
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0
    const hit = [...document.querySelectorAll('*')].find((el) =>
      /Метамагия/i.test((el.textContent || '').trim().slice(0, 24)),
    )
    if (hit instanceof HTMLElement) hit.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(250)
}

async function captureSide(browser, { label, base, access, refresh, width, height, tag }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await login(page, base, access, refresh)
  await openSheet(page, base, SORC_ID)

  await openCombat(page, width)
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0
  })
  await hideVersionChrome(page)
  await page.screenshot({ path: out(`reg-sorc7-combat-top-${label}-${tag}.png`), fullPage: false })

  await openFeatures(page, width)
  await hideVersionChrome(page)
  await page.screenshot({ path: out(`reg-sorc7-abilities-meta-${label}-${tag}.png`), fullPage: false })
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
    await captureSide(browser, { label: 'before', base: BEFORE, access, refresh, ...vp })
    await captureSide(browser, { label: 'after', base: AFTER, access, refresh, ...vp })
  }

  const summary = {
    sorcId: SORC_ID,
    email: EMAIL,
    beforeBase: BEFORE,
    afterBase: AFTER,
    note: 'footer sheet-version masked; mobile BottomSceneNav «Способн.»',
    md5: {},
    compare: {},
  }
  for (const kind of ['combat-top', 'abilities-meta']) {
    for (const tag of ['1440', '390']) {
      const a = `reg-sorc7-${kind}-before-${tag}.png`
      const b = `reg-sorc7-${kind}-after-${tag}.png`
      summary.md5[a] = md5(out(a))
      summary.md5[b] = md5(out(b))
      summary.compare[`${kind}-${tag}`] = {
        same: summary.md5[a] === summary.md5[b],
        before: summary.md5[a],
        after: summary.md5[b],
      }
    }
  }
  writeFileSync(out('reg-sorc7-md5.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
} finally {
  await browser.close()
}
