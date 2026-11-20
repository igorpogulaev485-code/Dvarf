/**
 * 2014 barbarian («Варвар») mocks shared by the 2014 regression specs.
 *
 * Feature names must stay 2014: Ярость, Защита без доспехов, Чувство опасности,
 * Безрассудная атака, Путь дикости, Жестокий критический удар, Непреклонная ярость,
 * Стойкая ярость, Неукротимая мощь, Изначальный чемпион — NOT 2024 «Чутьё опасности» /
 * «Изначальное знание» / «Инстинктивный бросок» / «Неукротимая ярость» / «Жестокий удар» /
 * «Путь дикого сердца» / «Путь Мирового древа».
 */
import { expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sampleClassic2014Character } from '../../src/features/classicSheet/sampleClassicCharacter'

const here = path.dirname(fileURLToPath(import.meta.url))
export const ARTIFACTS_2014 =
  process.env.P24_M02_BARBARIAN_REG_DIR ||
  path.resolve(process.cwd(), '../artifacts/p24-m02-barbarian/regression-2014')
const CATALOG_2014 = JSON.parse(
  fs.readFileSync(path.join(here, '../fixtures/p24-m03c-2014-catalog.json'), 'utf8'),
) as Record<string, any[]>

const BARBARIAN_2014_CLASS = {
  id: 'seed-class-barbarian',
  kind: 'class',
  slug: 'barbarian',
  name_ru: 'Варвар',
  name_en: 'Barbarian',
  rules_edition: '2014',
  parent_id: null,
  source: 'phb',
  external_ref: null,
  data: {
    hit_die: 12,
    primary_abilities: ['str'],
    saving_throws: ['str', 'con'],
    armor: [],
    weapons: { simple: true, martial: true, extras: [] },
    tools_fixed: [],
    tool_choices: null,
    skill_choices: {
      count: 2,
      from: [
        'animal_handling',
        'athletics',
        'intimidation',
        'nature',
        'perception',
        'survival',
      ],
    },
    multiclass_prerequisites: { all: ['str'], min: 13 },
    multiclass_proficiencies: {
      armor: ['shields'],
      weapons: { simple: true, martial: true, extras: [] },
      tools_fixed: [],
      tool_choices: null,
      skill_choices: null,
    },
    caster: { progression: 'none', ability: null, prepare: null },
    starting_equipment: [
      {
        id: 'a',
        label_ru: 'Вариант A',
        summary_ru: 'Секира или любое воинское рукопашное оружие + две ручные топорики',
        items: [
          { name: 'Секира', qty: 1 },
          { name: 'Ручная топорика', qty: 2 },
          { name: 'Набор исследователя', qty: 1 },
        ],
      },
      { id: 'gold', label_ru: 'Золото', summary_ru: '2к4×10 зм', items: [], coins_gp: 75 },
    ],
  },
  sort_order: 0,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}
CATALOG_2014.class = [
  ...(CATALOG_2014.class ?? []).filter((row) => row.slug !== 'barbarian'),
  BARBARIAN_2014_CLASS,
]

export const SHOT_TAG = process.env.P24_M02_BARBARIAN_SHOT_TAG || 'after'

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
        id: '00000000-0000-4000-8000-000000000029',
        email: 'm02barbarian2014@example.com',
        display_name: 'M02b',
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

export async function walk2014ToBarbarianClass(page: Page) {
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
  await raceDlg.getByRole('textbox').first().fill('Гром')
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

  await expect(cardByTitle(page, 'Варвар')).toBeVisible({ timeout: 10_000 })
  await cardByTitle(page, 'Варвар').click()
  const classDlg = await openSetupDialog(
    page,
    /настройка класса/i,
    /Выбрать и настроить|Настроить класс/,
  )
  for (const label of [/^Атлетика$/, /^Запугивание$/]) {
    const chip = chipByText(classDlg, label)
    if (await chip.count()) await chip.click()
  }
  const skillChips = classDlg
    .locator('button.sheet-chip')
    .filter({ hasText: /Атлетика|Запугивание|Внимательность|Выживание|Природа|Уход за животными/ })
  if ((await skillChips.count()) < 2) {
    const anySkills = classDlg.locator('.sheet-chip-row button.sheet-chip, button.sheet-chip')
    for (let i = 0; i < Math.min(2, await anySkills.count()); i += 1) {
      await anySkills.nth(i).click()
    }
  }
  return classDlg
}

/** 2024-only names that must NOT appear on a 2014 barbarian sheet/create UI. */
export const BARBARIAN_2024_LEAK_NAMES = [
  /^Чутьё опасности$/,
  /^Изначальное знание$/,
  /^Инстинктивный бросок$/,
  /^Неукротимая ярость$/,
  /^Жестокий удар$/,
  /^Путь дикого сердца$/,
  /^Путь Мирового древа$/,
] as const

export async function expectNo2024BarbarianLeak(page: Page) {
  for (const re of BARBARIAN_2024_LEAK_NAMES) {
    await expect(page.getByText(re)).toHaveCount(0)
  }
}

