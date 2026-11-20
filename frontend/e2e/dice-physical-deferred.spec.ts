/**
 * Deferred physical-dice paths: death save, HD, initiative, companion,
 * breath, heroic reroll; toggle-off stays digital.
 */
import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const ART = '/opt/cursor/artifacts/dice-physical-2'

async function openPreview(
  page: Page,
  opts?: {
    edition?: '2014' | '2024'
    dying?: boolean
    companion?: boolean
    breath?: boolean
    hd?: boolean
    heroic?: boolean
    session?: boolean
  },
) {
  const q = new URLSearchParams()
  q.set('edition', opts?.edition ?? '2014')
  q.set('clean', '1')
  if (opts?.dying) q.set('dying', '1')
  if (opts?.companion) q.set('companion', '1')
  if (opts?.breath) q.set('breath', '1')
  if (opts?.hd) q.set('hd', '1')
  if (opts?.heroic) q.set('heroic', '1')
  if (opts?.session) q.set('session', '1')
  await page.goto(`/dev/dice-roller-preview?${q.toString()}`)
  await expect(page.getByTestId('dice-roller-preview')).toBeVisible()
}

async function enableDiceOnTable(page: Page) {
  // Same pattern as dice-physical.spec: click the visible label (input is CSS-hidden).
  const diceToggle = page
    .locator('label.scene-turn-controls__dice, label, button, [role="checkbox"]')
    .filter({ hasText: /^куб/i })
    .first()
  await expect(diceToggle).toBeVisible({ timeout: 8_000 })
  const box = page.getByRole('checkbox', { name: /Кубики на столе/i })
  if (!(await box.isChecked().catch(() => false))) {
    await diceToggle.click()
  }
  await expect(box).toBeChecked({ timeout: 8_000 })
}

async function fillAndConfirmEnterOwn(
  page: Page,
  opts: { d20a?: number; faces?: number[]; total?: number },
) {
  await expect(page.getByTestId('enter-own-number')).toBeVisible({ timeout: 8_000 })
  if (opts.d20a != null) {
    await page.getByTestId('enter-own-d20-a').fill(String(opts.d20a))
  }
  if (opts.faces) {
    for (let i = 0; i < opts.faces.length; i += 1) {
      await page.getByTestId(`enter-own-face-${i}`).fill(String(opts.faces[i]))
    }
  }
  if (opts.total != null) {
    await page.getByTestId('enter-own-total').fill(String(opts.total))
  }
  await page.getByRole('button', { name: /^Записать$/ }).click()
}

async function shot(page: Page, name: string) {
  const w = page.viewportSize()?.width ?? 1440
  const tag = w <= 500 ? '390' : '1440'
  await page.screenshot({
    path: path.join(ART, `${name}-${tag}.png`),
    fullPage: false,
  })
}

async function openHpPad(page: Page) {
  // Dying vitals: «0 / 32 при смерти»; normal: «32 / 32 хиты».
  await page.getByRole('button', { name: /хиты|при смерти/i }).first().click()
  await expect(page.locator('.hp-pad')).toBeVisible({ timeout: 8_000 })
}

