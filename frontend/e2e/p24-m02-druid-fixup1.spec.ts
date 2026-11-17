/**
 * P24-M02-druid Доправка 1 — live evidence (wizard clicked, no e2eSeed).
 * Screenshots: only 1440×900 and 390×844 viewports, element in frame, no toast, never fullPage.
 * Output: /opt/cursor/artifacts/p24-m02-druid/fixup1/
 */
import { expect, test, type Locator, type Page } from '@playwright/test'
import type { HarnessStore } from './support/druid2024Harness'
import {
  SUB,
  createAt,
  expandCard,
  featureCard,
  dismissGuided,
  wildShapeCounter,
  wildShapeFromSheet,
  enterWildShape,
  ensureMobileVitalsExpanded,
  exitWildShape,
  isPhone,
  openCombatScene,
  openCompanionsScene,
  openExploreScene,
  openFeaturesScene,
  openIdentity,
  openInventoryItem,
  openRest,
  projectOf,
  storedSheet,
  waitStored,
  wisModOf,
} from './support/druidLiveFlow'
import { ensureFixup1Dir, expectInFrame, fshot } from './support/fixup1Shots'

test.beforeAll(() => ensureFixup1Dir())

const header = (page: Page): Locator =>
  page.locator('[data-onboarding="combat-header"]:visible').first()

async function expandHeader(page: Page, project: string) {
  if (isPhone(project)) await ensureMobileVitalsExpanded(page)
}

test.describe('Доправка 1 — Moon: шапка и форма', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  test('moon L6: шапка в облике Волк — КД 13+Мдр, скорость 40, Chip «форма»', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Луна 6',
      level: 6,
      order: 'warden',
      subclassSlug: SUB.moon,
    })
    const wis = wisModOf(sheet)
    await expandHeader(page, project)
    await fshot(page, 'wild-shape-moon-6-header-character', project, { top: true, frame: header(page) })

    await enterWildShape(page, project, { query: 'Волк', name: /^Волк · CR 1\/4/ })
    await waitStored(store, (s) => (s.combat?.hp_temp ?? 0) === 18)
    const form = ((await storedSheet(store)).companions ?? []).find(
      (c: any) => c.role === 'self_form' && c.active,
    )
    expect(form.stats.ac).toBe(Math.max(12, 13 + wis))
    expect(form.stats.speed).toBe(40)
    await expandHeader(page, project)
    const acTile = header(page).locator('.vital-tile, [class*="vital"]').filter({ hasText: /форма/ }).first()
    await expect(header(page)).toContainText(String(13 + wis))
    await expect(header(page)).toContainText('40')
    await expect(header(page).getByText('форма', { exact: true }).first()).toBeVisible()
    void acTile
    await fshot(page, 'wild-shape-moon-6-header-form', project, { top: true, frame: header(page) })

    await exitWildShape(page, project, /Волк/)
    await waitStored(store, (s) => !(s.companions ?? []).some((c: any) => c.active && c.role === 'self_form'))
    await expandHeader(page, project)
    await expect(header(page).getByText('форма', { exact: true })).toHaveCount(0)
    await fshot(page, 'wild-shape-moon-6-header-after-exit', project, { top: true, frame: header(page) })
    expect(store.unmatched).toEqual([])
  })
})

async function openSpellsPane(page: Page, project: string) {
  await openCombatScene(page, project)
  if (isPhone(project)) {
    await page
      .locator(':is(button,[role=tab],[role=button]):visible', { hasText: /^Заклинания$/ })
      .first()
      .click()
    await page.waitForTimeout(500)
  }
}

async function openAbilityBlock(page: Page, project: string, abil: string): Promise<Locator> {
  if (isPhone(project)) {
    await openCombatScene(page, project)
    await ensureMobileVitalsExpanded(page)
    await page.locator('button.mobile-vitals__abil').click()
    const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
    await expect(abilPage).toBeVisible()
    return abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()
  }
  return page.locator(`.abil-block[data-abil="${abil}"]:visible`).first()
}

async function closeAbilityPage(page: Page, project: string) {
  if (!isPhone(project)) return
  await page.locator('button.mobile-abil-page__back').click()
  await expect(page.getByRole('dialog', { name: /Характеристики/ })).toHaveCount(0, { timeout: 10_000 })
}

