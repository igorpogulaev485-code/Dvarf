import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = path.resolve(here, '../../artifacts/p24-m02b')

test.describe('P24-M02b subclass automation preview', () => {
  test('catalog + key subclass cards', async ({ page }) => {
    await page.goto('/dev/p24-m02b-preview')
    await expect(page.getByTestId('p24-m02b-preview')).toBeVisible()
    await expect(page.getByTestId('p24-m02b-flag')).toContainText('закрыт')
    await expect(page.getByTestId('p24-m02b-count')).toContainText('76')

    await expect(
      page.getByTestId('p24-m02b-cleric__light-domain-l6-resources'),
    ).toContainText('Ограждающая вспышка')
    await expect(
      page.getByTestId('p24-m02b-fighter__champion-l15-calcs'),
    ).toContainText('crit_threshold=18')
    await expect(
      page.getByTestId('p24-m02b-wizard__abjurer-l6-resources'),
    ).toContainText('Волшебный щит')
    await expect(
      page.getByTestId('p24-m02b-warlock__celestial-patron-l5-resources'),
    ).toContainText('Лечащий свет')
    await expect(
      page.getByTestId('p24-m02b-fighter__battlemaster-l11-resources'),
    ).toContainText('Кости превосходства')
    await expect(
      page.getByTestId('p24-m02b-artificer__alchemist-l11-spells'),
    ).toContainText('healing-word')
    await expect(
      page.getByTestId('p24-m02b-fighter__eldritch-knight-l3-spells'),
    ).toContainText('⅓ кастер')
  })

  for (const [slug, level, fileBase] of [
    ['cleric__light-domain', 6, 'light-cleric6'],
    ['fighter__champion', 15, 'champion15'],
    ['wizard__abjurer', 6, 'abjurer6'],
    ['warlock__celestial-patron', 5, 'celestial5'],
  ] as const) {
    test(`screenshot ${fileBase} desktop+phone`, async ({ page }, testInfo) => {
      await page.goto('/dev/p24-m02b-preview')
      const card = page.getByTestId(`p24-m02b-${slug}-l${level}`)
      await expect(card).toBeVisible()
      const width = testInfo.project.name.includes('390') ? 390 : 1440
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      await card.screenshot({
        path: path.join(ARTIFACTS, `${fileBase}-${width === 390 ? 'phone-390' : 'desktop-1440'}.png`),
      })
    })
  }
})
