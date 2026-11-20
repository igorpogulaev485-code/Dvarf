/**
 * P24-M02B-cleric live create-at / rollbacks / desk (1440 / 390).
 * Paths: Arcana (AU) + Knowledge (FRHoF) + Grave (RTW).
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore, installClericHarness, type HarnessStore } from './support/cleric2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS =
  process.env.P24_M02B_CLERIC_ARTIFACTS ||
  path.resolve(here, '../../artifacts/p24-m02b-cleric')

const PATHS = ['arcana', 'knowledge', 'grave'] as const
const LEVELS_MATRIX = [3, 5, 11] as const
const KEEP_EXTRA = [6, 9, 17, 20] as const

const FEATURE_RE: Record<(typeof PATHS)[number], RegExp> = {
  arcana: /Домен магии|Изменение магии|Изучающий магию|Рассеивающее восстановление|Магическая искусность/i,
  knowledge:
    /Домен знания|Магия разума|Благословенные знания|Разум освобождённый|Божественное предзнание/i,
  grave:
    /Домен упокоения|Путь к могиле|Круговорот жизни и смерти|Страж на пороге смерти|Божественный жнец/i,
}

const PICKER_RE: Record<(typeof PATHS)[number], RegExp> = {
  arcana: /Домен магии/i,
  knowledge: /Домен знания/i,
  grave: /Домен упокоения/i,
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
  await installClericHarness(page, store)
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
  const levelInput = page.getByTestId('p24-m03c-level-cleric')
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
      hasText: /Изменение|Магия разума|Путь к могиле|Страж|Божественное предзнание|Использовать|…/,
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

test.describe('P24-M02B cleric book create-at matrix', () => {
  test.setTimeout(240_000)

  for (const level of LEVELS_MATRIX) {
    for (const pathSlug of PATHS) {
      const seed = `cleric${level}${pathSlug}`
      test(`create-at ${seed}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await createViaSeed(page, store, seed)
        await shot(page, `2024-${seed}-sheet`, project)

        await openFeatures(page, project)
        await expect(
          page.locator('.feature-card, .play-desk-features').getByText(FEATURE_RE[pathSlug]).first(),
        ).toBeVisible({ timeout: 12_000 })
        await shot(page, `2024-${seed}-features`, project)

        await openCombat(page, project)
        await shot(page, `2024-${seed}-combat`, project)
      })
    }
  }

  for (const level of KEEP_EXTRA) {
    for (const pathSlug of PATHS) {
      const seed = `cleric${level}${pathSlug}`
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

test.describe('P24-M02B cleric book — picker + create picks', () => {
  test.setTimeout(120_000)

  test('picker shows book domains', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installClericHarness(page, store)
    for (const pathSlug of PATHS) {
      await page.goto(
        `/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=cleric3${pathSlug}`,
      )
      await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
      await expect(page.getByText(PICKER_RE[pathSlug]).first()).toBeVisible({ timeout: 15_000 })
      await shot(page, `2024-picker-${pathSlug}`, project)
    }
  })

  test('arcana + knowledge book picks seeded', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installClericHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=cleric3arcana',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
    await expect(page.getByTestId('p24-m02b-cleric-book-picks')).toBeVisible({ timeout: 15_000 })
    await shot(page, '2024-arcana-student-picks', project)

    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=cleric3knowledge',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
    await expect(page.getByTestId('p24-m02b-cleric-book-picks')).toBeVisible({ timeout: 15_000 })
    await shot(page, '2024-knowledge-blessings-picks', project)
  })

  test('finish disabled with empty spells at L3 grave', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installClericHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=cleric3grave&e2eEmptySpells=1',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
    const finish = page.getByTestId('p24-m03-finish')
    await expect(finish).toBeDisabled({ timeout: 15_000 })
    await shot(page, '2024-finish-disabled-l3-grave', project)
  })
})

test.describe('P24-M02B cleric book — live create rollbacks', () => {
  test.setTimeout(180_000)

  test('rollback 3→2 drops subclass + arcana picks', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installClericHarness(page, store)
    await page.goto('/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=cleric3arcana')
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
    await expect(page.getByText(/Домен магии/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 2)
    await expect(page.getByText(/Домен магии/i)).toHaveCount(0)
    await expect(page.getByTestId('p24-m02b-cleric-book-picks')).toHaveCount(0)
    await shot(page, '2024-rollback-3-to-2-arcana', project)
  })

  test('rollback 11→10', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installClericHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=cleric11grave',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
    await setCreateLevel(page, 10)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-11-to-10-grave', project)
  })

  test('rollback 17→16 drops magical mastery', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installClericHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=cleric17arcana',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
    await expect(page.getByText(/Магическая искусность/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 16)
    await expect(page.getByText(/Магическая искусность/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-17-to-16-arcana', project)
  })

  test('rollback 20→19', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installClericHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=cleric20knowledge',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await dismissWelcome(page)
    await setCreateLevel(page, 19)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-20-to-19-knowledge', project)
  })
})

test.describe('P24-M02B cleric book — desk mechanics', () => {
  test.setTimeout(240_000)

  test('arcana modify magic + dispelling recovery', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'cleric6arcana')
    await openFeatures(page, project)
    await clickFeatureUse(page, /Изменение магии/)
    await shot(page, '2024-desk-modify-magic', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click()
    await dismissOpenDialogs(page)
    await clickFeatureUse(page, /Рассеивающее восстановление/)
    await shot(page, '2024-desk-dispelling-recovery', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)
  })

  test('knowledge mind magic + foreknowledge at 17', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'cleric6knowledge')
    await openFeatures(page, project)
    await clickFeatureUse(page, /Магия разума/)
    await shot(page, '2024-desk-mind-magic', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$/ }).click()
    await dismissOpenDialogs(page)

    await createViaSeed(page, createStore(), 'cleric17knowledge')
    await openFeatures(page, project)
    await clickFeatureUse(page, /Божественное предзнание/)
    await shot(page, '2024-desk-divine-foreknowledge', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)
  })

  test('grave path to the grave + sentinel', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'cleric6grave')
    await openFeatures(page, project)
    await clickFeatureUse(page, /Путь к могиле/)
    await shot(page, '2024-desk-path-to-grave', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Применить$/ }).click()
    await page.waitForTimeout(400)
    await openCombat(page, project)
    await shot(page, '2024-desk-path-to-grave-active', project)

    await openFeatures(page, project)
    await clickFeatureUse(page, /Страж на пороге смерти/)
    await shot(page, '2024-desk-sentinel', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)
  })
})