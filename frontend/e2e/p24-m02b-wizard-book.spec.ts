/**
 * P24-M02B-wizard live create-at shots for book subclasses (1440 / 390).
 * Paths: conjurer / enchanter / necromancer / transmuter / bladesinger.
 * Frames: create-at-3/5/11 sheet + features + combat; keep 6/14/20.
 * Live rollbacks: 3→2, 5→4, 10→9. Book quotas: L3=12, L5=17, L11=32 (AU savant).
 * Доправка 2: visual savant book frames; bladesong-on + song-of-defense.
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore, installWizardHarness, type HarnessStore } from './support/wizard2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS =
  process.env.P24_M02B_WIZARD_ARTIFACTS ||
  path.resolve(here, '../../artifacts/p24-m02b-wizard')

const AU_PATHS = ['conjurer', 'enchanter', 'necromancer', 'transmuter'] as const
const PATHS = [...AU_PATHS, 'bladesinger'] as const

const LEVELS_MATRIX = [3, 5, 11] as const
const KEEP_EXTRA = [
  'wizard6bladesinger',
  'wizard14transmuter',
  'wizard20bladesinger',
] as const

/** AU school Savant book need (free research + savant). Bladesinger = free only. */
function bookNeedFor(level: number, pathSlug: string): number {
  const free = 6 + 2 * (level - 1)
  if (pathSlug === 'bladesinger') return free
  let savant = 2
  for (const tier of [5, 7, 9, 11, 13, 15, 17]) {
    if (level >= tier) savant += 1
  }
  return free + savant
}

function projectOf(testInfo: { project: { name: string } }): '1440' | '390' {
  return testInfo.project.name.includes('390') ? '390' : '1440'
}

const md5Cleared = new Set<string>()

async function shot(page: Page, name: string, project: string) {
  await page.waitForTimeout(350)
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  // Clear per-project once — beforeAll runs again for phone and must not wipe 1440.
  if (!md5Cleared.has(project)) {
    fs.writeFileSync(path.join(ARTIFACTS, `shots-md5-${project}.txt`), '')
    md5Cleared.add(project)
  }
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
  for (let i = 0; i < 16; i += 1) {
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
  await installWizardHarness(page, store)
  await page.goto(`/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=${seed}`)
  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
  await completeVisibleChoices(page)
  const finish = page.getByTestId('p24-m03-finish')
  await expect(finish).toBeEnabled({ timeout: 60_000 })
  await finish.click()
  await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}/i, { timeout: 30_000 })
  await dismissWelcome(page)
}

async function openFeatures(page: Page, project: string) {
  if (project === '390') {
    await page.getByText('Способн.', { exact: true }).last().click()
  } else {
    await page.getByRole('button', { name: /^Способности$/ }).first().click()
  }
  await page.waitForTimeout(700)
}

async function openCombat(page: Page, project: string) {
  if (project === '390') {
    await page.getByText('Бой', { exact: true }).last().click()
  } else {
    await page.getByRole('button', { name: /^Бой$/ }).first().click()
  }
  await page.waitForTimeout(500)
}

/** Phone vitals collapse AC/speed — expand so header tiles are readable. */
async function ensureMobileVitalsExpanded(page: Page) {
  const rest = page.getByRole('button', { name: /^Отдых$/ })
  if (await rest.isVisible().catch(() => false)) return
  const expand = page.getByRole('button', { name: /Развернуть шапку/ })
  if (await expand.isVisible().catch(() => false)) {
    await expand.click()
    await page.waitForTimeout(300)
  }
}

async function setCreateLevel(page: Page, level: number) {
  const levelInput = page.getByTestId('p24-m03c-level-wizard')
  await expect(levelInput).toBeVisible({ timeout: 10_000 })
  await levelInput.fill(String(level))
  await levelInput.blur()
  await page.waitForTimeout(450)
}

