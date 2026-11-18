/**
 * P24-M04 desk combat assembly — preview surfaces + 1440/390 frames.
 * Live lobby API covered in p24-m04-live.spec.ts when backend is up.
 */
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ARTIFACTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../artifacts/p24-m04',
)

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

async function shot(page: import('@playwright/test').Page, name: string, project: string) {
  const file = path.join(ARTIFACTS, `${name}-${project}.png`)
  await page.screenshot({ path: file, fullPage: true })
}

test.describe('P24-M04 desk combat assembly', () => {
  test('героическое / отдых / surprise / mastery / посадка / бестиарий', async ({
    page,
  }, testInfo) => {
    const project = testInfo.project.name
    await page.goto('/dev/p24-m04-preview')
    await expect(page.getByTestId('p24-m04-preview')).toBeVisible()
    await expect(page.getByTestId('p24-m04-flag')).toContainText('false')

    await expect(page.getByTestId('heroic-inspiration-reroll-chip')).toBeVisible()
    await page.getByTestId('heroic-inspiration-reroll-chip').click()
    await expect(page.getByTestId('p24-m04-feed-line').first()).toContainText(
      'Героическое вдохновение',
    )
    await shot(page, 'heroic-reroll', project)

    await page.getByTestId('heroic-inspiration-transfer').click()
    await expect(page.getByTestId('p24-m04-transfer-log')).toContainText('союзнику')
    await shot(page, 'heroic-transfer', project)

    await expect(page.getByTestId('rest-2024-hint')).toContainText('все кости')
    await shot(page, 'rest-2024', project)

    await page.getByTestId('p24-m04-open-combat').click()
    await expect(page.getByText(/помеха к инициативе/i).first()).toBeVisible()
    await shot(page, 'surprise-start-2024', project)
    await page.getByRole('button', { name: 'Отмена' }).click()

    await page.getByTestId('p24-m04-open-init').click()
    await expect(page.getByTestId('initiative-surprise-2024-hint')).toBeVisible()
    await shot(page, 'initiative-surprise-2024', project)
    await page.getByRole('button', { name: 'Отмена' }).click()

    await expect(page.getByTestId('weapon-mastery-attack')).toBeVisible()
    await page.getByTestId('weapon-mastery-apply').click()
    await expect(page.getByTestId('p24-m04-feed-line').first()).toContainText(/мастерство|Засечка|Толчок|Опрокид|Рассечение|Царапина|Ник|Замедл|Ослаб/i)
    await shot(page, 'mastery-feed', project)

    await expect(page.getByTestId('p24-m04-bestiary-edition')).toContainText('2024')
    await page.getByTestId('p24-m04-open-add').click()
    await shot(page, 'bestiary-add-2024', project)
    await page.getByRole('button', { name: 'Отмена' }).click()

    await expect(page.getByTestId('join-edition-empty')).toContainText('запрещён')
    await expect(page.getByTestId('p24-m04-join-code')).toContainText(
      'lobby_rules_edition_mismatch',
    )
    await shot(page, 'join-mismatch', project)

    // 2014 surprise copy still L-21
    await page.getByTestId('p24-m04-edition-2014').click()
    await page.getByTestId('p24-m04-open-combat').click()
    await expect(page.getByText(/без действия, бонусного/i).first()).toBeVisible()
    await shot(page, 'surprise-start-2014', project)
    await page.getByRole('button', { name: 'Отмена' }).click()
  })
})