test.describe('Доправка 1 — Moon form: Con save, излучение, заклинание круга, Природный удар', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  test('moon L7 primal_strike: в облике', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Луна 7',
      level: 7,
      order: 'warden',
      subclassSlug: SUB.moon,
      fury: 'primal_strike',
    })
    const wis = wisModOf(sheet)
    const conMod = Math.floor((Number(sheet.abilities.con.score) - 10) / 2)

    let con = await openAbilityBlock(page, project, 'con')
    await expect(con).toContainText(new RegExp(`Сп\\s*\\+?${conMod}`))
    await fshot(page, 'moon-form-con-save-before-form', project, { frame: con })
    await closeAbilityPage(page, project)

    await enterWildShape(page, project, { query: 'Волк', name: /^Волк · CR 1\/4/ })
    await waitStored(store, (s) => (s.combat?.hp_temp ?? 0) === 21)

    con = await openAbilityBlock(page, project, 'con')
    await expect(con).toContainText(new RegExp(`Сп\\s*\\+?${conMod + wis}`))
    await fshot(page, 'moon-form-con-save-plus-wis', project, { frame: con })
    await closeAbilityPage(page, project)

    await openCombatScene(page, project)
    const riders = page.getByTestId('p24-form-attack-riders').first()
    await expect(riders).toContainText(/Природный удар \+1к8/)
    await expect(riders).toContainText(/Излучение: выкл/)
    await fshot(page, 'moon-form-primal-strike-rider', project, { frame: riders })
    await riders.getByRole('button', { name: /Излучение/ }).click()
    await expect(riders).toContainText(/Излучение: вкл/)
    const bite = page.locator('.play-desk-compact__row').filter({ hasText: /Укус/ }).first()
    await expect(bite).toContainText(/излучением/)
    await fshot(page, 'moon-form-radiant-toggle-on', project, { frame: [bite, riders] })

    await openSpellsPane(page, project)
    const cure = page.locator('.play-desk-compact__row.is-spell').filter({ hasText: /Лечение ран/ }).first()
    await expect(cure).toContainText(/Круг луны/)
    await cure.scrollIntoViewIfNeeded()
    await fshot(page, 'moon-form-moon-spell-row', project, { frame: cure })
    await cure.getByRole('button', { name: /^Каст$/i }).click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg).toBeVisible({ timeout: 10_000 })
    await expect(dlg).toContainText(/Круг луны/)
    await fshot(page, 'moon-form-moon-spell-cast-dialog', project, { frame: dlg })
    await dlg.getByRole('button', { name: /^Каст$/ }).click()
    await expect(dlg).toBeHidden({ timeout: 10_000 })
    await waitStored(store, (s) => (s.spells?.slots?.['1']?.used ?? 0) === 1)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await cure.scrollIntoViewIfNeeded()
    await fshot(page, 'moon-form-moon-spell-cast-done', project, { frame: cure })
    expect(store.unmatched).toEqual([])
  })
})

test.describe('Доправка 1 — Potent Spellcasting L15: +300 фт', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  test('potent L15: Сотворение пламени и Терновый кнут — +300 фт в строке и в диалоге', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Мощные 15',
      level: 15,
      order: 'magician',
      subclassSlug: SUB.stars,
      fury: 'potent_spellcasting',
    })
    expect(sheet.class_options_2024?.elemental_fury).toBe('potent_spellcasting')
    await openSpellsPane(page, project)
    const cases = [
      { key: 'produce-flame', name: /Сотворение пламени/, range: /бросок 360 фт \(\+300/ },
      { key: 'thorn-whip', name: /Терновый кнут/, range: /330 фт \(\+300/ },
    ]
    for (const c of cases) {
      const row = page.locator('.play-desk-compact__row.is-spell').filter({ hasText: c.name }).first()
      await expect(row).toBeVisible()
      await expect(row).toContainText(c.range)
      await row.scrollIntoViewIfNeeded()
      await fshot(page, `elemental-fury-potent-range-300-${c.key}-row`, project, { frame: row })
      await row.getByRole('button', { name: /^Каст$/i }).click()
      const dlg = page.getByRole('dialog').last()
      await expect(dlg).toBeVisible({ timeout: 10_000 })
      await expect(dlg).toContainText(c.range)
      await fshot(page, `elemental-fury-potent-range-300-${c.key}-cast-dialog`, project, { frame: dlg })
      await dlg.getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click()
      await expect(dlg).toBeHidden({ timeout: 10_000 })
    }
    expect(store.unmatched).toEqual([])
  })
})

