/**
 * CMB-01: combat scene screenshots (rogue/warrior pairs, caster, hdr/scene control, speed tip).
 * Requires API :8000 + vite :5173 + seed_lp01_chars.py
 */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.CMB01_BASE || 'http://127.0.0.1:5173'
const TAG = process.env.CMB01_TAG || '' // e.g. 'main-' for control captures
const CLERIC = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const ROGUE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
const WARRIOR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'
const WIDTHS = [1920, 1440, 1280, 1024, 768, 390]
const HDR_WIDTHS = [1920, 1440, 1280, 1024, 768, 390]
const SCENE_WIDTHS = [1920, 1440, 1280, 1024, 768, 390]
const SPEED_WIDTHS = [1440, 1024, 390]
const CASTER_WIDTHS = [1440, 390]

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
  // Desktop / phone: scene «Бой»
  if (w < 960) {
    const mobileNav = page.locator('.mobile-scene-nav button, .mobile-scene-nav__tab, [data-scene="combat"]').filter({ hasText: /Бой/i })
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
    // Phone combat: ensure Атаки segment (not Основное / Заклинания)
    const atk = page.locator('.mobile-combat-seg__btn').filter({ hasText: /^Атаки$/ })
    if (await atk.count()) {
      await atk.first().click().catch(() => {})
      await page.waitForTimeout(250)
    }
  }
  await page.waitForSelector('.play-desk-compact, [data-onboarding="actions"]', {
    timeout: 15_000,
  }).catch(() => {})
  // Wait until attack rows or empty-state are painted
  await page.waitForSelector('.play-desk-compact__row, .play-desk-compact', { timeout: 10_000 }).catch(() => {})
}

async function openCombatMagic(page, w) {
  await openCombatScene(page, w)
  // Desktop: «магия» split — only turn ON (do not toggle off if already is-on)
  // Mobile: tab «Заклинания» → surface «Бой»
  if (w < 960) {
    const spellsTab = page.locator('.mobile-combat-seg__btn').filter({ hasText: /Заклинания/i })
    if (await spellsTab.count()) {
      await spellsTab.first().click().catch(() => {})
      await page.waitForTimeout(350)
    }
    const combatSurf = page.locator('.mobile-combat-seg__btn').filter({ hasText: /^Бой$/ })
    if (await combatSurf.count()) {
      await combatSurf.first().click().catch(() => {})
      await page.waitForTimeout(250)
    }
  } else {
    const magicOn = await page.locator('.play-desk__split-btn.is-on').count()
    if (!magicOn) {
      const magic = page.locator('.play-desk__split-btn').filter({ hasText: /магия/i })
      if (await magic.count()) {
        await magic.first().click().catch(() => {})
        await page.waitForTimeout(400)
      }
    }
  }
  await page.waitForSelector(
    '.play-desk-compact__row.is-spell, .play-desk-compact h3:has-text("Заклинания"), .spells-compact, .play-desk-compact',
    { timeout: 10_000 },
  ).catch(() => {})
}

