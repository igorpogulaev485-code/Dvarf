import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ARTIFACTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../artifacts/p24-m02a',
)

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

test.describe('P24-M02a classes 2024', () => {
  test('воин 5 + волшебник 5; флаг закрыт; surge≠magic', async ({ page }, testInfo) => {
    await page.goto('/dev/p24-m02a-preview')
    await expect(page.getByTestId('p24-m02a-preview')).toBeVisible()
    await expect(page.getByTestId('p24-m02a-flag')).toContainText('закрыт')
    await expect(page.getByTestId('p24-m02a-class-count')).toContainText('13')
    await expect(page.getByTestId('p24-m02a-surge-magic')).toContainText('запрещено')
    await expect(page.getByTestId('p24-m02a-bardic-heroic')).toContainText('отдельный пул')

    await expect(page.getByTestId('p24-m02a-fighter5')).toBeVisible()
    await expect(page.getByTestId('p24-m02a-fighter5-resources')).toContainText(
      'Второе дыхание',
    )
    await expect(page.getByTestId('p24-m02a-wizard5-spells')).toContainText('подготовлено 9')

    await expect(page.getByTestId('p24-m02a-warlock5')).toBeVisible()
    await expect(page.getByTestId('p24-m02a-warlock5-limit')).toContainText('5')
    await expect(page.getByTestId('p24-m02a-warlock5-invocations')).toContainText(
      'Договор клинка',
    )
    await expect(page.getByTestId('p24-m02a-sorcerer5')).toBeVisible()
    await expect(page.getByTestId('p24-m02a-sorcerer5-metamagic')).toContainText(
      'Ускоренное',
    )

    await page.getByTestId('p24-m02a-short-rest').click()
    await expect(page.getByTestId('p24-m02a-rest-log')).toContainText('used=2')

    const shot = path.join(ARTIFACTS, `classes-${testInfo.project.name}.png`)
    await page.screenshot({ path: shot, fullPage: true })

    await page.getByTestId('p24-m02a-warlock5').screenshot({
      path: path.join(ARTIFACTS, `warlock5-${testInfo.project.name}.png`),
    })
    await page.getByTestId('p24-m02a-sorcerer5').screenshot({
      path: path.join(ARTIFACTS, `sorcerer5-${testInfo.project.name}.png`),
    })
  })
})
