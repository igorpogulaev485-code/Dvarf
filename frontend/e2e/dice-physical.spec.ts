/**
 * Physical «кубики» mode — attack damage, spell attack/damage/heal,
 * advantage two d20, Bless bonus die input; toggle-off stays digital.
 */
import { expect, test, type Page } from '@playwright/test'

async function openPreview(
  page: Page,
  opts?: {
    edition?: '2014' | '2024'
    heal?: boolean
    bless?: boolean
    session?: boolean
  },
) {
  const q = new URLSearchParams()
  q.set('edition', opts?.edition ?? '2014')
  q.set('clean', '1')
  if (opts?.heal) q.set('heal', '1')
  if (opts?.bless) q.set('bless', '1')
  if (opts?.session) q.set('session', '1')
  await page.goto(`/dev/dice-roller-preview?${q.toString()}`)
  await expect(page.getByTestId('dice-roller-preview')).toBeVisible()
}

async function enableDiceOnTable(page: Page) {
  const diceToggle = page
    .locator('label, button, [role="checkbox"]')
    .filter({ hasText: /^куб/i })
    .first()
  await expect(diceToggle).toBeVisible({ timeout: 8_000 })
  await diceToggle.click()
}

async function goCombatAttacks(page: Page) {
  const mobile = (page.viewportSize()?.width ?? 1440) <= 500
  if (mobile) {
    // Bottom scene nav / combat already shows Атаки|Заклинания tabs.
    const combatNav = page.getByRole('button', { name: /Бой/i }).first()
    if (await combatNav.isVisible().catch(() => false)) await combatNav.click()
    const atkTab = page.getByRole('tab', { name: /^Атаки$/ })
    if (await atkTab.count()) await atkTab.click()
    else {
      const atkSeg = page.locator('.mobile-combat-seg__btn').filter({ hasText: /^Атаки$/ })
      if (await atkSeg.count()) await atkSeg.click()
    }
  } else {
    const combat = page.getByRole('button', { name: /^Бой$/ }).first()
    if (await combat.count()) await combat.click()
  }
  await expect(page.locator('.play-desk-compact__dmg--roll').first()).toBeVisible({
    timeout: 10_000,
  })
}

async function goCombatSpells(page: Page) {
  const mobile = (page.viewportSize()?.width ?? 1440) <= 500
  if (mobile) {
    const combatNav = page.getByRole('button', { name: /Бой/i }).first()
    if (await combatNav.isVisible().catch(() => false)) await combatNav.click()
    const spellTab = page.getByRole('tab', { name: /^Заклинания$/ })
    if (await spellTab.count()) await spellTab.click()
    else {
      const spellSeg = page
        .locator('.mobile-combat-seg__btn')
        .filter({ hasText: /Заклин|Магия/i })
      if (await spellSeg.count()) await spellSeg.click()
    }
  } else {
    const combat = page.getByRole('button', { name: /^Бой$/ }).first()
    if (await combat.count()) await combat.click()
    const spellTab = page.getByRole('tab', { name: /^Заклинания$/ })
    if (await spellTab.count()) await spellTab.click()
  }
}

async function fillAndConfirmEnterOwn(page: Page, opts: {
  d20a?: number
  d20b?: number
  faces?: number[]
  bonus?: number[]
  total?: number
}) {
  await expect(page.getByTestId('enter-own-number')).toBeVisible({ timeout: 8_000 })
  if (opts.d20a != null) {
    await page.getByTestId('enter-own-d20-a').fill(String(opts.d20a))
  }
  if (opts.d20b != null) {
    await page.getByTestId('enter-own-d20-b').fill(String(opts.d20b))
  }
  if (opts.faces) {
    for (let i = 0; i < opts.faces.length; i += 1) {
      await page.getByTestId(`enter-own-face-${i}`).fill(String(opts.faces[i]))
    }
  }
  if (opts.bonus) {
    for (let i = 0; i < opts.bonus.length; i += 1) {
      await page.getByTestId(`enter-own-bonus-${i}`).fill(String(opts.bonus[i]))
    }
  }
  if (opts.total != null) {
    await page.getByTestId('enter-own-total').fill(String(opts.total))
  }
  await page.getByRole('button', { name: /^Записать$/ }).click()
}

async function clickMagicSkill(page: Page) {
  const mobile = (page.viewportSize()?.width ?? 1440) <= 500
  if (mobile) {
    // Combat hot-strip may show Analysis/Athletics; any skill roll exercises the path.
    const chip = page
      .locator('.play-desk__hot-item, [aria-label="Навыки боя"] button')
      .filter({ hasText: /Атлетика|Акробатика|Анализ|Внимательн|Магия|Скрытность/i })
      .first()
    await expect(chip).toBeVisible({ timeout: 8_000 })
    await chip.click()
    return
  }
  const intBlock = page.locator('.abil-block').filter({ hasText: 'Интеллект' }).first()
  await expect(intBlock).toBeVisible()
  const chevron = intBlock.locator('.abil-block__label-chevron')
  if ((await chevron.getAttribute('aria-expanded')) === 'false') {
    await chevron.click()
  }
  const roll = intBlock
    .locator('.abil-skill')
    .filter({ hasText: 'Магия' })
    .locator('.abil-skill__roll')
  await expect(roll).toBeVisible()
  await roll.click()
}

