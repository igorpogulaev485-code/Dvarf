/**
 * P24-M02-cleric offline checks (1440 / 390): create2024_bridge tables + 2014 regression shots.
 * Create / level-up UI evidence lives in p24-m02-cleric-live.spec.ts.
 *
 * P24_M02_CLERIC_SHOT_TAG=before|after|main — 2014 regression under regression-2014/.
 */
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sampleClassic2014Character } from '../src/features/classicSheet/sampleClassicCharacter'
import {
  createStore,
  installClericHarness,
  runCreate2024Bridge,
} from './support/cleric2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = '/opt/cursor/artifacts/p24-m02-cleric'
const ARTIFACTS_2014 = process.env.P24_M02_CLERIC_REG_DIR || '/opt/cursor/artifacts/p24-m02-cleric/regression-2014'
const CATALOG_2014 = JSON.parse(
  fs.readFileSync(path.join(here, 'fixtures/p24-m03c-2014-catalog.json'), 'utf8'),
) as Record<string, unknown[]>

/** Cleric list spells that are not auto-prepared domain spells (any PHB domain). */
const PREPARED_OFFLINE = [
  'healing-word', 'bane', 'command', 'detect-magic', 'sanctuary', 'inflict-wounds',
  'protection-from-evil-and-good', 'silence', 'calm-emotions', 'augury', 'zone-of-truth',
  'hold-person', 'dispel-magic', 'remove-curse', 'beacon-of-hope', 'tongues', 'glyph-of-warding',
  'magic-circle', 'bestow-curse', 'clairvoyance', 'animate-dead', 'create-food-and-water',
  'water-walk',
]
const CANTRIPS_OFFLINE = [
  'sacred-flame', 'guidance', 'spare-the-dying', 'light', 'mending', 'thaumaturgy',
]

const SHOT_TAG = process.env.P24_M02_CLERIC_SHOT_TAG || 'after'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
})

