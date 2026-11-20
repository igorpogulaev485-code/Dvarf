/**
 * P24-M02-warlock offline checks (1440 / 390): create2024_bridge tables + 2014 regression shots.
 * Create / level-up UI evidence lives in p24-m02-warlock-live.spec.ts.
 *
 * SHOT_TAG=before|after — 2014 regression under regression-2014/.
 */
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sampleClassic2014Character } from '../src/features/classicSheet/sampleClassicCharacter'
import {
  createStore,
  installWarlockHarness,
  runCreate2024Bridge,
} from './support/warlock2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = '/opt/cursor/artifacts/p24-m02-warlock'
const ARTIFACTS_2014 = '/opt/cursor/artifacts/p24-m02-warlock/regression-2014'
const CATALOG_2014 = JSON.parse(
  fs.readFileSync(path.join(here, 'fixtures/p24-m03c-2014-catalog.json'), 'utf8'),
) as Record<string, unknown[]>

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


const PREPARED_OFFLINE = [
  'hex', 'armor-of-agathys', 'hellish-rebuke', 'misty-step', 'hold-person', 'counterspell',
  'fear', 'hypnotic-pattern', 'major-image', 'blight', 'hold-monster', 'dream', 'scrying',
  'eyebite', 'true-seeing',
]

const SHOT_TAG = process.env.P24_M02_WARLOCK_SHOT_TAG || 'after'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
})

async function shot(page: Page, dir: string, name: string, project: string) {
  await page.screenshot({
    path: path.join(dir, `${name}-${project}.png`),
    fullPage: false,
  })
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
        id: '00000000-0000-4000-8000-000000000003',
        email: 'm02m@example.com',
        display_name: 'M02m',
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
    const url = new URL(reqUrl)
    if (!url.pathname.startsWith('/catalog')) {
      await route.continue()
      return
    }
    const kind = url.searchParams.get('kind') || ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CATALOG_2014_WITH_WARLOCK[kind] || []),
    })
  })
  await page.route(
    (url) => {
      try {
        const pathName = new URL(url).pathname
        return pathName === '/characters' || pathName === '/characters/'
      } catch {
        return false
      }
    },
    async (route) => {
      if (route.request().resourceType() === 'document') {
        await route.continue()
        return
      }
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        return
      }
      await route.continue()
    },
  )
}

function cardByTitle(page: Page, title: string) {
  return page
    .locator('.create-pipeline__card')
    .filter({
      has: page.locator('.create-pipeline__card-title', { hasText: new RegExp(`^${title}$`) }),
    })
    .first()
}

async function applyDialog(page: Page, titleRe: RegExp) {
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: titleRe }) })
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  const apply = dialog.getByRole('button', { name: /^Применить$/ })
  await expect(apply).toBeEnabled({ timeout: 15_000 })
  await apply.click()
  await expect(dialog).toHaveCount(0)
}

function chipByText(scope: ReturnType<Page['locator']> | Page, text: RegExp | string) {
  return scope.locator('button.sheet-chip').filter({ hasText: text }).first()
}

async function openSetupDialog(page: Page, titleRe: RegExp, openButton: RegExp) {
  const dlg = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: titleRe }),
  })
  if (!(await dlg.isVisible().catch(() => false))) {
    const btn = page.getByRole('button', { name: openButton }).first()
    await expect(btn).toBeEnabled({ timeout: 10_000 })
    await btn.click()
  }
  await expect(dlg).toBeVisible({ timeout: 10_000 })
  return dlg
}

