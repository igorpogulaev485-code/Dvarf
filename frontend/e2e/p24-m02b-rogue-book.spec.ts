/**
 * P24-M02B-rogue live create-at / rollbacks / desk (1440 / 390).
 * Paths: Scion of the Three (FRHoF) + Phantom (RTW).
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore, installDruidHarness, type HarnessStore } from './support/druid2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS =
  process.env.P24_M02B_ROGUE_ARTIFACTS ||
  path.resolve(here, '../../artifacts/p24-m02b-rogue')

const PATHS = ['scion', 'phantom'] as const
const LEVELS_MATRIX = [3, 5, 11] as const
const KEEP_EXTRA = [9, 13, 17, 20] as const

const FEATURE_RE: Record<(typeof PATHS)[number], RegExp> = {
  scion:
    /Наследник троицы|Кровожадность|Ужасная преданность|Удар страха|Аура злобы|Воплощение ужаса|Скрытая атака/i,
  phantom:
    /Фантом|Шёпот мёртвых|Могильные стенания|Сувениры усопших|Голос мёртвых|Призрачная походка|Друг смерти|Скрытая атака/i,
}

const PICKER_RE: Record<(typeof PATHS)[number], RegExp> = {
  scion: /Наследник троицы/i,
  phantom: /Фантом/i,
}

const FORBIDDEN_RE = /Коварн|Ликвидац|Вопли из могилы|Знаки ушедших|Наследник Троих|Призрак(?!ная)/i

function projectOf(testInfo: { project: { name: string } }): '1440' | '390' {
  return testInfo.project.name.includes('390') ? '390' : '1440'
}

async function shot(page: Page, name: string, project: string) {
  await page.waitForTimeout(350)
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  const file = `${name}-${project}.png`
  const buffer = await page.screenshot({
    path: path.join(ARTIFACTS, file),
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
  })
  const md5 = createHash('md5').update(buffer).digest('hex')
  fs.appendFileSync(path.join(ARTIFACTS, `shots-md5-${project}.txt`), `${md5}  ${file}\n`)
}

async function dismissWelcome(page: Page) {
  const skip = page.getByRole('button', { name: /Пропустит.*подсказ/i })
  try {
    await skip.waitFor({ state: 'visible', timeout: 2_500 })
    await skip.click()
  } catch {
    /* ok */
  }
}

async function completeVisibleChoices(page: Page) {
  for (let i = 0; i < 24; i += 1) {
    const finish = page.getByTestId('p24-m03-finish')
    if (await finish.isEnabled().catch(() => false)) return
    const chip = page.locator('button.sheet-chip').filter({ hasNot: page.locator('.is-on') }).first()
    if (await chip.isVisible().catch(() => false)) {
      await chip.click().catch(() => {})
      await page.waitForTimeout(180)
      continue
    }
    const next = page.getByRole('button', { name: /^Далее$|^Продолжить$/ }).first()
    if (await next.isEnabled().catch(() => false)) {
      await next.click().catch(() => {})
      await page.waitForTimeout(180)
      continue
    }
    break
  }
}

async function createViaSeed(page: Page, store: HarnessStore, seed: string) {
  await installDruidHarness(page, store)
  await page.goto(`/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=${seed}`)
  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await completeVisibleChoices(page)
  const finish = page.getByTestId('p24-m03-finish')
  await expect(finish).toBeEnabled({ timeout: 60_000 })
  await finish.click()
  await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}/i, { timeout: 30_000 })
  await dismissWelcome(page)
}

async function dismissOpenDialogs(page: Page) {
  for (let i = 0; i < 3; i += 1) {
    const dlg = page.getByRole('dialog').last()
    if (!(await dlg.isVisible().catch(() => false))) return
    const cancel = dlg.getByRole('button', { name: /^Отмена$|^Закрыть$/ })
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click().catch(() => {})
    } else {
      await page.keyboard.press('Escape').catch(() => {})
    }
    await page.waitForTimeout(200)
  }
}

async function openFeatures(page: Page, project: string) {
  await dismissOpenDialogs(page)
  if (project === '390') {
    await page.getByText('Способн.', { exact: true }).last().click({ force: true })
  } else {
    await page.getByRole('button', { name: /^Способности$/ }).first().click({ force: true })
  }
  await page.waitForTimeout(700)
}

async function openCombat(page: Page, project: string) {
  await dismissOpenDialogs(page)
  if (project === '390') {
    await page.getByText('Бой', { exact: true }).last().click({ force: true })
  } else {
    await page.getByRole('button', { name: /^Бой$/ }).first().click({ force: true })
  }
  await page.waitForTimeout(500)
}

