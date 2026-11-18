/**
 * P24-M02-rogue live / 2024 sheet evidence (preview=1 when RULES_EDITION closed).
 *
 * Live create: at-1, at-5 (thief), at-11 / at-20 (extra Expertise on leveling step).
 * Level-up 4→5 / 10→11; rollbacks 5→4 / 11→10 / 3→2 / 20→19.
 */
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { createStore, installDruidHarness, type HarnessStore } from './support/druid2024Harness'
import {
  dismissWelcome,
  isPhone,
  mock2024Sheet,
  openFeaturesScene,
  projectOf,
  rogue2024SheetCharacter,
  shot as shotBase,
} from './support/rogue2014Mock'
import {
  CREATE_LIVE,
  dismissGuided,
  expandAllFeatures,
  expectFeatureNames,
  expectNoFeatureNames,
  fillUnderfilledPicks,
  next,
  openIdentity,
  selectCatalogCard,
  pickPrefixed,
  shot,
  tallShot,
  unclipForks,
  waitStored,
} from './support/fighterLiveFlow'

const ARTIFACTS = path.resolve(process.cwd(), '../artifacts/p24-m02-rogue')
const SHOT = '2024-rogue'

const SUB_THIEF = 'rogue__thief'
const SUB_ASSASSIN = 'rogue__assassin'
const SUB_AT = 'rogue__arcane-trickster'
const SUB_SOUL = 'rogue__soulknife'
const ROGUE_SKILLS = ['stealth', 'sleight_of_hand', 'perception', 'acrobatics'] as const
const ROGUE_MASTERY = ['shortsword', 'dagger'] as const
const ROGUE_EXPERTISE_L1 = ['stealth', 'perception'] as const
const ROGUE_EXPERTISE_L6_EXTRA = ['sleight_of_hand', 'acrobatics'] as const
const ROGUE_EXPERTISE_ALL = [...ROGUE_EXPERTISE_L1, ...ROGUE_EXPERTISE_L6_EXTRA] as const

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

/** Level-up / down helpers that write into rogue artifacts (fighterLiveFlow hardcodes fighter dir). */
async function rogueLiveLevelUp(
  page: Page,
  project: string,
  shotName: string,
  opts: { expectUpcoming?: RegExp[] },
) {
  const identity = await openIdentity(page)
  await identity.getByRole('button', { name: /\+1 уровень/ }).first().click()
  const raise = page.getByRole('dialog').filter({ hasText: 'Повышение уровня' })
  await expect(raise).toBeVisible()
  if (opts.expectUpcoming?.length) {
    const feats = raise.getByTestId('level-up-features')
    await expect(feats).toBeVisible()
    for (const re of opts.expectUpcoming) await expect(feats.getByText(re).first()).toBeVisible()
    await feats.scrollIntoViewIfNeeded()
  }
  await shot(page, ARTIFACTS, `${shotName}-features`, project)
  await raise.getByRole('button', { name: /^Повысить$/ }).click()
  await expect(raise).toBeHidden({ timeout: 15_000 })
  for (let i = 0; i < 12; i += 1) {
    const dlg = page.getByRole('dialog').last()
    if (!(await dlg.isVisible({ timeout: 2_500 }).catch(() => false))) break
    const primary = dlg.getByRole('button', { name: /^Далее$|^Готово$/ })
    if (await primary.isEnabled({ timeout: 1_500 }).catch(() => false)) {
      await primary.click()
      await page.waitForTimeout(400)
      continue
    }
    const later = dlg.getByRole('button', { name: /^Позже$|^Пропустить$|^Закрыть$/ })
    if (await later.isVisible().catch(() => false)) {
      await later.click()
      await page.waitForTimeout(300)
      continue
    }
    break
  }
}

async function rogueLiveLevelDown(
  page: Page,
  project: string,
  shotName: string,
  opts: { from: number; to: number },
) {
  const identity = await openIdentity(page)
  const minus = identity.getByRole('button', { name: '−1', exact: true }).first()
  await minus.scrollIntoViewIfNeeded()
  await expect(identity).toContainText(new RegExp(`(^|\\D)${opts.from}(\\D|$)`))
  await shot(page, ARTIFACTS, `${shotName}-before`, project)
  await minus.click()
  await page.waitForTimeout(800)
  await minus.scrollIntoViewIfNeeded()
  await expect(identity).toContainText(new RegExp(`(^|\\D)${opts.to}(\\D|$)`))
  await shot(page, ARTIFACTS, `${shotName}-after`, project)
  await identity.getByRole('button', { name: /^Готово$|^Закрыть$/ }).first().click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 })
}

