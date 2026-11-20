/**
 * P24-M02-bard live create / level-up / rollback / colleges / Bardic Inspiration rests (no e2eSeed).
 *
 * Walks the real create wizard at `/characters/create?edition=2024&preview=1`
 * with API mocking (auth/catalog/create-2024 bridge) — infrastructure only.
 * Every major step is clicked; the seed harness is NOT used as create evidence.
 * Each shot is taken at both viewports through the two Playwright projects (1440 / 390).
 */
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import { createStore } from './support/bard2024Harness'
import {
  ARTIFACTS,
  BARD_SKILLS,
  EXPERTISE_L2,
  EXPERTISE_L9,
  LORE_DISCOVERIES,
  LORE_SKILLS,
  SHOT,
  SUB,
  applyDialog,
  biPoolFromSheet,
  cancelDialog,
  chaModOf,
  createAt,
  dismissGuided,
  expandAllFeatures,
  expandCard,
  expectFeatureNames,
  expectNoFeatureNames,
  expectVisibleNoRawIds,
  featureCard,
  isPhone,
  knownByLevel,
  liveLevelUp,
  openCardUse,
  openFeaturesScene,
  longRest,
  shortRestResources,
  preparedLeveled,
  projectOf,
  readPreparedMax,
  shot,
  storedSheet,
  tallShot,
  unclipForks,
  waitStored,
  walkLiveBardCreate,
  type CollegeKey,
} from './support/bardLiveFlow'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

const SONG_OF_REST = /Песн[ья] отдыха/
const BI = /^Бардовское вдохновение/

function expertiseOf(sheet: Record<string, any>): string[] {
  return Object.entries((sheet.skills ?? {}) as Record<string, any>)
    .filter(([, row]) => row?.is_expertise === true)
    .map(([key]) => key)
    .sort()
}

function proficientOf(sheet: Record<string, any>): string[] {
  return Object.entries((sheet.skills ?? {}) as Record<string, any>)
    .filter(([, row]) => row?.is_proficient === true)
    .map(([key]) => key)
}

async function biCounter(page: Page): Promise<{ left: number; max: number }> {
  const card = await featureCard(page, BI)
  await expandCard(card)
  const text = (await card.innerText()).replace(/\s+/g, ' ')
  const m = /доступно\s+(\d+)\s+из\s+(\d+)/.exec(text)
  if (!m) throw new Error(`BI counter not found in: ${text}`)
  return { left: Number(m[1]), max: Number(m[2]) }
}

async function giveInspiration(page: Page, project: string, shotName?: string) {
  const dlg = await openCardUse(page, BI, /Даровать…/)
  await dlg.getByPlaceholder('Имя союзника').fill('Тордек')
  if (shotName) await shot(page, ARTIFACTS, shotName, project)
  await applyDialog(page, dlg)
}

