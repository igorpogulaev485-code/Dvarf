/**
 * P24-M02B-paladin 2014 regression (1440 / 390) with md5 sidecars.
 * Full set: 5 desktop + 6 phone (create race/class + sheet + features + devotion;
 * phone adds header + abilities).
 * P24_M02B_PALADIN_SHOT_TAG=before|after
 * Artifacts: ../artifacts/p24-m02b-paladin/regression-2014/
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { expect, test } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
process.env.P24_M02_PALADIN_REG_DIR =
  process.env.P24_M02B_PALADIN_REG_DIR ||
  path.resolve(here, '../../artifacts/p24-m02b-paladin/regression-2014')
process.env.P24_M02_PALADIN_SHOT_TAG =
  process.env.P24_M02B_PALADIN_SHOT_TAG || process.env.P24_M02_PALADIN_SHOT_TAG || 'after'

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
  paladin2014SheetCharacter,
  projectOf,
  shot,
  walk2014ToPaladinClass,
} from './support/paladin2014Mock'

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACTS_2014, md5SidecarName(projectOf(testInfo))), '')
})

test.describe('P24-M02B 2014 regression (paladin)', () => {
  test.setTimeout(90_000)
  test.use({ actionTimeout: 12_000 })

  test('2014 create — класс Паладин', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-race-marker`, project)

    const classDlg = await walk2014ToPaladinClass(page)
    await expect(page.getByRole('heading', { name: /Паладин: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Убеждение|Проницательность|Паладин/i)
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-paladin-class`, project)
  })

  test('2014 sheet — паладин: шапка + 6 характеристик + Наложение рук / Божественное чувство / клятва', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = paladin2014SheetCharacter()
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Альдрик|Паладин/i).first()).toBeVisible({ timeout: 15_000 })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-paladin-header`, project)
      await page.locator('button.mobile-vitals__abil').click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await abilPage.locator('.abil-block[data-abil="cha"]').first().scrollIntoViewIfNeeded()
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-paladin-abilities`, project)
      await abilPage.locator('button.mobile-abil-page__back').click()
      await expect(abilPage).toHaveCount(0, { timeout: 10_000 })
    } else {
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(page.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-paladin`, project)
    }

    await openFeaturesScene(page, project)
    await expect(page.getByText(/Наложение рук|Возложение рук|Божественное чувство/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-paladin-features`, project)

    // Extra pair for full 5+6 set (2014 oath / channel markers).
    const oath = page.getByText(/Клятва|Священное оружие|Божественный канал|Проведение/i).first()
    if (await oath.isVisible().catch(() => false)) {
      await oath.scrollIntoViewIfNeeded().catch(() => {})
    }
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-paladin-devotion`, project)
  })
})