test.describe('Доправка 1 — известные облики (N/M)', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  for (const lvl of [2, 5] as const) {
    test(`known forms L${lvl}: пикер в мастере N/M, диалог облика — только известные звери`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const budget = lvl >= 4 ? 6 : 4
      const { store, sheet } = await createAt(page, project, {
        name: `Известные ${lvl}`,
        level: lvl,
        order: 'warden',
        subclassSlug: lvl >= 3 ? SUB.land : null,
        land: 'temperate',
        duringLeveling: async (pg) => {
          const picker = pg.getByTestId('p24-m02-known-forms-pick')
          await expect(picker).toContainText(new RegExp(`Известных обликов: ${budget}/${budget}`))
          await expect(picker.getByRole('button', { name: /^Убрать:/ })).toHaveCount(budget)
          await fshot(pg, `known-forms-create-L${lvl}-picker-${budget}-of-${budget}`, project, {
            frame: picker,
          })
        },
      })
      const known = (sheet.known_forms ?? []).map((f: any) => String(f.name_ru ?? f.name))
      expect(known).toHaveLength(budget)

      await openFeaturesScene(page, project)
      const card = await featureCard(page, /^Дикий облик/)
      await expandCard(card)
      await card.getByRole('button', { name: /Потратить…|Облик…/ }).first().click()
      const dlg = page.getByRole('dialog').last()
      await dlg.getByRole('button', { name: /Дикий облик \(бонусным\)/ }).click()
      await expect(dlg).toContainText(new RegExp(`Известные облики: ${budget}/${budget}`))
      const beasts = dlg.getByRole('button').filter({ hasText: / · CR / })
      await expect(beasts).toHaveCount(budget)
      const shown = (await beasts.allInnerTexts()).map((t) => t.split(' · CR')[0]!.trim())
      expect([...shown].sort()).toEqual([...known].sort())
      await fshot(page, `known-forms-L${lvl}-wild-shape-dialog-only-known`, project, { frame: dlg })
      expect(store.unmatched).toEqual([])
    })
  }
})

async function applyRest(page: Page, project: string, kind: 'long' | 'short') {
  await openRest(page, project)
  const rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).last()
  if (kind === 'long') {
    await rest.getByText(/^Продолжительный$/).first().click()
    await rest.getByRole('button', { name: /Сводка и применение/ }).click()
  } else {
    await rest.getByRole('button', { name: /Сброс коротких ресурсов/ }).click()
  }
  await page.waitForTimeout(500)
  return rest
}

async function confirmRest(page: Page, rest: Locator) {
  const apply = rest.getByRole('button', { name: /^Применить$/ })
  await apply.scrollIntoViewIfNeeded()
  await apply.click()
  await page.waitForTimeout(600)
  const close = page.getByRole('dialog').last().getByRole('button', { name: /^Закрыть$/ })
  if (await close.isVisible().catch(() => false)) await close.click()
  await dismissGuided(page)
}

function companionRow(page: Page, name: RegExp): Locator {
  return page.locator('.companion-card').filter({ hasText: name }).first()
}