/* ------------------------------------------------------------------ */
/* Create-at-5 / create-at-11                                          */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 bard — LIVE create (wizard clicked, no e2eSeed)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('create-live-at-5 lore: skills×3, instruments×3, Expertise, Lore skills, BI pool, no Song of Rest', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveBardCreate(page, store, {
      name: 'Живой Бард 5',
      level: 5,
      subclassSlug: SUB.lore,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-`,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText('1×4 · 2×3 · 3×2')
        const list = pg.getByTestId('p24-m03c-fork-list-bard')
        await expect(list).toContainText('Компетентность')
        await expect(list).toContainText('Мастер на все руки')
        await expect(list).toContainText('Источник вдохновения')
        await expect(list).toContainText(/Подкласс выбран/)
        await expect(list).not.toContainText('Контрчары')
        await expect(list).not.toContainText('Магические тайны')
        for (const id of EXPERTISE_L2) {
          await expect(pg.getByTestId(`p24-m02-bard-expertise-${id}`)).toHaveAttribute('aria-checked', 'true')
        }
        for (const id of LORE_SKILLS) {
          await expect(pg.getByTestId(`p24-m02-bard-lore-${id}`)).toHaveAttribute('aria-checked', 'true')
        }
        await pg.getByTestId('p24-m02-bard-expertise-performance').scrollIntoViewIfNeeded()
        await tallShot(pg, ARTIFACTS, `${SHOT}-create-at-5-expertise-lore-picks`, project)
        await expect(pg.getByTestId('p24-m03-spell-tab-cantrips')).toContainText('0/3')
        await expect(pg.getByTestId('p24-m03-spell-tab-level1')).toContainText('0/9')
      },
    })
    expect(knownByLevel(sheet, 0)).toBe(3)
    expect(preparedLeveled(sheet)).toBeGreaterThanOrEqual(9)
    expect(sheet.spells?.slots?.['3']).toMatchObject({ max: 2 })
    expect(sheet.spells?.slots?.['4']?.max ?? 0).toBe(0)
    expect(expertiseOf(sheet)).toEqual([...EXPERTISE_L2].sort())
    const proficient = proficientOf(sheet)
    for (const id of [...BARD_SKILLS, ...LORE_SKILLS]) expect(proficient).toContain(id)
    expect(sheet.proficiency?.tools ?? sheet.proficiency?.tool_names ?? []).toBeTruthy()

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      BI,
      /^Сотворение заклинаний/,
      /^Компетентность/,
      /^Мастер на все руки/,
      /^Источник вдохновения/,
      /^Острые слова/,
      /^Доп\. владения/,
    ])
    await expectNoFeatureNames(page, [
      SONG_OF_REST,
      /^Контрчары/,
      /^Магические тайны/,
      /^Превосходное вдохновение/,
      /^Слова Творения/,
      /^Доп\. магические тайны/,
    ])
    const max = Math.max(1, chaModOf(sheet))
    expect(await biCounter(page)).toEqual({ left: max, max })
    const pool = biPoolFromSheet(await storedSheet(store))
    expect(pool).toMatchObject({ max, used: 0 })
    expect(pool?.reset).toBe('short')
    await expandAllFeatures(page)
    await expectVisibleNoRawIds(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-sheet-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-11 glamour: Magical Secrets, Countercharm, Mantle of Majesty, no L18/L20 features', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveBardCreate(page, store, {
      name: 'Живой Бард 11',
      level: 11,
      subclassSlug: SUB.glamour,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-11-`,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText('1×4 · 2×3 · 3×3 · 4×3 · 5×2 · 6×1')
        const list = pg.getByTestId('p24-m03c-fork-list-bard')
        await expect(list).toContainText('Контрчары')
        await expect(list).toContainText('Магические тайны')
        await expect(list).not.toContainText('Превосходное вдохновение')
        await expect(list).not.toContainText('Слова Творения')
        for (const id of [...EXPERTISE_L2, ...EXPERTISE_L9]) {
          await expect(pg.getByTestId(`p24-m02-bard-expertise-${id}`)).toHaveAttribute('aria-checked', 'true')
        }
        await expect(pg.getByTestId('p24-m02-bard-lore-arcana')).toHaveCount(0)
        await pg.getByTestId('p24-m02-bard-expertise-performance').scrollIntoViewIfNeeded()
        await tallShot(pg, ARTIFACTS, `${SHOT}-create-at-11-expertise-picks`, project)
        await expect(pg.getByTestId('p24-m03-spell-tab-cantrips')).toContainText('0/4')
        await expect(pg.getByTestId('p24-m03-spell-tab-level1')).toContainText('0/16')
      },
    })
    expect(knownByLevel(sheet, 0)).toBe(4)
    expect(preparedLeveled(sheet)).toBeGreaterThanOrEqual(16)
    expect(sheet.spells?.slots?.['6']).toMatchObject({ max: 1 })
    expect(sheet.spells?.slots?.['7']?.max ?? 0).toBe(0)
    expect(expertiseOf(sheet)).toEqual([...EXPERTISE_L2, ...EXPERTISE_L9].sort())

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      BI,
      /^Источник вдохновения/,
      /^Контрчары/,
      /^Магические тайны/,
      /^Мантия вдохновения/,
      /^Чарующая магия/,
      /^Мантия величия/,
    ])
    await expectNoFeatureNames(page, [
      SONG_OF_REST,
      /^Несокрушимое величие/,
      /^Превосходное вдохновение/,
      /^Слова Творения/,
    ])
    const max = Math.max(1, chaModOf(sheet))
    expect(await biCounter(page)).toEqual({ left: max, max })
    await expandAllFeatures(page)
    await expectVisibleNoRawIds(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-sheet-features`, project)
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Bardic Inspiration, Font of Inspiration, rests                      */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 bard — Bardic Inspiration pool and rests', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('L5 Font of Inspiration: short rest returns every BI use; slot → +1 use', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Источник 5',
      level: 5,
      subclassSlug: SUB.valor,
    })
    const max = Math.max(1, chaModOf(sheet))
    await openFeaturesScene(page, project)
    expect(await biCounter(page)).toEqual({ left: max, max })

    await giveInspiration(page, project, `${SHOT}-font-L5-bi-dialog`)
    await waitStored(store, (s) => biPoolFromSheet(s)?.used === 1)
    expect(await biCounter(page)).toEqual({ left: max - 1, max })
    await giveInspiration(page, project)
    await waitStored(store, (s) => biPoolFromSheet(s)?.used === 2)
    expect(await biCounter(page)).toEqual({ left: max - 2, max })
    await tallShot(page, ARTIFACTS, `${SHOT}-font-L5-bi-spent-2`, project)

    const slotsBefore = (await storedSheet(store)).spells?.slots?.['1']?.used ?? 0
    const font = await featureCard(page, /^Источник вдохновения/)
    await expandCard(font)
    await font.getByRole('button', { name: /Ячейка → вдохновение…/ }).click()
    const fontDlg = page.getByRole('dialog').last()
    await expect(fontDlg).toContainText(/Бардовское вдохновение: \d+\/\d+/)
    await shot(page, ARTIFACTS, `${SHOT}-font-L5-slot-dialog`, project)
    await applyDialog(page, fontDlg)
    await waitStored(store, (s) => biPoolFromSheet(s)?.used === 1)
    const afterFont = await storedSheet(store)
    expect(afterFont.spells?.slots?.['1']?.used ?? 0).toBe(slotsBefore + 1)
    expect(await biCounter(page)).toEqual({ left: max - 1, max })

    await shortRestResources(page, project, {
      apply: true,
      previewShot: `${SHOT}-font-L5-short-rest-preview`,
    })
    await dismissGuided(page)
    await waitStored(store, (s) => biPoolFromSheet(s)?.used === 0)
    await openFeaturesScene(page, project)
    expect(await biCounter(page)).toEqual({ left: max, max })
    await tallShot(page, ARTIFACTS, `${SHOT}-font-L5-after-short-rest`, project)
    expect(store.unmatched).toEqual([])
  })

  test('L4 (no Font): short rest does not return BI, long rest does', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Без Источника 4',
      level: 4,
      subclassSlug: SUB.dance,
    })
    const max = Math.max(1, chaModOf(sheet))
    await openFeaturesScene(page, project)
    await expectNoFeatureNames(page, [/^Источник вдохновения/, SONG_OF_REST])
    expect(biPoolFromSheet(await storedSheet(store))?.reset).toBe('long')

    await giveInspiration(page, project)
    await waitStored(store, (s) => biPoolFromSheet(s)?.used === 1)
    expect(await biCounter(page)).toEqual({ left: max - 1, max })

    await shortRestResources(page, project, {
      apply: false,
      previewShot: `${SHOT}-L4-short-rest-preview-nothing-to-reset`,
    })
    await dismissGuided(page)
    expect(biPoolFromSheet(await storedSheet(store))?.used).toBe(1)
    await openFeaturesScene(page, project)
    expect(await biCounter(page)).toEqual({ left: max - 1, max })
    await tallShot(page, ARTIFACTS, `${SHOT}-L4-after-short-rest-still-spent`, project)

    await longRest(page, project, `${SHOT}-L4-long-rest-preview`)
    await dismissGuided(page)
    await waitStored(store, (s) => biPoolFromSheet(s)?.used === 0)
    await openFeaturesScene(page, project)
    expect(await biCounter(page)).toEqual({ left: max, max })
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Level-up (create wizard → sheet → +1 уровень)                       */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 bard — LIVE level-up', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('levelup-live 4→5: Источник вдохновения, 3rd-circle slots, prep 7→9, BI reset long→short', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Прокачка 4→5',
      level: 4,
      subclassSlug: SUB.lore,
    })
    expect(await readPreparedMax(page, project)).toBe(7)
    expect(sheet.spells?.slots?.['3']?.max ?? 0).toBe(0)
    expect(biPoolFromSheet(await storedSheet(store))?.reset).toBe('long')
    await liveLevelUp(page, project, `${SHOT}-levelup-4to5`, {
      expectUpcoming: [/Источник вдохновения/],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 5)
    const after = await storedSheet(store)
    expect(after.spells?.slots?.['3']).toMatchObject({ max: 2 })
    expect(await readPreparedMax(page, project)).toBe(9)
    expect(knownByLevel(after, 0)).toBe(3)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Источник вдохновения/, BI])
    await expectNoFeatureNames(page, [SONG_OF_REST])
    await waitStored(store, (s) => biPoolFromSheet(s)?.reset === 'short')
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-4to5-sheet-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('levelup-live 10→11: 6th-circle slot, prep 15→16, no L18/L20 features', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Прокачка 10→11',
      level: 10,
      subclassSlug: SUB.glamour,
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
    await expectFeatureNames(page, [/^Магические тайны/, /^Контрчары/, /^Мантия величия/])
    await expectNoFeatureNames(page, [/^Превосходное вдохновение/, /^Слова Творения/])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-10to11-sheet-features`, project)
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Rollback in the wizard                                              */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 bard — level down in create wizard (rollback UI)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  const STEPS = [
    {
      name: 'rollback-3to2',
      from: 3,
      to: 2,
      sub: SUB.lore,
      before: { slots: '1×4 · 2×2', has: /Подкласс выбран/ },
      after: { slots: '1×3', hasNot: /Подкласс/ },
      lore: { before: 'visible', after: 'gone' },
    },
    {
      name: 'rollback-10to9',
      from: 10,
      to: 9,
      sub: SUB.valor,
      before: { slots: '5×2', has: /Магические тайны/ },
      after: { slots: '5×1', hasNot: /Магические тайны/ },
    },
    {
      name: 'rollback-20to19',
      from: 20,
      to: 19,
      sub: SUB.glamour,
      before: { slots: '7×2', has: /Слова Творения/ },
      after: { slots: '7×1', hasNot: /Слова Творения/ },
    },
  ] as const

  for (const spec of STEPS) {
    test(spec.name, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await walkLiveBardCreate(page, store, {
        name: spec.name,
        level: spec.from,
        subclassSlug: spec.sub,
        shotDir: ARTIFACTS,
        project,
        stopAfterForks: true,
      })
      const list = page.getByTestId('p24-m03c-fork-list-bard')
      await expect(page.getByTestId('p24-m03c-slots')).toContainText(spec.before.slots)
      await expect(list).toContainText(spec.before.has)
      if ('lore' in spec) {
        await expect(page.getByTestId('p24-m02-bard-lore-arcana')).toHaveAttribute('aria-checked', 'true')
      }
      await page.getByTestId('p24-m03c-forks-bard').scrollIntoViewIfNeeded()
      await unclipForks(page)
      await tallShot(page, ARTIFACTS, `${SHOT}-${spec.name}-before-L${spec.from}`, project)

      const levelInput = page.getByTestId('p24-m03c-level-bard')
      await levelInput.scrollIntoViewIfNeeded()
      await levelInput.fill(String(spec.to))
      await levelInput.blur()
      await expect(levelInput).toHaveValue(String(spec.to))
      const forks = page.getByTestId('p24-m03c-forks-bard')
      await forks.scrollIntoViewIfNeeded()
      if (!(await list.isVisible().catch(() => false))) await forks.click()
      await expect(list).toBeVisible()
      await expect(page.getByTestId('p24-m03c-slots')).toContainText(spec.after.slots)
      await expect(list).not.toContainText(spec.after.hasNot)
      if ('lore' in spec) {
        await expect(page.getByTestId('p24-m02-bard-lore-arcana')).toHaveCount(0)
        await expect(page.getByTestId('p24-m02-bard-expertise-performance')).toHaveAttribute('aria-checked', 'true')
      }
      await unclipForks(page)
      await tallShot(page, ARTIFACTS, `${SHOT}-${spec.name}-after-L${spec.to}`, project)
      expect(store.unmatched).toEqual([])
    })
  }

  test('rollback-9to8: Expertise picker drops from 4 to 2 picks', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveBardCreate(page, store, {
      name: 'rollback-9to8',
      level: 9,
      subclassSlug: SUB.dance,
      shotDir: ARTIFACTS,
      project,
      stopAfterForks: true,
    })
    const picked = page.locator('[data-testid^="p24-m02-bard-expertise-"][aria-checked="true"]')
    await expect(picked).toHaveCount(4)
    await page.getByTestId('p24-m02-bard-expertise-performance').scrollIntoViewIfNeeded()
    await tallShot(page, ARTIFACTS, `${SHOT}-rollback-9to8-before-L9`, project)
    const levelInput = page.getByTestId('p24-m03c-level-bard')
    await levelInput.scrollIntoViewIfNeeded()
    await levelInput.fill('8')
    await levelInput.blur()
    await expect(levelInput).toHaveValue('8')
    const forks = page.getByTestId('p24-m03c-forks-bard')
    await forks.scrollIntoViewIfNeeded()
    const list = page.getByTestId('p24-m03c-fork-list-bard')
    if (!(await list.isVisible().catch(() => false))) await forks.click()
    await expect(list).not.toContainText('9 ур. · Компетентность')
    await expect(list).toContainText('2 ур. · Компетентность')
    // Picks are not trimmed automatically: the wizard asks the player to drop the extra two.
    await expect(picked).toHaveCount(4)
    await expect(page.getByTestId('p24-m03-issues')).toContainText('Компетентность: выбрано 4 из 2')
    await page.getByTestId('p24-m02-bard-expertise-performance').scrollIntoViewIfNeeded()
    await tallShot(page, ARTIFACTS, `${SHOT}-rollback-9to8-after-L8-stale-picks`, project)
    for (const id of EXPERTISE_L9) await page.getByTestId(`p24-m02-bard-expertise-${id}`).click()
    await expect(picked).toHaveCount(2)
    await expect(page.getByTestId('p24-m03-issues')).not.toContainText('Компетентность')
    await page.getByTestId('p24-m02-bard-expertise-performance').scrollIntoViewIfNeeded()
    await tallShot(page, ARTIFACTS, `${SHOT}-rollback-9to8-after-L8`, project)
  })
})

