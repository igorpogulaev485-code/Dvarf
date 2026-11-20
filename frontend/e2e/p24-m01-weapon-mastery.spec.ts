import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ARTIFACTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../artifacts/p24-m01',
)

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

test.describe('P24-M01 weapon mastery', () => {
  test('блок мастерства 2024 + словарь RU; флаг закрыт', async ({ page }, testInfo) => {
    await page.goto('/dev/p24-m01-preview')
    await expect(page.getByTestId('p24-m01-preview')).toBeVisible()
    await expect(page.getByTestId('p24-m01-flag')).toContainText('закрыт')
    await expect(page.getByTestId('p24-m01-2014-hidden')).toContainText('скрыт')
    await expect(page.getByTestId('weapon-mastery-panel')).toBeVisible()
    await expect(page.getByTestId('p24-m01-dict')).toContainText('Засечка')
    await expect(page.getByTestId('p24-m01-dict')).toContainText('Опрокидывание')
    await expect(page.getByTestId('weapon-mastery-attack')).toBeVisible()
    await expect(page.getByTestId('p24-m01-tactical-hint')).toContainText('Толчок')
    await expect(page.getByTestId('p24-m01-nick-check')).toContainText('не тратит бонусное')

    await page.getByTestId('weapon-mastery-apply').click()
    await expect(page.getByTestId('p24-m01-log')).not.toHaveText('—')

    const shot = path.join(ARTIFACTS, `mastery-${testInfo.project.name}.png`)
    await page.screenshot({ path: shot, fullPage: true })
  })
})
