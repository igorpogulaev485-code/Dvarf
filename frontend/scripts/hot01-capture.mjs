/**
 * HOT-01: pair screenshots of real Play Desk hot bar (cleric / loaded).
 * Requires API + vite + seed_uikit03_hot_chars.py.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const DARRACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const TORBIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
const WIDTHS = (process.env.HOT01_WIDTHS || '1920,1440,1280,1024,768,390')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0)
const HDR_WIDTHS = (process.env.HOT01_HDR_WIDTHS || '1440,1024,390')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0)
const SKIP_HDR = process.env.HOT01_SKIP_HDR === '1'
const ITEM_SEL = ':scope > .play-desk__hot-item, :scope > .play-desk__hot-more'

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
    document
      .querySelectorAll('[data-onboarding], .onboarding-modal, .coachmark, .welcome-card')
      .forEach((el) => {
        if (el instanceof HTMLElement && !el.closest?.('.play-desk__top, .play-desk__mobile-chrome, .mobile-vitals')) {
          /* keep combat-header anchors visible */
        }
      })
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
  await page.waitForTimeout(900)
  await dismissOnboarding(page)
  await page.evaluate(() => {
    document.querySelectorAll('details[open]').forEach((d) => {
      if (!d.closest('.play-desk__top, .play-desk__mobile-chrome')) {
        d.removeAttribute('open')
      }
    })
    document
      .querySelectorAll('.ui-chip.is-tip-open')
      .forEach((el) => el.classList.remove('is-tip-open'))
  })
  const expand = page.getByRole('button', { name: /Развернуть шапку/i })
  if (await expand.count()) {
    await expand.first().click().catch(() => {})
    await page.waitForTimeout(250)
  }
  await page.waitForSelector('.play-desk__hot-wrap', { timeout: 20_000 })
  // Wait until desk chrome has a real box (desktop top / mobile vitals).
  await page.waitForFunction(() => {
    const desk = document.querySelector('.play-desk')
    if (!desk) return false
    const wide = desk.classList.contains('play-desk--wide')
    const el = wide
      ? document.querySelector('.play-desk__top')
      : document.querySelector('.play-desk__mobile-chrome, .mobile-vitals')
    if (!el) return false
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return cs.display !== 'none' && r.width > 80 && r.height > 40
  }, { timeout: 15_000 }).catch(() => {})
}