async function shotClip(page, path, fn, arg) {
  const box = await page.evaluate(fn, arg)
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

async function shotSceneBlock(page, path) {
  // Mobile: skills sit above the attacks panel and bottom nav below it — a single
  // bbox would swallow Атаки. Capture top chrome + nav as separate bands and stack.
  const bands = await page.evaluate(() => {
    function rectOf(el) {
      if (!el) return null
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return null
      return {
        x: Math.max(0, Math.round(r.left)),
        y: Math.max(0, Math.round(r.top)),
        width: Math.max(2, Math.round(r.width)),
        height: Math.max(2, Math.round(r.height)),
      }
    }
    function union(rects) {
      const ok = rects.filter(Boolean)
      if (!ok.length) return null
      let top = Infinity
      let left = Infinity
      let right = 0
      let bottom = 0
      for (const r of ok) {
        top = Math.min(top, r.y)
        left = Math.min(left, r.x)
        right = Math.max(right, r.x + r.width)
        bottom = Math.max(bottom, r.y + r.height)
      }
      return {
        x: Math.max(0, left - 4),
        y: Math.max(0, top - 4),
        width: Math.max(40, right - left + 8),
        height: Math.max(40, bottom - top + 8),
      }
    }
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
    const nav = document.querySelector('.mobile-scene-nav')
    const desk = document.querySelector('.play-desk')
    const mobile = Boolean(desk?.classList.contains('play-desk--mobile'))
    if (!mobile) {
      return {
        mobile: false,
        clip: union(
          [modes, tools, mobileRoll, turn, strip, skills, nav].map(rectOf),
        ),
      }
    }
    const topClip = union([mobileRoll, turn, strip, skills, tools, modes].map(rectOf))
    const navClip = union([nav].map(rectOf))
    return { mobile: true, topClip, navClip }
  })
  if (!bands) throw new Error(`no scene bands for ${path}`)
  if (!bands.mobile) {
    if (!bands.clip) throw new Error(`no scene clip for ${path}`)
    await page.screenshot({ path, clip: bands.clip })
    return bands.clip
  }
  if (!bands.topClip) throw new Error(`no scene top for ${path}`)
  const topBuf = await page.screenshot({ clip: bands.topClip })
  const navBuf = bands.navClip ? await page.screenshot({ clip: bands.navClip }) : null
  // Compose top + gap label + nav on cream canvas via page canvas
  const stacked = await page.evaluate(
    async ({ topB64, navB64 }) => {
      async function load(src) {
        const img = new Image()
        img.src = src
        await img.decode()
        return img
      }
      const top = await load(`data:image/png;base64,${topB64}`)
      const nav = navB64 ? await load(`data:image/png;base64,${navB64}`) : null
      const gap = 16
      const width = Math.max(top.width, nav?.width || 0) + 16
      const height = top.height + (nav ? nav.height + gap : 0) + 16
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fbf7ec'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(top, 8, 8)
      if (nav) {
        ctx.fillStyle = '#c4b89a'
        ctx.fillRect(8, 8 + top.height + gap / 2 - 1, width - 16, 1)
        ctx.drawImage(nav, 8, 8 + top.height + gap)
      }
      return canvas.toDataURL('image/png')
    },
    {
      topB64: topBuf.toString('base64'),
      navB64: navBuf ? navBuf.toString('base64') : null,
    },
  )
  writeFileSync(path, Buffer.from(stacked.replace(/^data:image\/png;base64,/, ''), 'base64'))
  return bands
}

async function shotCombatPanel(page, path, { preferSpells = false } = {}) {
  await page.evaluate((preferSpells) => {
    const comps = [...document.querySelectorAll('.play-desk-compact')]
    let el = null
    if (preferSpells) {
      el =
        comps.find((c) => /Заклинания/i.test(c.querySelector('h3')?.textContent || '')) ||
        document.querySelector('.play-desk-compact__row.is-spell')?.closest('.play-desk-compact') ||
        comps[comps.length - 1]
    }
    if (!el) {
      el =
        document.querySelector('.play-desk-compact[data-onboarding="actions"]') ||
        comps.find((c) => /Атаки/i.test(c.querySelector('h3')?.textContent || '')) ||
        comps[0] ||
        document.querySelector('.play-desk__stage-panel:not([hidden])')
    }
    el?.scrollIntoView?.({ block: 'start' })
  }, preferSpells)
  await page.waitForTimeout(250)
  return shotClip(page, path, (preferSpells) => {
    const comps = [...document.querySelectorAll('.play-desk-compact')]
    let el = null
    if (preferSpells) {
      el =
        comps.find((c) => /Заклинания/i.test(c.querySelector('h3')?.textContent || '')) ||
        document.querySelector('.play-desk-compact__row.is-spell')?.closest('.play-desk-compact') ||
        comps[comps.length - 1]
    }
    if (!el) {
      el =
        document.querySelector('.play-desk-compact[data-onboarding="actions"]') ||
        comps.find((c) => /Атаки/i.test(c.querySelector('h3')?.textContent || '')) ||
        comps[0]
    }
    const stage = document.querySelector('.play-desk__stage-panel:not([hidden])')
      || document.querySelector('.play-desk__stage')
    el = el || stage
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width < 40 || r.height < 40) return null
    const y = Math.max(0, Math.round(r.top))
    const height = Math.min(
      window.innerHeight - y - 4,
      Math.max(180, Math.round(r.height) + 8),
    )
    return {
      x: Math.max(0, Math.round(r.left) - 4),
      y,
      width: Math.max(80, Math.round(r.width) + 8),
      height,
    }
  }, preferSpells)
}

