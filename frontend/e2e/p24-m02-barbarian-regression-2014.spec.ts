/**
 * P24-M02-barbarian 2014 regression shots (1440 / 390).
 *
 * P24_M02_BARBARIAN_SHOT_TAG=before|after|main — regression-2014/<tag>-*.png
 * md5 sidecars: regression-2014/<tag>-md5-<1440|390>.txt
 *
 * Feature names must stay 2014: Ярость, Защита без доспехов, Чувство опасности,
 * Безрассудная атака, Путь дикости, Жестокий критический удар, Непреклонная ярость,
 * Стойкая ярость, Неукротимая мощь, Изначальный чемпион — NOT 2024-only names.
 */
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  ARTIFACTS_2014,
  SHOT_TAG,
  barbarian2014SheetCharacter,
  dismissWelcome,
  ensureMobileVitalsExpanded,
  expectNo2024BarbarianLeak,
  isPhone,
  md5SidecarName,
  mock2014,
  mock2014Sheet,
  openFeaturesScene,
  projectOf,
  shot,
  walk2014ToBarbarianClass,
} from './support/barbarian2014Mock'

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACTS_2014, md5SidecarName(projectOf(testInfo))), '')
})

test.describe('P24-M02 2014 regression (barbarian)', () => {
  test.setTimeout(90_000)
  test.use({ actionTimeout: 12_000 })

  test('2014 create — класс Варвар', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-race-marker`, project)

    const classDlg = await walk2014ToBarbarianClass(page)
    await expect(page.getByRole('heading', { name: /Варвар: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Атлетика|Варвар|ярост/i)
    await expectNo2024BarbarianLeak(page)
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-barbarian-class`, project)
  })

  test('2014 sheet — варвар: шапка + 2014 умения (не 2024 имена)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = barbarian2014SheetCharacter()
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Гром|Варвар/i).first()).toBeVisible({ timeout: 15_000 })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-barbarian-header`, project)
      await page.locator('button.mobile-vitals__abil').click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await abilPage.locator('.abil-block[data-abil="str"]').first().scrollIntoViewIfNeeded()
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-barbarian-abilities`, project)
      await abilPage.locator('button.mobile-abil-page__back').click()
      await expect(abilPage).toHaveCount(0, { timeout: 10_000 })
    } else {
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(page.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-barbarian`, project)
    }

    await openFeaturesScene(page, project)
    await expect(
      page
        .getByText(
          /Ярость|Защита без доспехов|Чувство опасности|Безрассудная атака|Путь дикости|Жестокий критический удар|Непреклонная ярость|Стойкая ярость|Неукротимая мощь|Изначальный чемпион/i,
        )
        .first(),
    ).toBeVisible({ timeout: 15_000 })
    await expectNo2024BarbarianLeak(page)
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-barbarian-features`, project)
  })

  test('2014 sheet — berserker path features present', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = barbarian2014SheetCharacter({
      level: 5,
      name: 'Гром Берсерк',
      subclass: 'berserker',
    })
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Гром Берсерк|Варвар|берсерк/i).first()).toBeVisible({
      timeout: 15_000,
    })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
    }

    await openFeaturesScene(page, project)
    await expect(page.getByText(/Безумие|Безумная ярость|Возмездие/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await expectNo2024BarbarianLeak(page)
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-berserker-features`, project)
  })
})