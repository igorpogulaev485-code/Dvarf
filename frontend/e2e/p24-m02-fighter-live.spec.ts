/**
 * P24-M02-fighter live create / features (wizard + mocked API).
 */
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { createStore } from './support/fighter2024Harness'
import {
  ARTIFACTS,
  SHOT,
  SUB,
  actionSurgeFromSheet,
  createAt,
  expandAllFeatures,
  expandCard,
  expectFeatureNames,
  expectNoFeatureNames,
  featureCard,
  indomitableFromSheet,
  isPhone,
  liveLevelDown,
  liveLevelUp,
  openFeaturesScene,
  projectOf,
  secondWindFromSheet,
  shot,
  tallShot,
  waitStored,
  walkLiveFighterCreate,
  weaponMasteryScale,
} from './support/fighterLiveFlow'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

const FIGHTING_STYLE = /^Боевой стиль$/
const SECOND_WIND = /^Второе дыхание$/
const MASTERY = /^Оружейное мастерство$/
const ACTION_SURGE = /^Всплеск действий$/
const TACTICAL_MIND = /^Тактическое мышление$/
const EXTRA_ATTACK = /^Дополнительная атака$/
const TACTICAL_SHIFT = /^Тактическое смещение$/
const INDOMITABLE = /^Непоколебимость$/
const TACTICAL_MASTER = /^Тактическое решение$/
const TWO_EXTRA = /^Две дополнительные атаки$/
const STUDIED = /^Изучающие выпады$/
const THREE_EXTRA = /^Три дополнительные атаки$/
const EPIC = /^Эпический дар$/
const IMPROVED_CRIT = /^Улучшенный критический удар$/
const REMARKABLE = /^Выдающийся атлет$/
const DEFY_DEATH = /^Вызов смерти$/
/** Sheet may surface the resource label «Кости превосходства» instead of feature name. */
const COMBAT_SUP = /Боевое превосходство|Кости превосходства/
const STUDENT = /^Ученик войны$/
const KNOW_ENEMY = /^Знай своего врага$/
const RELENTLESS = /^Неутомимый$/
const WEAPON_BOND = /^Связь с оружием$/
const ARCANE_CHARGE = /^Магический рывок$/
const PSIONIC = /Псионическая сила|Псионическая энергия|Кости пси/
const BULWARK = /^Оплот силы$/
const SPELLCASTING = /^Сотворение заклинаний/

test.describe('P24-M02 fighter — LIVE create', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('create-live-at-1: SW×2, mastery×3; no subclass / surge', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveFighterCreate(page, store, {
      name: 'Воин 1',
      level: 1,
      subclassSlug: null,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-1-`,
      duringLeveling: async (pg) => {
        const list = pg.getByTestId('p24-m03c-fork-list-fighter')
        await expect(list).toContainText('Оружейное мастерство')
        await expect(list).toContainText('Боевой стиль')
        await expect(list).not.toContainText('Подкласс')
        await expect(pg.getByTestId(`p24-m03c-subclass-${SUB.champion}`)).toHaveCount(0)
      },
    })
    expect(secondWindFromSheet(sheet)?.max).toBe(2)
    expect(weaponMasteryScale(sheet)).toBe(3)
    expect(actionSurgeFromSheet(sheet)).toBeUndefined()
    expect(indomitableFromSheet(sheet)).toBeUndefined()

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [FIGHTING_STYLE, SECOND_WIND, MASTERY])
    await expectNoFeatureNames(page, [
      ACTION_SURGE,
      TACTICAL_MIND,
      EXTRA_ATTACK,
      IMPROVED_CRIT,
      INDOMITABLE,
    ])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-5 champion: SW×3, mastery×4, surge, Extra Attack, Tactical Shift; no Indomitable', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveFighterCreate(page, store, {
      name: 'Живой Воин 5',
      level: 5,
      subclassSlug: SUB.champion,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-`,
      duringLeveling: async (pg) => {
        const list = pg.getByTestId('p24-m03c-fork-list-fighter')
        await expect(list).toContainText(/Подкласс выбран|Чемпион/)
        await expect(list).not.toContainText('Непоколебимость')
      },
    })
    expect(secondWindFromSheet(sheet)?.max).toBe(3)
    expect(weaponMasteryScale(sheet)).toBe(4)
    expect(actionSurgeFromSheet(sheet)?.max).toBe(1)
    expect(actionSurgeFromSheet(sheet)?.blocks_magic_action).toBe(true)
    expect(indomitableFromSheet(sheet)).toBeUndefined()

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      SECOND_WIND,
      MASTERY,
      ACTION_SURGE,
      TACTICAL_MIND,
      EXTRA_ATTACK,
      TACTICAL_SHIFT,
      IMPROVED_CRIT,
    ])
    await expectNoFeatureNames(page, [INDOMITABLE, TACTICAL_MASTER, STUDIED, DEFY_DEATH])
    // 2024 Champion uses «Вызов смерти» later — not 2014 «Выживший» at L5.
    await expect(page.getByText(/^Выживший$/)).toHaveCount(0)
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-champion-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-11 champion: SW×4, mastery×5, three attacks, Indomitable, Tactical Master; no Studied', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveFighterCreate(page, store, {
      name: 'Живой Воин 11',
      level: 11,
      subclassSlug: SUB.champion,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-11-champion-`,
    })
    const sheet = store.createdSheet as Record<string, any>
    expect(secondWindFromSheet(sheet)?.max).toBe(4)
    expect(weaponMasteryScale(sheet)).toBe(5)
    expect(actionSurgeFromSheet(sheet)?.max).toBe(1)
    expect(indomitableFromSheet(sheet)?.max).toBe(1)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      INDOMITABLE,
      TACTICAL_MASTER,
      TWO_EXTRA,
      EXTRA_ATTACK,
      REMARKABLE, // Champion L3 — still present at 11
      /^Героический воин$/, // Champion L10
    ])
    await expectNoFeatureNames(page, [STUDIED, THREE_EXTRA])
    await expandAllFeatures(page)
    const indom = await featureCard(page, INDOMITABLE)
    await expandCard(indom)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-champion-features`, project)
    expect(store.unmatched).toEqual([])
  })
})