async function goCombat(page: Page) {
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

test.describe('DICE physical deferred', () => {
  test('death save opens EnterOwn d20', async ({ page }) => {
    await openPreview(page, { dying: true })
    await enableDiceOnTable(page)
    const mobile = (page.viewportSize()?.width ?? 1440) <= 500
    if (mobile) {
      // Collapsed vitals hide «Спас от смерти» — open HP pad (same rules).
      await openHpPad(page)
      await page.locator('.hp-pad__death-roll').click()
    } else {
      const deathBtn = page.getByRole('button', { name: /Спас от смерти/i }).first()
      await expect(deathBtn).toBeVisible({ timeout: 8_000 })
      await deathBtn.click()
    }
    await expect(page.getByTestId('enter-own-number')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByTestId('enter-own-d20-a')).toBeVisible()
    // Кадр: шапка и чип «Спас от смерти» в кадре (не прокрученный лист).
    if (!mobile) {
      await page
        .getByRole('region', { name: /Шапка стола/i })
        .evaluate((el) => el.scrollIntoView({ block: 'start' }))
        .catch(() => undefined)
      await page.evaluate(() => window.scrollTo(0, 0))
    }
    await shot(page, 'enter-own-death-save')
    await fillAndConfirmEnterOwn(page, { d20a: 15 })
  })

  test('hit die opens EnterOwn formula', async ({ page }) => {
    await openPreview(page, { hd: true })
    await enableDiceOnTable(page)
    await openHpPad(page)
    const dieBtn = page.locator('.hp-pad__dice-spend').first()
    await expect(dieBtn).toBeVisible({ timeout: 8_000 })
    await dieBtn.click()
    await expect(page.getByTestId('enter-own-number')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('dialog').getByText(/Кость хитов · .+ · к6/i)).toBeVisible()
    await expect(page.getByTestId('enter-own-formula-mod')).toContainText(/Модификатор \+\d+ \(Тел\)/)
    await expect(page.getByTestId('enter-own-formula-hint')).toHaveCount(0)
    await expect(page.getByText(/Выпало на к6/i)).toBeVisible()
    await shot(page, 'enter-own-hit-die')
    await fillAndConfirmEnterOwn(page, { faces: [4] })
  })

  test('initiative opens EnterOwn d20', async ({ page }) => {
    await openPreview(page)
    await enableDiceOnTable(page)
    const mobile = (page.viewportSize()?.width ?? 1440) <= 500
    if (mobile) {
      const expand = page.getByRole('button', { name: /Развернуть шапку/i })
      if (await expand.isVisible().catch(() => false)) await expand.click()
    }
    // Desktop: button; mobile vitals: listitem with same accessible name.
    const init = page
      .getByRole('button', { name: /Инициатива/i })
      .or(page.getByRole('listitem', { name: /Инициатива/i }))
      .first()
    await expect(init).toBeVisible({ timeout: 8_000 })
    await init.click()
    // Header / mobile open breakdown; roll is inside.
    const rollBtn = page.getByRole('button', { name: /Бросок инициативы/i })
    await expect(rollBtn).toBeVisible({ timeout: 8_000 })
    await rollBtn.click()
    await expect(page.getByTestId('enter-own-number')).toBeVisible({ timeout: 8_000 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await shot(page, 'enter-own-initiative')
    await fillAndConfirmEnterOwn(page, { d20a: 12 })
  })

  test('companion attack then damage EnterOwn', async ({ page }) => {
    await openPreview(page, { companion: true })
    await enableDiceOnTable(page)
    await goCombat(page)
    const hit = page
      .locator('.play-desk-compact__hit')
      .filter({ hasText: /Длинный лук|Лираэль/i })
      .first()
    await expect(hit).toBeVisible({ timeout: 12_000 })
    await hit.click()
    await expect(page.getByTestId('enter-own-number')).toBeVisible()
    await shot(page, 'enter-own-companion-attack')
    await fillAndConfirmEnterOwn(page, { d20a: 14 })
    await expect(page.getByTestId('enter-own-number')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/Урон:/i).first()).toBeVisible()
    await shot(page, 'enter-own-companion-damage')
    await fillAndConfirmEnterOwn(page, { faces: [5] })
  })

  test('breath weapon opens EnterOwn formula', async ({ page }) => {
    await openPreview(page, { breath: true })
    await enableDiceOnTable(page)
    await goCombat(page)
    // Chips live under tab «Действие» (openGroup starts null).
    await page.getByRole('tab', { name: /^Действие$/ }).click()
    const breath = page.locator('.sheet-chip').filter({ hasText: /^Оружие дыхания$/ }).first()
    await expect(breath).toBeVisible({ timeout: 12_000 })
    await breath.click()
    await expect(page.getByTestId('enter-own-number')).toBeVisible({ timeout: 8_000 })
    await shot(page, 'enter-own-breath')
    await fillAndConfirmEnterOwn(page, { faces: [3, 4] })
  })

  test('heroic reroll opens EnterOwn (2024)', async ({ page }) => {
    await openPreview(page, { edition: '2024', heroic: true })
    await enableDiceOnTable(page)
    const mobile = (page.viewportSize()?.width ?? 1440) <= 500
    if (mobile) {
      const expand = page.getByRole('button', { name: /Развернуть шапку/i })
      if (await expand.isVisible().catch(() => false)) await expand.click()
    }
    // Soft check: fixture sets inspiration; label differs desktop/mobile.
    const insp = page.getByRole('button', { name: /вдохн/i }).first()
    if (await insp.isVisible().catch(() => false)) {
      await expect(insp).toHaveAttribute('aria-pressed', 'true')
    }
    const chip = page
      .locator('.play-desk__hot-item, [aria-label="Навыки боя"] button')
      .filter({ hasText: /Атлетика|Акробатика|Анализ|Внимательн|Магия|Скрытность/i })
      .first()
    if (await chip.isVisible().catch(() => false)) {
      await chip.click()
    } else {
      await page.getByRole('button', { name: /^Анализ$/i }).first().click()
    }
    await expect(page.getByTestId('enter-own-number')).toBeVisible({ timeout: 8_000 })
    await fillAndConfirmEnterOwn(page, { d20a: 7 })
    const heroicDlg = page.getByRole('dialog').filter({ hasText: /Героическое вдохновение/i })
    await expect(heroicDlg).toBeVisible({ timeout: 12_000 })
    await shot(page, 'heroic-reroll-offer')
    await heroicDlg.getByRole('button', { name: /Перебросить/i }).click()
    await expect(page.getByTestId('enter-own-number')).toBeVisible({ timeout: 8_000 })
    await shot(page, 'enter-own-heroic-reroll')
    await fillAndConfirmEnterOwn(page, { d20a: 18 })
  })

  test('journal marks physical after companion damage', async ({ page }) => {
    // Preview onToast is a no-op — assert mark in DiceFab journal (same path as Host).
    await openPreview(page, { companion: true })
    await enableDiceOnTable(page)
    await goCombat(page)
    const hit = page
      .locator('.play-desk-compact__hit')
      .filter({ hasText: /Длинный лук|Лираэль/i })
      .first()
    await hit.click()
    await fillAndConfirmEnterOwn(page, { d20a: 14 })
    await expect(page.getByTestId('enter-own-number')).toBeVisible({ timeout: 8_000 })
    await fillAndConfirmEnterOwn(page, { faces: [5] })
    if (!(await page.getByTestId('dice-journal').isVisible().catch(() => false))) {
      await page.getByTestId('dice-fab').click()
    }
    await expect(page.getByTestId('dice-journal')).toBeVisible({ timeout: 8_000 })
    await expect(
      page.getByTestId('dice-log').locator('li').first(),
    ).toContainText(/кубик на столе|🎲/i)
    await shot(page, 'journal-physical-mark')
  })

  test('toggle off — digital skill (no EnterOwn)', async ({ page }) => {
    await openPreview(page)
    const mobile = (page.viewportSize()?.width ?? 1440) <= 500
    const chip = page
      .locator('.play-desk__hot-item, [aria-label="Навыки боя"] button')
      .filter({ hasText: /Атлетика|Акробатика|Анализ|Внимательн|Магия|Скрытность/i })
      .first()
    if (mobile || (await chip.isVisible().catch(() => false))) {
      await expect(chip).toBeVisible({ timeout: 8_000 })
      await chip.click()
    } else {
      // Expand Int block if skills are collapsed, then roll.
      const intBlock = page.locator('.abil-block').filter({ hasText: 'Интеллект' }).first()
      await expect(intBlock).toBeVisible({ timeout: 8_000 })
      const expand = intBlock.getByRole('button', { name: /Интеллект|▸|▾/i }).first()
      if (await expand.isVisible().catch(() => false)) await expand.click()
      const skill = intBlock
        .locator('button')
        .filter({ hasText: /Магия|Анализ|История/i })
        .first()
      await expect(skill).toBeVisible({ timeout: 8_000 })
      await skill.click()
    }
    await page.waitForTimeout(500)
    await expect(page.getByTestId('enter-own-number')).toHaveCount(0)
    await shot(page, 'journal-digital-toggle-off')
  })
})
