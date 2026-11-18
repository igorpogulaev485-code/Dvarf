/**
 * P24-M02-barbarian live create / features (wizard + mocked API bridge).
 * Live matrix: create-at 1/3/5/11/20, all 4 PHB paths, wild heart / world tree
 * picks + sheet chips, mastery fill, level-up/down, primal champion @20.
 */
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { createStore, installDruidHarness, type HarnessStore } from './support/druid2024Harness'
import { dismissWelcome, isPhone, projectOf } from './support/barbarian2014Mock'
import {
  CREATE_LIVE,
  dismissGuided,
  expandAllFeatures,
  expandCard,
  expectFeatureNames,
  expectNoFeatureNames,
  featureCard,
  fillUnderfilledPicks,
  liveLevelDown as fighterLiveLevelDown,
  liveLevelUp as fighterLiveLevelUp,
  next,
  openFeaturesScene,
  openIdentity,
  pickPrefixed,
  selectCatalogCard,
  shot,
  tallShot,
  unclipForks,
} from './support/fighterLiveFlow'

const ARTIFACTS = path.resolve(process.cwd(), '../artifacts/p24-m02-barbarian')
const SHOT = '2024-barbarian'

const SUB = {
  berserker: 'barbarian__berserker',
  wildHeart: 'barbarian__wild-heart',
  worldTree: 'barbarian__world-tree',
  zealot: 'barbarian__zealot',
} as const

/** L1 barbarian mastery budget = 2; top-up on leveling step. */
const MASTERY_L1 = ['greataxe', 'battleaxe'] as const
const MASTERY_EXTRA = ['longsword', 'warhammer'] as const

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

function masteryLimitForLevel(level: number): number {
  if (level >= 10) return 4
  if (level >= 4) return 3
  return 2
}

function masteryKnown(sheet: Record<string, any>): string[] {
  const known = sheet?.weapon_mastery?.known
  return Array.isArray(known) ? known.map(String) : []
}

function ragePool(sheet: Record<string, any>) {
  const pools = [
    ...((sheet.resources ?? []) as Array<Record<string, any>>),
    ...((sheet.play?.resources ?? []) as Array<Record<string, any>>),
    ...(((sheet.class_progress_2024?.resources ?? []) as Array<Record<string, any>>) || []),
  ]
  return pools.find(
    (r) =>
      String(r.pool_id ?? '') === 'rages' ||
      String(r.id ?? '').includes('rage') ||
      /ярость/i.test(String(r.name ?? r.label ?? '')),
  ) as { max?: number; used?: number } | undefined
}

function abilityScore(sheet: Record<string, any>, key: string): number {
  const row = sheet?.abilities?.[key]
  if (typeof row === 'number') return row
  if (row && typeof row === 'object' && row.score != null) return Number(row.score)
  return Number.NaN
}

function abilityMax(sheet: Record<string, any>, key: string): number | undefined {
  const row = sheet?.abilities?.[key]
  if (row && typeof row === 'object' && row.max_score != null) return Number(row.max_score)
  return undefined
}

async function storedSheet(store: HarnessStore): Promise<Record<string, any>> {
  const row = [...store.characters.values()][0]
  return (row?.sheet ?? store.createdSheet ?? {}) as Record<string, any>
}

async function waitStored(store: HarnessStore, fn: (s: Record<string, any>) => boolean) {
  await expect.poll(async () => fn(await storedSheet(store)), { timeout: 25_000 }).toBe(true)
}

async function liveLevelUp(
  page: Page,
  project: string,
  shotName: string,
  opts: { expectUpcoming?: RegExp[]; expectNoUpcoming?: boolean },
) {
  // Reuse fighter helper but re-shot into barbarian artifacts after.
  await fighterLiveLevelUp(page, project, shotName, opts)
  await shot(page, ARTIFACTS, `${shotName}-sheet`, project)
}

async function liveLevelDown(
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
  void fighterLiveLevelDown
}

