/**
 * Honest before shots from origin/main Play Desk (no dice FAB).
 * Server must be main worktree on DICE_E2E_BASE (see scripts/dice-before-from-main.sh).
 */
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.DICE_SHOT_DIR || '/opt/cursor/artifacts/dice-v1'

function widthTag(page: Page): string {
  const w = page.viewportSize()?.width ?? 1440
  return w <= 500 ? '390' : '1440'
}

async function shot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true })
  const file = join(OUT, `${name}-${widthTag(page)}.png`)
  await page.screenshot({ path: file, fullPage: false })
}

test.describe('DICE-01 before (origin/main)', () => {
  test('sheet-2014-before — desktop rail / mobile combat, no FAB', async ({ page }) => {
    await page.goto('/dev/play-desk-baseline-preview')
    await expect(page.getByTestId('play-desk-baseline-preview')).toBeVisible()
    const w = page.viewportSize()?.width ?? 1440
    if (w > 500) {
      // Desktop left rail: all 6 abilities, Харизма fully visible (kit LOCK).
      await expect(page.getByText('Харизма', { exact: false }).first()).toBeVisible()
      await expect(page.getByText('Мудрост', { exact: false }).first()).toBeVisible()
    } else {
      await expect(page.getByText('Атаки', { exact: true }).first()).toBeVisible()
    }
    await expect(page.locator('.ui-dice-fab')).toHaveCount(0)
    await page.waitForTimeout(500)
    await shot(page, 'sheet-2014-before')
  })
})