test.describe('Physical dice mode', () => {
  test('attack damage opens formula enter-own (2014)', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    await enableDiceOnTable(page)
    await goCombatAttacks(page)
    await page.locator('.play-desk-compact__dmg--roll').first().click()
    await expect(page.getByTestId('enter-own-number')).toBeVisible()
    await expect(page.getByTestId('enter-own-formula-hint')).toBeVisible()
    await fillAndConfirmEnterOwn(page, { faces: [4] })
    await expect(page.getByTestId('enter-own-number')).toHaveCount(0)
  })

  test('advantage skill opens two d20 fields', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    await enableDiceOnTable(page)
    const adv = page
      .locator('.play-desk__roll-mode-btn, .mobile-combat-roll__btn')
      .filter({ hasText: /преим/i })
      .first()
    if (await adv.count()) await adv.click()
    else await page.getByRole('button', { name: /^преим/i }).first().click()
    await clickMagicSkill(page)
    await expect(page.getByTestId('enter-own-number')).toBeVisible()
    await expect(page.getByTestId('enter-own-d20-a')).toBeVisible()
    await expect(page.getByTestId('enter-own-d20-b')).toBeVisible()
    await expect(page.getByTestId('enter-own-adv-hint')).toContainText(/преимущество/i)
    await fillAndConfirmEnterOwn(page, { d20a: 18, d20b: 7 })
  })

  test('save with Bless asks for bonus die face', async ({ page }) => {
    await openPreview(page, { edition: '2014', bless: true })
    await enableDiceOnTable(page)
    const mobile = (page.viewportSize()?.width ?? 1440) <= 500
    if (mobile) {
      await page.getByRole('button', { name: 'Развернуть шапку' }).click()
      await page.locator('button.mobile-vitals__abil').click()
      const root = page.getByRole('dialog', { name: 'Характеристики' })
      await expect(root).toBeVisible({ timeout: 8_000 })
      await root.locator('button.abil-mod--roll').filter({ hasText: 'Сп' }).first().click()
    } else {
      await page.locator('button.abil-mod--roll').filter({ hasText: 'Сп' }).first().click()
    }
    await expect(page.getByTestId('enter-own-number')).toBeVisible()
    await expect(page.getByTestId('enter-own-bonus-dice')).toBeVisible()
    await fillAndConfirmEnterOwn(page, { d20a: 12, bonus: [3] })
  })

  test('spell cast with damage: attack then formula', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    await enableDiceOnTable(page)
    await goCombatSpells(page)
    const row = page
      .locator('.play-desk-compact__row.is-spell')
      .filter({ hasText: /Огненный снаряд/i })
      .first()
    await expect(row).toBeVisible({ timeout: 12_000 })
    await row.locator('button.play-desk-compact__spell-cast').click()
    await expect(page.getByRole('dialog').filter({ hasText: /Использовать заговор|Кастовать/i })).toBeVisible()
    await page.getByRole('button', { name: /Каст|Использовать/i }).last().click()
    // Attack enter-own
    await expect(page.getByTestId('enter-own-number')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/Атака заклинанием/i).first()).toBeVisible()
    await fillAndConfirmEnterOwn(page, { d20a: 15 })
    // Damage enter-own
    await expect(page.getByTestId('enter-own-number')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByTestId('enter-own-formula-hint')).toBeVisible()
    await fillAndConfirmEnterOwn(page, { faces: [8] })
  })

  test('spell cast with heal opens formula', async ({ page }) => {
    await openPreview(page, { edition: '2014', heal: true })
    await enableDiceOnTable(page)
    await goCombatSpells(page)
    const row = page
      .locator('.play-desk-compact__row.is-spell')
      .filter({ hasText: /Лечение ран/i })
      .first()
    await expect(row).toBeVisible({ timeout: 12_000 })
    await row.locator('button.play-desk-compact__spell-cast').click()
    await expect(page.getByRole('dialog').filter({ hasText: /Кастовать/i })).toBeVisible()
    await page.getByRole('button', { name: /^Каст$/i }).last().click()
    await expect(page.getByTestId('enter-own-number')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/Лечение:/i).first()).toBeVisible()
    await fillAndConfirmEnterOwn(page, { faces: [5] })
  })

  test('toggle off: skill stays digital (no enter-own)', async ({ page }) => {
    await openPreview(page, { edition: '2014' })
    // Do NOT enable dice-on-table.
    await clickMagicSkill(page)
    await expect(page.getByTestId('enter-own-number')).toHaveCount(0)
    // Journal / toast path — digital roll recorded locally.
    const fab = page.getByTestId('dice-fab')
    if (!(await page.getByTestId('dice-journal').isVisible().catch(() => false))) {
      await fab.click()
    }
    await expect(page.getByTestId('dice-log').locator('li').first()).toBeVisible({
      timeout: 8_000,
    })
  })
})
