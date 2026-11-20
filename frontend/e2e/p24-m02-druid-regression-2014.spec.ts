/**
 * P24-M02-druid 2014 regression shots (1440 / 390). Self-contained: no 2024 harness imports,
 * so the same file can be dropped into a baseline worktree together with support/druid2014Mock.ts.
 *
 * P24_M02_DRUID_SHOT_TAG=before|after|main — files land in regression-2014/<tag>-*.png
 * P24_M02_DRUID_REG_DIR overrides the output directory.
 */
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import {
  ARTIFACTS_2014,
  SHOT_TAG,
  dismissWelcome,
  druid2014SheetCharacter,
  ensureMobileVitalsExpanded,
  isPhone,
  mock2014,
  mock2014Sheet,
  openFeaturesScene,
  projectOf,
  shot,
  walk2014ToDruidClass,
} from './support/druid2014Mock'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
})


test.describe('P24-M02 2014 regression (druid)', () => {
  test.setTimeout(90_000)
  test.use({ actionTimeout: 12_000 })

  test('2014 create — класс Друид', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-race-marker`, project)

    const classDlg = await walk2014ToDruidClass(page)
    await expect(page.getByRole('heading', { name: /Друид: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Природа|Выживание|Круг|Друид/i)
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-druid-class`, project)
  })

  test('2014 sheet — друид: шапка + 6 характеристик (МДР) + дикий облик/круг/заклинания', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = druid2014SheetCharacter()
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Лиара|Друид/i).first()).toBeVisible({ timeout: 15_000 })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-druid-header`, project)
      await page.locator('button.mobile-vitals__abil').click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await abilPage.locator('.abil-block[data-abil="wis"]').first().scrollIntoViewIfNeeded()
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-druid-abilities`, project)
      await abilPage.locator('button.mobile-abil-page__back').click()
      await expect(abilPage).toHaveCount(0, { timeout: 10_000 })
    } else {
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(page.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-druid`, project)
    }

    await openFeaturesScene(page, project)
    const wildCard = page
      .locator('.feature-card')
      .filter({ hasText: /Дикий облик|Круг друидов|Круг земли|Друидический/i })
      .first()
    await expect(wildCard).toBeVisible({ timeout: 15_000 })
    await wildCard.scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-druid-features-wild-shape-circle`, project)

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    else await page.getByRole('button', { name: /^Бой$/ }).first().click()
    await page.waitForTimeout(500)
    if (isPhone(project)) {
      const spellsTab = page
        .locator(':is(button,[role=tab],[role=button]):visible', { hasText: /^Заклинания$/ })
        .first()
      if (await spellsTab.isVisible().catch(() => false)) await spellsTab.click()
      await page.waitForTimeout(400)
    }
    await expect(page.getByText(/Сотворение пламени|Лечение ран/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-druid-spells`, project)
  })
})