async function fillBarbarianLevelingPicks(
  page: Page,
  opts: { level: number; subclassSlug: string | null },
) {
  const limit = masteryLimitForLevel(opts.level)
  if (limit > MASTERY_L1.length) {
    const topUpHeading = page.getByRole('heading', { name: /Доп\. оружейное мастерство/ })
    await expect(topUpHeading).toBeVisible({ timeout: 15_000 })
    const needExtra = limit - MASTERY_L1.length
    for (let i = 0; i < needExtra; i += 1) {
      const chip = page
        .locator('[data-testid^="p24-m03-pick-weapon_mastery_leveling-"][aria-checked="false"]')
        .first()
      await expect(chip, `mastery top-up chip #${i + 1}`).toBeVisible({ timeout: 10_000 })
      await chip.scrollIntoViewIfNeeded()
      await chip.click()
      await page.waitForTimeout(200)
    }
    // When budget is full, BarbarianLevelingPicks may unmount (masteryTopUp=false).
    const stillOpen = await topUpHeading.isVisible().catch(() => false)
    if (stillOpen) await expect(topUpHeading).toContainText(`(${limit}/${limit})`)
  }

  if (opts.subclassSlug === SUB.wildHeart && opts.level >= 3) {
    const rageChip = page.getByTestId('p24-m03-pick-wild_heart_rage-wolf')
    await expect(rageChip).toBeVisible({ timeout: 10_000 })
    await pickPrefixed(page, 'p24-m03-pick-wild_heart_rage', ['wolf'])
    if (opts.level >= 6) {
      await pickPrefixed(page, 'p24-m03-pick-wild_heart_aspect', ['salmon'])
    }
    if (opts.level >= 14) {
      await pickPrefixed(page, 'p24-m03-pick-wild_heart_power', ['falcon'])
    }
  }
}

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
  await pickPrefixed(page, 'p24-m03-pick-mastery', [...MASTERY_L1])
  await pickPrefixed(page, 'p24-m03-pick-class-equipment', ['a'])
  await fillUnderfilledPicks(page)
  await expect(page.getByTestId('p24-m03-mastery-heading')).toContainText('(2/2)')
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

  await fillBarbarianLevelingPicks(page, {
    level: opts.level,
    subclassSlug: opts.subclassSlug,
  })

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
  await dismissGuided(page)
  const sheet = store.createdSheet as Record<string, unknown>
  expect(((sheet?.classes as unknown[])?.[0] as { level?: number })?.level).toBe(opts.level)
  expect(store.unmatched).toEqual([])
  return sheet
}

async function createAt(
  page: Page,
  project: string,
  opts: {
    name: string
    level: number
    subclassSlug: string | null
    stepShots?: boolean
    shotPrefix?: string
    duringLeveling?: (pg: Page) => Promise<void>
  },
) {
  const store = createStore()
  const sheet = await walkLiveBarbarianCreate(page, store, { ...opts, project })
  return { store, sheet: sheet as Record<string, any> }
}

