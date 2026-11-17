/**
 * DICE-02b live — master + player, digital rolls, hidden/reveal, table tab.
 * Env: DICE_LIVE=1, tokens/session from /tmp/dice02b-live.json or env.
 */
import { expect, test, type Browser, type Page } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const LIVE = process.env.DICE_LIVE === '1'
const OUT = process.env.DICE_SHOT_DIR || '/opt/cursor/artifacts/dice-v2'
const BASE = process.env.DICE_E2E_BASE || 'http://127.0.0.1:5173'

type LiveCfg = {
  session_id: string
  gm: { access: string; refresh: string }
  pc1: { access: string; refresh: string; char_id: string }
}

function loadCfg(): LiveCfg {
  if (process.env.DICE_SESSION_ID && process.env.DICE_GM_ACCESS) {
    return {
      session_id: process.env.DICE_SESSION_ID,
      gm: {
        access: process.env.DICE_GM_ACCESS!,
        refresh: process.env.DICE_GM_REFRESH || '',
      },
      pc1: {
        access: process.env.DICE_PC_ACCESS!,
        refresh: process.env.DICE_PC_REFRESH || '',
        char_id: process.env.DICE_PC_CHAR_ID!,
      },
    }
  }
  return JSON.parse(readFileSync('/tmp/dice02b-live.json', 'utf8')) as LiveCfg
}

async function authedContext(browser: Browser, who: 'gm' | 'pc') {
  const cfg = loadCfg()
  const access = who === 'gm' ? cfg.gm.access : cfg.pc1.access
  const refresh = who === 'gm' ? cfg.gm.refresh : cfg.pc1.refresh
  const ctx = await browser.newContext()
  await ctx.addInitScript(
    ({ access, refresh }) => {
      localStorage.setItem('dvarf.access_token', access)
      localStorage.setItem('dvarf.refresh_token', refresh)
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
    },
    { access, refresh },
  )
  return ctx
}

async function dismissOnboarding(page: Page) {
  const btn = page.getByRole('button', { name: /Пропустить|Понятно|Закрыть|Далее/i }).first()
  if (await btn.isVisible().catch(() => false)) await btn.click().catch(() => {})
}

async function ensureGmFeed(page: Page) {
  const feedTab = page.getByRole('tab', { name: /Лента|Броски|Всё/i }).first()
  if (await feedTab.isVisible().catch(() => false)) await feedTab.click().catch(() => {})
  const all = page.getByRole('tab', { name: /^Всё$|^Броски$/ }).first()
  if (await all.isVisible().catch(() => false)) await all.click().catch(() => {})
}

async function shot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true })
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false })
}

