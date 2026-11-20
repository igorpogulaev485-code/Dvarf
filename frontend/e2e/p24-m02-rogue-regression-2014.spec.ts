/**
 * P24-M02-rogue 2014 regression shots (1440 / 390).
 *
 * P24_M02_ROGUE_SHOT_TAG=before|after|main — regression-2014/<tag>-*.png
 * md5 sidecars: regression-2014/<tag>-md5-<1440|390>.txt
 *
 * Feature names must stay 2014: Скрытая атака, Компетентность, Надёжный талант,
 * Удача, Увёртливость, Скользкий ум, Убийство — NOT 2024 draft leaks
 * (Верный прицел, Коварная атака, Улучшенный Хитрый удар, …).
 */
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  ARTIFACTS_2014,
  SHOT_TAG,
  dismissWelcome,
  ensureMobileVitalsExpanded,
  expectNo2024RogueLeak,
  isPhone,
  md5SidecarName,
  mock2014,
  mock2014Sheet,
  openFeaturesScene,
  projectOf,
  rogue2014SheetCharacter,
  shot,
  walk2014ToRogueClass,
} from './support/rogue2014Mock'

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACTS_2014, md5SidecarName(projectOf(testInfo))), '')
})

test.describe('P24-M02 2014 regression (rogue)', () => {
  test.setTimeout(90_000)
  test.use({ actionTimeout: 12_000 })

  test('2014 create — класс Плут', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-race-marker`, project)

    const classDlg = await walk2014ToRogueClass(page)
    await expect(page.getByRole('heading', { name: /Плут: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Акробатика|Плут|Скрытн/i)
    await expectNo2024RogueLeak(page)
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-rogue-class`, project)
  })

  test('2014 sheet — плут: шапка + 2014 умения (не 2024 черновики)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = rogue2014SheetCharacter()
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Тень|Плут/i).first()).toBeVisible({ timeout: 15_000 })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-rogue-header`, project)
      await page.locator('button.mobile-vitals__abil').click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await abilPage.locator('.abil-block[data-abil="dex"]').first().scrollIntoViewIfNeeded()
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-rogue-abilities`, project)
      await abilPage.locator('button.mobile-abil-page__back').click()
      await expect(abilPage).toHaveCount(0, { timeout: 10_000 })
    } else {
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(page.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-rogue`, project)
    }

    await openFeaturesScene(page, project)
    await expect(
      page
        .getByText(
          /Скрытая атака|Компетентность|Хитрое действие|Архетип плута|Невероятное уклонение|Увёртливость|Надёжный талант|Скользкий ум|Неуловимость|Удача/i,
        )
        .first(),
    ).toBeVisible({ timeout: 15_000 })
    await expectNo2024RogueLeak(page)
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-rogue-features`, project)
  })

  test('2014 sheet — thief / assassin path features present', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = rogue2014SheetCharacter({
      level: 5,
      name: 'Тень Убийца',
      subclass: 'assassin',
    })
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Тень Убийца|Плут|Убийц/i).first()).toBeVisible({
      timeout: 15_000,
    })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
    }

    await openFeaturesScene(page, project)
    await expect(page.getByText(/Убийство|Мастерство внедрения|Смертельный удар/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await expectNo2024RogueLeak(page)
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-assassin-features`, project)
  })
})
