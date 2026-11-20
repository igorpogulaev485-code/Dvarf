/**
 * P24-M02-bard 2014 regression shots (1440 / 390). Self-contained: no 2024 harness imports,
 * so the same file can be dropped into a baseline worktree together with support/bard2014Mock.ts.
 *
 * P24_M02_BARD_SHOT_TAG=before|after|main — files land in regression-2014/<tag>-*.png
 * and every shot is hashed into regression-2014/<tag>-md5-<1440|390>.txt (md5  file, md5sum format).
 * P24_M02_BARD_REG_DIR overrides the output directory.
 *
 * BEFORE baseline (start-branch tip 8a29f5d5, no bard changes):
 *   git worktree add /tmp/bard-before 8a29f5d5 && cd /tmp/bard-before/frontend && npm ci
 *   cp <this-branch>/frontend/{playwright.p24-m02-bard.config.ts} .
 *   cp <this-branch>/frontend/e2e/p24-m02-bard-regression-2014.spec.ts e2e/
 *   cp <this-branch>/frontend/e2e/support/bard2014Mock.ts e2e/support/
 *   P24_M02_BARD_SHOT_TAG=before npx playwright test --config=playwright.p24-m02-bard.config.ts p24-m02-bard-regression-2014
 * Then compare `before-md5-{1440,390}.txt` with `after-md5-{1440,390}.txt`
 * (`diff <(sed 's/before-/after-/' before-md5-390.txt) after-md5-390.txt`).
 * The config lists p24-m02-bard-live.spec.ts too; a missing file in the worktree is simply not matched.
 */
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  ARTIFACTS_2014,
  SHOT_TAG,
  bard2014SheetCharacter,
  dismissWelcome,
  ensureMobileVitalsExpanded,
  isPhone,
  md5SidecarName,
  mock2014,
  mock2014Sheet,
  openFeaturesScene,
  projectOf,
  shot,
  walk2014ToBardClass,
} from './support/bard2014Mock'

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACTS_2014, md5SidecarName(projectOf(testInfo))), '')
})

test.describe('P24-M02 2014 regression (bard)', () => {
  test.setTimeout(90_000)
  test.use({ actionTimeout: 12_000 })

  test('2014 create — класс Бард', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-race-marker`, project)

    const classDlg = await walk2014ToBardClass(page)
    await expect(page.getByRole('heading', { name: /Бард: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Выступление|Убеждение|Лютня|Бард/i)
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-bard-class`, project)
  })

  test('2014 sheet — бард: шапка + 6 характеристик + Песнь отдыха / Вдохновение / коллегия / заклинания', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = bard2014SheetCharacter()
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Лиара|Бард/i).first()).toBeVisible({ timeout: 15_000 })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-bard-header`, project)
      await page.locator('button.mobile-vitals__abil').click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await abilPage.locator('.abil-block[data-abil="cha"]').first().scrollIntoViewIfNeeded()
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-bard-abilities`, project)
      await abilPage.locator('button.mobile-abil-page__back').click()
      await expect(abilPage).toHaveCount(0, { timeout: 10_000 })
    } else {
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(page.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-bard`, project)
    }

    await openFeaturesScene(page, project)
    const names = page.locator('.feature-card__name, .feature-card__title')
    await expect(names.filter({ hasText: /Песнь отдыха|Песня отдыха/i }).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(names.filter({ hasText: /Бардовское вдохновение|Вдохновение барда/i }).first()).toBeVisible()
    const rest = page
      .locator('.feature-card')
      .filter({ hasText: /Песнь отдыха|Песня отдыха/i })
      .first()
    await rest.scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-bard-features-song-of-rest-bi`, project)

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
    await expect(page.getByText(/Злая насмешка|Лечение ран/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-bard-spells`, project)
  })
})
