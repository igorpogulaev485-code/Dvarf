/**
 * Capture real Play Desk headers + hotbars + layout probes (no /dev preview).
 * Requires local API + vite + seeded Torbin/Darrack.
 */
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const TORBIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
const DARRACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const WIDTHS = [1440, 1280, 1024, 768, 390]

function chromeSelector(wide) {
  return wide
    ? '.play-desk__top'
    : '.play-desk__mobile-chrome'
}

function pickHeaderBlocks(root) {
  const selectors = [
    '.play-desk-header__who',
    '.play-desk-header__mid',
    '.play-desk-header__right',
    '.play-desk-header__name-text',
    '.play-desk-header__identity',
    '.ui-class-row',
    '.play-desk-header__xp',
    '.play-desk-vital',
    '.play-desk-header__stack',
    '.play-desk-header__chip',
    '.play-desk-header__coin',
    '.play-desk-header__rest',
    '.play-desk-header__hp',
    '.active-effects',
    '.active-effects__main .ui-chip',
    '.active-effects__more',
    '.active-effects__round',
    '.play-desk__dock-chip',
    '.mobile-vitals',
    '.mobile-vitals__name',
    '.mobile-vitals__chip',
    '.mobile-vitals__hp',
    '.mobile-vitals__tool',
    '.mobile-vitals__insp',
    '.play-desk__mobile-effects',
  ]
  const seen = new Set()
  const out = []
  for (const sel of selectors) {
    for (const el of root.querySelectorAll(sel)) {
      if (seen.has(el)) continue
      // skip hidden measure hosts / tips / menus
      if (el.closest('.ui-class-row__measure, .active-effects__measure, .ui-chip__tip, .ui-menu__panel, .play-desk-header__coin-tip')) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      // skip nested if parent already listed and fully contains (keep leafy tiles)
      seen.add(el)
      out.push({
        el,
        cls: (el.className || el.tagName).toString().slice(0, 80),
        r,
      })
    }
  }
  return out
}

function rectsOverlap(a, b, pad = 1) {
  const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  return ix > pad && iy > pad
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
  await page.evaluate(({ a, r }) => {
    localStorage.setItem('dvarf.access_token', a)
    localStorage.setItem('dvarf.refresh_token', r)
    localStorage.setItem('dvarf.mobileVitals.collapsed.v2', '0')
  }, { a: body.access_token, r: body.refresh_token })
}

async function openSheet(page, id) {
  await page.goto(`http://127.0.0.1:5173/characters/${id}`, {
    waitUntil: 'networkidle',
    timeout: 90_000,
  })
  await page.waitForTimeout(800)
  // collapse open tips/menus
  await page.evaluate(() => {
    document.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'))
    document.querySelectorAll('.ui-chip.is-tip-open').forEach((el) => el.classList.remove('is-tip-open'))
  })
  const expand = page.locator('button[aria-expanded="false"]').filter({ hasText: /Развер|Основн/i })
  if (await expand.count()) await expand.first().click().catch(() => {})
  await page.waitForTimeout(200)
  await page.evaluate(() => {
    document.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'))
  })
}

async function probe(page) {
  return page.evaluate(({ pickHeaderBlocks: pickSrc, rectsOverlap: ovSrc }) => {
    // eslint-disable-next-line no-new-func
    const pickHeaderBlocks = new Function(`return (${pickSrc})`)()
    const rectsOverlap = new Function(`return (${ovSrc})`)()
    const desk = document.querySelector('.play-desk')
    const wide = desk?.classList.contains('play-desk--wide')
    const root = document.querySelector(wide ? '.play-desk__top' : '.play-desk__mobile-chrome')
    if (!root) return { error: 'no chrome', wide }
    const blocks = pickHeaderBlocks(root)
    const overlaps = []
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i]
        const b = blocks[j]
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue
        // chip inside effects / stack children vs parent already filtered somewhat
        if (rectsOverlap(a.r, b.r, 1.5)) {
          overlaps.push({
            a: a.cls,
            b: b.cls,
            ix: Math.round(Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)),
            iy: Math.round(Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)),
          })
        }
      }
    }
    const textEls = [
      ...root.querySelectorAll(
        '.play-desk-header__name-text, .play-desk-header__identity, .mobile-vitals__name, .mobile-vitals__meta, .play-desk-header__xp-remain, .ui-class-chip__main, .ui-class-chip__archetype, .ui-chip__label strong, .play-desk-header__coin span, .mobile-vitals__coin-amt',
      ),
    ]
    const clippedHard = []
    for (const el of textEls) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none') continue
      const clamp = cs.webkitLineClamp
      const ellipsis = cs.textOverflow === 'ellipsis' || clamp === '2' || clamp === '1'
      if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && !ellipsis) {
        clippedHard.push({
          t: (el.textContent || '').trim().slice(0, 40),
          cls: (el.className || '').toString().slice(0, 40),
          sw: el.scrollWidth,
          cw: el.clientWidth,
        })
      }
      if (
        el.scrollHeight > el.clientHeight + 2 &&
        el.clientHeight > 0 &&
        !(clamp && clamp !== 'none')
      ) {
        clippedHard.push({
          t: (el.textContent || '').trim().slice(0, 40),
          cls: (el.className || '').toString().slice(0, 40),
          sh: el.scrollHeight,
          ch: el.clientHeight,
          kind: 'vertical',
        })
      }
    }
    const r = root.getBoundingClientRect()
    return {
      wide,
      topH: Math.round(r.height),
      topW: Math.round(r.width),
      overlapCount: overlaps.length,
      overlaps: overlaps.slice(0, 12),
      clippedHard: clippedHard.slice(0, 12),
      gold: document.querySelector('.play-desk-header__coin, .mobile-vitals__tool--coin')?.textContent?.trim(),
      classes: document.querySelector('.ui-class-row')?.innerText?.replace(/\s+/g, ' ').slice(0, 120) || null,
      fxMore: document.querySelector('.active-effects summary')?.textContent?.trim() || null,
      round: [...document.querySelectorAll('.active-effects__round, .active-effects *')].find((el) =>
        /^Раунд/.test((el.textContent || '').trim()),
      )?.textContent?.trim(),
      companions: [...document.querySelectorAll('.play-desk__dock-chip')].map((el) => el.textContent?.trim()),
      heroism: [...document.querySelectorAll('.ui-chip')].map((el) => el.textContent?.trim()).find((t) => t?.includes('Героизм')),
    }
  }, {
    pickHeaderBlocks: pickHeaderBlocks.toString(),
    rectsOverlap: rectsOverlap.toString(),
  })
}

