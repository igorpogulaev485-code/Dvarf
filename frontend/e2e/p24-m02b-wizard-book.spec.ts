/**
 * P24-M02B-wizard live create-at shots for book subclasses (1440 / 390).
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

const BOOK_SEEDS = [
  'wizard3conjurer',
  'wizard3enchanter',
  'wizard3necromancer',
  'wizard3transmuter',
  'wizard3bladesinger',
  'wizard5conjurer',
  'wizard6bladesinger',
  'wizard11enchanter',
  'wizard14transmuter',
  'wizard20bladesinger',
] as const

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
  // Feature-choice chips in leveling: pick first available option until finish enables.
  for (let i = 0; i < 12; i += 1) {
    const finish = page.getByTestId('p24-m03-finish')
    if (await finish.isEnabled().catch(() => false)) return
    const chip = page.locator('button.sheet-chip').filter({ hasNot: page.locator('.is-on') }).first()
    if (await chip.isVisible().catch(() => false)) {
      await chip.click().catch(() => {})
      await page.waitForTimeout(200)
      continue
    }
    const next = page.getByRole('button', { name: /^Далее$|^Продолжить$/ }).first()
    if (await next.isEnabled().catch(() => false)) {
      await next.click().catch(() => {})
      await page.waitForTimeout(200)
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

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  for (const project of ['1440', '390'] as const) {
    fs.writeFileSync(path.join(ARTIFACTS, `shots-md5-${project}.txt`), '')
  }
})

test.describe('P24-M02B wizard book create-at', () => {
  test.setTimeout(180_000)

  for (const seed of BOOK_SEEDS) {
    test(`create-at ${seed}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await createViaSeed(page, store, seed)
      await shot(page, `2024-${seed}-sheet`, project)

      // Open features scene when available
      const featuresBtn = page.getByRole('button', { name: /^Умения$|^Особенности$/ }).first()
      if (await featuresBtn.isVisible().catch(() => false)) {
        await featuresBtn.click()
        await page.waitForTimeout(400)
        await shot(page, `2024-${seed}-features`, project)
      }
    })
  }
})
