/**
 * SCN-01: real Play Desk screenshots (scene block + hot panel + skills + left rail).
 * Requires API + vite + seed_scn01_chars.py.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const DARRACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const TORBIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
const ROGUE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
const PALADIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'
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

async function shotClip(page, path, fn) {
  const box = await page.evaluate(fn)
  if (!box) throw new Error(`no clip for ${path}`)
  await page.screenshot({ path, clip: box })
  return box
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
    // Probe: tools on one line?
    const toolsEl = document.querySelector('.play-desk__mode-tools')
    let toolsOneLine = null
    if (toolsEl) {
      const kids = [...toolsEl.children].filter((c) => c.getBoundingClientRect().height > 0)
      if (kids.length >= 2) {
        const tops = kids.map((c) => Math.round(c.getBoundingClientRect().top))
        toolsOneLine = Math.max(...tops) - Math.min(...tops) <= 4
      }
    }
    const hint = document.querySelector('.play-desk__mode-hint')
    const hintVisible = Boolean(
      hint && getComputedStyle(hint).display !== 'none' && hint.getBoundingClientRect().height > 0,
    )
    window.__scn01SceneProbe = { toolsOneLine, hintVisible }
    return {
      x: Math.max(0, Math.round(left) - 4),
      y: Math.max(0, Math.round(top) - 4),
      width: Math.max(40, Math.round(right - left) + 8),
      height: Math.max(40, Math.round(bottom - top) + 8),
    }
  })
}

async function shotHot(page, path) {
  return shotClip(page, path, () => {
    const wrap = document.querySelector(
      '.ui-scroll-row.play-desk__hot-wrap, .play-desk__hot-wrap',
    )
    if (!wrap) return null
    const hot = wrap.querySelector('.play-desk__hot:not(.play-desk__hot--skills)') || wrap
    const heights = [...hot.querySelectorAll('.play-desk__hot-item')].map((el) =>
      Math.round(el.getBoundingClientRect().height),
    )
    window.__scn01HotHeights = heights
    const r = wrap.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.x)),
      y: Math.max(0, Math.round(r.y)),
      width: Math.max(1, Math.min(window.innerWidth - 2, Math.round(r.width))),
      height: Math.max(1, Math.round(r.height)),
    }
  })
}

async function shotHeader(page, path) {
  return shotClip(page, path, () => {
    const desk = document.querySelector('.play-desk')
    if (!desk) return null
    const wide = desk.classList.contains('play-desk--wide')
    let root = wide
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

async function shotSkills(page, path) {
  return shotClip(page, path, () => {
    const skills =
      document.querySelector('.play-desk__hot--skills')?.closest('.play-desk__hot-wrap') ||
      document.querySelector('.play-desk__hot--skills')
    if (!skills) return null
    const r = skills.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.x) - 4),
      y: Math.max(0, Math.round(r.y) - 4),
      width: Math.max(40, Math.round(r.width) + 8),
      height: Math.max(40, Math.round(r.height) + 8),
    }
  })
}

async function expandAbilities(page) {
  const expandAll = page.getByRole('button', { name: /Развернуть все/i })
  if (await expandAll.count()) {
    await expandAll.first().click().catch(() => {})
    await page.waitForTimeout(400)
  }
}

async function shotLeftRail(page, path) {
  await expandAbilities(page)
  // Scroll left column so passives are in view together with Dex/Wis
  await page.evaluate(() => {
    const left = document.querySelector('.play-desk__left')
    const foot = left?.querySelector('.play-desk__rail-foot, .play-desk__passives')
    const dex = [...(left?.querySelectorAll('.abil-block') || [])].find((b) =>
      /Ловк/i.test(b.textContent || ''),
    )
    dex?.scrollIntoView?.({ block: 'start' })
    foot?.scrollIntoView?.({ block: 'nearest' })
  })
  await page.waitForTimeout(200)
  return shotClip(page, path, () => {
    const left = document.querySelector('.play-desk__left')
    if (!left) return null
    const r = left.getBoundingClientRect()
    // Prefer full left column (abilities + passives + ownership)
    const y = Math.max(0, Math.round(r.top))
    const height = Math.min(
      window.innerHeight - y - 4,
      Math.max(200, Math.round(r.height)),
    )
    return {
      x: Math.max(0, Math.round(r.left) - 2),
      y,
      width: Math.max(40, Math.round(r.width) + 4),
      height,
    }
  })
}

async function scrollHot(page, toEnd) {
  await page.evaluate((end) => {
    const hot =
      document.querySelector('.play-desk__hot-wrap .play-desk__hot:not(.play-desk__hot--skills)') ||
      document.querySelector('.play-desk__hot:not(.play-desk__hot--skills)')
    if (!hot) return
    hot.scrollLeft = end ? Math.max(0, hot.scrollWidth - hot.clientWidth) : 0
    hot.dispatchEvent(new Event('scroll'))
  }, toEnd)
  await page.waitForTimeout(200)
}

/** Scroll hot row so Lay on Hands / compact stepper card is fully visible. */
async function scrollHotToCompact(page) {
  await page.evaluate(() => {
    const hot =
      document.querySelector('.play-desk__hot-wrap .play-desk__hot:not(.play-desk__hot--skills)') ||
      document.querySelector('.play-desk__hot:not(.play-desk__hot--skills)')
    if (!hot) return
    const card =
      [...hot.querySelectorAll('.play-desk__hot-item--res-compact')].find((el) =>
        /рук|Hands|налож|Возлож/i.test(el.textContent || ''),
      ) || hot.querySelector('.play-desk__hot-item--res-compact')
    if (!card) return
    const left = card.offsetLeft - 8
    hot.scrollLeft = Math.max(0, left)
    hot.dispatchEvent(new Event('scroll'))
  })
  await page.waitForTimeout(250)
}

