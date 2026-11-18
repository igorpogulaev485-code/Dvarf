/**
 * P24-M02-artificer live create / features (wizard + mocked API).
 */
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { createStore } from './support/artificer2024Harness'
import {
  ARTIFACTS,
  SHOT,
  SUB,
  createAt,
  expandAllFeatures,
  expandCard,
  expectFeatureNames,
  expectNoFeatureNames,
  featureCard,
  flashOfGeniusFromSheet,
  isPhone,
  liveLevelDown,
  liveLevelUp,
  magicOfMakingFromSheet,
  openFeaturesScene,
  projectOf,
  shot,
  spellStoringFromSheet,
  tallShot,
  waitStored,
  walkLiveArtificerCreate,
} from './support/artificerLiveFlow'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

const MAGIC_OF_MAKING = /^Магия вещей$/
const MENDING = /Починка/
const SPELLCASTING = /^Сотворение заклинаний/
const REPLICATE = /^Реплики магических предметов$/
const FLASH = /^Вспышка гениальности$/
const ADEPT = /^Адепт магических предметов$/
const SPELL_STORING = /^Предмет, хранящий заклинание$/
const SOUL = /^Душа творения$/
const EPIC = /^Эпический дар$/
/** Magic Item Tinker surfaces as two resource cards on the sheet. */
const TINKER = /Вытягивание энергии|Преобразование реплики|Магический мастеровой/
const EXPERIMENTAL = /^Экспериментальный эликсир$/
const ARCANE_ARMOR = /^Арканный доспех$/
const ELDRITCH_CANNON = /^Мистическая пушка$/
const STEEL_DEFENDER = /^Стальной защитник$/
const ATLAS = /^Атлас приключений$/

test.describe('P24-M02 artificer — LIVE create', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('create-live-at-1: Магия вещей + Сотворение + Починка; no subclass / replicate', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveArtificerCreate(page, store, {
      name: 'Артефактор 1',
      level: 1,
      subclassSlug: null,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-1-`,
      duringLeveling: async (pg) => {
        // L1 has no inline fork rows (no mastery); assert level UI instead.
        await expect(pg.getByTestId('p24-m03c-level-artificer')).toHaveValue('1')
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText(/1×2/)
        await expect(pg.getByTestId('p24-m03c-fork-list-artificer')).toHaveCount(0)
        await expect(pg.getByTestId(`p24-m03c-subclass-${SUB.alchemist}`)).toHaveCount(0)
      },
    })
    expect(magicOfMakingFromSheet(sheet)?.max).toBeGreaterThanOrEqual(1)
    expect(flashOfGeniusFromSheet(sheet)).toBeUndefined()

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [MAGIC_OF_MAKING, SPELLCASTING, MENDING])
    await expectNoFeatureNames(page, [REPLICATE, FLASH, EXPERIMENTAL, ARCANE_ARMOR])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-5 alchemist: replicate + elixir; no flash/soul', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveArtificerCreate(page, store, {
      name: 'Живой Артефактор 5',
      level: 5,
      subclassSlug: SUB.alchemist,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-`,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText(/1×4 · 2×2|1×4/)
        const list = pg.getByTestId('p24-m03c-fork-list-artificer')
        await expect(list).toBeVisible()
        await expect(list).toContainText(/Подкласс|Алхимик|Реплик/)
        await expect(list).not.toContainText(/Душа творения/)
      },
    })
    expect(sheet.spells?.slots?.['2']).toMatchObject({ max: 2 })
    expect(magicOfMakingFromSheet(sheet)?.max).toBeGreaterThanOrEqual(1)
    expect(flashOfGeniusFromSheet(sheet)).toBeUndefined()

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [MAGIC_OF_MAKING, SPELLCASTING, REPLICATE, EXPERIMENTAL])
    await expectNoFeatureNames(page, [FLASH, ADEPT, SPELL_STORING, SOUL])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-alchemist-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-11 alchemist: flash + adept + spell-storing', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveArtificerCreate(page, store, {
      name: 'Живой Артефактор 11',
      level: 11,
      subclassSlug: SUB.alchemist,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-11-alchemist-`,
    })
    const sheet = store.createdSheet as Record<string, any>
    expect((flashOfGeniusFromSheet(sheet)?.max ?? 0)).toBeGreaterThanOrEqual(1)
    expect((spellStoringFromSheet(sheet)?.max ?? 0)).toBeGreaterThanOrEqual(2)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [FLASH, SPELL_STORING, TINKER, REPLICATE])
    // Adept may be listed as a passive card further down the rail.
    await expect(page.getByText(ADEPT).or(page.getByText(/Адепт магических/i)).first()).toBeVisible({
      timeout: 15_000,
    })
    await expectNoFeatureNames(page, [SOUL])
    await expandAllFeatures(page)
    const flash = await featureCard(page, FLASH)
    await expandCard(flash)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-alchemist-features`, project)
    expect(store.unmatched).toEqual([])
  })
})

