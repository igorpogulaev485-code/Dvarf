/**
 * P24-M06 smoke: 2024 differences onboarding + open flag CTA.
 * Product create route needs auth; onboarding UI is proven on /dev/p24-m06-preview
 * and wired into CreateCharacter2024Page for ?edition=2024 (preview=1 still ok).
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

test.describe('P24-M06 onboarding + open gate', () => {
  test('public create CTA: one button → edition picker while flag open', async ({
    page,
  }, testInfo) => {
    await page.goto('/dev/p24-m06-preview')
    await expect(page.getByTestId('p24-m06-preview')).toBeVisible()
    // Dismiss auto-open dialog so the CTA panel is visible in the gate frame.
    const dialog = page.getByTestId('edition-2024-diff-dialog')
    if (await dialog.count()) {
      await page.getByRole('button', { name: 'Понятно' }).click()
      await expect(dialog).toHaveCount(0)
    }
    await expect(page.getByTestId('create-character-open')).toBeVisible()
    await expect(page.getByTestId('create-character-2024')).toHaveCount(0)
    await page.getByTestId('create-character-open').click()
    await expect(page.getByTestId('create-character-edition')).toBeVisible()
    await expect(page.getByTestId('create-character-2014')).toBeVisible()
    await expect(page.getByTestId('create-character-2024')).toBeVisible()
    await expect(page.getByTestId('p24-m06-flag-on')).toContainText('открыт')
    await shot(page, 'gate-with-2024-cta', testInfo.project.name)
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
    // Sheet rise is transform-only; wait for paint before frame + opacity probe.
    await page.waitForTimeout(350)
    const solid = await page.locator('.ui-dialog').evaluate((el) => {
      const cs = getComputedStyle(el)
      const bg = cs.backgroundColor
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/)
      const alpha = m?.[4] === undefined ? 1 : Number(m[4])
      const r = el.getBoundingClientRect()
      return {
        bg,
        opacity: Number(cs.opacity),
        alpha,
        text: el.textContent || '',
        top: r.top,
        height: r.height,
        vh: window.innerHeight,
      }
    })
    expect(solid.opacity).toBe(1)
    expect(solid.alpha).toBe(1)
    expect(solid.text).toContain('правилах 2014')
    expect(solid.text).not.toContain('L-21')
    expect(solid.text).toContain('говорим «вид»')
    // Phone wide sheet = edge-to-edge solid paper (no page peek above).
    if (testInfo.project.name.includes('390')) {
      expect(solid.height / solid.vh).toBeGreaterThan(0.95)
      expect(solid.top).toBeLessThanOrEqual(2)
    }
    await shot(page, 'onboarding-2024-diff', testInfo.project.name)

    // Darker account theme (чернила) — sheet must stay opaque kit --card.
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'int'))
    await page.waitForTimeout(100)
    const solidDark = await page.locator('.ui-dialog').evaluate((el) => {
      const cs = getComputedStyle(el)
      const bg = cs.backgroundColor
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/)
      const alpha = m?.[4] === undefined ? 1 : Number(m[4])
      return { opacity: Number(cs.opacity), alpha }
    })
    expect(solidDark.opacity).toBe(1)
    expect(solidDark.alpha).toBe(1)
    await shot(page, 'onboarding-2024-diff-ink', testInfo.project.name)

    await page.getByRole('button', { name: 'Понятно' }).click()
    await expect(page.getByTestId('edition-2024-diff-dialog')).toHaveCount(0)
    await expect(page.getByTestId('edition-2024-diff-reopen')).toBeVisible()
    await page.getByTestId('edition-2024-diff-reopen').click()
    await expect(page.getByTestId('edition-2024-diff-dialog')).toBeVisible()
    await shot(page, 'create-2024-after-diff', testInfo.project.name)
  })

  test('create 2024 without auth redirects to login (flag open, no preview needed)', async ({
    page,
  }) => {
    await page.goto('/characters/create?edition=2024')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('edition-2024-diff-dialog')).toHaveCount(0)
  })

  test('legacy ?preview=1 still opens create route when flag open', async ({ page }) => {
    await page.goto('/characters/create?edition=2024&preview=1')
    await expect(page).toHaveURL(/\/login/)
  })
})
