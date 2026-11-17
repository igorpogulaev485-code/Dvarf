/**
 * 2014 paladin mocks shared by the 2014 regression specs. No 2024 harness imports,
 * so the support file plus the specs can be dropped into a baseline worktree.
 */
import { expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sampleClassic2014Character } from '../../src/features/classicSheet/sampleClassicCharacter'

const here = path.dirname(fileURLToPath(import.meta.url))
export const ARTIFACTS_2014 =
  process.env.P24_M02_PALADIN_REG_DIR || '/opt/cursor/artifacts/p24-m02-paladin/regression-2014'
const CATALOG_2014 = JSON.parse(
  fs.readFileSync(path.join(here, '../fixtures/p24-m03c-2014-catalog.json'), 'utf8'),
) as Record<string, any[]>

const PALADIN_2014_CLASS = {
  id: 'seed-class-paladin',
  kind: 'class',
  slug: 'paladin',
  name_ru: 'Паладин',
  name_en: 'Paladin',
  rules_edition: '2014',
  parent_id: null,
  source: 'phb',
  external_ref: null,
  data: {
    hit_die: 10,
    primary_abilities: ['str', 'cha'],
    saving_throws: ['wis', 'cha'],
    armor: ['light', 'medium', 'heavy', 'shields'],
    weapons: { simple: true, martial: true, extras: [] },
    tools_fixed: [],
    tool_choices: null,
    skill_choices: {
      count: 2,
      from: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    },
    multiclass_prerequisites: { all: ['str', 'cha'], min: 13 },
    multiclass_proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: { simple: true, martial: true, extras: [] },
      tools_fixed: [],
      tool_choices: null,
      skill_choices: null,
    },
    caster: { progression: 'half', ability: 'cha', prepare: 'mod+half' },
    starting_equipment: [
      {
        id: 'a',
        label_ru: 'Вариант A',
        summary_ru: 'Длинный меч + щит + 5 копий + кольчуга + священный символ + набор жреца',
        items: [
          { name: 'Длинный меч', qty: 1 },
          { name: 'Щит', qty: 1, armor_kind: 'shield', base_ac: 2 },
          { name: 'Метательное копьё', qty: 5 },
          { name: 'Кольчуга', qty: 1, armor_kind: 'heavy', base_ac: 16 },
          { name: 'Священный символ', qty: 1 },
          { name: 'Набор жреца', qty: 1 },
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
  ...(CATALOG_2014.class ?? []).filter((row) => row.slug !== 'paladin'),
  PALADIN_2014_CLASS,
]

export const SHOT_TAG = process.env.P24_M02_PALADIN_SHOT_TAG || 'after'

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
        id: '00000000-0000-4000-8000-000000000016',
        email: 'm02paladin2014@example.com',
        display_name: 'M02p',
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

export async function walk2014ToPaladinClass(page: Page) {
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
  await raceDlg.getByRole('textbox').first().fill('Торин')
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

  await expect(cardByTitle(page, 'Паладин')).toBeVisible({ timeout: 10_000 })
  await cardByTitle(page, 'Паладин').click()
  const classDlg = await openSetupDialog(
    page,
    /настройка класса/i,
    /Выбрать и настроить|Настроить класс/,
  )
  for (const label of [/^Убеждение$/, /^Проницательность$/]) {
    await chipByText(classDlg, label).click()
  }
  return classDlg
}

export function paladin2014SheetCharacter() {
  const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0008'
  const sample = JSON.parse(JSON.stringify(sampleClassic2014Character)) as Record<string, unknown>
  sample.id = id
  sample.rules_edition = '2014'
  sample.class_name = 'Паладин'
  sample.name = 'Альдрик Святой'
  sample.level = 5
  const sheet = (sample.sheet ?? {}) as Record<string, unknown>
  sheet.classes = [
    {
      id: 'c-paladin',
      slug: 'paladin',
      name: 'Паладин',
      level: 5,
      subclass_slug: 'oath_of_devotion',
      subclass_name: 'Клятва преданности',
      catalog_id: 'paladin',
    },
  ]
  const abilities = (sheet.abilities ?? {}) as Record<string, { score: number }>
  abilities.str = { score: 16 }
  abilities.dex = { score: 10 }
  abilities.con = { score: 14 }
  abilities.int = { score: 8 }
  abilities.wis = { score: 12 }
  abilities.cha = { score: 16 }
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
    slots: {
      '1': { max: 4, used: 1 },
      '2': { max: 2, used: 0 },
    },
    known: [
      spell('Благословение', 1),
      spell('Лечение ран', 1),
      spell('Божественная кара', 1),
      spell('Защита от зла и добра', 1),
      spell('Малое восстановление', 2),
      spell('Подмога', 2),
    ],
  }
  sheet.features_text = {
    features:
      'Божественное чувство.\nНаложение рук (пул 25).\nБоевой стиль: Оборона.\nБожественная кара.\nБожественное здоровье.\nСвященная клятва: Клятва преданности.\nДополнительная атака.\nАура защиты.',
  }
  sheet.play = { resources: [] }
  sheet.meta = { ...(sheet as { meta?: object }).meta, rules_edition: '2014' }
  const combat = (sheet.combat ?? {}) as Record<string, unknown>
  combat.speed = 25
  combat.ac = 18
  combat.hit_die = 'к10'
  combat.hp_dice_current = 5
  sheet.combat = combat
  sample.sheet = sheet
  sample.hp_max = 44
  sample.hp_current = 44
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
  character: ReturnType<typeof paladin2014SheetCharacter>,
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
