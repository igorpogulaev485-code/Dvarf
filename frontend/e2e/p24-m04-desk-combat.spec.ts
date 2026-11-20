/**
 * P24-M04 preview smoke — secondary harness (not acceptance evidence).
 * Live desk/lobby/session frames: p24-m04-live.spec.ts.
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

async function shotEl(
  locator: import('@playwright/test').Locator,
  name: string,
  project: string,
) {
  const file = path.join(ARTIFACTS, `preview-${name}-${project}.png`)
  await locator.screenshot({ path: file })
}

test.describe('P24-M04 desk combat preview smoke', () => {
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
    await shotEl(page.getByTestId('heroic-inspiration-reroll-chip'), 'heroic-reroll', project)

    await page.getByTestId('heroic-inspiration-transfer').click()
    await expect(page.getByTestId('p24-m04-transfer-log')).toContainText('союзнику')
    await shotEl(page.getByTestId('p24-m04-transfer-log'), 'heroic-transfer', project)

    await expect(page.getByTestId('rest-2024-hint')).toContainText('все кости')
    await shotEl(page.getByTestId('rest-2024-hint'), 'rest-2024', project)

    await page.getByTestId('p24-m04-open-combat').click()
    await expect(page.getByText(/помеха к инициативе/i).first()).toBeVisible()
    await shotEl(
      page.locator('.ui-dialog, [role="dialog"]').first(),
      'surprise-start-2024',
      project,
    )
    await page.getByRole('button', { name: 'Отмена' }).click()

    await page.getByTestId('p24-m04-open-init').click()
    await expect(page.getByTestId('initiative-surprise-2024-hint')).toBeVisible()
    await shotEl(
      page.getByTestId('initiative-surprise-2024-hint'),
      'initiative-surprise-2024',
      project,
    )
    await page.getByRole('button', { name: 'Отмена' }).click()

    await expect(page.getByTestId('weapon-mastery-attack')).toBeVisible()
    await page.getByTestId('weapon-mastery-apply').click()
    await expect(page.getByTestId('p24-m04-feed-line').first()).toContainText(
      /мастерство|Засечка|Толчок|Опрокид|Рассечение|Царапина|Ник|Замедл|Ослаб/i,
    )
    await shotEl(page.getByTestId('weapon-mastery-attack'), 'mastery-feed', project)

    await expect(page.getByTestId('p24-m04-bestiary-edition')).toContainText('2024')
    await page.getByTestId('p24-m04-open-add').click()
    await shotEl(
      page.locator('.ui-dialog, [role="dialog"]').first(),
      'bestiary-add-2024',
      project,
    )
    await page.getByRole('button', { name: 'Отмена' }).click()

    await expect(page.getByTestId('join-edition-empty')).toContainText('запрещён')
    await expect(page.getByTestId('p24-m04-join-code')).toContainText(
      'lobby_rules_edition_mismatch',
    )
    await shotEl(page.getByTestId('p24-m04-join-code'), 'join-mismatch', project)

    await page.getByTestId('p24-m04-edition-2014').click()
    await page.getByTestId('p24-m04-open-combat').click()
    await expect(page.getByText(/без действия, бонусного/i).first()).toBeVisible()
    await shotEl(
      page.locator('.ui-dialog, [role="dialog"]').first(),
      'surprise-start-2014',
      project,
    )
    await page.getByRole('button', { name: 'Отмена' }).click()
  })
})
