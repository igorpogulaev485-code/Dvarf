/**
 * DICE-02a screenshots → /opt/cursor/artifacts/dice-v2a/
 * sheet-2014-before-* from scripts/dice-before-from-main.sh (DICE_SHOT_DIR override).
 */
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.DICE_SHOT_DIR || '/opt/cursor/artifacts/dice-v2a'

function widthTag(page: Page): string {
  const w = page.viewportSize()?.width ?? 1440
  return w <= 500 ? '390' : '1440'
}

async function shot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true })
  const file = join(OUT, `${name}-${widthTag(page)}.png`)
  await page.screenshot({ path: file, fullPage: false })
}

async function openPreview(
  page: Page,
  opts?: {
    edition?: '2014' | '2024'
    open?: boolean
    session?: boolean
    log?: boolean
    rogue20?: boolean
  },
) {
  const q = new URLSearchParams()
  q.set('edition', opts?.edition ?? '2014')
  q.set('clean', '1')
  if (opts?.open) q.set('open', '1')
  if (opts?.session) q.set('session', '1')
  if (opts?.log) q.set('log', '1')
  if (opts?.rogue20) q.set('rogue20', '1')
  await page.goto(`/dev/dice-roller-preview?${q.toString()}`)
  await expect(page.getByTestId('dice-fab')).toBeVisible()
  await page.waitForTimeout(400)
}

async function openPanel(page: Page) {
  if (!(await page.getByTestId('dice-journal').isVisible().catch(() => false))) {
    await page.getByTestId('dice-fab').click()
  }
  await expect(page.getByTestId('dice-journal')).toBeVisible()
}

async function clickMagicSkill(page: Page) {
  const mobile = (page.viewportSize()?.width ?? 1440) <= 500
  if (mobile) {
    const chip = page
      .locator('.play-desk__hot-item')
      .filter({ hasText: /Атлетика|Акробатика|Анализ|Внимание|Магия/i })
      .first()
    await expect(chip).toBeVisible()
    await chip.click()
    return
  }
  const intBlock = page.locator('.abil-block').filter({ hasText: 'Интеллект' }).first()
  await expect(intBlock).toBeVisible()
  const chevron = intBlock.locator('.abil-block__label-chevron')
  if ((await chevron.getAttribute('aria-expanded')) === 'false') {
    await chevron.click()
  }
  const roll = intBlock.locator('.abil-skill').filter({ hasText: 'Магия' }).locator('.abil-skill__roll')
  await expect(roll).toBeVisible()
  await roll.click()
}