async function hotProbe(page) {
  return page.evaluate((itemSel) => {
    const wrap = document.querySelector('.play-desk__hot-wrap')
    const hot = wrap?.querySelector('.play-desk__hot') || document.querySelector('.play-desk__hot')
    if (!hot) return { error: 'no hot' }
    const names = [...hot.querySelectorAll('.play-desk__hot-res-name')].map((el) =>
      (el.textContent || '').trim(),
    )
    const counts = names.reduce((acc, n) => {
      acc[n] = (acc[n] || 0) + 1
      return acc
    }, {})
    const dups = Object.entries(counts).filter(([, c]) => c > 1)
    const first = hot.querySelector(itemSel)
    const hotBox = hot.getBoundingClientRect()
    const firstLeft = first
      ? Math.round(first.getBoundingClientRect().left - hotBox.left)
      : null
    const states = hot.querySelector('.play-desk__hot-item--states')
    const statesW = states ? Math.round(states.getBoundingClientRect().width) : null
    const more = states?.querySelector('.play-desk__hot-cond-more')
    const leftEdge = wrap?.querySelector('.ui-scroll-row__edge--left')
    const leftEdgeW = leftEdge ? leftEdge.getBoundingClientRect().width : 0
    let leftmostFullRes = null
    const fadeRight = hotBox.left + leftEdgeW
    for (const el of hot.querySelectorAll('.play-desk__hot-item--res')) {
      const r = el.getBoundingClientRect()
      if (r.left >= fadeRight - 1 && r.right <= hotBox.right + 1) {
        leftmostFullRes = {
          name: (el.querySelector('.play-desk__hot-res-name')?.textContent || '').trim(),
          left: Math.round(r.left - hotBox.left),
          clearOfFade: r.left >= fadeRight - 1,
        }
        break
      }
    }
    const pad =
      Number.parseFloat(getComputedStyle(hot).scrollPaddingInlineStart || '0') ||
      0
    const viewLeft = hot.scrollLeft
    const fadeEnd = viewLeft + pad
    const items = Array.from(hot.querySelectorAll(itemSel))
    const spacer = hot.querySelector('.ui-scroll-row__end-spacer')
    const spacerPx = spacer ? Math.round(spacer.getBoundingClientRect().width) : 0

    let leftFadeOverlapPx = 0
    let fadeCoversSubstantial = false
    for (const item of items) {
      const left = item.offsetLeft
      const right = left + item.offsetWidth
      if (right <= viewLeft + 1) continue
      if (left >= viewLeft + hot.clientWidth - 1) break
      if (left < viewLeft - 1) continue // remnant OK
      const thin = Math.min(pad, Math.floor(item.offsetWidth * 0.35))
      const pastFade = Math.max(0, right - fadeEnd)
      const substantial = pastFade >= thin
      if (!substantial) continue
      if (left < fadeEnd - 1) {
        fadeCoversSubstantial = true
        leftFadeOverlapPx = Math.max(0, Math.round(fadeEnd - left))
      }
      break
    }

    let fullCardsVisible = 0
    for (const item of items) {
      const left = item.offsetLeft
      const right = left + item.offsetWidth
      if (left >= viewLeft - 1 && right <= viewLeft + hot.clientWidth + 1) {
        fullCardsVisible += 1
      }
    }

    const last = items[items.length - 1]
    const lastRight = last ? last.offsetLeft + last.offsetWidth : 0
    const lastCardFullyVisible = last
      ? lastRight <= viewLeft + hot.clientWidth + 2
      : true
    const lastLabel = last
      ? (
          last.querySelector('.play-desk__hot-res-name')?.textContent ||
          last.querySelector('.play-desk__hot-label')?.textContent ||
          ''
        ).trim().slice(0, 40)
      : null
    const max = Math.max(0, hot.scrollWidth - hot.clientWidth)
    const atMax = max <= 2 ? hot.scrollLeft <= 2 : hot.scrollLeft >= max - 2
    const rightEmptyPx = last
      ? Math.round(viewLeft + hot.clientWidth - lastRight)
      : Math.round(hot.clientWidth)
    const rightEdge = wrap?.querySelector('.ui-scroll-row__edge--right')
    // Natural fit: content without spacer would fit (approx scrollWidth - spacer)
    const naturalScrollWidth = Math.max(0, hot.scrollWidth - spacerPx)
    const contentFits = naturalScrollWidth <= hot.clientWidth + 1
    const scrollWhenFits = contentFits && max > 2

    return {
      names,
      dups,
      firstLeft,
      padL: getComputedStyle(hot).paddingLeft,
      scrollPad: getComputedStyle(hot).scrollPaddingInlineStart,
      leftEdgeW: Math.round(leftEdgeW),
      rightEdgeVisible: Boolean(rightEdge),
      leftEdgeVisible: Boolean(leftEdge),
      leftmostFullRes,
      statesW,
      moreText: more ? (more.textContent || '').trim() : null,
      scrollLeft: Math.round(hot.scrollLeft),
      scrollWidth: hot.scrollWidth,
      clientWidth: hot.clientWidth,
      max: Math.round(max),
      atMax,
      spacerPx,
      contentFits,
      scrollWhenFits,
      fadeCoversSubstantial,
      leftmostSubstantialClear: !fadeCoversSubstantial,
      leftFadeOverlapPx,
      lastCardFullyVisible,
      lastLabel,
      rightEmptyPx,
      fullCardsVisible,
    }
  }, ITEM_SEL)
}

/** Mirror of computeEndSnapScrollLeft — end ≈ max, limited pull-back. */
function computeEndSnapScrollLeft(items, clientWidth, scrollWidth, pad, clearance = 8) {
  const max = Math.max(0, scrollWidth - clientWidth)
  if (items.length === 0 || max <= 0) return 0
  const fadeEnd = max + pad
  for (const item of items) {
    const left = item.left
    const right = left + item.width
    if (right <= max + 1) continue
    if (left >= max + clientWidth - 1) break
    const thin = Math.min(pad, Math.floor(item.width * 0.35))
    const pastFade = Math.max(0, right - fadeEnd)
    if (pastFade < thin) continue
    if (left < max - 1) continue
    if (left < fadeEnd - 1) {
      const target = Math.max(0, Math.min(max, left - pad - clearance))
      const last = items[items.length - 1]
      const lastRight = last.left + last.width
      if (lastRight <= target + clientWidth + 2) return target
    }
    break
  }
  return max
}