async function composePair(page, w, aPath, bPath, outPath, labelA, labelB) {
  await page.setViewportSize({ width: Math.max(w, 400), height: 2200 })
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

async function shotSpeedMenuOpen(page, path) {
  const summary = page
    .locator(
      [
        '.mobile-vitals__speed > summary',
        '.mobile-vitals__speed .ui-vital-menu__summary',
        '.play-desk-speed-menu > summary',
      ].join(', '),
    )
    .first()
  if (!(await summary.count())) return null
  await summary.click()
  await page.waitForTimeout(400)
  // Hover the tile so native/kit tip would appear if not suppressed
  await summary.hover({ force: true }).catch(() => {})
  await page.waitForTimeout(500)
  // Fake OS cursor on the speed tile (headless has no cursor)
  await page.evaluate(() => {
    const host =
      document.querySelector('.mobile-vitals__speed > summary') ||
      document.querySelector('.play-desk-speed-menu > summary') ||
      document.querySelector('.mobile-vitals__speed') ||
      document.querySelector('.play-desk-speed-menu')
    if (!host) return
    const r = host.getBoundingClientRect()
    let cur = document.getElementById('cmb01-fake-cursor')
    if (!cur) {
      cur = document.createElement('div')
      cur.id = 'cmb01-fake-cursor'
      cur.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 3l12 8.5-5.2 1.4L8.5 21z" fill="#1a1a18" stroke="#fbf7ec" stroke-width="1.2"/></svg>'
      Object.assign(cur.style, {
        position: 'fixed',
        zIndex: '2147483647',
        pointerEvents: 'none',
        width: '22px',
        height: '22px',
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.35))',
      })
      document.body.appendChild(cur)
    }
    cur.style.left = `${Math.round(r.left + r.width * 0.55)}px`
    cur.style.top = `${Math.round(r.top + r.height * 0.55)}px`
  })
  const box = await page.evaluate(() => {
    const panel =
      document.querySelector('.ui-vital-menu__panel.ui-menu__panel--portal') ||
      document.querySelector('.ui-menu__panel--portal') ||
      document.querySelector('.ui-vital-menu__panel')
    const host =
      document.querySelector('.mobile-vitals__speed') ||
      document.querySelector('.play-desk-speed-menu')
    const tip = document.querySelector('.onboarding-hover-tip__card--fixed')
    window.__cmb01SpeedTipVisible = Boolean(
      tip && tip.getBoundingClientRect().width > 0 && getComputedStyle(tip).display !== 'none',
    )
    window.__cmb01SpeedMenuOpen = Boolean(
      document.querySelector('.play-desk-speed-menu[data-menu-open="true"], .mobile-vitals__speed[data-menu-open="true"], details.ui-menu[open]'),
    )
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
      x: Math.max(0, Math.round(left) - 8),
      y: Math.max(0, Math.round(top) - 8),
      width: Math.max(100, Math.round(right - left) + 16),
      height: Math.max(100, Math.round(bottom - top) + 16),
    }
  })
  if (!box) return null
  await page.screenshot({ path, clip: box })
  await page.evaluate(() => document.getElementById('cmb01-fake-cursor')?.remove())
  const probe = await page.evaluate(() => ({
    tipVisible: window.__cmb01SpeedTipVisible,
    menuOpen: window.__cmb01SpeedMenuOpen,
  }))
  return { box, ...probe }
}

