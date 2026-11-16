import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ARTIFACTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../artifacts/p24-m02b',
)

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

test.describe('P24-M02b subclasses 2024', () => {
  test('каталог подклассов; BM/алхимик/EK; флаг закрыт', async ({ page }, testInfo) => {
    await page.goto('/dev/p24-m02b-preview')
    await expect(page.getByTestId('p24-m02b-preview')).toBeVisible()
    await expect(page.getByTestId('p24-m02b-flag')).toContainText('закрыт')
    await expect(page.getByTestId('p24-m02b-count')).toContainText('76')

    await expect(
      page.getByTestId('p24-m02b-fighter__battlemaster-l3-resources'),
    ).toContainText('Кости превосходства')
    await expect(
      page.getByTestId('p24-m02b-fighter__battlemaster-l11-resources'),
    ).toContainText('5')

    await expect(
      page.getByTestId('p24-m02b-artificer__alchemist-l3-spells'),
    ).toContainText('healing-word')
    await expect(
      page.getByTestId('p24-m02b-fighter__eldritch-knight-l3-spells'),
    ).toContainText('⅓ кастер')

    const shot = path.join(ARTIFACTS, `subclasses-${testInfo.project.name}.png`)
    await page.screenshot({ path: shot, fullPage: true })

    await page.getByTestId('p24-m02b-fighter__battlemaster-l11').screenshot({
      path: path.join(ARTIFACTS, `battlemaster11-${testInfo.project.name}.png`),
    })
    await page.getByTestId('p24-m02b-artificer__alchemist-l11').screenshot({
      path: path.join(ARTIFACTS, `alchemist11-${testInfo.project.name}.png`),
    })
  })
})
