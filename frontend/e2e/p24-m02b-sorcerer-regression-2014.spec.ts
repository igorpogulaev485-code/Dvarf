/**
 * P24-M02B-sorcerer 2014 regression (1440 / 390) with md5 sidecars.
 * P24_M02B_SORCERER_SHOT_TAG=before|after
 * Artifacts: ../artifacts/p24-m02b-sorcerer/regression-2014/
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sampleClassic2014Character } from '../src/features/classicSheet/sampleClassicCharacter'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS_2014 =
  process.env.P24_M02B_SORCERER_REG_DIR ||
  path.resolve(here, '../../artifacts/p24-m02b-sorcerer/regression-2014')
const CATALOG_2014 = JSON.parse(
  fs.readFileSync(path.join(here, 'fixtures/p24-m03c-2014-catalog.json'), 'utf8'),
) as Record<string, unknown[]>

const SHOT_TAG = process.env.P24_M02B_SORCERER_SHOT_TAG || 'after'

function projectOf(testInfo: { project: { name: string } }): '1440' | '390' {
  return testInfo.project.name.includes('390') ? '390' : '1440'
}

function md5SidecarName(project: string) {
  return `${SHOT_TAG}-md5-${project}.txt`
}

async function shot(page: Page, name: string, project: string) {
  await page.evaluate(async () => {
    // Stabilize fonts / layout before md5 (390 sheet was flaky on tip too).
    try {
      await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready
    } catch {
      /* ignore */
    }
  })
  await page.waitForTimeout(900)
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
  const file = `${name}-${project}.png`
  const buffer = await page.screenshot({
    path: path.join(ARTIFACTS_2014, file),
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
  })
  const md5 = createHash('md5').update(buffer).digest('hex')
  fs.appendFileSync(path.join(ARTIFACTS_2014, md5SidecarName(project)), `${md5}  ${file}\n`)
}

function isApi(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.pathname.startsWith('/src/') || u.pathname.includes('node_modules')) return false
    if (u.pathname.endsWith('.tsx') || u.pathname.endsWith('.ts') || u.pathname.endsWith('.js')) {
      return false
    }
    return true
  } catch {
    return false
  }
}

function cardByTitle(page: Page, title: string) {
  return page
    .locator('.create-pipeline__card')
    .filter({
      has: page.locator('.create-pipeline__card-title', { hasText: new RegExp(`^${title}$`) }),
    })
    .first()
}

function chipByText(root: ReturnType<Page['locator']> | Page, re: RegExp) {
  return root.locator('button.sheet-chip').filter({ hasText: re }).first()
}

async function openSetupDialog(page: Page, heading: RegExp, button: RegExp) {
  const dlg = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: heading }),
  })
  if (!(await dlg.isVisible().catch(() => false))) {
    const btn = page.getByRole('button', { name: button }).first()
    await expect(btn).toBeEnabled({ timeout: 10_000 })
    await btn.click()
  }
  await expect(dlg).toBeVisible({ timeout: 10_000 })
  return dlg
}

async function applyDialog(page: Page, heading: RegExp) {
  const dlg = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: heading }),
  })
  await expect(dlg).toBeVisible({ timeout: 10_000 })
  const apply = dlg.getByRole('button', { name: /^Применить$/ })
  await expect(apply).toBeEnabled({ timeout: 15_000 })
  await apply.click()
  await expect(dlg).toHaveCount(0, { timeout: 10_000 })
}