async function setCreateLevel(page: Page, level: number) {
  const levelInput = page.getByTestId('p24-m03c-level-rogue')
  await expect(levelInput).toBeVisible({ timeout: 10_000 })
  await levelInput.fill(String(level))
  await levelInput.blur()
  await page.waitForTimeout(450)
}

async function expandFeature(page: Page, name: RegExp) {
  const collapsed = page
    .locator('.feature-card')
    .filter({ has: page.locator('.feature-card__name, .feature-card__title', { hasText: name }) })
    .first()
  await expect(collapsed).toBeVisible({ timeout: 12_000 })
  if (await collapsed.locator('.feature-card__title').count()) return collapsed
  await collapsed.locator('button.feature-card__glance, button[aria-label="Подробнее"]').first().click()
  await page.waitForTimeout(300)
  return page
    .locator('.feature-card--expand')
    .filter({ has: page.locator('.feature-card__title', { hasText: name }) })
    .first()
}

async function clickFeatureUse(page: Page, nameRe: RegExp) {
  const card = await expandFeature(page, nameRe)
  await card.scrollIntoViewIfNeeded().catch(() => {})
  const btn = card
    .locator('button')
    .filter({
      hasText:
        /Реакция|Стенания|Сувениры|Голос|Походка|Преданность|Удар страха|Аура|Ужас|Шёпот|Друг смерти|Потратить|Использовать|…/,
    })
    .first()
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
  } else {
    await card.locator('button').last().click()
  }
  await expect(page.getByRole('dialog').last()).toBeVisible({ timeout: 10_000 })
}

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACTS, `shots-md5-${projectOf(testInfo)}.txt`), '')
})

test.describe('P24-M02B rogue book create-at matrix', () => {
  test.setTimeout(240_000)

  for (const level of LEVELS_MATRIX) {
    for (const pathSlug of PATHS) {
      const seed = `rogue${level}${pathSlug}`
      test(`create-at ${seed}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await createViaSeed(page, store, seed)
        if (pathSlug === 'scion') {
          await expect(page.getByText(/Наследник троицы/i).first()).toBeAttached({
            timeout: 12_000,
          })
          await expect(page.getByText(/Наследник Троих/i)).toHaveCount(0)
        } else {
          await expect(page.getByText(/Фантом/i).first()).toBeAttached({ timeout: 12_000 })
        }
        await expect(page.getByText(FORBIDDEN_RE)).toHaveCount(0)
        await shot(page, `2024-${seed}-sheet`, project)

        await openFeatures(page, project)
        await expect(
          page.locator('.feature-card, .play-desk-features').getByText(FEATURE_RE[pathSlug]).first(),
        ).toBeVisible({ timeout: 12_000 })
        await expect(page.getByText(FORBIDDEN_RE)).toHaveCount(0)
        await shot(page, `2024-${seed}-features`, project)

        await openCombat(page, project)
        await shot(page, `2024-${seed}-combat`, project)
      })
    }
  }

  for (const level of KEEP_EXTRA) {
    for (const pathSlug of PATHS) {
      const seed = `rogue${level}${pathSlug}`
      test(`create-at keep ${seed}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await createViaSeed(page, store, seed)
        await expect(page.getByText(FORBIDDEN_RE)).toHaveCount(0)
        await shot(page, `2024-${seed}-sheet`, project)
        await openFeatures(page, project)
        await shot(page, `2024-${seed}-features`, project)
        await openCombat(page, project)
        await shot(page, `2024-${seed}-combat`, project)
      })
    }
  }
})

test.describe('P24-M02B rogue book — picker + finish gate', () => {
  test.setTimeout(120_000)

  test('picker shows book paths with correct names', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installDruidHarness(page, store)
    for (const pathSlug of PATHS) {
      await page.goto(
        `/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=rogue3${pathSlug}`,
      )
      await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
      const scionChip = page.getByTestId('p24-m03c-subclass-rogue__scion-of-the-three')
      const phantomChip = page.getByTestId('p24-m03c-subclass-rogue__phantom')
      await expect(scionChip).toBeVisible({ timeout: 15_000 })
      await expect(phantomChip).toBeVisible()
      await expect(scionChip).toContainText(PICKER_RE.scion)
      await expect(phantomChip).toContainText(PICKER_RE.phantom)
      await expect(scionChip).not.toContainText(/Наследник Троих/)
      await expect(page.getByTestId('p24-m03c-subclass-rogue__swashbuckler')).toHaveCount(0)
      await expect(page.getByTestId('p24-m03c-subclass-rogue__inquisitive')).toHaveCount(0)
      await shot(page, `2024-picker-${pathSlug}`, project)
    }
  })

  test('finish disabled without dread deity at L3 scion', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installDruidHarness(page, store)
    await page.goto('/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=rogue3scion')
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    const selected = page.locator(
      '[data-testid^="p24-m02b-pick-dread-deity-"].is-on, [data-testid^="p24-m02b-pick-dread-deity-"][aria-pressed="true"], [data-testid^="p24-m02b-pick-dread-deity-"][aria-checked="true"]',
    )
    const n = await selected.count()
    for (let i = 0; i < n; i += 1) {
      await selected.nth(0).click().catch(() => {})
      await page.waitForTimeout(120)
    }
    const finish = page.getByTestId('p24-m03-finish')
    await expect(finish).toBeDisabled({ timeout: 15_000 })
    await shot(page, '2024-finish-disabled-l3-scion', project)
  })
})

