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
}

async function shotSceneBlock(page, path) {
  await shotClip(page, path, () => {
    const modes =
      document.querySelector('.play-desk__modes') ||
      document.querySelector('.mobile-combat-seg-stack') ||
      document.querySelector('.mobile-combat-roll')
    const skills =
      document.querySelector('.play-desk__hot--skills')?.closest('.play-desk__hot-wrap') ||
      document.querySelector('.play-desk__hot--skills')
    const turn = document.querySelector('[data-scn01-scene-turn], .scene-turn-controls')
    const strip = document.querySelector('.turn-economy-strip')
    const els = [modes, turn, strip, skills].filter(Boolean)
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

async function shotHot(page, path) {
  await shotClip(page, path, () => {
    const wrap =
      document.querySelector('.ui-scroll-row.play-desk__hot-wrap, .play-desk__hot-wrap')
    if (!wrap) return null
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
  await shotClip(page, path, () => {
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
  await shotClip(page, path, () => {
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

async function shotLeftRail(page, path) {
  await shotClip(page, path, () => {
    const left = document.querySelector('.play-desk__left')
    if (!left) return null
    const blocks = [...left.querySelectorAll('.abil-block')]
    const pick = blocks.filter((b) => /Ловк|Мудр/i.test(b.textContent || ''))
    const els = pick.length ? pick : blocks.slice(0, 3)
    const foot = left.querySelector('.play-desk__rail-foot')
    const all = [...els, foot].filter(Boolean)
    if (!all.length) return null
    // Scroll first picked block into view so skills aren't off-screen
    els[0]?.scrollIntoView?.({ block: 'start' })
    let top = Infinity
    let leftX = Infinity
    let right = 0
    let bottom = 0
    for (const el of all) {
      const r = el.getBoundingClientRect()
      top = Math.min(top, r.top)
      leftX = Math.min(leftX, r.left)
      right = Math.max(right, r.right)
      bottom = Math.max(bottom, r.bottom)
    }
    const y = Math.max(0, Math.round(top) - 4)
    const height = Math.min(
      window.innerHeight - y - 8,
      Math.max(40, Math.round(bottom - top) + 8),
    )
    return {
      x: Math.max(0, Math.round(leftX) - 4),
      y,
      width: Math.max(40, Math.round(right - leftX) + 8),
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

async function composePair(page, w, aPath, bPath, outPath, labelA, labelB) {
  await page.setViewportSize({ width: Math.max(w, 400), height: 1200 })
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

const report = { files: [], notes: [] }
const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage()
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
await login(page)

for (const w of WIDTHS) {
  const h = w <= 390 ? 900 : 1100
  await page.setViewportSize({ width: w, height: h })

  await openSheet(page, DARRACK)
  const cScene = `${ART}/_tmp-scene-cleric-${w}.png`
  await shotSceneBlock(page, cScene)
  await openSheet(page, TORBIN)
  const tScene = `${ART}/_tmp-scene-load-${w}.png`
  await shotSceneBlock(page, tScene)
  const sceneOut = `${ART}/scene-block-pair-${w}.png`
  await composePair(page, w, cScene, tScene, sceneOut, `жрец · ${w}px`, `нагрузка · ${w}px`)
  report.files.push(sceneOut)

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

  // Empty states — paladin (no conditions)
  await openSheet(page, PALADIN)
  const emptyOut = `${ART}/hotbar-empty-states-${w}.png`
  await shotHot(page, emptyOut)
  report.files.push(emptyOut)

  // Paladin −/+ counter
  const palOut = `${ART}/hotbar-paladin-${w}.png`
  await shotHot(page, palOut)
  report.files.push(palOut)

  // Rogue skills
  await openSheet(page, ROGUE)
  // ensure combat scene for skill strip
  const combatTab = page.getByRole('button', { name: /^Бой$/ })
  if (await combatTab.count()) await combatTab.first().click().catch(() => {})
  await page.waitForTimeout(300)
  const skillsOut = `${ART}/skills-rogue-${w}.png`
  await shotSkills(page, skillsOut)
  report.files.push(skillsOut)
}

await page.setViewportSize({ width: 1440, height: 1400 })
await openSheet(page, ROGUE)
const expandAll = page.getByRole('button', { name: /Развернуть все/i })
if (await expandAll.count()) {
  await expandAll.first().click().catch(() => {})
  await page.waitForTimeout(400)
}
const leftOut = `${ART}/left-panel-rogue-1440.png`
await shotLeftRail(page, leftOut)
report.files.push(leftOut)

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
