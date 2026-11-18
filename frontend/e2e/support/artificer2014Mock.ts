/**
 * 2014 artificer («Изобретатель») mocks shared by the 2014 regression specs.
 */
import { expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sampleClassic2014Character } from '../../src/features/classicSheet/sampleClassicCharacter'

const here = path.dirname(fileURLToPath(import.meta.url))
export const ARTIFACTS_2014 =
  process.env.P24_M02_ARTIFICER_REG_DIR ||
  path.resolve(process.cwd(), '../artifacts/p24-m02-artificer/regression-2014')
const CATALOG_2014 = JSON.parse(
  fs.readFileSync(path.join(here, '../fixtures/p24-m03c-2014-catalog.json'), 'utf8'),
) as Record<string, any[]>

const ARTIFICER_2014_CLASS = {
  id: 'seed-class-artificer',
  kind: 'class',
  slug: 'artificer',
  name_ru: 'Изобретатель',
  name_en: 'Artificer',
  rules_edition: '2014',
  parent_id: null,
  source: 'tasha',
  external_ref: null,
  data: {
    hit_die: 8,
    primary_abilities: ['int'],
    saving_throws: ['con', 'int'],
    armor: ['light', 'medium', 'shields'],
    weapons: { simple: true, martial: false, extras: [] },
    tools_fixed: ['thieves-tools', 'tinkers-tools'],
    tool_choices: { count: 1, from: 'artisan_tools' },
    skill_choices: {
      count: 2,
      from: [
        'arcana',
        'history',
        'investigation',
        'medicine',
        'nature',
        'perception',
        'sleight_of_hand',
      ],
    },
    multiclass_prerequisites: { all: ['int'], min: 13 },
    multiclass_proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: { simple: false, martial: false, extras: [] },
      tools_fixed: ['thieves-tools', 'tinkers-tools'],
      tool_choices: null,
      skill_choices: null,
    },
    caster: { progression: 'half_up', ability: 'int', prepare: 'mod+half' },
    starting_equipment: [
      {
        id: 'a',
        label_ru: 'Вариант A',
        summary_ru: '2 простых оружия + лёгкий арбалет + клёпаный кожаный + воровские + набор исследователя',
        items: [
          { name: 'Боевой посох', qty: 1 },
          { name: 'Кинжал', qty: 1 },
          { name: 'Лёгкий арбалет', qty: 1 },
          { name: 'Болты арбалета', qty: 20 },
          { name: 'Клёпаный кожаный доспех', qty: 1, armor_kind: 'light', base_ac: 12 },
          { name: 'Воровские инструменты', qty: 1 },
          { name: 'Набор исследователя', qty: 1 },
        ],
      },
      { id: 'gold', label_ru: 'Золото', summary_ru: '5к4×10 зм', items: [], coins_gp: 125 },
    ],
  },
  sort_order: 0,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}
CATALOG_2014.class = [
  ...(CATALOG_2014.class ?? []).filter((row) => row.slug !== 'artificer'),
  ARTIFICER_2014_CLASS,
]

export const SHOT_TAG = process.env.P24_M02_ARTIFICER_SHOT_TAG || 'after'

export const md5SidecarName = (project: string) => `${SHOT_TAG}-md5-${project}.txt`