async function expandFeature(page: Page, name: string | RegExp) {
  // Match prefix: expanded titles may append scale notes.
  const nameRe = typeof name === 'string' ? new RegExp('^' + escapeRegExp(name)) : name
  const card = page
    .locator('.feature-card')
    .filter({ has: page.locator('.feature-card__name, .feature-card__title', { hasText: nameRe }) })
    .first()
  await expect(card).toBeVisible({ timeout: 12_000 })
  await card.scrollIntoViewIfNeeded()
  if (await card.locator('.feature-card__title').count()) return card
  await card.locator('button.feature-card__glance, button[aria-label="Подробнее"]').first().click()
  await expect(
    page
      .locator('.feature-card--expand')
      .filter({ has: page.locator('.feature-card__title', { hasText: nameRe }) })
      .first(),
  ).toBeVisible({ timeout: 5_000 })
  return page
    .locator('.feature-card--expand')
    .filter({ has: page.locator('.feature-card__title', { hasText: nameRe }) })
    .first()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Activate Bladesong via feature card → «Использовать…» → «Применить». */
async function activateBladesong(page: Page, project: string) {
  await openFeatures(page, project)
  const card = await expandFeature(page, /Песнь клинка/)
  const useBtn = card.getByRole('button', { name: /Использовать|Завершить песнь/i }).first()
  await expect(useBtn).toBeEnabled({ timeout: 8_000 })
  const label = ((await useBtn.innerText().catch(() => '')) || '').trim()
  if (/Завершить/i.test(label)) return
  await useBtn.click()
  const dlg = page.getByRole('dialog').filter({ hasText: /Песнь клинка/i }).last()
  await expect(dlg).toBeVisible({ timeout: 8_000 })
  await dlg.getByRole('button', { name: /^Применить$/ }).click()
  await expect(dlg).toHaveCount(0, { timeout: 8_000 })
  await page.waitForTimeout(400)
}

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

test.describe('P24-M02B wizard — visual AU savant book quotas', () => {
  test.setTimeout(120_000)

  for (const level of [3, 5, 11] as const) {
    for (const pathSlug of AU_PATHS) {
      const seed = `wizard${level}${pathSlug}`
      const need = bookNeedFor(level, pathSlug)
      test(`create book ${need}/${need} ${pathSlug}@${level}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await installWizardHarness(page, store)
        await page.goto(`/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=${seed}`)
        await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
        const bookTab = page.getByText(new RegExp(`В книгу\\s+${need}/${need}`)).first()
        await expect(bookTab).toBeVisible({ timeout: 20_000 })
        await bookTab.scrollIntoViewIfNeeded()
        await shot(page, `2024-create-book-${need}-${pathSlug}`, project)
      })
    }
  }

  for (const level of [3, 5, 11] as const) {
    const need = bookNeedFor(level, 'bladesinger')
    test(`create book ${need}/${need} bladesinger@${level} (no savant)`, async ({
      page,
    }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await installWizardHarness(page, store)
      await page.goto(
        `/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=wizard${level}bladesinger`,
      )
      await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
      const bookTab = page.getByText(new RegExp(`В книгу\\s+${need}/${need}`)).first()
      await expect(bookTab).toBeVisible({ timeout: 20_000 })
      await bookTab.scrollIntoViewIfNeeded()
      await shot(page, `2024-create-book-${need}-bladesinger`, project)
    })
  }
})

test.describe('P24-M02B wizard book create-at matrix', () => {
  test.setTimeout(240_000)

  for (const level of LEVELS_MATRIX) {
    for (const pathSlug of PATHS) {
      const seed = `wizard${level}${pathSlug}`
      test(`create-at ${seed}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await installWizardHarness(page, store)
        await page.goto(`/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=${seed}`)
        await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })

        const need = bookNeedFor(level, pathSlug)
        await expect(page.getByText(new RegExp(`В книгу\\s+${need}/${need}`)).first()).toBeVisible({
          timeout: 20_000,
        })
        await completeVisibleChoices(page)
        const finish = page.getByTestId('p24-m03-finish')
        await expect(finish).toBeEnabled({ timeout: 60_000 })
        await finish.click()
        await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}/i, { timeout: 30_000 })
        await dismissWelcome(page)

        await shot(page, `2024-${seed}-sheet`, project)

        await openFeatures(page, project)
        await shot(page, `2024-${seed}-features`, project)

        if (pathSlug === 'necromancer' && level >= 6) {
          const thralls = await expandFeature(page, /Неживые слуги/)
          // Инт + floor(ур./2) хиты; доп. урон = Инт (мин. 1)
          await expect(thralls).toContainText(/Интеллект[^\n]{0,40}половин|половин[^\n]{0,40}уровн/i)
          await expect(thralls).toContainText(/Некротическ[^\n]{0,40}Интеллект|Интеллект[^\n]{0,40}Некротическ/i)
          await shot(page, `2024-${seed}-thralls`, project)
        }

        await openCombat(page, project)
        await shot(page, `2024-${seed}-combat`, project)
      })
    }
  }

  for (const seed of KEEP_EXTRA) {
    test(`create-at keep ${seed}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await createViaSeed(page, store, seed)
      await shot(page, `2024-${seed}-sheet`, project)
      await openFeatures(page, project)
      await shot(page, `2024-${seed}-features`, project)
      await openCombat(page, project)
      await shot(page, `2024-${seed}-combat`, project)
    })
  }
})

test.describe('P24-M02B wizard — bladesong ON + song of defense', () => {
  test.setTimeout(240_000)

  for (const seed of ['wizard11bladesinger', 'wizard20bladesinger'] as const) {
    test(`bladesong-on + defense ${seed}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await createViaSeed(page, store, seed)

      await activateBladesong(page, project)
      await openCombat(page, project)
      if (project === '390') await ensureMobileVitalsExpanded(page)

      // Seed: INT 15 → +2; DEX after soldier ASI → 14 → AC 12; song → AC 14. Speed 30 → 40.
      const combatBlock = page.getByTestId('wizard-2024-bladesinger-combat')
      await combatBlock.scrollIntoViewIfNeeded()
      await expect(combatBlock).toBeVisible({ timeout: 10_000 })
      await expect(combatBlock).toContainText(/Песнь активна/)
      await expect(page.getByTestId('wizard-bladesinger-song-of-defense')).toContainText(/× 5|x 5/i)
      const acTile = page
        .getByRole('button', { name: /Класс доспеха 14/i })
        .or(page.locator('[aria-label*="Класс доспеха 14"]'))
        .or(page.getByRole('listitem', { name: /Класс доспеха 14/i }))
        .first()
      const speedTile = page
        .locator('[aria-label*="Скорость 40"], [aria-label*="ход 40"]')
        .or(page.getByRole('listitem', { name: /Скорость.*40/i }))
        .or(page.getByText(/^40$/))
        .first()
      await expect(acTile).toBeVisible({ timeout: 10_000 })
      await expect(speedTile).toBeVisible({ timeout: 10_000 })
      // Phone: keep vitals (КД 14 / Скор. 40) in frame with «Песнь активна».
      if (project === '390') {
        await acTile.scrollIntoViewIfNeeded()
        await page.waitForTimeout(200)
      }
      await shot(page, `2024-${seed}-bladesong-on`, project)

      await openFeatures(page, project)
      const defense = await expandFeature(page, /Песнь защиты/)
      // Card button label is «Песнь защиты…» (not «Использовать»).
      await defense.getByRole('button', { name: /Песнь защиты|Использовать/i }).first().click()
      const dlg = page.getByRole('dialog').filter({ hasText: /Песнь защиты|ячейк|круг/i }).last()
      await expect(dlg).toBeVisible({ timeout: 8_000 })
      await expect(dlg).toContainText(/×\s*5|круг\s*×\s*5|ячейк/i)
      await shot(page, `2024-${seed}-song-of-defense`, project)
      await dlg.getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click().catch(() => {})
    })
  }
})