async function composePair(page, w, aPath, bPath, outPath, labelA, labelB) {
  await page.setViewportSize({ width: Math.max(w, 400), height: 1400 })
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

const report = { files: [], probes: {}, heights: {} }
const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage()
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
await login(page)

for (const w of WIDTHS) {
  const h = w <= 390 ? 900 : 1200
  await page.setViewportSize({ width: w, height: h })

  await openSheet(page, DARRACK)
  const cScene = `${ART}/_tmp-scene-cleric-${w}.png`
  await shotSceneBlock(page, cScene)
  const sceneProbeCleric = await page.evaluate(() => window.__scn01SceneProbe || null)
  await openSheet(page, TORBIN)
  const tScene = `${ART}/_tmp-scene-load-${w}.png`
  await shotSceneBlock(page, tScene)
  const sceneProbeLoad = await page.evaluate(() => window.__scn01SceneProbe || null)
  const sceneOut = `${ART}/scene-block-pair-${w}.png`
  await composePair(page, w, cScene, tScene, sceneOut, `жрец · ${w}px`, `нагрузка · ${w}px`)
  report.files.push(sceneOut)
  report.probes[`scene-${w}`] = { cleric: sceneProbeCleric, load: sceneProbeLoad }

  for (const state of ['start', 'end']) {
    await openSheet(page, DARRACK)
    await scrollHot(page, state === 'end')
    const cHot = `${ART}/_tmp-hot-cleric-${w}-${state}.png`
    await shotHot(page, cHot)
    await openSheet(page, TORBIN)
    await scrollHot(page, state === 'end')
    const tHot = `${ART}/_tmp-hot-load-${w}-${state}.png`
    await shotHot(page, tHot)
    const hotOut = `${ART}/hotbar-pair-${w}-${state}.png`
    await composePair(page, w, cHot, tHot, hotOut, `жрец · ${w}px`, `нагрузка · ${w}px`)
    report.files.push(hotOut)
  }
}

for (const w of [1440, 390]) {
  const h = w <= 390 ? 900 : 1100
  await page.setViewportSize({ width: w, height: h })

  await openSheet(page, PALADIN)
  if (w <= 390) await scrollHotToCompact(page)
  else await scrollHot(page, false)
  const emptyOut = `${ART}/hotbar-empty-states-${w}.png`
  await shotHot(page, emptyOut)
  report.files.push(emptyOut)
  report.heights[`empty-${w}`] = await page.evaluate(() => window.__scn01HotHeights || [])

  const palOut = `${ART}/hotbar-paladin-${w}.png`
  if (w <= 390) await scrollHotToCompact(page)
  await shotHot(page, palOut)
  report.files.push(palOut)
  report.heights[`paladin-${w}`] = await page.evaluate(() => window.__scn01HotHeights || [])

  await openSheet(page, ROGUE)
  const combatTab = page.getByRole('button', { name: /^Бой$/ })
  if (await combatTab.count()) await combatTab.first().click().catch(() => {})
  await page.waitForTimeout(300)
  const skillsOut = `${ART}/skills-rogue-${w}.png`
  await shotSkills(page, skillsOut)
  report.files.push(skillsOut)
}

for (const w of [1440, 1024]) {
  await page.setViewportSize({ width: w, height: 1600 })
  await openSheet(page, ROGUE)
  const rogueLeft = `${ART}/left-panel-rogue-${w}.png`
  await shotLeftRail(page, rogueLeft)
  report.files.push(rogueLeft)

  await openSheet(page, TORBIN)
  const warriorLeft = `${ART}/left-panel-warrior-${w}.png`
  await shotLeftRail(page, warriorLeft)
  report.files.push(warriorLeft)
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
  const hdrOut = `${ART}/hdr-pair-${w}.png`
  await composePair(page, w, cHdr, tHdr, hdrOut, `жрец · ${w}px`, `нагрузка · ${w}px`)
  report.files.push(hdrOut)
}

writeFileSync(`${ART}/scn01-report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
