/**
 * P24-M02-artificer 2014 regression shots (1440 / 390).
 *
 * P24_M02_ARTIFICER_SHOT_TAG=before|after|main — regression-2014/<tag>-*.png
 * md5 sidecars: regression-2014/<tag>-md5-<1440|390>.txt
 *
 * Feature names must stay 2014: Магическое мастерство, Инфузия, Вспышка гениальности,
 * Компетентность в инструментах — NOT 2024 «Магия вещей» / «Реплики» / «Душа творения».
 */
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  ARTIFACTS_2014,
  SHOT_TAG,
  artificer2014SheetCharacter,
  dismissWelcome,
  ensureMobileVitalsExpanded,
  isPhone,
  md5SidecarName,
  mock2014,
  mock2014Sheet,
  openFeaturesScene,
  projectOf,
  shot,
  walk2014ToArtificerClass,
} from './support/artificer2014Mock'

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACTS_2014, md5SidecarName(projectOf(testInfo))), '')
})

test.describe('P24-M02 2014 regression (artificer)', () => {
  test.setTimeout(90_000)
  test.use({ actionTimeout: 12_000 })

  test('2014 create — класс Изобретатель', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-race-marker`, project)

    const classDlg = await walk2014ToArtificerClass(page)
    await expect(page.getByRole('heading', { name: /Изобретатель: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Анализ|Магия|Изобретатель/i)
    await expect(classDlg).not.toContainText(/Магия вещей|Реплики магических|Артефактор/)
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-artificer-class`, project)
  })

  test('2014 sheet — изобретатель: шапка + 2014 умения (не 2024 имена)', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = artificer2014SheetCharacter()
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Тиббл|Изобретатель/i).first()).toBeVisible({ timeout: 15_000 })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-artificer-header`, project)
      await page.locator('button.mobile-vitals__abil').click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await abilPage.locator('.abil-block[data-abil="int"]').first().scrollIntoViewIfNeeded()
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-artificer-abilities`, project)
      await abilPage.locator('button.mobile-abil-page__back').click()
      await expect(abilPage).toHaveCount(0, { timeout: 10_000 })
    } else {
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(page.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-artificer`, project)
    }

    await openFeaturesScene(page, project)
    await expect(
      page
        .getByText(
          /Магическое мастерство|Инфузия|Вспышка гениальности|Компетентность в инструментах/i,
        )
        .first(),
    ).toBeVisible({ timeout: 15_000 })
    // Must not leak 2024 EFA names onto a 2014 sheet.
    await expect(page.getByText(/^Магия вещей$/)).toHaveCount(0)
    await expect(page.getByText(/Реплики магических предметов/)).toHaveCount(0)
    await expect(page.getByText(/^Душа творения$/)).toHaveCount(0)
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-artificer-features`, project)
  })
})
