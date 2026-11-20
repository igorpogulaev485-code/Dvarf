/**
 * P24-M02B-artificer live create-at / rollbacks / desk (1440 / 390).
 * Paths: Alchemist, Armorer, Artillerist, Battle Smith, Cartographer, Reanimator.
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore, installArtificerHarness, type HarnessStore } from './support/artificer2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS =
  process.env.P24_M02B_ARTIFICER_ARTIFACTS ||
  path.resolve(here, '../../artifacts/p24-m02b-artificer')

const PATHS = [
  'alchemist',
  'armorer',
  'artillerist',
  'battlesmith',
  'cartographer',
  'reanimator',
] as const

const LEVELS_MATRIX = [3, 5, 11] as const

const FEATURE_RE: Record<(typeof PATHS)[number], RegExp> = {
  alchemist: /Алхимик|Экспериментальный эликсир|Знаток алхимии|Восстанавливающие реагенты/i,
  armorer: /Бронник|Арканный доспех|Модель доспеха|Дредноут/i,
  artillerist: /Артиллерист|Мистическая пушка/i,
  battlesmith: /Боевой кузнец|Стальной защитник|Магический импульс/i,
  cartographer: /Картограф|Атлас приключений|Магия карты/i,
  reanimator:
    /Реаниматор|Реанимированный спутник|Оживляющий разряд|Чуждые модификации|Отточенная реанимация/i,
}

const PICKER_RE: Record<(typeof PATHS)[number], RegExp> = {
  alchemist: /Алхимик/i,
  armorer: /Бронник/i,
  artillerist: /Артиллерист/i,
  battlesmith: /Боевой кузнец/i,
  cartographer: /Картограф/i,
  reanimator: /Реаниматор/i,
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
  await installArtificerHarness(page, store)
  await page.goto(`/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=${seed}`)
  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await completeVisibleChoices(page)
  const finish = page.getByTestId('p24-m03-finish')
  await expect(finish).toBeEnabled({ timeout: 60_000 })
  await finish.click()
  try {
    await page.waitForURL(/\/characters\/[0-9a-f-]{36}/i, { timeout: 45_000 })
  } catch {
    const issues = page.getByTestId('p24-m03-issues')
    const banner = await page
      .locator('.create-2024__issues, [role="alert"], [role="status"]')
      .allTextContents()
    throw new Error(
      `finish did not navigate; issues=${await issues.textContent().catch(() => '')}; banner=${banner.join(' | ')}`,
    )
  }
  await dismissWelcome(page)
}

async function dismissOpenDialogs(page: Page) {
  for (let i = 0; i < 3; i += 1) {
    const dlg = page.getByRole('dialog').last()
    if (!(await dlg.isVisible().catch(() => false))) return
    const cancel = dlg.getByRole('button', { name: /^Отмена$|^Закрыть$|^Готово$/ })
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
  const levelInput = page.getByTestId('p24-m03c-level-artificer')
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

async function clickFeatureUse(page: Page, nameRe: RegExp, buttonRe: RegExp) {
  const card = await expandFeature(page, nameRe)
  await card.scrollIntoViewIfNeeded().catch(() => {})
  const btn = card.locator('button').filter({ hasText: buttonRe }).first()
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
  } else {
    await card.locator('button').filter({ hasText: /…/ }).first().click()
  }
  await expect(page.getByRole('dialog').last()).toBeVisible({ timeout: 10_000 })
}

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACTS, `shots-md5-${projectOf(testInfo)}.txt`), '')
})

test.describe('P24-M02B artificer book create-at matrix', () => {
  test.setTimeout(300_000)

  for (const level of LEVELS_MATRIX) {
    for (const pathSlug of PATHS) {
      const seed = `artificer${level}${pathSlug}`
      test(`create-at ${seed}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await createViaSeed(page, store, seed)
        await shot(page, `2024-${seed}-sheet`, project)

        await openFeatures(page, project)
        await expect(
          page.locator('.feature-card, .play-desk-features').getByText(FEATURE_RE[pathSlug]).first(),
        ).toBeVisible({ timeout: 15_000 })
        await expect(page.getByText(/Оживлённый спутник/i)).toHaveCount(0)
        await shot(page, `2024-${seed}-features`, project)

        await openCombat(page, project)
        await shot(page, `2024-${seed}-combat`, project)
      })
    }
  }
})

test.describe('P24-M02B artificer — picker + finish gate', () => {
  test.setTimeout(180_000)

  test('picker shows all six book paths', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installArtificerHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=artificer3alchemist',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    for (const pathSlug of PATHS) {
      await expect(page.getByText(PICKER_RE[pathSlug]).first()).toBeVisible({ timeout: 15_000 })
    }
    await expect(page.getByText(/Оживлённый спутник/i)).toHaveCount(0)
    await shot(page, '2024-picker-six-paths', project)
  })

  test('finish disabled with empty spells at L3 alchemist', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installArtificerHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=artificer3alchemist&e2eEmptySpells=1',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    const finish = page.getByTestId('p24-m03-finish')
    await expect(finish).toBeDisabled({ timeout: 15_000 })
    await shot(page, '2024-finish-disabled-l3-alchemist', project)
  })
})

test.describe('P24-M02B artificer — live create rollbacks', () => {
  test.setTimeout(240_000)

  test('rollback 3→2 drops reanimator', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installArtificerHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=artificer3reanimator',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Реаниматор/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 2)
    await expect(page.getByText(/Реаниматор/i)).toHaveCount(0)
    await expect(page.getByText(/Оживлённый спутник/i)).toHaveCount(0)
    await shot(page, '2024-rollback-3-to-2-reanimator', project)
  })

  test('rollback 5→4 drops strange mods', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installArtificerHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=artificer5reanimator',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Чуждые модификации/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 4)
    await expect(page.getByText(/Чуждые модификации/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-5-to-4-reanimator', project)
  })

  test('rollback 9→8 alchemist reagents', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installArtificerHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=artificer9alchemist',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Восстанавливающие реагенты/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await setCreateLevel(page, 8)
    await expect(page.getByText(/Восстанавливающие реагенты/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-9-to-8-alchemist', project)
  })

  test('rollback 15→14 artillerist second cannon feature', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installArtificerHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=artificer15artillerist',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Укреплённая позиция/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 14)
    await expect(page.getByText(/Укреплённая позиция/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-15-to-14-artillerist', project)
  })
})

test.describe('P24-M02B artificer — desk panels', () => {
  test.setTimeout(360_000)

  test('alchemist elixir + artillerist cannon + reanimator companion', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'artificer5alchemist')
    await openFeatures(page, project)
    await clickFeatureUse(page, /Экспериментальный эликсир/i, /^Эликсир/)
    await expect(page.getByTestId('artificer-dialog-elixirs')).toBeVisible({ timeout: 10_000 })
    await shot(page, '2024-desk-elixirs', project)
    await dismissOpenDialogs(page)

    await createViaSeed(page, store, 'artificer5artillerist')
    await openFeatures(page, project)
    await clickFeatureUse(page, /Мистическая пушка/i, /^Пушка/)
    await expect(page.getByTestId('artificer-dialog-cannon')).toBeVisible({ timeout: 10_000 })
    await shot(page, '2024-desk-cannon', project)
    await dismissOpenDialogs(page)

    await createViaSeed(page, store, 'artificer5reanimator')
    await openFeatures(page, project)
    await expect(page.getByText(/Реанимированный спутник/i).first()).toBeVisible({ timeout: 12_000 })
    await expect(page.getByText(/Оживлённый спутник/i)).toHaveCount(0)
    await clickFeatureUse(page, /Реанимированный спутник/i, /^Спутник/)
    await expect(page.getByTestId('artificer-dialog-reanimator')).toBeVisible({ timeout: 10_000 })
    await shot(page, '2024-desk-reanimator', project)
    await openCombat(page, project)
    await expect(
      page.getByText(/Реанимированный спутник/i).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 10_000 })
    await shot(page, '2024-desk-reanimator-combat', project)
  })
})