test.describe('DICE-02b live', () => {
  test.skip(!LIVE, 'Set DICE_LIVE=1')

  test('party log, hidden, reveal, table tab', async ({ browser }, testInfo) => {
    const width = testInfo.project.name.includes('390') ? 390 : 1440
    const tag = width <= 500 ? '390' : '1440'
    const cfg = loadCfg()
    mkdirSync(OUT, { recursive: true })

    const gm = await authedContext(browser, 'gm')
    const pc = await authedContext(browser, 'pc')
    const gmPage = await gm.newPage()
    const pcPage = await pc.newPage()
    await gmPage.setViewportSize({ width, height: width <= 500 ? 844 : 900 })
    await pcPage.setViewportSize({ width, height: width <= 500 ? 844 : 900 })
    await gmPage.goto(`${BASE}/sessions/${cfg.session_id}`)
    await pcPage.goto(`${BASE}/characters/${cfg.pc1.char_id}`)
    await expect(gmPage.locator('.session-event-feed, .session-live-desk').first()).toBeVisible({
      timeout: 25_000,
    })
    await expect(pcPage.getByTestId('dice-fab')).toBeVisible({ timeout: 25_000 })
    await dismissOnboarding(gmPage)
    await dismissOnboarding(pcPage)
    await ensureGmFeed(gmPage)

    // Player free roll → feed
    await pcPage.getByTestId('dice-fab').click()
    await pcPage.getByTestId('dice-only-me').click().catch(() => {})
    // ensure only-me off
    const onlyMe = pcPage.getByTestId('dice-only-me')
    if ((await onlyMe.getAttribute('aria-checked')) === 'true') await onlyMe.click()
    await pcPage.locator('.dice-roller-panel__die').filter({ hasText: 'd20' }).first().click()
    await pcPage.getByTestId('dice-roll-submit').click()
    await expect
      .poll(async () =>
        gmPage
          .locator('.session-event-feed')
          .locator('visible=true')
          .locator('.session-event-feed__item')
          .count(),
      )
      .toBeGreaterThan(0)
    await shot(gmPage, `party-log-master-${tag}`)
    await shot(pcPage, `party-log-player-${tag}`)

    // Table tab
    await pcPage.getByTestId('dice-journal-tab-table').click()
    await expect(pcPage.getByTestId('dice-table-log')).toBeVisible({ timeout: 10_000 })
    await shot(pcPage, `sheet-tab-table-${tag}`)
    await pcPage.locator('.ui-bottom-sheet__close, .ui-floating-panel__close').first().click()

    // Skill → feed
    const skillBtn = pcPage.locator('.ability-skills button, .play-desk button').filter({ hasText: /\+\d+|−\d+|-\d+/ }).first()
    if (await skillBtn.count()) {
      await skillBtn.click()
      await gmPage.waitForTimeout(800)
      await shot(gmPage, `skill-to-feed-${tag}`)
    }

    // Hidden master roll
    await gmPage.getByTestId('session-digital-hidden').click()
    await gmPage.getByTestId('session-digital-formula').fill('1d20+2')
    await gmPage.getByTestId('session-digital-title').fill('Скрытая проверка')
    await gmPage.getByTestId('session-digital-submit').click()
    await expect(gmPage.locator('.session-event-feed__total').first()).toBeVisible({
      timeout: 10_000,
    })
    await shot(gmPage, `hidden-master-${tag}`)
    await pcPage.goto(`${BASE}/sessions/${cfg.session_id}`)
    await dismissOnboarding(pcPage)
    await ensureGmFeed(pcPage)
    await expect(pcPage.getByText('Мастер бросил скрыто').first()).toBeVisible({
      timeout: 15_000,
    })
    await shot(pcPage, `hidden-player-${tag}`)

    // Reveal
    await gmPage.getByTestId('roll-reveal').first().click()
    await expect(pcPage.getByText('Скрытая проверка').first()).toBeVisible({
      timeout: 15_000,
    })
    await shot(pcPage, `revealed-player-${tag}`)

    // Physical dice mark via manual form if present
    const manual = gmPage.getByText('Живой куб').first()
    if (await manual.isVisible().catch(() => false)) {
      await manual.click()
      const total = gmPage.locator('input').filter({ hasText: '' }).first()
      // best-effort; screenshot page state
      await shot(gmPage, `dice-on-table-${tag}`)
    }

    // Attack path screenshot from character page
    await pcPage.goto(`${BASE}/characters/${cfg.pc1.char_id}`)
    await dismissOnboarding(pcPage)
    const hit = pcPage.locator('.play-desk-compact__hit').first()
    if (await hit.count()) {
      await hit.click()
      await gmPage.goto(`${BASE}/sessions/${cfg.session_id}`)
      await ensureGmFeed(gmPage)
      await shot(gmPage, `attack-to-feed-${tag}`)
    }

    // 2014 sheet after
    await pcPage.goto(`${BASE}/characters/${cfg.pc1.char_id}`)
    await dismissOnboarding(pcPage)
    await pcPage.evaluate(() => {
      const scroller =
        document.querySelector('.play-desk__stage') ||
        document.querySelector('.play-desk') ||
        document.scrollingElement
      if (scroller) (scroller as HTMLElement).scrollTop = 0
      window.scrollTo(0, 0)
    })
    await shot(pcPage, `sheet-2014-after-${tag}`)
  })
})