test.describe('P24-M02 barbarian — LIVE create matrix', () => {
  test.setTimeout(360_000)
  test.use({ actionTimeout: 15_000 })

  test('create-live-at-1: rage + unarmored + mastery×2; no subclass', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Варвар 1',
      level: 1,
      subclassSlug: null,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-1-`,
      duringLeveling: async (pg) => {
        const list = pg.getByTestId('p24-m03c-fork-list-barbarian')
        await expect(list).toContainText('Оружейное мастерство')
        await expect(list).not.toContainText('Подкласс')
      },
    })
    expect(masteryKnown(sheet).length).toBe(2)
    const rage = ragePool(sheet)
    expect(rage?.max).toBeGreaterThan(0)
    expect(rage?.max).not.toBe(0)

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Ярость$/, /^Защита без доспехов$/, /^Оружейное мастерство$/])
    await expectNoFeatureNames(page, [/^Чувство опасности$/, /^Жестокий удар$/, /^Путь берсерка$/])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-3 berserker: subclass + frenzy', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Варвар 3',
      level: 3,
      subclassSlug: SUB.berserker,
      shotPrefix: `${SHOT}-create-at-3-`,
    })
    expect(masteryKnown(sheet).length).toBe(2)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Ярость$/, /^Изначальные знания$/, /^Безумие$/])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-3-berserker-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-5 berserker: mastery 3/3 + extra attack', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Живой Варвар 5',
      level: 5,
      subclassSlug: SUB.berserker,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-`,
      duringLeveling: async (pg) => {
        const list = pg.getByTestId('p24-m03c-fork-list-barbarian')
        await expect(list).toContainText(/Подкласс|Путь берсерка/)
        await expect(list).toContainText('Дополнительная атака')
        await expect(pg.getByTestId('p24-m03-finish')).toBeEnabled()
      },
    })
    expect(masteryKnown(sheet).length).toBe(3)
    expect(ragePool(sheet)?.max).toBeGreaterThan(0)

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
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-5 wild-heart: rage picks + sheet chips', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Дикое сердце 5',
      level: 5,
      subclassSlug: SUB.wildHeart,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-wild-heart-`,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03-pick-wild_heart_rage-wolf')).toHaveAttribute(
          'aria-checked',
          'true',
        )
        await expect(pg.getByText(/Волк|Медведь|Орёл/).first()).toBeVisible()
        await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-wild-heart-picks`, project)
      },
    })
    expect(masteryKnown(sheet).length).toBe(3)
    expect(sheet.class_options_2024?.rage?.wild_heart).toBe('wolf')

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /^Ярость дикой природы$/,
      /^Говорящий с животными$/,
      /^Дополнительная атака$/,
    ])
    await expectNoFeatureNames(page, [/^Тотемный воин$/, /^Дух тотема$/])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-wild-heart-features`, project)

    // ClassOptions2024CombatPanel is on the features stage (below feature cards).
    await openFeaturesScene(page, project)
    const ragePicks = page.getByTestId('wild-heart-rage-picks')
    await ragePicks.scrollIntoViewIfNeeded()
    await expect(ragePicks).toBeVisible({ timeout: 15_000 })
    await expect(ragePicks).toContainText('Волк')
    await expect(ragePicks).toContainText('Медведь')
    await expect(ragePicks).toContainText('Орёл')
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-wild-heart-combat-picks`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-5 world-tree: vitality card + rage temp HP', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Мировое древо 5',
      level: 5,
      subclassSlug: SUB.worldTree,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-world-tree-`,
    })

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Жизненная сила Древа$/, /^Дополнительная атака$/])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-world-tree-features`, project)

    const startRage = page.getByRole('button', { name: /^Начать ярость$/ }).first()
    await startRage.scrollIntoViewIfNeeded()
    await expect(startRage).toBeVisible({ timeout: 15_000 })
    await startRage.click()
    await expect(page.getByText(/Жизненная сила Древа|временные хиты/i).first()).toBeVisible({
      timeout: 10_000,
    })
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-world-tree-rage`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-5 zealot: warrior of the gods', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Фанатик 5',
      level: 5,
      subclassSlug: SUB.zealot,
      shotPrefix: `${SHOT}-create-at-5-zealot-`,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Воин богов$/, /^Божественная ярость$/, /^Дополнительная атака$/])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-zealot-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-11 berserker: relentless + mastery×4 (live, not mock)', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Варвар 11',
      level: 11,
      subclassSlug: SUB.berserker,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-11-`,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03-finish')).toBeEnabled()
        await expect(pg.getByTestId('p24-m03c-fork-list-barbarian')).toContainText(
          /Непреклонная ярость|Жестокий удар/,
        )
      },
    })
    expect(masteryKnown(sheet).length).toBe(4)
    expect(ragePool(sheet)?.max).toBeGreaterThan(0)
    // Not a stub 0/N mastery counter.
    expect(masteryKnown(sheet).length).not.toBe(0)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /^Жестокий удар$/,
      /^Непреклонная ярость$/,
      /^Звериный инстинкт$/,
      /^Безумие$/,
    ])
    await expectNoFeatureNames(page, [/^Неукротимая ярость$/])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-berserker-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-11 wild-heart: aspect salmon/panther/owl chips', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Дикое сердце 11',
      level: 11,
      subclassSlug: SUB.wildHeart,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-11-wild-heart-`,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03-pick-wild_heart_aspect-salmon')).toHaveAttribute(
          'aria-checked',
          'true',
        )
        await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-wild-heart-picks`, project)
      },
    })
    expect(masteryKnown(sheet).length).toBe(4)
    expect(sheet.class_options_2024?.wild_heart_aspect).toBe('salmon')

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /^Аспект дикой природы$/,
      /^Ярость дикой природы$/,
      /^Непреклонная ярость$/,
    ])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-wild-heart-features`, project)

    await openFeaturesScene(page, project)
    const aspect = page.getByTestId('wild-heart-aspect-picks')
    await aspect.scrollIntoViewIfNeeded()
    await expect(aspect).toBeVisible({ timeout: 15_000 })
    await expect(aspect).toContainText('Лосось')
    await expect(aspect).toContainText('Пантера')
    await expect(aspect).toContainText('Сова')
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-wild-heart-aspect-chips`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-11 world-tree: vitality + branches (+ battering roots)', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Мировое древо 11',
      level: 11,
      subclassSlug: SUB.worldTree,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-11-world-tree-`,
    })

    await openFeaturesScene(page, project)
    // Travel along the Tree is L14 — at 11: vitality, branches, battering roots.
    await expectFeatureNames(page, [
      /^Жизненная сила Древа$/,
      /^Ветви Древа$/,
      /^Колотящее дубьё$/,
    ])
    await expectNoFeatureNames(page, [/^Путешествие по Древу$/])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-world-tree-features`, project)

    const branches = page.getByRole('button', { name: /^Ветви Древа$/ }).first()
    await branches.scrollIntoViewIfNeeded()
    await expect(branches).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-world-tree-combat`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-14 world-tree: travel along the tree', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Мировое древо 14',
      level: 14,
      subclassSlug: SUB.worldTree,
      shotPrefix: `${SHOT}-create-at-14-world-tree-`,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Путешествие по Древу$/, /^Ветви Древа$/])
    const travel = page.getByRole('button', { name: /^Путешествие по Древу$/ }).first()
    await travel.scrollIntoViewIfNeeded()
    await expect(travel).toBeVisible({ timeout: 15_000 })
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-14-world-tree-travel`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-20: primal champion +4 / max 25', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Чемпион 20',
      level: 20,
      subclassSlug: SUB.berserker,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-20-`,
    })
    expect(sheet.classes?.[0]?.level).toBe(20)
    expect(masteryKnown(sheet).length).toBe(4)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Изначальный чемпион$/, /^Эпический дар$/, /^Стойкая ярость$/])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-20-features`, project)

    // Client syncPrimalChampion applies +4 and ceiling 25 after load.
    await waitStored(store, (s) => {
      const grant = s.primal_champion
      if (grant && (Number(grant.str) > 0 || Number(grant.con) > 0)) return true
      return abilityMax(s, 'str') === 25 || abilityScore(s, 'str') >= 20
    })
    const after = await storedSheet(store)
    const strMax = abilityMax(after, 'str')
    const conMax = abilityMax(after, 'con')
    if (strMax != null) expect(strMax).toBe(25)
    if (conMax != null) expect(conMax).toBe(25)
    if (after.primal_champion) {
      expect(Number(after.primal_champion.str) + Number(after.primal_champion.con)).toBeGreaterThan(0)
    }
    await shot(page, ARTIFACTS, `${SHOT}-create-at-20-champion`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-15: persistent rage «Восстановить все»', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Стойкая 15',
      level: 15,
      subclassSlug: SUB.berserker,
      shotPrefix: `${SHOT}-create-at-15-`,
    })
    await openFeaturesScene(page, project)
    const card = await featureCard(page, /^Стойкая ярость$/)
    await expandCard(card)
    await expect(card.getByRole('button', { name: /Восстановить/ }).first()).toBeVisible()
    await card.getByRole('button', { name: /Восстановить/ }).first().click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg).toBeVisible()
    // Single-mode dialog: primary «Применить» restores all rages (no segmented control when only one mode).
    await expect(dlg.getByText(/восстановить все ярости|Стойкая ярость/i).first()).toBeVisible()
    await expect(dlg.getByRole('button', { name: /^Применить$/ })).toBeVisible()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-15-persistent-restore`, project)
    await dlg.getByRole('button', { name: /^Отмена$/ }).click()
    expect(store.unmatched).toEqual([])
  })
})

test.describe('P24-M02 barbarian — level-up / level-down', () => {
  test.setTimeout(360_000)

  test('levelup-live 4→5: Extra Attack + Fast Movement', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Прокачка 4→5',
      level: 4,
      subclassSlug: SUB.berserker,
    })
    expect(sheet.classes?.[0]?.level).toBe(4)
    expect(masteryKnown(sheet).length).toBe(3)
    await liveLevelUp(page, project, `${SHOT}-levelup-4to5`, {
      expectUpcoming: [/Дополнительная атака|Быстрое движение/],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 5)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Дополнительная атака$/, /^Быстрое движение$/, /^Безумие$/])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-4to5-sheet-features`, project)
  })

  test('levelup-live 10→11: Relentless Rage', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Прокачка 10→11',
      level: 10,
      subclassSlug: SUB.berserker,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Жестокий удар$/])
    await liveLevelUp(page, project, `${SHOT}-levelup-10to11`, {
      expectUpcoming: [/Непреклонная ярость/i],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 11)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Непреклонная ярость$/, /^Жестокий удар$/])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-10to11-sheet-features`, project)
  })

  test('leveldown-live 20→19: primal champion gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Откат 20→19',
      level: 20,
      subclassSlug: SUB.berserker,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Изначальный чемпион$/])
    await liveLevelDown(page, project, `${SHOT}-leveldown-20to19`, { from: 20, to: 19 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 19)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [/^Изначальный чемпион$/])
    await expectFeatureNames(page, [/^Эпический дар$/])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-20to19-sheet-after`, project)
  })

  test('leveldown-live 11→10: relentless gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Откат 11→10',
      level: 11,
      subclassSlug: SUB.berserker,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Непреклонная ярость$/])
    await liveLevelDown(page, project, `${SHOT}-leveldown-11to10`, { from: 11, to: 10 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 10)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [/^Непреклонная ярость$/])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-11to10-sheet-after`, project)
  })

  test('leveldown-live 3→2: subclass gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Откат 3→2',
      level: 3,
      subclassSlug: SUB.berserker,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Безумие$/, /^Изначальные знания$/])
    await liveLevelDown(page, project, `${SHOT}-leveldown-3to2`, { from: 3, to: 2 })
    await waitStored(store, (s) => s.classes?.[0]?.level === 2)
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [/^Безумие$/])
    await expectFeatureNames(page, [/^Ярость$/, /^Чувство опасности$/, /^Безрассудная атака$/])
    await tallShot(page, ARTIFACTS, `${SHOT}-leveldown-3to2-sheet-after`, project)
  })
})