/** Start = 0; end = kit end-snap (max or limited pull-back). */
async function scrollHot(page, toEnd) {
  await page.evaluate((end) => {
    const hot =
      document.querySelector('.play-desk__hot-wrap .play-desk__hot') ||
      document.querySelector('.play-desk__hot')
    if (!hot) return
    if (!end) hot.scrollLeft = 0
    else hot.scrollLeft = Math.max(0, hot.scrollWidth - hot.clientWidth)
    hot.dispatchEvent(new Event('scroll'))
  }, toEnd)
  await page.waitForTimeout(250)
  if (toEnd) {
    const layout = await page.evaluate((itemSel) => {
      const hot =
        document.querySelector('.play-desk__hot-wrap .play-desk__hot') ||
        document.querySelector('.play-desk__hot')
      if (!hot) return null
      const pad =
        Number.parseFloat(getComputedStyle(hot).scrollPaddingInlineStart || '0') ||
        0
      const nodes = Array.from(hot.querySelectorAll(itemSel))
      return {
        pad,
        clientWidth: hot.clientWidth,
        scrollWidth: hot.scrollWidth,
        items: nodes.map((n) => ({ left: n.offsetLeft, width: n.offsetWidth })),
      }
    }, ITEM_SEL)
    if (layout) {
      const snapped = computeEndSnapScrollLeft(
        layout.items,
        layout.clientWidth,
        layout.scrollWidth,
        layout.pad,
      )
      await page.evaluate((sl) => {
        const hot =
          document.querySelector('.play-desk__hot-wrap .play-desk__hot') ||
          document.querySelector('.play-desk__hot')
        if (!hot) return
        hot.scrollLeft = sl
        hot.dispatchEvent(new Event('scroll'))
      }, snapped)
    }
    await page.waitForTimeout(150)
  }
}

async function shotHotCrop(page, path) {
  const box = await page.evaluate(() => {
    const wrap = document.querySelector('.ui-scroll-row.play-desk__hot-wrap, .play-desk__hot-wrap')
    if (!wrap) return null
    const r = wrap.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.x)),
      y: Math.max(0, Math.round(r.y)),
      width: Math.max(1, Math.min(window.innerWidth - 2, Math.round(r.width))),
      height: Math.max(1, Math.round(r.height)),
    }
  })
  if (!box) throw new Error('no hot box')
  await page.screenshot({ path, clip: box })
}

async function shotHeader(page, path) {
  const box = await page.evaluate(() => {
    const desk = document.querySelector('.play-desk')
    if (!desk) return null
    const wide = desk.classList.contains('play-desk--wide')
    let root = wide
      ? document.querySelector('.play-desk__top')
      : document.querySelector('.play-desk__mobile-chrome')
    if (!root) root = document.querySelector('.play-desk__top, .mobile-vitals')
    if (!root) return null
    const cs = getComputedStyle(root)
    if (cs.display === 'none') return null
    const r = root.getBoundingClientRect()
    if (r.width < 80 || r.height < 40) return null
    // Cap mobile chrome height so effects strip doesn't dominate, but keep vitals.
    const maxH = wide ? Math.round(r.height) : Math.min(Math.round(r.height), 420)
    return {
      x: Math.max(0, Math.round(r.x)),
      y: Math.max(0, Math.round(r.y)),
      width: Math.max(80, Math.round(r.width)),
      height: Math.max(40, maxH),
    }
  })
  if (!box) throw new Error('bad header box')
  await page.screenshot({ path, clip: box })
}

function dialogClipBox(page) {
  return page.evaluate(() => {
    const dlg =
      document.querySelector('[role="dialog"]') ||
      document.querySelector('.ui-dialog') ||
      document.querySelector('.hot-conditions')
    if (!dlg) return null
    const r = dlg.getBoundingClientRect()
    // Prefer full viewport width on phone so we don't clip the sheet edge.
    const x = 0
    const y = Math.max(0, Math.round(r.y) - 4)
    return {
      x,
      y,
      width: Math.min(window.innerWidth, Math.max(Math.round(r.width), Math.round(r.right))),
      height: Math.min(window.innerHeight - y, Math.max(160, Math.round(r.height) + 8)),
    }
  })
}

async function openStatesDialog(page) {
  const btn = page.locator(
    '.play-desk__hot-item--states, .play-desk__hot-item--empty-row',
  ).first()
  await btn.click()
  await page.waitForSelector('[role="dialog"] .hot-conditions', { timeout: 8000 })
  await page.waitForTimeout(350)
}

async function closeStatesDialog(page) {
  const close = page.getByRole('button', { name: /Закрыть|Отмена|Close|Готово/i })
  if (await close.count()) await close.first().click().catch(() => {})
  else await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
}

