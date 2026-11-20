import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ARTIFACTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../artifacts/p24-01',
)

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

test.describe('P24-01 flag open: one create CTA → edition picker + lobby select', () => {
  test('одна кнопка; после клика — выбор 2014/2024; select лобби (дефолт 2014)', async ({
    page,
  }, testInfo) => {
    await page.goto('/dev/p24-01-preview')
    await expect(page.getByTestId('p24-01-preview')).toBeVisible()

    await expect(page.getByTestId('create-character-open')).toBeVisible()
    await expect(page.getByTestId('create-character-2024')).toHaveCount(0)

    await page.getByTestId('create-character-open').click()
    await expect(page.getByTestId('create-character-edition')).toBeVisible()
    await expect(page.getByTestId('create-character-2014')).toBeVisible()
    await expect(page.getByTestId('create-character-2024')).toBeVisible()
    await expect(page.getByRole('button', { name: /D&D 2024/i })).toBeVisible()

    await page.getByTestId('create-character-2014').click()
    await expect(page.getByTestId('create-edition-log')).toContainText('2014')
    await expect(page.getByTestId('create-character-open')).toBeVisible()

    await page.getByTestId('create-character-open').click()
    await page.getByTestId('create-character-2024').click()
    await expect(page.getByTestId('create-edition-log')).toContainText('2024')

    await expect(page.getByTestId('lobby-create-form')).toBeVisible()
    await expect(page.getByTestId('lobby-create-rules-edition')).toBeVisible()
    await expect(page.getByLabel('Редакция лобби')).toHaveValue('2014')

    await page.getByTestId('lobby-preview-submit').click()
    await expect(page.getByTestId('lobby-created-ok')).toContainText('Лобби создано')

    const shot = path.join(ARTIFACTS, `create-and-lobby-open-${testInfo.project.name}.png`)
    await page.screenshot({ path: shot, fullPage: true })
  })
})