async function walkLiveRogueCreate(
  page: Page,
  store: HarnessStore,
  opts: {
    name: string
    level: number
    subclassSlug: string | null
    project: string
    shotPrefix?: string
    stepShots?: boolean
    duringLeveling?: (pg: Page) => Promise<void>
  },
): Promise<Record<string, unknown>> {
  await installDruidHarness(page, store)
  await page.goto(CREATE_LIVE)
  await expect(page.getByTestId('create-character-2024')).toBeVisible({ timeout: 45_000 })
  await expect(page.getByTestId('p24-m03-step-species')).toBeVisible({ timeout: 45_000 })

  const prefix = opts.shotPrefix ?? ''

  await selectCatalogCard(page, 'Дварф')
  await page.getByTestId('p24-m03-name').fill(opts.name)
  await page.getByTestId('p24-m03-gender-male').click()
  await fillUnderfilledPicks(page)
  if (opts.stepShots) await shot(page, ARTIFACTS, `${prefix}step1-species`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24-m03-step-background')).toBeVisible()
  await selectCatalogCard(page, 'Солдат')
  await pickPrefixed(page, 'p24-m03-pick-asi-mode', ['+2/+1'])
  await pickPrefixed(page, 'p24-m03-pick-asi-plus2', ['dex'])
  await pickPrefixed(page, 'p24-m03-pick-asi-plus1', ['con'])
  await pickPrefixed(page, 'p24-m03-pick-language', ['elvish', 'dwarvish'])
  await pickPrefixed(page, 'p24-m03-pick-bg-equipment', ['pack'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) await shot(page, ARTIFACTS, `${prefix}step2-background`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24-m03-step-class')).toBeVisible()
  await selectCatalogCard(page, 'Плут')
  await pickPrefixed(page, 'p24-m03-pick-skill', [...ROGUE_SKILLS])
  await pickPrefixed(page, 'p24-m03-pick-mastery', [...ROGUE_MASTERY])
  await pickPrefixed(page, 'p24-m03-pick-expertise', [...ROGUE_EXPERTISE_L1])
  await pickPrefixed(page, 'p24-m03-pick-class-equipment', ['a'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) {
    await tallShot(page, ARTIFACTS, `${prefix}step3-class-expertise-mastery`, opts.project)
  }
  await next(page)

  await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
  const layOut = page.getByRole('button', { name: /Разложить по приоритету класса/i })
  if (await layOut.isVisible().catch(() => false)) await layOut.click()
  if (opts.stepShots) await shot(page, ARTIFACTS, `${prefix}step4-abilities`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 20_000 })
  const levelInput = page.getByTestId('p24-m03c-level-rogue')
  await expect(levelInput).toBeVisible()
  await levelInput.fill(String(opts.level))
  await levelInput.blur()
  await expect(levelInput).toHaveValue(String(opts.level))

  if (opts.level >= 3 && opts.subclassSlug) {
    const sub = page.getByTestId(`p24-m03c-subclass-${opts.subclassSlug}`).first()
    await expect(sub).toBeVisible({ timeout: 10_000 })
    await sub.scrollIntoViewIfNeeded()
    await sub.click()
    await expect(sub).toHaveClass(/ui-button--primary/)
  }

  if (opts.level >= 6) {
    // L1 pair was picked on class step; leveling step asks for 4 total.
    await pickPrefixed(page, 'p24-m02-rogue-expertise', [...ROGUE_EXPERTISE_ALL])
  }

  for (const lv of [4, 8, 10, 12, 16, 19]) {
    if (lv > opts.level) break
    const asi =
      lv === 4
        ? page.getByTestId(`p24-m03c-asi-plus2-rogue-${lv}`)
        : page.getByTestId(`p24-m03c-asi-feat-rogue-${lv}`)
    if (await asi.isVisible().catch(() => false)) {
      await asi.scrollIntoViewIfNeeded()
      await asi.click()
    }
  }

  const forksBtn = page.getByTestId('p24-m03c-forks-rogue')
  await forksBtn.scrollIntoViewIfNeeded()
  await forksBtn.click()
  const forkList = page.getByTestId('p24-m03c-fork-list-rogue')
  await expect(forkList).toBeVisible()
  if (opts.duringLeveling) await opts.duringLeveling(page)

  if (opts.stepShots) {
    await unclipForks(page)
    await tallShot(page, ARTIFACTS, `${prefix}step5-leveling-forks`, opts.project)
  }

  await expect(page.getByTestId('p24-m03-finish')).toBeEnabled({ timeout: 20_000 })
  await page.getByTestId('p24-m03-finish').click()
  await page.waitForURL(/\/characters\/[0-9a-f-]{36}$/i, { timeout: 45_000 })
  await dismissWelcome(page)
  const sheet = store.createdSheet as Record<string, unknown>
  expect(((sheet?.classes as unknown[])?.[0] as { level?: number })?.level).toBe(opts.level)
  expect(store.unmatched).toEqual([])
  return sheet
}

test.describe('P24-M02 rogue — LIVE create (preview wizard)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('create-live-at-1: sneak + expertise + mastery; no subclass / steady aim', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveRogueCreate(page, store, {
      name: 'Плут 1',
      level: 1,
      subclassSlug: null,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-1-`,
      duringLeveling: async (pg) => {
        const list = pg.getByTestId('p24-m03c-fork-list-rogue')
        await expect(list).toContainText(/Компетентность|Оружейное мастерство|Скрытая атака/)
        await expect(list).not.toContainText('Подкласс')
        await expect(list).not.toContainText('Точное прицеливание')
      },
    })

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /^Скрытая атака$/,
      /^Компетентность$/,
      /^Оружейное мастерство$/,
      /^Воровской жаргон$/,
    ])
    await expectNoFeatureNames(page, [
      /^Точное прицеливание$/,
      /^Хитрый удар$/,
      /^Вор$/,
      /^Улучшенный Хитрый удар$/,
    ])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet-features`, project)
    await dismissGuided(page)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-5 thief: steady aim + cunning strike + fast hands', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveRogueCreate(page, store, {
      name: 'Живой Плут 5',
      level: 5,
      subclassSlug: SUB_THIEF,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-`,
      duringLeveling: async (pg) => {
        const list = pg.getByTestId('p24-m03c-fork-list-rogue')
        await expect(list).toContainText(/Подкласс|Вор/)
        await expect(list).toContainText(/Хитрый удар|Невероятное уклонение/)
        await expect(list).not.toContainText('Улучшенный Хитрый удар')
        await expect(list).not.toContainText('Надёжный талант')
      },
    })

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /^Скрытая атака$/,
      /^Компетентность$/,
      /^Хитрое действие$/,
      /^Точное прицеливание$/,
      /^Хитрый удар$/,
      /^Невероятное уклонение$/,
      /^Быстрые руки$/,
      /^Работа на высоте$/,
    ])
    await expectNoFeatureNames(page, [
      /^Улучшенный Хитрый удар$/,
      /^Коварная атака$/,
      /^Верный прицел$/,
      /^Экспертность$/,
    ])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-thief-features`, project)
    await dismissGuided(page)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-11 assassin: reliable@7 + improved cunning', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveRogueCreate(page, store, {
      name: 'Живой Плут 11',
      level: 11,
      subclassSlug: SUB_ASSASSIN,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-11-`,
      duringLeveling: async (pg) => {
        const list = pg.getByTestId('p24-m03c-fork-list-rogue')
        await expect(list).toContainText(/Надёжный талант/)
        await expect(list).toContainText(/Улучшенный Хитрый удар/)
        await expect(list).not.toContainText('Бесчестные удары')
      },
    })

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-sheet`, project)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /^Надёжный талант$/,
      /^Увёртливость$/,
      /^Улучшенный Хитрый удар$/,
      /^Убийство$/,
    ])
    await expectNoFeatureNames(page, [/^Бесчестные удары$/, /^Ликвидация$/, /^Коварные удары$/])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-assassin-features`, project)
    await dismissGuided(page)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-20 soulknife: luck + rend mind', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveRogueCreate(page, store, {
      name: 'Живой Плут 20',
      level: 20,
      subclassSlug: SUB_SOUL,
      project,
      stepShots: false,
      shotPrefix: `${SHOT}-create-at-20-`,
    })
    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-20-sheet`, project)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Удача$/, /^Неуловимость$/, /^Бесчестные удары$/, /^Разрыв разума$/])
    await expectNoFeatureNames(page, [/^Удар удачи$/, /^Улыбка фортуны$/, /^Раздирание разума$/])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-20-soulknife-features`, project)
    await dismissGuided(page)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-5 arcane-trickster: spellcasting names', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveRogueCreate(page, store, {
      name: 'Живой Ловкач 5',
      level: 5,
      subclassSlug: SUB_AT,
      project,
      stepShots: false,
      shotPrefix: `${SHOT}-create-at-5-at-`,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Сотворение заклинаний$/, /^Ловкость волшебной руки$/])
    await expectNoFeatureNames(page, [/^Вор заклинаний$/, /^Многогранный ловкач$/])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-arcane-trickster-features`, project)
    await dismissGuided(page)
    expect(store.unmatched).toEqual([])
  })
})

