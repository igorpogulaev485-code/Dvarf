/**
 * SOC-01 screenshots for «Общение».
 * Requires API :8000 + vite :5173 + seed_soc01_chars.py (+ uikit03).
 *
 * SOC01_TAG=before-  → кадры «до» (main)
 * SOC01_TAG=         → кадры «после» (ветка)
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.SOC01_BASE || 'http://127.0.0.1:5173'
const TAG = process.env.SOC01_TAG || ''
const EMPTY = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
const FILLED = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'

mkdirSync(ART, { recursive: true })
const out = (name) => `${ART}/${TAG}${name}`

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
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  // Keep header chrome stable for pair diffs (do not toggle expand/collapse).
  await page.waitForSelector('.play-desk', { timeout: 20_000 })
}

async function shotFilters(page, path) {
  return shotClip(page, path, () => {
    const el = document.querySelector('.text-panel .inventory-filters')
    if (!el) return null
    el.scrollIntoView({ block: 'nearest' })
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.left) - 4),
      y: Math.max(0, Math.round(r.top) - 4),
      width: Math.max(80, Math.round(r.width) + 8),
      height: Math.max(36, Math.round(r.height) + 8),
    }
  })
}

async function shotEmptyLine(page, path) {
  return shotClip(page, path, () => {
    const el =
      document.querySelector('.text-block--empty-line') ||
      document.querySelector('.text-panel')
    if (!el) return null
    el.scrollIntoView({ block: 'nearest' })
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.left) - 4),
      y: Math.max(0, Math.round(r.top) - 4),
      width: Math.max(80, Math.round(r.width) + 8),
      height: Math.min(320, Math.max(80, Math.round(r.height) + 8)),
    }
  })
}

async function openSocial(page, w) {
  if (w < 960) {
    const nav = page
      .locator('.mobile-scene-nav button, .mobile-scene-nav__tab')
      .filter({ hasText: /Общение|Социал/i })
    if (await nav.count()) await nav.first().click().catch(() => {})
  }
  const tab = page.locator(
    [
      'button.play-desk__mode[data-mode="social"]',
      'button.play-desk__mode[data-mode="texts"]',
      'button:has-text("Общение")',
    ].join(', '),
  )
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(450)
  await page.waitForSelector('.text-panel, .play-desk-compact', { timeout: 15_000 }).catch(() => {})
}

async function shotClip(page, path, pick) {
  const box = await page.evaluate(pick)
  if (!box) {
    writeFileSync(path.replace(/\.png$/, '.missing.txt'), 'clip missing')
    return false
  }
  await page.screenshot({ path, clip: box })
  return true
}

async function shotViewport(page, path) {
  await page.screenshot({ path, fullPage: false })
}

async function shotSocialPanel(page, path) {
  return shotClip(page, path, () => {
    const el =
      document.querySelector('.text-panel') ||
      document.querySelector('.play-desk__stage') ||
      document.querySelector('.play-desk-compact')
    if (!el) return null
    el.scrollIntoView({ block: 'start' })
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.left) - 4),
      y: Math.max(0, Math.round(r.top) - 4),
      width: Math.max(80, Math.round(r.width) + 8),
      height: Math.min(
        window.innerHeight - Math.round(r.top) - 4,
        Math.max(240, Math.round(r.height) + 8),
      ),
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
    return {
      x: Math.max(0, Math.round(r.x)),
      y: Math.max(0, Math.round(r.y)),
      width: Math.max(80, Math.round(r.width)),
      height: Math.max(40, wide ? Math.round(r.height) : Math.min(Math.round(r.height), 420)),
    }
  })
}

async function shotSceneBlock(page, path) {
  return shotClip(page, path, () => {
    const el =
      document.querySelector('.play-desk__scene-tools') ||
      document.querySelector('.play-desk__modes') ||
      document.querySelector('[data-onboarding="scene-tools"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.left) - 4),
      y: Math.max(0, Math.round(r.top) - 4),
      width: Math.max(80, Math.round(r.width) + 8),
      height: Math.max(36, Math.round(r.height) + 8),
    }
  })
}

async function shotHot(page, path) {
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

async function composePair(page, w, aPath, bPath, outPath, labelA, labelB) {
  if (!existsSync(aPath) || !existsSync(bPath)) {
    writeFileSync(outPath.replace(/\.png$/, '.missing.txt'), `pair missing ${aPath} ${bPath}`)
    return
  }
  const a = readFileSync(aPath).toString('base64')
  const b = readFileSync(bPath).toString('base64')
  await page.setViewportSize({ width: Math.max(w + 40, 900), height: 1600 })
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#1a1a1a;font:14px sans-serif;color:#eee">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px">
    <div><div style="margin:0 0 6px">${labelA}</div><img style="width:100%;background:#333" src="data:image/png;base64,${a}"/></div>
    <div><div style="margin:0 0 6px">${labelB}</div><img style="width:100%;background:#333" src="data:image/png;base64,${b}"/></div>
  </div></body></html>`)
  await page.waitForTimeout(200)
  await page.screenshot({ path: outPath, fullPage: true })
}

function md5(path) {
  if (!existsSync(path)) return null
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

async function withViewport(browser, w, h, fn) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await login(page)
  try {
    await fn(page, w)
  } finally {
    await page.close()
  }
}

const browser = await chromium.launch({ headless: true })
const report = { tag: TAG || 'after', shots: [], md5: {} }

try {
  for (const w of [1440, 390]) {
    const h = w < 960 ? 844 : 1100
    await withViewport(browser, w, h, async (page) => {
      // First screen — empty personality
      await openSheet(page, EMPTY)
      await openSocial(page, w)
      await shotHeader(page, out(`hdr-${w}.png`))
      report.shots.push(`hdr-${w}`)
      if (w === 1440) {
        await shotSceneBlock(page, out('scene-block-1440.png'))
        report.shots.push('scene-block-1440')
        await shotHot(page, out('hot-1440.png'))
        report.shots.push('hot-1440')
      }
      await shotViewport(page, out(`social-first-${w}.png`))
      report.shots.push(`social-first-${w}`)
      await shotEmptyLine(page, out(`social-empty-line-${w}.png`))
      report.shots.push(`social-empty-line-${w}`)
      await shotFilters(page, out(`social-filters-${w}.png`))
      report.shots.push(`social-filters-${w}`)

      // Filled physique + personality
      await openSheet(page, FILLED)
      await openSocial(page, w)

      // Ensure glance first, then open view
      await page.evaluate(() => {
        document.querySelectorAll('.ui-dialog-backdrop button').forEach((b) => {
          if (/Готово|Закрыть/i.test(b.textContent || '')) b.click()
        })
      })
      await page.waitForTimeout(200)
      const physToggle = page.locator('.text-physique--glance .text-physique__toggle').first()
      if (await physToggle.count()) {
        await physToggle.click()
        await page.waitForTimeout(350)
      }
      await page.locator('.text-physique').first().scrollIntoViewIfNeeded().catch(() => {})
      await shotSocialPanel(page, out(`social-physique-view-${w}.png`))
      report.shots.push(`social-physique-view-${w}`)

      // Physique edit via «Изменить» inside physique view
      const physEdit = page.locator('.text-physique--view .ui-button, .text-physique .ui-button').filter({ hasText: /^Изменить$/ }).first()
      if (await physEdit.count()) {
        await physEdit.click()
        await page.waitForTimeout(450)
      }
      if (w < 960 && (await page.locator('.ui-dialog').count())) {
        await page.locator('.ui-dialog').first().screenshot({ path: out(`social-physique-edit-${w}.png`) })
        await page.getByRole('button', { name: /^Готово$/ }).click().catch(() => {})
      } else {
        await shotSocialPanel(page, out(`social-physique-edit-${w}.png`))
        await page.locator('.text-physique .inventory-card__collapse').filter({ hasText: /свернуть/i }).first().click().catch(() => {})
      }
      report.shots.push(`social-physique-edit-${w}`)
      await page.waitForTimeout(300)

      // Collapse physique to glance so block shots are clean
      await page.evaluate(() => {
        document.querySelectorAll('.ui-dialog-backdrop button').forEach((b) => {
          if (/Готово|Закрыть/i.test(b.textContent || '')) b.click()
        })
        const collapse = document.querySelector('.text-physique .inventory-card__collapse')
        if (collapse instanceof HTMLElement) collapse.click()
      })
      await page.waitForTimeout(250)

      // Filled block view — personality traits
      const trait = page.locator('#text-block-personality').first()
      if (await trait.count()) {
        await trait.scrollIntoViewIfNeeded()
        const glance = trait.locator('button.text-block__glance').first()
        if (await glance.count()) await glance.click()
        await page.waitForTimeout(350)
      }
      await shotSocialPanel(page, out(`social-block-view-${w}.png`))
      report.shots.push(`social-block-view-${w}`)

      // Edit personality block
      const editBtn = page.locator('#text-block-personality .ui-button, .text-block--view .ui-button').filter({ hasText: /^Изменить$/ }).first()
      if (await editBtn.count()) {
        await editBtn.click()
        await page.waitForTimeout(450)
      }
      if (w < 960 && (await page.locator('.ui-dialog').count())) {
        await page.locator('.ui-dialog').first().screenshot({ path: out(`social-block-edit-${w}.png`) })
        await page.locator('.ui-dialog').first().screenshot({ path: out('social-editor-dialog-390.png') })
        report.shots.push('social-editor-dialog-390')
        await page.getByRole('button', { name: /^Готово$/ }).click().catch(() => {})
      } else {
        await shotSocialPanel(page, out(`social-block-edit-${w}.png`))
        if (w < 960) {
          await shotViewport(page, out('social-editor-dialog-390.png'))
          report.shots.push('social-editor-dialog-390')
        }
      }
      report.shots.push(`social-block-edit-${w}`)
    })
  }

  // Pair composites vs before- if present
  const pairPage = await browser.newPage()
  for (const w of [1440, 390]) {
    const beforeHdr = `${ART}/before-hdr-${w}.png`
    const afterHdr = `${ART}/hdr-${w}.png`
    if (TAG === '' && existsSync(beforeHdr) && existsSync(afterHdr)) {
      await composePair(
        pairPage,
        w,
        beforeHdr,
        afterHdr,
        out(`hdr-pair-${w}.png`),
        'до (main)',
        'после (SOC-01)',
      )
      report.shots.push(`hdr-pair-${w}`)
    }
  }
  const beforeScene = `${ART}/before-scene-block-1440.png`
  const afterScene = `${ART}/scene-block-1440.png`
  if (TAG === '' && existsSync(beforeScene) && existsSync(afterScene)) {
    await composePair(
      pairPage,
      1440,
      beforeScene,
      afterScene,
      out('scene-block-pair-1440.png'),
      'до (main)',
      'после (SOC-01)',
    )
    report.shots.push('scene-block-pair-1440')
  }
  await pairPage.close()
} finally {
  await browser.close()
}

const files = report.shots.map((name) => out(`${name}.png`)).filter((p) => existsSync(p) || existsSync(p.replace(/\.png$/, '.missing.txt')))
for (const f of [
  ...new Set([
    ...files,
    out('social-editor-dialog-390.png'),
    out('hdr-pair-1440.png'),
    out('hdr-pair-390.png'),
    out('scene-block-pair-1440.png'),
  ]),
]) {
  if (!existsSync(f)) continue
  report.md5[f.replace(`${ART}/`, '')] = md5(f)
}

writeFileSync(`${ART}/soc01-capture-report${TAG ? `-${TAG.replace(/-$/, '')}` : ''}.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
