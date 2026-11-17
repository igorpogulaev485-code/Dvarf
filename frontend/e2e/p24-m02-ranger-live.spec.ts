/**
 * P24-M02-ranger live create / features (wizard + mocked API).
 */
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { createStore } from './support/ranger2024Harness'
import {
  ARTIFACTS,
  FIGHTING_STYLE_DEFENSE,
  FIGHTING_STYLE_DRUIDIC,
  SHOT,
  SUB,
  createAt,
  expandAllFeatures,
  expandCard,
  expectFeatureNames,
  expectNoFeatureNames,
  favoredMarkFromSheet,
  featureCard,
  isPhone,
  liveLevelDown,
  liveLevelUp,
  markPoolRemaining,
  openCombatScene,
  openFeaturesScene,
  projectOf,
  shot,
  storedSheet,
  tallShot,
  tirelessFromSheet,
  waitStored,
  walkLiveRangerCreate,
} from './support/rangerLiveFlow'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

const FAVORED = /^Избранный враг$/
const MASTERY = /^Оружейное мастерство$/
const SPELLCASTING = /^Сотворение заклинаний/
const EXTRA_ATTACK = /^Дополнительная атака$/
const ROVING = /^Вездеходность$/
const EXPERTISE = /^Компетентность$/
const TIRELESS = /^Неутомимость$/
const RELENTLESS = /^Неустанный охотник$/
const VEIL = /^Природная завеса$/
const PRECISE = /^Меткий охотник$/
const FERAL = /^Звериные чувства$/
const FOE_SLAYER = /^Истребитель врагов$/
const EPIC = /^Эпический дар$/
const FIGHTING_STYLE = /Боевой стиль|Воин-друид/
const HUNTERS_PREY = /^Добыча охотника$/
const HUNTERS_LORE = /^Знания охотника$/
const PRIMAL = /^Первичный спутник$/
const DREAD = /^Угроза из засады$/
const GLAMOUR = /^Иной блеск$/
const STALKERS = /^Охотничья ярость$/
const DEFT = /^Ловкий исследователь$/

test.describe('P24-M02 ranger — LIVE create', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('create-live-at-5 hunter: mastery×2, FS, extra attack, mark pool, no roving/tireless', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveRangerCreate(page, store, {
      name: 'Живой Следопыт 5',
      level: 5,
      subclassSlug: SUB.hunter,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-`,
      fightingStyle: FIGHTING_STYLE_DEFENSE,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText('1×4 · 2×2')
        const list = pg.getByTestId('p24-m03c-fork-list-ranger')
        await expect(list).toContainText('Оружейное мастерство')
        await expect(list).toContainText(/Подкласс выбран/)
        await expect(list).not.toContainText('Вездеходность')
        await expect(pg.getByTestId('p24-m03-spell-tab-level1')).toContainText(/\d+\/6/)
      },
    })

    expect(sheet.spells?.slots?.['2']).toMatchObject({ max: 2 })
    expect(favoredMarkFromSheet(sheet)).toMatchObject({ max: 3, used: 0 })
    expect(tirelessFromSheet(sheet)).toBeUndefined()

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      FAVORED,
      MASTERY,
      SPELLCASTING,
      FIGHTING_STYLE,
      EXTRA_ATTACK,
      HUNTERS_PREY,
      HUNTERS_LORE,
    ])
    await expectNoFeatureNames(page, [ROVING, EXPERTISE, TIRELESS, RELENTLESS, FOE_SLAYER])
    await expect(page.getByText(/Метка охотника/i).first()).toBeVisible()
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-hunter-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-1: favored enemy + mastery, no fighting style / subclass', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveRangerCreate(page, store, {
      name: 'Следопыт 1',
      level: 1,
      subclassSlug: null,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-1-`,
      fightingStyle: null,
      duringLeveling: async (pg) => {
        const list = pg.getByTestId('p24-m03c-fork-list-ranger')
        await expect(list).toContainText('Оружейное мастерство')
        await expect(list).not.toContainText('Подкласс')
        await expect(list).not.toContainText('Вездеходность')
      },
    })
    expect(favoredMarkFromSheet(sheet)).toMatchObject({ max: 2, used: 0 })

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [FAVORED, MASTERY, SPELLCASTING])
    await expectNoFeatureNames(page, [FIGHTING_STYLE, EXTRA_ATTACK, HUNTERS_PREY, ROVING, DEFT])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-11 hunter: roving, expertise, tireless; not capstones', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveRangerCreate(page, store, {
      name: 'Живой Следопыт 11',
      level: 11,
      subclassSlug: SUB.hunter,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-11-hunter-`,
      fightingStyle: FIGHTING_STYLE_DEFENSE,
    })
    const sheet = store.createdSheet as Record<string, any>
    expect((tirelessFromSheet(sheet)?.max ?? 0)).toBeGreaterThanOrEqual(2)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      ROVING,
      EXPERTISE,
      TIRELESS,
      EXTRA_ATTACK,
      HUNTERS_PREY,
      /^Добыча превосходного охотника$/,
    ])
    await expectNoFeatureNames(page, [RELENTLESS, VEIL, PRECISE, FERAL, FOE_SLAYER])
    await expandAllFeatures(page)
    const roving = await featureCard(page, ROVING)
    await expandCard(roving)
    await expect(roving).toContainText(/\+10|лазан|плаван/i)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-hunter-features`, project)
    expect(store.unmatched).toEqual([])
  })
})