async function walk2014ToWarlockClass(page: Page) {
  await page.goto('/')
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
  await page.goto('/characters/create')
  await expect(page.getByText(/Создание · D&D 2014|Создание персонажа/i).first()).toBeVisible({
    timeout: 20_000,
  })
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
  if (await smith.count()) {
    await smith.click()
  }
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

async function dismissWelcome(page: Page) {
  const skip = page.getByRole('button', { name: /Пропустит.*подсказ/i })
  try {
    await skip.waitFor({ state: 'visible', timeout: 3_000 })
    await skip.click()
  } catch {
    /* already dismissed */
  }
}


function projectOf(testInfo: { project: { name: string } }): '390' | '1440' {
  return testInfo.project.name.includes('390') ? '390' : '1440'
}

const isPhone = (project: string) => project === '390'

async function ensureMobileVitalsExpanded(page: Page) {
  const rest = page.getByRole('button', { name: /^Отдых$/ })
  if (await rest.isVisible().catch(() => false)) return
  const expand = page.getByRole('button', { name: /Развернуть шапку/ })
  if (await expand.isVisible().catch(() => false)) {
    await expand.click()
    await page.waitForTimeout(300)
  }
}

async function openFeaturesScene(page: Page, project: string) {
  if (project === '390') await page.getByText('Способн.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Способности$/ }).first().click()
  await page.waitForTimeout(700)
}

function warlock2014SheetCharacter() {
  const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0004'
  const sample = JSON.parse(JSON.stringify(sampleClassic2014Character)) as Record<string, unknown>
  sample.id = id
  sample.rules_edition = '2014'
  sample.class_name = 'Колдун'
  sample.name = 'Мерек Пепельный Договор'
  sample.level = 5
  const sheet = (sample.sheet ?? {}) as Record<string, unknown>
  sheet.classes = [
    {
      id: 'c-warlock',
      slug: 'warlock',
      name: 'Колдун',
      level: 5,
      subclass_slug: 'fiend',
      subclass_name: 'Исчадие',
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
  const spell = (name: string, level: number, extra: Record<string, unknown> = {}) => ({
    id: `spell:${name}`,
    name,
    level,
    prepared: true,
    notes: '',
    ...extra,
  })
  sheet.spells = {
    casting_ability: 'cha',
    max_prepared: null,
    slots: {},
    pact_slots: { max: 2, used: 1, level: 3 },
    known: [
      spell('Мистический заряд', 0),
      spell('Волшебная рука', 0),
      spell('Сглаз', 1),
      spell('Адское возмездие', 1),
      spell('Туманный шаг', 2),
      spell('Контрзаклинание', 3),
    ],
  }
  sheet.features_text = {
    features:
      'Мистические воззвания: Мучительный взрыв, Дьявольское зрение, Доспех теней.\nМагия договора: 2 ячейки 3-го круга.\nБлагословение Тёмного.\nДар договора.',
  }
  sheet.feature_picks = {
    values: { 'c-warlock:eldritch_invocations': 'agonizing_blast,devils_sight,armor_of_shadows' },
  }
  sheet.play = { resources: [] }
  sheet.meta = { ...(sheet as { meta?: object }).meta, rules_edition: '2014' }
  const combat = (sheet.combat ?? {}) as Record<string, unknown>
  combat.speed = 30
  combat.ac = 13
  combat.hit_die = 'к8'
  combat.hp_dice_current = 5
  sheet.combat = combat
  sample.sheet = sheet
  sample.hp_max = 38
  sample.hp_current = 38
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
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'access')
    localStorage.setItem('dvarf.refresh_token', 'refresh')
  })
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
    if (
      route.request().method() === 'GET' &&
      (pathName === '/characters' || pathName === '/characters/')
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([character]),
      })
      return
    }
    if (pathName.startsWith('/characters')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(character),
      })
      return
    }
    await route.continue()
  })
}


