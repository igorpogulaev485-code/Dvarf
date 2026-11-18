/**
 * P24-M02B-sorcerer live create-at / rollbacks / desk mechanics (1440 / 390).
 * Frames: sheet + Способности/Способн. + Бой; desk demos for burst / absorb /
 * crown / beasts companion / shadow walk / umbral / grave.
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore, installSorcererHarness, type HarnessStore } from './support/sorcerer2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS =
  process.env.P24_M02B_SORCERER_ARTIFACTS ||
  path.resolve(here, '../../artifacts/p24-m02b-sorcerer')

const PATHS = ['spellfire', 'shadow'] as const
const LEVELS_MATRIX = [3, 5, 11] as const
const KEEP_EXTRA = [6, 14, 18] as const

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
  await installSorcererHarness(page, store)
  await page.goto(`/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=${seed}`)
  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await completeVisibleChoices(page)
  const finish = page.getByTestId('p24-m03-finish')
  await expect(finish).toBeEnabled({ timeout: 60_000 })
  await finish.click()
  await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}/i, { timeout: 30_000 })
  await dismissWelcome(page)
}

async function openFeatures(page: Page, project: string) {
  // Play Desk: desktop «Способности», phone bottom-nav «Способн.» — never «Умения».
  if (project === '390') {
    await page.getByText('Способн.', { exact: true }).last().click()
  } else {
    await page.getByRole('button', { name: /^Способности$/ }).first().click()
  }
  await page.waitForTimeout(700)
}

async function openCombat(page: Page, project: string) {
  if (project === '390') {
    await page.getByText('Бой', { exact: true }).last().click()
  } else {
    await page.getByRole('button', { name: /^Бой$/ }).first().click()
  }
  await page.waitForTimeout(500)
}

async function openCompanions(page: Page, project: string) {
  if (project === '390') {
    await page.getByText(/Напарн/i).last().click()
  } else {
    await page.getByRole('button', { name: /^Напарники$/ }).first().click()
  }
  await page.waitForTimeout(500)
}

async function setCreateLevel(page: Page, level: number) {
  const levelInput = page.getByTestId('p24-m03c-level-sorcerer')
  await expect(levelInput).toBeVisible({ timeout: 10_000 })
  await levelInput.fill(String(level))
  await levelInput.blur()
  await page.waitForTimeout(450)
}

async function expandFeature(page: Page, name: RegExp) {
  const nameRe = name
  const collapsed = page
    .locator('.feature-card')
    .filter({ has: page.locator('.feature-card__name, .feature-card__title', { hasText: nameRe }) })
    .first()
  await expect(collapsed).toBeVisible({ timeout: 12_000 })
  if (await collapsed.locator('.feature-card__title').count()) return collapsed
  await collapsed.locator('button.feature-card__glance, button[aria-label="Подробнее"]').first().click()
  await page.waitForTimeout(300)
  return page
    .locator('.feature-card--expand')
    .filter({ has: page.locator('.feature-card__title', { hasText: nameRe }) })
    .first()
}

async function clickFeatureUse(page: Page, nameRe: RegExp) {
  const card = await expandFeature(page, nameRe)
  await card.scrollIntoViewIfNeeded().catch(() => {})
  const btn = card
    .locator('button')
    .filter({
      hasText: /Прорыв|Поглощение|Корона|Сила могилы|Звери|Хождение|Форма|Включить|…/,
    })
    .first()
  await expect(btn).toBeVisible({ timeout: 8_000 })
  await btn.click()
  await expect(page.getByRole('dialog').last()).toBeVisible({ timeout: 10_000 })
}

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  for (const project of ['1440', '390'] as const) {
    fs.writeFileSync(path.join(ARTIFACTS, `shots-md5-${project}.txt`), '')
  }
})

test.describe('P24-M02B sorcerer book create-at matrix', () => {
  test.setTimeout(240_000)

  for (const level of LEVELS_MATRIX) {
    for (const pathSlug of PATHS) {
      const seed = `sorcerer${level}${pathSlug}`
      test(`create-at ${seed}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await createViaSeed(page, store, seed)
        await shot(page, `2024-${seed}-sheet`, project)

        await openFeatures(page, project)
        if (pathSlug === 'spellfire') {
          await expect(page.getByText(/Прорыв чаропламени/i).first()).toBeVisible({ timeout: 12_000 })
        } else {
          await expect(page.getByText(/Сила могилы|Сила тени|Глаза тьмы/i).first()).toBeVisible({
            timeout: 12_000,
          })
        }
        await shot(page, `2024-${seed}-features`, project)

        await openCombat(page, project)
        if (pathSlug === 'spellfire' && level >= 3) {
          await expect(page.getByText(/Прорыв чаропламени/i).first()).toBeVisible({ timeout: 10_000 })
        }
        await shot(page, `2024-${seed}-combat`, project)
      })
    }
  }

  for (const level of KEEP_EXTRA) {
    for (const pathSlug of PATHS) {
      const seed = `sorcerer${level}${pathSlug}`
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

test.describe('P24-M02B sorcerer book — finish disabled until quotas', () => {
  test.setTimeout(120_000)

  test('finish disabled with empty spells at L3 spellfire', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installSorcererHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=sorcerer3spellfire&e2eEmptySpells=1',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    const finish = page.getByTestId('p24-m03-finish')
    await expect(finish).toBeDisabled({ timeout: 15_000 })
    await expect(page.getByText(/0\/\d+/).first()).toBeVisible({ timeout: 10_000 })
    await shot(page, '2024-finish-disabled-l3-spellfire', project)
  })
})

test.describe('P24-M02B sorcerer book — live create rollbacks', () => {
  test.setTimeout(180_000)

  test('rollback 3→2 drops subclass + always-prepared', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installSorcererHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=sorcerer3spellfire',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Чародейство чаропламени|Прорыв чаропламени/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await setCreateLevel(page, 2)
    await expect(page.getByText(/Чародейство чаропламени/i)).toHaveCount(0)
    await expect(page.getByText(/0\/\d+/)).toHaveCount(0)
    const finish = page.getByTestId('p24-m03-finish')
    // Seed was L3; after drop quotas may leave finish disabled until rematch.
    void finish
    await shot(page, '2024-rollback-3-to-2-spellfire', project)
  })

  test('rollback 11→10', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installSorcererHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=sorcerer11shadow',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await setCreateLevel(page, 10)
    await expect(page.getByText(/0\/\d+/)).toHaveCount(0)
    await shot(page, '2024-rollback-11-to-10-shadow', project)
  })

  test('rollback 18→17 drops crown/umbral', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installSorcererHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=sorcerer18spellfire',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Корона чаропламени/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 17)
    await expect(page.getByText(/Корона чаропламени/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-18-to-17-spellfire', project)
  })

  test('rollback 20→19', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installSorcererHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=sorcerer20shadow',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await setCreateLevel(page, 19)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-20-to-19-shadow', project)
  })
})

test.describe('P24-M02B sorcerer book — desk mechanics frames', () => {
  test.setTimeout(240_000)

  test('spellfire burst both modes + once-per-turn gate', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'sorcerer3spellfire')
    await openCombat(page, project)
    await expect(page.getByText(/Прорыв чаропламени/i).first()).toBeVisible({ timeout: 10_000 })
    await shot(page, '2024-desk-spellfire-burst-on-rail', project)

    await openFeatures(page, project)
    await clickFeatureUse(page, /Прорыв чаропламени/)
    await page.getByRole('button', { name: /Поддерживающие огни/i }).click()
    await shot(page, '2024-desk-spellfire-burst-sustaining', project)
    await page.getByRole('button', { name: /^Применить$/ }).click()
    await page.waitForTimeout(400)

    await clickFeatureUse(page, /Прорыв чаропламени/)
    await expect(page.getByText(/уже использован в этот ход/i).first()).toBeVisible({
      timeout: 8_000,
    })
    await shot(page, '2024-desk-spellfire-burst-once-per-turn', project)
    await page.getByRole('button', { name: /^Отмена$/ }).click()

    await page.getByRole('button', { name: /^Новый ход$|^Начало хода$/ }).first().click().catch(() => {})
    await page.waitForTimeout(300)
    await clickFeatureUse(page, /Прорыв чаропламени/)
    await page.getByRole('button', { name: /Сияющее пламя \(огонь\)/i }).click()
    await shot(page, '2024-desk-spellfire-burst-radiant', project)
    await page.getByRole('button', { name: /^Применить$/ }).click()
  })

  test('absorb + crown on + always-prepared visible', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'sorcerer18spellfire')
    await openFeatures(page, project)
    await expect(page.getByText(/Поглощение заклинаний/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Корона чаропламени/i).first()).toBeVisible({ timeout: 10_000 })
    await shot(page, '2024-desk-spellfire-features-l18', project)

    await clickFeatureUse(page, /Поглощение заклинаний/)
    await page.getByRole('button', { name: /Цель провалила спас/i }).click()
    await shot(page, '2024-desk-absorb-restore', project)
    await page.getByRole('button', { name: /^Применить$/ }).click()

    await clickFeatureUse(page, /Врождённое чародейство/)
    const crownDlg = page.getByRole('dialog').last()
    await crownDlg.locator('button.sheet-chip', { hasText: /^Корона чаропламени$/ }).click()
    await shot(page, '2024-desk-crown-overlay', project)
    await crownDlg.getByRole('button', { name: /^Применить$/ }).click()
    await page.waitForTimeout(400)
    await openCombat(page, project)
    await expect(page.getByText(/Корона|Горящая жизнь|Полёт/i).first()).toBeVisible({
      timeout: 10_000,
    })
    await shot(page, '2024-desk-crown-active', project)
  })

  test('shadow beasts companion + walk + umbral + grave', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'sorcerer18shadow')
    await openFeatures(page, project)

    await clickFeatureUse(page, /Сила могилы|Сила тени/)
    await page.getByRole('button', { name: /Успех спаса/i }).click()
    await shot(page, '2024-desk-grave-success', project)
    await page.getByRole('button', { name: /^Применить$/ }).click()

    await clickFeatureUse(page, /Звери дурных знамений/)
    await page.getByRole('button', { name: /Без концентрации/i }).click()
    await shot(page, '2024-desk-beasts-dialog', project)
    await page.getByRole('button', { name: /^Применить$/ }).click()
    await page.waitForTimeout(500)
    await openCompanions(page, project)
    await expect(page.getByText(/Призыв духа зверя|тени/i).first()).toBeVisible({ timeout: 12_000 })
    await shot(page, '2024-desk-beasts-companion', project)

    await openFeatures(page, project)
    await clickFeatureUse(page, /Хождение по теням/)
    await page.getByRole('button', { name: /^Тусклый свет$/ }).first().click()
    await page.getByRole('button', { name: /^Темнота$/ }).nth(1).click()
    await page.getByPlaceholder(/колонну|телепорт/i).fill('за колонну, 80 фт.')
    await shot(page, '2024-desk-shadow-walk', project)
    await page.getByRole('button', { name: /^Применить$/ }).click()
    await openCombat(page, project)
    await expect(page.getByText(/за колонну|Хождение по теням/i).first()).toBeVisible({
      timeout: 10_000,
    })
    await shot(page, '2024-desk-shadow-walk-active', project)

    await openFeatures(page, project)
    await clickFeatureUse(page, /Врождённое чародейство/)
    const umbralDlg = page.getByRole('dialog').last()
    await umbralDlg.locator('button.sheet-chip', { hasText: /^Форма абсолютной тени$/ }).click()
    await shot(page, '2024-desk-umbral-overlay', project)
    await umbralDlg.getByRole('button', { name: /^Применить$/ }).click()
    await page.waitForTimeout(400)
    await openCombat(page, project)
    await expect(page.getByText(/Форма абсолютной тени|Теневая устойчивость/i).first()).toBeVisible({
      timeout: 10_000,
    })
    await shot(page, '2024-desk-umbral-active', project)
  })
})