export async function shot(page: Page, dir: string, name: string, project: string) {
  await page.waitForTimeout(400)
  fs.mkdirSync(dir, { recursive: true })
  const file = `${name}-${project}.png`
  const buffer = await page.screenshot({
    path: path.join(dir, file),
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
  })
  const md5 = createHash('md5').update(buffer).digest('hex')
  fs.appendFileSync(path.join(dir, md5SidecarName(project)), `${md5}  ${file}\n`)
  console.log(`[md5] ${md5}  ${file}`)
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

export async function mock2014(page: Page) {
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
        id: '00000000-0000-4000-8000-000000000027',
        email: 'm02artificer2014@example.com',
        display_name: 'M02a',
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
      body: JSON.stringify(CATALOG_2014[kind] || []),
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

export async function dismissWelcome(page: Page) {
  const skip = page.getByRole('button', { name: /Пропустит.*подсказ/i })
  try {
    await skip.waitFor({ state: 'visible', timeout: 3_000 })
    await skip.click()
  } catch {
    /* already dismissed */
  }
}

export function projectOf(testInfo: { project: { name: string } }): '390' | '1440' {
  return testInfo.project.name.includes('390') ? '390' : '1440'
}

export const isPhone = (project: string) => project === '390'

export async function ensureMobileVitalsExpanded(page: Page) {
  const rest = page.getByRole('button', { name: /^Отдых$/ })
  if (await rest.isVisible().catch(() => false)) return
  const expand = page.getByRole('button', { name: /Развернуть шапку/ })
  if (await expand.isVisible().catch(() => false)) {
    await expand.click()
    await page.waitForTimeout(300)
  }
}

export async function openFeaturesScene(page: Page, project: string) {
  if (project === '390') await page.getByText('Способн.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Способности$/ }).first().click()
  await page.waitForTimeout(700)
}

export async function walk2014ToArtificerClass(page: Page) {
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
  await raceDlg.getByRole('textbox').first().fill('Тиббл')
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

  await expect(cardByTitle(page, 'Изобретатель')).toBeVisible({ timeout: 10_000 })
  await cardByTitle(page, 'Изобретатель').click()
  const classDlg = await openSetupDialog(
    page,
    /настройка класса/i,
    /Выбрать и настроить|Настроить класс/,
  )
  for (const label of [/^Анализ$/, /^Магия$/]) {
    const chip = chipByText(classDlg, label)
    if (await chip.count()) await chip.click()
  }
  // Fallback: click first two unchecked skill chips if RU labels differ.
  const skillChips = classDlg.locator('button.sheet-chip').filter({ hasText: /Анализ|Магия|История|Медицина|Природа|Внимательность|Ловкость рук/ })
  const picked = await skillChips.count()
  if (picked < 2) {
    const anySkills = classDlg.locator('.sheet-chip-row button.sheet-chip, button.sheet-chip')
    for (let i = 0; i < Math.min(2, await anySkills.count()); i += 1) {
      await anySkills.nth(i).click()
    }
  }
  return classDlg
}

export function artificer2014SheetCharacter(opts?: { level?: number; name?: string }) {
  const level = Math.max(1, Math.floor(opts?.level ?? 5))
  const id = `aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee01${String(level).padStart(2, '0')}`
  const sample = JSON.parse(JSON.stringify(sampleClassic2014Character)) as Record<string, unknown>
  sample.id = id
  sample.rules_edition = '2014'
  sample.class_name = 'Изобретатель'
  sample.name = opts?.name ?? 'Тиббл Шестерёнкин'
  sample.level = level
  const sheet = (sample.sheet ?? {}) as Record<string, unknown>
  sheet.classes = [
    {
      id: 'c-artificer',
      slug: 'artificer',
      name: 'Изобретатель',
      level,
      subclass_slug: 'alchemist',
      subclass_name: 'Алхимик',
      catalog_id: 'artificer',
    },
  ]
  const abilities = (sheet.abilities ?? {}) as Record<string, { score: number }>
  abilities.str = { score: 10 }
  abilities.dex = { score: 14 }
  abilities.con = { score: 14 }
  abilities.int = { score: 16 }
  abilities.wis = { score: 12 }
  abilities.cha = { score: 8 }
  sheet.saves = {
    con: { is_proficient: true },
    int: { is_proficient: true },
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
    casting_ability: 'int',
    slots: {
      '1': { max: 4, used: 0 },
      '2': { max: 2, used: 0 },
    },
    known: [
      spell('Починка', 0),
      spell('Брызги кислоты', 0),
      spell('Лечение ран', 1),
      spell('Обнаружение магии', 1),
      spell('Опознание', 1),
      spell('Прыжок', 1),
    ],
  }
  // 2014 names — NOT 2024 «Магия вещей» / «Реплики магических предметов» / «Душа творения».
  sheet.features_text = {
    features:
      'Магическое мастерство · Использование заклинаний.\nИнфузия предмета.\nВспышка гениальности.\nКомпетентность в инструментах.\nЭкспериментальный эликсир (Алхимик).',
  }
  sheet.play = {
    resources: [
      {
        id: 'flash_of_genius',
        pool_id: 'flash_of_genius',
        name: 'Вспышка гениальности',
        max: 3,
        used: 0,
        reset: 'long',
      },
      {
        id: 'infusion_slots',
        pool_id: 'infusion_slots',
        name: 'Активные инфузии',
        max: 2,
        used: 0,
        reset: 'long',
      },
    ],
  }
  sheet.meta = { ...(sheet as { meta?: object }).meta, rules_edition: '2014' }
  const combat = (sheet.combat ?? {}) as Record<string, unknown>
  combat.speed = 30
  combat.ac = 14
  combat.hit_die = 'к8'
  combat.hp_dice_current = level
  sheet.combat = combat
  sample.sheet = sheet
  sample.hp_max = 8 + 5 * level
  sample.hp_current = sample.hp_max
  sample.race_name = 'Дварф (горный)'
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

export async function mock2014Sheet(
  page: Page,
  character: ReturnType<typeof artificer2014SheetCharacter>,
) {
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
