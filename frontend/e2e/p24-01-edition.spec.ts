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

test.describe('P24-01 flag open: CTA 2024 + lobby edition select (default 2014)', () => {
  test('кнопка D&D 2024 видна; в форме лобби есть select редакции (дефолт 2014)', async ({
    page,
  }, testInfo) => {
    await page.goto('/dev/p24-01-preview')
    await expect(page.getByTestId('p24-01-preview')).toBeVisible()

    await expect(page.getByTestId('create-character-2014')).toBeVisible()
    await expect(page.getByTestId('create-character-2024')).toBeVisible()
    await expect(page.getByRole('button', { name: /D&D 2024/i })).toBeVisible()

    await page.getByTestId('create-character-2014').click()
    await expect(page.getByTestId('create-edition-log')).toContainText('2014')
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
