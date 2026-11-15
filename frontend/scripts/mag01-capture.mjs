/**
 * MAG-01 screenshots — each frame is a distinct state (no copy aliases).
 * Requires API :8000 + vite :5173 + seed_mag01_chars.py
 *
 * Optional: MAG01_BEFORE_BASE=http://127.0.0.1:5174 for hdr/scene/combat «до» from main.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.MAG01_BASE || 'http://127.0.0.1:5173'
const BEFORE_BASE = process.env.MAG01_BEFORE_BASE || ''

const WIZ20 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc01'
const SORC20 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc02'
const MULTI3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc03'
const PAL_WL = 'cccccccc-cccc-4ccc-8ccc-cccccccccc04'
const CLERIC5 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc05'
const ROGUE5 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc06'
const DRUID5 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc07'
const WARLOCK1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc08'

mkdirSync(ART, { recursive: true })
const out = (name) => `${ART}/${name}`

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

async function openSheet(page, id, base = BASE) {
  await page.goto(`${base}/characters/${id}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  const expand = page.getByRole('button', { name: /Развернуть шапку/i })
  if (await expand.count()) await expand.first().click().catch(() => {})
  await page.waitForSelector('.play-desk', { timeout: 25_000 })
}

async function openCombat(page, w) {
  if (w < 960) {
    const nav = page.locator('.mobile-scene-nav button, .mobile-scene-nav__tab').filter({ hasText: /Бой/i })
    if (await nav.count()) await nav.first().click().catch(() => {})
  }
  const tab = page.locator('button.play-desk__mode[data-mode="combat"], button.play-desk__mode').filter({ hasText: /^Бой$/i })
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(350)
}

async function openFeatures(page, w) {
  if (w < 960) {
    const nav = page.locator('.mobile-scene-nav button, .mobile-scene-nav__tab').filter({ hasText: /Способности|Умения/i })
    if (await nav.count()) await nav.first().click().catch(() => {})
  }
  const tab = page.locator('button.play-desk__mode').filter({ hasText: /Способности|Умения/i })
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(400)
}

async function showSpellsMobile(page) {
  const seg = page.locator('.mobile-combat-seg__btn, button').filter({ hasText: /^Заклинания$/i })
  if (await seg.count()) await seg.first().click().catch(() => {})
  await page.waitForTimeout(300)
}

function spellsRoot(page) {
  return page.locator('.play-desk-compact--spells').first()
}

async function collapseAllSpells(page) {
  const btn = spellsRoot(page).getByRole('button', { name: /Свернуть все круги заклинаний|Свернуть все/i })
  if (await btn.count()) await btn.first().click()
  await page.waitForTimeout(250)
}

async function expandAllSpells(page) {
  const btn = spellsRoot(page).getByRole('button', { name: /Развернуть все круги заклинаний|Развернуть все/i })
  if (await btn.count()) await btn.first().click()
  await page.waitForTimeout(250)
}

async function openMagicSettings(page) {
  // Do NOT match scene chip «магия» — only the spells column settings link.
  const btn = spellsRoot(page).locator('button.play-desk-compact__link--settings')
  await btn.click()
  await page.waitForTimeout(450)
}

async function shot(page, name, w) {
  await page.setViewportSize({ width: w, height: w < 960 ? 844 : 900 })
  await page.waitForTimeout(180)
  await page.screenshot({ path: out(name), fullPage: false })
  console.log('wrote', name)
}

async function shotEl(page, selector, name) {
  const el = page.locator(selector).first()
  if (!(await el.count())) {
    console.warn('missing', selector, '→', name)
    await page.screenshot({ path: out(name), fullPage: false })
    return null
  }
  await el.screenshot({ path: out(name) })
  const box = await el.boundingBox()
  console.log('wrote', name, box)
  return box
}

async function withViewport(browser, w, fn, base = BASE) {
  const context = await browser.newContext({
    viewport: { width: w, height: w < 960 ? 844 : 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await login(page)
  await fn(page)
  await context.close()
}

async function measureHeader(page) {
  return page.evaluate(() => {
    const hdr =
      document.querySelector('.play-desk-header') ||
      document.querySelector('.play-desk__header') ||
      document.querySelector('[data-onboarding="sheet-header"]') ||
      document.querySelector('.minimal-sheet__header')
    if (!hdr) return null
    const r = hdr.getBoundingClientRect()
    return { top: r.top, height: r.height, width: r.width, left: r.left }
  })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const measures = { before: null, after: null }

  // --- Control pair: before (main) if available ---
  if (BEFORE_BASE) {
    await withViewport(
      browser,
      1440,
      async (page) => {
        await openSheet(page, WIZ20, BEFORE_BASE)
        await openCombat(page, 1440)
        measures.before = await measureHeader(page)
        await shotEl(page, '.play-desk-header, .play-desk__header, [data-onboarding="sheet-header"]', 'hdr-pair-1440-before.png')
        await shotEl(page, '.play-desk__modes, .play-desk__mode-tabs', 'scene-block-pair-1440-before.png')
        await shotEl(
          page,
          '.play-desk-compact--attacks, .play-desk__stage-panel:not(.is-pinned)',
          'combat-pair-1440-before.png',
        )
        await shot(page, 'hdr-pair-1440.png', 1440) // will overwrite with after later if needed
      },
      BEFORE_BASE,
    )
    await withViewport(
      browser,
      390,
      async (page) => {
        await openSheet(page, WIZ20, BEFORE_BASE)
        await openCombat(page, 390)
        await shotEl(page, '.play-desk-header, .play-desk__header, [data-onboarding="sheet-header"]', 'hdr-pair-390-before.png')
        await shotEl(
          page,
          '.play-desk-compact--attacks, .play-desk__stage-panel:not(.is-pinned)',
          'combat-pair-390-before.png',
        )
      },
      BEFORE_BASE,
    )
  }

  // --- Wizard 20 @ 1440 ---
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, WIZ20)
    await openCombat(page, 1440)
    measures.after = await measureHeader(page)

    await shotEl(page, '.play-desk-header, .play-desk__header, [data-onboarding="sheet-header"]', 'hdr-pair-1440-after.png')
    await shotEl(page, '.play-desk__modes, .play-desk__mode-tabs', 'scene-block-pair-1440-after.png')
    await shotEl(
      page,
      '.play-desk-compact--attacks, .play-desk__stage-panel:not(.is-pinned)',
      'combat-pair-1440-after.png',
    )
    // Publish pair names as AFTER (and before if we have it via copy in report)
    await page.screenshot({ path: out('hdr-pair-1440.png'), fullPage: false, clip: undefined })
    const hdr = page.locator('.play-desk-header, .play-desk__header, [data-onboarding="sheet-header"]').first()
    if (await hdr.count()) await hdr.screenshot({ path: out('hdr-pair-1440.png') })
    const scene = page.locator('.play-desk__modes, .play-desk__mode-tabs').first()
    if (await scene.count()) await scene.screenshot({ path: out('scene-block-pair-1440.png') })
    const attacks = page.locator('.play-desk-compact--attacks, .play-desk__stage-panel:not(.is-pinned)').first()
    if (await attacks.count()) await attacks.screenshot({ path: out('combat-pair-1440.png') })

    await collapseAllSpells(page)
    await shot(page, 'wiz20-collapsed-1440.png', 1440)
    // scroll proof: chrome sticky + list scrolled
    await spellsRoot(page).locator('.play-desk-compact__list--scroll').evaluate((el) => {
      el.scrollTop = Math.min(el.scrollHeight, 420)
    })
    await shot(page, 'wiz20-scroll-chrome-1440.png', 1440)

    await expandAllSpells(page)
    await shot(page, 'wiz20-expanded-1440.png', 1440)

    await collapseAllSpells(page)
    await shot(page, 'wiz20-collapse-all-1440.png', 1440)

    const ritualChip = spellsRoot(page).locator('.sheet-chip').filter({ hasText: /ритуалы из книги/i })
    if (await ritualChip.count()) {
      await ritualChip.first().click()
      await page.waitForTimeout(250)
      await shot(page, 'wiz20-ritual-filter-1440.png', 1440)
      await spellsRoot(page).locator('.sheet-chip').filter({ hasText: /^все$/i }).first().click().catch(() => {})
    }

    const search = spellsRoot(page).locator('.play-desk-compact__spell-search input')
    if (await search.count()) {
      await search.first().fill('Огненный')
      await page.waitForTimeout(250)
      await shot(page, 'wiz20-search-1440.png', 1440)
      await search.first().fill('')
    }

    // Book count in Magic settings / prepare — not a desk alias
    await openMagicSettings(page)
    await shot(page, 'wizard-book-count.png', 1440)
    const grim = page.getByRole('button', { name: /Гримуар|В книгу|Книга/i })
    if (await grim.count()) {
      await grim.first().click().catch(() => {})
      await page.waitForTimeout(400)
      await shot(page, 'wizard-book-count-grimoire.png', 1440)
      await page.keyboard.press('Escape')
    }
    await page.keyboard.press('Escape')

    const castBtn = spellsRoot(page).locator('.play-desk-compact__spell-cast').first()
    if (await castBtn.count()) {
      await castBtn.click()
      await page.waitForTimeout(400)
      await shot(page, 'wiz20-cast-1440.png', 1440)
      await page.keyboard.press('Escape')
    }
  })

  // Wizard 390
  await withViewport(browser, 390, async (page) => {
    await openSheet(page, WIZ20)
    await openCombat(page, 390)
    await showSpellsMobile(page)
    const hdr = page.locator('.play-desk-header, .play-desk__header, [data-onboarding="sheet-header"]').first()
    if (await hdr.count()) await hdr.screenshot({ path: out('hdr-pair-390.png') })
    await collapseAllSpells(page)
    await shot(page, 'wiz20-collapsed-390.png', 390)
    await expandAllSpells(page)
    await shot(page, 'wiz20-expanded-390.png', 390)
  })

  // Sorcerer 20
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, SORC20)
    await openCombat(page, 1440)
    await shot(page, 'sorc20-header-1440.png', 1440)
    await shot(page, 'sorc20-points-1440.png', 1440)

    // Expanded list: no metamagic dropdowns in rows — pick only in CastSpellDialog
    await expandAllSpells(page)
    await shot(page, 'sorc20-expanded-1440.png', 1440)
    const fire = spellsRoot(page).locator('.play-desk-compact__row.is-spell').filter({ hasText: /Огненный шар|Fireball/i }).first()
    const row = (await fire.count())
      ? fire
      : spellsRoot(page).locator('.play-desk-compact__row.is-spell.has-cast').first()
    if (await row.count()) {
      await row.scrollIntoViewIfNeeded()
      if (await row.locator('.play-desk-compact__meta-select, select').count()) {
        throw new Error('MAG-01 capture: metamagic select must not appear on spell rows')
      }
      await row.locator('.play-desk-compact__spell-cast').click()
      await page.waitForTimeout(500)
      // Enable distant in dialog
      const distantBox = page.locator('label').filter({ hasText: /Далёкое/i }).locator('input[type="checkbox"]')
      if (await distantBox.count()) {
        const checked = await distantBox.isChecked()
        if (!checked) await distantBox.check({ force: true }).catch(() => {})
      }
      await page.waitForTimeout(250)
      const metaLine = page.locator('text=/С метамагией/i').first()
      if (await metaLine.count()) {
        const parent = metaLine.locator('xpath=..')
        writeFileSync(
          out('sorc20-meta-params.txt'),
          ((await parent.textContent()) || (await metaLine.textContent()) || '').trim(),
        )
      }
      await shot(page, 'sorc20-cast-metamagic-1440.png', 1440)
      const dialog = page.locator('[role="dialog"], .modal, .ui-dialog').filter({ hasText: /Кастовать|Огненн/i }).first()
      const confirm = dialog.getByRole('button', { name: /^Каст$|^Сотворить$|^Применить$|^Ритуал$/i })
      if (await confirm.count()) {
        await confirm.last().click()
      } else {
        const primary = dialog.locator('button').filter({ hasText: /^Каст/i }).last()
        if (await primary.count()) await primary.click()
        else throw new Error('MAG-01 capture: cast confirm button not found (need focus/pouch on seed)')
      }
      await page.waitForTimeout(900)
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(350)
      const afterMeta = {
        toasts: await page.locator('.toast, [class*="toast"]').allTextContents().catch(() => []),
        bodyHits: await page.evaluate(() => {
          const t = document.body.innerText
          return {
            sp: (t.match(/\b\d{1,2}\/20\b/g) || []).slice(0, 6),
            hasToast: /каст|огненн|далёк|списан/i.test(t),
          }
        }),
      }
      writeFileSync(out('sorc20-cast-after-meta.json'), JSON.stringify(afterMeta, null, 2))
      await shot(page, 'sorc20-cast-metamagic-after-1440.png', 1440)
    }

    await openFeatures(page, 1440)
    // Expand «Происхождение» / dragon ancestor card
    const origin = page.locator('.feature-card').filter({ hasText: /Происхождение|Предок|дракон/i }).first()
    if (await origin.count()) {
      await origin.click().catch(() => {})
      await page.waitForTimeout(300)
      const expandBtn = origin.locator('button').filter({ hasText: /свернуть|подроб/i })
      // try glance click to expand
      const glance = page.locator('.feature-card__glance').filter({ hasText: /Происхождение|Предок-дракон|дракон/i }).first()
      if (await glance.count()) await glance.click().catch(() => {})
      await page.waitForTimeout(300)
    }
    // Search for ancestor
    const search = page.locator('input[placeholder*="Избранный"], .feature-search input, input[type="search"]').first()
    if (await search.count()) {
      await search.fill('дракон')
      await page.waitForTimeout(300)
    }
    await shot(page, 'sorc20-ancestor-1440.png', 1440)
  })

  await withViewport(browser, 390, async (page) => {
    await openSheet(page, SORC20)
    await openCombat(page, 390)
    await showSpellsMobile(page)
    await shot(page, 'sorc20-points-390.png', 390)
    await expandAllSpells(page)
    await shot(page, 'sorc20-expanded-390.png', 390)
    if (await spellsRoot(page).locator('.play-desk-compact__meta-select, select').count()) {
      throw new Error('MAG-01 capture 390: metamagic select must not appear on spell rows')
    }
    const castBtn = spellsRoot(page).locator('.play-desk-compact__spell-cast').first()
    if (await castBtn.count()) {
      await castBtn.click()
      await page.waitForTimeout(400)
      const distantBox = page.locator('label').filter({ hasText: /Далёкое|Ускоренн/i }).locator('input[type="checkbox"]').first()
      if (await distantBox.count()) await distantBox.check().catch(() => {})
      await shot(page, 'sorc20-cast-metamagic-390.png', 390)
      await page.keyboard.press('Escape')
    }
  })

  // Multi3
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, MULTI3)
    await openCombat(page, 1440)
    await shot(page, 'multi3-header-1440.png', 1440)
    // class labels: search mage hand
    const search = spellsRoot(page).locator('.play-desk-compact__spell-search input')
    if (await search.count()) {
      await search.fill('Волшебная рука')
      await page.waitForTimeout(250)
    }
    await expandAllSpells(page)
    await shot(page, 'multi3-class-labels-1440.png', 1440)
    if (await search.count()) await search.fill('')

    await collapseAllSpells(page)
    await shot(page, 'multi3-empty-circles-1440.png', 1440)

    await openMagicSettings(page)
    await shot(page, 'multi3-settings-1440.png', 1440)
    await page.keyboard.press('Escape')

    // Wizard 2 picks: grimoire level chips — aloneMaxLevel 1
    await openMagicSettings(page)
    const grim = page.getByRole('button', { name: /Гримуар/i })
    if (await grim.count()) {
      await grim.first().click()
      await page.waitForTimeout(500)
      // filter wizard shelf if present
      const wizShelf = page.locator('button, .sheet-chip').filter({ hasText: /Волшебник|wizard/i }).first()
      if (await wizShelf.count()) await wizShelf.click().catch(() => {})
      await page.waitForTimeout(300)
      await shot(page, 'multi3-wizard2-picks-1440.png', 1440)
      await page.keyboard.press('Escape')
    }
    await page.keyboard.press('Escape')
  })

  await withViewport(browser, 390, async (page) => {
    await openSheet(page, MULTI3)
    await openCombat(page, 390)
    await showSpellsMobile(page)
    await shot(page, 'multi3-header-390.png', 390)
    const search = spellsRoot(page).locator('.play-desk-compact__spell-search input')
    if (await search.count()) {
      await search.fill('Волшебная рука')
      await page.waitForTimeout(250)
    }
    await expandAllSpells(page)
    await shot(page, 'multi3-class-labels-390.png', 390)
  })

  // Paladin / Warlock
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, PAL_WL)
    await openCombat(page, 1440)
    await shot(page, 'pk-pact-1440.png', 1440)
    // combat pair with smite visible
    const attacks = page.locator('.play-desk-compact--attacks, .play-desk__stage-panel:not(.is-pinned)').first()
    if (await attacks.count()) await attacks.screenshot({ path: out('combat-pair-1440-pk.png') })

    // Limit visible on column chrome (подг. 0/4) before opening prepare UI
    const pkQuota = await spellsRoot(page).innerText().catch(() => '')
    writeFileSync(out('pk-prepare-quota.txt'), pkQuota.slice(0, 400))
    await shot(page, 'pk-prepare-1440.png', 1440)
    const prep = spellsRoot(page).getByRole('button', { name: /Подготовить/i })
    if (await prep.count()) {
      await prep.first().click()
      await page.waitForTimeout(500)
      await shot(page, 'pk-prepare-grimoire-1440.png', 1440)
      await page.keyboard.press('Escape')
    } else {
      await openMagicSettings(page)
      const prep2 = page.getByRole('button', { name: /Подготовить/i })
      if (await prep2.count()) await prep2.first().click()
      await page.waitForTimeout(500)
      await shot(page, 'pk-prepare-grimoire-1440.png', 1440)
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
    }

    // Find steed cast → pick → no false toast
    await expandAllSpells(page)
    const steed = spellsRoot(page).locator('.play-desk-compact__row.is-spell').filter({ hasText: /Поиск скакуна/i })
    if (await steed.count()) {
      await steed.locator('.play-desk-compact__spell-cast').click()
      await page.waitForTimeout(400)
      const castConfirm = page.getByRole('button', { name: /^Каст$|^Сотворить$/i })
      if (await castConfirm.count()) await castConfirm.last().click().catch(() => {})
      await page.waitForTimeout(500)
      await shot(page, 'pk-steed-picker-1440.png', 1440)
      const horse = page.getByRole('button', { name: /Боевой конь|Warhorse/i })
      if (await horse.count()) {
        await horse.first().click()
        await page.waitForTimeout(700)
        await shot(page, 'pk-steed-after-1440.png', 1440)
        const toastText = await page.locator('.toast, .ui-toast, [class*="toast"]').allTextContents()
        writeFileSync(out('pk-steed-toasts.json'), JSON.stringify(toastText, null, 2))
        writeFileSync(
          out('pk-steed-ok.txt'),
          toastText.some((t) => /не выбрано/i.test(t)) ? 'FAIL false toast' : 'OK',
        )
      }
    }
  })

  await withViewport(browser, 390, async (page) => {
    await openSheet(page, PAL_WL)
    await openCombat(page, 390)
    await showSpellsMobile(page)
    const prep = spellsRoot(page).getByRole('button', { name: /Подготовить/i })
    if (await prep.count()) {
      await prep.first().click()
      await page.waitForTimeout(400)
      await shot(page, 'pk-prepare-390.png', 390)
      await page.keyboard.press('Escape')
    } else {
      await shot(page, 'pk-prepare-390.png', 390)
    }
    const attacks = page.locator('.play-desk-compact--attacks, .mobile-combat-seg').first()
    if (await attacks.count()) await page.screenshot({ path: out('combat-pair-390.png'), fullPage: false })
  })

  // Cleric / noncaster
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, CLERIC5)
    await openCombat(page, 1440)
    await shot(page, 'cleric5-desk-1440.png', 1440)
  })
  await withViewport(browser, 390, async (page) => {
    await openSheet(page, CLERIC5)
    await openCombat(page, 390)
    await showSpellsMobile(page)
    await shot(page, 'cleric5-desk-390.png', 390)
  })
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, ROGUE5)
    await openCombat(page, 1440)
    await shot(page, 'noncaster-combat-1440.png', 1440)
  })
  await withViewport(browser, 390, async (page) => {
    await openSheet(page, ROGUE5)
    await openCombat(page, 390)
    await shot(page, 'noncaster-combat-390.png', 390)
  })

  // 4a: subclass gate shows chosen name (druid moon)
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, DRUID5)
    await openFeatures(page, 1440)
    const search = page.locator('input[placeholder*="Избранный"], input[type="search"]').first()
    if (await search.count()) {
      await search.fill('Круг')
      await page.waitForTimeout(300)
    }
    const card = page.locator('.feature-card').filter({ hasText: /Круг друидов|Круг луны/i }).first()
    if (await card.count()) await card.scrollIntoViewIfNeeded()
    await shot(page, 'subclass-after-druid-1440.png', 1440)
  })

  // Warlock first patron — open create hydrate or sheet identity / needs-setup
  await withViewport(browser, 1440, async (page) => {
    await openSheet(page, WARLOCK1)
    // Try needs-setup → Магия/Способности or open identity archetype
    const needs = page.getByRole('button', { name: /Нужно настроить/i })
    if (await needs.count()) {
      await needs.first().click()
      await page.waitForTimeout(300)
      const item = page.locator('.needs-setup__item, button').filter({ hasText: /покровител|архетип|колдун/i }).first()
      if (await item.count()) await item.click().catch(() => {})
      await page.waitForTimeout(400)
    }
    // Fallback: features scene gate
    await openFeatures(page, 1440)
    const gate = page.locator('.feature-card, button').filter({ hasText: /покровител|Otherworldly/i }).first()
    if (await gate.count()) await gate.click().catch(() => {})
    await page.waitForTimeout(400)
    // Catalog picker if open
    const archfey = page.getByRole('button', { name: /Архифея|Archfey/i })
    if (await archfey.count()) {
      await archfey.first().click()
      await page.waitForTimeout(500)
      const save = page.getByRole('button', { name: /Сохранить|Выбрать|Готово|Далее/i })
      if (await save.count()) await save.first().click().catch(() => {})
      await page.waitForTimeout(700)
    }
    const toastText = await page.locator('.toast, .ui-toast, [class*="toast"]').allTextContents()
    writeFileSync(out('warlock-patron-toasts.json'), JSON.stringify(toastText, null, 2))
    await shot(page, 'warlock-patron-first.png', 1440)
  })

  writeFileSync(
    out('mag01-header-measure.json'),
    JSON.stringify(
      {
        before: measures.before,
        after: measures.after,
        deltaPx:
          measures.before && measures.after
            ? {
                top: measures.after.top - measures.before.top,
                height: measures.after.height - measures.before.height,
              }
            : null,
      },
      null,
      2,
    ),
  )

  await browser.close()
  console.log('mag01-capture done', measures)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
