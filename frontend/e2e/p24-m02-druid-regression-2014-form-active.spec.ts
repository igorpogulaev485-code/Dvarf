/**
 * P24-M02-druid Доправка 1 — 2014 regression with an ACTIVE Wild Shape form (1440 / 390).
 * Self-contained apart from support/druid2014Mock.ts, so spec + support can be dropped into a
 * baseline worktree and run with another tag.
 *
 * P24_M02_DRUID_SHOT_TAG=before|after|main — files land in regression-2014/form-active/<tag>-*.png
 * P24_M02_DRUID_REG_DIR overrides the output directory.
 */
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  ARTIFACTS_2014,
  SHOT_TAG,
  dismissWelcome,
  druid2014SheetCharacter,
  ensureMobileVitalsExpanded,
  isPhone,
  mock2014Sheet,
  projectOf,
} from './support/druid2014Mock'

const OUT = path.join(ARTIFACTS_2014, 'form-active')

test.beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true })
})

async function viewportShot(page: Page, name: string, project: string) {
  const want = project === '390' ? { width: 390, height: 844 } : { width: 1440, height: 900 }
  expect(page.viewportSize()).toEqual(want)
  await page.mouse.move(2, 2)
  await expect(page.locator('.ui-toast')).toHaveCount(0, { timeout: 20_000 })
  await page.waitForTimeout(450)
  await page.screenshot({
    path: path.join(OUT, `${SHOT_TAG}-${name}-${project}.png`),
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
  })
}

async function scrollTop(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      if (el.scrollTop > 0) el.scrollTop = 0
    })
  })
}

function druid2014InWildShape() {
  const character = druid2014SheetCharacter()
  const sheet = character.sheet as Record<string, any>
  sheet.companions = [
    {
      id: 'reg-form-wolf',
      role: 'self_form',
      kind: 'transformed_self',
      name: 'Волк',
      bestiary_ref: 'wolf',
      bestiary_name_ru: 'Волк',
      nature: 'summoned',
      control: 'with_master',
      active: true,
      is_primary: true,
      stats: { ac: 13, hp: 11, hp_max: 11, speed: 40 },
      actions: 'Укус: +4, 2к4+2 колющий',
      notes: 'Дикий облик (2014): хиты формы отдельно',
      source: { kind: 'class', labelRu: 'Дикий облик', feature: 'wild_shape' },
      form: {
        form_source: 'wild_shape',
        form_source_ref: 'wild_shape',
        host_hp_at_enter: 38,
        host_hp_max_at_enter: 38,
        duration_minutes: 60,
        entered_at: '2026-01-01T12:00:00.000Z',
        previous_primary_id: null,
      },
    },
  ]
  return character
}

test.describe('P24-M02 2014 regression (druid, активный Дикий облик)', () => {
  test.setTimeout(120_000)
  test.use({ actionTimeout: 12_000 })

  test('2014 друид в форме: шапка + Напарники', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const character = druid2014InWildShape()
    await mock2014Sheet(page, character)
    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Лиара|Друид/i).first()).toBeVisible({ timeout: 15_000 })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
    } else {
      await page.getByRole('button', { name: /^Бой$/ }).first().click()
    }
    await page.waitForTimeout(500)
    await scrollTop(page)
    await viewportShot(page, 'form-active-header', project)

    if (isPhone(project)) await page.getByText('Напарн.', { exact: true }).last().click()
    else await page.getByRole('button', { name: /^Напарники/ }).first().click()
    await page.waitForTimeout(700)
    const card = page.locator('.companion-card, [class*="companion"]').filter({ hasText: /Волк/ }).first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await card.scrollIntoViewIfNeeded()
    await scrollTop(page)
    await card.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await viewportShot(page, 'form-active-companions', project)

    if (isPhone(project)) {
      await card.getByRole('button', { name: /^Изменить$/ }).first().click()
      const dlg = page.getByRole('dialog').last()
      await expect(dlg).toBeVisible({ timeout: 10_000 })
      await viewportShot(page, 'form-active-companions-edit-dialog', project)
    }
  })
})