/* ------------------------------------------------------------------ */
/* Four PHB colleges via LIVE create (L3 / L6)                         */
/* ------------------------------------------------------------------ */

type CollegeCase = {
  key: CollegeKey
  nameRu: string
  names: Record<3 | 6, RegExp[]>
  use?: Partial<Record<3 | 6, { card: RegExp; button: RegExp; text: RegExp }>>
}

const COLLEGES: CollegeCase[] = [
  {
    key: 'dance',
    nameRu: 'Коллегия танца',
    names: { 3: [/^Ослепительные фуэте/], 6: [/^Вдохновляющие движения/, /^Совместный танец/] },
    use: { 6: { card: /^Совместный танец/, button: /Совместный танец…/, text: /Инициатив/ } },
  },
  {
    key: 'glamour',
    nameRu: 'Коллегия очарования',
    names: { 3: [/^Мантия вдохновения/, /^Чарующая магия/], 6: [/^Мантия величия/] },
    use: {
      3: { card: /^Мантия вдохновения/, button: /Мантия…/, text: /Временные хиты/ },
      6: { card: /^Мантия величия/, button: /Величие…/, text: /Приказ/ },
    },
  },
  {
    key: 'lore',
    nameRu: 'Коллегия знаний',
    names: { 3: [/^Острые слова/, /^Доп\. владения/], 6: [/^Доп\. магические тайны/] },
    use: { 3: { card: /^Острые слова/, button: /Острые слова…/, text: /вычти|Реакция/ } },
  },
  {
    key: 'valor',
    nameRu: 'Коллегия доблести',
    names: { 3: [/^Боевое вдохновение/, /^Доп\. владения/], 6: [/^Доп\. атака/] },
    use: { 3: { card: /^Боевое вдохновение/, button: /Боевое…/, text: /КД|урон/ } },
  },
]

