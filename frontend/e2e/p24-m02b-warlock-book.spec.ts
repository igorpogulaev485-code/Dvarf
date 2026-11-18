/**
 * P24-M02B-warlock live create-at / rollbacks / desk (1440 / 390).
 * Paths: Предтеча (vestige) + Нежить (undead).
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore, installWarlockHarness, type HarnessStore } from './support/warlock2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS =
  process.env.P24_M02B_WARLOCK_ARTIFACTS ||
  path.resolve(here, '../../artifacts/p24-m02b-warlock')

const PATHS = ['vestige', 'undead'] as const
const LEVELS_MATRIX = [3, 5, 11] as const
const KEEP_EXTRA = [6, 10, 14, 20] as const

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
  await installWarlockHarness(page, store)
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

async function openCompanions(page: Page, project: string) {
  await dismissOpenDialogs(page)
  if (project === '390') {
    await page.getByText(/Напарн/i).last().click({ force: true })
  } else {
    await page.getByRole('button', { name: /^Напарники$/ }).first().click({ force: true })
  }
  await page.waitForTimeout(500)
}

async function setCreateLevel(page: Page, level: number) {
  const levelInput = page.getByTestId('p24-m03c-level-warlock')
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
      hasText: /Аватар|Окончить|Испуг|Могил|Оболоч|Совершен|Мощь|Восстанов|Подобие|Использовать|…/,
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
  // Clear only this project's sidecar (desktop/phone run as separate workers).
  fs.writeFileSync(path.join(ARTIFACTS, `shots-md5-${projectOf(testInfo)}.txt`), '')
})

test.describe('P24-M02B warlock book create-at matrix', () => {
  test.setTimeout(240_000)

  for (const level of LEVELS_MATRIX) {
    for (const pathSlug of PATHS) {
      const seed = `warlock${level}${pathSlug}`
      test(`create-at ${seed}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await createViaSeed(page, store, seed)
        await shot(page, `2024-${seed}-sheet`, project)

        await openFeatures(page, project)
        if (pathSlug === 'vestige') {
          await expect(
            page
              .locator('.feature-card, .play-desk-features')
              .getByText(/Спутник-предтеча|Заклинания Предтечи|Мощь предтечи|Восстановление предтечи|Подобие жизни/i)
              .first(),
          ).toBeVisible({ timeout: 12_000 })
        } else {
          await expect(
            page
              .locator('.feature-card, .play-desk-features')
              .getByText(/Аватар ужаса|Заклинания покровителя-Нежити|Прикосновение могилы|Некротическая оболочка|Совершенный ужас/i)
              .first(),
          ).toBeVisible({ timeout: 12_000 })
        }
        await shot(page, `2024-${seed}-features`, project)

        await openCombat(page, project)
        await shot(page, `2024-${seed}-combat`, project)
      })
    }
  }

  for (const level of KEEP_EXTRA) {
    for (const pathSlug of PATHS) {
      const seed = `warlock${level}${pathSlug}`
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

test.describe('P24-M02B warlock book — picker + vestige picks', () => {
  test.setTimeout(120_000)

  test('picker shows Предтеча and Нежить', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installWarlockHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=warlock3vestige',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Предтеча/i).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, '2024-picker-vestige', project)

    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=warlock3undead',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Нежить/i).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, '2024-picker-undead', project)
  })

  test('vestige domain + companion type chips seeded', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installWarlockHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=warlock3vestige',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    const domainWar = page.getByRole('checkbox', { name: /^Война$/ })
    await expect(domainWar).toBeVisible({ timeout: 15_000 })
    await expect(domainWar).toBeChecked()
    const companionFiend = page.getByRole('checkbox', { name: /^Исчадие$/ })
    await expect(companionFiend).toBeVisible()
    await expect(companionFiend).toBeChecked()
    await shot(page, '2024-vestige-domain-type-picks', project)
  })

  test('finish disabled with empty spells at L3 undead', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installWarlockHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=warlock3undead&e2eEmptySpells=1',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    const finish = page.getByTestId('p24-m03-finish')
    await expect(finish).toBeDisabled({ timeout: 15_000 })
    await expect(page.getByText(/0\/\d+/).first()).toBeVisible({ timeout: 10_000 })
    await shot(page, '2024-finish-disabled-l3-undead', project)
  })
})

test.describe('P24-M02B warlock book — live create rollbacks', () => {
  test.setTimeout(180_000)

  test('rollback 3→2 drops subclass + vestige options', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installWarlockHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=warlock3vestige',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Предтеча/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('checkbox', { name: /^Война$/ })).toBeVisible()
    await setCreateLevel(page, 2)
    await expect(page.getByText(/Предтеча/i)).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: /^Война$/ })).toHaveCount(0)
    await expect(page.getByText(/0\/\d+/)).toHaveCount(0)
    await shot(page, '2024-rollback-3-to-2-vestige', project)
  })

  test('rollback 11→10', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installWarlockHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=warlock11undead',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await setCreateLevel(page, 10)
    await expect(page.getByText(/0\/\d+/)).toHaveCount(0)
    await shot(page, '2024-rollback-11-to-10-undead', project)
  })

  test('rollback 14→13 drops semblance / superior dread', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installWarlockHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=warlock14vestige',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Подобие жизни/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 13)
    await expect(page.getByText(/Подобие жизни/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-14-to-13-vestige', project)
  })

  test('rollback 20→19', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installWarlockHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=warlock20undead',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await setCreateLevel(page, 19)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-20-to-19-undead', project)
  })
})

test.describe('P24-M02B warlock book — desk mechanics', () => {
  test.setTimeout(240_000)

  test('vestige companion on desk + recovery at 10', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'warlock10vestige')

    await openFeatures(page, project)
    await expect(
      page.locator('.feature-card').getByText(/Спутник-предтеча/i).first(),
    ).toBeVisible({ timeout: 12_000 })
    await shot(page, '2024-desk-vestige-companion-feature', project)

    await openCompanions(page, project)
    const companion = page.getByText(/Спутник-предтеча|предтеч/i).first()
    if (await companion.isVisible().catch(() => false)) {
      await shot(page, '2024-desk-vestige-companion', project)
    } else {
      await shot(page, '2024-desk-vestige-companions-scene', project)
    }

    await openFeatures(page, project)
    await expect(
      page.locator('.feature-card').getByText(/Восстановление предтечи/i).first(),
    ).toBeVisible({ timeout: 12_000 })
    await clickFeatureUse(page, /Восстановление предтечи/)
    await shot(page, '2024-desk-vestige-recovery', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Применить$|^Отмена$/ }).first().click()
    await dismissOpenDialogs(page)
  })

  test('undead form of dread + grave + husk', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'warlock10undead')

    await openFeatures(page, project)
    await expect(page.locator('.feature-card').getByText(/Аватар ужаса/i).first()).toBeVisible({
      timeout: 12_000,
    })
    await clickFeatureUse(page, /Аватар ужаса/)
    await shot(page, '2024-desk-form-of-dread', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Применить$/ }).click()
    await page.waitForTimeout(400)
    await openCombat(page, project)
    await shot(page, '2024-desk-form-of-dread-active', project)

    await openFeatures(page, project)
    await clickFeatureUse(page, /Прикосновение могилы/)
    await shot(page, '2024-desk-grave-touched', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Применить$|^Отмена$/ }).first().click()
    await dismissOpenDialogs(page)

    await openFeatures(page, project)
    await clickFeatureUse(page, /Некротическая оболочка/)
    await shot(page, '2024-desk-necrotic-husk', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Применить$|^Отмена$/ }).first().click()
    await dismissOpenDialogs(page)
  })

  test('semblance + superior dread at 14', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'warlock14vestige')
    await openFeatures(page, project)
    await expect(page.locator('.feature-card').getByText(/Подобие жизни/i).first()).toBeVisible({
      timeout: 12_000,
    })
    await clickFeatureUse(page, /Подобие жизни/)
    await shot(page, '2024-desk-semblance-of-life', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Применить$|^Отмена$/ }).first().click()
    await dismissOpenDialogs(page)

    await createViaSeed(page, createStore(), 'warlock14undead')
    await openFeatures(page, project)
    await expect(page.locator('.feature-card').getByText(/Совершенный ужас/i).first()).toBeVisible({
      timeout: 12_000,
    })
    await shot(page, '2024-desk-superior-dread', project)
  })
})
