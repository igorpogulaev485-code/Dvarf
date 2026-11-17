/**
 * Honest before shots from origin/main Play Desk (no dice FAB).
 * Server must be main worktree on DICE_E2E_BASE (see scripts/dice-before-from-main.sh).
 * Same character as after: sampleClassic2014Character / Торин Камнебород волшебник 5.
 * Viewports: 1440×900 and 390×844, scale=css, scrollTop=0.
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.DICE_SHOT_DIR || '/opt/cursor/artifacts/dice-v1'

function widthTag(page: Page): string {
  const w = page.viewportSize()?.width ?? 1440
  return w <= 500 ? '390' : '1440'
}

async function shot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true })
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    const stage = document.querySelector('.play-desk__stage, .play-desk, .minimal-sheet')
    if (stage instanceof HTMLElement) stage.scrollTop = 0
  })
  await page.waitForTimeout(300)
  const tag = widthTag(page)
  const file = join(OUT, `${name}-${tag}.png`)
  await page.screenshot({ path: file, fullPage: false, scale: 'css' })
  const buf = readFileSync(file)
  const hash = createHash('md5').update(buf).digest('hex')
  const meta = {
    file: `${name}-${tag}.png`,
    bytes: buf.length,
    md5: hash,
    viewport: page.viewportSize(),
    scrollTop: await page.evaluate(() => ({
      window: window.scrollY,
      stage: (document.querySelector('.play-desk__stage, .play-desk') as HTMLElement | null)
        ?.scrollTop,
    })),
  }
  writeFileSync(join(OUT, `${name}-${tag}.meta.json`), JSON.stringify(meta, null, 2))
  console.log('before', meta)
}

test.describe('DICE-02b before (origin/main)', () => {
  test('sheet-2014-before — same Torin sample, no FAB', async ({ page }) => {
    const w = page.viewportSize()?.width ?? 1440
    await page.setViewportSize({
      width: w <= 500 ? 390 : 1440,
      height: w <= 500 ? 844 : 900,
    })
    await page.goto('/dev/play-desk-baseline-preview')
    await expect(page.getByTestId('play-desk-baseline-preview')).toBeVisible()
    await expect(page.getByText('Торин Камнебород').first()).toBeVisible()
    // Level/class chip may be visually clipped in header; assert sample via name + rail.
    await expect(page.locator('body')).toContainText(/Волшебник/)
    if (w > 500) {
      await expect(page.getByText('Харизма', { exact: false }).first()).toBeVisible()
      await expect(page.getByText('Мудрост', { exact: false }).first()).toBeVisible()
    } else {
      await expect(page.getByText('Атаки', { exact: true }).first()).toBeVisible()
    }
    await expect(page.locator('.ui-dice-fab')).toHaveCount(0)
    await shot(page, 'sheet-2014-before')
  })
})
