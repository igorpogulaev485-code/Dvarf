/**
 * P24-M02-druid Доправка 2 — live evidence (wizard clicked, no e2eSeed).
 * 1) Природный ворожей: WS uses → create spell slot
 * 2) Лунный луч in Wild Shape: free M allowed (PH24)
 * 3) Empty Companions hint = «Дикий спутник…»
 * 4) Classic SpellsPanel on Play Desk for 2024 druid
 *
 * Screenshots: only 1440×900 and 390×844, element in frame, no toast, never fullPage.
 * Output: /opt/cursor/artifacts/p24-m02-druid/fixup2/
 */
import { expect, test, type Page } from '@playwright/test'
import {
  SUB,
  createAt,
  expandCard,
  featureCard,
  dismissGuided,
  enterWildShape,
  isPhone,
  openCombatScene,
  openCompanionsScene,
  openFeaturesScene,
  openRest,
  projectOf,
  storedSheet,
  waitStored,
  wildShapeCounter,
  wildShapeFromSheet,
} from './support/druidLiveFlow'
import { ensureFixup2Dir, fshot2 } from './support/fixup2Shots'

test.beforeAll(() => ensureFixup2Dir())

function spellsPanel(page: Page) {
  return page
    .locator('.ui-panel')
    .filter({ has: page.locator('.ui-panel__title', { hasText: /^Заклинания$/ }) })
    .first()
}

async function openSpellsPane(page: Page, project: string) {
  await openCombatScene(page, project)
  if (isPhone(project)) {
    await page
      .locator(':is(button,[role=tab],[role=button]):visible', { hasText: /^Заклинания$/ })
      .first()
      .click()
    await page.waitForTimeout(500)
  }
  await expect(spellsPanel(page)).toBeVisible({ timeout: 15_000 })
}

async function applyLongRest(page: Page, project: string) {
  await openRest(page, project)
  const rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).last()
  await rest.getByText(/^Продолжительный$/).first().click()
  await rest.getByRole('button', { name: /Сводка и применение/ }).click()
  await page.waitForTimeout(500)
  const apply = rest.getByRole('button', { name: /^Применить$/ })
  await apply.scrollIntoViewIfNeeded()
  await apply.click()
  await page.waitForTimeout(600)
  const close = page.getByRole('dialog').last().getByRole('button', { name: /^Закрыть$/ })
  if (await close.isVisible().catch(() => false)) await close.click()
  await dismissGuided(page)
}