test.describe('Доправка 1 — Дикий спутник', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  test('Дикий спутник L5: кнопка, оплата обликом и ячейкой, фея в Напарниках, исчезает после долгого отдыха', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Спутник',
      level: 5,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'temperate',
    })
    const familiars = async () =>
      ((await storedSheet(store)).companions ?? []).filter(
        (c: any) => c.source?.feature === 'wild_companion',
      )

    await openFeaturesScene(page, project)
    const card = await featureCard(page, /^Дикий спутник/)
    await expandCard(card)
    const button = card.getByRole('button', { name: /Дикий спутник…/ }).first()
    await expect(button).toBeVisible()
    await fshot(page, 'wild-companion-button-on-card', project, { frame: card })

    await button.click()
    let dlg = page.getByRole('dialog').last()
    await expect(dlg).toContainText(/Облик \(−1, осталось 2\)/)
    await fshot(page, 'wild-companion-pay-dialog-wild-shape', project, { frame: dlg })
    await dlg.getByRole('button', { name: /Выбрать фамильяра/ }).click()
    dlg = page.getByRole('dialog').last()
    await expect(dlg).toContainText(/выбери форму/)
    await fshot(page, 'wild-companion-pick-form-dialog', project, { frame: dlg })
    await dlg.getByRole('button', { name: /^Сова/ }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 })
    await waitStored(store, async () => true)
    await expect.poll(async () => (await familiars()).length).toBe(1)
    expect((await familiars())[0].kind).toBe('familiar')
    expect(wildShapeFromSheet(await storedSheet(store))?.used).toBe(1)

    await openFeaturesScene(page, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 1, max: 2 })
    const pool = page.locator('.feature-card').filter({ hasText: /^2\s*класс[\s\S]*Дикий облик: 1\/2/ }).first()
    await fshot(page, 'wild-companion-wild-shape-spent-1of2', project, { frame: await featureCard(page, /^Дикий облик/) })
    void pool

    await openCompanionsScene(page, project)
    await companionRow(page, /Дикий спутник · Сова/).getByRole('button').first().click()
    const owl = companionRow(page, /Дикий спутник · Сова/)
    await expect(owl).toContainText(/фея/i)
    await expect(owl).toContainText(/Фамилиар/)
    await fshot(page, 'wild-companion-fairy-familiar-in-companions-paid-wild-shape', project, { frame: owl })

    const rest = await applyRest(page, project, 'long')
    await expect(rest).toContainText(/Дикий облик:\s*1\s*→\s*2/)
    await confirmRest(page, rest)
    await expect.poll(async () => (await familiars()).length).toBe(0)
    await openCompanionsScene(page, project)
    await expect(page.locator('.companion-card').filter({ hasText: /Дикий спутник/ })).toHaveCount(0)
    await fshot(page, 'wild-companion-gone-after-long-rest', project, {
      frame: page.getByRole('heading', { name: 'Напарники' }).first(),
    })

    await openFeaturesScene(page, project)
    const card2 = await featureCard(page, /^Дикий спутник/)
    await expandCard(card2)
    await card2.getByRole('button', { name: /Дикий спутник…/ }).first().click()
    dlg = page.getByRole('dialog').last()
    await dlg.getByRole('tab', { name: /^Ячейка заклинаний$/ }).click()
    await dlg.locator('button.ui-button', { hasText: /^1 круг$/ }).click()
    await expect(dlg.getByRole('button', { name: /Выбрать фамильяра/ })).toBeEnabled()
    await fshot(page, 'wild-companion-pay-dialog-spell-slot', project, { frame: dlg })
    await dlg.getByRole('button', { name: /Выбрать фамильяра/ }).click()
    dlg = page.getByRole('dialog').last()
    await dlg.getByRole('button', { name: /^Кошка/ }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 })
    await expect.poll(async () => (await familiars()).length).toBe(1)
    const afterSlot = await storedSheet(store)
    expect(afterSlot.spells?.slots?.['1']?.used).toBe(1)
    expect(wildShapeFromSheet(afterSlot)?.used).toBe(0)

    await openCompanionsScene(page, project)
    await companionRow(page, /Дикий спутник · Кошка/).getByRole('button').first().click()
    const cat = companionRow(page, /Дикий спутник · Кошка/)
    await expect(cat).toContainText(/фея/i)
    await fshot(page, 'wild-companion-fairy-familiar-in-companions-paid-spell-slot', project, { frame: cat })
    expect(store.unmatched).toEqual([])
  })
})

test.describe('Доправка 1 — Архидруид L20: все три умения', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  test('archdruid L20: Неувядающий облик, Природный ворожей, Долголетие — одновременно', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Архидруид',
      level: 20,
      order: 'warden',
      subclassSlug: SUB.stars,
      fury: 'primal_strike',
    })
    await openFeaturesScene(page, project)
    const card = await featureCard(page, /^Архидруид/)
    await expandCard(card)
    for (const re of [/Неувядающий дикий облик/, /Природный ворожей/, /Долголетие/]) {
      await expect(card).toContainText(re)
    }
    await expect(card).not.toContainText(/выбери один|на выбор/i)
    await fshot(page, 'archdruid-all-three-card', project, { frame: card })

    await card.getByRole('button', { name: /^Архидруид…$/ }).click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg).toBeVisible()
    for (const re of [/Неувядающий дикий облик/, /Долголетие/, /Природный ворожей/]) {
      await expect(dlg).toContainText(re)
    }
    await expect(dlg.getByRole('button', { name: /Бросок инициативы: вернуть использование/ })).toBeVisible()
    await expect(dlg.getByRole('button', { name: /Природный ворожей: применить/ })).toBeVisible()
    await expect(dlg).not.toContainText(/выбери один|на выбор/i)
    await fshot(page, 'archdruid-all-three-dialog', project, { frame: dlg })
    expect(store.unmatched).toEqual([])
  })
})

async function wildShapePips(page: Page, project: string) {
  await openFeaturesScene(page, project)
  return wildShapeCounter(page)
}

