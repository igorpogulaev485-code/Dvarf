/**
 * DICE-02a — sheet rolls → journal, advantage, dice-on-table, scroll guard, only-me.
 */
import { expect, test, type Page } from '@playwright/test'

async function openPreview(
  page: Page,
  opts?: { edition?: '2014' | '2024'; open?: boolean; session?: boolean },
) {
  const q = new URLSearchParams()
  q.set('edition', opts?.edition ?? '2014')
  q.set('clean', '1')
  if (opts?.open) q.set('open', '1')
  if (opts?.session) q.set('session', '1')
  await page.goto(`/dev/dice-roller-preview?${q.toString()}`)
  await expect(page.getByTestId('dice-roller-preview')).toBeVisible()
  await expect(page.getByTestId('dice-fab')).toBeVisible()
}

async function openJournal(page: Page) {
  const fab = page.getByTestId('dice-fab')
  if (!(await page.getByTestId('dice-journal').isVisible().catch(() => false))) {
    await fab.click()
  }
  await expect(page.getByTestId('dice-journal')).toBeVisible()
}

/**
 * Desktop: expand Интеллект → «Магия».
 * Phone: hot-strip skill chip (abilities rail is on another scene).
 */
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

test.describe('DICE-02a sheet roller', () => {
  test('skill click rolls into panel journal (2014)', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    await clickMagicSkill(page)
    await openJournal(page)
    const first = page.getByTestId('dice-log').locator('li').first()
    await expect(first).toContainText(/Магия|Атлетика|Акробатика|Анализ|Внимание|1к20|2к20|1d20|2d20/i)
    await expect(first.locator('.dice-roller-panel__log-total')).toBeVisible()
  })

  test('save and ability check roll into journal', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    const mobile = (page.viewportSize()?.width ?? 1440) <= 500
    const root = mobile
      ? page.getByRole('dialog', { name: 'Характеристики' })
      : page.locator('body')
    if (mobile) {
      await page.getByRole('button', { name: 'Развернуть шапку' }).click()
      await page.locator('button.mobile-vitals__abil').click()
      await expect(root).toBeVisible({ timeout: 8_000 })
    }
    const saveBtn = root.locator('button.abil-mod--roll').filter({ hasText: 'Сп' }).first()
    await expect(saveBtn).toBeVisible({ timeout: 8_000 })
    await saveBtn.click()
    const checkBtn = root.locator('button.abil-mod--roll').filter({ hasText: 'Пр' }).first()
    await checkBtn.click()
    if (mobile) {
      await page.locator('.mobile-abil-page__back').click()
    }
    await openJournal(page)
    await expect(page.getByTestId('dice-log').locator('li')).toHaveCount(2, { timeout: 8_000 })
  })

  test('advantage mode shows two d20 faces', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    const adv = page.getByRole('button', { name: /^преим/i }).first()
    if (await adv.count()) {
      await adv.click()
    } else {
      await page.locator('.play-desk__roll-mode-btn', { hasText: /преим/i }).first().click()
    }
    await clickMagicSkill(page)
    await openJournal(page)
    const first = page.getByTestId('dice-log').locator('li').first()
    await expect(first).toContainText(/преим/i)
    await first.click()
    // Two d20 faces + optional modifier chip (.is-mod).
    await expect(first.locator('.dice-roller-panel__face:not(.is-mod)')).toHaveCount(2, {
      timeout: 5_000,
    })
    await expect(first.locator('.dice-roller-panel__face.is-dropped')).toHaveCount(1)
  })

  test('repeat from journal', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    await clickMagicSkill(page)
    await openJournal(page)
    const first = page.getByTestId('dice-log').locator('li').first()
    await first.click()
    await first.getByRole('button', { name: 'Повторить' }).click()
    await expect(page.getByTestId('dice-log').locator('li')).toHaveCount(2)
  })

  test('dice-on-table opens enter-number, no digital journal entry', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    await openJournal(page)
    const before = await page.getByTestId('dice-log').locator('li').count().catch(() => 0)
    // Close panel so sheet is usable on mobile.
    await page.locator('.ui-bottom-sheet__close, .ui-floating-panel__close').click()
    const diceToggle = page
      .locator('label, button, [role="checkbox"]')
      .filter({ hasText: /^куб/i })
      .first()
    await diceToggle.click()
    await clickMagicSkill(page)
    // Enter-own-number / table UI should appear; journal must not grow from digital roll.
    await expect(
      page
        .getByText(/Выпало на d20|живого кубика|своё число|Попадание|Промах|Спас|Провал/i)
        .first(),
    ).toBeVisible({ timeout: 8_000 })
    // Close enter-number without recording, then check journal unchanged.
    const cancel = page.getByRole('button', { name: /Отмена/i })
    if (await cancel.count()) await cancel.click()
    await openJournal(page)
    const after = await page.getByTestId('dice-log').locator('li').count()
    expect(after).toBe(before)
  })

  test('броски opens unified journal', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    await clickMagicSkill(page)
    await page.getByRole('button', { name: /^броски/i }).first().click()
    await expect(page.getByTestId('dice-journal')).toBeVisible()
    await expect(page.getByTestId('dice-journal-tab-mine')).toBeVisible()
  })

  test('only-me toggle visible with session query', async ({ page }) => {
    await openPreview(page, { edition: '2014', open: true, session: true })
    await expect(page.getByTestId('dice-only-me')).toBeVisible()
    await page.getByTestId('dice-only-me').click()
    await expect(page.getByTestId('dice-only-me')).toHaveAttribute('aria-checked', 'true')
  })

  test('scroll on 390 does not roll', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1440) > 500, 'mobile only')
    await openPreview(page, { edition: '2014' })
    await openJournal(page)
    const before = await page.getByTestId('dice-log').locator('li').count().catch(() => 0)
    await page.locator('.ui-bottom-sheet__close, .ui-floating-panel__close').click()

    const col = page.locator('.abil-column, .play-desk__left, .mobile-abilities').first()
    const box = await col.boundingBox()
    if (!box) {
      test.skip(true, 'abilities column not found')
      return
    }
    await page.mouse.move(box.x + box.width / 2, box.y + 40)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + 40 - 80, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    await openJournal(page)
    const after = await page.getByTestId('dice-log').locator('li').count()
    expect(after).toBe(before)
  })

  test('2024 edition skill roll works', async ({ page }) => {
    await openPreview(page, { edition: '2024' })
    await clickMagicSkill(page)
    await openJournal(page)
    await expect(page.getByTestId('dice-log').locator('li').first()).toBeVisible()
  })

  test('free panel still rolls and persists', async ({ page }) => {
    await openPreview(page, { edition: '2014', open: true })
    const dialog = page.getByRole('dialog', { name: 'Бросок кубиков' })
    await dialog.getByLabel('Формула броска').fill('1d4')
    await dialog.getByTestId('dice-roll-submit').click()
    await expect(dialog.getByTestId('dice-log').locator('li').first()).toContainText('1к4')
  })
})
