/**
 * Screenshots: physical enter-own + journal/feed + toggle-off — desktop + 390.
 * → /opt/cursor/artifacts/dice-physical/
 */
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.DICE_PHYSICAL_SHOT_DIR || '/opt/cursor/artifacts/dice-physical'

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
  opts?: { heal?: boolean; bless?: boolean },
) {
  const q = new URLSearchParams()
  q.set('edition', '2014')
  q.set('clean', '1')
  if (opts?.heal) q.set('heal', '1')
  if (opts?.bless) q.set('bless', '1')
  await page.goto(`/dev/dice-roller-preview?${q.toString()}`)
  await expect(page.getByTestId('dice-fab')).toBeVisible()
  await page.waitForTimeout(300)
}

async function enableDice(page: Page) {
  const diceToggle = page
    .locator('label, button, [role="checkbox"]')
    .filter({ hasText: /^куб/i })
    .first()
  await diceToggle.click()
}

async function goCombatAttacks(page: Page) {
  const mobile = (page.viewportSize()?.width ?? 1440) <= 500
  if (mobile) {
    const combatNav = page.getByRole('button', { name: /Бой/i }).first()
    if (await combatNav.isVisible().catch(() => false)) await combatNav.click()
    const atkTab = page.getByRole('tab', { name: /^Атаки$/ })
    if (await atkTab.count()) await atkTab.click()
  } else {
    const combat = page.getByRole('button', { name: /^Бой$/ }).first()
    if (await combat.count()) await combat.click()
  }
}

async function goCombatSpells(page: Page) {
  const mobile = (page.viewportSize()?.width ?? 1440) <= 500
  if (mobile) {
    const combatNav = page.getByRole('button', { name: /Бой/i }).first()
    if (await combatNav.isVisible().catch(() => false)) await combatNav.click()
    const spellTab = page.getByRole('tab', { name: /^Заклинания$/ })
    if (await spellTab.count()) await spellTab.click()
  } else {
    const combat = page.getByRole('button', { name: /^Бой$/ }).first()
    if (await combat.count()) await combat.click()
    const spellTab = page.getByRole('tab', { name: /^Заклинания$/ })
    if (await spellTab.count()) await spellTab.click()
  }
}

async function openJournal(page: Page) {
  if (!(await page.getByTestId('dice-journal').isVisible().catch(() => false))) {
    await page.getByTestId('dice-fab').click()
  }
  await expect(page.getByTestId('dice-journal')).toBeVisible()
}