async function shot(page: Page, dir: string, name: string, project: string) {
  await page.waitForTimeout(400)
  await page.screenshot({
    path: path.join(dir, `${name}-${project}.png`),
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
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
        id: '00000000-0000-4000-8000-000000000015',
        email: 'm02c2014@example.com',
        display_name: 'M02c',
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

async function walk2014ToClericClass(page: Page) {
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

  await expect(cardByTitle(page, 'Жрец')).toBeVisible({ timeout: 10_000 })
  await cardByTitle(page, 'Жрец').click()
  const classDlg = await openSetupDialog(
    page,
    /настройка класса/i,
    /Выбрать и настроить|Настроить класс/,
  )
  await chipByText(classDlg, /История|Проницательность|Медицина|Убеждение|Религия/i).first().click()
  const skill2 = classDlg
    .locator('button.sheet-chip:not([disabled])')
    .filter({ hasText: /Медицина|Религия|Убеждение|Проницательность/i })
  if ((await skill2.count()) > 0) await skill2.first().click()
  for (const label of [/булава/i, /Вариант A/i]) {
    const chip = chipByText(classDlg, label)
    if (await chip.isVisible().catch(() => false)) {
      await chip.click()
      break
    }
  }
  return classDlg
}

function cleric2014SheetCharacter() {
  const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0005'
  const sample = JSON.parse(JSON.stringify(sampleClassic2014Character)) as Record<string, unknown>
  sample.id = id
  sample.rules_edition = '2014'
  sample.class_name = 'Жрец'
  sample.name = 'Бренна Светлоликая'
  sample.level = 5
  const sheet = (sample.sheet ?? {}) as Record<string, unknown>
  sheet.classes = [
    {
      id: 'c-cleric',
      slug: 'cleric',
      name: 'Жрец',
      level: 5,
      subclass_slug: 'life',
      subclass_name: 'Домен жизни',
      catalog_id: 'cleric',
    },
  ]
  const abilities = (sheet.abilities ?? {}) as Record<string, { score: number }>
  abilities.str = { score: 12 }
  abilities.dex = { score: 10 }
  abilities.con = { score: 14 }
  abilities.int = { score: 10 }
  abilities.wis = { score: 18 }
  abilities.cha = { score: 13 }
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
    casting_ability: 'wis',
    max_prepared: 9,
    slots: {
      '1': { max: 4, used: 1 },
      '2': { max: 3, used: 0 },
      '3': { max: 2, used: 0 },
    },
    known: [
      spell('Священное пламя', 0),
      spell('Указание', 0),
      spell('Лечение ран', 1),
      spell('Благословение', 1),
      spell('Оживление мёртвых', 3),
      spell('Духовные стражи', 3),
    ],
  }
  sheet.features_text = {
    features:
      'Божественный канал (1/отдых): Изгнание нежити, Сохранение жизни.\nДомен жизни: Ученик жизни, Благословенный целитель.\nУничтожение нежити (ПО 1/2).',
  }
  sheet.play = { resources: [] }
  sheet.meta = { ...(sheet as { meta?: object }).meta, rules_edition: '2014' }
  const combat = (sheet.combat ?? {}) as Record<string, unknown>
  combat.speed = 25
  combat.ac = 18
  combat.hit_die = 'к8'
  combat.hp_dice_current = 5
  sheet.combat = combat
  sample.sheet = sheet
  sample.hp_max = 44
  sample.hp_current = 44
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

async function mock2014Sheet(page: Page, character: ReturnType<typeof cleric2014SheetCharacter>) {
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



test.describe('P24-M02 cleric — offline create2024_bridge tables', () => {
  test.setTimeout(60_000)

  const TABLE = [
    { level: 1, cantrips: 3, prepared: 4, slots: { '1': 2 } },
    { level: 5, cantrips: 4, prepared: 9, slots: { '1': 4, '2': 3, '3': 2 } },
    { level: 11, cantrips: 5, prepared: 16, slots: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1 } },
    { level: 20, cantrips: 5, prepared: 22, slots: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 3, '6': 2, '7': 2, '8': 1, '9': 1 } },
  ]

  function bridgePayload(level: number, cantrips: number, prepared: number, order: string, wisdom = 15) {
    const asi: Array<Record<string, unknown>> = []
    const bumps = [{ wis: 2 }, { con: 2 }, { dex: 2 }, { str: 2 }]
    ;[4, 8, 12, 16].forEach((lv, i) => {
      if (lv <= level) {
        asi.push({ class_slug: 'cleric', class_level: lv, kind: 'asi_plus2', abilities: bumps[i] })
      }
    })
    return {
      name: `Bridge L${level} ${order}`,
      is_preview: true,
      class_slug: 'cleric',
      background_slug: 'soldier',
      species_slug: 'dwarf',
      ability_method: 'standard_array',
      base_abilities: { str: 8, dex: 12, con: 14, int: 10, wis: wisdom, cha: 13 },
      background_asi_mode: '+2/+1',
      background_asi: { con: 2, dex: 1 },
      language_ids: ['elvish', 'dwarvish'],
      class_skill_ids: ['history', 'religion'],
      background_tool_id: 'dice-set',
      background_equipment: 'pack',
      class_equipment: 'a',
      cantrip_ids: CANTRIPS_OFFLINE.slice(0, cantrips),
      prepared_spell_ids: PREPARED_OFFLINE.slice(0, prepared),
      class_levels: [
        {
          slug: 'cleric',
          level,
          subclass_slug: level >= 3 ? 'cleric__life-domain' : null,
        },
      ],
      subclass_slug: level >= 3 ? 'cleric__life-domain' : null,
      asi_choices: asi,
      class_option_picks: {
        divine_order: order,
        ...(level >= 7 ? { blessed_strikes: 'divine_strike' } : {}),
        client_picks: { class_tools: [], origin_feat_picks: {}, species_picks: {} },
      },
    }
  }

  for (const row of TABLE) {
    test(`bridge L${row.level}: cantrips ${row.cantrips}, prepared ${row.prepared}, protector`, async () => {
      const result = runCreate2024Bridge(bridgePayload(row.level, row.cantrips, row.prepared, 'protector'))
      if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
      const sheet = result.sheet as Record<string, any>
      expect(sheet.classes[0].level).toBe(row.level)
      const slots = sheet.class_progress_2024.multiclass_slots as Record<string, number>
      for (const [circle, max] of Object.entries(row.slots)) expect(slots[circle]).toBe(max)
      const known = (sheet.spells.known ?? []) as Array<{ level: number }>
      expect(known.filter((x) => x.level === 0).length).toBe(row.cantrips)
      expect(known.filter((x) => x.level > 0).length).toBe(row.prepared)
      const armor = sheet.proficiency.armor
      expect(Array.isArray(armor) ? armor.includes('heavy') : armor.heavy).toBeTruthy()
      expect(sheet.proficiency.weapons.martial).toBe(true)
      expect(sheet.class_options_2024.divine_order).toBe('protector')
      expect(sheet.class_options_2024.weapon_mastery ?? []).toEqual([])
    })
  }

  test('bridge L11: Blessed Strikes pick is required and lands in feature_picks + class_options_2024', async () => {
    const payload = bridgePayload(11, 5, 16, 'protector') as Record<string, any>
    const missing = runCreate2024Bridge({
      ...payload,
      class_option_picks: { ...payload.class_option_picks, blessed_strikes: undefined },
    })
    expect(missing.ok).toBe(false)
    for (const pick of ['divine_strike', 'potent_spellcasting']) {
      const ok = runCreate2024Bridge({
        ...payload,
        class_option_picks: { ...payload.class_option_picks, blessed_strikes: pick },
      })
      if (!ok.ok) throw new Error(`${ok.code}: ${ok.message}`)
      const sheet = ok.sheet as Record<string, any>
      expect(sheet.class_options_2024.blessed_strikes).toBe(pick)
      expect(sheet.feature_picks.values['class-cleric:blessed_strikes']).toBe(pick)
    }
  })

  test('bridge thaumaturge L1: needs table+1 cantrips, no heavy armor, no martial', async () => {
    const short = runCreate2024Bridge(bridgePayload(1, 3, 4, 'thaumaturge'))
    expect(short.ok).toBe(false)
    const ok = runCreate2024Bridge(bridgePayload(1, 4, 4, 'thaumaturge'))
    if (!ok.ok) throw new Error(`${ok.code}: ${ok.message}`)
    const sheet = ok.sheet as Record<string, any>
    const armor = sheet.proficiency.armor
    expect(Array.isArray(armor) ? armor.includes('heavy') : armor.heavy).toBeFalsy()
    expect(sheet.proficiency.weapons.martial).not.toBe(true)
    const known = (sheet.spells.known ?? []) as Array<{ level: number }>
    expect(known.filter((x) => x.level === 0).length).toBe(4)
  })

  test('2024 create opens without preview; legacy ?preview=1 still works', async ({ page }) => {
    const store = createStore()
    await installClericHarness(page, store)
    await page.goto('/characters/create?edition=2024')
    await expect(page.getByTestId('create-character-2024')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByTestId('p24-m03-step-species')).toBeVisible()

    await page.goto('/characters/create?edition=2024&preview=1')
    await expect(page.getByTestId('create-character-2024')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByTestId('p24-m03-step-species')).toBeVisible()
  })
})

test.describe('P24-M02 2014 regression (cleric)', () => {
  test.setTimeout(90_000)
  test.use({ actionTimeout: 12_000 })

  test('2014 create — класс Жрец', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-race-marker`, project)

    const classDlg = await walk2014ToClericClass(page)
    await expect(page.getByRole('heading', { name: /Жрец: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|История|Религия|булава|Домен/i)
    await shot(page, ARTIFACTS_2014, `${tag}-create-2014-cleric-class`, project)
  })

  test('2014 sheet — жрец: шапка + 6 характеристик (МДР) + заклинания/канал/домен', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = cleric2014SheetCharacter()
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Бренна|Жрец/i).first()).toBeVisible({ timeout: 15_000 })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-cleric-header`, project)
      await page.locator('button.mobile-vitals__abil').click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await abilPage.locator('.abil-block[data-abil="wis"]').first().scrollIntoViewIfNeeded()
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-cleric-abilities`, project)
      await abilPage.locator('button.mobile-abil-page__back').click()
      await expect(abilPage).toHaveCount(0, { timeout: 10_000 })
    } else {
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(page.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-cleric`, project)
    }

    await openFeaturesScene(page, project)
    const channelCard = page
      .locator('.feature-card')
      .filter({ hasText: /Божественный канал|Изгнание нежити|Домен жизни/i })
      .first()
    await expect(channelCard).toBeVisible({ timeout: 15_000 })
    await channelCard.scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-cleric-features-channel-domain`, project)

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
    await expect(page.getByText(/Священное пламя|Лечение ран/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-cleric-spells`, project)
  })

  test('2014 sheet — атаки: тип урона по-русски (не slashing)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = cleric2014SheetCharacter()
    const sheet = character.sheet as Record<string, unknown>
    // Same shape as 2014 catalog/presets (Russian). Compare: 2024 weapons_srd uses English keys.
    sheet.weapons = [
      {
        id: 'w-mace',
        name: 'Булава',
        ability: 'str',
        is_proficient: true,
        damage: '1к6',
        damage_type: 'дробящий',
        held: true,
        source_kind: 'weapon',
      },
      {
        id: 'w-longsword',
        name: 'Длинный меч',
        ability: 'str',
        is_proficient: true,
        damage: '1к8',
        damage_type: 'рубящий',
        held: true,
        source_kind: 'weapon',
      },
    ]
    await mock2014Sheet(page, character)
    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    else await page.getByRole('button', { name: /^Бой$/ }).first().click()
    await page.waitForTimeout(500)
    const mace = page.locator('[class*="attack"]').filter({ hasText: /Булава/ }).first()
    const sword = page.locator('[class*="attack"]').filter({ hasText: /Длинный меч/ }).first()
    await expect(mace).toBeVisible({ timeout: 15_000 })
    await expect(sword).toBeVisible({ timeout: 15_000 })
    await expect(mace).toContainText(/дробящий/i)
    await expect(sword).toContainText(/рубящий/i)
    await expect(mace).not.toContainText(/\b(slashing|bludgeoning|piercing)\b/i)
    await expect(sword).not.toContainText(/\b(slashing|bludgeoning|piercing)\b/i)
    await sword.scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    await shot(page, ARTIFACTS_2014, `${tag}-sheet-2014-cleric-attacks-damage-type`, project)
  })
})