function SUPERIOR_HUNTERS() {
  return /^Добыча превосходного охотника$/
}

test.describe('P24-M02 ranger — subclasses @5', () => {
  test.setTimeout(240_000)

  test('create-at-5 beastmaster: Первичный спутник', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Повелитель зверей 5',
      level: 5,
      subclassSlug: SUB.beastmaster,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [PRIMAL, FAVORED, EXTRA_ATTACK])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-beastmaster-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-at-5 gloom: Угроза из засады', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    await createAt(page, project, {
      name: 'Сумрачный 5',
      level: 5,
      subclassSlug: SUB.gloomStalker,
    })
    await openFeaturesScene(page, project)
    await expect(page.getByText(/Угроза из засады|Сумрачное зрение/i).first()).toBeVisible()
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-gloom-features`, project)
  })

  test('create-at-5 fey: Иной блеск', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    await createAt(page, project, {
      name: 'Странник фей 5',
      level: 5,
      subclassSlug: SUB.feyWanderer,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [GLAMOUR, FAVORED])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-fey-features`, project)
  })
})

test.describe('P24-M02 ranger — druidic warrior + mark UI', () => {
  test.setTimeout(240_000)

  test('create-at-5 druidic warrior: cantrips on sheet payload', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Воин-друид 5',
      level: 5,
      subclassSlug: SUB.hunter,
      fightingStyle: FIGHTING_STYLE_DRUIDIC,
      stepShots: true,
      shotPrefix: `${SHOT}-druidic-warrior-`,
    })
    const known = (sheet.spells?.known ?? []) as Array<Record<string, unknown>>
    const dw = known.filter((row) =>
      String(row.id || '').includes('druidic_warrior_cantrips'),
    )
    expect(dw.length).toBe(2)
    expect(sheet.spells?.casting_ability).toBe('wis')
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [FAVORED, /Воин-друид/])
    await tallShot(page, ARTIFACTS, `${SHOT}-druidic-warrior-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('hunters mark free uses on favored enemy card', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Метка 5',
      level: 5,
      subclassSlug: SUB.hunter,
    })
    expect(favoredMarkFromSheet(sheet)?.max).toBe(3)
    await openFeaturesScene(page, project)
    await expect(page.getByText(/Метка охотника/i).first()).toBeVisible()
    await tallShot(page, ARTIFACTS, `${SHOT}-hunters-mark-free-counter`, project)
    expect(store.unmatched).toEqual([])
  })
})

test.describe('P24-M02 ranger — level-up / level-down', () => {
  test.setTimeout(360_000)

  test.fixme('levelup-live 4→5: Extra Attack', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Прокачка 4→5',
      level: 4,
      subclassSlug: SUB.hunter,
    })
    expect(sheet.classes?.[0]?.level).toBe(4)
    await liveLevelUp(page, project, `${SHOT}-levelup-4to5`, {
      expectUpcoming: [/Дополнительная атака/],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 5)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [EXTRA_ATTACK, FAVORED])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-4to5-sheet-features`, project)
  })

  test.fixme('levelup-live 10→11: Tireless already; upcoming subclass feature', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Прокачка 10→11',
      level: 10,
      subclassSlug: SUB.hunter,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [TIRELESS, ROVING])
    await liveLevelUp(page, project, `${SHOT}-levelup-10to11`, {
      expectUpcoming: [SUPERIOR_HUNTERS()],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 11)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [SUPERIOR_HUNTERS(), TIRELESS])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-10to11-sheet-features`, project)
  })

  test('leveldown-live 20→19: foe slayer gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Откат 20→19',
      level: 20,
      subclassSlug: SUB.hunter,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [FOE_SLAYER, EPIC])
    await liveLevelDown(page, project, `${SHOT}-leveldown-20to19`, { from: 20, to: 19 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 19)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [FOE_SLAYER])
    await expectFeatureNames(page, [EPIC, TIRELESS])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-20to19-sheet-after`, project)
  })

  test('leveldown-live 11→10: superior prey gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Откат 11→10',
      level: 11,
      subclassSlug: SUB.hunter,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [SUPERIOR_HUNTERS()])
    await liveLevelDown(page, project, `${SHOT}-leveldown-11to10`, { from: 11, to: 10 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 10)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [SUPERIOR_HUNTERS()])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-11to10-sheet-after`, project)
  })

  test('leveldown-live 3→2: subclass features gone, spellcasting remains', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Откат 3→2',
      level: 3,
      subclassSlug: SUB.hunter,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [HUNTERS_PREY, DEFT, FIGHTING_STYLE])
    await liveLevelDown(page, project, `${SHOT}-leveldown-3to2`, { from: 3, to: 2 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 2)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [HUNTERS_PREY, HUNTERS_LORE])
    await expectFeatureNames(page, [FIGHTING_STYLE, DEFT, FAVORED, SPELLCASTING])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-3to2-sheet-after`, project)
  })
})