test.describe('P24-M02B rogue book — live create rollbacks', () => {
  test.setTimeout(180_000)

  test('rollback 3→2 drops scion subclass', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installDruidHarness(page, store)
    await page.goto('/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=rogue3scion')
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByTestId('p24-m03c-subclass-rogue__scion-of-the-three')).toBeVisible({
      timeout: 15_000,
    })
    await setCreateLevel(page, 2)
    await expect(page.getByText(/Кровожадность/i)).toHaveCount(0)
    await shot(page, '2024-rollback-3-to-2-scion', project)
  })

  test('rollback 9→8 phantom', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installDruidHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=rogue9phantom',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Сувениры усопших/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 8)
    await expect(page.getByText(/Сувениры усопших/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-9-to-8-phantom', project)
  })

  test('rollback 13→12 scion', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installDruidHarness(page, store)
    await page.goto('/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=rogue13scion')
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Аура злобы/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 12)
    await expect(page.getByText(/Аура злобы/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-13-to-12-scion', project)
  })

  test('rollback 17→16 phantom', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installDruidHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=rogue17phantom',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/Друг смерти/i).first()).toBeVisible({ timeout: 15_000 })
    await setCreateLevel(page, 16)
    await expect(page.getByText(/Друг смерти/i)).toHaveCount(0)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-17-to-16-phantom', project)
  })

  test('rollback 20→19 scion', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installDruidHarness(page, store)
    await page.goto('/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=rogue20scion')
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await setCreateLevel(page, 19)
    await completeVisibleChoices(page)
    await shot(page, '2024-rollback-20-to-19-scion', project)
  })
})

test.describe('P24-M02B rogue book — desk mechanics', () => {
  test.setTimeout(240_000)

  test('scion: bloodthirst + allegiance + strike fear + aura + dread', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'rogue17scion')
    await openFeatures(page, project)

    await clickFeatureUse(page, /Кровожадность/)
    {
      const dlg = page.getByRole('dialog').last()
      await expect(dlg.getByText(/Кровожадность|телепорт|ИНТ|Аура/i).first()).toBeVisible({
        timeout: 8_000,
      })
    }
    await shot(page, '2024-desk-bloodthirst', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Ужасная преданность/)
    await shot(page, '2024-desk-dread-allegiance', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Удар страха/)
    await shot(page, '2024-desk-strike-fear', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Аура злобы/)
    await shot(page, '2024-desk-aura-of-malevolence', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Воплощение ужаса/)
    await shot(page, '2024-desk-dread-incarnate', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)
  })

  test('phantom: wails + tokens + voice + ghost walk + death friend', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createViaSeed(page, store, 'rogue17phantom')
    await expect(page.getByText(/Фантом/i).first()).toBeAttached({ timeout: 12_000 })
    await expect(page.getByText(FORBIDDEN_RE)).toHaveCount(0)
    await openFeatures(page, project)

    await clickFeatureUse(page, /Могильные стенания/)
    {
      const dlg = page.getByRole('dialog').last()
      await expect(dlg.getByText(/Могильные стенания|некрот|Лов|Перезвон/i).first()).toBeVisible({
        timeout: 8_000,
      })
    }
    await shot(page, '2024-desk-wails', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Сувениры усопших/)
    await shot(page, '2024-desk-tokens', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Голос мёртвых/)
    await shot(page, '2024-desk-voice-of-death', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Призрачная походка/)
    await shot(page, '2024-desk-ghost-walk', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)

    await clickFeatureUse(page, /Друг смерти/)
    await shot(page, '2024-desk-deaths-friend', project)
    await page.getByRole('dialog').last().getByRole('button', { name: /^Отмена$|^Применить$/ }).first().click()
    await dismissOpenDialogs(page)
  })
})