test.describe('P24-M02 fighter — subclasses @5', () => {
  test.setTimeout(240_000)

  test('create-at-5 battlemaster: Боевое превосходство + Ученик войны', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Мастер 5',
      level: 5,
      subclassSlug: SUB.battlemaster,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [COMBAT_SUP, STUDENT, EXTRA_ATTACK, SECOND_WIND])
    await expectNoFeatureNames(page, [KNOW_ENEMY, RELENTLESS])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-battlemaster-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-at-5 eldritch-knight: Связь с оружием + Сотворение', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    await createAt(page, project, {
      name: 'Мистик 5',
      level: 5,
      subclassSlug: SUB.eldritchKnight,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [WEAPON_BOND, SPELLCASTING, EXTRA_ATTACK])
    await expectNoFeatureNames(page, [ARCANE_CHARGE])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-eldritch-knight-features`, project)
  })

  test('create-at-5 psi-warrior: Псионическая сила', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    await createAt(page, project, {
      name: 'Пси 5',
      level: 5,
      subclassSlug: SUB.psiWarrior,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [PSIONIC, EXTRA_ATTACK])
    await expectNoFeatureNames(page, [BULWARK])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-psi-warrior-features`, project)
  })
})

test.describe('P24-M02 fighter — level-up / level-down', () => {
  test.setTimeout(360_000)

  test('levelup-live 4→5: Extra Attack + Tactical Shift', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Прокачка 4→5',
      level: 4,
      subclassSlug: SUB.champion,
    })
    expect(sheet.classes?.[0]?.level).toBe(4)
    await liveLevelUp(page, project, `${SHOT}-levelup-4to5`, {
      expectUpcoming: [/Дополнительная атака|Тактическое смещение/],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 5)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [EXTRA_ATTACK, TACTICAL_SHIFT, SECOND_WIND])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-4to5-sheet-features`, project)
  })

  test('levelup-live 10→11: two extra attacks', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Прокачка 10→11',
      level: 10,
      subclassSlug: SUB.champion,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [INDOMITABLE, TACTICAL_MASTER])
    await liveLevelUp(page, project, `${SHOT}-levelup-10to11`, {
      expectUpcoming: [/Две дополнительные атаки|Умение подкласса|Выдающийся атлет/i],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 11)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [TWO_EXTRA, INDOMITABLE])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-10to11-sheet-features`, project)
  })

  test('leveldown-live 20→19: three extra attacks gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Откат 20→19',
      level: 20,
      subclassSlug: SUB.champion,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [THREE_EXTRA, EPIC, DEFY_DEATH])
    await liveLevelDown(page, project, `${SHOT}-leveldown-20to19`, { from: 20, to: 19 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 19)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [THREE_EXTRA])
    await expectFeatureNames(page, [EPIC, DEFY_DEATH])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-20to19-sheet-after`, project)
  })

  test('leveldown-live 11→10: two extra attacks gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Откат 11→10',
      level: 11,
      subclassSlug: SUB.champion,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [TWO_EXTRA])
    await liveLevelDown(page, project, `${SHOT}-leveldown-11to10`, { from: 11, to: 10 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 10)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [TWO_EXTRA])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-11to10-sheet-after`, project)
  })

  test('leveldown-live 3→2: subclass gone, surge remains', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Откат 3→2',
      level: 3,
      subclassSlug: SUB.champion,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [IMPROVED_CRIT, ACTION_SURGE, TACTICAL_MIND])
    await liveLevelDown(page, project, `${SHOT}-leveldown-3to2`, { from: 3, to: 2 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 2)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [IMPROVED_CRIT])
    await expectFeatureNames(page, [ACTION_SURGE, TACTICAL_MIND, SECOND_WIND, MASTERY])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-3to2-sheet-after`, project)
  })
})

test.describe('P24-M02 fighter — capstone', () => {
  test.setTimeout(300_000)

  test('create-at-20 champion: Вызов смерти (not Выживший) + Три доп. атаки', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Вызов смерти 20',
      level: 20,
      subclassSlug: SUB.champion,
    })
    expect(sheet.classes?.[0]?.level).toBe(20)
    expect(secondWindFromSheet(sheet)?.max).toBe(4)
    expect(weaponMasteryScale(sheet)).toBe(6)
    expect(actionSurgeFromSheet(sheet)?.max).toBe(2)
    expect(indomitableFromSheet(sheet)?.max).toBe(3)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [DEFY_DEATH, THREE_EXTRA, EPIC, STUDIED])
    await expect(page.getByText(/^Выживший$/)).toHaveCount(0)
    const defy = await featureCard(page, DEFY_DEATH)
    await expandCard(defy)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-20-champion-defy-death`, project)
    expect(store.unmatched).toEqual([])
  })
})