test.describe('DICE-02a screenshots', () => {
  test('sheet-2014-after + fab-clear', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    // Same position as before: scrollTop=0, header visible (Сила not pinned to top).
    await page.evaluate(() => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      document.querySelectorAll('.play-desk__left, .abil-column, .play-desk__stage').forEach((el) => {
        ;(el as HTMLElement).scrollTop = 0
      })
    })
    await page.waitForTimeout(200)
    await shot(page, 'sheet-2014-after')
    await shot(page, 'fab-clear')
  })

  test('skill / save / ability-check / attack / damage', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    const mobile = (page.viewportSize()?.width ?? 1440) <= 500

    await clickMagicSkill(page)
    await openPanel(page)
    await shot(page, 'skill')
    await page.locator('.ui-bottom-sheet__close, .ui-floating-panel__close').click()

    if (mobile) {
      const expand = page.getByRole('button', { name: 'Развернуть шапку' })
      if (await expand.isVisible().catch(() => false)) await expand.click()
      await page.locator('button.mobile-vitals__abil').click()
      const root = page.getByRole('dialog', { name: 'Характеристики' })
      await expect(root).toBeVisible()
      await root.locator('button.abil-mod--roll').filter({ hasText: 'Сп' }).first().click()
      await openPanel(page)
      await shot(page, 'save')
      await page.locator('.ui-bottom-sheet__close, .ui-floating-panel__close').click()
      // Still on characteristics page.
      await root.locator('button.abil-mod--roll').filter({ hasText: 'Пр' }).first().click()
      await openPanel(page)
      await shot(page, 'ability-check')
      await page.locator('.ui-bottom-sheet__close, .ui-floating-panel__close').click()
      await page.locator('.mobile-abil-page__back').click()
    } else {
      await page.locator('.abil-mod--roll').filter({ hasText: 'Сп' }).first().click()
      await openPanel(page)
      await shot(page, 'save')
      await page.locator('.ui-bottom-sheet__close, .ui-floating-panel__close').click()
      await page.locator('.abil-mod--roll').filter({ hasText: 'Пр' }).first().click()
      await openPanel(page)
      await shot(page, 'ability-check')
      await page.locator('.ui-bottom-sheet__close, .ui-floating-panel__close').click()
    }

    const attack = page.locator('.play-desk-compact__hit').first()
    if (await attack.count()) {
      await attack.click()
      await openPanel(page)
      await shot(page, 'attack')
      await page.locator('.ui-bottom-sheet__close, .ui-floating-panel__close').click()
      const dmg = page.locator('.play-desk-compact__dmg--roll').first()
      if (await dmg.count()) {
        await dmg.click()
        await openPanel(page)
        await shot(page, 'damage')
      }
    }
  })

  test('adv-skill', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    const adv = page.locator('.play-desk__roll-mode-btn, .mobile-combat-roll__btn').filter({
      hasText: /преим/i,
    }).first()
    if (await adv.count()) await adv.click()
    await clickMagicSkill(page)
    await openPanel(page)
    const first = page.getByTestId('dice-log').locator('li').first()
    await first.click()
    await shot(page, 'adv-skill')
  })

  test('dice-on-table', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    const diceToggle = page.locator('label, button').filter({ hasText: /^куб/i }).first()
    if (await diceToggle.count()) await diceToggle.click()
    await clickMagicSkill(page)
    await page.waitForTimeout(400)
    await shot(page, 'dice-on-table')
  })

  test('scroll-390', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1440) > 500, '390 only')
    await openPreview(page, { edition: '2014' })
    await page.evaluate(() => {
      const col = document.querySelector('.abil-column, .play-desk__left, .mobile-abilities')
      if (col) (col as HTMLElement).scrollTop = 120
    })
    await shot(page, 'scroll-390')
  })

  test('only-me off/on + journal-merged + rolls-button', async ({ page }) => {
    await openPreview(page, { edition: '2014', open: true, session: true, log: true })
    await expect(page.getByTestId('dice-only-me')).toBeVisible()
    await shot(page, 'only-me-off')
    await page.getByTestId('dice-only-me').click()
    await shot(page, 'only-me-on')
    await shot(page, 'journal-merged')
    await page.locator('.ui-bottom-sheet__close, .ui-floating-panel__close').click()
    await page.getByRole('button', { name: /^броски/i }).first().click()
    await expect(page.getByTestId('dice-journal')).toBeVisible()
    await shot(page, 'rolls-button-opens-journal')
  })

  test('stroke-of-luck rogue20 — miss → 20 in journal', async ({ page }) => {
    await openPreview(page, { edition: '2014', open: true, rogue20: true })
    const first = page.getByTestId('dice-log').locator('li').first()
    await first.click()
    await expect(page.getByTestId('dice-stroke-of-luck')).toBeVisible()
    await page.getByTestId('dice-stroke-of-luck').click()
    await expect(first).toContainText(/20|удач/i)
    await shot(page, 'stroke-of-luck-rogue20')
  })

  test('fab over characteristics after save (390)', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1440) > 500, '390 only')
    await openPreview(page, { edition: '2014' })
    const expand = page.getByRole('button', { name: 'Развернуть шапку' })
    if (await expand.isVisible().catch(() => false)) await expand.click()
    await page.locator('button.mobile-vitals__abil').click()
    const root = page.getByRole('dialog', { name: 'Характеристики' })
    await expect(root).toBeVisible()
    await root.locator('button.abil-mod--roll').filter({ hasText: 'Сп' }).first().click()
    await page.waitForTimeout(300)
    // FAB must stay clickable above the abil page (no force).
    await expect(page.getByTestId('dice-fab')).toBeVisible()
    await page.getByTestId('dice-fab').click({ force: false })
    await expect(page.getByTestId('dice-journal')).toBeVisible()
    await shot(page, 'fab-over-abil-after-save')
  })
})
