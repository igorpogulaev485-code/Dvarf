/**
 * 2014 rogue («Плут») mocks shared by the 2014 regression specs + 2024 mock sheets.
 *
 * Feature names that MUST stay 2014 on the classic sheet: Скрытая атака, Компетентность,
 * Надёжный талант (@11), Удача, Увёртливость, Скользкий ум, Убийство (assassin),
 * Архетип плута, Чутьё слепца, Неуловимость — NOT 2024 draft leaks listed below.
 *
 * «Улучшенный Хитрый удар» is 2024-only and must not appear on a 2014 sheet.
 * «Отравление» as a class-feature title is 2024 Cunning Strike (effect) — OK on 2024 only.
 */
import { expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sampleClassic2014Character } from '../../src/features/classicSheet/sampleClassicCharacter'

const here = path.dirname(fileURLToPath(import.meta.url))
export const ARTIFACTS_2014 =
  process.env.P24_M02_ROGUE_REG_DIR ||
  path.resolve(process.cwd(), '../artifacts/p24-m02-rogue/regression-2014')
const CATALOG_2014 = JSON.parse(
  fs.readFileSync(path.join(here, '../fixtures/p24-m03c-2014-catalog.json'), 'utf8'),
) as Record<string, any[]>

const ROGUE_2014_CLASS = {
  id: 'seed-class-rogue',
  kind: 'class',
  slug: 'rogue',
  name_ru: 'Плут',
  name_en: 'Rogue',
  rules_edition: '2014',
  parent_id: null,
  source: 'phb',
  external_ref: null,
  data: {
    hit_die: 8,
    primary_abilities: ['dex'],
    saving_throws: ['dex', 'int'],
    armor: ['light'],
    weapons: {
      simple: true,
      martial: false,
      extras: ['hand_crossbow', 'longsword', 'rapier', 'shortsword'],
    },
    tools_fixed: ['Воровские инструменты'],
    tool_choices: null,
    skill_choices: {
      count: 4,
      from: [
        'acrobatics',
        'athletics',
        'deception',
        'insight',
        'intimidation',
        'investigation',
        'perception',
        'performance',
        'persuasion',
        'sleight_of_hand',
        'stealth',
      ],
    },
    multiclass_prerequisites: { all: ['dex'], min: 13 },
    multiclass_proficiencies: {
      armor: ['light'],
      weapons: { simple: false, martial: false, extras: [] },
      tools_fixed: ['Воровские инструменты'],
      tool_choices: null,
      skill_choices: {
        count: 1,
        from: [
          'acrobatics',
          'athletics',
          'deception',
          'insight',
          'intimidation',
          'investigation',
          'perception',
          'performance',
          'persuasion',
          'sleight_of_hand',
          'stealth',
        ],
      },
    },
    caster: { progression: 'none', ability: null, prepare: null },
    starting_equipment: [
      {
        id: 'a',
        label_ru: 'Вариант A',
        summary_ru: 'Рапира + короткий лук + набор взломщика + кожаный + 2 кинжала + воровские инструменты',
        items: [
          { name: 'Рапира', qty: 1 },
          { name: 'Короткий лук', qty: 1 },
          { name: 'Стрелы', qty: 20 },
          { name: 'Набор взломщика', qty: 1 },
          { name: 'Кожаный доспех', qty: 1, armor_kind: 'light', base_ac: 11 },
          { name: 'Кинжал', qty: 2 },
          { name: 'Воровские инструменты', qty: 1 },
        ],
      },
      { id: 'gold', label_ru: 'Золото', summary_ru: '4к4×10 зм', items: [], coins_gp: 100 },
    ],
  },
  sort_order: 0,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}
CATALOG_2014.class = [
  ...(CATALOG_2014.class ?? []).filter((row) => row.slug !== 'rogue'),
  ROGUE_2014_CLASS,
]

export const SHOT_TAG = process.env.P24_M02_ROGUE_SHOT_TAG || 'after'

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
        id: '00000000-0000-4000-8000-000000000039',
        email: 'm02rogue2014@example.com',
        display_name: 'M02r',
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

export async function walk2014ToRogueClass(page: Page) {
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
  await raceDlg.getByRole('textbox').first().fill('Тень')
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

  await expect(cardByTitle(page, 'Плут')).toBeVisible({ timeout: 10_000 })
  await cardByTitle(page, 'Плут').click()
  const classDlg = await openSetupDialog(
    page,
    /настройка класса/i,
    /Выбрать и настроить|Настроить класс/,
  )
  for (const label of [/^Акробатика$/, /^Скрытность$/, /^Ловкость рук$/, /^Обман$/]) {
    const chip = chipByText(classDlg, label)
    if (await chip.count()) await chip.click()
  }
  const skillChips = classDlg
    .locator('button.sheet-chip')
    .filter({
      hasText:
        /Акробатика|Скрытность|Ловкость рук|Обман|Внимательность|Расследование|Атлетика|Проницательность/,
    })
  if ((await skillChips.count()) < 4) {
    const anySkills = classDlg.locator('.sheet-chip-row button.sheet-chip, button.sheet-chip')
    for (let i = 0; i < Math.min(4, await anySkills.count()); i += 1) {
      await anySkills.nth(i).click()
    }
  }
  return classDlg
}

