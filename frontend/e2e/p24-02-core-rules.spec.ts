import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ARTIFACTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../artifacts/p24-02',
)

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

test.describe('P24-02 core rules: 2014 isolation + 2024 modules', () => {
  test('флаг открыт; истощение/отдых/вдохновение/тумблеры по редакции', async ({
    page,
  }, testInfo) => {
    await page.goto('/dev/p24-02-preview')
    await expect(page.getByTestId('p24-02-preview')).toBeVisible()

    await expect(page.getByTestId('create-character-open')).toBeVisible()
    await page.getByTestId('create-character-open').click()
    await expect(page.getByTestId('create-character-2014')).toBeVisible()
    await expect(page.getByTestId('create-character-2024')).toBeVisible()
    await expect(page.getByTestId('p24-02-flag-on')).toContainText('открыт')

    await expect(page.getByTestId('p24-02-exh-2024')).toContainText('−6')
    await expect(page.getByTestId('p24-02-exh-2024')).toContainText('15 фт')
    await expect(page.getByTestId('p24-02-exh-2024')).toContainText('40')
    await expect(page.getByTestId('p24-02-exh-2014')).toContainText('20')

    await expect(page.getByTestId('p24-02-rest-2014')).toContainText('4/8')
    await expect(page.getByTestId('p24-02-rest-2024')).toContainText('8/8')

    await expect(page.getByTestId('p24-02-heroic-chip')).toBeVisible()
    await page.getByTestId('p24-02-heroic-reroll').click()
    await expect(page.getByTestId('p24-02-reroll-log')).toContainText('переброс')
    // второго чипа нет — вдохновение потрачено
    await page.getByTestId('p24-02-heroic-reroll').click()
    await expect(page.getByTestId('p24-02-reroll-log')).toContainText('нет')

    await page.getByTestId('p24-02-heroic-transfer').click()
    await expect(page.getByTestId('p24-02-transfer-log')).toContainText('союзнику')

    await expect(page.getByTestId('p24-02-surprise')).toContainText('нет')
    await expect(page.getByTestId('p24-02-actions')).toContainText('Магия')
    await expect(page.getByTestId('p24-02-actions')).toContainText('Изучение')
    await expect(page.getByTestId('p24-02-actions')).toContainText('Влияние')
    await expect(page.getByTestId('p24-02-actions')).toContainText('Использование')
    await expect(page.getByTestId('p24-02-bloodied')).toContainText('да')

    await expect(page.getByTestId('p24-02-potion-2014')).toContainText(
      'Зелье бонусным действием',
    )
    await expect(page.getByTestId('p24-02-potion-2024')).toContainText(
      'Зелье стоит действие',
    )
    await expect(page.getByTestId('p24-02-stack-2024')).toContainText(
      'героического',
    )

    const sheetShot = path.join(
      ARTIFACTS,
      `sheet-core-rules-${testInfo.project.name}.png`,
    )
    await page.screenshot({ path: sheetShot, fullPage: true })
  })

  test('лобби preview: select редакции виден (дефолт 2014); кнопка 2024 есть', async ({
    page,
  }, testInfo) => {
    await page.goto('/dev/p24-01-preview')
    await expect(page.getByTestId('lobby-create-form')).toBeVisible()
    await expect(page.getByTestId('lobby-create-rules-edition')).toBeVisible()
    await expect(page.getByLabel('Редакция лобби')).toHaveValue('2014')
    await expect(page.getByTestId('create-character-open')).toBeVisible()
    await page.getByTestId('create-character-open').click()
    await expect(page.getByTestId('create-character-2024')).toBeVisible()

    const lobbyShot = path.join(
      ARTIFACTS,
      `lobby-open-${testInfo.project.name}.png`,
    )
    await page.screenshot({ path: lobbyShot, fullPage: true })
  })
})