const report = { files: [], probes: {}, base: BASE, tag: TAG }
const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage()
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await login(page)

const only = process.env.CMB01_ONLY || 'all'

if (only === 'all' || only === 'combat') {
  for (const w of WIDTHS) {
    const h = w <= 390 ? 1400 : 1600
    await page.setViewportSize({ width: w, height: h })
    await openSheet(page, ROGUE)
    await openCombatScene(page, w)
    const rTmp = outName(`_tmp-combat-rogue-${w}.png`)
    await shotCombatPanel(page, rTmp)

    await openSheet(page, WARRIOR)
    await openCombatScene(page, w)
    const wTmp = outName(`_tmp-combat-warrior-${w}.png`)
    await shotCombatPanel(page, wTmp)

    const out = outName(`combat-pair-${w}.png`)
    await composePair(page, w, rTmp, wTmp, out, `плут · ${w}px`, `воин · ${w}px`)
    report.files.push({ file: out, w, kind: 'combat-pair' })
    console.log('combat-pair', w)
  }
}

if (only === 'all' || only === 'caster') {
  for (const w of CASTER_WIDTHS) {
    const h = w <= 390 ? 1400 : 1600
    await page.setViewportSize({ width: w, height: h })
    await openSheet(page, CLERIC)
    await openCombatMagic(page, w)
    const out = outName(`combat-caster-${w}.png`)
    await shotCombatPanel(page, out, { preferSpells: true })
    report.files.push({ file: out, w, kind: 'combat-caster' })
    console.log('combat-caster', w)
  }
}

if (only === 'all' || only === 'hdr' || only === 'control') {
  for (const w of HDR_WIDTHS) {
    const h = w <= 390 ? 900 : 1100
    await page.setViewportSize({ width: w, height: h })
    await openSheet(page, ROGUE)
    const a = outName(`_tmp-hdr-rogue-${w}.png`)
    await shotHeader(page, a)
    await openSheet(page, WARRIOR)
    const b = outName(`_tmp-hdr-warrior-${w}.png`)
    await shotHeader(page, b)
    const out = outName(`hdr-pair-${w}.png`)
    await composePair(page, w, a, b, out, `плут · ${w}px`, `воин · ${w}px`)
    report.files.push({ file: out, w, kind: 'hdr-pair' })
    console.log('hdr-pair', w)
  }
}

if (only === 'all' || only === 'scene' || only === 'control') {
  for (const w of SCENE_WIDTHS) {
    const h = w <= 390 ? 1000 : 1200
    await page.setViewportSize({ width: w, height: h })
    await openSheet(page, ROGUE)
    await openCombatScene(page, w)
    const a = outName(`_tmp-scene-rogue-${w}.png`)
    await shotSceneBlock(page, a)
    await openSheet(page, WARRIOR)
    await openCombatScene(page, w)
    const b = outName(`_tmp-scene-warrior-${w}.png`)
    await shotSceneBlock(page, b)
    const out = outName(`scene-block-pair-${w}.png`)
    await composePair(page, w, a, b, out, `плут · ${w}px`, `воин · ${w}px`)
    report.files.push({ file: out, w, kind: 'scene-block-pair' })
    console.log('scene-block-pair', w)
  }
}

if (only === 'all' || only === 'speed') {
  for (const w of SPEED_WIDTHS) {
    await page.setViewportSize({ width: w, height: w <= 390 ? 900 : 1100 })
    await openSheet(page, ROGUE)
    const out = outName(`speed-menu-open-${w}.png`)
    const probe = await shotSpeedMenuOpen(page, out)
    report.files.push({ file: out, w, kind: 'speed-menu-open', probe })
    report.probes[`speed-${w}`] = probe
    console.log('speed-menu-open', w, probe)
    await page.keyboard.press('Escape').catch(() => {})
    // click outside to close
    await page.mouse.click(5, 5).catch(() => {})
  }
}

writeFileSync(outName('cmb01-capture-report.json'), JSON.stringify(report, null, 2))
await browser.close()
console.log('done', report.files.length, 'files')
