/**
 * P24-M02B-sorcerer live create-at shots for book subclasses (1440 / 390).
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

const BOOK_SEEDS = [
  'sorcerer3spellfire',
  'sorcerer3shadow',
  'sorcerer5spellfire',
  'sorcerer5shadow',
  'sorcerer6spellfire',
  'sorcerer6shadow',
  'sorcerer11spellfire',
  'sorcerer11shadow',
  'sorcerer14spellfire',
  'sorcerer14shadow',
  'sorcerer18spellfire',
  'sorcerer18shadow',
  'sorcerer20spellfire',
  'sorcerer20shadow',
] as const

/** Prefer store subclass id; UI labels may be off-screen on phone. */

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

async function createViaSeed(page: Page, store: HarnessStore, seed: string) {
  await installSorcererHarness(page, store)
  await page.goto(`/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=${seed}`)
  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  const finish = page.getByTestId('p24-m03-finish')
  // Seed fills metamagic/spells; if a chip quota remains, pick first options briefly.
  for (let i = 0; i < 8; i += 1) {
    if (await finish.isEnabled().catch(() => false)) break
    const chip = page.locator('button.sheet-chip').filter({ hasNot: page.locator('.is-on') }).first()
    if (await chip.isVisible().catch(() => false)) {
      await chip.click().catch(() => {})
      await page.waitForTimeout(150)
      continue
    }
    break
  }
  await expect(finish).toBeEnabled({ timeout: 45_000 })
  await finish.click()
  await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}/i, { timeout: 30_000 })
  await dismissWelcome(page)
}

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  // Clear only this project's sidecar so desktop/phone do not wipe each other.
  fs.writeFileSync(path.join(ARTIFACTS, `shots-md5-${projectOf(testInfo)}.txt`), '')
})

test.describe('P24-M02B sorcerer book create-at', () => {
  test.setTimeout(180_000)

  for (const seed of BOOK_SEEDS) {
    test(`create-at ${seed}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await createViaSeed(page, store, seed)
      await shot(page, `2024-${seed}-sheet`, project)

      // Subclass landed on the live sheet (catalog id / name).
      const char = [...store.characters.values()][0] as
        | { sheet?: { classes?: Array<{ subclass_catalog_id?: string | null; subclass_name?: string }> } }
        | undefined
      const subclassId = String(char?.sheet?.classes?.[0]?.subclass_catalog_id || '')
      if (seed.includes('spellfire')) {
        expect(subclassId).toBe('sorcerer__spellfire-sorcery')
      } else {
        expect(subclassId).toBe('sorcerer__shadow-sorcery')
      }

      const featuresBtn = page.getByRole('button', { name: /^Умения$|^Особенности$/ }).first()
      if (await featuresBtn.isVisible().catch(() => false)) {
        await featuresBtn.click()
        await page.waitForTimeout(400)
        await shot(page, `2024-${seed}-features`, project)
      }

    })
  }
})