/**
 * 2024 draft / rejected names that must NOT appear on a 2014 rogue sheet/create UI.
 * FINAL 2024 names that overlap 2014 (Скрытая атака, Компетентность, …) are OK on both.
 */
export const ROGUE_2024_LEAK_NAMES = [
  /^Верный прицел$/,
  /^Ускользание$/,
  /^Коварные удары$/,
  /^Гибкий ум$/,
  /^Удар удачи$/,
  /^Ликвидация$/,
  /^Вор заклинаний$/,
  /^Раздирание разума$/,
  /^Клинок души$/, // wrong singular — 2024 subclass is «Клинок душ»
  /^Коварная атака$/,
  /^Экспертность$/,
  /^Улыбка фортуны$/,
  /^Многогранный ловкач$/,
  /^Мастер проникновения$/,
  /^Улучшенный Хитрый удар$/, // 2024-only feature
  /^Отравление$/, // Cunning Strike effect title — 2024 only as class feature name
] as const

export async function expectNo2024RogueLeak(page: Page) {
  for (const re of ROGUE_2024_LEAK_NAMES) {
    await expect(page.getByText(re)).toHaveCount(0)
  }
}

type Rogue2014Subclass = 'thief' | 'assassin' | 'arcane_trickster'

export function rogue2014SheetCharacter(opts?: {
  level?: number
  name?: string
  subclass?: Rogue2014Subclass
}) {
  const level = Math.max(1, Math.floor(opts?.level ?? 5))
  const subclass = opts?.subclass ?? 'thief'
  const id = `aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee04${String(level).padStart(2, '0')}`
  const sample = JSON.parse(JSON.stringify(sampleClassic2014Character)) as Record<string, unknown>
  sample.id = id
  sample.rules_edition = '2014'
  sample.class_name = 'Плут'
  sample.name = opts?.name ?? 'Тень Камнерез'
  sample.level = level
  const sheet = (sample.sheet ?? {}) as Record<string, unknown>
  const subclassMeta: Record<Rogue2014Subclass, { slug: string; name: string; block: string }> = {
    thief: {
      slug: 'thief',
      name: 'Вор',
      block: 'Быстрые руки.\nРабота на высоте.\nПревосходная скрытность.\nИспользование магических устройств.\nРефлексы вора.',
    },
    assassin: {
      slug: 'assassin',
      name: 'Убийца',
      block: 'Доп. владения.\nУбийство.\nМастерство внедрения.\nСамозванец.\nСмертельный удар.',
    },
    arcane_trickster: {
      slug: 'arcane-trickster',
      name: 'Мистический ловкач',
      block:
        'Использование заклинаний.\nЛовкость волшебной руки.\nМагическая засада.\nУниверсальный ловкач.\nПохититель заклинаний.',
    },
  }
  const sub = subclassMeta[subclass]
  sheet.classes = [
    {
      id: 'c-rogue',
      slug: 'rogue',
      name: 'Плут',
      level,
      subclass_slug: sub.slug,
      subclass_name: sub.name,
      catalog_id: 'rogue',
    },
  ]
  const abilities = (sheet.abilities ?? {}) as Record<string, { score: number }>
  abilities.str = { score: 10 }
  abilities.dex = { score: 16 }
  abilities.con = { score: 14 }
  abilities.int = { score: 12 }
  abilities.wis = { score: 10 }
  abilities.cha = { score: 10 }
  sheet.saves = {
    dex: { is_proficient: true },
    int: { is_proficient: true },
  }
  sheet.abilities = abilities
  sheet.features_text = {
    features:
      `Компетентность.\nСкрытая атака.\nВоровской жаргон.\nХитрое действие.\nАрхетип плута.\nТочное прицеливание.\nНевероятное уклонение.\nУвёртливость.\nНадёжный талант.\nЧутьё слепца.\nСкользкий ум.\nНеуловимость.\nУдача.\n${sub.block}`,
  }
  sheet.play = {
    resources: [
      {
        id: 'stroke_of_luck',
        pool_id: 'stroke_of_luck',
        name: 'Удача',
        max: level >= 20 ? 1 : 0,
        used: 0,
        reset: 'short',
      },
    ],
  }
  sheet.meta = { ...(sheet as { meta?: object }).meta, rules_edition: '2014' }
  const combat = (sheet.combat ?? {}) as Record<string, unknown>
  combat.speed = 25
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

export type Rogue2024Subclass = 'thief' | 'assassin' | 'arcane-trickster' | 'soulknife' | null

export function rogue2024SheetCharacter(opts?: {
  level?: number
  name?: string
  subclass?: Rogue2024Subclass
}) {
  const level = Math.max(1, Math.floor(opts?.level ?? 5))
  const subclass = opts?.subclass === undefined ? 'thief' : opts.subclass
  const id = `bbbbbbbb-cccc-4ddd-8eee-ffffffff04${String(level).padStart(2, '0')}`
  const sample = JSON.parse(JSON.stringify(sampleClassic2014Character)) as Record<string, unknown>
  sample.id = id
  sample.rules_edition = '2024'
  sample.class_name = 'Плут'
  sample.name = opts?.name ?? 'Живой Плут'
  sample.level = level

  const subclassMeta: Record<
    Exclude<Rogue2024Subclass, null>,
    { slug: string; name: string; block: string }
  > = {
    thief: {
      slug: 'rogue__thief',
      name: 'Вор',
      block: '\nБыстрые руки.\nРабота на высоте.',
    },
    assassin: {
      slug: 'rogue__assassin',
      name: 'Убийца',
      block: '\nУбийство.\nИнструменты убийцы.',
    },
    'arcane-trickster': {
      slug: 'rogue__arcane-trickster',
      name: 'Мистический ловкач',
      block: '\nСотворение заклинаний.\nЛовкость волшебной руки.',
    },
    soulknife: {
      slug: 'rogue__soulknife',
      name: 'Клинок душ',
      block: '\nПсионическая сила.\nПсихические клинки.\nКлинки души.',
    },
  }

  const sheet = (sample.sheet ?? {}) as Record<string, unknown>
  const sub = level >= 3 && subclass ? subclassMeta[subclass] : null
  sheet.classes = [
    {
      id: 'c-rogue-2024',
      slug: 'rogue',
      name: 'Плут',
      level,
      subclass_slug: sub?.slug ?? null,
      subclass_name: sub?.name ?? null,
      catalog_id: 'rogue',
    },
  ]
  const abilities = (sheet.abilities ?? {}) as Record<string, { score: number }>
  abilities.str = { score: 10 }
  abilities.dex = { score: 16 }
  abilities.con = { score: 14 }
  abilities.int = { score: 12 }
  abilities.wis = { score: 10 }
  abilities.cha = { score: 10 }
  sheet.saves = {
    dex: { is_proficient: true },
    int: { is_proficient: true },
    ...(level >= 15 ? { wis: { is_proficient: true }, cha: { is_proficient: true } } : {}),
  }
  sheet.abilities = abilities

  const coreL1 =
    'Компетентность.\nСкрытая атака.\nВоровской жаргон.\nОружейное мастерство.'
  const coreL5 =
    `${coreL1}\nХитрое действие.\nПодкласс плута.\nТочное прицеливание.\nХитрый удар.\nНевероятное уклонение.`
  const coreL11 = `${coreL5}\nНадёжный талант.\nУвёртливость.\nУлучшенный Хитрый удар.`
  const coreL20 =
    `${coreL11}\nБесчестные удары.\nСкользкий ум.\nНеуловимость.\nЭпический дар.\nУдача.`
  let features = coreL1
  if (level >= 20) features = coreL20
  else if (level >= 11) features = coreL11
  else if (level >= 5) features = coreL5
  else if (level >= 3) {
    features = `${coreL1}\nХитрое действие.\nПодкласс плута.\nТочное прицеливание.`
  } else if (level >= 2) {
    features = `${coreL1}\nХитрое действие.`
  }
  if (sub) features = `${features}${sub.block}`
  if (level >= 5 && subclass === 'thief' && level >= 9) {
    features = `${features}\nПревосходная скрытность.`
  }
  sheet.features_text = { features }

  const resources: Array<Record<string, unknown>> = []
  if (level >= 20) {
    resources.push({
      id: 'stroke_of_luck',
      pool_id: 'stroke_of_luck',
      name: 'Удача',
      max: 1,
      used: 0,
      reset: 'short',
    })
  }
  if (subclass === 'soulknife' && level >= 3) {
    resources.push({
      id: 'psionic_energy_dice',
      pool_id: 'psionic_energy_dice',
      name: 'Псионическая сила',
      max: level >= 11 ? 8 : 6,
      used: 0,
      reset: 'long',
    })
  }
  sheet.play = { resources }
  sheet.meta = { ...(sheet as { meta?: object }).meta, rules_edition: '2024' }
  const combat = (sheet.combat ?? {}) as Record<string, unknown>
  combat.speed = 30
  combat.ac = 14
  combat.hit_die = 'к8'
  combat.hp_dice_current = level
  sheet.combat = combat
  sample.sheet = sheet
  sample.hp_max = 8 + 5 * level
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

async function mockCharacterSheet(
  page: Page,
  character: ReturnType<typeof rogue2014SheetCharacter> | ReturnType<typeof rogue2024SheetCharacter>,
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

export async function mock2014Sheet(
  page: Page,
  character: ReturnType<typeof rogue2014SheetCharacter>,
) {
  await mockCharacterSheet(page, character)
}

export async function mock2024Sheet(
  page: Page,
  character: ReturnType<typeof rogue2024SheetCharacter>,
) {
  await mockCharacterSheet(page, character)
}
