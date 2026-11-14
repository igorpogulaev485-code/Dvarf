/**
 * UIKIT-03 screenshot pass → /opt/cursor/artifacts
 * Requires Vite on 127.0.0.1:5173
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BASE = 'http://127.0.0.1:5173'
const OUT = '/opt/cursor/artifacts'
const WIDTHS = [1440, 1280, 1024, 768, 390]

async function shot(page, name, clip) {
  const file = path.join(OUT, name)
  await page.screenshot({
    path: file,
    clip,
    animations: 'disabled',
  })
  return file
}

async function headerClip(page) {
  const box = await page.locator('[data-testid="uikit03-desk"] .play-desk__top').boundingBox()
  if (!box) throw new Error('header not found')
  return {
    x: Math.max(0, box.x - 8),
    y: Math.max(0, box.y - 8),
    width: Math.ceil(box.width + 16),
    height: Math.ceil(box.height + 16),
  }
}

async function hotClip(page) {
  const box = await page.locator('[data-testid="uikit03-hot"]').boundingBox()
  if (!box) throw new Error('hot not found')
  // Full sheet width of the desk
  const desk = await page.locator('[data-testid="uikit03-desk"]').boundingBox()
  const x = desk ? desk.x : box.x
  const width = desk ? desk.width : box.width
  return {
    x: Math.max(0, x),
    y: Math.max(0, box.y - 4),
    width: Math.ceil(width),
    height: Math.ceil(box.height + 8),
  }
}

async function classClip(page) {
  const box = await page.locator('.play-desk-header__classes, .ui-class-row').first().boundingBox()
  if (!box) throw new Error('classes not found')
  const who = await page.locator('.play-desk-header__who, .play-desk-header').first().boundingBox()
  return {
    x: Math.max(0, (who?.x ?? box.x) - 4),
    y: Math.max(0, box.y - 8),
    width: Math.ceil((who?.width ?? box.width) + 8),
    height: Math.ceil(box.height + 24),
  }
}

async function measureHeaderHeight(page) {
  return page.locator('[data-testid="uikit03-desk"] .play-desk__top').evaluate((el) => {
    const r = el.getBoundingClientRect()
    return Math.round(r.height)
  })
}

async function setWidth(page, width) {
  const height = width <= 390 ? 844 : 900
  await page.setViewportSize({ width, height })
  await page.waitForTimeout(200)
}

async function openSeed(page, seed) {
  await page.goto(`${BASE}/dev/uikit03-header-preview?seed=${seed}`, {
    waitUntil: 'networkidle',
  })
  await page.waitForSelector('[data-testid="uikit03-desk"]')
  await page.waitForTimeout(300)
}

async function scrollHot(page, toEnd) {
  const scroller = page.locator('.play-desk__hot-wrap .play-desk__hot, .ui-scroll-row .play-desk__hot').first()
  await scroller.evaluate((el, end) => {
    el.scrollLeft = end ? el.scrollWidth : 0
  }, toEnd)
  await page.waitForTimeout(250)
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const page = await browser.newPage()
  const report = { heights: {}, notes: [], files: [] }

  // ——— MAX seed ———
  for (const w of WIDTHS) {
    await setWidth(page, w)
    await openSeed(page, 'max')
    const h = await measureHeaderHeight(page)
    report.heights[`max-${w}`] = h
    const clip = await headerClip(page)
    report.files.push(await shot(page, `hdr-max-${w}.png`, clip))
    report.files.push(await shot(page, `hdr-${w}.png`, clip))
    // class row crop
    try {
      const cclip = await classClip(page)
      report.files.push(await shot(page, `hdr-classes-more-${w}.png`, cclip))
    } catch (e) {
      report.notes.push(`classes clip ${w}: ${e.message}`)
    }
    // hot start/end
    const hclip = await hotClip(page)
    await scrollHot(page, false)
    report.files.push(await shot(page, `hotbar-${w}-start.png`, hclip))
    await scrollHot(page, true)
    report.files.push(await shot(page, `hotbar-${w}-end.png`, await hotClip(page)))
  }

  // ——— popovers at 1024 ———
  await setWidth(page, 1024)
  await openSeed(page, 'max')
  // effects +N
  const effectsMore = page.locator('.active-effects__more summary, .active-effects__more-summary').first()
  if (await effectsMore.count()) {
    await effectsMore.click()
    await page.waitForTimeout(200)
    report.files.push(await shot(page, 'hdr-max-1024-popovers.png', await headerClip(page)))
    report.files.push(await shot(page, 'effects-more-1024.png', await headerClip(page)))
    // close
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
  } else {
    report.notes.push('no effects +N at 1024')
  }

  // classes +N
  await openSeed(page, 'max')
  const classMore = page.locator('.ui-class-row__more summary, .ui-class-row__more-summary').first()
  if (await classMore.count()) {
    await classMore.click()
    await page.waitForTimeout(200)
    const who = await page.locator('.play-desk-header').first().boundingBox()
    const panel = await page.locator('.ui-class-row__more-panel, .ui-menu__panel').first().boundingBox()
    const clip = who && panel
      ? {
          x: Math.min(who.x, panel.x) - 8,
          y: Math.min(who.y, panel.y) - 8,
          width: Math.max(who.x + who.width, panel.x + panel.width) - Math.min(who.x, panel.x) + 16,
          height: Math.max(who.y + who.height, panel.y + panel.height) - Math.min(who.y, panel.y) + 16,
        }
      : await headerClip(page)
    report.files.push(await shot(page, 'hdr-classes-more-open-1024.png', clip))
  } else {
    report.notes.push('no classes +N at 1024 — may all fit; try narrower who column')
    // force by shrinking: capture anyway
    report.files.push(await shot(page, 'hdr-classes-more-open-1024.png', await headerClip(page)))
  }

  // effect tip — skip hidden measure chips
  await openSeed(page, 'max')
  const tipChip = page.locator('.active-effects__main .ui-chip__label').first()
  if (await tipChip.count()) {
    await tipChip.click({ force: true })
    await page.waitForTimeout(200)
    report.files.push(await shot(page, 'effect-tip-1024.png', await headerClip(page)))
  } else {
    report.notes.push('no visible effect tip chip')
  }

  // compare / cleric
  await setWidth(page, 1024)
  await openSeed(page, 'cleric')
  report.heights['cleric-1024'] = await measureHeaderHeight(page)
  report.files.push(await shot(page, 'hdr-compare-1024.png', await headerClip(page)))
  await setWidth(page, 1440)
  await openSeed(page, 'cleric')
  report.heights['cleric-1440'] = await measureHeaderHeight(page)
  report.files.push(await shot(page, 'hdr-compare-1440.png', await headerClip(page)))

  // etalon
  await setWidth(page, 1440)
  await page.goto(`${BASE}/dev/ui-kit-etalon`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await page.screenshot({
    path: path.join(OUT, 'etalon-kit-1440.png'),
    fullPage: true,
    animations: 'disabled',
  })
  report.files.push(path.join(OUT, 'etalon-kit-1440.png'))

  // visual flags
  await setWidth(page, 1024)
  await openSeed(page, 'max')
  const flags = await page.evaluate(() => {
    const hot = document.querySelector('.play-desk__hot-wrap .play-desk__hot')
    const wrap = hot
      ? getComputedStyle(hot).flexWrap
      : null
    const edgeR = !!document.querySelector('.ui-scroll-row__edge--right')
    const edgeL = !!document.querySelector('.ui-scroll-row__edge--left')
    const effectsMore = !!document.querySelector('.active-effects__more')
    const classMore = !!document.querySelector('.ui-class-row__more')
    const round = !!Array.from(document.querySelectorAll('button')).find((b) =>
      /Раунд/.test(b.textContent || ''),
    )
    const greenHeroism = !!Array.from(document.querySelectorAll('button')).find(
      (b) =>
        b.textContent?.trim() === 'Героизм' &&
        b.className.includes('ui-button--secondary'),
    )
    const companions = !!Array.from(document.querySelectorAll('.play-desk__dock-chip')).find(
      (b) => /Напарники/.test(b.textContent || ''),
    )
    const extras = document.querySelector('.play-desk__top-extras')
    const extrasWrap = extras ? getComputedStyle(extras).flexWrap : null
    return {
      hotWrap: wrap,
      edgeR,
      edgeL,
      effectsMore,
      classMore,
      round,
      greenHeroism,
      companions,
      extrasWrap,
    }
  })
  report.flags = flags

  await writeFile(path.join(OUT, 'uikit03-report.json'), JSON.stringify(report, null, 2))
  await browser.close()
  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