test.describe('P24-M02 rogue — level-up / rollback', () => {
  test.setTimeout(360_000)
  test.use({ actionTimeout: 15_000 })

  test('levelup-live 4→5: cunning strike + uncanny dodge', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveRogueCreate(page, store, {
      name: 'Прокачка 4→5',
      level: 4,
      subclassSlug: SUB_THIEF,
      project,
    })
    await dismissGuided(page)
    await rogueLiveLevelUp(page, project, `${SHOT}-levelup-4to5`, {
      expectUpcoming: [/Хитрый удар|Невероятное уклонение/],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 5)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Хитрый удар$/, /^Невероятное уклонение$/])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-4to5-sheet-features`, project)
  })

  test('leveldown-live 5→4: cunning strike gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveRogueCreate(page, store, {
      name: 'Откат 5→4',
      level: 5,
      subclassSlug: SUB_THIEF,
      project,
    })
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Хитрый удар$/])
    await rogueLiveLevelDown(page, project, `${SHOT}-leveldown-5to4`, { from: 5, to: 4 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 4)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [/^Хитрый удар$/])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-5to4-sheet-after`, project)
  })

  test('levelup-live 10→11: improved cunning strike', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveRogueCreate(page, store, {
      name: 'Прокачка 10→11',
      level: 10,
      subclassSlug: SUB_THIEF,
      project,
    })
    await dismissGuided(page)
    await rogueLiveLevelUp(page, project, `${SHOT}-levelup-10to11`, {
      expectUpcoming: [/Улучшенный Хитрый удар/],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 11)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Улучшенный Хитрый удар$/, /^Надёжный талант$/])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-10to11-sheet-features`, project)
  })

  test('leveldown-live 11→10: improved cunning gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveRogueCreate(page, store, {
      name: 'Откат 11→10',
      level: 11,
      subclassSlug: SUB_THIEF,
      project,
    })
    await dismissGuided(page)
    await rogueLiveLevelDown(page, project, `${SHOT}-leveldown-11to10`, { from: 11, to: 10 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 10)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [/^Улучшенный Хитрый удар$/])
    await expectFeatureNames(page, [/^Надёжный талант$/])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-11to10-sheet-after`, project)
  })

  test('leveldown-live 3→2: subclass gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveRogueCreate(page, store, {
      name: 'Откат 3→2',
      level: 3,
      subclassSlug: SUB_THIEF,
      project,
    })
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Точное прицеливание$/, /^Быстрые руки$/])
    await rogueLiveLevelDown(page, project, `${SHOT}-leveldown-3to2`, { from: 3, to: 2 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 2)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [/^Точное прицеливание$/, /^Быстрые руки$/, /^Подкласс плута$/])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-3to2-sheet-after`, project)
  })

  test('leveldown-live 20→19: luck gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveRogueCreate(page, store, {
      name: 'Откат 20→19',
      level: 20,
      subclassSlug: SUB_THIEF,
      project,
    })
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Удача$/])
    await rogueLiveLevelDown(page, project, `${SHOT}-leveldown-20to19`, { from: 20, to: 19 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 19)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [/^Удача$/])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-20to19-sheet-after`, project)
  })
})

