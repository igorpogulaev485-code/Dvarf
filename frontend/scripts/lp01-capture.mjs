/**
 * LP-01: real Play Desk left-panel screenshots (prof vs expertise, passives, ownership).
 * Requires API + vite + seed_lp01_chars.py.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const DARRACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const TORBIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
const ROGUE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
const WARRIOR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'
const WIDTHS = [1920, 1440, 1280, 1024, 768, 390]
const ROGUE_WIDTHS = [1440, 1024, 390]
const WARRIOR_WIDTHS = [1440, 1024]
const HDR_WIDTHS = [1920, 1440, 1280, 1024, 768, 390]
const SCENE_WIDTHS = [1440, 390]
const DV_WIDTHS = [1440, 1024, 390]

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
  await page.goto(`http://127.0.0.1:5173/characters/${id}`, {
    waitUntil: 'networkidle',
    timeout: 90_000,
  })
  await page.waitForTimeout(800)
  await dismissOnboarding(page)
  const expand = page.getByRole('button', { name: /Развернуть шапку/i })
  if (await expand.count()) {
    await expand.first().click().catch(() => {})
    await page.waitForTimeout(200)
  }
  await page.waitForSelector('.play-desk', { timeout: 20_000 })
}

async function openMobileAbilities(page, w) {
  if (w > 959) return
  // Phone: characteristics live under scene tab / abilities page
  const tab = page.locator('.mobile-scene-nav__tab, [data-onboarding="abilities"]').first()
  const abilBtn = page.getByRole('button', { name: /Характеристик|Способност/i })
  if (await abilBtn.count()) {
    await abilBtn.first().click().catch(() => {})
    await page.waitForTimeout(400)
  } else if (await tab.count()) {
    await tab.click().catch(() => {})
    await page.waitForTimeout(300)
  }
  // Prefer full-screen abilities page if present
  const openAbil = page.getByRole('button', { name: /Характеристики/i })
  if (await openAbil.count()) {
    await openAbil.first().click().catch(() => {})
    await page.waitForTimeout(400)
  }
  await page.waitForTimeout(200)
}

async function expandAbilities(page) {
  const expandAll = page.getByRole('button', { name: /Развернуть все/i })
  if (await expandAll.count()) {
    await expandAll.first().click().catch(() => {})
    await page.waitForTimeout(350)
  }
}

async function shotClip(page, path, fn) {
  const box = await page.evaluate(fn)
  if (!box) throw new Error(`no clip for ${path}`)
  await page.screenshot({ path, clip: box })
  return box
}

async function shotLeftPanel(page, path) {
  await expandAbilities(page)
  await page.evaluate(() => {
    const left =
      document.querySelector('.mobile-abil-page__body') ||
      document.querySelector('.play-desk__left')
    const foot = document.querySelector('.play-desk__rail-foot, .mobile-abil-page__foot')
    left?.scrollTo?.(0, 0)
    foot?.scrollIntoView?.({ block: 'nearest' })
  })
  await page.waitForTimeout(200)
  return shotClip(page, path, () => {
    const mobile = document.querySelector('.mobile-abil-page')
    const left = document.querySelector('.play-desk__left')
    const root = mobile && getComputedStyle(mobile).display !== 'none' ? mobile : left
    if (!root) return null
    const r = root.getBoundingClientRect()
    if (r.width < 40 || r.height < 40) return null
    const y = Math.max(0, Math.round(r.top))
    const height = Math.min(window.innerHeight - y - 4, Math.max(220, Math.round(r.height)))
    return {
      x: Math.max(0, Math.round(r.left) - 2),
      y,
      width: Math.max(40, Math.round(r.width) + 4),
      height,
    }
  })
}

async function shotRogueExpertise(page, path) {
  await expandAbilities(page)
  await page.evaluate(() => {
    const dex = [...document.querySelectorAll('.abil-block')].find(
      (b) => b.getAttribute('data-abil') === 'dex',
    )
    dex?.scrollIntoView?.({ block: 'center' })
  })
  await page.waitForTimeout(200)
  return shotClip(page, path, () => {
    const dex = [...document.querySelectorAll('.abil-block')].find(
      (b) => b.getAttribute('data-abil') === 'dex',
    )
    const wis = [...document.querySelectorAll('.abil-block')].find(
      (b) => b.getAttribute('data-abil') === 'wis',
    )
    const els = [dex, wis].filter(Boolean)
    if (!els.length) return null
    let top = Infinity
    let left = Infinity
    let right = 0
    let bottom = 0
    for (const el of els) {
      const r = el.getBoundingClientRect()
      top = Math.min(top, r.top)
      left = Math.min(left, r.left)
      right = Math.max(right, r.right)
      bottom = Math.max(bottom, r.bottom)
    }
    return {
      x: Math.max(0, Math.round(left) - 6),
      y: Math.max(0, Math.round(top) - 6),
      width: Math.max(80, Math.round(right - left) + 12),
      height: Math.max(80, Math.round(bottom - top) + 12),
    }
  })
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

async function shotSceneBlock(page, path) {
  return shotClip(page, path, () => {
    const modes = document.querySelector('.play-desk__modes')
    const tools = document.querySelector('.play-desk__mode-tools')
    const mobileRoll =
      document.querySelector('.mobile-combat-seg-stack') ||
      document.querySelector('.mobile-combat-roll')
    const skills =
      document.querySelector('.play-desk__hot--skills')?.closest('.play-desk__hot-wrap') ||
      document.querySelector('.play-desk__hot--skills')
    const turn = document.querySelector('[data-scn01-scene-turn], .scene-turn-controls')
    const strip = document.querySelector('.turn-economy-strip')
    const els = [modes, tools, mobileRoll, turn, strip, skills].filter(Boolean)
    if (els.length === 0) return null
    let top = Infinity
    let left = Infinity
    let right = 0
    let bottom = 0
    for (const el of els) {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      top = Math.min(top, r.top)
      left = Math.min(left, r.left)
      right = Math.max(right, r.right)
      bottom = Math.max(bottom, r.bottom)
    }
    if (!Number.isFinite(top)) return null
    return {
      x: Math.max(0, Math.round(left) - 4),
      y: Math.max(0, Math.round(top) - 4),
      width: Math.max(40, Math.round(right - left) + 8),
      height: Math.max(40, Math.round(bottom - top) + 8),
    }
  })
}

async function composePair(page, w, aPath, bPath, outPath, labelA, labelB) {
  await page.setViewportSize({ width: Math.max(w, 400), height: 1600 })
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
      la: labelA,
      lb: labelB,
    },
  )
  writeFileSync(outPath, Buffer.from(stacked.replace(/^data:image\/png;base64,/, ''), 'base64'))
}

async function shotOwnershipView(page, path) {
  await expandAbilities(page)
  await page.evaluate(() => {
    document
      .querySelector('.play-desk__rail-foot, .mobile-abil-page__foot')
      ?.scrollIntoView?.({ block: 'nearest' })
  })
  await page.waitForTimeout(200)
  return shotClip(page, path, () => {
    const foot =
      document.querySelector('.mobile-abil-page__foot') ||
      document.querySelector('.play-desk__rail-foot')
    const summary = foot?.querySelector('.ownership-summary') || document.querySelector('.ownership-summary')
    const passives = foot?.querySelector('.play-desk__passives')
    const els = [passives, summary].filter(Boolean)
    if (!els.length) return null
    let top = Infinity
    let left = Infinity
    let right = 0
    let bottom = 0
    for (const el of els) {
      const r = el.getBoundingClientRect()
      top = Math.min(top, r.top)
      left = Math.min(left, r.left)
      right = Math.max(right, r.right)
      bottom = Math.max(bottom, r.bottom)
    }
    return {
      x: Math.max(0, Math.round(left) - 4),
      y: Math.max(0, Math.round(top) - 4),
      width: Math.max(80, Math.round(right - left) + 8),
      height: Math.max(60, Math.round(bottom - top) + 8),
    }
  })
}

async function shotDarkvision(page, path) {
  await expandAbilities(page)
  await page.evaluate(() => {
    document.querySelector('.darkvision-sense')?.scrollIntoView?.({ block: 'center' })
  })
  await page.waitForTimeout(200)
  return shotClip(page, path, () => {
    const passives = document.querySelector('.play-desk__passives')
    const dv = document.querySelector('.darkvision-sense')
    const els = [passives, dv].filter(Boolean)
    if (!els.length) return null
    let top = Infinity
    let left = Infinity
    let right = 0
    let bottom = 0
    for (const el of els) {
      const r = el.getBoundingClientRect()
      top = Math.min(top, r.top)
      left = Math.min(left, r.left)
      right = Math.max(right, r.right)
      bottom = Math.max(bottom, r.bottom)
    }
    return {
      x: Math.max(0, Math.round(left) - 4),
      y: Math.max(0, Math.round(top) - 4),
      width: Math.max(80, Math.round(right - left) + 8),
      height: Math.max(40, Math.round(bottom - top) + 8),
    }
  })
}

async function shotSpeedMenu(page, path) {
  // Phone VitalTileMenu only (<960). Open summary, clip panel.
  const summary = page.locator('.mobile-vitals__speed > summary, .mobile-vitals__speed .ui-vital-menu__summary').first()
  if (!(await summary.count())) {
    // Desktop: no +N menu — skip file
    writeFileSync(
      `${ART}/_speed-menu-skip.txt`,
      'no VitalTileMenu at this width (desktop speed tile has no +N popover)\n',
      { flag: 'a' },
    )
    return null
  }
  await summary.click()
  await page.waitForTimeout(350)
  const box = await page.evaluate(() => {
    const panel =
      document.querySelector('.ui-vital-menu__panel') ||
      document.querySelector('.ui-menu__panel')
    const host = document.querySelector('.mobile-vitals__speed')
    const els = [host, panel].filter(Boolean)
    if (!els.length) return null
    let top = Infinity
    let left = Infinity
    let right = 0
    let bottom = 0
    for (const el of els) {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      top = Math.min(top, r.top)
      left = Math.min(left, r.left)
      right = Math.max(right, r.right)
      bottom = Math.max(bottom, r.bottom)
    }
    if (!Number.isFinite(top)) return null
    return {
      x: Math.max(0, Math.round(left) - 6),
      y: Math.max(0, Math.round(top) - 6),
      width: Math.max(80, Math.round(right - left) + 12),
      height: Math.max(80, Math.round(bottom - top) + 12),
    }
  })
  if (!box) return null
  await page.screenshot({ path, clip: box })
  return box
}

async function shotOwnershipEditor(page, path) {
  const open = page.locator('.ownership-summary__open, .ownership-summary__body').first()
  if (await open.count()) {
    await open.click().catch(() => {})
  } else {
    await page.getByRole('button', { name: /Владения/i }).first().click().catch(() => {})
  }
  await page.waitForSelector('.play-desk-drawer', { timeout: 10_000 })
  await page.waitForTimeout(300)
  return shotClip(page, path, () => {
    const drawer = document.querySelector('.play-desk-drawer')
    if (!drawer) return null
    const r = drawer.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.left)),
      y: Math.max(0, Math.round(r.top)),
      width: Math.max(80, Math.round(r.width)),
      height: Math.max(120, Math.round(r.height)),
    }
  })
}

const report = { files: [] }
const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage()
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
await login(page)

for (const w of WIDTHS) {
  const h = w <= 390 ? 1100 : 1400
  await page.setViewportSize({ width: w, height: h })

  await openSheet(page, DARRACK)
  await openMobileAbilities(page, w)
  const cLeft = `${ART}/_tmp-lp-cleric-${w}.png`
  const cBox = await shotLeftPanel(page, cLeft)

  await openSheet(page, TORBIN)
  await openMobileAbilities(page, w)
  const tLeft = `${ART}/_tmp-lp-load-${w}.png`
  const tBox = await shotLeftPanel(page, tLeft)

  const out = `${ART}/left-panel-pair-${w}.png`
  await composePair(
    page,
    w,
    cLeft,
    tLeft,
    out,
    `жрец · ${w}px`,
    `нагрузка · ${w}px`,
  )
  report.files.push({
    file: out,
    w,
    clericH: cBox?.height,
    loadH: tBox?.height,
  })
  console.log('pair', w, out)
}

for (const w of ROGUE_WIDTHS) {
  const h = w <= 390 ? 1100 : 1200
  await page.setViewportSize({ width: w, height: h })
  await openSheet(page, ROGUE)
  await openMobileAbilities(page, w)
  const out = `${ART}/left-panel-rogue-${w}.png`
  await shotRogueExpertise(page, out)
  report.files.push({ file: out, w, kind: 'rogue' })
  console.log('rogue', w, out)
}

for (const w of WARRIOR_WIDTHS) {
  await page.setViewportSize({ width: w, height: 1200 })
  await openSheet(page, WARRIOR)
  const out = `${ART}/left-panel-warrior-${w}.png`
  await shotLeftPanel(page, out)
  report.files.push({ file: out, w, kind: 'warrior' })
  console.log('warrior', w, out)
}

for (const w of HDR_WIDTHS) {
  const h = w <= 390 ? 900 : 1100
  await page.setViewportSize({ width: w, height: h })
  await openSheet(page, DARRACK)
  const cHdr = `${ART}/_tmp-hdr-cleric-${w}.png`
  await shotHeader(page, cHdr)
  await openSheet(page, TORBIN)
  const tHdr = `${ART}/_tmp-hdr-load-${w}.png`
  await shotHeader(page, tHdr)
  const out = `${ART}/hdr-pair-${w}.png`
  await composePair(page, w, cHdr, tHdr, out, `жрец · ${w}px`, `нагрузка · ${w}px`)
  report.files.push({ file: out, w, kind: 'hdr' })
  console.log('hdr', w, out)
}

for (const w of SCENE_WIDTHS) {
  const h = w <= 390 ? 900 : 1100
  await page.setViewportSize({ width: w, height: h })
  await openSheet(page, DARRACK)
  const cScene = `${ART}/_tmp-scene-cleric-${w}.png`
  await shotSceneBlock(page, cScene)
  await openSheet(page, TORBIN)
  const tScene = `${ART}/_tmp-scene-load-${w}.png`
  await shotSceneBlock(page, tScene)
  const out = `${ART}/scene-block-pair-${w}.png`
  await composePair(page, w, cScene, tScene, out, `жрец · ${w}px`, `нагрузка · ${w}px`)
  report.files.push({ file: out, w, kind: 'scene' })
  console.log('scene', w, out)
}

for (const w of [1440, 1024, 390]) {
  const h = w <= 390 ? 1100 : 1200
  await page.setViewportSize({ width: w, height: h })
  await openSheet(page, ROGUE)
  await openMobileAbilities(page, w)
  const outR = `${ART}/owned-view-rogue-${w}.png`
  await shotOwnershipView(page, outR)
  report.files.push({ file: outR, w, kind: 'owned-view-rogue' })
  console.log('owned-view rogue', w)

  await openSheet(page, WARRIOR)
  await openMobileAbilities(page, w)
  const outW = `${ART}/owned-view-warrior-${w}.png`
  await shotOwnershipView(page, outW)
  report.files.push({ file: outW, w, kind: 'owned-view-warrior' })
  console.log('owned-view warrior', w)
}

for (const who of [
  { id: ROGUE, name: 'rogue' },
  { id: WARRIOR, name: 'warrior' },
]) {
  await page.setViewportSize({ width: 1024, height: 1200 })
  await openSheet(page, who.id)
  const out = `${ART}/owned-editor-${who.name}-1024.png`
  await shotOwnershipEditor(page, out)
  report.files.push({ file: out, w: 1024, kind: `owned-editor-${who.name}` })
  console.log('owned-editor', who.name)
  await page.keyboard.press('Escape').catch(() => {})
  await page.locator('.play-desk-drawer-backdrop').click({ force: true }).catch(() => {})
}

for (const who of [
  { id: ROGUE, name: 'rogue' },
  { id: WARRIOR, name: 'warrior' },
]) {
  for (const w of DV_WIDTHS) {
    const h = w <= 390 ? 1100 : 1200
    await page.setViewportSize({ width: w, height: h })
    await openSheet(page, who.id)
    await openMobileAbilities(page, w)
    const out = `${ART}/darkvision-${who.name}-${w}.png`
    await shotDarkvision(page, out)
    report.files.push({ file: out, w, kind: `darkvision-${who.name}` })
    console.log('darkvision', who.name, w)
  }
}

// Speed +N menu: kit only on phone; still attempt 1440 for report honesty
for (const w of [1440, 390]) {
  await page.setViewportSize({ width: w, height: w <= 390 ? 900 : 1100 })
  await openSheet(page, ROGUE)
  if (w <= 390) {
    // Ensure mobile vitals visible
    await page.waitForSelector('.mobile-vitals__speed', { timeout: 10_000 }).catch(() => {})
  }
  const out = `${ART}/speed-menu-open-${w}.png`
  const box = await shotSpeedMenu(page, out)
  if (box) {
    report.files.push({ file: out, w, kind: 'speed-menu' })
    console.log('speed-menu', w)
  } else {
    console.log('speed-menu skipped', w)
  }
}

writeFileSync(`${ART}/lp01-capture-report.json`, JSON.stringify(report, null, 2))
await browser.close()
console.log('done', report.files.length)