test.describe('P24-M02B wizard book — live create rollbacks', () => {
  test.setTimeout(180_000)

  test('rollback 3→2 drops subclass, savant, orator/war-song/stone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installWizardHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=wizard3enchanter',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/В книгу\s+12\/12/).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Чарующий оратор/i).first()).toBeVisible({ timeout: 10_000 })

    await setCreateLevel(page, 2)
    await expect(page.getByText(/В книгу\s+8\/8/).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Чарующий оратор/i)).toHaveCount(0)
    await expect(page.getByText(/0\/\d+/)).toHaveCount(0)
    await shot(page, '2024-rollback-3-to-2-enchanter', project)
  })

  test('rollback 5→4 drops savant of new tier (17→14)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installWizardHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=wizard5conjurer',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText(/В книгу\s+17\/17/).first()).toBeVisible({ timeout: 15_000 })

    await setCreateLevel(page, 4)
    await expect(page.getByText(/В книгу\s+14\/14/).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/0\/\d+/)).toHaveCount(0)
    await shot(page, '2024-rollback-5-to-4-conjurer', project)
  })

  test('rollback 10→9 drops second stone benefit', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installWizardHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=wizard10transmuter',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 40_000 })
    await completeVisibleChoices(page)

    const stone2 = page.getByText(/Могущественный камень/i).first()
    await expect(stone2).toBeVisible({ timeout: 15_000 })
    await stone2.scrollIntoViewIfNeeded()
    await shot(page, '2024-rollback-10-to-9-transmuter-before', project)

    await setCreateLevel(page, 9)
    await expect(page.getByText(/Могущественный камень/i)).toHaveCount(0)
    await expect(page.getByText(/0\/\d+/)).toHaveCount(0)
    // Scroll forks area (level block) into view for the after frame.
    await page.getByTestId('p24-m03c-level-wizard').scrollIntoViewIfNeeded()
    await shot(page, '2024-rollback-10-to-9-transmuter', project)
  })
})
