/**
 * P24-M02B-fighter live create-at / rollbacks / desk (1440 / 390).
 * Paths: Arcane Archer (AU) + Banneret / «Знаменосец» (FRHoF).
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore, installFighterHarness, type HarnessStore } from './support/fighter2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS =
  process.env.P24_M02B_FIGHTER_ARTIFACTS ||
  path.resolve(here, '../../artifacts/p24-m02b-fighter')

const PATHS = ['archer', 'banneret'] as const
const LEVELS_MATRIX = [3, 5, 11] as const
const KEEP_EXTRA = [7, 10, 15, 18, 20] as const

const FEATURE_RE: Record<(typeof PATHS)[number], RegExp> = {
  archer:
    /Мистический лучник|Знания чародейных стрелков|Чародейный выстрел|Странствующая стрела|Магические боеприпасы|Заготовленный выстрел|Неукротимая телепортация|Мастерская стрельба/i,
  banneret:
    /Знаменосец|Посланник рыцарства|Групповое оздоровление|Групповая тактика|Воодушевляющий всплеск|Устойчивость команды|Вдохновляющий командир/i,
}

const PICKER_RE: Record<(typeof PATHS)[number], RegExp> = {
  archer: /Мистический лучник/i,
  banneret: /Знаменосец/i,
}

function projectOf(testInfo: { project: { name: string } }): '1440' | '390' {
  return testInfo.project.name.includes('390') ? '390' : '1440'
}

async function shot(page: Page, name: string, project: string) {
  await page.waitForTimeout(350)
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  const file = `${name}-${project}.png`
  const buffer = await page.screenshot({
    path: path.join(ARTIFACTS, file),
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
  })
  const md5 = createHash('md5').update(buffer).digest('hex')
  fs.appendFileSync(path.join(ARTIFACTS, `shots-md5-${project}.txt`), `${md5}  ${file}\n`)
}

async function dismissWelcome(page: Page) {
  const skip = page.getByRole('button', { name: /Пропустит.*подсказ/i })
  try {
    await skip.waitFor({ state: 'visible', timeout: 2_500 })
    await skip.click()
  } catch {
    /* ok */
  }
}

async function completeVisibleChoices(page: Page) {
  for (let i = 0; i < 20; i += 1) {
    const finish = page.getByTestId('p24-m03-finish')
    if (await finish.isEnabled().catch(() => false)) return
    const chip = page.locator('button.sheet-chip').filter({ hasNot: page.locator('.is-on') }).first()
    if (await chip.isVisible().catch(() => false)) {
      await chip.click().catch(() => {})
      await page.waitForTimeout(180)
      continue
    }
    const next = page.getByRole('button', { name: /^Далее$|^Продолжить$/ }).first()
    if (await next.isEnabled().catch(() => false)) {
      await next.click().catch(() => {})
      await page.waitForTimeout(180)
      continue
    }
    break
  }
}

async function createViaSeed(page: Page, store: HarnessStore, seed: string) {
  await installFighterHarness(page, store)
  await page.goto(`/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=${seed}`)
  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await completeVisibleChoices(page)
  const finish = page.getByTestId('p24-m03-finish')
  await expect(finish).toBeEnabled({ timeout: 60_000 })
  await finish.click()
  await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}/i, { timeout: 30_000 })
  await dismissWelcome(page)
}

async function dismissOpenDialogs(page: Page) {
  for (let i = 0; i < 3; i += 1) {
    const dlg = page.getByRole('dialog').last()
    if (!(await dlg.isVisible().catch(() => false))) return
    const cancel = dlg.getByRole('button', { name: /^Отмена$|^Закрыть$/ })
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click().catch(() => {})
    } else {
      await page.keyboard.press('Escape').catch(() => {})
    }
    await page.waitForTimeout(200)
  }
}

async function openFeatures(page: Page, project: string) {
  await dismissOpenDialogs(page)
  if (project === '390') {
    await page.getByText('Способн.', { exact: true }).last().click({ force: true })
  } else {
    await page.getByRole('button', { name: /^Способности$/ }).first().click({ force: true })
  }
  await page.waitForTimeout(700)
}

async function openCombat(page: Page, project: string) {
  await dismissOpenDialogs(page)
  if (project === '390') {
    await page.getByText('Бой', { exact: true }).last().click({ force: true })
  } else {
    await page.getByRole('button', { name: /^Бой$/ }).first().click({ force: true })
  }
  await page.waitForTimeout(500)
}

async function setCreateLevel(page: Page, level: number) {
  const levelInput = page.getByTestId('p24-m03c-level-fighter')
  await expect(levelInput).toBeVisible({ timeout: 10_000 })
  await levelInput.fill(String(level))
  await levelInput.blur()
  await page.waitForTimeout(450)
}