test.describe('P24-M02 artificer — subclasses @5', () => {
  test.setTimeout(240_000)

  test('create-at-5 armorer: Арканный доспех (+ dreadnaught if chip)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Бронник 5',
      level: 5,
      subclassSlug: SUB.armorer,
      armorModel: 'dreadnaught',
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [ARCANE_ARMOR, MAGIC_OF_MAKING, REPLICATE])
    await expect(page.getByText(/Модель доспеха|Дредноут|Арканный/i).first()).toBeVisible()
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-armorer-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-at-5 artillerist: Мистическая пушка', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    await createAt(page, project, {
      name: 'Артиллерист 5',
      level: 5,
      subclassSlug: SUB.artillerist,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [ELDRITCH_CANNON, MAGIC_OF_MAKING])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-artillerist-features`, project)
  })

  test('create-at-5 battle-smith: Стальной защитник', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    await createAt(page, project, {
      name: 'Боевой кузнец 5',
      level: 5,
      subclassSlug: SUB.battleSmith,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [STEEL_DEFENDER, MAGIC_OF_MAKING])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-battle-smith-features`, project)
  })

  test('create-at-5 cartographer: Атлас приключений', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    await createAt(page, project, {
      name: 'Картограф 5',
      level: 5,
      subclassSlug: SUB.cartographer,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [ATLAS, MAGIC_OF_MAKING])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-cartographer-features`, project)
  })
})

test.describe('P24-M02 artificer — level-up / level-down', () => {
  test.setTimeout(360_000)

  test('levelup-live 4→5: subclass feature', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Прокачка 4→5',
      level: 4,
      subclassSlug: SUB.alchemist,
    })
    expect(sheet.classes?.[0]?.level).toBe(4)
    await liveLevelUp(page, project, `${SHOT}-levelup-4to5`, {
      expectUpcoming: [/Умение подкласса|Знаток алхимии|Учёный-алхимик|Алхим/i],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 5)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [MAGIC_OF_MAKING, REPLICATE])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-4to5-sheet-features`, project)
  })

  test('levelup-live 10→11: spell-storing', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Прокачка 10→11',
      level: 10,
      subclassSlug: SUB.alchemist,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [FLASH, ADEPT])
    await liveLevelUp(page, project, `${SHOT}-levelup-10to11`, {
      expectUpcoming: [SPELL_STORING],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 11)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [SPELL_STORING, FLASH])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-10to11-sheet-features`, project)
  })

  test('leveldown-live 20→19: Душа творения gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Откат 20→19',
      level: 20,
      subclassSlug: SUB.alchemist,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [SOUL, EPIC])
    await liveLevelDown(page, project, `${SHOT}-leveldown-20to19`, { from: 20, to: 19 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 19)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [SOUL])
    await expectFeatureNames(page, [EPIC, FLASH])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-20to19-sheet-after`, project)
  })

  test('leveldown-live 11→10: spell-storing gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Откат 11→10',
      level: 11,
      subclassSlug: SUB.alchemist,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [SPELL_STORING])
    await liveLevelDown(page, project, `${SHOT}-leveldown-11to10`, { from: 11, to: 10 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 10)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [SPELL_STORING])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-11to10-sheet-after`, project)
  })

  test('leveldown-live 3→2: subclass gone, replicate remains', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Откат 3→2',
      level: 3,
      subclassSlug: SUB.alchemist,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [EXPERIMENTAL, REPLICATE])
    await liveLevelDown(page, project, `${SHOT}-leveldown-3to2`, { from: 3, to: 2 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 2)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [EXPERIMENTAL])
    await expectFeatureNames(page, [REPLICATE, MAGIC_OF_MAKING, SPELLCASTING])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-3to2-sheet-after`, project)
  })
})

test.describe('P24-M02 artificer — capstone', () => {
  test.setTimeout(300_000)

  test('create-at-20 alchemist: Душа творения', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Душа творения 20',
      level: 20,
      subclassSlug: SUB.alchemist,
    })
    expect(sheet.classes?.[0]?.level).toBe(20)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [SOUL, EPIC, FLASH, SPELL_STORING])
    const soul = await featureCard(page, SOUL)
    await expandCard(soul)
    await expect(soul).toContainText(/Обман смерти|магическ|реплик|спас/i)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-20-soul-of-artifice`, project)
    expect(store.unmatched).toEqual([])
  })
})