async function slotsLevel1(store: HarnessStore) {
  return (await storedSheet(store)).spells?.slots?.['1'] as { max: number; used: number }
}

test.describe('Доправка 1 — Дикое восстановление: два обмена', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  test('wild resurgence L5: ячейка → облик и облик → ячейка 1 круга, до и после', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Восстановление',
      level: 5,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'temperate',
    })
    await enterWildShape(page, project, { query: 'Волк', name: /^Волк · CR 1\/4/ })
    await enterWildShape(page, project, { query: 'Бабуин', name: /^Бабуин · CR 0/ })
    expect(await wildShapePips(page, project)).toEqual({ left: 0, max: 2 })
    expect((await slotsLevel1(store)).used).toBe(0)

    const openResurgence = async () => {
      await openFeaturesScene(page, project)
      const card = await featureCard(page, /^Дикое восстановление/)
      await expandCard(card)
      await card.getByRole('button', { name: /^Восстановление…$/ }).first().click()
      const dlg = page.getByRole('dialog').last()
      await expect(dlg).toBeVisible()
      return dlg
    }

    // 1) ячейка → облик
    let dlg = await openResurgence()
    await expect(dlg).toContainText(/Дикий облик: 0\/2/)
    await dlg.locator('button.ui-button', { hasText: /^1 круг$/ }).click()
    await fshot(page, 'wild-resurgence-slot-to-shape-before-dialog', project, { frame: dlg })
    await dlg.getByRole('button', { name: /^Применить$/ }).click()
    await expect(dlg).toBeHidden({ timeout: 10_000 })
    await waitStored(store, (s) => s.spells?.slots?.['1']?.used === 1)
    expect(wildShapeFromSheet(await storedSheet(store))?.used).toBe(1)
    expect(await wildShapePips(page, project)).toEqual({ left: 1, max: 2 })
    await fshot(page, 'wild-resurgence-slot-to-shape-after-wild-shape-1of2', project, {
      frame: await featureCard(page, /^Дикий облик/),
    })
    await openSpellsPane(page, project)
    const slotsHead = page.getByText(/Ячейки \d+\/\d+/).first()
    await expect(slotsHead).toContainText('Ячейки 3/4')
    await fshot(page, 'wild-resurgence-slot-to-shape-after-slot-1-spent', project, { frame: slotsHead })

    // 2) облик → ячейка 1 круга
    dlg = await openResurgence()
    await dlg.getByRole('tab', { name: /Облик → ячейка 1 круга/ }).click()
    await expect(dlg).toContainText(/Дикий облик: 1\/2/)
    await expect(dlg.getByRole('button', { name: /^Применить$/ })).toBeEnabled()
    await fshot(page, 'wild-resurgence-shape-to-slot-before-dialog', project, { frame: dlg })
    await dlg.getByRole('button', { name: /^Применить$/ }).click()
    await expect(dlg).toBeHidden({ timeout: 10_000 })
    await waitStored(store, (s) => s.spells?.slots?.['1']?.used === 0)
    expect(wildShapeFromSheet(await storedSheet(store))?.used).toBe(2)
    expect(await wildShapePips(page, project)).toEqual({ left: 0, max: 2 })
    await fshot(page, 'wild-resurgence-shape-to-slot-after-wild-shape-0of2', project, {
      frame: await featureCard(page, /^Дикий облик/),
    })
    await openSpellsPane(page, project)
    const slotsHead2 = page.getByText(/Ячейки \d+\/\d+/).first()
    await expect(slotsHead2).toContainText('Ячейки 4/4')
    await fshot(page, 'wild-resurgence-shape-to-slot-after-slot-1-restored', project, { frame: slotsHead2 })

    // второй раз за долгий отдых «облик → ячейка» недоступен
    dlg = await openResurgence()
    await dlg.getByRole('tab', { name: /Облик → ячейка 1 круга/ }).click()
    await expect(dlg).toContainText(/уже использован/)
    await fshot(page, 'wild-resurgence-shape-to-slot-locked-until-long-rest', project, { frame: dlg })
    expect(store.unmatched).toEqual([])
  })
})

async function castSpellByName(page: Page, project: string, name: RegExp) {
  await openSpellsPane(page, project)
  const row = page.locator('.play-desk-compact__row.is-spell').filter({ hasText: name }).first()
  await row.scrollIntoViewIfNeeded()
  await row.getByRole('button', { name: /^Каст$/i }).click()
  const dlg = page.getByRole('dialog').last()
  await expect(dlg).toBeVisible({ timeout: 10_000 })
  await dlg.getByRole('button', { name: /^Каст$/ }).click()
  await expect(dlg).toBeHidden({ timeout: 10_000 })
  await page.waitForTimeout(400)
}