export function barbarian2014SheetCharacter(opts?: {
  level?: number
  name?: string
  subclass?: 'berserker' | 'totem'
}) {
  const level = Math.max(1, Math.floor(opts?.level ?? 5))
  const subclass = opts?.subclass ?? 'berserker'
  const id = `aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee03${String(level).padStart(2, '0')}`
  const sample = JSON.parse(JSON.stringify(sampleClassic2014Character)) as Record<string, unknown>
  sample.id = id
  sample.rules_edition = '2014'
  sample.class_name = 'Варвар'
  sample.name = opts?.name ?? 'Гром Камнегрохот'
  sample.level = level
  const sheet = (sample.sheet ?? {}) as Record<string, unknown>
  sheet.classes = [
    {
      id: 'c-barbarian',
      slug: 'barbarian',
      name: 'Варвар',
      level,
      subclass_slug: subclass === 'totem' ? 'totem-warrior' : 'berserker',
      subclass_name: subclass === 'totem' ? 'Путь тотемного воина' : 'Путь берсерка',
      catalog_id: 'barbarian',
    },
  ]
  const abilities = (sheet.abilities ?? {}) as Record<string, { score: number }>
  abilities.str = { score: 16 }
  abilities.dex = { score: 14 }
  abilities.con = { score: 16 }
  abilities.int = { score: 8 }
  abilities.wis = { score: 12 }
  abilities.cha = { score: 10 }
  sheet.saves = {
    str: { is_proficient: true },
    con: { is_proficient: true },
  }
  sheet.abilities = abilities
  const subclassBlock =
    subclass === 'totem'
      ? 'Дух-защитник (медведь).\nДух-защитник (волк).\nДух-защитник (орёл).'
      : 'Безумие.\nБезумная ярость.\nВозмездие.'
  sheet.features_text = {
    features:
      `Ярость (2×).\nЗащита без доспехов.\nЧувство опасности.\nБезрассудная атака.\nПуть дикости.\nДополнительная атака.\nБыстрое движение.\nЖестокий критический удар.\nНепреклонная ярость.\nСтойкая ярость.\nНеукротимая мощь.\nИзначальный чемпион.\n${subclassBlock}`,
  }
  sheet.play = {
    resources: [
      {
        id: 'rage',
        pool_id: 'rage',
        name: 'Ярость',
        max: level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2,
        used: 0,
        reset: 'long',
      },
    ],
  }
  sheet.meta = { ...(sheet as { meta?: object }).meta, rules_edition: '2014' }
  const combat = (sheet.combat ?? {}) as Record<string, unknown>
  combat.speed = 35
  combat.ac = 15
  combat.hit_die = 'к12'
  combat.hp_dice_current = level
  sheet.combat = combat
  sample.sheet = sheet
  sample.hp_max = 12 + 7 * level
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

export function barbarian2024SheetCharacter(opts?: {
  level?: number
  name?: string
  subclass?: 'berserker' | null
}) {
  const level = Math.max(1, Math.floor(opts?.level ?? 5))
  const subclass = opts?.subclass ?? 'berserker'
  const id = `bbbbbbbb-cccc-4ddd-8eee-ffffffff03${String(level).padStart(2, '0')}`
  const sample = JSON.parse(JSON.stringify(sampleClassic2014Character)) as Record<string, unknown>
  sample.id = id
  sample.rules_edition = '2024'
  sample.class_name = 'Варвар'
  sample.name = opts?.name ?? 'Живой Варвар'
  sample.level = level
  const sheet = (sample.sheet ?? {}) as Record<string, unknown>
  sheet.classes = [
    {
      id: 'c-barbarian-2024',
      slug: 'barbarian',
      name: 'Варвар',
      level,
      subclass_slug: level >= 3 && subclass ? 'barbarian__berserker' : null,
      subclass_name: level >= 3 && subclass ? 'Путь берсерка' : null,
      catalog_id: 'barbarian',
    },
  ]
  const abilities = (sheet.abilities ?? {}) as Record<string, { score: number }>
  abilities.str = { score: 16 }
  abilities.dex = { score: 14 }
  abilities.con = { score: 16 }
  abilities.int = { score: 8 }
  abilities.wis = { score: 12 }
  abilities.cha = { score: 10 }
  sheet.saves = {
    str: { is_proficient: true },
    con: { is_proficient: true },
  }
  sheet.abilities = abilities
  const coreL5 =
    'Ярость.\nЗащита без доспехов.\nОружейное мастерство.\nЧувство опасности.\nБезрассудная атака.\nПодкласс варвара.\nИзначальные знания.\nДополнительная атака.\nБыстрое движение.'
  const coreL11 =
    `${coreL5}\nЗвериный инстинкт.\nИнстинктивный прыжок.\nЖестокий удар.\nНепреклонная ярость.`
  const berserker = level >= 3 ? '\nБезумие.\nБезумная ярость.' : ''
  sheet.features_text = {
    features: `${level >= 11 ? coreL11 : coreL5}${berserker}`,
  }
  sheet.play = {
    resources: [
      {
        id: 'rages',
        pool_id: 'rages',
        name: 'Ярость',
        max: level >= 11 ? 4 : 3,
        used: 0,
        reset: 'long',
      },
    ],
  }
  sheet.meta = { ...(sheet as { meta?: object }).meta, rules_edition: '2024' }
  const combat = (sheet.combat ?? {}) as Record<string, unknown>
  combat.speed = 40
  combat.ac = 15
  combat.hit_die = 'к12'
  combat.hp_dice_current = level
  sheet.combat = combat
  sample.sheet = sheet
  sample.hp_max = 12 + 7 * level
  sample.hp_current = sample.hp_max
  sample.race_name = 'Дварф'
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
  character: ReturnType<typeof barbarian2014SheetCharacter>,
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

export async function mock2024Sheet(
  page: Page,
  character: ReturnType<typeof barbarian2024SheetCharacter>,
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