test.describe('P24-M02 warlock — offline create2024_bridge tables', () => {
  test.setTimeout(60_000)

  const TABLE = [
    { level: 1, cantrips: 2, prepared: 2, pact: { level: 1, count: 1 } },
    { level: 5, cantrips: 3, prepared: 6, pact: { level: 3, count: 2 } },
    { level: 11, cantrips: 4, prepared: 11, pact: { level: 5, count: 3 } },
    { level: 20, cantrips: 4, prepared: 15, pact: { level: 5, count: 4 } },
  ]

  for (const row of TABLE) {
    test(`bridge L${row.level}: pact ${row.pact.count}x${row.pact.level}, prepared ${row.prepared}`, async () => {
      const prepared = PREPARED_OFFLINE.slice(0, row.prepared)
      const asi: Array<Record<string, unknown>> = []
      const bumps = [{ cha: 2 }, { con: 2 }, { dex: 2 }, { wis: 2 }]
      ;[4, 8, 12, 16].forEach((lv, i) => {
        if (lv <= row.level) {
          asi.push({ class_slug: 'warlock', class_level: lv, kind: 'asi_plus2', abilities: bumps[i] })
        }
      })
      const payload = {
        name: `Bridge L${row.level}`,
        is_preview: true,
        class_slug: 'warlock',
        background_slug: 'soldier',
        species_slug: 'dwarf',
        ability_method: 'standard_array',
        base_abilities: { str: 8, dex: 12, con: 14, int: 10, wis: 13, cha: 15 },
        background_asi_mode: '+2/+1',
        background_asi: { con: 2, dex: 1 },
        language_ids: ['elvish', 'dwarvish'],
        class_skill_ids: ['arcana', 'history'],
        background_tool_id: 'dice-set',
        background_equipment: 'pack',
        class_equipment: 'a',
        cantrip_ids: ['eldritch-blast', 'mage-hand', 'prestidigitation', 'chill-touch'].slice(0, row.cantrips),
        prepared_spell_ids: prepared,
        class_levels: [
          {
            slug: 'warlock',
            level: row.level,
            subclass_slug: row.level >= 3 ? 'warlock__archfey' : null,
          },
        ],
        subclass_slug: row.level >= 3 ? 'warlock__archfey' : null,
        asi_choices: asi,
        class_option_picks: {
          eldritch_invocations: ['armor-of-shadows'],
          client_picks: { class_tools: [], origin_feat_picks: {}, species_picks: {} },
        },
      }
      const result = runCreate2024Bridge(payload)
      if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
      const sheet = result.sheet as Record<string, any>
      expect(sheet.classes[0].level).toBe(row.level)
      expect(sheet.spells.pact_slots).toMatchObject({
        level: row.pact.level,
        count: row.pact.count,
        max: row.pact.count,
        used: 0,
      })
      expect(sheet.class_progress_2024.multiclass_pact).toEqual(row.pact)
      const known = (sheet.spells.known ?? []) as Array<{ level: number }>
      expect(known.filter((x) => x.level === 0).length).toBe(row.cantrips)
      expect(known.filter((x) => x.level > 0).length).toBe(row.prepared)
    })
  }

  test('2024 create opens without preview; legacy ?preview=1 still works', async ({ page }) => {
    const store = createStore()
    await installWarlockHarness(page, store)
    await page.goto('/characters/create?edition=2024')
    await expect(page.getByTestId('create-character-2024')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByTestId('p24-m03-step-species')).toBeVisible()

    await page.goto('/characters/create?edition=2024&preview=1')
    await expect(page.getByTestId('create-character-2024')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByTestId('p24-m03-step-species')).toBeVisible()
  })
})

test.describe('P24-M02 2014 regression (warlock)', () => {
  test.setTimeout(90_000)
  test.use({ actionTimeout: 12_000 })

  test('2014 create — класс Колдун', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-race-marker`, project)

    const classDlg = await walk2014ToWarlockClass(page)
    await expect(page.getByRole('heading', { name: /Колдун: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Магия|Обман|арбалет|договор/i)
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-warlock-class`, project)
  })

  test('2014 sheet — колдун: шапка + 6 характеристик (ХАР) + заклинания/воззвания', async ({ page }, testInfo) => {
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
      await ensureMobileVitalsExpanded(page)
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-warlock-header`, project)
      await page.locator('button.mobile-vitals__abil').click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await abilPage.locator('.abil-block[data-abil="cha"]').first().scrollIntoViewIfNeeded()
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-warlock-abilities`, project)
      await abilPage.locator('button.mobile-abil-page__back').click()
      await expect(abilPage).toHaveCount(0, { timeout: 10_000 })
    } else {
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(page.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-warlock`, project)
    }

    await openFeaturesScene(page, project)
    await expect(page.getByText(/воззвани|Магия договора|Благословение/i).first()).toBeVisible({
      timeout: 15_000,
    })
    const invCard = page.locator('.feature-card').filter({ hasText: /воззвани/i }).first()
    if (await invCard.count()) await invCard.scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-warlock-features-invocations`, project)

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
    await expect(page.getByText(/Мистический заряд|Сглаз/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-warlock-spells`, project)
  })
})
