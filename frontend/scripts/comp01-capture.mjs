/**
 * COMP-01 screenshots for «Напарники».
 * Requires API :8000 + vite :5173 + seed_comp01_chars.py.
 *
 * COMP01_TAG=before-  → кадры «до»
 * COMP01_TAG=         → кадры «после» (ветка)
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.COMP01_BASE || 'http://127.0.0.1:5173'
const TAG = process.env.COMP01_TAG || ''
const EMPTY = 'cccccccc-cccc-4ccc-8ccc-cccccccccd01'
const RANGER = 'cccccccc-cccc-4ccc-8ccc-cccccccccd02'
const FAM = 'cccccccc-cccc-4ccc-8ccc-cccccccccd03'
const DRUID = 'cccccccc-cccc-4ccc-8ccc-cccccccccd04'
const STEED = 'cccccccc-cccc-4ccc-8ccc-cccccccccd05'

mkdirSync(ART, { recursive: true })
const out = (name) => `${ART}/${TAG}${name}`

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
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  await page.waitForSelector('.play-desk', { timeout: 25_000 })
}

async function openCompanions(page, w) {
  if (w < 960) {
    const nav = page
      .locator('.mobile-scene-nav__tab')
      .filter({ hasText: /Напарн/i })
    if (await nav.count()) {
      await nav.first().click({ force: true }).catch(() => {})
    } else {
      await page.evaluate(() => {
        const tab = [...document.querySelectorAll('.mobile-scene-nav__tab')].find((el) =>
          /Напарн/i.test(el.textContent || ''),
        )
        if (tab instanceof HTMLElement) tab.click()
      })
    }
  }
  const tab = page.locator(
    [
      'button.play-desk__mode[data-mode="companions"]',
      'button:has-text("Напарники")',
    ].join(', '),
  )
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(500)
  await page.waitForSelector('.companions-panel', { timeout: 15_000 }).catch(() => {})
  // Mobile: wait until the panel is actually laid out (not display:none / 0×0).
  if (w < 960) {
    await page
      .waitForFunction(() => {
        const panel = document.querySelector('.companions-panel')
        if (!panel) return false
        const r = panel.getBoundingClientRect()
        return r.width > 40 && r.height > 40
      }, { timeout: 10_000 })
      .catch(() => {})
  }
}

async function openCombat(page, w) {
  if (w < 960) {
    const nav = page
      .locator('.mobile-scene-nav button, .mobile-scene-nav__tab')
      .filter({ hasText: /Бой/i })
    if (await nav.count()) await nav.first().click().catch(() => {})
  }
  const tab = page.locator(
    ['button.play-desk__mode[data-mode="combat"]', 'button:has-text("Бой")'].join(', '),
  )
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(400)
}

async function shot(page, name) {
  await page.screenshot({ path: out(name), fullPage: false })
  console.log('wrote', name, md5(out(name)))
}

async function shotEl(page, selector, name) {
  const el = page.locator(selector).first()
  if (!(await el.count())) {
    console.warn('missing', selector, '→', name)
    await shot(page, name)
    return null
  }
  const box = await el.boundingBox().catch(() => null)
  if (!box || box.width < 2 || box.height < 2) {
    console.warn('invisible', selector, '→ full page', name)
    await shot(page, name)
    return null
  }
  await el.screenshot({ path: out(name) })
  console.log('wrote', name, md5(out(name)))
  return box
}

async function closeDialogs(page) {
  for (let i = 0; i < 3; i += 1) {
    const dlg = page.locator('.ui-dialog-backdrop, [role="dialog"]')
    if (!(await dlg.count())) break
    await page.keyboard.press('Escape').catch(() => {})
    const done = page.getByRole('button', { name: /Готово|Отмена|Закрыть/i })
    if (await done.count()) await done.first().click().catch(() => {})
    await page.waitForTimeout(200)
  }
}

async function expandFirstCard(page) {
  await closeDialogs(page)
  const expanded = page.locator('.companion-card--expand').first()
  if (await expanded.count()) return
  await page.evaluate(() => {
    const glance = document.querySelector('.companion-card__glance')
    if (glance instanceof HTMLElement) {
      glance.scrollIntoView({ block: 'center', inline: 'nearest' })
      glance.click()
    }
  })
  await page.waitForTimeout(350)
}

async function collapseAllCards(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.inventory-card__collapse').forEach((btn) => {
      if (btn instanceof HTMLElement) btn.click()
    })
  })
  await page.waitForTimeout(250)
}

async function withViewport(browser, w, fn) {
  const context = await browser.newContext({
    viewport: { width: w, height: w < 960 ? 844 : 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await login(page)
  await fn(page, w)
  await context.close()
}

async function main() {
  // Always reseed so prior 0hp / dismiss mutations don't poison later frames.
  const { spawnSync } = await import('node:child_process')
  const seed = spawnSync(
    'bash',
    ['-lc', 'cd /agent/repos/Dvarf/backend && PYTHONPATH=. .venv/bin/python scripts/seed_comp01_chars.py'],
    { encoding: 'utf8' },
  )
  if (seed.status !== 0) {
    console.error(seed.stdout || '')
    console.error(seed.stderr || '')
    throw new Error('seed_comp01_chars failed')
  }
  console.log('seeded', (seed.stdout || '').trim())

  const browser = await chromium.launch({ headless: true })
  const report = { tag: TAG || 'after', files: {} }

  // Empty wizard
  for (const w of [1440, 390]) {
    await withViewport(browser, w, async (page) => {
      await openSheet(page, EMPTY)
      await openCompanions(page, w)
      if (w === 1440) {
        await shotEl(
          page,
          '.play-desk-header, .play-desk__header, [data-onboarding="sheet-header"], .m01-sheet-header, .sheet-sticky-header',
          'hdr-pair-1440.png',
        )
        await shotEl(page, '.play-desk__modes, .play-desk__mode-tabs', 'scene-block-pair-1440.png')
      } else {
        await shotEl(
          page,
          '.play-desk-header, .play-desk__header, [data-onboarding="sheet-header"], .m01-sheet-header, .sheet-sticky-header, .mobile-vitals',
          'hdr-pair-390.png',
        )
      }
      await shotEl(page, '.companions-panel, .ui-empty', `comp-empty-wizard-${w}.png`)
      await shot(page, `comp-empty-generic-${w}.png`)
    })
  }

  // Druid empty-ish / card
  for (const w of [1440, 390]) {
    await withViewport(browser, w, async (page) => {
      await openSheet(page, DRUID)
      await openCompanions(page, w)
      await shotEl(page, '.companions-panel', `comp-empty-druid-${w}.png`)
      await expandFirstCard(page)
      await shotEl(page, '.companion-card--expand, .companions-panel', `comp-card-view-druid-${w}.png`)
    })
  }

  // Ranger card + combat
  for (const w of [1440, 390]) {
    await withViewport(browser, w, async (page) => {
      await openSheet(page, RANGER)
      await openCompanions(page, w)
      await expandFirstCard(page)
      await shotEl(page, '.companion-card--expand, .companions-panel', `comp-card-view-ranger-${w}.png`)
      if (w === 1440) {
        const edit = page.getByRole('button', { name: /^Изменить$/ })
        if (await edit.count()) {
          await edit.first().click()
          await page.waitForTimeout(300)
          await shotEl(page, '.companion-card--expand, .ui-dialog', 'comp-card-edit-1440.png')
        }
      } else {
        const edit = page.getByRole('button', { name: /^Изменить$/ })
        if (await edit.count()) {
          await edit.first().click()
          await page.waitForTimeout(400)
          await shotEl(page, '.ui-dialog, [role="dialog"]', 'comp-card-edit-dialog-390.png')
          await closeDialogs(page)
        }
      }
      // dismiss / resummon on a fresh sheet load
      await closeDialogs(page)
      await openSheet(page, RANGER)
      await openCompanions(page, w)
      await expandFirstCard(page)
      const dismiss = page.getByRole('button', { name: /Отпустить/ })
      if (await dismiss.count()) {
        await dismiss.first().click({ force: true })
        await page.waitForTimeout(450)
        await collapseAllCards(page)
        // Dismiss: свёрнутая приглушённая карточка с бейджем «не призван».
        await shotEl(page, '.companions-panel', `comp-dismiss-${w}.png`)
        await expandFirstCard(page)
        // Resummon: раскрытая неактивная + яркая «Призвать снова» (до клика).
        await shotEl(page, '.companions-panel', `comp-resummon-${w}.png`)
        const resummon = page.getByRole('button', { name: /Призвать снова/ })
        if (await resummon.count()) {
          await resummon.first().click({ force: true })
          await page.waitForTimeout(400)
        }
      }

      await openCombat(page, w)
      await shotEl(
        page,
        '.play-desk-compact--attacks, .play-desk__stage-panel',
        `comp-combat-ranger-${w}.png`,
      )
    })
  }

  // 0 HP beast — separate pass so dialog state cannot block
  for (const w of [1440, 390]) {
    await withViewport(browser, w, async (page) => {
      await openSheet(page, RANGER)
      await openCompanions(page, w)
      await expandFirstCard(page)
      const editBtn = page.getByRole('button', { name: /^Изменить$/ })
      if (await editBtn.count()) await editBtn.first().click({ force: true }).catch(() => {})
      await page.waitForTimeout(250)
      await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('.ui-field__label, label'))
        for (const lab of labels) {
          if (!/^Хиты/.test((lab.textContent || '').trim())) continue
          const field = lab.closest('.ui-field')
          const input = field?.querySelector('input')
          if (!input) continue
          const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
          native?.set?.call(input, '0')
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.dispatchEvent(new Event('change', { bubbles: true }))
          input.blur()
        }
      })
      await page.waitForTimeout(400)
      await closeDialogs(page)
      await shotEl(page, '.companions-panel', `comp-0hp-beast-ranger-${w}.png`)
    })
  }

  // Familiar
  for (const w of [1440, 390]) {
    await withViewport(browser, w, async (page) => {
      await openSheet(page, FAM)
      await openCompanions(page, w)
      await expandFirstCard(page)
      await shotEl(page, '.companion-card--expand, .companions-panel', `comp-card-view-fam-${w}.png`)
      await collapseAllCards(page)
      await shotEl(page, '.companions-panel', `comp-fam-created-${w}.png`)
      if (w === 1440) {
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button.play-desk__mode')].find((el) =>
            /Заклинания|Магия/i.test((el.textContent || '').trim()),
          )
          if (btn instanceof HTMLElement) btn.click()
        })
        await page.waitForTimeout(500)
        await page.evaluate(() => {
          const cast = [...document.querySelectorAll('button')].find(
            (el) => (el.textContent || '').trim() === 'Каст',
          )
          if (cast instanceof HTMLElement) cast.click()
        })
        await page.waitForTimeout(600)
        await shotEl(page, '.ui-dialog, [role="dialog"]', 'comp-fam-cast-block-before.png')
        const chip = page.getByRole('checkbox', { name: /Компонент есть/ })
        const toggle = page.locator('button, [role="checkbox"]').filter({ hasText: /Компонент есть/ })
        if (await chip.count()) {
          await chip.click()
          await page.waitForTimeout(200)
          await shotEl(page, '.ui-dialog, [role="dialog"]', 'comp-fam-component-check-1440.png')
        } else if (await toggle.count()) {
          await toggle.first().click()
          await page.waitForTimeout(200)
          await shotEl(page, '.ui-dialog, [role="dialog"]', 'comp-fam-component-check-1440.png')
        }
      }
      await openCombat(page, w)
      await shotEl(
        page,
        '.play-desk-compact--attacks, .play-desk__stage-panel',
        `comp-combat-fam-${w}.png`,
      )
    })
  }

  // Steed — сначала оба кадра «карточка / бой» (0 HP мутирует API, иначе 390 пустой).
  for (const w of [1440, 390]) {
    await withViewport(browser, w, async (page) => {
      await openSheet(page, STEED)
      await openCompanions(page, w)
      await page
        .waitForFunction(
          () => document.querySelectorAll('.companion-card').length > 0,
          { timeout: 10_000 },
        )
        .catch(() => {})
      await expandFirstCard(page)
      const expanded = page.locator('.companion-card--expand').first()
      if (await expanded.count()) {
        await shotEl(page, '.companion-card--expand', `comp-card-view-steed-${w}.png`)
      } else {
        console.warn('steed card not expanded', w)
        await shotEl(page, '.companions-panel', `comp-card-view-steed-${w}.png`)
      }
      await openCombat(page, w)
      await shotEl(
        page,
        '.play-desk-compact--attacks, .play-desk__stage-panel',
        `comp-combat-steed-${w}.png`,
      )
    })
  }

  // Steed 0hp — отдельный проход с reseeds, чтобы не портить view-кадры.
  for (const w of [1440, 390]) {
    const { spawnSync } = await import('node:child_process')
    spawnSync(
      'bash',
      ['-lc', 'cd /agent/repos/Dvarf/backend && PYTHONPATH=. .venv/bin/python scripts/seed_comp01_chars.py'],
      { encoding: 'utf8' },
    )
    await withViewport(browser, w, async (page) => {
      await openSheet(page, STEED)
      await openCompanions(page, w)
      await expandFirstCard(page)
      const editBtn = page.getByRole('button', { name: /^Изменить$/ })
      if (await editBtn.count()) await editBtn.first().click({ force: true }).catch(() => {})
      await page.waitForTimeout(250)
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'))
        for (const input of inputs) {
          const lab = input.closest('.ui-field, .sheet-grid')?.querySelector('label, .ui-field__label')
          if (lab && /Хиты/i.test(lab.textContent || '') && !/Макс/i.test(lab.textContent || '')) {
            const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
            native?.set?.call(input, '0')
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
          }
        }
      })
      await page.waitForTimeout(400)
      await closeDialogs(page)
      await shot(page, `comp-0hp-summon-steed-${w}.png`)
    })
  }

  // Familiar 0hp — full page so empty panel ≠ empty-wizard (разный персонаж в шапке)
  for (const w of [1440, 390]) {
    await withViewport(browser, w, async (page) => {
      await openSheet(page, FAM)
      await openCompanions(page, w)
      await expandFirstCard(page)
      const editBtn = page.getByRole('button', { name: /^Изменить$/ })
      if (await editBtn.count()) await editBtn.first().click({ force: true }).catch(() => {})
      await page.waitForTimeout(250)
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'))
        for (const input of inputs) {
          const lab = input.closest('.ui-field, .sheet-grid')?.querySelector('label, .ui-field__label')
          if (lab && /Хиты/i.test(lab.textContent || '') && !/Макс/i.test(lab.textContent || '')) {
            const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
            native?.set?.call(input, '0')
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
          }
        }
      })
      await page.waitForTimeout(400)
      await closeDialogs(page)
      await shot(page, `comp-0hp-summon-fam-${w}.png`)
    })
  }

  const names = [
    'hdr-pair-1440.png',
    'hdr-pair-390.png',
    'scene-block-pair-1440.png',
    'comp-empty-wizard-1440.png',
    'comp-empty-wizard-390.png',
    'comp-card-view-ranger-1440.png',
    'comp-card-view-ranger-390.png',
    'comp-card-edit-1440.png',
    'comp-card-edit-dialog-390.png',
    'comp-dismiss-1440.png',
    'comp-dismiss-390.png',
    'comp-resummon-1440.png',
    'comp-resummon-390.png',
    'comp-combat-steed-1440.png',
    'comp-combat-ranger-1440.png',
    'comp-combat-fam-1440.png',
    'comp-fam-cast-block-before.png',
    'comp-fam-component-check-1440.png',
    'comp-0hp-summon-fam-1440.png',
    'comp-0hp-summon-fam-390.png',
    'comp-fam-created-1440.png',
    'comp-card-view-fam-1440.png',
  ]
  const hashes = new Map()
  for (const name of names) {
    const path = out(name)
    const h = md5(path)
    report.files[name] = { path, md5: h }
    if (h) {
      if (!hashes.has(h)) hashes.set(h, [])
      hashes.get(h).push(name)
    }
  }
  const dupes = [...hashes.entries()].filter(([, files]) => files.length > 1)
  report.duplicateMd5 = dupes.map(([hash, files]) => ({ hash, files }))
  writeFileSync(`${ART}/comp01-capture-report${TAG || 'after'}.json`, JSON.stringify(report, null, 2))
  writeFileSync(
    `${ART}/comp01-md5s.txt`,
    names.map((n) => `${report.files[n]?.md5 || 'missing'}  ${n}`).join('\n') + '\n',
  )
  console.log('comp01 capture done', TAG || 'after', 'dupes', dupes.length)
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
