/**
 * P24-M02-druid live create / level-up / Wild Shape / rest evidence (no e2eSeed).
 *
 * Walks the real create wizard at `/characters/create?edition=2024&preview=1`
 * with API mocking (auth/catalog/create-2024 bridge) — infrastructure only.
 * Bestiary rows come from the repo 2024 SRD animals file.
 * Every major step is clicked; seed harness is NOT used as create evidence.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'
import fs from 'node:fs'
import { createStore, type HarnessStore } from './support/druid2024Harness'
import {
  ARTIFACTS,
  projectOf,
  isPhone,
  shot,
  tallShot,
  unclipForks,
  setupDialog,
  ensureSetupOpen,
  closeSetupDialog,
  next,
  selectCatalogCard,
  pickPrefixed,
  fillUnderfilledPicks,
  dismissWelcome,
  ensureMobileVitalsExpanded,
  openFeaturesScene,
  openIdentity,
  openRest,
  CANTRIPS,
  PREPARED,
  SUB,
  SHOT,
  pickSpellsToQuota,
  LiveDruidOpts,
  pickKnownForms,
  walkLiveDruidCreate,
  storedSheet,
  openCombatScene,
  openCompanionsScene,
  openExploreScene,
  featureCard,
  expectFeatureNames,
  expectNoFeatureNames,
  dismissGuided,
  expandCard,
  expandAllFeatures,
  openCardUse,
  cancelDialog,
  applyDialog,
  wisModOf,
  wildShapeFromSheet,
  armorHas,
  knownByLevel,
  preparedLeveled,
  readPreparedMax,
  waitStored,
  wildShapeCounter,
  enterWildShape,
  exitWildShape,
  openHeaderHp,
  liveLevelUp,
  addGearFromPicker,
  openInventoryItem,
  equipItem,
  scrollTop,
  expectVisibleNoRawIds,
  createAt,
} from './support/druidLiveFlow'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

/* ------------------------------------------------------------------ */
/* Create-at-5 / create-at-11                                          */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 druid — LIVE create (wizard clicked, no e2eSeed)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('create-live-at-5 warden/land: table, Wild Shape 2, Wild Resurgence, spell picker N of M', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveDruidCreate(page, store, {
      name: 'Живой Друид 5',
      level: 5,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'temperate',
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-`,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText('1×4 · 2×3 · 3×2')
        const list = pg.getByTestId('p24-m03c-fork-list-druid')
        await expect(list).toContainText('Дикий облик')
        await expect(list).toContainText('Дикое восстановление')
        await expect(list).toContainText(/Подкласс выбран/)
        await expect(list).not.toContainText('Ярость стихий')
        await expect(pg.getByTestId('p24-m03-spell-tab-cantrips')).toContainText('0/3')
        await expect(pg.getByTestId('p24-m03-spell-tab-level1')).toContainText('0/9')
        await pg.getByTestId('p24-m03-spell-tab-level1').click()
        await expect(pg.getByTestId('p24-m03-spell-pick-counter')).toContainText('Выбрано 0 из 9')
        await expect(pg.getByTestId('p24-m03-spell-pick-counter')).toContainText('круги 1–3')
        await expect(pg.getByTestId('p24-m03-card-dispel-magic')).toBeVisible()
        await expect(pg.getByTestId('p24-m03-card-blight')).toHaveCount(0)
        await pg.getByTestId('p24-m03-spell-pick-counter').scrollIntoViewIfNeeded()
        await tallShot(pg, ARTIFACTS, `${SHOT}-create-at-5-spell-picker-0-of-9`, project)
      },
    })
    const counter = page.getByTestId('p24-m03-spell-pick-counter')
    void counter
    expect(knownByLevel(sheet, 0)).toBe(3)
    expect(preparedLeveled(sheet)).toBeGreaterThanOrEqual(9)
    expect(sheet.spells?.slots?.['3']).toMatchObject({ max: 2 })
    expect(sheet.spells?.slots?.['4']?.max ?? 0).toBe(0)
    expect(sheet.class_options_2024?.primal_order).toBe('warden')
    expect(armorHas(sheet, 'medium')).toBe(true)
    expect(armorHas(sheet, 'heavy')).toBe(false)
    expect(sheet.proficiency?.weapons?.martial).toBe(true)
    expect(sheet.weapon_mastery?.picks ?? sheet.weapon_mastery?.ids ?? []).toEqual([])
    // Dwarven Toughness: d8 avg 5 + CON 3 + 1 per level = 8 + 4*(5+3) + 5 = 48
    expect(Number(store.characters.values().next().value!.hp_max)).toBe(48)

    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /^Сотворение заклинаний/,
      /^Друидический язык/,
      /^Природный орден/,
      /^Дикий облик/,
      /^Дикий спутник/,
      /^Дикое восстановление/,
      /^Заклинания круга земли/,
      /^Помощь земли/,
    ])
    await expectNoFeatureNames(page, [/^Ярость стихий/, /^Естественное восстановление/])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-features`, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 2, max: 2 })
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-wild-shape-2of2`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-11 magician/moon: table, Wild Shape 3, Elemental Fury, 6th circle', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveDruidCreate(page, store, {
      name: 'Живой Друид 11',
      level: 11,
      order: 'magician',
      subclassSlug: SUB.moon,
      fury: 'primal_strike',
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-11-`,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText('1×4 · 2×3 · 3×3 · 4×3 · 5×2 · 6×1')
        const list = pg.getByTestId('p24-m03c-fork-list-druid')
        await expect(list).toContainText('Ярость стихий')
        await expect(list).toContainText('Шаг в лунный свет')
        await expect(list).not.toContainText('Улучшенная ярость стихий')
        await expect(pg.getByTestId('p24-m03-spell-tab-cantrips')).toContainText('0/5')
        await expect(pg.getByTestId('p24-m03-spell-tab-level1')).toContainText('0/16')
        await pg.getByTestId('p24-m03-spell-tab-level1').click()
        await expect(pg.getByTestId('p24-m03-spell-pick-counter')).toContainText('Выбрано 0 из 16')
        await expect(pg.getByTestId('p24-m03-spell-pick-counter')).toContainText('круги 1–6')
        await expect(pg.getByTestId('p24-m03-card-heal')).toBeVisible()
        await expect(pg.getByTestId('p24-m03-card-fire-storm')).toHaveCount(0)
        await pg.getByTestId('p24-m03-spell-pick-counter').scrollIntoViewIfNeeded()
        await tallShot(pg, ARTIFACTS, `${SHOT}-create-at-11-spell-picker-0-of-16`, project)
      },
    })
    expect(knownByLevel(sheet, 0)).toBe(5)
    expect(preparedLeveled(sheet)).toBeGreaterThanOrEqual(16)
    expect(sheet.class_options_2024).toMatchObject({ primal_order: 'magician', elemental_fury: 'primal_strike' })
    expect(sheet.spells?.slots?.['6']).toMatchObject({ max: 1 })
    expect(sheet.spells?.slots?.['7']?.max ?? 0).toBe(0)
    expect(armorHas(sheet, 'medium')).toBe(false)
    expect(sheet.proficiency?.weapons?.martial).not.toBe(true)

    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /^Ярость стихий/,
      /^Шаг в лунный свет/,
      /^Улучшенные облики Круга/,
      /^Заклинания Круга луны/,
    ])
    await expectNoFeatureNames(page, [
      /^Улучшенная ярость стихий/,
      /^Заклинания зверя/,
      /^Лунный облик/,
      /^Архидруид/,
    ])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-features`, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 3, max: 3 })
    const fury = await featureCard(page, /^Ярость стихий/)
    await expandCard(fury)
    await expect(fury).toContainText(/Природный удар/)
    await expect(fury).toContainText(/1к8/)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-elemental-fury`, project)
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Primal Order                                                        */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 druid — Primal Order (Ведун / Страж)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('Страж L5: средние доспехи и воинское оружие реально работают (чешуйчатый доспех + длинный меч)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Страж 5',
      level: 5,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'arid',
    })
    expect(armorHas(sheet, 'medium')).toBe(true)
    expect(sheet.proficiency?.weapons?.martial).toBe(true)
    expect(armorHas(sheet, 'heavy')).toBe(false)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-warden-sheet-before-gear`, project)

    await addGearFromPicker(page, project, 'Чешуйчатый', /^Чешуйчатый доспех/)
    await addGearFromPicker(page, project, 'Длинный меч', /^Длинный меч/)
    await openExploreScene(page, project)
    await equipItem(page, /Чешуйчатый доспех/)
    await equipItem(page, /Длинный меч/)
    await page.getByRole('tablist', { name: 'Фильтр инвентаря' }).getByText('Надето', { exact: true }).click()
    await page.waitForTimeout(400)
    await expect(page.locator('.inventory-card').filter({ hasText: /Чешуйчатый доспех/ }).first()).toBeVisible()
    await page.mouse.move(2, 2)
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-warden-medium-armor-equipped`, project)
    await scrollTop(page)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    // Scale mail 14 + DEX (max +2) + the starting shield (+2), not unarmored 10+DEX.
    const dexMod = Math.floor((Number(sheet.abilities?.dex?.score) - 10) / 2)
    await expect(page.getByText(new RegExp(`^КД ${14 + Math.min(2, dexMod) + 2}$`)).first()).toBeVisible({ timeout: 10_000 })
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-warden-ac-header`, project)

    await openCombatScene(page, project)
    const str = Math.floor((Number(sheet.abilities?.str?.score) - 10) / 2)
    const sword = page.locator('[class*="attack"]').filter({ hasText: /Длинный меч/ }).first()
    await expect(sword).toBeVisible({ timeout: 10_000 })
    await expect(sword.locator('button').filter({ hasText: /^[+-]\d+$/ }).first()).toHaveText(
      `${str + 3 >= 0 ? '+' : ''}${str + 3}`,
    )
    await expect(sword).toContainText(/рубящий/)
    await expect(sword).not.toContainText(/\bslashing\b/i)
    await sword.scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-warden-martial-weapon-attack`, project)
    expect(store.unmatched).toEqual([])
  })

  test('Ведун L5: 4 заговора (3+1), Природа и Тайная магия получают бонус Мудрости; средних доспехов нет', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Ведун 5',
      level: 5,
      order: 'magician',
      subclassSlug: SUB.land,
      land: 'polar',
      stepShots: true,
      shotPrefix: `${SHOT}-primal-order-magician-`,
    })
    expect(knownByLevel(sheet, 0)).toBe(4)
    expect(armorHas(sheet, 'medium')).toBe(false)
    expect(sheet.proficiency?.weapons?.martial).not.toBe(true)
    const wis = wisModOf(sheet)
    const pb = 3
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-magician-sheet`, project)

    const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
    if (isPhone(project)) {
      await page.getByRole('button', { name: /Характеристики|Хар\./ }).first().click().catch(() => {})
    }
    await page.getByRole('button', { name: /Развернуть все/ }).locator('visible=true').first().click()
    await page.waitForTimeout(400)
    const intScore = Number(
      await page.locator('.abil-block:visible').filter({ hasText: /Интеллект/ }).first().locator('input').first().inputValue(),
    )
    const intMod = Math.floor((intScore - 10) / 2)
    const natureTotal = intMod + pb + Math.max(1, wis)
    const arcanaTotal = intMod + Math.max(1, wis)
    const rollOf = async (label: string) => {
      const row = page.locator('.abil-skill:visible').filter({ hasText: new RegExp(`^\\s*${label}`) }).first()
      await row.scrollIntoViewIfNeeded()
      return (await row.locator('.abil-skill__roll').innerText()).replace(/\s+/g, '')
    }
    expect(await rollOf('Природа')).toContain(sign(natureTotal))
    expect(await rollOf('Магия')).toContain(sign(arcanaTotal))
    await page.locator('.abil-skill:visible').filter({ hasText: /^\s*Природа/ }).first().scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-magician-skills-explore`, project)
    if (isPhone(project)) await page.locator('button:visible', { hasText: '←' }).first().click()
    expect(await readPreparedMax(page, project)).toBe(9)
    await expect(page.getByText(/заговоры: Друид 4\/4/).first()).toBeVisible({ timeout: 10_000 })
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-magician-cantrips-4of4-combat`, project)
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Wild Shape: enter / exit / rests                                    */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 druid — Wild Shape on the sheet', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('land L5: enter Волк (own HP kept, temp HP = 5), exit clears temp HP', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Облик 5',
      level: 5,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'temperate',
    })
    const hpMax = Number(store.characters.values().next().value!.hp_max)
    expect(hpMax).toBe(48)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-wild-shape-land-5-before-form`, project)

    await enterWildShape(page, project, {
      query: 'Волк',
      name: /^Волк · CR 1\/4/,
      shotPrefix: `${SHOT}-wild-shape-land-5-wolf`,
    })
    await waitStored(store, (s) => (s.combat?.hp_temp ?? 0) === 5)
    const inForm = await storedSheet(store)
    expect(inForm.combat.hp_current).toBe(hpMax)
    expect(inForm.combat.hp_max).toBe(hpMax)
    const form = (inForm.companions ?? []).find((c: any) => c.role === 'self_form' && c.active)
    expect(form).toBeTruthy()
    expect(form.stats.hp ?? null).toBeNull()
    expect(wildShapeFromSheet(inForm)?.used).toBe(1)
    expect(String(form.notes)).toContain('свои хиты сохраняются')

    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await expect(page.getByText(new RegExp(`вр\\. ?\\+?5|врем\\. ?\\+5`)).first()).toBeVisible({ timeout: 10_000 })
    await page.mouse.move(2, 2)
    await shot(page, ARTIFACTS, `${SHOT}-wild-shape-land-5-wolf-header-own-hp-temp-hp`, project)
    await openFeaturesScene(page, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 1, max: 2 })
    await shot(page, ARTIFACTS, `${SHOT}-wild-shape-land-5-wolf-pool-1of2`, project)

    await openCompanionsScene(page, project)
    const row = page.getByRole('button', { name: /Волк/ }).first()
    await row.click()
    await page.waitForTimeout(500)
    await expect(page.getByText(/свои хиты сохраняются/).first()).toBeVisible()
    await tallShot(page, ARTIFACTS, `${SHOT}-wild-shape-land-5-wolf-form-card`, project)

    await exitWildShape(page, project, /Волк/)
    await waitStored(store, (s) => (s.combat?.hp_temp ?? 0) === 0 && !(s.companions ?? []).some((c: any) => c.active && c.role === 'self_form'))
    const after = await storedSheet(store)
    expect(after.combat.hp_current).toBe(hpMax)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await page.mouse.move(2, 2)
    await shot(page, ARTIFACTS, `${SHOT}-wild-shape-land-5-after-exit-header`, project)
    await openFeaturesScene(page, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 1, max: 2 })
    void sheet
    expect(store.unmatched).toEqual([])
  })

  test('moon L6: CR cap 2, temp HP = 18 (level × 3), AC = 13 + Wis', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Луна 6',
      level: 6,
      order: 'warden',
      subclassSlug: SUB.moon,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Облики Круга/])
    await expect(page.getByRole('button', { name: /Облики Круга.*CR 2, плавание/ }).first()).toBeVisible()
    await tallShot(page, ARTIFACTS, `${SHOT}-wild-shape-moon-6-features-cr2`, project)
    await enterWildShape(page, project, {
      query: 'Волк',
      name: /^Волк · CR 1\/4/,
      shotPrefix: `${SHOT}-wild-shape-moon-6-wolf`,
    })
    await waitStored(store, (s) => (s.combat?.hp_temp ?? 0) === 18)
    const inForm = await storedSheet(store)
    const wis = wisModOf(inForm)
    const form = (inForm.companions ?? []).find((c: any) => c.role === 'self_form' && c.active)
    expect(form.stats.ac).toBe(Math.max(12, 13 + wis))
    expect(inForm.combat.hp_current).toBe(inForm.combat.hp_max)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await page.mouse.move(2, 2)
    await shot(page, ARTIFACTS, `${SHOT}-wild-shape-moon-6-wolf-header-temp-hp-18`, project)
    await openCompanionsScene(page, project)
    await page.getByRole('button', { name: /Волк/ }).first().click()
    await page.waitForTimeout(500)
    await tallShot(page, ARTIFACTS, `${SHOT}-wild-shape-moon-6-wolf-form-card-ac`, project)
    expect(store.unmatched).toEqual([])
  })
})