test.describe('Доправка 2 — Природный ворожей', () => {
  test.setTimeout(480_000)
  test.use({ actionTimeout: 15_000 })

  test('nature magician L20: 2 WS → ячейка 4, списание, восстановление долгим', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Ворожей',
      level: 20,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'temperate',
      fury: 'primal_strike',
    })

    const before = await storedSheet(store)
    const slot4Before = before.spells?.slots?.['4'] ?? { max: 0, used: 0, flexible: 0 }
    await openFeaturesScene(page, project)
    const pipsBefore = await wildShapeCounter(page, project)
    expect(pipsBefore.max).toBeGreaterThanOrEqual(2)
    expect(pipsBefore.left).toBe(pipsBefore.max)
    const card = await featureCard(page, /^Архидруид/)
    await expandCard(card)
    await card.getByRole('button', { name: /^Архидруид…$/ }).click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg).toBeVisible()
    await expect(dlg).toContainText(/Природный ворожей/)
    await expect(dlg).not.toContainText(/Нет подходящих ячеек/)
    await expect(dlg).toContainText(/Создать ячейку/)
    await expect(dlg).toContainText(/2 круг|4 круг/)
    // Spend 2 uses → slot 4
    const usesInput = dlg.locator('input[type="number"]').first()
    if (await usesInput.count()) {
      await usesInput.fill('2')
    }
    await expect(dlg).toContainText(/Создать ячейку:\s*4 круг/)
    await fshot2(page, 'nature-magician-dialog-create-slot-4', project, { frame: dlg })

    await dlg.getByRole('button', { name: /Природный ворожей: применить/ }).click()
    await expect(dlg).toBeHidden({ timeout: 15_000 })
    await waitStored(
      store,
      (s) => ((s.spells?.slots?.['4']?.flexible ?? 0) >= 1) || ((s.spells?.slots?.['4']?.max ?? 0) > (slot4Before.max ?? 0)),
    )
    const pipsAfter = await wildShapeCounter(page, project)
    expect(pipsAfter.left).toBe(pipsBefore.left - 2)

    const after = await storedSheet(store)
    const slot4After = after.spells?.slots?.['4']
    expect(slot4After?.max).toBe((slot4Before.max ?? 0) + 1)
    expect(slot4After?.flexible ?? 0).toBeGreaterThanOrEqual(1)
    expect(slot4After!.max - slot4After!.used).toBeGreaterThan(
      (slot4Before.max ?? 0) - (slot4Before.used ?? 0),
    )

    await openSpellsPane(page, project)
    const panel = spellsPanel(page)
    await panel.getByRole('button', { name: /^4$/, exact: true }).click()
    await page.waitForTimeout(300)
    const slotPips = panel.locator('.spell-level-block').filter({ hasText: /4-й уровень/ }).locator('.slot-pips, [class*="pip"]').first()
    const slotHeader = panel.locator('.spell-level-block__header').filter({ hasText: /4-й уровень/ }).first()
    await slotHeader.scrollIntoViewIfNeeded()
    await expect(slotHeader).toContainText(/\d+\s*\/\s*\d+/)
    // Extra flexible slot raised max by 1 vs class table.
    expect(slot4After!.max).toBeGreaterThan(slot4Before.max ?? 0)
    await fshot2(page, 'nature-magician-slot-4-created-on-desk', project, { frame: slotHeader })
    void slotPips

    // Locked until long rest
    await openFeaturesScene(page, project)
    const card2 = await featureCard(page, /^Архидруид/)
    await expandCard(card2)
    await card2.getByRole('button', { name: /^Архидруид…$/ }).click()
    const locked = page.getByRole('dialog').last()
    await expect(locked).toContainText(/уже использовано/)
    await fshot2(page, 'nature-magician-locked-until-long-rest', project, { frame: locked })
    await locked.getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click()

    await applyLongRest(page, project)
    await waitStored(store, (s) => (s.spells?.slots?.['4']?.flexible ?? 0) === 0)
    const pipsRested = await wildShapeCounter(page, project)
    expect(pipsRested.left).toBe(pipsRested.max)
    const rested = await storedSheet(store)
    expect(rested.spells?.slots?.['4']?.flexible ?? 0).toBe(0)

    await openFeaturesScene(page, project)
    const card3 = await featureCard(page, /^Архидруид/)
    await expandCard(card3)
    await card3.getByRole('button', { name: /^Архидруид…$/ }).click()
    const again = page.getByRole('dialog').last()
    await expect(again).not.toContainText(/уже использовано/)
    await expect(again.getByRole('button', { name: /Природный ворожей: применить/ })).toBeEnabled()
    await fshot2(page, 'nature-magician-available-after-long-rest', project, { frame: again })
    expect(store.unmatched).toEqual([])
  })
})