test.describe('Доправка 1 — отдых Круга земли', () => {
  test.setTimeout(480_000)
  test.use({ actionTimeout: 15_000 })

  test('land L6: короткий отдых — Естественное восстановление; долгий — местность, замена облика, сброс пулов', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Земля 6',
      level: 6,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'temperate',
    })
    const knownBefore = (sheet.known_forms ?? []).map((f: any) => String(f.name_ru ?? f.name))
    expect(knownBefore).toHaveLength(6)

    await enterWildShape(page, project, { query: 'Волк', name: /^Волк · CR 1\/4/ })
    await exitWildShape(page, project, /Волк/)
    await castSpellByName(page, project, /Рассеивание магии/)
    await waitStored(store, (s) => s.spells?.slots?.['3']?.used === 1)
    expect(wildShapeFromSheet(await storedSheet(store))?.used).toBe(1)

    // --- короткий отдых: Естественное восстановление
    await openRest(page, project)
    let rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).last()
    const shortPanel = rest.getByTestId('p24-druid-rest-short')
    await expect(shortPanel).toContainText(/Естественное восстановление · 1\/1/)
    await fshot(page, 'rest-land-short-natural-recovery-panel', project, { frame: shortPanel })
    await shortPanel.getByRole('button', { name: /Естественное восстановление: выбрать ячейки/ }).click()
    const nr = page.getByRole('dialog').last()
    await expect(nr).toContainText(/Лимит суммы уровней ячеек: 3/)
    await expect(nr).toContainText(/Потрачено 1\/3/)
    await fshot(page, 'rest-land-natural-recovery-dialog', project, { frame: nr })
    const level3 = nr.locator('.sorcery-spend-row').filter({ hasText: /^3 ур\./ })
    await level3.locator('button.ui-button').last().click()
    await expect(nr).toContainText(/выбрано 3\/3/)
    await fshot(page, 'rest-land-natural-recovery-dialog-slot-3-selected', project, { frame: nr })
    await nr.getByRole('button', { name: /Восстановить \(потратить заряд\)/ }).click()
    await expect(page.getByRole('dialog')).toHaveCount(1, { timeout: 10_000 })
    await waitStored(store, (s) => s.spells?.slots?.['3']?.used === 0)
    rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).last()
    await expect(rest.getByTestId('p24-druid-rest-short')).toContainText(/Естественное восстановление · 0\/1/)
    await fshot(page, 'rest-land-short-natural-recovery-spent', project, {
      frame: rest.getByTestId('p24-druid-rest-short'),
    })
    await rest.getByRole('button', { name: /^Закрыть$|^Отмена$/ }).first().click()
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 })
    await openSpellsPane(page, project)
    const slots3 = page.getByText(/Ячейки \d+\/\d+/).nth(2)
    await expect(slots3).toContainText('Ячейки 3/3')
    await fshot(page, 'rest-land-short-after-slot-3-restored', project, { frame: slots3 })
    expect(await wildShapePips(page, project)).toEqual({ left: 2, max: 3 })

    // --- долгий отдых: местность, замена облика, сброс пулов
    await openRest(page, project)
    rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).last()
    await rest.getByText(/^Продолжительный$/).first().click()
    const longPanel = rest.getByTestId('p24-druid-rest-long')
    await expect(longPanel).toBeVisible()
    const terrainBlock = longPanel.locator(':scope > * > *').nth(0)
    const formsBlock = longPanel.locator(':scope > * > *').nth(1)
    await expect(terrainBlock).toContainText(/сейчас: Умеренная/)
    await terrainBlock.locator('select').selectOption('polar')
    await fshot(page, 'rest-land-long-terrain-change-selected', project, { frame: terrainBlock })
    await terrainBlock.getByRole('button', { name: /Сменить местность/ }).click()
    await expect(terrainBlock).toContainText(/сейчас: Полярная/)
    await fshot(page, 'rest-land-long-terrain-changed', project, { frame: terrainBlock })

    await expect(formsBlock).toContainText(/Известные облики · 6\/6/)
    await fshot(page, 'rest-land-long-known-form-replace-before', project, { frame: formsBlock })
    await formsBlock.getByRole('button', { name: /Заменить известный облик/ }).click()
    const swapPicker = formsBlock
    await swapPicker.getByRole('button', { name: /^Забыть: Кабан/ }).click()
    await swapPicker.getByRole('textbox').first().fill('Паук')
    await page.waitForTimeout(300)
    await swapPicker.getByRole('button', { name: /^\+ Паук · CR 0/ }).first().click()
    await expect(formsBlock).toContainText(/Забыто: 1\/1 · выучено: 1\/1/)
    await fshot(page, 'rest-land-long-known-form-replace-one-for-one', project, { frame: formsBlock })
    await formsBlock.getByRole('button', { name: /Применить замену/ }).click()
    await expect(formsBlock).toContainText(/Замена в этот отдых уже сделана/)
    await fshot(page, 'rest-land-long-known-form-replace-done', project, { frame: formsBlock })

    await rest.getByRole('button', { name: /Сводка и применение/ }).click()
    await page.waitForTimeout(500)
    await expect(rest).toContainText(/Дикий облик:\s*2\s*→\s*3/)
    await expect(rest).toContainText(/Естественное восстановление/)
    await fshot(page, 'rest-land-long-pool-reset-summary', project, { frame: rest })
    await confirmRest(page, rest)
    await waitStored(store, (s) => wildShapeFromSheet(s)?.used === 0)
    const after = await storedSheet(store)
    const knownAfter = (after.known_forms ?? []).map((f: any) => String(f.name_ru ?? f.name))
    expect(knownAfter).toContain('Паук')
    expect(knownAfter).not.toContain('Кабан')
    expect(knownAfter).toHaveLength(6)
    expect(String(after.feature_picks?.values ? JSON.stringify(after.feature_picks.values) : '')).toContain('polar')
    expect(after.spells?.slots?.['3']?.used).toBe(0)
    const nrRow = ((after.resources ?? []) as Array<Record<string, any>>).find((r) =>
      /natural_recovery/.test(String(r.id)),
    )
    if (nrRow) expect(nrRow.used).toBe(0)

    await openRest(page, project)
    rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).last()
    await rest.getByText(/^Продолжительный$/).first().click()
    await expect(rest.getByTestId('p24-druid-rest-long')).toContainText(/Заменить известный облик/)
    await expect(rest.getByTestId('p24-druid-rest-long')).not.toContainText(/уже сделана/)
    await fshot(page, 'rest-land-long-after-reset-swap-available-again', project, {
      frame: rest.getByTestId('p24-druid-rest-long').locator(':scope > * > *').nth(1),
    })
    expect(store.unmatched).toEqual([])
  })
})