test.describe('P24-M02 rogue — 2024 sheet mock evidence', () => {
  test.setTimeout(90_000)

  test('sheet-mock-at-1: sneak + expertise + mastery names', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const character = rogue2024SheetCharacter({
      level: 1,
      name: 'Mock Плут 1',
      subclass: null,
    })
    await mock2024Sheet(page, character)
    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await openFeaturesScene(page, project)
    await expect(
      page.getByText(/Скрытая атака|Компетентность|Оружейное мастерство/i).first(),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^Коварная атака$/)).toHaveCount(0)
    await expect(page.getByText(/^Экспертность$/)).toHaveCount(0)
    await shotBase(page, ARTIFACTS, `${SHOT}-mock-at-1-features`, project)
  })

  test('sheet-mock-at-5: thief — steady aim + cunning strike (not draft names)', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const character = rogue2024SheetCharacter({ level: 5, name: 'Mock Плут 5' })
    await mock2024Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)

    await openFeaturesScene(page, project)
    await expect(
      page
        .getByText(/Точное прицеливание|Хитрый удар|Быстрые руки|Невероятное уклонение/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^Верный прицел$/)).toHaveCount(0)
    await expect(page.getByText(/^Коварные удары$/)).toHaveCount(0)
    await expect(page.getByText(/^Улучшенный Хитрый удар$/)).toHaveCount(0)
    await shotBase(page, ARTIFACTS, `${SHOT}-mock-at-5-thief-features`, project)
  })

  test('sheet-mock-at-11: reliable@7 path + improved cunning strike', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const character = rogue2024SheetCharacter({ level: 11, name: 'Mock Плут 11' })
    await mock2024Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)

    await openFeaturesScene(page, project)
    await expect(
      page.getByText(/Надёжный талант|Увёртливость|Улучшенный Хитрый удар/i).first(),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^Гибкий ум$/)).toHaveCount(0)
    await expect(page.getByText(/^Коварные удары$/)).toHaveCount(0)
    await shotBase(page, ARTIFACTS, `${SHOT}-mock-at-11-features`, project)
  })

  test('sheet-mock-at-20: luck + elusive + soulknife names', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const character = rogue2024SheetCharacter({
      level: 20,
      name: 'Mock Плут 20',
      subclass: 'soulknife',
    })
    await mock2024Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)

    await openFeaturesScene(page, project)
    const cards = page.locator('.feature-card__name, .feature-card__title, .feature-card')
    await expect(cards.filter({ hasText: /Удача|Неуловимость|Бесчестные удары/i }).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      cards.filter({ hasText: /Псионическая сила|Психические клинки|Клинки души/i }).first(),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^Удар удачи$/)).toHaveCount(0)
    await expect(page.getByText(/^Улыбка фортуны$/)).toHaveCount(0)
    await expect(page.getByText(/^Клинок души$/)).toHaveCount(0)
    await expect(page.getByText(/^Раздирание разума$/)).toHaveCount(0)
    await shotBase(page, ARTIFACTS, `${SHOT}-mock-at-20-soulknife-features`, project)
  })

  test('sheet-mock-assassin: FINAL names (not Ликвидация)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const character = rogue2024SheetCharacter({
      level: 5,
      name: 'Mock assassin',
      subclass: 'assassin',
    })
    await mock2024Sheet(page, character)
    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await openFeaturesScene(page, project)
    const cards = page.locator('.feature-card__name, .feature-card__title, .feature-card')
    await expect(cards.filter({ hasText: /Убийство|Инструменты убийцы/i }).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/^Ликвидация$/)).toHaveCount(0)
    await expect(page.getByText(/^Мастер проникновения$/)).toHaveCount(0)
    await shotBase(page, ARTIFACTS, `${SHOT}-mock-subclass-assassin-features`, project)
  })

  test('sheet-mock-arcane-trickster: FINAL names (not draft)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const character = rogue2024SheetCharacter({
      level: 5,
      name: 'Mock arcane-trickster',
      subclass: 'arcane-trickster',
    })
    await mock2024Sheet(page, character)
    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await openFeaturesScene(page, project)
    const cards = page.locator('.feature-card__name, .feature-card__title, .feature-card')
    await expect(
      cards.filter({ hasText: /Сотворение заклинаний|Ловкость волшебной руки/i }).first(),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^Вор заклинаний$/)).toHaveCount(0)
    await expect(page.getByText(/^Многогранный ловкач$/)).toHaveCount(0)
    await shotBase(page, ARTIFACTS, `${SHOT}-mock-subclass-arcane-trickster-features`, project)
  })
})
