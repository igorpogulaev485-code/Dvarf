/**
 * P24-M02-ranger 2014 regression shots (1440 / 390).
 *
 * P24_M02_RANGER_SHOT_TAG=before|after|main — regression-2014/<tag>-*.png
 * md5 sidecars: regression-2014/<tag>-md5-<1440|390>.txt
 *
 * BEFORE baseline (tip before this pack: 9508fe86a3329accfb6873dd8b23eeab5f027d6a):
 *   git worktree add /tmp/ranger-before 9508fe86a3329accfb6873dd8b23eeab5f027d6a
 *   cd /tmp/ranger-before/frontend && npm ci
 *   cp <this-branch>/frontend/playwright.p24-m02-ranger.config.ts .
 *   cp <this-branch>/frontend/e2e/p24-m02-ranger-regression-2014.spec.ts e2e/
 *   cp <this-branch>/frontend/e2e/support/ranger2014Mock.ts e2e/support/
 *   P24_M02_RANGER_SHOT_TAG=before npx playwright test --config=playwright.p24-m02-ranger.config.ts p24-m02-ranger-regression-2014
 */
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  ARTIFACTS_2014,
  SHOT_TAG,
  dismissWelcome,
  ensureMobileVitalsExpanded,
  isPhone,
  md5SidecarName,
  mock2014,
  mock2014Sheet,
  openFeaturesScene,
  projectOf,
  ranger2014SheetCharacter,
  shot,
  walk2014ToRangerClass,
} from './support/ranger2014Mock'

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACTS_2014, md5SidecarName(projectOf(testInfo))), '')
})

test.describe('P24-M02 2014 regression (ranger)', () => {
  test.setTimeout(90_000)
  test.use({ actionTimeout: 12_000 })

  test('2014 create — класс Следопыт', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-race-marker`, project)

    const classDlg = await walk2014ToRangerClass(page)
    await expect(page.getByRole('heading', { name: /Следопыт: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Внимательность|Выживание|Следопыт/i)
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-ranger-class`, project)
  })

  test('2014 sheet — следопыт: шапка + 6 характеристик + избранный враг / охотник', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = ranger2014SheetCharacter()
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Арагорн|Следопыт/i).first()).toBeVisible({ timeout: 15_000 })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-ranger-header`, project)
      await page.locator('button.mobile-vitals__abil').click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await abilPage.locator('.abil-block[data-abil="wis"]').first().scrollIntoViewIfNeeded()
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-ranger-abilities`, project)
      await abilPage.locator('button.mobile-abil-page__back').click()
      await expect(abilPage).toHaveCount(0, { timeout: 10_000 })
    } else {
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(page.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-ranger`, project)
    }

    await openFeaturesScene(page, project)
    await expect(
      page.getByText(/Избранный враг|Исследователь природы|Добыча охотника/i).first(),
    ).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-ranger-features`, project)
  })

  for (const level of [6, 8] as const) {
    test(`2014 sheet L${level} — скорость без «Вездеходности» (+10 не утекает)`, async ({
      page,
    }, testInfo) => {
      const project = projectOf(testInfo)
      const tag = SHOT_TAG
      const character = ranger2014SheetCharacter({
        level,
        name: `Арагорн L${level}`,
      })
      await mock2014Sheet(page, character)

      await page.goto(`/characters/${character.id}`)
      await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
      await dismissWelcome(page)
      await expect(page.getByText(new RegExp(`Арагорн L${level}|Следопыт`, 'i')).first()).toBeVisible({
        timeout: 15_000,
      })

      if (isPhone(project)) {
        await page.getByText('Бой', { exact: true }).last().click()
        await ensureMobileVitalsExpanded(page)
      }

      // Displayed walk speed must stay 30 — Roving +10 is 2024-only.
      const speedNode = page
        .locator(
          '[data-testid="vitals-speed"], .vital--speed, .combat-sticky__stats, .play-desk__vital',
        )
        .filter({ hasText: /\b30\b/ })
        .first()
      if (await speedNode.count()) {
        await expect(speedNode).toBeVisible()
        await expect(speedNode).not.toContainText(/\b40\b/)
      } else {
        await expect(page.getByText(/\b30\s*(фт|ft)?/i).first()).toBeVisible({ timeout: 10_000 })
      }
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-ranger-l${level}-speed`, project)
    })
  }
})