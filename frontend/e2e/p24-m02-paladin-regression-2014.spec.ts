/**
 * P24-M02-paladin 2014 regression shots (1440 / 390). Self-contained: no 2024 harness imports,
 * so the same file can be dropped into a baseline worktree together with support/paladin2014Mock.ts.
 *
 * P24_M02_PALADIN_SHOT_TAG=before|after|main — files land in regression-2014/<tag>-*.png
 * and every shot is hashed into regression-2014/<tag>-md5-<1440|390>.txt (md5  file, md5sum format).
 * P24_M02_PALADIN_REG_DIR overrides the output directory.
 *
 * BEFORE baseline (tip before this pack: 57a970b1):
 *   git worktree add /tmp/paladin-before 57a970b1 && cd /tmp/paladin-before/frontend && npm ci
 *   cp <this-branch>/frontend/playwright.p24-m02-paladin.config.ts .
 *   cp <this-branch>/frontend/e2e/p24-m02-paladin-regression-2014.spec.ts e2e/
 *   cp <this-branch>/frontend/e2e/support/paladin2014Mock.ts e2e/support/
 *   P24_M02_PALADIN_SHOT_TAG=before npx playwright test --config=playwright.p24-m02-paladin.config.ts p24-m02-paladin-regression-2014
 * Then compare `before-md5-{1440,390}.txt` with `after-md5-{1440,390}.txt`.
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
  paladin2014SheetCharacter,
  projectOf,
  shot,
  walk2014ToPaladinClass,
} from './support/paladin2014Mock'

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACTS_2014, md5SidecarName(projectOf(testInfo))), '')
})

test.describe('P24-M02 2014 regression (paladin)', () => {
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
    // 2014 sheet may render from features_text into cards or a text block.
    await expect(page.getByText(/Наложение рук|Возложение рук|Божественное чувство/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-paladin-features`, project)
  })
})
