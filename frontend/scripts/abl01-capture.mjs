/**
 * ABL-01 screenshots for «Способности».
 * Requires API :8000 + vite :5173 + seed_qi01 / mag01 / abl01.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.ABL01_BASE || 'http://127.0.0.1:5173'

const DARRACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const MONK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6'
const WIZ20 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc01'
const PIETY_ON = 'cccccccc-cccc-4ccc-8ccc-ccccccccab01'
const DRAGON_BUG = 'cccccccc-cccc-4ccc-8ccc-ccccccccab02'

mkdirSync(ART, { recursive: true })
const out = (name) => `${ART}/${name}`

function md5(path) {
  if (!existsSync(path)) return null
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
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
      localStorage.setItem('dvarf.mobileVitals.collapsed.v2', '1')
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
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  await page.waitForSelector('.play-desk', { timeout: 25_000 })
}

async function openFeatures(page, w) {
  if (w < 960) {
    const nav = page
      .locator('.mobile-scene-nav button, .mobile-scene-nav__tab')
      .filter({ hasText: /Способности|Умения/i })
    if (await nav.count()) await nav.first().click({ force: true }).catch(() => {})
  }
  const tab = page.locator('button.play-desk__mode').filter({ hasText: /Способности|Умения/i })
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(500)
  await page.waitForSelector('.features-panel', { timeout: 15_000 })
}

async function setViewport(page, w) {
  await page.setViewportSize({ width: w, height: w < 960 ? 844 : 900 })
  await page.waitForTimeout(300)
}

async function shotFull(page, name, w) {
  await setViewport(page, w)
  const path = out(name)
  await page.screenshot({ path, fullPage: false })
  return path
}

async function shotPanel(page, name) {
  const path = out(name)
  const panel = page.locator('.features-panel').first()
  await panel.scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(200)
  if (await panel.count()) {
    await panel.screenshot({ path })
  } else {
    await page.screenshot({ path, fullPage: false })
  }
  return path
}

async function shotStage(page, name) {
  const path = out(name)
  const stage = page
    .locator('.play-desk__stage-panel:not([hidden])')
    .filter({ has: page.locator('.features-panel, .piety-panel') })
    .first()
  if (await stage.count()) {
    await stage.screenshot({ path }).catch(async () => shotPanel(page, name))
  } else {
    await shotPanel(page, name)
  }
  return path
}

async function shotHeader(page, name, w) {
  await setViewport(page, w)
  const path = out(name)
  const sel =
    w < 960
      ? '.play-desk__mobile-chrome, .mobile-vitals'
      : '.play-desk__top'
  const loc = page.locator(sel).first()
  if (await loc.count()) await loc.screenshot({ path })
  else await page.screenshot({ path, clip: { x: 0, y: 0, width: w, height: 200 } })
  return path
}

async function clickFilter(page, label) {
  const filt = page.locator('.inventory-filter').filter({ hasText: new RegExp(`^${label}$`, 'i') })
  if (await filt.count()) {
    await filt.first().click()
    await page.waitForTimeout(350)
    return true
  }
  return false
}

const report = { files: [], md5: {}, notes: [] }

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await login(page)

  // ========== HDR before (same selector as after — header untouched) ==========
  await openSheet(page, DARRACK)
  await shotHeader(page, 'hdr-pair-1440-before.png', 1440)
  await shotHeader(page, 'hdr-pair-390-before.png', 390)

  // ========== Overview 1440 / 390 — Даррак ==========
  await openFeatures(page, 1440)
  await shotFull(page, 'abl-overview-1440.png', 1440)
  await openFeatures(page, 390)
  await shotFull(page, 'abl-overview-390.png', 390)

  // ========== Filters — click «С ресурсом», hide empty already applied ==========
  await openSheet(page, DARRACK)
  await openFeatures(page, 1440)
  await clickFilter(page, 'С ресурсом')
  await shotFull(page, 'abl-filters-1440.png', 1440)
  await openFeatures(page, 390)
  await clickFilter(page, 'С ресурсом')
  await shotFull(page, 'abl-filters-390.png', 390)

  // ========== Need choice — permanent pick only (ASI / fighting style), not at_use ==========
  await openSheet(page, PIETY_ON)
  await openFeatures(page, 1440)
  await clickFilter(page, 'Нужен выбор')
  const needCard = page.locator('.feature-card').filter({
    has: page.locator('.feature-card__need-choice-chip'),
  })
  if (await needCard.count()) {
    await needCard.first().scrollIntoViewIfNeeded()
    await needCard.first().screenshot({ path: out('abl-need-choice-1440.png') })
  } else {
    await shotPanel(page, 'abl-need-choice-1440.png')
  }

  // Open Hand Technique must NOT show need-choice / «не выбрано»
  await openSheet(page, MONK)
  await openFeatures(page, 1440)
  const openHand = page.locator('.feature-card').filter({ hasText: /Техника открытой ладони/i }).first()
  if (await openHand.count()) {
    await openHand.locator('.feature-card__glance').first().click().catch(() => {})
    await page.waitForTimeout(300)
    const ohText = (await openHand.innerText().catch(() => '')).replace(/\s+/g, ' ')
    const falseBadge =
      /нужен выбор/i.test(ohText) || /не выбрано/i.test(ohText)
    report.notes.push(`open-hand-false-badge=${falseBadge} text="${ohText.slice(0, 180)}"`)
    await openHand.screenshot({ path: out('abl-open-hand-no-choice-1440.png') }).catch(() => {})
  } else {
    report.notes.push('open-hand-card=missing')
  }

  // ========== Resource + Использовать — expand Гнев бури / Ци ==========
  await openSheet(page, DARRACK)
  await openFeatures(page, 1440)
  const wrath = page.locator('.feature-card').filter({ hasText: /Гнев бури/i }).first()
  if (await wrath.count()) {
    await wrath.locator('.feature-card__glance, .inventory-card__chevron-btn').first().click().catch(() => {})
    await page.waitForTimeout(400)
  }
  const useBtn = page.locator('.feature-resource__actions button, button').filter({
    hasText: /Использовать/i,
  })
  if (await useBtn.count()) {
    await useBtn.first().scrollIntoViewIfNeeded()
    const card = page.locator('.feature-card--expand, .feature-card').filter({
      has: page.locator('button', { hasText: /Использовать/i }),
    }).first()
    await card.screenshot({ path: out('abl-resource-use-1440.png') })
  } else {
    await openSheet(page, MONK)
    await openFeatures(page, 1440)
    const qi = page.locator('.feature-card').filter({ hasText: /^Ци|Очки ци|Ци\b/i }).first()
    if (await qi.count()) {
      await qi.locator('button').first().click().catch(() => {})
      await page.waitForTimeout(400)
    }
    await shotPanel(page, 'abl-resource-use-1440.png')
  }

  // ========== Piety off / on ==========
  await openSheet(page, DARRACK)
  await openFeatures(page, 1440)
  const pietyOffCount = await page.locator('.piety-panel').count()
  report.notes.push(`piety-off count=${pietyOffCount}`)
  await shotStage(page, 'abl-piety-off-1440.png')

  await openSheet(page, PIETY_ON)
  await openFeatures(page, 1440)
  await page.waitForSelector('.piety-panel', { timeout: 10_000 })
  await shotStage(page, 'abl-piety-on-1440.png')

  // ========== Darkvision once (real viewport, not element/full-page crop) ==========
  await openSheet(page, WIZ20)
  await openFeatures(page, 1440)
  const dv = page.locator('.features-panel .feature-card__name').filter({ hasText: /Тёмное зрение/i })
  const dvCount = await dv.count()
  report.notes.push(`darkvision-in-features-panel=${dvCount}`)
  if (dvCount) await dv.first().scrollIntoViewIfNeeded().catch(() => {})
  await shotFull(page, 'abl-darkvision-1440.png', 1440)
  await openFeatures(page, 390)
  const dv390 = page.locator('.features-panel .feature-card__name').filter({ hasText: /Тёмное зрение/i })
  if (await dv390.count()) await dv390.first().scrollIntoViewIfNeeded().catch(() => {})
  await shotFull(page, 'abl-darkvision-390.png', 390)

  // ========== Left passives ТЗ for dwarf (Даррак) ==========
  await openSheet(page, DARRACK)
  await setViewport(page, 1440)
  const leftDv = page.locator('.darkvision-sense').first()
  const leftText = (await leftDv.innerText().catch(() => '')).replace(/\s+/g, ' ')
  report.notes.push(`left-passives-darkvision="${leftText}"`)
  const senseBox = await leftDv.boundingBox().catch(() => null)
  if (senseBox) {
    await page.screenshot({
      path: out('left-passives-darkvision-1440.png'),
      clip: {
        x: Math.max(0, senseBox.x - 24),
        y: Math.max(0, senseBox.y - 100),
        width: Math.min(420, 1440 - Math.max(0, senseBox.x - 24)),
        height: Math.min(280, senseBox.height + 160),
      },
    })
  } else {
    const leftBlock = page.locator('.play-desk__left, .play-desk__rail, .sheet-passives').first()
    if (await leftBlock.count()) {
      await leftBlock.screenshot({ path: out('left-passives-darkvision-1440.png') }).catch(async () => {
        await shotFull(page, 'left-passives-darkvision-1440.png', 1440)
      })
    } else {
      await shotFull(page, 'left-passives-darkvision-1440.png', 1440)
    }
  }

  // ========== Monk ци ==========
  await openSheet(page, MONK)
  await openFeatures(page, 1440)
  const qiCard = page.locator('.feature-card').filter({ hasText: /Ци/i }).first()
  if (await qiCard.count()) {
    await qiCard.locator('button').first().click().catch(() => {})
    await page.waitForTimeout(300)
    await qiCard.screenshot({ path: out('abl-monk-ki-1440.png') }).catch(() =>
      shotPanel(page, 'abl-monk-ki-1440.png'),
    )
  } else {
    await shotPanel(page, 'abl-monk-ki-1440.png')
  }
  const monkText = await page.locator('.features-panel').innerText()
  report.notes.push(
    `monk-ци=${/ци/i.test(monkText)} monk-legacy-Ки=${/(^|[^А-Яа-яЁё])Ки([^А-Яа-яЁё]|$)/.test(monkText)}`,
  )

  // ========== Dragon ancestor ==========
  await openSheet(page, DRAGON_BUG)
  await openFeatures(page, 1440)
  const anc = page.locator('.feature-card').filter({ hasText: /Предок-дракон/i }).first()
  if (await anc.count()) {
    await anc.locator('button').first().click().catch(() => {})
    await page.waitForTimeout(400)
    await anc.screenshot({ path: out('abl-dragon-ancestor-1440.png') })
  } else {
    await shotPanel(page, 'abl-dragon-ancestor-1440.png')
  }
  const ancText = await page.locator('.features-panel').innerText()
  report.notes.push(
    `dragon-не-выбрано=${/Предок-дракон[\s\S]{0,120}не выбрано/i.test(ancText)} red=${/Красный/i.test(ancText)}`,
  )

  // ========== HDR after ==========
  await openSheet(page, DARRACK)
  await shotHeader(page, 'hdr-pair-1440.png', 1440)
  await shotHeader(page, 'hdr-pair-390.png', 390)

  const files = [
    'abl-overview-1440.png',
    'abl-overview-390.png',
    'abl-filters-1440.png',
    'abl-filters-390.png',
    'abl-need-choice-1440.png',
    'abl-open-hand-no-choice-1440.png',
    'abl-resource-use-1440.png',
    'abl-piety-off-1440.png',
    'abl-piety-on-1440.png',
    'abl-darkvision-1440.png',
    'abl-darkvision-390.png',
    'left-passives-darkvision-1440.png',
    'abl-monk-ki-1440.png',
    'abl-dragon-ancestor-1440.png',
    'hdr-pair-1440.png',
    'hdr-pair-390.png',
    'hdr-pair-1440-before.png',
    'hdr-pair-390-before.png',
  ]
  for (const f of files) {
    report.md5[f] = md5(out(f))
    report.files.push({ file: f, md5: report.md5[f], exists: Boolean(report.md5[f]) })
  }

  report.hdr = {
    same1440: report.md5['hdr-pair-1440-before.png'] === report.md5['hdr-pair-1440.png'],
    same390: report.md5['hdr-pair-390-before.png'] === report.md5['hdr-pair-390.png'],
  }

  const product = files.filter((f) => !f.includes('before'))
  const hashes = product.map((f) => report.md5[f]).filter(Boolean)
  report.uniqueProductMd5 = new Set(hashes).size === hashes.length
  report.duplicateMd5 = [...new Set(hashes.filter((h, i) => hashes.indexOf(h) !== i))]

  // Also keep stable copies for PR
  for (const f of product) {
    if (existsSync(out(f))) copyFileSync(out(f), out(`abl01-${f}`))
  }

  writeFileSync(out('abl01-md5s.txt'), JSON.stringify(report, null, 2))
  writeFileSync(out('abl01-capture-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
  if (!report.hdr.same1440 || !report.hdr.same390) {
    console.error('HDR md5 mismatch — header may have shifted')
    process.exitCode = 2
  }
  if (!report.uniqueProductMd5) {
    console.error('Duplicate product md5:', report.duplicateMd5)
    process.exitCode = 3
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