test.describe('P24-M02 bard — four PHB colleges via LIVE create (L3 / L6)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  for (const college of COLLEGES) {
    for (const level of [3, 6] as const) {
      test(`2024-bard-${college.key}-${String(level).padStart(2, '0')}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const { store, sheet } = await createAt(page, project, {
          name: `${college.key} L${level}`,
          level,
          subclassSlug: SUB[college.key],
        })
        expect(sheet.classes?.[0]?.subclass_slug).toBe(SUB[college.key])
        await openFeaturesScene(page, project)
        await expectFeatureNames(page, [
          BI,
          ...college.names[3],
          ...(level >= 6 ? college.names[6] : []),
        ])
        await expectNoFeatureNames(page, [SONG_OF_REST, /^Контрчары/, ...(level < 6 ? college.names[6] : [])])
        await expandAllFeatures(page)
        await expectVisibleNoRawIds(page)

        const use = college.use?.[level]
        if (use) {
          const dlg = await openCardUse(page, use.card, use.button)
          await expect(dlg).toContainText(use.text)
          await shot(page, ARTIFACTS, `${SHOT}-${college.key}-${String(level).padStart(2, '0')}-use-dialog`, project)
          await cancelDialog(page, dlg)
        }
        if (college.key === 'lore') {
          const proficient = proficientOf(sheet)
          for (const id of LORE_SKILLS) expect(proficient).toContain(id)
          if (level >= 6) {
            const picks = JSON.stringify(sheet.feature_picks ?? {}) + JSON.stringify(sheet.class_options_2024 ?? {})
            for (const slug of LORE_DISCOVERIES) expect(picks + JSON.stringify(sheet.spells ?? {})).toContain(slug)
          }
        }
        if (college.key === 'valor') {
          expect(sheet.proficiency?.weapons?.martial).toBe(true)
        }
        await tallShot(page, ARTIFACTS, `${SHOT}-${college.key}-${String(level).padStart(2, '0')}`, project)
        expect(store.unmatched).toEqual([])
      })
    }
  }
})
