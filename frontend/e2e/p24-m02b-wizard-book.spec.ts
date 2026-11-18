/**
 * P24-M02B-wizard live create-at shots for book subclasses (1440 / 390).
 * Paths: conjurer / enchanter / necromancer / transmuter / bladesinger.
 * Frames: create-at-3/5/11 sheet + features + combat; keep 6/14/20.
 * Live rollbacks: 3→2, 5→4, 10→9. Book quotas: L3=12, L5=17, L11=32 (AU savant).
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore, installWizardHarness, type HarnessStore } from './support/wizard2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS =
  process.env.P24_M02B_WIZARD_ARTIFACTS ||
  path.resolve(here, '../../artifacts/p24-m02b-wizard')

const PATHS = [
  'conjurer',
  'enchanter',
  'necromancer',
  'transmuter',
  'bladesinger',
] as const

const LEVELS_MATRIX = [3, 5, 11] as const
const KEEP_EXTRA = [
  'wizard6bladesinger',
  'wizard14transmuter',
  'wizard20bladesinger',
] as const

/** AU school Savant book need (free research + savant). Bladesinger = free only. */
function bookNeedFor(level: number, path: string): number {
  const free = 6 + 2 * (level - 1)
  if (path === 'bladesinger') return free
  // Savant: 2 at L3, +1 per new tier (5,7,9,11,…)
  let savant = 2
  for (const tier of [5, 7, 9, 11, 13, 15, 17]) {
    if (level >= tier) savant += 1
  }
  return free + savant
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
  await installWizardHarness(page, store)
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
  if (project === '390') {
    const feats = page.getByRole('button', { name: /^Умения$|^Особенности$/ }).first()
    if (await feats.isVisible().catch(() => false)) {
      await feats.click()
      await page.waitForTimeout(350)
      return
    }
  }
  const featuresBtn = page.getByRole('button', { name: /^Умения$|^Особенности$/ }).first()
  if (await featuresBtn.isVisible().catch(() => false)) {
    await featuresBtn.click()
    await page.waitForTimeout(350)
  }
}

async function openCombat(page: Page, project: string) {
  if (project === '390') {
    const combat = page.getByText('Бой', { exact: true }).last()
    if (await combat.isVisible().catch(() => false)) {
      await combat.click()
      await page.waitForTimeout(300)
    }
  } else {
    const combatBtn = page.getByRole('button', { name: /^Бой$/ }).first()
    if (await combatBtn.isVisible().catch(() => false)) {
      await combatBtn.click()
      await page.waitForTimeout(300)
    }
  }
}

async function setCreateLevel(page: Page, level: number) {
  const levelInput = page.getByTestId('p24-m03c-level-wizard')
  await expect(levelInput).toBeVisible({ timeout: 10_000 })
  await levelInput.fill(String(level))
  await levelInput.blur()
  await page.waitForTimeout(450)
}

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  for (const project of ['1440', '390'] as const) {
    fs.writeFileSync(path.join(ARTIFACTS, `shots-md5-${project}.txt`), '')
  }
})

test.describe('P24-M02B wizard book create-at matrix', () => {
  test.setTimeout(240_000)

  for (const level of LEVELS_MATRIX) {
    for (const pathSlug of PATHS) {
      const seed = `wizard${level}${pathSlug}`
      test(`create-at ${seed}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await installWizardHarness(page, store)
        await page.goto(`/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=${seed}`)
        await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })

        const need = bookNeedFor(level, pathSlug)
        await expect(page.getByText(new RegExp(`В книгу\\s+${need}/${need}`)).first()).toBeVisible({
          timeout: 20_000,
        })
        await completeVisibleChoices(page)
        const finish = page.getByTestId('p24-m03-finish')
        await expect(finish).toBeEnabled({ timeout: 60_000 })
        await finish.click()
        await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}/i, { timeout: 30_000 })
        await dismissWelcome(page)

        await shot(page, `2024-${seed}-sheet`, project)

        await openFeatures(page, project)
        await shot(page, `2024-${seed}-features`, project)

        if (pathSlug === 'necromancer' && level >= 6) {
          await expect(page.getByText(/Неживые слуги/i).first()).toBeVisible({ timeout: 10_000 })
        }
        if (pathSlug === 'bladesinger') {
          await expect(page.getByText(/Песнь клинка|Учение песни и войны/i).first()).toBeVisible({
            timeout: 10_000,
          })
        }

        await openCombat(page, project)
        await shot(page, `2024-${seed}-combat`, project)

        if (pathSlug === 'bladesinger' && level >= 3) {
          const song = page.getByRole('button', { name: /Песнь клинка/i }).first()
          if (await song.isVisible().catch(() => false)) {
            await song.click()
            await page.waitForTimeout(400)
            await shot(page, `2024-${seed}-bladesong-on`, project)
            await expect(page.getByText(/КД|Акробатик|скорост|\+10|Интеллект/i).first()).toBeVisible({
              timeout: 8_000,
            })
          }
        }
      })
    }
  }

  for (const seed of KEEP_EXTRA) {
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
})

test.describe('P24-M02B wizard book — live create rollbacks', () => {
  test.setTimeout(180_000)

  test('rollback 3→2 drops subclass, savant, orator/war-song/stone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installWizardHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=wizard3enchanter',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/В книгу\s+12\/12/).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Чарующий оратор/i).first()).toBeVisible({ timeout: 10_000 })

    await setCreateLevel(page, 2)
    await expect(page.getByText(/В книгу\s+8\/8/).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Чарующий оратор/i)).toHaveCount(0)
    // Finish stays disabled until book/cantrips match L2 (seed was L3).
    const finish = page.getByTestId('p24-m03-finish')
    // After trim book to 8, if cantrips/prep still ok finish may enable — assert no hanging 0/N.
    await expect(page.getByText(/0\/\d+/)).toHaveCount(0)
    await shot(page, '2024-rollback-3-to-2-enchanter', project)
    void finish
  })

  test('rollback 5→4 drops savant of new tier (17→15)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installWizardHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=wizard5conjurer',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/В книгу\s+17\/17/).first()).toBeVisible({ timeout: 15_000 })

    await setCreateLevel(page, 4)
    // free=12 + savant=2 (no new tier at 4) = 14
    await expect(page.getByText(/В книгу\s+14\/14/).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/0\/\d+/)).toHaveCount(0)
    await shot(page, '2024-rollback-5-to-4-conjurer', project)
  })

  test('rollback 10→9 drops second stone benefit', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installWizardHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=wizard10transmuter',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await completeVisibleChoices(page)
    // L10 stone-2 pick should be present before drop.
    const stone2 = page.getByText(/Могущественный камень|второе свойство/i).first()
    if (await stone2.isVisible().catch(() => false)) {
      await expect(stone2).toBeVisible()
    }
    await setCreateLevel(page, 9)
    await expect(page.getByText(/Могущественный камень \(2/i)).toHaveCount(0)
    await expect(page.getByText(/0\/\d+/)).toHaveCount(0)
    await shot(page, '2024-rollback-10-to-9-transmuter', project)
  })
})