async function expandFeature(page: Page, name: RegExp) {
  const collapsed = page
    .locator('.feature-card')
    .filter({ has: page.locator('.feature-card__name, .feature-card__title', { hasText: name }) })
    .first()
  await expect(collapsed).toBeVisible({ timeout: 12_000 })
  if (await collapsed.locator('.feature-card__title').count()) return collapsed
  await collapsed.locator('button.feature-card__glance, button[aria-label="Подробнее"]').first().click()
  await page.waitForTimeout(300)
  return page
    .locator('.feature-card--expand')
    .filter({ has: page.locator('.feature-card__title', { hasText: name }) })
    .first()
}

async function clickFeatureUse(page: Page, nameRe: RegExp) {
  const card = await expandFeature(page, nameRe)
  await card.scrollIntoViewIfNeeded().catch(() => {})
  const btn = card
    .locator('button')
    .filter({
      hasText:
        /Выстрел|Зарядить|Отскок|Восстановить|Телепорт|Реакция|Групповое|Воодушевить|Тактика|Командир|Потратить|Всплеск|Перебросить|Использовать|…/,
    })
    .first()
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
  } else {
    await card.locator('button').last().click()
  }
  await expect(page.getByRole('dialog').last()).toBeVisible({ timeout: 10_000 })
}

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACTS, `shots-md5-${projectOf(testInfo)}.txt`), '')
})

test.describe('P24-M02B fighter book create-at matrix', () => {
  test.setTimeout(240_000)

  for (const level of LEVELS_MATRIX) {
    for (const pathSlug of PATHS) {
      const seed = `fighter${level}${pathSlug}`
      test(`create-at ${seed}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await createViaSeed(page, store, seed)
        if (pathSlug === 'banneret') {
          await expect(page.getByText(/Знаменосец/i).first()).toBeAttached({ timeout: 12_000 })
          await expect(page.getByText(/Баннерет/i)).toHaveCount(0)
        } else {
          await expect(page.getByText(/Мистический лучник/i).first()).toBeAttached({
            timeout: 12_000,
          })
        }
        await shot(page, `2024-${seed}-sheet`, project)

        await openFeatures(page, project)
        await expect(
          page.locator('.feature-card, .play-desk-features').getByText(FEATURE_RE[pathSlug]).first(),
        ).toBeVisible({ timeout: 12_000 })
        await expect(page.getByText(/Баннерет/i)).toHaveCount(0)
        await shot(page, `2024-${seed}-features`, project)

        await openCombat(page, project)
        await shot(page, `2024-${seed}-combat`, project)
      })
    }
  }

  for (const level of KEEP_EXTRA) {
    for (const pathSlug of PATHS) {
      const seed = `fighter${level}${pathSlug}`
      test(`create-at keep ${seed}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await createViaSeed(page, store, seed)
        await shot(page, `2024-${seed}-sheet`, project)
        await openFeatures(page, project)
        await shot(page, `2024-${seed}-features`, project)
        await openCombat(page, project)
        await shot(page, `2024-${seed}-combat`, project)
      })
    }
  }
})

test.describe('P24-M02B fighter book — picker + finish gate', () => {
  test.setTimeout(120_000)

  test('picker shows book paths with correct names', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installFighterHarness(page, store)
    for (const pathSlug of PATHS) {
      await page.goto(
        `/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=fighter3${pathSlug}`,
      )
      await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
      const archerChip = page.getByTestId('p24-m03c-subclass-fighter__arcane-archer')
      const banneretChip = page.getByTestId('p24-m03c-subclass-fighter__banneret')
      await expect(archerChip).toBeVisible({ timeout: 15_000 })
      await expect(banneretChip).toBeVisible()
      await expect(archerChip).toContainText(PICKER_RE.archer)
      await expect(banneretChip).toContainText(PICKER_RE.banneret)
      await expect(banneretChip).not.toContainText(/Баннерет/)
      await expect(page.getByRole('button', { name: PICKER_RE[pathSlug] }).first()).toBeVisible()
      await expect(page.getByTestId('p24-m03c-subclass-fighter__purple-dragon-knight')).toHaveCount(
        0,
      )
      await shot(page, `2024-picker-${pathSlug}`, project)
    }
  })

  test('finish disabled without arcane shot picks at L3 archer', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installFighterHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=fighter3archer',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    // Clear seeded shot picks so finish stays gated.
    await page.evaluate(() => {
      const w = window as unknown as {
        __create2024Patch?: (p: Record<string, unknown>) => void
      }
      // Best-effort: uncheck shot chips if present.
      document
        .querySelectorAll('[data-testid^="p24-m02b-pick-arcane-shot-"].is-on, [data-testid^="p24-m02b-pick-arcane-shot-"][aria-pressed="true"]')
        .forEach((el) => (el as HTMLElement).click())
    })
    await page.waitForTimeout(400)
    // If picks remain filled by seed, force-clear via chip toggles.
    const selected = page.locator(
      '[data-testid^="p24-m02b-pick-arcane-shot-"].is-on, [data-testid^="p24-m02b-pick-arcane-shot-"][aria-pressed="true"], [data-testid^="p24-m02b-pick-arcane-shot-"][aria-checked="true"]',
    )
    const n = await selected.count()
    for (let i = 0; i < n; i += 1) {
      await selected.nth(0).click().catch(() => {})
      await page.waitForTimeout(120)
    }
    const finish = page.getByTestId('p24-m03-finish')
    await expect(finish).toBeDisabled({ timeout: 15_000 })
    await shot(page, '2024-finish-disabled-l3-archer', project)
  })
})