async function mock2014(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'access')
    localStorage.setItem('dvarf.refresh_token', 'refresh')
    try {
      localStorage.removeItem('dvarf.createPipeline.v2')
    } catch {
      /* ignore */
    }
  })
  await page.route('**/health', async (route) => {
    if (!isApi(route.request().url())) {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    })
  })
  await page.route('**/auth/**', async (route) => {
    if (!isApi(route.request().url()) || route.request().resourceType() === 'document') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '00000000-0000-4000-8000-000000000001',
        email: 'm02bs@example.com',
        display_name: 'M02bS',
        is_email_verified: true,
        access_token: 'access',
        refresh_token: 'refresh',
      }),
    })
  })
  await page.route('**/catalog**', async (route) => {
    const reqUrl = route.request().url()
    if (!isApi(reqUrl) || reqUrl.includes('/src/') || route.request().resourceType() === 'document') {
      await route.continue()
      return
    }
    const u = new URL(reqUrl)
    const kind = u.searchParams.get('kind') || ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CATALOG_2014[kind] || []),
    })
  })
  await page.route('**/characters**', async (route) => {
    if (!isApi(route.request().url()) || route.request().resourceType() === 'document') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
}

async function walk2014ToSorcererClass(page: Page) {
  await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
  await cardByTitle(page, 'Дварф').click()
  const raceDlg = await openSetupDialog(
    page,
    /настройка расы/i,
    /Выбрать и настроить|Настроить расу/,
  )
  await raceDlg
    .locator('button.sheet-chip')
    .filter({ has: page.locator('strong', { hasText: /^Дварф \(горный\)$/ }) })
    .click()
  await chipByText(raceDlg, /^Мужской$/).click()
  await raceDlg.getByRole('textbox').first().fill('Гимли')
  const smith = chipByText(raceDlg, /Инструменты кузнеца/)
  if (await smith.count()) await smith.click()
  await applyDialog(page, /настройка расы/i)

  await cardByTitle(page, 'Солдат').click()
  await openSetupDialog(
    page,
    /настройка предыстории/i,
    /Выбрать и настроить|Настроить предысторию/,
  )
  await applyDialog(page, /настройка предыстории/i)

  await expect(cardByTitle(page, 'Чародей')).toBeVisible({ timeout: 10_000 })
  await cardByTitle(page, 'Чародей').click()
  const classDlg = await openSetupDialog(
    page,
    /настройка класса/i,
    /Выбрать и настроить|Настроить класс/,
  )
  await chipByText(classDlg, /^Магия$/).click()
  await chipByText(classDlg, /^Обман$/).click()
  for (const label of [/Копьё/i, /Кинжал/i, /Посох/i, /Фокусировка/i, /Вариант A/i]) {
    const chip = chipByText(classDlg, label)
    if (await chip.isVisible().catch(() => false)) {
      await chip.click()
      break
    }
  }
  return classDlg
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function sorcerer2014SheetCharacter() {
  const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee00c2'
  const sample = JSON.parse(JSON.stringify(sampleClassic2014Character)) as Record<string, unknown>
  sample.id = id
  sample.rules_edition = '2014'
  sample.class_name = 'Чародей'
  sample.name = 'Селенья Искра'
  const sheet = (sample.sheet ?? {}) as Record<string, unknown>
  sheet.classes = [
    {
      id: 'c-sorcerer',
      slug: 'sorcerer',
      name: 'Чародей',
      level: 5,
      subclass_slug: 'draconic',
      subclass_name: 'Драконья кровь',
      catalog_id: 'sorcerer',
    },
  ]
  const abilities = (sheet.abilities ?? {}) as Record<string, { score: number }>
  abilities.str = { score: 8 }
  abilities.dex = { score: 14 }
  abilities.con = { score: 16 }
  abilities.int = { score: 10 }
  abilities.wis = { score: 12 }
  abilities.cha = { score: 18 }
  sheet.saves = {
    con: { is_proficient: true },
    cha: { is_proficient: true },
  }
  const spells = (sheet.spells ?? {}) as Record<string, unknown>
  spells.casting_ability = 'cha'
  spells.max_prepared = null
  sheet.abilities = abilities
  sheet.spells = spells
  sheet.meta = { ...(asRecord(sheet.meta) as object), rules_edition: '2014' }
  sample.sheet = sheet
  return sample as {
    id: string
    name: string
    level: number
    class_name: string
    race_name: string
    hp_current: number
    hp_max: number
    rules_edition: string
    sheet_version: number
    sheet: Record<string, unknown>
    created_at: string
    updated_at: string
    avatar_url: null
  }
}

async function mock2014Sheet(page: Page, character: ReturnType<typeof sorcerer2014SheetCharacter>) {
  await mock2014(page)
  await page.route('**/characters/**', async (route) => {
    const pathName = new URL(route.request().url()).pathname
    if (
      route.request().resourceType() === 'document' ||
      pathName.startsWith('/src/') ||
      pathName.startsWith('/assets/') ||
      pathName.includes('node_modules') ||
      /\.(tsx?|jsx?|css|map|json)$/.test(pathName)
    ) {
      await route.continue()
      return
    }
    if (!pathName.startsWith('/characters')) {
      await route.continue()
      return
    }
    if (route.request().method() === 'GET' && /^\/characters\/[0-9a-f-]{36}/i.test(pathName)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(character),
      })
      return
    }
    if (route.request().method() === 'GET' && (pathName === '/characters' || pathName === '/characters/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([character]),
      })
      return
    }
    await route.continue()
  })
}

async function dismissWelcome(page: Page) {
  const skip = page.getByRole('button', { name: /Пропустит.*подсказ/i })
  try {
    await skip.waitFor({ state: 'visible', timeout: 3_000 })
    await skip.click()
  } catch {
    /* already dismissed */
  }
}

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACTS_2014, md5SidecarName(projectOf(testInfo))), '')
})

test.describe('P24-M02B 2014 regression (sorcerer)', () => {
  test.setTimeout(90_000)

  test('2014 create — класс Чародей', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, `${tag}-create-2014-race-marker`, project)

    const classDlg = await walk2014ToSorcererClass(page)
    await expect(page.getByRole('heading', { name: /Чародей: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Магия|снаряжен|метамаг|очк/i)
    await shot(page, `${tag}-create-2014-sorcerer-class`, project)
  })

  test('2014 sheet — чародей шапка/умения', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = sorcerer2014SheetCharacter()
    await mock2014Sheet(page, character)
    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Селенья|Чародей/i).first()).toBeVisible({ timeout: 15_000 })
    if (project === '390') {
      await page.getByText('Бой', { exact: true }).last().click()
      await page.waitForTimeout(300)
    }
    await shot(page, `${tag}-sheet-2014-sorcerer`, project)
  })
})