test.describe('Доправка 1 — Круг звёзд: Благо / Напасть; карточка Природного ордена', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  test('stars L6: Космическое знамение — Благо/Напасть, не Weal/Woe', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Звёзды 6',
      level: 6,
      order: 'warden',
      subclassSlug: SUB.stars,
      fury: 'primal_strike',
    })
    await openFeaturesScene(page, project)
    const card = await featureCard(page, /Космическое знамение/)
    await expandCard(card)
    await expect(card).toContainText(/Благо/)
    await expect(card).toContainText(/Напасть/)
    await expect(card).not.toContainText(/Weal|Woe|вред/)
    await fshot(page, 'stars-omen-card', project, { frame: card })

    await card.getByRole('button', { name: /^Бросок знамения$/ }).click()
    await expect(card).toContainText(/Знамение: (Благо|Напасть) \(к6=\d\)/)
    await expect(card).not.toContainText(/Weal|Woe/)
    await fshot(page, 'stars-omen-rolled', project, { frame: card })
    expect(store.unmatched).toEqual([])
  })

  for (const order of ['magician', 'warden'] as const) {
    test(`primal order card: ${order}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const { store } = await createAt(page, project, {
        name: order === 'magician' ? 'Ведун' : 'Страж',
        level: 3,
        order,
        subclassSlug: SUB.land,
        land: 'temperate',
        fury: 'primal_strike',
      })
      await openFeaturesScene(page, project)
      const card = await featureCard(page, /Природный орден/)
      await expandCard(card)
      const label = order === 'magician' ? /Ведун/ : /Страж/
      const other = order === 'magician' ? /Страж/ : /Ведун/
      await expect(card).toContainText(label)
      await expect(card).not.toContainText(/Выбери|не выбран|magician|warden/i)
      void other
      await fshot(page, `primal-order-card-${order === 'magician' ? 'vedun' : 'strazh'}`, project, {
        frame: card,
      })
      expect(store.unmatched).toEqual([])
    })
  }
})

test.describe('Доправка 1 — стартовое снаряжение, книга заклинаний Ведуна', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  test('starting gear: кожаный доспех даёт КД, щит и серп в инвентаре', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Снаряжение',
      level: 2,
      order: 'magician',
      subclassSlug: null,
      classEquipment: 'a',
    })
    const sheet = await storedSheet(store)
    const items = (sheet.inventory?.items ?? []) as Array<Record<string, any>>
    const leather = items.find((i) => /Кожан/.test(String(i.name)))
    expect(leather, 'кожаный доспех в инвентаре').toBeTruthy()
    expect(leather!.armor_kind ?? leather!.kind).toBeTruthy()
    expect(items.some((i) => /Щит/.test(String(i.name)))).toBe(true)
    expect(items.some((i) => /Серп/.test(String(i.name)))).toBe(true)
    expect(String(leather!.kind ?? '')).not.toBe('gear')

    await expandHeader(page, project)
    await fshot(page, 'starting-gear-header-ac', project, { top: true, frame: header(page) })

    await openExploreScene(page, project)
    for (const [slug, re, chip] of [
      ['leather', /Кожан/, 'Доспех'],
      ['shield', /Щит/, 'Щит'],
      ['sickle', /Серп/, 'Оружие'],
    ] as const) {
      const card = await openInventoryItem(page, re)
      await expect(card).toContainText(chip)
      await expect(card).not.toContainText('Предмет')
      await fshot(page, `starting-gear-${slug}`, project, { frame: card })
    }
    const leatherCard = await openInventoryItem(page, /Кожан/)
    await expect(leatherCard.locator('.inventory-equip').first()).toHaveClass(/is-on/)
    expect(store.unmatched).toEqual([])
  })

  test('spells panel: Ведун — заговоры 4/4 в классической книге заклинаний', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Ведун книга',
      level: 4,
      order: 'magician',
      subclassSlug: null,
    })
    await openSpellsPane(page, project)
    const budgetLine = page.getByText(/заговоры: Друид 4\/4/).first()
    await expect(budgetLine).toBeVisible({ timeout: 10_000 })
    await fshot(page, 'spells-panel-magician-cantrips-4-of-4-desk', project, { frame: budgetLine })

    await page.getByRole('button', { name: /^Магия$|^Книга$/ }).first().click()
    await page.getByRole('button', { name: /Выбрать заклинания/ }).click()
    const grimoire = page.getByRole('dialog').last()
    await expect(grimoire).toContainText(/Друид 4\/4/, { timeout: 10_000 })
    await expect(grimoire).not.toContainText(/Друид 4\/3/)
    await fshot(page, 'spells-panel-magician-cantrips-4-of-4-grimoire', project, { frame: grimoire })
    expect(store.unmatched).toEqual([])
  })
})

test.describe('Доправка 1 — понижение уровня на листе (−1)', () => {
  test.setTimeout(480_000)
  test.use({ actionTimeout: 15_000 })

  for (const [from, to] of [
    [20, 19],
    [10, 9],
    [3, 2],
  ] as const) {
    test(`level-down: ${from} → ${to}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const { store } = await createAt(page, project, {
        name: `Спад ${from}`,
        level: from,
        order: 'warden',
        subclassSlug: from >= 3 ? SUB.land : null,
        land: 'temperate',
        fury: 'primal_strike',
      })
      const druidLevel = async () =>
        Number(((await storedSheet(store)).classes ?? []).find((c: any) => /друид|druid/i.test(String(c.name ?? c.slug)))?.level)
      expect(await druidLevel()).toBe(from)

      const identity = await openIdentity(page)
      const minus = identity.getByRole('button', { name: '−1', exact: true }).first()
      await minus.scrollIntoViewIfNeeded()
      await expect(identity).toContainText(new RegExp(`(^|\\D)${from}(\\D|$)`))
      await fshot(page, `leveldown-sheet-${from}-to-${to}-before`, project, { frame: identity })
      await minus.click()
      await waitStored(store, () => true)
      await page.waitForTimeout(800)
      await minus.scrollIntoViewIfNeeded()
      await fshot(page, `leveldown-sheet-${from}-to-${to}-after`, project, { frame: identity })
      await identity.getByRole('button', { name: /^Готово$|^Закрыть$/ }).first().click()
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 })
      await waitStored(store, async () => true)
      await expect.poll(druidLevel, { timeout: 15_000 }).toBe(to)
      expect(store.unmatched).toEqual([])
    })
  }
})