test.describe('P24-M02B fighter book — live create rollbacks', () => {
  test.setTimeout(180_000)

  test('rollback 3→2 drops archer subclass', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installFighterHarness(page, store)
    await page.goto('/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=fighter3archer')
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByTestId('p24-m03c-subclass-fighter__arcane-archer')).toBeVisible({
      timeout: 15_000,
    })
    await setCreateLevel(page, 2)
    await expect(page.getByText(/Чародейный выстрел/i)).toHaveCount(0)
    await shot(page, '2024-rollback-3-to-2-archer', project)
  })

  test('rollback 7→6 banneret', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installFighterHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=fighter7banneret',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Групповая тактика/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 6)
    await expect(page.getByText(/Групповая тактика/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-7-to-6-banneret', project)
  })

  test('rollback 10→9 archer', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installFighterHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=fighter10archer',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Заготовленный выстрел/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 9)
    await expect(page.getByText(/Заготовленный выстрел/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-10-to-9-archer', project)
  })

  test('rollback 15→14 banneret', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installFighterHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=fighter15banneret',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Устойчивость команды/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 14)
    await expect(page.getByText(/Устойчивость команды/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-15-to-14-banneret', project)
  })

  test('rollback 18→17 archer', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installFighterHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=fighter18archer',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Мастерская стрельба/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 17)
    await expect(page.getByText(/Мастерская стрельба/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-18-to-17-archer', project)
  })

  test('rollback 20→19 banneret', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installFighterHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=fighter20banneret',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await setCreateLevel(page, 19)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-20-to-19-banneret', project)
  })
})

test.describe('P24-M02B fighter book — desk mechanics', () => {
  test.setTimeout(240_000)

  test('archer: shot + ammo + curving + ever-ready + teleport + masterful', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'fighter18archer')
    await openFeatures(page, project)

    await clickFeatureUse(page, /Чародейный выстрел/)
    {
      const dlg = page.getByRole('dialog').last()
      await expect(dlg.getByText(/Чародейный выстрел|кость|ИНТ|Боеприпас/i).first()).toBeVisible({
        timeout: 8_000,
      })
    }
    await shot(page, '2024-desk-arcane-shot', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Магические боеприпасы/)
    await shot(page, '2024-desk-magical-ammunition', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Странствующая стрела/)
    await shot(page, '2024-desk-curving-shot', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Заготовленный выстрел/)
    await shot(page, '2024-desk-ever-ready-shot', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Неукротимая телепортация/)
    await shot(page, '2024-desk-indomitable-teleport', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Мастерская стрельба/)
    await shot(page, '2024-desk-masterful-shots', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)
  })

  test('banneret: group recovery + rallying + shared + commander', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'fighter18banneret')
    await expect(page.getByText(/Знаменосец/i).first()).toBeAttached({ timeout: 12_000 })
    await expect(page.getByText(/Баннерет/i)).toHaveCount(0)
    await openFeatures(page, project)

    await clickFeatureUse(page, /Групповое оздоровление/)
    {
      const dlg = page.getByRole('dialog').last()
      await expect(dlg.getByText(/Групповое|1к4|эманац|союзник/i).first()).toBeVisible({
        timeout: 8_000,
      })
    }
    await shot(page, '2024-desk-group-recovery', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Воодушевляющий всплеск/)
    await shot(page, '2024-desk-rallying-surge', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Устойчивость команды/)
    await shot(page, '2024-desk-shared-resilience', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Вдохновляющий командир/)
    await shot(page, '2024-desk-inspiring-commander', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)
  })
})
