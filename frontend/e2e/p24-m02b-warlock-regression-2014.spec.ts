/**
 * P24-M02B-warlock 2014 regression (1440 / 390) with md5 sidecars.
 * Full set like monk: 5 desktop + 6 phone (create race/class + sheet header/abil/features + fiend).
 * P24_M02B_WARLOCK_SHOT_TAG=before|after
 * Artifacts: ../artifacts/p24-m02b-warlock/regression-2014/
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sampleClassic2014Character } from '../src/features/classicSheet/sampleClassicCharacter'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS_2014 =
  process.env.P24_M02B_WARLOCK_REG_DIR ||
  path.resolve(here, '../../artifacts/p24-m02b-warlock/regression-2014')
const CATALOG_2014 = JSON.parse(
  fs.readFileSync(path.join(here, 'fixtures/p24-m03c-2014-catalog.json'), 'utf8'),
) as Record<string, unknown[]>

const SHOT_TAG = process.env.P24_M02B_WARLOCK_SHOT_TAG || 'after'

/** Inject 2014 Warlock into the thin fixture used by create/regression mocks. */
const WARLOCK_2014_CLASS = {
  id: 'seed-class-warlock',
  kind: 'class',
  slug: 'warlock',
  name_ru: 'Колдун',
  name_en: 'Warlock',
  rules_edition: '2014',
  parent_id: null,
  source: 'phb',
  external_ref: null,
  data: {
    hit_die: 8,
    primary_abilities: ['cha'],
    saving_throws: ['wis', 'cha'],
    armor: ['light'],
    weapons: { simple: true, martial: false, extras: [] },
    tools_fixed: [],
    tool_choices: null,
    skill_choices: {
      count: 2,
      from: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
    },
    multiclass_prerequisites: { all: ['cha'], min: 13 },
    caster: { progression: 'pact', ability: 'cha', prepare: null },
    starting_equipment: [
      {
        id: 'a',
        label_ru: 'Вариант A',
        summary_ru: 'Лёгкий арбалет + набор учёного + кожаный доспех',
        items: [
          { name: 'Лёгкий арбалет', qty: 1 },
          { name: 'Набор учёного', qty: 1 },
          { name: 'Кожаный доспех', qty: 1 },
        ],
      },
      { id: 'gold', label_ru: 'Золото', summary_ru: '4к4×10 зм', items: [], coins_gp: 100 },
    ],
  },
  sort_order: 70,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const CATALOG_2014_WITH_WARLOCK: Record<string, unknown[]> = {
  ...CATALOG_2014,
  class: [...(CATALOG_2014.class || []), WARLOCK_2014_CLASS],
}

function projectOf(testInfo: { project: { name: string } }): '1440' | '390' {
  return testInfo.project.name.includes('390') ? '390' : '1440'
}

function isPhone(project: string) {
  return project === '390'
}

function md5SidecarName(project: string) {
  return `${SHOT_TAG}-md5-${project}.txt`
}

async function shot(page: Page, name: string, project: string) {
  await page.evaluate(async () => {
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
        email: 'm02bw@example.com',
        display_name: 'M02bW',
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
      body: JSON.stringify(CATALOG_2014_WITH_WARLOCK[kind] || []),
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

async function walk2014ToWarlockClass(page: Page) {
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
  await raceDlg.getByRole('textbox').first().fill('Браун')
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

  await expect(cardByTitle(page, 'Колдун')).toBeVisible({ timeout: 10_000 })
  await cardByTitle(page, 'Колдун').click()
  const classDlg = await openSetupDialog(
    page,
    /настройка класса/i,
    /Выбрать и настроить|Настроить класс/,
  )
  await chipByText(classDlg, /Магия|Обман|История/i).first().click()
  const skill2 = classDlg
    .locator('button.sheet-chip:not([disabled])')
    .filter({ hasText: /Расследование|Религия|Природа|Запугивание/i })
  if ((await skill2.count()) > 0) await skill2.first().click()
  for (const label of [/арбалет/i, /Вариант A/i]) {
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

const FIEND_META = {
  subclass_slug: 'fiend',
  subclass_name: 'Исчадие',
  featureRe: /Исчадие|Благословение тёмного владыки|Удача тёмного владыки|Устойчивость исчадия|Врата ада|Благословение/i,
}

function warlock2014SheetCharacter(opts?: {
  level?: number
  name?: string
  withFiend?: boolean
}) {
  const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee00c4'
  const sample = JSON.parse(JSON.stringify(sampleClassic2014Character)) as Record<string, unknown>
  sample.id = id
  sample.rules_edition = '2014'
  sample.class_name = 'Колдун'
  sample.name = opts?.name ?? 'Мерек Пепельный Договор'
  sample.level = opts?.level ?? 5
  const sheet = (sample.sheet ?? {}) as Record<string, unknown>
  const withFiend = opts?.withFiend !== false
  sheet.classes = [
    {
      id: 'c-warlock',
      slug: 'warlock',
      name: 'Колдун',
      level: opts?.level ?? 5,
      subclass_slug: withFiend ? FIEND_META.subclass_slug : null,
      subclass_name: withFiend ? FIEND_META.subclass_name : null,
      catalog_id: 'warlock',
    },
  ]
  const abilities = (sheet.abilities ?? {}) as Record<string, { score: number }>
  abilities.str = { score: 8 }
  abilities.dex = { score: 14 }
  abilities.con = { score: 14 }
  abilities.int = { score: 10 }
  abilities.wis = { score: 12 }
  abilities.cha = { score: 18 }
  sheet.saves = {
    wis: { is_proficient: true },
    cha: { is_proficient: true },
  }
  sheet.abilities = abilities
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

async function mock2014Sheet(page: Page, character: ReturnType<typeof warlock2014SheetCharacter>) {
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

async function openFeaturesScene(page: Page, project: string) {
  if (isPhone(project)) await page.getByText('Способн.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Способности$/ }).first().click()
  await page.waitForTimeout(700)
}

test.beforeAll(({}, testInfo) => {
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACTS_2014, md5SidecarName(projectOf(testInfo))), '')
})

test.describe('P24-M02B 2014 regression (warlock)', () => {
  test.setTimeout(120_000)

  test('2014 create — класс Колдун', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, `${tag}-create-2014-race-marker`, project)

    const classDlg = await walk2014ToWarlockClass(page)
    await expect(page.getByRole('heading', { name: /Колдун: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Магия|Обман|арбалет|договор|снаряжен/i)
    await shot(page, `${tag}-create-2014-warlock-class`, project)
  })

  test('2014 sheet — колдун шапка / умения', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = warlock2014SheetCharacter()
    await mock2014Sheet(page, character)
    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Мерек|Колдун/i).first()).toBeVisible({ timeout: 15_000 })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await page.waitForTimeout(300)
      const expand = page.getByRole('button', { name: /Развернуть шапку/ })
      if (await expand.isVisible().catch(() => false)) {
        await expand.click()
        await page.waitForTimeout(300)
      }
      await shot(page, `${tag}-sheet-2014-warlock-header`, project)
      const abilBtn = page.locator('button.mobile-vitals__abil')
      await expect(abilBtn).toBeVisible({ timeout: 10_000 })
      await abilBtn.click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await shot(page, `${tag}-sheet-2014-warlock-abilities`, project)
      await abilPage.locator('button.mobile-abil-page__back').click()
      await expect(abilPage).toHaveCount(0, { timeout: 10_000 })
    } else {
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(page.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await shot(page, `${tag}-sheet-2014-warlock`, project)
    }

    await openFeaturesScene(page, project)
    const classFeature = page
      .locator('.feature-card, .play-desk-features, [data-onboarding="features"]')
      .first()
    await classFeature.scrollIntoViewIfNeeded().catch(() => {})
    await expect(classFeature).toBeVisible({ timeout: 15_000 })
    await shot(page, `${tag}-sheet-2014-warlock-features`, project)
  })

  test('2014 sheet — покровитель Исчадие', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = warlock2014SheetCharacter({
      level: 5,
      name: 'Мерек Исчадие',
      withFiend: true,
    })
    const sheet = character.sheet as Record<string, unknown>
    sheet.features = [
      {
        id: 'dark-ones-blessing',
        name_ru: 'Благословение тёмного владыки',
        summary_ru: 'При убийстве существа — временные хиты.',
        source: 'subclass',
        class_level: 1,
      },
      {
        id: 'pact-magic',
        name_ru: 'Магия договора',
        summary_ru: 'Ячейки договора и подготовленные заклинания.',
        source: 'class',
        class_level: 1,
      },
    ]
    character.sheet = sheet
    await mock2014Sheet(page, character)
    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click({ force: true })
      await page.waitForTimeout(250)
    }
    await openFeaturesScene(page, project)
    const tradition = page
      .locator('.feature-card, .play-desk-features')
      .getByText(FIEND_META.featureRe)
      .first()
    await tradition.scrollIntoViewIfNeeded().catch(() => {})
    await expect(tradition).toBeVisible({ timeout: 15_000 })
    await shot(page, `${tag}-sheet-2014-fiend-features`, project)
  })
})
