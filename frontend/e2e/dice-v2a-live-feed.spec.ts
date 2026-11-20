/**
 * DICE-02a live feed — real backend + two browser contexts (GM + player).
 * Env (required):
 *   DICE_LIVE=1
 *   DICE_GM_ACCESS / DICE_GM_REFRESH
 *   DICE_PC_ACCESS / DICE_PC_REFRESH
 *   DICE_SESSION_ID / DICE_PC_CHAR_ID
 * Optional: DICE_SHOT_DIR, DICE_E2E_BASE (default http://127.0.0.1:5173)
 */
import { expect, test, type Browser, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const LIVE = process.env.DICE_LIVE === '1'
const OUT = process.env.DICE_SHOT_DIR || '/opt/cursor/artifacts/dice-v2a'
const SESSION_ID = process.env.DICE_SESSION_ID || ''
const PC_CHAR = process.env.DICE_PC_CHAR_ID || ''

test.describe('DICE-02a live session feed', () => {
  test.skip(!LIVE, 'Set DICE_LIVE=1 and auth/session env to run')

  test('a–г: skill / attack+damage / only-me / free panel → GM feed', async ({
    browser,
  }, testInfo) => {
    const width = testInfo.project.name.includes('390') ? 390 : 1440
    const tag = width <= 500 ? '390' : '1440'
    mkdirSync(OUT, { recursive: true })

    const gm = await authedContext(browser, 'gm')
    const pc = await authedContext(browser, 'pc')
    const gmPage = await gm.newPage()
    const pcPage = await pc.newPage()
    await gmPage.setViewportSize({ width, height: width <= 500 ? 844 : 900 })
    await pcPage.setViewportSize({ width, height: width <= 500 ? 844 : 900 })

    await gmPage.goto(`/sessions/${SESSION_ID}`)
    await expect(gmPage.locator('.session-event-feed, .session-live-desk, [role="tab"]').first()).toBeVisible({
      timeout: 20_000,
    })
    await dismissOnboarding(gmPage)
    await ensureGmFeed(gmPage)
    // Desktop rail + mobile panel both mount a feed; pick the visible one.
    await expect(gmPage.locator('.session-event-feed').locator('visible=true').first()).toBeVisible({
      timeout: 15_000,
    })

    await pcPage.goto(`/characters/${PC_CHAR}`)
    await expect(pcPage.getByTestId('dice-fab')).toBeVisible({ timeout: 20_000 })
    await dismissOnboarding(pcPage)
    await pcPage.waitForTimeout(500)

    const feedCount = async () =>
      gmPage.locator('.session-event-feed').locator('visible=true').locator('.session-event-feed__item').count()

    // (а) skill → GM feed
    await clickSkill(pcPage)
    await expect.poll(async () => feedCount(), { timeout: 15_000 }).toBeGreaterThan(0)
    await ensureGmFeed(gmPage)
    await shotPair(gmPage, pcPage, `live-a-skill-feed-${tag}`)

    // (б) attack + damage
    const before = await feedCount()
    const hit = pcPage.locator('.play-desk-compact__hit').first()
    if (await hit.count()) {
      await hit.click()
      const dmg = pcPage.locator('.play-desk-compact__dmg--roll').first()
      if (await dmg.count()) await dmg.click()
    } else if (width <= 500) {
      const combat = pcPage.getByRole('button', { name: /Бой|Атаки/i }).first()
      if (await combat.isVisible().catch(() => false)) await combat.click()
      await pcPage.locator('.play-desk-compact__hit').first().click({ timeout: 5000 }).catch(() => {})
      await pcPage.locator('.play-desk-compact__dmg--roll').first().click({ timeout: 5000 }).catch(() => {})
    }
    await expect.poll(async () => feedCount(), { timeout: 15_000 }).toBeGreaterThan(before)
    await ensureGmFeed(gmPage)
    await shotPair(gmPage, pcPage, `live-b-attack-feed-${tag}`)

    // (в) Только себе — feed unchanged, journal has entry
    await pcPage.getByTestId('dice-fab').click()
    const onlyMe = pcPage.getByTestId('dice-only-me')
    await expect(onlyMe).toBeVisible()
    if ((await onlyMe.getAttribute('aria-checked')) !== 'true') {
      await onlyMe.click()
    }
    await expect(onlyMe).toHaveAttribute('aria-checked', 'true')
    await pcPage.locator('.ui-bottom-sheet__close, .ui-floating-panel__close').click()
    const mid = await feedCount()
    await clickSkill(pcPage)
    await pcPage.waitForTimeout(800)
    expect(await feedCount()).toBe(mid)
    await pcPage.getByTestId('dice-fab').click()
    await expect(pcPage.getByTestId('dice-log').locator('li').first()).toBeVisible()
    await ensureGmFeed(gmPage)
    await shotPair(gmPage, pcPage, `live-c-only-me-${tag}`)
    // turn only-me off for (г)
    await expect(onlyMe).toHaveAttribute('aria-checked', 'true')
    await onlyMe.click()
    await expect(onlyMe).toHaveAttribute('aria-checked', 'false')
    await pcPage.locator('.ui-bottom-sheet__close, .ui-floating-panel__close').click()

    // (г) free panel roll → feed
    const beforeFree = await feedCount()
    await pcPage.getByTestId('dice-fab').click()
    await expect(pcPage.getByTestId('dice-only-me')).toHaveAttribute('aria-checked', 'false')
    await pcPage.getByRole('button', { name: 'Добавить к20' }).click()
    await pcPage.getByTestId('dice-roll-submit').click()
    await expect.poll(async () => feedCount(), { timeout: 15_000 }).toBeGreaterThan(beforeFree)
    await ensureGmFeed(gmPage)
    await shotPair(gmPage, pcPage, `live-d-free-panel-feed-${tag}`)

    await gm.close()
    await pc.close()
  })
})

async function authedContext(browser: Browser, who: 'gm' | 'pc') {
  const access =
    who === 'gm' ? process.env.DICE_GM_ACCESS : process.env.DICE_PC_ACCESS
  const refresh =
    who === 'gm' ? process.env.DICE_GM_REFRESH : process.env.DICE_PC_REFRESH
  if (!access || !refresh) throw new Error(`missing tokens for ${who}`)
  const ctx = await browser.newContext()
  await ctx.addInitScript(
    ([a, r]) => {
      localStorage.setItem('dvarf.access_token', a)
      localStorage.setItem('dvarf.refresh_token', r)
    },
    [access, refresh] as [string, string],
  )
  return ctx
}

async function ensureGmFeed(page: Page) {
  await dismissOnboarding(page)
  // Direct DOM click — onboarding overlays / tour often swallow Playwright clicks.
  await page.evaluate(() => {
    const root = document.querySelector('.session-live-tabs--mobile-only')
    if (!root) return
    const btn = Array.from(root.querySelectorAll('button')).find(
      (el) => el.textContent?.trim() === 'Лента',
    ) as HTMLButtonElement | undefined
    btn?.click()
  })
  await page.waitForTimeout(300)
}

async function dismissOnboarding(page: Page) {
  for (let i = 0; i < 3; i += 1) {
    const skipTips = page.getByRole('button', { name: /Пропустить подсказки/i })
    if (await skipTips.isVisible().catch(() => false)) {
      await skipTips.click()
      await page.waitForTimeout(250)
      continue
    }
    const skip = page.getByRole('button', { name: /^Пропустить$/i })
    if (await skip.isVisible().catch(() => false)) {
      await skip.click()
      await page.waitForTimeout(250)
      continue
    }
    break
  }
  const close = page.locator('.ui-dialog-close, .ui-dialog__close, button[aria-label="Закрыть"]').first()
  if (await close.isVisible().catch(() => false)) {
    await close.click().catch(() => {})
  }
}

async function clickSkill(page: Page) {
  await dismissOnboarding(page)
  const w = page.viewportSize()?.width ?? 1440
  if (w <= 500) {
    const chip = page
      .locator('.play-desk__hot-item')
      .filter({ hasText: /Атлетика|Акробатика|Анализ|Внимание|Магия|Скрытность/i })
      .first()
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await chip.click({ force: true })
    return
  }
  // Desktop: skill strip under combat modes, or left-rail skill roll.
  const strip = page
    .locator('.play-desk-skill-strip button, .play-desk__skill-chip, .abil-skill__roll')
    .filter({ hasText: /Атлетика|Акробатика|Анализ|Внимание|Магия|Скрытность/i })
    .first()
  if (await strip.count()) {
    await expect(strip).toBeVisible({ timeout: 15_000 })
    await strip.click()
    return
  }
  const intBlock = page.locator('.abil-block').filter({ hasText: 'Интеллект' }).first()
  const chevron = intBlock.locator('.abil-block__label-chevron')
  if ((await chevron.getAttribute('aria-expanded')) === 'false') {
    await chevron.click()
  }
  await intBlock.locator('.abil-skill').filter({ hasText: 'Магия' }).locator('.abil-skill__roll').click()
}

async function shotPair(gm: Page, pc: Page, base: string) {
  await gm.screenshot({ path: join(OUT, `${base}-gm.png`), fullPage: false })
  await pc.screenshot({ path: join(OUT, `${base}-pc.png`), fullPage: false })
}
