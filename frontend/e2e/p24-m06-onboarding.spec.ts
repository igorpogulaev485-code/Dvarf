/**
 * P24-M06 smoke: 2024 differences onboarding (DEV preview + product gate).
 * Product create route needs auth; onboarding UI is proven on /dev/p24-m06-preview
 * and wired into CreateCharacter2024Page for ?preview=1 after login.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = path.resolve(here, '../../artifacts/p24-m06')

function projectTag(projectName: string): '1440' | '390' {
  return projectName.includes('390') ? '390' : '1440'
}

async function shot(page: Page, stem: string, projectName: string) {
  const tag = projectTag(projectName)
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  const file = path.join(ARTIFACTS, `${stem}-${tag}.png`)
  await page.screenshot({ path: file, fullPage: false })
}

test.describe('P24-M06 onboarding + gate', () => {
  test('public create CTA hides 2024 while flag false', async ({ page }, testInfo) => {
    await page.goto('/dev/p24-m06-preview')
    await expect(page.getByTestId('p24-m06-preview')).toBeVisible()
    await expect(page.getByTestId('create-character-2024')).toHaveCount(0)
    await expect(page.getByTestId('create-character-2014')).toBeVisible()
    await expect(page.getByTestId('p24-m06-flag-off')).toBeVisible()
    // Dismiss auto-open dialog so the CTA panel is visible in the gate frame.
    const dialog = page.getByTestId('edition-2024-diff-dialog')
    if (await dialog.count()) {
      await page.getByRole('button', { name: 'Понятно' }).click()
      await expect(dialog).toHaveCount(0)
    }
    await shot(page, 'gate-no-2024-cta', testInfo.project.name)
  })

  test('preview shows 2024 differences onboarding', async ({ page }, testInfo) => {
    await page.goto('/dev/p24-m06-preview')
    await expect(page.getByTestId('p24-m06-preview')).toBeVisible()
    await expect(page.getByTestId('edition-hint-2024')).toBeVisible()
    await expect(page.getByTestId('edition-2024-diff-dialog')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('edition-2024-diff-list')).toBeVisible()
    for (const id of ['species', 'heroic', 'exhaustion', 'rest', 'mastery', 'surprise']) {
      await expect(page.getByTestId(`edition-2024-diff-${id}`)).toBeVisible()
    }
    await shot(page, 'onboarding-2024-diff', testInfo.project.name)
    await page.getByRole('button', { name: 'Понятно' }).click()
    await expect(page.getByTestId('edition-2024-diff-dialog')).toHaveCount(0)
    await expect(page.getByTestId('edition-2024-diff-reopen')).toBeVisible()
    await page.getByTestId('edition-2024-diff-reopen').click()
    await expect(page.getByTestId('edition-2024-diff-dialog')).toBeVisible()
    await shot(page, 'create-2024-after-diff', testInfo.project.name)
  })

  test('create 2024 without auth redirects to login (flag still closed)', async ({ page }) => {
    await page.goto('/characters/create?edition=2024')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('edition-2024-diff-dialog')).toHaveCount(0)
  })
})