async function shotStatesPopover(page, path) {
  await openStatesDialog(page)
  const probe = await page.evaluate(() => {
    const body = document.querySelector('.ui-dialog__body')
    const active = document.querySelector('.hot-conditions__active')
    const chips = active
      ? [...active.querySelectorAll('.tag-chip')].map((el) =>
          (el.textContent || '').replace(/\s+/g, ' ').trim(),
        )
      : []
    return {
      bodyScrollW: body?.scrollWidth ?? 0,
      bodyClientW: body?.clientWidth ?? 0,
      overflowX: (body?.scrollWidth ?? 0) > (body?.clientWidth ?? 0) + 1,
      dlgW: Math.round(document.querySelector('.ui-dialog')?.getBoundingClientRect().width || 0),
      vw: window.innerWidth,
      activeCount: chips.length,
      chips,
    }
  })
  const box = await dialogClipBox(page)
  if (!box) throw new Error('no states dialog')
  await page.screenshot({ path, clip: box })
  await closeStatesDialog(page)
  return probe
}

/** Scroll dialog body to «На персонаже» / active chips and shoot. */
async function shotStatesPopoverActive(page, path) {
  await openStatesDialog(page)
  const found = await page.evaluate(() => {
    const body = document.querySelector('.ui-dialog__body')
    const section =
      document.querySelector('.hot-conditions__card[aria-label="Активные состояния"]') ||
      document.querySelector('.hot-conditions__active')
    if (!body || !section) return { ok: false, activeCount: 0 }
    section.scrollIntoView({ block: 'start', behavior: 'instant' })
    const chips = [
      ...(section.querySelectorAll?.('.tag-chip') ||
        document.querySelectorAll('.hot-conditions__active .tag-chip')),
    ].map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
    return { ok: true, activeCount: chips.length, chips }
  })
  await page.waitForTimeout(250)
  const box = await dialogClipBox(page)
  if (!box) throw new Error('no states dialog for active')
  await page.screenshot({ path, clip: box })
  await closeStatesDialog(page)
  return found
}

async function composePair(page, w, clericPath, loadPath, outPath) {
  await page.setViewportSize({ width: Math.max(w, 400), height: 1000 })
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
      a: `data:image/png;base64,${readFileSync(clericPath).toString('base64')}`,
      b: `data:image/png;base64,${readFileSync(loadPath).toString('base64')}`,
      labelA: `жрец · ${w}px`,
      labelB: `нагрузка · ${w}px`,
    },
  )
  writeFileSync(outPath, Buffer.from(stacked.replace(/^data:image\/png;base64,/, ''), 'base64'))
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
    await openSheet(page, DARRACK)
    await scrollHot(page, state === 'end')
    const clericProbe = await hotProbe(page)
    const clericTmp = `${ART}/_tmp-cleric-${w}-${state}.png`
    await shotHotCrop(page, clericTmp)

    await openSheet(page, TORBIN)
    await scrollHot(page, state === 'end')
    const loadProbe = await hotProbe(page)
    const loadTmp = `${ART}/_tmp-load-${w}-${state}.png`
    await shotHotCrop(page, loadTmp)

    const out = `${ART}/hotbar-pair-${w}-${state}.png`
    await composePair(page, w, clericTmp, loadTmp, out)
    report.files.push(out)
    report.probes[`${w}-${state}`] = { cleric: clericProbe, load: loadProbe }
  }
}

if (!SKIP_HDR) {
  for (const w of HDR_WIDTHS) {
    const h = w <= 390 ? 844 : 1100
    await page.setViewportSize({ width: w, height: h })
    await openSheet(page, DARRACK)
    const cTmp = `${ART}/_tmp-hdr-cleric-${w}.png`
    await shotHeader(page, cTmp)
    await openSheet(page, TORBIN)
    const lTmp = `${ART}/_tmp-hdr-load-${w}.png`
    await shotHeader(page, lTmp)
    const out = `${ART}/hdr-pair-${w}.png`
    await composePair(page, w, cTmp, lTmp, out)
    report.files.push(out)
  }
}

// States dialog shots (Torbin — many conditions)
report.statesDialog = {}
for (const w of [390, 1440]) {
  const h = w <= 390 ? 844 : 1100
  await page.setViewportSize({ width: w, height: h })
  await openSheet(page, TORBIN)
  const out = `${ART}/hotbar-states-popover-${w}.png`
  report.statesDialog[`${w}`] = await shotStatesPopover(page, out)
  report.files.push(out)

  await openSheet(page, TORBIN)
  const activeOut = `${ART}/hotbar-states-popover-${w}-active.png`
  report.statesDialog[`${w}-active`] = await shotStatesPopoverActive(page, activeOut)
  report.files.push(activeOut)
}

writeFileSync(`${ART}/hot01-report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