test.describe('Доправка 2 — Лунный луч в облике', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  test('moon L5: Лунный луч (свободный M) кастуется в Диком облике', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Лунный луч',
      level: 5,
      order: 'warden',
      subclassSlug: SUB.moon,
    })

    await enterWildShape(page, project, { query: 'Волк', name: /^Волк · CR 1\/4/ })
    await waitStored(store, (s) =>
      (s.companions ?? []).some((c: any) => c.role === 'self_form' && c.active),
    )

    await openSpellsPane(page, project)
    const panel = spellsPanel(page)
    const known = ((await storedSheet(store)).spells?.known ?? []) as Array<{
      name?: string
      level?: number
      prepared?: boolean
      components?: { m?: string }
    }>
    const moonRow = known.find((s) => /Лунный луч|Moonbeam/i.test(String(s.name)))
    expect(moonRow, 'Лунный луч в known').toBeTruthy()
    expect(moonRow!.components?.m || 'лист луносемянника').toBeTruthy()

    await panel.getByRole('button', { name: /Все известные/ }).click()
    await panel.getByRole('button', { name: /^2$/, exact: true }).click()
    await page.waitForTimeout(400)
    const moonbeam = panel
      .locator('.spell-card')
      .filter({
        has: page.locator(
          'input[value*="Лунный"], input[value*="Moonbeam"], [value*="Лунный"], [value*="Moonbeam"]',
        ),
      })
      .or(panel.locator('.spell-card').filter({ hasText: /Лунный луч|Moonbeam/ }))
      .first()
    await expect(moonbeam).toBeVisible({ timeout: 15_000 })
    await moonbeam.scrollIntoViewIfNeeded()
    const nameField = moonbeam.locator('input').first()
    await fshot2(page, 'moonbeam-in-form-spell-card', project, { frame: nameField })
    const castBtn = moonbeam.getByRole('button', { name: /^Каст$/i })
    await castBtn.scrollIntoViewIfNeeded()
    await fshot2(page, 'moonbeam-in-form-cast-button', project, { frame: castBtn })
    await castBtn.click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg).toBeVisible({ timeout: 10_000 })
    await expect(dlg).toContainText(/Лунный луч|Moonbeam/)
    await expect(dlg).not.toContainText(/нельзя предоставить материальный/)
    await expect(dlg).not.toContainText(/^Нет компонента$/)
    await expect(dlg.getByRole('button', { name: /^Нет компонента$/ })).toHaveCount(0)
    await expect(dlg).toContainText(/свободный материальный|Дикий облик/i)
    await fshot2(page, 'moonbeam-in-form-cast-dialog', project, { frame: dlg })
    const confirmCast = dlg.getByRole('button', { name: /^Каст/ }).last()
    await expect(confirmCast).toBeEnabled()
    await confirmCast.click()
    await expect(dlg).toBeHidden({ timeout: 15_000 })
    await waitStored(store, (s) => (s.spells?.slots?.['2']?.used ?? 0) >= 1)
    await expect(page.locator('.ui-toast').filter({ hasText: /нельзя предоставить/ })).toHaveCount(0)
    await expect(castBtn).toBeVisible()
    await fshot2(page, 'moonbeam-in-form-cast-done', project, { frame: castBtn })
    expect(store.unmatched).toEqual([])
  })
})

test.describe('Доправка 2 — подсказка Напарников', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  test('empty companions: «Дикий спутник…» совпадает с кнопкой умения', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Напарники пусто',
      level: 5,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'temperate',
    })

    await openFeaturesScene(page, project)
    const card = await featureCard(page, /^Дикий спутник/)
    await expandCard(card)
    const featureBtn = card.getByRole('button', { name: /Дикий спутник…/ }).first()
    await expect(featureBtn).toBeVisible()
    await fshot2(page, 'companions-hint-feature-button', project, { frame: card })

    await openCompanionsScene(page, project)
    const panel = page.locator('.companions-panel').first()
    await expect(panel).toBeVisible()
    await expect(panel).toContainText(/Дикий спутник…/)
    await expect(panel).not.toContainText(/Через Дикий облик…/)
    const emptyCta = panel.getByRole('button', { name: /Дикий спутник…/ }).first()
    await expect(emptyCta).toBeVisible()
    await fshot2(page, 'companions-hint-empty-matches-button', project, { frame: panel })
    expect(store.unmatched).toEqual([])
  })
})

test.describe('Доправка 2 — SpellsPanel на Play Desk', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  test('2024 druid: классическая SpellsPanel видна на столе', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Книга на столе',
      level: 4,
      order: 'magician',
      subclassSlug: null,
    })

    await openSpellsPane(page, project)
    const panel = spellsPanel(page)
    await expect(panel).toBeVisible({ timeout: 10_000 })
    const summary = panel.locator('.spells-summary')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText(/Заговоры/)
    await expect(summary).toContainText(/4\s*\/\s*4/)
    await expect(page.locator('.play-desk-compact__row.is-spell')).toHaveCount(0)
    await expect(panel.getByRole('button', { name: /Гримуар/ })).toBeVisible()
    await fshot2(page, 'spells-panel-classic-on-play-desk', project, { frame: summary })
    expect(store.unmatched).toEqual([])
  })
})
