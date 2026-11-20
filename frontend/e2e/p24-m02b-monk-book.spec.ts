/**
 * P24-M02B-monk live create-at / rollbacks / desk (1440 / 390).
 * Path: Мистический воин (monk__warrior-of-the-mystic-arts).
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore, installMonkHarness, type HarnessStore } from './support/monk2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS =
  process.env.P24_M02B_MONK_ARTIFACTS || path.resolve(here, '../../artifacts/p24-m02b-monk')

const LEVELS_MATRIX = [3, 5, 11] as const
const KEEP_EXTRA = [6, 10, 17, 20] as const

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
  await installMonkHarness(page, store)
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
  const levelInput = page.getByTestId('p24-m03c-level-monk')
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
    .filter({ hasText: /Сосредоточенность|Стиль|Сфокусированный|Улучш|Ошеломить|Шквал|Метаболизм|Использовать|…/ })
    .first()
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
  } else {
    // Glance/expand already open — click any primary use control, else re-open via card button.
    const fallback = card.locator('button').last()
    await fallback.click()
  }
  await expect(page.getByRole('dialog').last()).toBeVisible({ timeout: 10_000 })
}

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  for (const project of ['1440', '390'] as const) {
    fs.writeFileSync(path.join(ARTIFACTS, `shots-md5-${project}.txt`), '')
  }
})

test.describe('P24-M02B monk mystic arts create-at matrix', () => {
  test.setTimeout(240_000)

  for (const level of LEVELS_MATRIX) {
    const seed = `monk${level}mystic`
    test(`create-at ${seed}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await createViaSeed(page, store, seed)
      await shot(page, `2024-${seed}-sheet`, project)

      await openFeatures(page, project)
      await expect(
        page
          .locator('.feature-card, .play-desk-features')
          .getByText(/Сотворение заклинаний|Мистическая сосредоточенность|Стиль мистического воина|Сфокусированный удар|Улучшенный стиль/i)
          .first(),
      ).toBeVisible({ timeout: 12_000 })
      await shot(page, `2024-${seed}-features`, project)

      await openCombat(page, project)
      await shot(page, `2024-${seed}-combat`, project)
    })
  }

  for (const level of KEEP_EXTRA) {
    const seed = `monk${level}mystic`
    test(`create-at keep ${seed}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await createViaSeed(page, store, seed)
      await shot(page, `2024-${seed}-sheet`, project)
      await openFeatures(page, project)
      await expect(
        page
          .locator('.feature-card, .play-desk-features')
          .getByText(/Сотворение заклинаний|Мистическая сосредоточенность|Стиль мистического воина|Сфокусированный удар|Улучшенный стиль/i)
          .first(),
      ).toBeVisible({ timeout: 12_000 })
      await shot(page, `2024-${seed}-features`, project)
      await openCombat(page, project)
      await shot(page, `2024-${seed}-combat`, project)
    })
  }
})

test.describe('P24-M02B monk — picker + finish quotas', () => {
  test.setTimeout(120_000)

  test('picker shows Мистический воин; finish disabled without spells', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installMonkHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=monk3mystic&e2eEmptySpells=1',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Мистический воин/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Арканный воин/i)).toHaveCount(0)
    const finish = page.getByTestId('p24-m03-finish')
    await expect(finish).toBeDisabled({ timeout: 15_000 })
    await shot(page, '2024-finish-disabled-l3-mystic', project)
  })
})

test.describe('P24-M02B monk mystic — live create rollbacks', () => {
  test.setTimeout(180_000)

  test('rollback 3→2 drops subclass + spell quotas', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installMonkHarness(page, store)
    await page.goto('/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=monk3mystic')
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Мистический воин/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 2)
    await expect(page.getByText(/Мистический воин/i)).toHaveCount(0)
    await expect(page.getByText(/0\/\d+/)).toHaveCount(0)
    await shot(page, '2024-rollback-3-to-2-mystic', project)
  })

  test('rollback 11→10', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installMonkHarness(page, store)
    await page.goto('/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=monk11mystic')
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await setCreateLevel(page, 10)
    await expect(page.getByText(/Сфокусированный удар/i)).toHaveCount(0)
    await expect(page.getByText(/0\/\d+/)).toHaveCount(0)
    await shot(page, '2024-rollback-11-to-10-mystic', project)
  })

  test('rollback 17→16 drops improved style', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installMonkHarness(page, store)
    await page.goto('/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=monk17mystic')
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Улучшенный стиль мистического воина/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await setCreateLevel(page, 16)
    await expect(page.getByText(/Улучшенный стиль мистического воина/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-17-to-16-mystic', project)
  })

  test('rollback 20→19', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installMonkHarness(page, store)
    await page.goto('/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=monk20mystic')
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await setCreateLevel(page, 19)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-20-to-19-mystic', project)
  })
})

test.describe('P24-M02B monk mystic — desk mechanics', () => {
  test.setTimeout(240_000)

  test('mystic focus slot↔points + fighting style + focused strike', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'monk11mystic')

    await openFeatures(page, project)
    await expect(
      page.locator('.feature-card').getByText(/Мистическая сосредоточенность/i).first(),
    ).toBeVisible({ timeout: 12_000 })
    await clickFeatureUse(page, /Мистическая сосредоточенность/)
    await page.getByRole('button', { name: /Ячейка → очки/i }).click()
    await page.getByRole('button', { name: /^1 кр\.$/ }).click()
    await page.getByRole('dialog').last().getByRole('button', { name: /^Применить$/ }).click()
    await dismissOpenDialogs(page)
    await shot(page, '2024-desk-mystic-focus-slot-to-points', project)

    await openFeatures(page, project)
    await clickFeatureUse(page, /Мистическая сосредоточенность/)
    await page.getByRole('button', { name: /Очки → ячейка/i }).click()
    await page.getByRole('button', { name: /1 кр\./i }).first().click()
    await page.getByRole('dialog').last().getByRole('button', { name: /^Применить$/ }).click()
    await dismissOpenDialogs(page)
    await shot(page, '2024-desk-mystic-focus-points-to-slot', project)

    await openFeatures(page, project)
    await clickFeatureUse(page, /Стиль мистического воина/)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Применить$/ }).click()
    await dismissOpenDialogs(page)
    await shot(page, '2024-desk-mystic-fighting-style', project)

    await openFeatures(page, project)
    await clickFeatureUse(page, /Ошеломляющий удар/)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Применить$/ }).click()
    await dismissOpenDialogs(page)
    await shot(page, '2024-desk-focused-strike-via-stun', project)
  })

  test('improved style at 17 via flurry replace', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'monk17mystic')
    await openFeatures(page, project)
    await expect(
      page.locator('.feature-card').getByText(/Улучшенный стиль мистического воина/i).first(),
    ).toBeVisible({ timeout: 12_000 })
    await clickFeatureUse(page, /Улучшенный стиль мистического воина/)
    await page.getByRole('button', { name: /^1 кр\.$/ }).click()
    await page.getByRole('dialog').last().getByRole('button', { name: /^Применить$/ }).click()
    await dismissOpenDialogs(page)
    await shot(page, '2024-desk-improved-mystic-style', project)
  })
})