async function shotChrome(page, path) {
  const wide = await page.evaluate(() => document.querySelector('.play-desk')?.classList.contains('play-desk--wide'))
  const sel = chromeSelector(wide)
  const box = await page.locator(sel).first().boundingBox()
  if (!box) throw new Error(`no box for ${sel}`)
  const h = await page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().height), sel)
  await page.screenshot({
    path,
    clip: {
      x: Math.max(0, box.x - 4),
      y: Math.max(0, box.y - 4),
      width: Math.min(page.viewportSize().width, Math.ceil(box.width) + 8),
      height: h + 8,
    },
    animations: 'disabled',
  })
  return h
}

async function shotHot(page, w) {
  const desk = await page.locator('.play-desk').boundingBox()
  const hotWrap = page.locator('.ui-scroll-row.play-desk__hot-wrap, .play-desk__hot-wrap').first()
  const scroller = page.locator('.play-desk__hot-wrap .play-desk__hot, .ui-scroll-row > .play-desk__hot').first()
  await scroller.evaluate((el) => { el.scrollLeft = 0 }).catch(() => {})
  await page.waitForTimeout(120)
  let hb = await hotWrap.boundingBox()
  if (!desk || !hb) return null
  const clip = { x: desk.x, y: hb.y - 4, width: desk.width, height: hb.height + 8 }
  await page.screenshot({ path: `${ART}/hotbar-${w}-start.png`, clip, animations: 'disabled' })
  await scroller.evaluate((el) => { el.scrollLeft = el.scrollWidth }).catch(() => {})
  await page.waitForTimeout(120)
  hb = await hotWrap.boundingBox()
  await page.screenshot({
    path: `${ART}/hotbar-${w}-end.png`,
    clip: { ...clip, y: hb.y - 4, height: hb.height + 8 },
    animations: 'disabled',
  })
  return page.evaluate(() => {
    const hot = document.querySelector('.play-desk__hot-wrap .play-desk__hot, .ui-scroll-row > .play-desk__hot')
    const wrap = hot?.closest('.ui-scroll-row') || hot?.parentElement
    const edgeR = !!document.querySelector('.ui-scroll-row__edge--right')
    return {
      overflow: hot && wrap ? hot.scrollWidth > wrap.clientWidth + 2 : false,
      edgeR,
      scrollW: hot?.scrollWidth,
      clientW: wrap?.clientWidth,
    }
  })
}

const report = { torbin: {}, darrack: {}, hot: {}, notes: [] }
const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
})

for (const w of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: w <= 390 ? 1100 : 1200 },
  })
  const page = await ctx.newPage()
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'domcontentloaded' })
  await login(page)

  await openSheet(page, TORBIN)
  const probeT = await probe(page)
  const topHT = await shotChrome(page, `${ART}/hdr-max-${w}.png`)
  probeT.shotH = topHT
  report.torbin[w] = probeT
  report.hot[w] = await shotHot(page, w)

  if (w === 1024) {
    await page.locator('.ui-class-row summary').first().click().catch(() => {})
    await page.locator('.active-effects summary').first().click().catch(() => {})
    await page.waitForTimeout(250)
    const top = await page.locator('.play-desk__top').boundingBox()
    const maxBottom = await page.evaluate(() =>
      Math.max(0, ...[...document.querySelectorAll('.ui-menu__panel')].map((p) => p.getBoundingClientRect().bottom)),
    )
    await page.screenshot({
      path: `${ART}/hdr-max-1024-popovers.png`,
      clip: {
        x: Math.max(0, top.x - 4),
        y: Math.max(0, top.y - 4),
        width: Math.ceil(top.width) + 8,
        height: Math.ceil(Math.max(top.height, maxBottom - top.y) + 20),
      },
      animations: 'disabled',
    })
    await page.evaluate(() => document.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open')))
  }

  await openSheet(page, DARRACK)
  if ([1440, 1024, 390].includes(w)) {
    const probeD = await probe(page)
    const topHD = await shotChrome(page, `${ART}/hdr-cleric-${w}.png`)
    probeD.shotH = topHD
    report.darrack[w] = probeD
  }

  await ctx.close()
}

// etalon
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } })
  const page = await ctx.newPage()
  await page.goto('http://127.0.0.1:5173/dev/ui-kit-etalon', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${ART}/etalon-kit-1440.png`, fullPage: true, animations: 'disabled' })
  await ctx.close()
}

await browser.close()
writeFileSync(`${ART}/hdr-layout-probe.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
