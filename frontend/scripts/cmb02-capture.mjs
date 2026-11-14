/**
 * CMB-02 screenshots: smite states + turn action groups + hdr/scene control.
 * Requires API :8000 + vite :5173 + seed_cmb02_chars.py (+ lp01/qi01).
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.CMB02_BASE || 'http://127.0.0.1:5173'
const TAG = process.env.CMB02_TAG || ''
const PAL5 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7'
const PAL11 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8'
const ROGUE5 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9'
const WAR5 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
const MONK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6'

mkdirSync(ART, { recursive: true })
const out = (name) => `${ART}/${TAG}${name}`

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
    { a: body.access_token, r: body.refresh_token },
  )
}

async function openSheet(page, id) {
  await page.goto(`${BASE}/characters/${id}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  const expand = page.getByRole('button', { name: /Развернуть шапку/i })
  if (await expand.count()) await expand.first().click().catch(() => {})
  await page.waitForSelector('.play-desk', { timeout: 20_000 })
}

async function openCombat(page, w) {
  if (w < 960) {
    const nav = page.locator('.mobile-scene-nav button, .mobile-scene-nav__tab').filter({ hasText: /Бой/i })
    if (await nav.count()) await nav.first().click().catch(() => {})
  }
  const tab = page.locator('button.play-desk__mode[data-mode="combat"], button:has-text("Бой")')
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(400)
  if (w < 960) {
    const atk = page.locator('.mobile-combat-seg__btn').filter({ hasText: /^Атаки$/ })
    if (await atk.count()) await atk.first().click().catch(() => {})
  }
  await page.waitForSelector('.play-desk-compact[data-onboarding="actions"]', { timeout: 15_000 }).catch(() => {})
}

async function shotPanel(page, path) {
  const box = await page.evaluate(() => {
    const el =
      document.querySelector('.play-desk-compact[data-onboarding="actions"]') ||
      document.querySelector('.play-desk-compact')
    if (!el) return null
    el.scrollIntoView({ block: 'start' })
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.left) - 4),
      y: Math.max(0, Math.round(r.top)),
      width: Math.max(80, Math.round(r.width) + 8),
      height: Math.min(window.innerHeight - Math.round(r.top) - 4, Math.max(220, Math.round(r.height) + 8)),
    }
  })
  if (!box) throw new Error(`no panel for ${path}`)
  await page.screenshot({ path, clip: box })
}

async function shotHeader(page, path) {
  const box = await page.evaluate(() => {
    const desk = document.querySelector('.play-desk')
    if (!desk) return null
    const wide = desk.classList.contains('play-desk--wide')
    const root = wide
      ? document.querySelector('.play-desk__top')
      : document.querySelector('.play-desk__mobile-chrome')
    if (!root) return null
    const r = root.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.x)),
      y: Math.max(0, Math.round(r.y)),
      width: Math.max(80, Math.round(r.width)),
      height: Math.max(40, wide ? Math.round(r.height) : Math.min(Math.round(r.height), 420)),
    }
  })
  if (!box) throw new Error(`no header for ${path}`)
  await page.screenshot({ path, clip: box })
}

async function composePair(page, aPath, bPath, outPath, la, lb) {
  const stacked = await page.evaluate(
    async ({ a, b, la, lb }) => {
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
      ctx.fillStyle = '#fbf7ec'
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#2d2d2a'
      ctx.font = '600 14px "IBM Plex Sans", sans-serif'
      ctx.fillText(la, 12, 18)
      ctx.drawImage(ia, 12, pad)
      ctx.fillText(lb, 12, pad + ia.height + 22)
      ctx.drawImage(ib, 12, pad * 2 + ia.height + 18)
      return canvas.toDataURL('image/png')
    },
    {
      a: `data:image/png;base64,${readFileSync(aPath).toString('base64')}`,
      b: `data:image/png;base64,${readFileSync(bPath).toString('base64')}`,
      la,
      lb,
    },
  )
  writeFileSync(outPath, Buffer.from(stacked.replace(/^data:image\/png;base64,/, ''), 'base64'))
}

async function openTurnGroup(page, label) {
  const tab = page.locator('.play-desk-turn-actions__tab').filter({ hasText: new RegExp(`^${label}$`, 'i') })
  if (!(await tab.count())) return
  const btn = tab.first()
  const disabled = await btn.isDisabled().catch(() => false)
  if (disabled) return
  // close others then open
  const open = await btn.evaluate((el) => el.classList.contains('is-open'))
  if (!open) await btn.click().catch(() => {})
  await page.waitForTimeout(300)
}

async function openSmiteOnFirstMelee(page) {
  const btn = page.locator('.play-desk-compact__tool--smite').first()
  if (await btn.count()) {
    await btn.click().catch(() => {})
    await page.waitForTimeout(250)
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await login(page)

  // —— Smite idle / open (paladin 5) ——
  for (const w of [1440, 390]) {
    await page.setViewportSize({ width: w, height: 1600 })
    await openSheet(page, PAL5)
    await openCombat(page, w)
    await shotPanel(page, out(`smite-idle-${w}.png`))
    await openSmiteOnFirstMelee(page)
    await shotPanel(page, out(`smite-open-hit-${w}.png`))
  }

  // Smite improved (paladin 11)
  await page.setViewportSize({ width: 1440, height: 1600 })
  await openSheet(page, PAL11)
  await openCombat(page, 1440)
  await openSmiteOnFirstMelee(page)
  await shotPanel(page, out('smite-improved-1440.png'))

  // —— Turn pairs: rogue5 / war5 ——
  for (const w of [1440, 1024, 390]) {
    await page.setViewportSize({ width: w, height: 1800 })
    const shots = []
    for (const [id, tag] of [
      [ROGUE5, 'rogue'],
      [WAR5, 'war'],
    ]) {
      await openSheet(page, id)
      await openCombat(page, w)
      const closed = out(`_tmp-turn-closed-${tag}-${w}.png`)
      await shotPanel(page, closed)
      shots.push(['closed', closed])

      for (const group of ['Действие', 'Бонусное', 'Реакция']) {
        await openTurnGroup(page, group)
        const p = out(`_tmp-turn-${group}-${tag}-${w}.png`)
        await shotPanel(page, p)
        shots.push([group, p])
      }
    }
    // Compose closed / action / bonus / reaction pairs
    const map = Object.fromEntries(
      ['closed', 'Действие', 'Бонусное', 'Реакция'].map((k) => {
        const rogue = shots.find((s) => s[0] === k && s[1].includes('rogue'))?.[1]
        const war = shots.find((s) => s[0] === k && s[1].includes('war'))?.[1]
        return [k, { rogue, war }]
      }),
    )
    const keys = [
      ['closed', 'turn-closed'],
      ['Действие', 'turn-action'],
      ['Бонусное', 'turn-bonus'],
      ['Реакция', 'turn-reaction'],
    ]
    for (const [k, name] of keys) {
      if (map[k]?.rogue && map[k]?.war && existsSync(map[k].rogue) && existsSync(map[k].war)) {
        await composePair(
          page,
          map[k].rogue,
          map[k].war,
          out(`${name}-pair-${w}.png`),
          'плут 5',
          'воин 5 (GWM+щит)',
        )
      }
    }
  }

  // Monk bonus
  await page.setViewportSize({ width: 1440, height: 1600 })
  await openSheet(page, MONK)
  await openCombat(page, 1440)
  await openTurnGroup(page, 'Бонусное')
  await shotPanel(page, out('turn-bonus-monk-1440.png'))

  // HDR control at 1440/390
  for (const w of [1440, 390]) {
    await page.setViewportSize({ width: w, height: 1200 })
    await openSheet(page, ROGUE5)
    await openCombat(page, w)
    await shotHeader(page, out(`hdr-pair-${w}.png`))
  }

  console.log('cmb02-capture done →', ART)
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
