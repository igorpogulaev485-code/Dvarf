/**
 * QI-01: monk screenshots — combat/hot/feature + hdr control.
 * Requires API :8000 + vite :5173 + seed_qi01_monk.py
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { chromium } from 'playwright'

let decodePng = null
try {
  const pngjs = await import('pngjs')
  decodePng = (buf) => pngjs.PNG.sync.read(buf)
} catch {
  decodePng = null
}

const ART = '/opt/cursor/artifacts'
const BASE = process.env.QI01_BASE || 'http://127.0.0.1:5173'
const TAG = process.env.QI01_TAG || ''
const MONK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6'
const ROGUE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
const WARRIOR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'

mkdirSync(ART, { recursive: true })
function outName(name) {
  return `${ART}/${TAG}${name}`
}

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

async function dismissOnboarding(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
}

async function openSheet(page, id) {
  await page.goto(`${BASE}/characters/${id}`, {
    waitUntil: 'networkidle',
    timeout: 90_000,
  })
  await page.waitForTimeout(700)
  await dismissOnboarding(page)
  const expand = page.getByRole('button', { name: /Развернуть шапку/i })
  if (await expand.count()) {
    await expand.first().click().catch(() => {})
    await page.waitForTimeout(200)
  }
  await page.waitForSelector('.play-desk', { timeout: 20_000 })
}

async function openCombatScene(page, w) {
  if (w < 960) {
    const mobileNav = page
      .locator('.mobile-scene-nav button, .mobile-scene-nav__tab, [data-scene="combat"]')
      .filter({ hasText: /Бой/i })
    if (await mobileNav.count()) {
      await mobileNav.first().click().catch(() => {})
      await page.waitForTimeout(450)
    }
  }
  const combatTab = page.locator(
    [
      'button.play-desk__mode[data-mode="combat"]',
      '.play-desk__modes button:has-text("Бой")',
      '.mobile-scene-nav__tab:has-text("Бой")',
      'button:has-text("Бой")',
    ].join(', '),
  )
  if (await combatTab.count()) {
    await combatTab.first().click().catch(() => {})
    await page.waitForTimeout(400)
  }
  if (w < 960) {
    const atk = page.locator('.mobile-combat-seg__btn').filter({ hasText: /^Атаки$/ })
    if (await atk.count()) {
      await atk.first().click().catch(() => {})
      await page.waitForTimeout(250)
    }
  }
  await page
    .waitForSelector('.play-desk-compact, [data-onboarding="actions"]', { timeout: 15_000 })
    .catch(() => {})
}

async function shotClip(page, path, fn) {
  const box = await page.evaluate(fn)
  if (!box) throw new Error(`no clip for ${path}`)
  await page.screenshot({ path, clip: box })
  return box
}

async function shotHeader(page, path) {
  return shotClip(page, path, () => {
    const desk = document.querySelector('.play-desk')
    if (!desk) return null
    const wide = desk.classList.contains('play-desk--wide')
    const root = wide
      ? document.querySelector('.play-desk__top')
      : document.querySelector('.play-desk__mobile-chrome')
    if (!root) return null
    const r = root.getBoundingClientRect()
    if (r.width < 80 || r.height < 40) return null
    const maxH = wide ? Math.round(r.height) : Math.min(Math.round(r.height), 420)
    return {
      x: Math.max(0, Math.round(r.x)),
      y: Math.max(0, Math.round(r.y)),
      width: Math.max(80, Math.round(r.width)),
      height: Math.max(40, maxH),
    }
  })
}

async function shotCombatPanel(page, path) {
  return shotClip(page, path, () => {
    const panel =
      document.querySelector('.play-desk-compact') ||
      document.querySelector('[data-onboarding="actions"]')
    if (!panel) return null
    const r = panel.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.x) - 4),
      y: Math.max(0, Math.round(r.y) - 4),
      width: Math.max(80, Math.round(r.width) + 8),
      height: Math.min(Math.round(r.height) + 8, 1100),
    }
  })
}

async function shotHotBar(page, path) {
  return shotClip(page, path, () => {
    const hot =
      document.querySelector('.play-desk__hot-wrap') ||
      document.querySelector('.play-desk__hot')
    if (!hot) return null
    const r = hot.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.x) - 4),
      y: Math.max(0, Math.round(r.y) - 4),
      width: Math.max(80, Math.round(r.width) + 8),
      height: Math.max(40, Math.round(r.height) + 8),
    }
  })
}

async function openFeaturesAndMonkKi(page, w) {
  // Scene «Умения» / Features
  if (w < 960) {
    const nav = page.locator('.mobile-scene-nav button, .mobile-scene-nav__tab').filter({
      hasText: /Умения|Черты|Класс/i,
    })
    if (await nav.count()) {
      await nav.first().click().catch(() => {})
      await page.waitForTimeout(400)
    }
  }
  const featTab = page.locator(
    [
      'button.play-desk__mode[data-mode="features"]',
      '.play-desk__modes button:has-text("Умения")',
      '.play-desk__modes button:has-text("Класс")',
      'button:has-text("Умения")',
    ].join(', '),
  )
  if (await featTab.count()) {
    await featTab.first().click().catch(() => {})
    await page.waitForTimeout(400)
  }
  // Click a feature that mentions ци / Ки / Шквал
  const row = page
    .locator('button, .class-feature-row, .feature-card, [class*="feature"]')
    .filter({ hasText: /Шквал|Очки ци|Ци|Боевые искусства|Оглушающий/i })
  if (await row.count()) {
    await row.first().click().catch(() => {})
    await page.waitForTimeout(500)
  }
}

async function shotFeatureDialog(page, path) {
  const dialog = page.locator('.ui-dialog, [role="dialog"], .dialog').first()
  if (await dialog.count()) {
    const box = await dialog.boundingBox()
    if (box) {
      await page.screenshot({
        path,
        clip: {
          x: Math.max(0, box.x - 8),
          y: Math.max(0, box.y - 8),
          width: Math.min(box.width + 16, 1200),
          height: Math.min(box.height + 16, 900),
        },
      })
      return
    }
  }
  // Fallback: features panel
  await shotClip(page, path, () => {
    const panel =
      document.querySelector('.play-desk-features, .class-features, .play-desk-compact') ||
      document.querySelector('.play-desk__scenes')
    if (!panel) return null
    const r = panel.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.x)),
      y: Math.max(0, Math.round(r.y)),
      width: Math.max(80, Math.round(r.width)),
      height: Math.min(Math.round(r.height), 900),
    }
  })
}

async function composePair(page, w, aPath, bPath, outPath, labelA, labelB) {
  await page.setViewportSize({ width: w + 40, height: 2200 })
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#1a1a1a;font:14px sans-serif;color:#eee">
    <div style="padding:8px 12px">${labelA}</div>
    <img id="a" src="file://${aPath}" style="display:block;width:${w}px"/>
    <div style="padding:8px 12px">${labelB}</div>
    <img id="b" src="file://${bPath}" style="display:block;width:${w}px"/>
  </body></html>`)
  await page.waitForTimeout(200)
  const h = await page.evaluate(() => document.body.scrollHeight)
  await page.setViewportSize({ width: w + 40, height: Math.min(h + 20, 4000) })
  await page.screenshot({ path: outPath, fullPage: true })
}

function pixelDiff(pathA, pathB) {
  if (!decodePng) return { ok: false, reason: 'pngjs missing' }
  const a = decodePng(readFileSync(pathA))
  const b = decodePng(readFileSync(pathB))
  if (a.width !== b.width || a.height !== b.height) {
    return {
      ok: false,
      reason: `size ${a.width}x${a.height} vs ${b.width}x${b.height}`,
      diffPx: -1,
    }
  }
  let diff = 0
  const n = a.width * a.height * 4
  for (let i = 0; i < n; i += 4) {
    if (
      a.data[i] !== b.data[i] ||
      a.data[i + 1] !== b.data[i + 1] ||
      a.data[i + 2] !== b.data[i + 2] ||
      a.data[i + 3] !== b.data[i + 3]
    ) {
      diff += 1
    }
  }
  return { ok: true, diffPx: diff, width: a.width, height: a.height }
}

const report = { files: [], probes: {} }
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 })
await login(page)

for (const w of [1440, 390]) {
  const h = w <= 390 ? 1400 : 1600
  await page.setViewportSize({ width: w, height: h })
  await openSheet(page, MONK)
  await openCombatScene(page, w)

  const combatOut = outName(`combat-monk-${w}.png`)
  await shotCombatPanel(page, combatOut)
  report.files.push(combatOut)

  const probe = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.play-desk-compact__row')]
    const unarmed = rows.find((r) =>
      r.querySelector('.play-desk-compact__row-main b')?.textContent?.includes('Безоружный удар'),
    )
    const tags = unarmed
      ? [...unarmed.querySelectorAll('.play-desk-compact__tag')].map((t) => t.textContent?.trim())
      : []
    const hotNames = [...document.querySelectorAll('.play-desk__hot-res-name')].map((n) =>
      n.textContent?.trim(),
    )
    const aim = [...document.querySelectorAll('button, .sheet-chip, a')].some((el) =>
      /Атака на ци/i.test(el.textContent || ''),
    )
    const bodyText = document.body.innerText
    return {
      unarmedTags: tags,
      hasHeldChip: tags.includes('в руках'),
      hotNames,
      hasQiHot: hotNames.some((n) => n === 'Ци'),
      hasKiHot: hotNames.some((n) => n === 'Ки'),
      hasAttackOnQi: aim || /Атака на ци/.test(bodyText),
      hasKiWord: /(?<![а-яёА-ЯЁ])Ки(?![а-яёА-ЯЁ])|(?<![а-яёА-ЯЁ])ки(?![а-яёА-ЯЁ])/.test(
        bodyText,
      ),
    }
  })
  report.probes[`combat-${w}`] = probe
  console.log('combat-monk', w, probe)

  const hotOut = outName(`hot-monk-${w}.png`)
  await shotHotBar(page, hotOut)
  report.files.push(hotOut)
}

// Feature description with ци
await page.setViewportSize({ width: 1440, height: 1600 })
await openSheet(page, MONK)
await openFeaturesAndMonkKi(page, 1440)
const featOut = outName('feature-monk-qi-1440.png')
await shotFeatureDialog(page, featOut)
report.files.push(featOut)
const featProbe = await page.evaluate(() => {
  const text = document.body.innerText
  return {
    hasQi: /ци/i.test(text),
    hasKiStandalone: /(?<![а-яёА-ЯЁ])ки(?![а-яёА-ЯЁ])/i.test(text),
  }
})
report.probes.feature = featProbe
console.log('feature', featProbe)

// hdr-pair-1440 control (same branch — should be stable layout; vs main done separately if TAG=main-)
await page.setViewportSize({ width: 1440, height: 1100 })
await openSheet(page, ROGUE)
const hdrA = outName('_tmp-hdr-rogue-1440.png')
await shotHeader(page, hdrA)
await openSheet(page, WARRIOR)
const hdrB = outName('_tmp-hdr-warrior-1440.png')
await shotHeader(page, hdrB)
const hdrPair = outName('hdr-pair-1440.png')
await composePair(page, 1440, hdrA, hdrB, hdrPair, 'плут · 1440px', 'воин · 1440px')
report.files.push(hdrPair)
console.log('hdr-pair-1440')

writeFileSync(outName('qi01-capture-report.json'), JSON.stringify(report, null, 2))
await browser.close()
console.log('done', report.files.length, 'files')
