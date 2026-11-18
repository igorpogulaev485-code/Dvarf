/**
 * P24-M02-barbarian live / 2024 sheet evidence (preview=1 when RULES_EDITION closed).
 *
 * Full wizard create is optional here; primary evidence is mocked 2024 sheets with
 * FINAL RU names at L5 (berserker) and L11 (core + subclass).
 */
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { createStore, installDruidHarness, type HarnessStore } from './support/druid2024Harness'
import {
  barbarian2024SheetCharacter,
  dismissWelcome,
  isPhone,
  mock2024Sheet,
  openFeaturesScene,
  projectOf,
  shot as shotBase,
} from './support/barbarian2014Mock'
import {
  CREATE_LIVE,
  dismissGuided,
  expandAllFeatures,
  expectFeatureNames,
  expectNoFeatureNames,
  fillUnderfilledPicks,
  next,
  selectCatalogCard,
  pickPrefixed,
  shot,
  tallShot,
  unclipForks,
} from './support/fighterLiveFlow'

const ARTIFACTS = path.resolve(process.cwd(), '../artifacts/p24-m02-barbarian')
const SHOT = '2024-barbarian'

const SUB_BERSERKER = 'barbarian__berserker'
const BARBARIAN_MASTERY = ['greataxe', 'battleaxe', 'longsword'] as const

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

async function walkLiveBarbarianCreate(
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
  await pickPrefixed(page, 'p24-m03-pick-asi-plus2', ['str'])
  await pickPrefixed(page, 'p24-m03-pick-asi-plus1', ['con'])
  await pickPrefixed(page, 'p24-m03-pick-language', ['elvish', 'dwarvish'])
  await pickPrefixed(page, 'p24-m03-pick-bg-equipment', ['pack'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) await shot(page, ARTIFACTS, `${prefix}step2-background`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24-m03-step-class')).toBeVisible()
  await selectCatalogCard(page, 'Варвар')
  await pickPrefixed(page, 'p24-m03-pick-mastery', [...BARBARIAN_MASTERY])
  await pickPrefixed(page, 'p24-m03-pick-class-equipment', ['a'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) {
    await tallShot(page, ARTIFACTS, `${prefix}step3-class-mastery`, opts.project)
  }
  await next(page)

  await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
  const layOut = page.getByRole('button', { name: /Разложить по приоритету класса/i })
  if (await layOut.isVisible().catch(() => false)) await layOut.click()
  if (opts.stepShots) await shot(page, ARTIFACTS, `${prefix}step4-abilities`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 20_000 })
  const levelInput = page.getByTestId('p24-m03c-level-barbarian')
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

  for (const lv of [4, 8, 12, 16, 19]) {
    if (lv > opts.level) break
    const asi =
      lv === 4
        ? page.getByTestId(`p24-m03c-asi-plus2-barbarian-${lv}`)
        : page.getByTestId(`p24-m03c-asi-feat-barbarian-${lv}`)
    if (await asi.isVisible().catch(() => false)) {
      await asi.scrollIntoViewIfNeeded()
      await asi.click()
    }
  }

  const forksBtn = page.getByTestId('p24-m03c-forks-barbarian')
  await forksBtn.scrollIntoViewIfNeeded()
  await forksBtn.click()
  const forkList = page.getByTestId('p24-m03c-fork-list-barbarian')
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

test.describe('P24-M02 barbarian — LIVE create (preview wizard)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('create-live-at-1: rage + unarmored + mastery; no subclass', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveBarbarianCreate(page, store, {
      name: 'Варвар 1',
      level: 1,
      subclassSlug: null,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-1-`,
      duringLeveling: async (pg) => {
        const list = pg.getByTestId('p24-m03c-fork-list-barbarian')
        await expect(list).toContainText('Оружейное мастерство')
        await expect(list).toContainText('Ярость')
        await expect(list).not.toContainText('Подкласс')
      },
    })

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Ярость$/, /^Защита без доспехов$/, /^Оружейное мастерство$/])
    await expectNoFeatureNames(page, [/^Чувство опасности$/, /^Жестокий удар$/, /^Путь берсерка$/])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet-features`, project)
    await dismissGuided(page)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-5 berserker: extra attack + primal knowledge names', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveBarbarianCreate(page, store, {
      name: 'Живой Варвар 5',
      level: 5,
      subclassSlug: SUB_BERSERKER,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-`,
      duringLeveling: async (pg) => {
        const list = pg.getByTestId('p24-m03c-fork-list-barbarian')
        await expect(list).toContainText(/Подкласс|Путь берсерка/)
        await expect(list).toContainText('Дополнительная атака')
        await expect(list).not.toContainText('Жестокий удар')
      },
    })

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /^Ярость$/,
      /^Чувство опасности$/,
      /^Безрассудная атака$/,
      /^Изначальные знания$/,
      /^Дополнительная атака$/,
      /^Быстрое движение$/,
      /^Безумие$/,
    ])
    await expectNoFeatureNames(page, [/^Жестокий критический удар$/, /^Путь дикости$/])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-berserker-features`, project)
    await dismissGuided(page)
    expect(store.unmatched).toEqual([])
  })
})

test.describe('P24-M02 barbarian — 2024 sheet mock evidence', () => {
  test.setTimeout(90_000)

  test('sheet-mock-at-5: 2024 berserker feature names', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const character = barbarian2024SheetCharacter({ level: 5, name: 'Mock Варвар 5' })
    await mock2024Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)

    await openFeaturesScene(page, project)
    await expect(
      page.getByText(/Изначальные знания|Жестокий удар|Путь берсерка|Безумие/i).first(),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^Жестокий критический удар$/)).toHaveCount(0)
    await expect(page.getByText(/^Путь дикости$/)).toHaveCount(0)
    await shotBase(page, ARTIFACTS, `${SHOT}-mock-at-5-features`, project)
  })

  test('sheet-mock-at-11: relentless rage + brutal strike', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const character = barbarian2024SheetCharacter({ level: 11, name: 'Mock Варвар 11' })
    await mock2024Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)

    await openFeaturesScene(page, project)
    await expect(
      page.getByText(/Жестокий удар|Непреклонная ярость|Звериный инстинкт/i).first(),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^Неукротимая ярость$/)).toHaveCount(0)
    await shotBase(page, ARTIFACTS, `${SHOT}-mock-at-11-features`, project)
  })
})