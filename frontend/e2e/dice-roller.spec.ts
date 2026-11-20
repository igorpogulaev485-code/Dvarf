import { expect, test, type Page } from '@playwright/test'

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
  await expect(page.getByTestId('dice-roller-preview')).toBeVisible()
  await expect(page.getByTestId('dice-fab')).toBeVisible()
}

test.describe('DICE-01 free roller', () => {
  test('FAB opens and closes on 2014 sheet', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    await page.getByTestId('dice-fab').click()
    await expect(page.getByRole('dialog', { name: 'Бросок кубиков' })).toBeVisible()
    await page.locator('.ui-bottom-sheet__close, .ui-floating-panel__close').click()
    await expect(page.getByRole('dialog', { name: 'Бросок кубиков' })).toHaveCount(0)

    await page.getByTestId('dice-fab').click()
    await expect(page.getByRole('dialog', { name: 'Бросок кубиков' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Бросок кубиков' })).toHaveCount(0)
  })

  test('FAB opens on 2024 sheet', async ({ page }) => {
    await openPreview(page, { edition: '2024' })
    await page.getByTestId('dice-fab').click()
    await expect(page.getByRole('dialog', { name: 'Бросок кубиков' })).toBeVisible()
  })

  test('click dice, roll formula, error, advantage, log persist', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    await page.getByTestId('dice-fab').click()
    const dialog = page.getByRole('dialog', { name: 'Бросок кубиков' })
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'Добавить к6' }).click()
    await dialog.getByRole('button', { name: 'Добавить к6' }).click()
    await expect(dialog.getByLabel('Формула броска')).toHaveValue('2к6')
    await dialog.getByTestId('dice-roll-submit').click()
    await expect(dialog.getByTestId('dice-log')).toBeVisible()
    await expect(dialog.getByTestId('dice-log').locator('li').first()).toContainText('2к6')

    await dialog.getByLabel('Формула броска').fill('@@@')
    await expect(dialog.getByText(/Не понял запись/i)).toBeVisible()
    await expect(dialog.getByTestId('dice-roll-submit')).toBeDisabled()

    await dialog.getByLabel('Формула броска').fill('d20')
    await expect(dialog.getByTestId('dice-advantage')).toBeEnabled()
    await dialog.getByTestId('dice-advantage').click()
    await dialog.getByTestId('dice-roll-submit').click()
    const first = dialog.getByTestId('dice-log').locator('li').first()
    await expect(first).toContainText('1к20')
    await expect(first.locator('.dice-roller-panel__face')).toHaveCount(2)
    await expect(first.locator('.dice-roller-panel__face.is-dropped')).toHaveCount(1)

    await first.getByRole('button', { name: 'Повторить' }).click()
    await expect(dialog.getByTestId('dice-log').locator('li')).toHaveCount(3)

    await dialog.getByTestId('dice-log-clear').click()
    await dialog.getByTestId('dice-log-clear').click()
    await expect(dialog.getByText('Пока нет бросков')).toBeVisible()

    // Re-roll and reload — log persists for this character id.
    await dialog.getByLabel('Формула броска').fill('1d4')
    await dialog.getByTestId('dice-roll-submit').click()
    await expect(dialog.getByTestId('dice-log').locator('li')).toHaveCount(1)
    await page.reload()
    await openPreview(page, { edition: '2014', open: true })
    // openPreview navigates again; after reload storage should still hold entry
    await page.goto('/dev/dice-roller-preview?edition=2014&clean=1&open=1')
    await expect(page.getByRole('dialog', { name: 'Бросок кубиков' })).toBeVisible()
    await expect(page.getByTestId('dice-log').locator('li').first()).toContainText('1к4')
  })

  test('2014 header still present (regression smoke)', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    // Real Play Desk who-line — not create-wizard «Раса» step.
    await expect(page.getByText('Торин Камнебород').first()).toBeVisible()
    await expect(page.getByTestId('dice-fab')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Раса$/ })).toHaveCount(0)
  })
})