test.describe('Physical dice screenshots', () => {
  test('enter-own damage formula', async ({ page }) => {
    await openPreview(page)
    await enableDice(page)
    await goCombatAttacks(page)
    await page.locator('.play-desk-compact__dmg--roll').first().click()
    await expect(page.getByTestId('enter-own-number')).toBeVisible()
    await expect(page.getByTestId('enter-own-formula-hint')).toContainText(/Брось/)
    await page.getByTestId('enter-own-face-0').fill('4')
    await expect(page.getByTestId('enter-own-live-total')).toBeVisible()
    await shot(page, 'enter-own-damage')
  })

  test('enter-own advantage two d20', async ({ page }) => {
    await openPreview(page)
    await enableDice(page)
    const adv = page
      .locator('.play-desk__roll-mode-btn, .mobile-combat-roll__btn')
      .filter({ hasText: /преим/i })
      .first()
    if (await adv.count()) await adv.click()
    const mobile = (page.viewportSize()?.width ?? 1440) <= 500
    if (mobile) {
      const chip = page
        .locator('.play-desk__hot-item, [aria-label="Навыки боя"] button')
        .filter({ hasText: /Атлетика|Акробатика|Анализ|Внимательн|Магия|Скрытность/i })
        .first()
      await chip.click()
    } else {
      const intBlock = page.locator('.abil-block').filter({ hasText: 'Интеллект' }).first()
      const chevron = intBlock.locator('.abil-block__label-chevron')
      if ((await chevron.getAttribute('aria-expanded')) === 'false') await chevron.click()
      await intBlock
        .locator('.abil-skill')
        .filter({ hasText: 'Магия' })
        .locator('.abil-skill__roll')
        .click()
    }
    await expect(page.getByTestId('enter-own-d20-b')).toBeVisible()
    await expect(page.getByTestId('enter-own-adv-hint')).toContainText(/У тебя преимущество/)
    await shot(page, 'enter-own-advantage')
  })

  test('enter-own bless bonus + save', async ({ page }) => {
    await openPreview(page, { bless: true })
    await enableDice(page)
    const mobile = (page.viewportSize()?.width ?? 1440) <= 500
    if (mobile) {
      await page.getByRole('button', { name: 'Развернуть шапку' }).click()
      await page.locator('button.mobile-vitals__abil').click()
      const root = page.getByRole('dialog', { name: 'Характеристики' })
      await root.locator('button.abil-mod--roll').filter({ hasText: 'Сп' }).first().click()
    } else {
      await page.locator('button.abil-mod--roll').filter({ hasText: 'Сп' }).first().click()
    }
    await expect(page.getByTestId('enter-own-bonus-dice')).toBeVisible()
    await expect(page.getByText(/Выпало на к20/)).toBeVisible()
    await shot(page, 'enter-own-bless-save')
  })

  test('enter-own spell heal', async ({ page }) => {
    await openPreview(page, { heal: true })
    await enableDice(page)
    await goCombatSpells(page)
    const row = page
      .locator('.play-desk-compact__row.is-spell')
      .filter({ hasText: /Лечение ран/i })
      .first()
    await expect(row).toBeVisible({ timeout: 12_000 })
    await row.locator('button.play-desk-compact__spell-cast').click()
    await page.getByRole('button', { name: /^Каст$/i }).last().click()
    await expect(page.getByTestId('enter-own-number')).toBeVisible()
    await shot(page, 'enter-own-spell-heal')
  })

  test('spell attack then damage dialogs', async ({ page }) => {
    await openPreview(page)
    await enableDice(page)
    await goCombatSpells(page)
    const row = page
      .locator('.play-desk-compact__row.is-spell')
      .filter({ hasText: /Огненный снаряд/i })
      .first()
    await expect(row).toBeVisible({ timeout: 12_000 })
    await row.locator('button.play-desk-compact__spell-cast').click()
    await page.getByRole('button', { name: /Каст|Использовать/i }).last().click()
    await expect(page.getByText(/Атака заклинанием/i).first()).toBeVisible({ timeout: 8_000 })
    await shot(page, 'enter-own-spell-attack')
    await page.getByTestId('enter-own-d20-a').fill('15')
    await page.getByRole('button', { name: /^Записать$/ }).click()
    await expect(page.getByTestId('enter-own-formula-hint')).toBeVisible({ timeout: 8_000 })
    await page.getByTestId('enter-own-face-0').fill('8')
    await shot(page, 'enter-own-spell-damage')
  })

  test('journal after physical damage', async ({ page }) => {
    await openPreview(page)
    await enableDice(page)
    await goCombatAttacks(page)
    await page.locator('.play-desk-compact__dmg--roll').first().click()
    await page.getByTestId('enter-own-face-0').fill('5')
    await page.getByRole('button', { name: /^Записать$/ }).click()
    await openJournal(page)
    const first = page.getByTestId('dice-log').locator('li').first()
    await expect(first).toContainText(/кубик на столе|🎲/i)
    await first.click()
    await shot(page, 'journal-physical-mark')
  })

  test('toggle off digital roll into journal', async ({ page }) => {
    await openPreview(page)
    // Галка выкл — цифровой бросок как раньше.
    const mobile = (page.viewportSize()?.width ?? 1440) <= 500
    if (mobile) {
      const chip = page
        .locator('.play-desk__hot-item, [aria-label="Навыки боя"] button')
        .filter({ hasText: /Атлетика|Акробатика|Анализ|Внимательн|Магия|Скрытность/i })
        .first()
      await chip.click()
    } else {
      const intBlock = page.locator('.abil-block').filter({ hasText: 'Интеллект' }).first()
      const chevron = intBlock.locator('.abil-block__label-chevron')
      if ((await chevron.getAttribute('aria-expanded')) === 'false') await chevron.click()
      await intBlock
        .locator('.abil-skill')
        .filter({ hasText: 'Магия' })
        .locator('.abil-skill__roll')
        .click()
    }
    await expect(page.getByTestId('enter-own-number')).toHaveCount(0)
    await openJournal(page)
    await expect(page.getByTestId('dice-log').locator('li').first()).toBeVisible()
    await expect(page.getByTestId('dice-log').locator('li').first()).not.toContainText(
      /кубик на столе/i,
    )
    await shot(page, 'journal-digital-toggle-off')
  })

  test('party feed physical mark (master table)', async ({ page }) => {
    await page.goto('/dev/sc04-live-table-preview?role=master&feed=1')
    const mobile = (page.viewportSize()?.width ?? 1440) <= 500
    if (mobile) {
      const feedTab = page.getByRole('button', { name: /^Лента$/ })
      if (await feedTab.count()) await feedTab.click()
    }
    // На мобилке дублируется desktop-rail (hidden) — берём видимую ленту.
    const feedRoot = mobile
      ? page.locator('.session-live-desk__mobile-only')
      : page.locator('.session-live-desk__rail')
    const entry = feedRoot.locator('.session-event-feed__item').filter({
      hasText: /Внимательности/,
    })
    await expect(entry.first()).toBeVisible({ timeout: 8_000 })
    await expect(entry.first()).toContainText('🎲')
    await shot(page, 'party-feed-physical')
  })
})
