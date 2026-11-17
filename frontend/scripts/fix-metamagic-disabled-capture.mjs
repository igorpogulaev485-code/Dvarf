/**
 * Capture metamagic chip disabled-with-reason (Careful → «нет спасброска»)
 * on grant cast for the live sorcerer.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const OUT = '/opt/cursor/artifacts'
const out = (n) => `${OUT}/${n}`
const API = process.env.FIX_API || 'http://127.0.0.1:8000'
const BASE = process.env.FIX_BASE || 'http://127.0.0.1:5173'
const ids = JSON.parse(readFileSync(out('live-meta-grant-ids.json'), 'utf8'))
const EMAIL = ids.email
const PASS = 'meta-grant-dev'
const SORC_ID = ids.sorcId
const CLASS_ID = 'live-sorc-7-entry'

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

const auth = await api('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASS } })
const access = auth.access_token
const refresh = auth.refresh_token
const char = await api(`/characters/${SORC_ID}`, { token: access })
const sheet = structuredClone(char.sheet)
const metaKey = `${CLASS_ID}:metamagic`
const metaVal = 'empowered,quickened,twinned,careful'
const syncPicks = (root) => {
  const next = { values: { ...(root?.values || {}) } }
  next.values[metaKey] = metaVal
  return next
}
sheet.feature_picks = syncPicks(sheet.feature_picks)
sheet.featurePicks = syncPicks(sheet.featurePicks)
const patched = await api(`/characters/${SORC_ID}`, {
  method: 'PATCH',
  token: access,
  body: { sheet, sheet_version: char.sheet_version },
})
writeFileSync(
  out('live-sorc7-disabled-patch.json'),
  JSON.stringify({ sheet_version: patched.sheet_version, metamagic: metaVal }, null, 2),
)

const browser = await chromium.launch({ headless: true })
try {
  for (const { width, height, tag } of [
    { width: 1440, height: 900, tag: '1440' },
    { width: 390, height: 844, tag: '390' },
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
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
    await page.goto(`${BASE}/characters/${SORC_ID}`, {
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
    if (width < 960) {
      const nav = page
        .locator('.mobile-scene-nav button, .mobile-scene-nav__tab')
        .filter({ hasText: /Бой/i })
      if (await nav.count()) await nav.first().click().catch(() => {})
    }
    const tab = page.locator('button.play-desk__mode').filter({ hasText: /^Бой$/i })
    if (await tab.count()) await tab.first().click().catch(() => {})
    await page.waitForTimeout(400)
    if (width < 960) {
      const seg = page.locator('.mobile-combat-seg__btn, button').filter({ hasText: /^Заклинания$/i })
      if (await seg.count()) await seg.first().click().catch(() => {})
      await page.waitForTimeout(300)
    }
    const clicked = await page.evaluate(() => {
      const rootEl = document.querySelector('.play-desk-compact--spells')
      if (!rootEl) return 'no-root'
      const row = [...rootEl.querySelectorAll('.play-desk-compact__row.is-spell')].find((r) => {
        const t = r.textContent || ''
        return t.includes('Луч болезни') && /Отмеченный/.test(t)
      })
      if (!row) return 'no-row'
      const btn = [...row.querySelectorAll('button')].find((b) =>
        /каст/i.test((b.textContent || '').trim()),
      )
      if (!btn) return 'no-button'
      btn.click()
      return 'ok'
    })
    if (clicked !== 'ok') throw new Error(`open cast failed: ${clicked}`)
    await page.getByRole('heading', { name: /Кастовать заклинание/i }).waitFor({ timeout: 15_000 })
    const dialog = page.locator('.ui-dialog').filter({ hasText: /Кастовать заклинание/i })
    const grant = dialog
      .locator('.cast-source-chip:not(.is-disabled)')
      .filter({ hasText: /Отмеченный тенями/i })
    if (await grant.count()) await grant.first().click()
    await page.waitForTimeout(150)
    const meta = dialog.locator('[data-testid="cast-metamagic-block"]')
    await meta.locator('button.cast-metamagic-block__toggle').click()
    await page.waitForTimeout(200)
    const careful = dialog.locator('.cast-metamagic-block__chip-wrap, .ui-toggle-chip').filter({
      hasText: /Осторожн|Careful|нет спасброска/i,
    })
    // Prefer wrap that contains reason text
    const reasonText = await dialog.evaluate(() => {
      const body = document.querySelector('[data-testid="cast-metamagic-block"]')
      return body ? body.innerText : ''
    })
    writeFileSync(out(`live-sorc7-disabled-reason-text-${tag}.txt`), reasonText)
    if (!/нет спасброска/i.test(reasonText)) {
      throw new Error(`expected disabled reason «нет спасброска» (${tag}):\n${reasonText}`)
    }
    await page.screenshot({ path: out(`live-sorc7-cast-grant-meta-disabled-${tag}.png`), fullPage: false })
    await dialog.getByRole('button', { name: /^Отмена$/i }).click()
    await page.close()
  }
  console.log('disabled capture ok')
} finally {
  await browser.close()
}
