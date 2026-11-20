/**
 * P24-M02B-ranger live create-at / rollbacks / desk (1440 / 390).
 * Paths: Winter Walker (FRHoF) + Hollow Warden (RTW).
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore, installRangerHarness, type HarnessStore } from './support/ranger2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS =
  process.env.P24_M02B_RANGER_ARTIFACTS ||
  path.resolve(here, '../../artifacts/p24-m02b-ranger')

const PATHS = ['winter', 'hollow'] as const
const LEVELS_MATRIX = [3, 5, 11] as const
const KEEP_EXTRA = [7, 15, 20] as const

const FEATURE_RE: Record<(typeof PATHS)[number], RegExp> = {
  winter:
    /Зимний ходок|Ледяной исследователь|Изморозь охотника|Укрепляющий дух|Выстужающее возмездие|Морозный призрак/i,
  hollow:
    /Страж пустошей|Ярость дикой природы|Алчущая мощь|Гниль и жестокость|Древняя мощь/i,
}

const PICKER_RE: Record<(typeof PATHS)[number], RegExp> = {
  winter: /Зимний ходок/i,
  hollow: /Страж пустошей/i,
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
  // M06 onboarding auto-opens on 2024 create and blocks finish / sheet clicks.
  const diff = page.getByTestId('edition-2024-diff-dialog')
  try {
    if (await diff.isVisible({ timeout: 2_500 }).catch(() => false)) {
      await page.getByRole('button', { name: 'Понятно' }).click()
      await diff.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
    }
  } catch {
    /* ok */
  }
  const skip = page.getByRole('button', { name: /Пропустит.*подсказ/i })
  try {
    await skip.waitFor({ state: 'visible', timeout: 2_500 })
    await skip.click()
  } catch {
    /* ok */
  }
}

async function completeVisibleChoices(page: Page) {
  for (let i = 0; i < 16; i += 1) {
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
  await installRangerHarness(page, store)
  await page.goto(`/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=${seed}`)
  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
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
  const levelInput = page.getByTestId('p24-m03c-level-ranger')
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
        /Изморозь|Полярные|Укрепляющий|Возмездие|Морозный|Ярость|Алчущая|Гниль|Неугасающ|Использовать|…/,
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

test.describe('P24-M02B ranger book create-at matrix', () => {
  test.setTimeout(240_000)

  for (const level of LEVELS_MATRIX) {
    for (const pathSlug of PATHS) {
      const seed = `ranger${level}${pathSlug}`
      test(`create-at ${seed}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await createViaSeed(page, store, seed)
        await shot(page, `2024-${seed}-sheet`, project)

        await openFeatures(page, project)
        await expect(
          page.locator('.feature-card, .play-desk-features').getByText(FEATURE_RE[pathSlug]).first(),
        ).toBeVisible({ timeout: 12_000 })
        await expect(page.getByText(/Иней охотника|Гнев дикой природы|Странник пустошей/i)).toHaveCount(0)
        await shot(page, `2024-${seed}-features`, project)

        await openCombat(page, project)
        await shot(page, `2024-${seed}-combat`, project)
      })
    }
  }

  for (const level of KEEP_EXTRA) {
    for (const pathSlug of PATHS) {
      const seed = `ranger${level}${pathSlug}`
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

test.describe('P24-M02B ranger book — picker + finish gate', () => {
  test.setTimeout(120_000)

  test('picker shows book paths with correct names', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installRangerHarness(page, store)
    for (const pathSlug of PATHS) {
      await page.goto(
        `/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=ranger3${pathSlug}`,
      )
      await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
      await expect(page.getByText(PICKER_RE[pathSlug]).first()).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(/Странник пустошей/i)).toHaveCount(0)
      await shot(page, `2024-picker-${pathSlug}`, project)
    }
  })

  test('finish disabled with empty spells at L3 winter', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installRangerHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=ranger3winter&e2eEmptySpells=1',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
    const finish = page.getByTestId('p24-m03-finish')
    await expect(finish).toBeDisabled({ timeout: 15_000 })
    await shot(page, '2024-finish-disabled-l3-winter', project)
  })
})

test.describe('P24-M02B ranger book — live create rollbacks', () => {
  test.setTimeout(180_000)

  test('rollback 3→2 drops winter subclass', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installRangerHarness(page, store)
    await page.goto('/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=ranger3winter')
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
    await expect(page.getByText(/Зимний ходок/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 2)
    await expect(page.getByText(/Зимний ходок/i)).toHaveCount(0)
    await shot(page, '2024-rollback-3-to-2-winter', project)
  })

  test('rollback 7→6 hollow', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installRangerHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=ranger7hollow',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
    await expect(page.getByText(/Алчущая мощь/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 6)
    await expect(page.getByText(/Алчущая мощь/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-7-to-6-hollow', project)
  })

  test('rollback 11→10 winter', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installRangerHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=ranger11winter',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
    await expect(page.getByText(/Выстужающее возмездие/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 10)
    await expect(page.getByText(/Выстужающее возмездие/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-11-to-10-winter', project)
  })

  test('rollback 15→14 hollow', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installRangerHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=ranger15hollow',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
    await expect(page.getByText(/Древняя мощь/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 14)
    await expect(page.getByText(/Древняя мощь/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-15-to-14-hollow', project)
  })

  test('rollback 20→19 winter', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installRangerHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=ranger20winter',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
    await setCreateLevel(page, 19)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-20-to-19-winter', project)
  })
})

test.describe('P24-M02B ranger book — desk mechanics', () => {
  test.setTimeout(240_000)

  test('winter: rime + polar + fortifying + retribution + haunt', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'ranger15winter')
    await openFeatures(page, project)

    await clickFeatureUse(page, /Изморозь охотника/)
    {
      const dlg = page.getByRole('dialog').last()
      await expect(dlg.getByText(/1к10|временн|Отход|Изморозь/i).first()).toBeVisible({ timeout: 8_000 })
    }
    await shot(page, '2024-desk-hunters-rime', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Ледяной исследователь/)
    {
      const dlg = page.getByRole('dialog').last()
      await expect(dlg.getByText(/Полярные|1к6|1к4|Холод|Ледяной/i).first()).toBeVisible({
        timeout: 8_000,
      })
    }
    await shot(page, '2024-desk-polar-strikes', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Укрепляющий дух/)
    await shot(page, '2024-desk-fortifying-soul', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Выстужающее возмездие/)
    await shot(page, '2024-desk-chilling-retribution', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Морозный призрак/)
    await shot(page, '2024-desk-frozen-haunt', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)
  })

  test('hollow: wrath spends favored enemy + rot + ancient', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'ranger15hollow')
    await openFeatures(page, project)

    await clickFeatureUse(page, /Ярость дикой природы/)
    {
      const dlg = page.getByRole('dialog').last()
      await expect(dlg.getByText(/Избранн|КД|Пугающ|Ярость/i).first()).toBeVisible({
        timeout: 8_000,
      })
    }
    await shot(page, '2024-desk-wrath-of-the-wild', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Алчущая мощь/)
    await shot(page, '2024-desk-hungering-might', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Гниль и жестокость/)
    await shot(page, '2024-desk-rot-and-violence', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Древняя мощь/)
    {
      const dlg = page.getByRole('dialog').last()
      await expect(dlg.getByText(/Неугасающ|Истощен|Древняя/i).first()).toBeVisible({
        timeout: 8_000,
      })
    }
    await shot(page, '2024-desk-ancient-might', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)
  })
})
