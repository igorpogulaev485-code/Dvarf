/**
 * P24-M02-fighter 2014 regression shots (1440 / 390).
 *
 * P24_M02_FIGHTER_SHOT_TAG=before|after|main — regression-2014/<tag>-*.png
 * md5 sidecars: regression-2014/<tag>-md5-<1440|390>.txt
 *
 * Feature names must stay 2014: Второе дыхание (1×), Всплеск действий (магия ок),
 * Боевой архетип, Боевая универсальность, Чемпион «Выживший», BM Tasha-манёвры —
 * NOT 2024 «Тактическое мышление» / «Тактическое смещение» / «Вызов смерти».
 *
 * BEFORE (tip до = fa481f44133d68b3165d832afc4c8d16564b89df):
 *   git worktree add /tmp/fighter-before fa481f44133d68b3165d832afc4c8d16564b89df
 *   cp config + regression spec + fighter2014Mock into worktree frontend/
 *   P24_M02_FIGHTER_SHOT_TAG=before npx playwright test --config=playwright.p24-m02-fighter.config.ts p24-m02-fighter-regression-2014
 */
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  ARTIFACTS_2014,
  SHOT_TAG,
  dismissWelcome,
  ensureMobileVitalsExpanded,
  fighter2014SheetCharacter,
  isPhone,
  md5SidecarName,
  mock2014,
  mock2014Sheet,
  openFeaturesScene,
  projectOf,
  shot,
  walk2014ToFighterClass,
} from './support/fighter2014Mock'

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACTS_2014, md5SidecarName(projectOf(testInfo))), '')
})

test.describe('P24-M02 2014 regression (fighter)', () => {
  test.setTimeout(90_000)
  test.use({ actionTimeout: 12_000 })

  test('2014 create — класс Воин', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-race-marker`, project)

    const classDlg = await walk2014ToFighterClass(page)
    await expect(page.getByRole('heading', { name: /Воин: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Атлетика|Воин|стиль/i)
    await expect(classDlg).not.toContainText(
      /Тактическое мышление|Тактическое смещение|Изучающие выпады|Вызов смерти/,
    )
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-fighter-class`, project)
  })

  test('2014 sheet — воин: шапка + 2014 умения (не 2024 имена)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = fighter2014SheetCharacter()
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Бран|Воин/i).first()).toBeVisible({ timeout: 15_000 })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-fighter-header`, project)
      await page.locator('button.mobile-vitals__abil').click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await abilPage.locator('.abil-block[data-abil="str"]').first().scrollIntoViewIfNeeded()
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-fighter-abilities`, project)
      await abilPage.locator('button.mobile-abil-page__back').click()
      await expect(abilPage).toHaveCount(0, { timeout: 10_000 })
    } else {
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(page.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-fighter`, project)
    }

    await openFeaturesScene(page, project)
    await expect(
      page
        .getByText(
          /Второе дыхание|Всплеск действий|Боевой архетип|Боевая универсальность|Непоколебимость|Выживший/i,
        )
        .first(),
    ).toBeVisible({ timeout: 15_000 })
    // Must not leak 2024 fighter names onto a 2014 sheet.
    await expect(page.getByText(/^Тактическое мышление$/)).toHaveCount(0)
    await expect(page.getByText(/^Тактическое смещение$/)).toHaveCount(0)
    await expect(page.getByText(/^Тактическое решение$/)).toHaveCount(0)
    await expect(page.getByText(/^Изучающие выпады$/)).toHaveCount(0)
    await expect(page.getByText(/^Вызов смерти$/)).toHaveCount(0)
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-fighter-features`, project)
  })

  test('2014 sheet — Battle Master: Tasha maneuvers present', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = fighter2014SheetCharacter({
      level: 5,
      name: 'Бран Мастер',
      subclass: 'battlemaster',
    })
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Бран Мастер|Воин|Мастер боевых/i).first()).toBeVisible({
      timeout: 15_000,
    })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
    }

    await openFeaturesScene(page, project)
    await expect(
      page
        .getByText(/Боевое превосходство|Ученик войны|манёвр|маневр|Tasha|Захват|Быстрый бросок/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^Тактическое мышление$/)).toHaveCount(0)
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-battlemaster-features`, project)
  })
})