test.describe('P24-M02 ranger — capstone + movement', () => {
  test.setTimeout(300_000)

  test('create-at-20 hunter: Истребитель врагов (к10)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Истребитель 20',
      level: 20,
      subclassSlug: SUB.hunter,
    })
    expect(sheet.classes?.[0]?.level).toBe(20)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [FOE_SLAYER, EPIC, RELENTLESS])
    const foe = await featureCard(page, FOE_SLAYER)
    await expandCard(foe)
    await expect(foe).toContainText(/к10|1к10/i)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-20-hunter-foe-slayer`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-at-6: roving speed on combat sheet', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    await createAt(page, project, {
      name: 'Вездеход 6',
      level: 6,
      subclassSlug: SUB.hunter,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [ROVING])
    await openCombatScene(page, project)
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    await expect(body).toMatch(/35|40|Скорость/i)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-6-roving-combat`, project)
  })

  test('create-at-10: tireless pool', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { sheet } = await createAt(page, project, {
      name: 'Неутомимость 10',
      level: 10,
      subclassSlug: SUB.hunter,
    })
    expect((tirelessFromSheet(sheet)?.max ?? 0)).toBeGreaterThanOrEqual(2)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [TIRELESS])
    const card = await featureCard(page, TIRELESS)
    await expandCard(card)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-10-tireless`, project)
  })

  test('create-at-11 gloom: Охотничья ярость', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    await createAt(page, project, {
      name: 'Сумрачный 11',
      level: 11,
      subclassSlug: SUB.gloomStalker,
    })
    await openFeaturesScene(page, project)
    await expect(page.getByText(/Охотничья ярость|Угроза из засады/i).first()).toBeVisible()
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-gloom-stalkers-flurry`, project)
  })
})