/**
 * DICE-01 screenshots → /opt/cursor/artifacts/dice-v1/
 * Run: DICE_SHOT_DIR=/opt/cursor/artifacts/dice-v1 npm run test:e2e:dice -- e2e/dice-roller-screenshots.spec.ts
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

async function openPreview(
  page: Page,
  opts?: { edition?: '2014' | '2024'; open?: boolean; log?: boolean },
) {
  const q = new URLSearchParams()
  q.set('edition', opts?.edition ?? '2014')
  q.set('clean', '1')
  if (opts?.open) q.set('open', '1')
  if (opts?.log) q.set('log', '1')
  await page.goto(`/dev/dice-roller-preview?${q.toString()}`)
  await expect(page.getByTestId('dice-fab')).toBeVisible()
  // Let Play Desk settle.
  await page.waitForTimeout(400)
}

test.describe('DICE-01 screenshots', () => {
  test('closed / open / pool / formula / error / advantage / log / 2014 before-after', async ({
    page,
  }) => {
    await openPreview(page, { edition: '2014' })
    await shot(page, 'sheet-2014-before')
    await shot(page, 'closed')

    await page.getByTestId('dice-fab').click()
    await expect(page.getByRole('dialog', { name: 'Бросок кубиков' })).toBeVisible()
    await shot(page, 'open')

    const dialog = page.getByRole('dialog', { name: 'Бросок кубиков' })
    await dialog.getByRole('button', { name: 'Добавить d20' }).click()
    await dialog.getByRole('button', { name: 'Добавить d6' }).click()
    const mod = dialog.getByRole('group', { name: 'Модификатор' })
    await mod.getByRole('button', { name: 'Больше' }).click()
    await mod.getByRole('button', { name: 'Больше' }).click()
    await mod.getByRole('button', { name: 'Больше' }).click()
    await shot(page, 'pool')

    await dialog.getByLabel('Формула броска').fill('2d6+3')
    await dialog.getByTestId('dice-roll-submit').click()
    await expect(dialog.getByTestId('dice-log')).toBeVisible()
    await shot(page, 'formula')

    await dialog.getByLabel('Формула броска').fill('неттакого')
    await expect(dialog.getByText(/Не понял запись/i)).toBeVisible()
    await shot(page, 'formula-error')

    await dialog.getByLabel('Формула броска').fill('d20')
    await dialog.getByTestId('dice-advantage').click()
    await dialog.getByTestId('dice-roll-submit').click()
    const dropped = dialog.locator('.dice-roller-panel__face.is-dropped').first()
    await expect(dropped).toBeVisible()
    await dropped.scrollIntoViewIfNeeded()
    await shot(page, 'advantage')

    // Seeded multi-entry log — first 3 rows open with «Повторить»
    await page.goto('/dev/dice-roller-preview?edition=2014&clean=1&open=1&log=1')
    const logDialog = page.getByRole('dialog', { name: 'Бросок кубиков' })
    await expect(logDialog).toBeVisible()
    await expect(logDialog.getByTestId('dice-log').locator('li')).toHaveCount(4)
    await expect(logDialog.getByRole('button', { name: 'Повторить' })).toHaveCount(3)
    await logDialog.getByRole('button', { name: 'Повторить' }).nth(1).scrollIntoViewIfNeeded()
    await shot(page, 'log')

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Бросок кубиков' })).toHaveCount(0)
    await shot(page, 'sheet-2014-after')

    // 2024 closed for parity note in report (optional visual)
    await openPreview(page, { edition: '2024' })
    await shot(page, 'sheet-2024-closed')
  })
})