test.describe('P24-M02 druid — Wild Shape rests (+1 short, all long)', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  test('short rest returns exactly 1 use; long rest returns all', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Отдых Друида',
      level: 6,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'temperate',
    })
    await openFeaturesScene(page, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 3, max: 3 })
    await enterWildShape(page, project, { query: 'Волк', name: /^Волк · CR 1\/4/ })
    await enterWildShape(page, project, { query: 'Бабуин', name: /^Бабуин · CR 0/ })
    await enterWildShape(page, project, { query: 'Барсук', name: /^Барсук · CR 0/ })
    await openFeaturesScene(page, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 0, max: 3 })
    await shot(page, ARTIFACTS, `${SHOT}-rest-wild-shape-0of3-before-short`, project)

    await openRest(page, project)
    const rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).first()
    await shot(page, ARTIFACTS, `${SHOT}-rest-short-dialog`, project)
    await rest.getByRole('button', { name: /Сброс коротких ресурсов/ }).click()
    await page.waitForTimeout(500)
    await expect(rest).toContainText(/Дикий облик:\s*0\s*→\s*1/)
    await shot(page, ARTIFACTS, `${SHOT}-rest-short-summary-wild-shape-0-to-1`, project)
    await rest.getByRole('button', { name: /^Применить$/ }).click()
    await page.waitForTimeout(500)
    const closeBtn = page.getByRole('dialog').last().getByRole('button', { name: /^Закрыть$/ })
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click()
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 1, max: 3 })
    await shot(page, ARTIFACTS, `${SHOT}-rest-wild-shape-1of3-after-short`, project)

    await openRest(page, project)
    const rest2 = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).last()
    await rest2.getByText(/^Продолжительный$/).first().click()
    await page.waitForTimeout(400)
    await shot(page, ARTIFACTS, `${SHOT}-rest-long-dialog`, project)
    await rest2.getByRole('button', { name: /Сводка и применение/ }).click()
    await page.waitForTimeout(500)
    await expect(rest2).toContainText(/Дикий облик:\s*1\s*→\s*3/)
    await shot(page, ARTIFACTS, `${SHOT}-rest-long-summary-wild-shape-1-to-3`, project)
    const apply = rest2.getByRole('button', { name: /^Применить$/ })
    await apply.scrollIntoViewIfNeeded()
    await apply.click()
    await page.waitForTimeout(600)
    const close2 = page.getByRole('dialog').last().getByRole('button', { name: /^Закрыть$/ })
    if (await close2.isVisible().catch(() => false)) await close2.click()
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 3, max: 3 })
    await shot(page, ARTIFACTS, `${SHOT}-rest-wild-shape-3of3-after-long`, project)
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Elemental Fury                                                      */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 druid — Elemental Fury formulas', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  async function longswordAttack(page: Page, project: string) {
    await addGearFromPicker(page, project, 'Длинный меч', /^Длинный меч/)
    await openExploreScene(page, project)
    await equipItem(page, /Длинный меч/)
    await openCombatScene(page, project)
    if (!isPhone(project)) {
      const hide = page.getByRole('button', { name: /^магия$/ }).first()
      if (await hide.isVisible().catch(() => false)) await hide.click()
      await page.waitForTimeout(400)
    }
    const attack = page.locator('[class*="attack"]').filter({ hasText: /Длинный меч/ }).first()
    await expect(attack).toBeVisible({ timeout: 10_000 })
    await attack.scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    return attack
  }

  for (const lvl of [7, 15] as const) {
    test(`Природный удар L${lvl}: ${lvl === 7 ? '1к8' : '2к8'} на атаке оружием и карточка`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const dice = lvl === 7 ? '1к8' : '2к8'
      const { store, sheet } = await createAt(page, project, {
        name: `Удар ${lvl}`,
        level: lvl,
        order: 'warden',
        subclassSlug: SUB.stars,
        fury: 'primal_strike',
      })
      expect(sheet.class_options_2024?.elemental_fury).toBe('primal_strike')
      const attack = await longswordAttack(page, project)
      await expect(attack).toContainText(new RegExp(`${dice} холодом, огнём, электричеством или звуком, раз в ход`))
      await shot(page, ARTIFACTS, `${SHOT}-elemental-fury-primal-strike-${lvl}-weapon`, project)
      await openFeaturesScene(page, project)
      await expandAllFeatures(page)
      const fury = await featureCard(page, /^Ярость стихий/)
      await expandCard(fury)
      await expect(fury).toContainText(new RegExp(dice))
      if (lvl === 15) {
        await expectFeatureNames(page, [/^Улучшенная ярость стихий/])
        await expect(
          page.locator('.feature-card__name, .feature-card__title').filter({ hasText: /^Ярость стихий/ }),
        ).toHaveCount(1)
      }
      await expectVisibleNoRawIds(page)
      await tallShot(page, ARTIFACTS, `${SHOT}-elemental-fury-primal-strike-${lvl}-features`, project)
      expect(store.unmatched).toEqual([])
    })
  }

  for (const lvl of [7, 15] as const) {
    test(`Мощные заклинания L${lvl}: + Мудрость к заговору${lvl === 15 ? ', дистанция +300 фт' : ''}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const { store, sheet } = await createAt(page, project, {
        name: `Мощные ${lvl}`,
        level: lvl,
        order: 'magician',
        subclassSlug: SUB.stars,
        fury: 'potent_spellcasting',
      })
      expect(sheet.class_options_2024?.elemental_fury).toBe('potent_spellcasting')
      const wis = wisModOf(sheet)
      const dice = lvl >= 11 ? 3 : 2
      await openCombatScene(page, project)
      if (isPhone(project)) {
        await page
          .locator(':is(button,[role=tab],[role=button]):visible', { hasText: /^Заклинания$/ })
          .first()
          .click()
        await page.waitForTimeout(500)
      }
      const row = page.locator('.spell-card').filter({ hasText: /Сотворение пламени/ }).first()
      await expect(row).toBeVisible({ timeout: 10_000 })
      await row.scrollIntoViewIfNeeded()
      await page.mouse.move(2, 2)
      await shot(page, ARTIFACTS, `${SHOT}-elemental-fury-potent-${lvl}-produce-flame-row`, project)
      await row.getByRole('button', { name: /^Каст$/i }).click()
      const dlg = page.getByRole('dialog').last()
      await expect(dlg).toBeVisible({ timeout: 10_000 })
      await expect(dlg).toContainText(new RegExp(`${dice}[dк]8\\+${wis}`))
      await shot(page, ARTIFACTS, `${SHOT}-elemental-fury-potent-${lvl}-cast-dialog`, project)
      await dlg.getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click()

      await openFeaturesScene(page, project)
      await expandAllFeatures(page)
      const card = await featureCard(page, /^Ярость стихий/)
      await expandCard(card)
      await expect(card).toContainText(/Мощные заклинания/)
      if (lvl === 15) {
        await expectFeatureNames(page, [/^Улучшенная ярость стихий/])
        const improved = await featureCard(page, /^Улучшенная ярость стихий/)
        await expandCard(improved)
        await expect(improved).toContainText(/300/)
      }
      await expectVisibleNoRawIds(page)
      await tallShot(page, ARTIFACTS, `${SHOT}-elemental-fury-potent-${lvl}-features`, project)
      expect(store.unmatched).toEqual([])
    })
  }
})

/* ------------------------------------------------------------------ */
/* Level-up (create wizard → sheet → +1 уровень)                       */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 druid — LIVE level-up', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('levelup-live 4→5: Дикое восстановление, 3rd-circle slots, prep 7→9', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Прокачка 4→5',
      level: 4,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'temperate',
    })
    expect(await readPreparedMax(page, project)).toBe(7)
    expect(sheet.spells?.slots?.['3']?.max ?? 0).toBe(0)
    await liveLevelUp(page, project, `${SHOT}-levelup-4to5`, {
      expectUpcoming: [/Дикое восстановление/],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 5)
    const after = await storedSheet(store)
    expect(after.spells?.slots?.['3']).toMatchObject({ max: 2 })
    expect(await readPreparedMax(page, project)).toBe(9)
    expect(knownByLevel(after, 0)).toBe(3)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Дикое восстановление/, /^Дикий облик/])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-4to5-sheet-features`, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 2, max: 2 })
    expect(store.unmatched).toEqual([])
  })

  test('levelup-live 10→11: 6th-circle slot, prep 15→16, Wild Shape stays 3', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Прокачка 10→11',
      level: 10,
      order: 'warden',
      subclassSlug: SUB.moon,
      fury: 'primal_strike',
    })
    expect(sheet.spells?.slots?.['6']?.max ?? 0).toBe(0)
    expect(await readPreparedMax(page, project)).toBe(15)
    await liveLevelUp(page, project, `${SHOT}-levelup-10to11`, { expectNoUpcoming: true })
    await waitStored(store, (s) => s.classes?.[0]?.level === 11)
    const after = await storedSheet(store)
    expect(after.spells?.slots?.['6']).toMatchObject({ max: 1 })
    expect(await readPreparedMax(page, project)).toBe(16)
    expect(knownByLevel(after, 0)).toBe(4)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Шаг в лунный свет/, /^Ярость стихий/])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-10to11-sheet-features`, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 3, max: 3 })
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Rollback in the wizard                                              */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 druid — level down in create wizard (rollback UI)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  const STEPS = [
    {
      name: 'rollback-3to2',
      from: 3,
      to: 2,
      sub: SUB.land,
      before: { slots: '1×4 · 2×2', has: /Подкласс выбран/ },
      after: { slots: '1×3', hasNot: /Подкласс/ },
    },
    {
      name: 'rollback-10to9',
      from: 10,
      to: 9,
      sub: SUB.moon,
      before: { slots: '5×2', has: /Шаг в лунный свет/ },
      after: { slots: '5×1', hasNot: /Шаг в лунный свет/ },
    },
    {
      name: 'rollback-20to19',
      from: 20,
      to: 19,
      sub: SUB.stars,
      before: { slots: '7×2', has: /Архидруид/ },
      after: { slots: '7×1', hasNot: /Архидруид/ },
    },
  ] as const

  for (const spec of STEPS) {
    test(spec.name, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await walkLiveDruidCreate(page, store, {
        name: spec.name,
        level: spec.from,
        subclassSlug: spec.sub,
        shotDir: ARTIFACTS,
        project,
        stopAfterForks: true,
      })
      const list = page.getByTestId('p24-m03c-fork-list-druid')
      await expect(page.getByTestId('p24-m03c-slots')).toContainText(spec.before.slots)
      await expect(list).toContainText(spec.before.has)
      await page.getByTestId('p24-m03c-forks-druid').scrollIntoViewIfNeeded()
      await unclipForks(page)
      await tallShot(page, ARTIFACTS, `${SHOT}-${spec.name}-before-L${spec.from}`, project)

      const levelInput = page.getByTestId('p24-m03c-level-druid')
      await levelInput.scrollIntoViewIfNeeded()
      await levelInput.fill(String(spec.to))
      await levelInput.blur()
      await expect(levelInput).toHaveValue(String(spec.to))
      const forks = page.getByTestId('p24-m03c-forks-druid')
      await forks.scrollIntoViewIfNeeded()
      if (!(await list.isVisible().catch(() => false))) await forks.click()
      await expect(list).toBeVisible()
      await expect(page.getByTestId('p24-m03c-slots')).toContainText(spec.after.slots)
      await expect(list).not.toContainText(spec.after.hasNot)
      await unclipForks(page)
      await tallShot(page, ARTIFACTS, `${SHOT}-${spec.name}-after-L${spec.to}`, project)
    })
  }
})

/* ------------------------------------------------------------------ */
/* Four PHB circles at 3 / 6 / 10 / 14                                 */
/* ------------------------------------------------------------------ */

type CircleKey = 'land' | 'moon' | 'sea' | 'stars'
type CircleCase = {
  key: CircleKey
  nameRu: string
  names: Record<3 | 6 | 10 | 14, RegExp[]>
  terrain?: Record<3 | 6 | 10 | 14, 'arid' | 'polar' | 'temperate' | 'tropical'>
  use?: Partial<Record<3 | 6 | 10 | 14, { card: RegExp; button: RegExp; text: (wis: number) => RegExp }>>
}

const CIRCLES: CircleCase[] = [
  {
    key: 'land',
    nameRu: 'Круг земли',
    terrain: { 3: 'arid', 6: 'polar', 10: 'temperate', 14: 'tropical' },
    names: {
      3: [/^Заклинания круга земли/, /^Помощь земли/],
      6: [/^Естественное восстановление/],
      10: [/^Покровительство природы/],
      14: [/^Природное убежище/],
    },
    use: {
      3: { card: /^Помощь земли/, button: /Помощь земли…/, text: () => /2к6/ },
      6: { card: /^Помощь земли/, button: /Помощь земли…/, text: () => /2к6/ },
      10: { card: /^Помощь земли/, button: /Помощь земли…/, text: () => /3к6/ },
      14: { card: /^Помощь земли/, button: /Помощь земли…/, text: () => /4к6/ },
    },
  },
  {
    key: 'moon',
    nameRu: 'Круг луны',
    names: {
      3: [/^Заклинания Круга луны/, /^Облики Круга/],
      6: [/^Улучшенные облики Круга/],
      10: [/^Шаг в лунный свет/],
      14: [/^Лунный облик/],
    },
  },
  {
    key: 'sea',
    nameRu: 'Круг моря',
    names: {
      3: [/^Заклинания круга моря/, /^Гнев морей/],
      6: [/^Связь с водами/],
      10: [/^Рождённый бурей/],
      14: [/^Дар океана/],
    },
    use: {
      3: { card: /^Гнев морей/, button: /Гнев морей…/, text: (w) => new RegExp(`${Math.max(1, w)}к6`) },
      6: { card: /^Гнев морей/, button: /Гнев морей…/, text: (w) => new RegExp(`${Math.max(1, w)}к6`) },
      10: { card: /^Гнев морей/, button: /Гнев морей…/, text: (w) => new RegExp(`${Math.max(1, w)}к6`) },
      14: { card: /^Гнев морей/, button: /Гнев морей…/, text: (w) => new RegExp(`${Math.max(1, w)}к6`) },
    },
  },
  {
    key: 'stars',
    nameRu: 'Круг звёзд',
    names: {
      3: [/^Звёздная карта/, /^Звёздный облик/],
      6: [/^Космическое знамение/],
      10: [/^Мерцающие созвездия/],
      14: [/^Звёздное тело/],
    },
    use: {
      3: { card: /^Звёздный облик/, button: /Звёздный облик…/, text: (w) => new RegExp(`1к8\\+${w}`) },
      6: { card: /^Звёздный облик/, button: /Звёздный облик…/, text: (w) => new RegExp(`1к8\\+${w}`) },
      10: { card: /^Звёздный облик/, button: /Звёздный облик…/, text: (w) => new RegExp(`2к8\\+${w}`) },
      14: { card: /^Звёздный облик/, button: /Звёздный облик…/, text: (w) => new RegExp(`2к8\\+${w}`) },
    },
  },
]

test.describe('P24-M02 druid — four PHB circles via LIVE create (L3 / L6 / L10 / L14)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  for (const circle of CIRCLES) {
    for (const level of [3, 6, 10, 14] as const) {
      test(`2024-druid-${circle.key}-${String(level).padStart(2, '0')}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const { store, sheet } = await createAt(page, project, {
          name: `${circle.key} L${level}`,
          level,
          order: level % 2 === 0 ? 'warden' : 'magician',
          subclassSlug: SUB[circle.key],
          land: circle.terrain?.[level],
          fury: 'primal_strike',
        })
        const wis = wisModOf(sheet)
        await openFeaturesScene(page, project)
        const expected = ([3, 6, 10, 14] as const)
          .filter((lv) => lv <= level)
          .flatMap((lv) => circle.names[lv])
        await expectFeatureNames(page, expected)
        const later = ([3, 6, 10, 14] as const)
          .filter((lv) => lv > level)
          .flatMap((lv) => circle.names[lv])
        await expectNoFeatureNames(page, later)
        await expandAllFeatures(page)
        await expectVisibleNoRawIds(page)

        const use = circle.use?.[level]
        if (use) {
          const dlg = await openCardUse(page, use.card, use.button)
          await expect(dlg).toContainText(use.text(wis))
          await shot(page, ARTIFACTS, `${SHOT}-${circle.key}-${String(level).padStart(2, '0')}-use-dialog`, project)
          await cancelDialog(page, dlg)
        }
        if (circle.key === 'land') {
          const terrain = circle.terrain![level]
          const spells = await featureCard(page, /^Заклинания круга земли/)
          await expandCard(spells)
          await expect(spells).toContainText(
            { arid: 'Засушливая', polar: 'Полярная', temperate: 'Умеренная', tropical: 'Тропическая' }[terrain],
          )
        }
        await tallShot(page, ARTIFACTS, `${SHOT}-${circle.key}-${String(level).padStart(2, '0')}`, project)
        expect(store.unmatched).toEqual([])
      })
    }
  }
})
