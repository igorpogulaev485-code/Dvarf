/**
 * P24-M03c review screenshots + checks (1440 / 390).
 * Includes a real 2014 create walk to Class (fighter setup) and Leveling@5.
 */
import { expect, test, type Page, type Route } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = '/opt/cursor/artifacts/p24-m03c'
const ARTIFACTS_2014 = '/opt/cursor/artifacts/p24-m03c/regression-2014'
const CATALOG = JSON.parse(
  fs.readFileSync(path.join(here, 'fixtures/p24-m03c-catalog.json'), 'utf8'),
) as Record<string, unknown>
const CATALOG_2014 = JSON.parse(
  fs.readFileSync(path.join(here, 'fixtures/p24-m03c-2014-catalog.json'), 'utf8'),
) as Record<string, unknown[]>

/** When set (e.g. `before`), 2014 shots get that suffix: create-2014-class-before-1440.png */
const SHOT_TAG = process.env.P24_M03C_SHOT_TAG || 'after'

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

async function mockAuthAndCatalog(page: Page) {
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
  await page.route('**/auth/**', async (route: Route) => {
    const url = route.request().url()
    if (!isApi(url) || route.request().resourceType() === 'document') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '00000000-0000-4000-8000-000000000001',
        email: 'm03c@example.com',
        display_name: 'M03c',
        is_email_verified: true,
        access_token: 'access',
        refresh_token: 'refresh',
      }),
    })
  })

  await page.route('**/characters/create-2024/languages**', async (route) => {
    if (!isApi(route.request().url()) || route.request().resourceType() === 'document') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CATALOG.languages),
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
    const kind = url.searchParams.get('kind')
    const map: Record<string, unknown[]> = {
      class: (CATALOG.classes as unknown[]) || [],
      subclass: (CATALOG.subclasses as unknown[]) || [],
      background: (CATALOG.backgrounds as unknown[]) || [],
      race: (CATALOG.species as unknown[]) || [],
      feat: (CATALOG.feats as unknown[]) || [],
      weapon: (CATALOG.weapons as unknown[]) || [],
      spell: (CATALOG.spells as unknown[]) || [],
      armor: (CATALOG.armor as unknown[]) || [],
      item: (CATALOG.items as unknown[]) || [],
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(map[kind || ''] || []),
    })
  })

  await page.route('**/characters/create-2024/validate**', async (route) => {
    if (!isApi(route.request().url()) || route.request().resourceType() === 'document') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        name: 'Тест',
        level: 5,
        class_name: 'Воин 5',
        race_name: 'Дварф',
        hp_max: 44,
        sheet: {
          combat: {
            hp_max: 44,
            proficiency_bonus: 3,
            ac: 16,
            initiative: 2,
            speed: 25,
            darkvision: 120,
          },
          classes: [{ slug: 'fighter', name: 'Воин', level: 5 }],
          class_progress_2024: {
            multiclass_slots: { '1': 0, '2': 0, '3': 0 },
            multiclass_pact: null,
          },
        },
        warnings: [],
      }),
    })
  })

  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'access')
    localStorage.setItem('dvarf.refresh_token', 'refresh')
  })
}

async function openSeed(page: Page, seed: string) {
  await mockAuthAndCatalog(page)
  await page.goto(`/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=${seed}`)
  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 20_000 })
}

function sheetCharacter(input: {
  id: string
  name: string
  className: string
  level: number
  classes: Array<{
    id: string
    slug: string
    name: string
    level: number
    subclass?: string
    subclassName?: string
  }>
  abilities: Record<string, number>
  slots: Record<string, { max: number; used: number }>
  pact?: { level: number; count: number } | null
  multiclassSlots: Record<string, number>
  hp: number
}) {
  const abilities = Object.fromEntries(
    Object.entries(input.abilities).map(([k, score]) => [k, { score }]),
  )
  return {
    id: input.id,
    name: input.name,
    level: input.level,
    class_name: input.className,
    race_name: 'Дварф',
    hp_current: input.hp,
    hp_max: input.hp,
    rules_edition: '2024',
    sheet_version: 1,
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    sheet: {
      abilities,
      combat: {
        hp_max: input.hp,
        hp_current: input.hp,
        ac: 16,
        proficiency_bonus: Math.floor((input.level - 1) / 4) + 2,
        speed: 25,
        initiative: 2,
      },
      classes: input.classes.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        level: c.level,
        subclass_slug: c.subclass || null,
        subclass_name: c.subclassName || null,
        catalog_id: c.slug,
      })),
      identity: { background: 'Солдат', species_slug: 'dwarf', race_catalog_id: 'dwarf' },
      spells: { slots: input.slots, known: [], prepared: [], cantrips: [] },
      class_progress_2024: {
        total_level: input.level,
        proficiency_bonus: Math.floor((input.level - 1) / 4) + 2,
        multiclass_slots: input.multiclassSlots,
        multiclass_pact: input.pact || null,
        features: [],
        resources: [],
        spellcasting: input.classes
          .filter(
            (c) =>
              ['wizard', 'cleric', 'warlock', 'paladin', 'artificer'].includes(c.slug) ||
              c.subclass?.includes('eldritch'),
          )
          .map((c) => ({ class_slug: c.slug, cantrips: 3, prepared_spells: 4 })),
      },
      meta: { rules_edition: '2024' },
      inventory: { coins: { gp: 10 }, items: [], notes: '' },
      skills: {},
      saves: {},
    },
  }
}

async function mockSheet(page: Page, character: ReturnType<typeof sheetCharacter>) {
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'access')
    localStorage.setItem('dvarf.refresh_token', 'refresh')
  })
  await mockAuthAndCatalog(page)
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
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
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

async function dismissWelcome(page: Page) {
  const skip = page.getByRole('button', { name: /Пропустит.*подсказ/i })
  try {
    await skip.waitFor({ state: 'visible', timeout: 3_000 })
    await skip.click()
  } catch {
    // already dismissed
  }
}

async function openSheet(page: Page, character: ReturnType<typeof sheetCharacter>) {
  await mockSheet(page, character)
  await page.goto('/characters')
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
  await dismissWelcome(page)
  await page.goto(`/characters/${character.id}`)
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
  await dismissWelcome(page)
}

/** 2014 create helpers */
async function mock2014(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'access')
    localStorage.setItem('dvarf.refresh_token', 'refresh')
    // Fresh create walk — no restored mid-pipeline draft.
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
        email: 'm03c@example.com',
        display_name: 'M03c',
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

async function clickFooter(page: Page, name: RegExp) {
  const btn = page.getByRole('button', { name }).first()
  await expect(btn).toBeEnabled({ timeout: 10_000 })
  await btn.click()
}

/** Field wraps chips in <label>, so getByRole name is polluted — match visible text. */
function chipByText(scope: ReturnType<Page['locator']> | Page, text: RegExp | string) {
  return scope.locator('button.sheet-chip').filter({ hasText: text }).first()
}

async function openSetupDialog(
  page: Page,
  titleRe: RegExp,
  openButton: RegExp,
) {
  const dlg = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: titleRe }),
  })
  // Phone auto-opens on card select; desktop needs the setup button.
  if (!(await dlg.isVisible().catch(() => false))) {
    const btn = page.getByRole('button', { name: openButton }).first()
    await expect(btn).toBeEnabled({ timeout: 10_000 })
    await btn.click()
  }
  await expect(dlg).toBeVisible({ timeout: 10_000 })
  return dlg
}

async function walk2014ToLeveling(page: Page) {
  await page.goto('/')
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
  await page.goto('/characters/create')
  await expect(page.getByText(/Создание · D&D 2014|Создание персонажа/i).first()).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })

  // —— Раса ——
  await cardByTitle(page, 'Дварф').click()
  const raceDlg = await openSetupDialog(
    page,
    /настройка расы/i,
    /Выбрать и настроить|Настроить расу/,
  )
  // Подраса: в каталоге «Дварф (горный)», не «Горный дварф».
  await raceDlg
    .locator('button.sheet-chip')
    .filter({ has: page.locator('strong', { hasText: /^Дварф \(горный\)$/ }) })
    .click()
  await chipByText(raceDlg, /^Мужской$/).click()
  await raceDlg.getByRole('textbox').first().fill('Гимли')
  const smith = chipByText(raceDlg, /Инструменты кузнеца/)
  if (await smith.count()) {
    await smith.click()
  }
  // Race confirm auto-advances to background (no «Далее»).
  await applyDialog(page, /настройка расы/i)
  await expect(page.getByRole('button', { name: /Предыстория/i }).first()).toBeVisible()

  // —— Предыстория ——
  await expect(cardByTitle(page, 'Солдат')).toBeVisible({ timeout: 10_000 })
  await cardByTitle(page, 'Солдат').click()
  await openSetupDialog(
    page,
    /настройка предыстории/i,
    /Выбрать и настроить|Настроить предысторию/,
  )
  // Background confirm auto-advances to class.
  await applyDialog(page, /настройка предыстории/i)

  // —— Класс ——
  await expect(cardByTitle(page, 'Воин')).toBeVisible({ timeout: 10_000 })
  await cardByTitle(page, 'Воин').click()
  const classDlg = await openSetupDialog(
    page,
    /настройка класса/i,
    /Выбрать и настроить|Настроить класс/,
  )
  // Солдат уже дал Атлетику/Запугивание — берём свободные навыки воина.
  await chipByText(classDlg, /^Внимательность$/).click()
  await chipByText(classDlg, /^Выживание$/).click()
  // PHB строки снаряжения воина (a/b на каждой).
  await chipByText(classDlg, /^Кольчуга$/).click()
  await chipByText(classDlg, /^Воинское оружие и щит/).click()
  // После выбора «воинское оружие» — конкретный предмет.
  const longsword = chipByText(classDlg, /^Длинный меч$/)
  if (await longsword.isVisible().catch(() => false)) {
    await longsword.click()
  } else {
    const anyMartial = classDlg
      .locator('button.sheet-chip')
      .filter({ hasText: /Длинный меч|Боевой топор|Рапира|Секира|Глефа/ })
      .first()
    if (await anyMartial.count()) await anyMartial.click()
  }
  await chipByText(classDlg, /^Лёгкий арбалет/).click()
  await chipByText(classDlg, /^Набор исследователя$/).click()
  // Leave dialog open for the class screenshot (setup window).
  return classDlg
}

test.describe('P24-M03c leveling UI', () => {
  test('Прокачка forks 1–5, L1 forks, MC blocked, back', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    await openSeed(page, 'fighter5')

    await expect(page.getByTestId('p24-m03c-fork-fighting_style-fighter-1')).toBeVisible()
    await expect(page.getByTestId('p24-m03c-fork-weapon_mastery-fighter-1')).toBeVisible()
    await expect(page.getByTestId('p24-m03c-fork-list-fighter')).toBeVisible()
    await expect(page.getByTestId('p24-m03c-subclass-fighter__champion')).toBeVisible()
    await expect(page.getByTestId('p24-m03c-subclass-fighter__battlemaster')).toBeVisible()
    // P24-M02B-fighter opens AU Arcane Archer + FRHoF Banneret (UI «Знаменосец»).
    await expect(page.getByTestId('p24-m03c-subclass-fighter__arcane-archer')).toBeVisible()
    await expect(page.getByTestId('p24-m03c-subclass-fighter__banneret')).toBeVisible()
    await expect(page.getByTestId('p24-m03c-subclass-fighter__banneret')).toContainText(/Знаменосец/)
    await expect(page.getByTestId('p24-m03c-subclass-fighter__banneret')).not.toContainText(/Баннерет/)
    await expect(page.getByTestId('p24-m03c-subclass-fighter__purple-dragon-knight')).toHaveCount(0)
    await expect(page.getByTestId('p24-m03c-spells')).toHaveCount(0)
    await expect(page.getByTestId('p24-m03c-mc-list')).toHaveCount(0)
    await expect(page.getByTestId('p24-m03-sheet-preview')).toContainText(/Воин 5/)
    await expect(page.getByTestId('p24-m03-sheet-prof')).toContainText('+3')
    await expect(page.getByTestId('p24-m03-sheet-preview')).toContainText(/Средний/i)

    await page.getByTestId('p24-m03c-fork-list-fighter').scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'leveling-forks-1-5', project)

    await page.getByTestId('p24-m03c-mc-open').click()
    await expect(page.getByTestId('p24-m03c-mc-list')).toBeVisible()
    const wizardCard = page.getByTestId('p24-m03c-mc-wizard')
    await expect(wizardCard).toBeVisible()
    await expect(wizardCard).toBeDisabled()
    await expect(wizardCard).toContainText(/Интеллект/i)
    await expect(wizardCard).not.toContainText(/INT/i)
    await wizardCard.scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'multiclass-blocked', project)

    await page.getByRole('button', { name: /Назад/i }).first().click()
    await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
    await shot(page, ARTIFACTS, 'back-from-leveling', project)
    await page.getByTestId('p24-m03-next').click()
    await expect(page.getByTestId('p24-m03c-level-fighter')).toHaveValue('1')
    await shot(page, ARTIFACTS, 'rollback-level-1', project)
  })

  test('сборка wizard3/cleric2 — ячейки', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    await openSeed(page, 'wizard3cleric2')
    await expect(page.getByTestId('p24-m03c-slots')).toBeVisible()
    await page.getByTestId('p24-m03c-slots').scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'slots-wizard3-cleric2', project)
  })

  test('сборка artificer3/wizard1 — ячейки', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    await openSeed(page, 'artificer3wizard1')
    await page.getByTestId('p24-m03c-slots').scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'slots-artificer3-wizard1', project)
  })

  test('сборка fighter3 EK / wizard2 — ячейки', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    await openSeed(page, 'fighter3ekwizard2')
    await page.getByTestId('p24-m03c-slots').scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'slots-fighter3ek-wizard2', project)
  })

  test('лист Воин 4 / Волшебник 1 + ячейки', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    const character = sheetCharacter({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Воин 4 / Волшебник 1',
      className: 'Воин 4 / Волшебник 1',
      level: 5,
      hp: 44,
      abilities: { str: 17, dex: 13, con: 15, int: 14, wis: 10, cha: 8 },
      classes: [
        {
          id: 'c1',
          slug: 'fighter',
          name: 'Воин',
          level: 4,
          subclass: 'fighter__champion',
          subclassName: 'Чемпион',
        },
        { id: 'c2', slug: 'wizard', name: 'Волшебник', level: 1 },
      ],
      slots: { '1': { max: 2, used: 0 } },
      multiclassSlots: { '1': 2, '2': 0, '3': 0 },
    })
    await openSheet(page, character)
    await expect(page.getByText(/Воин 4|Волшебник 1/i).first()).toBeVisible({
      timeout: 25_000,
    })
    await expect(page.locator('body')).not.toContainText(/Pretty-print/)
    await shot(page, ARTIFACTS, 'sheet-multiclass', project)
    const spellsTab = page.getByRole('button', { name: /^Заклинания$/i }).first()
    if (await spellsTab.count()) {
      await spellsTab.click({ timeout: 5_000 }).catch(() => undefined)
    }
    await shot(page, ARTIFACTS, 'sheet-slots', project)
  })

  test('лист Паладин 5 / Колдун 3 + договор', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    const character = sheetCharacter({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Паладин 5 / Колдун 3',
      className: 'Паладин 5 / Колдун 3',
      level: 8,
      hp: 60,
      abilities: { str: 15, dex: 10, con: 14, int: 8, wis: 12, cha: 16 },
      classes: [
        {
          id: 'c1',
          slug: 'paladin',
          name: 'Паладин',
          level: 5,
          subclass: 'paladin__oath-of-devotion',
          subclassName: 'Клятва преданности',
        },
        {
          id: 'c2',
          slug: 'warlock',
          name: 'Колдун',
          level: 3,
          subclass: 'warlock__fiend-patron',
          subclassName: 'Архидемон',
        },
      ],
      slots: { '1': { max: 4, used: 0 }, '2': { max: 2, used: 0 } },
      multiclassSlots: { '1': 4, '2': 2, '3': 0 },
      pact: { level: 2, count: 2 },
    })
    await openSheet(page, character)
    await expect(page.getByText(/Паладин 5|Колдун 3/i).first()).toBeVisible({
      timeout: 25_000,
    })
    await shot(page, ARTIFACTS, 'sheet-paladin-warlock', project)
    const spellsTab = page.getByRole('button', { name: /^Заклинания$/i }).first()
    if (await spellsTab.count()) {
      await spellsTab.click({ timeout: 5_000 }).catch(() => undefined)
    }
    await shot(page, ARTIFACTS, 'sheet-pact-slots', project)
  })

  test('2014 create — раса, класс (настройка воина), прокачка 5', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    const tag = SHOT_TAG
    await mock2014(page)

    // Race catalog (step 1) — before walk mutates pipeline draft.
    await page.goto('/')
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `create-2014-race-${tag}`, project)
    if (tag === 'after') {
      await shot(page, ARTIFACTS_2014, 'create-2014-race', project)
    }

    const classDlg = await walk2014ToLeveling(page)
    // Must be class step with fighter setup dialog open — not race.
    await expect(page.getByRole('heading', { name: /Воин: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Атлетика|снаряжен|оруж/i)
    await expect(page.getByRole('heading', { name: /настройка расы/i })).toHaveCount(0)
    await shot(page, ARTIFACTS_2014, `create-2014-class-${tag}`, project)
    if (tag === 'after') {
      await shot(page, ARTIFACTS_2014, 'create-2014-class', project)
    }

    // Class confirm auto-advances to abilities.
    await applyDialog(page, /настройка класса/i)
    const layOut = page.getByRole('button', { name: /Разложить по приоритету класса/i })
    await expect(layOut).toBeVisible({ timeout: 15_000 })
    await layOut.scrollIntoViewIfNeeded()
    await layOut.click()
    await clickFooter(page, /Далее · Прокачка/)

    // —— Прокачка ——
    // On phone the summary «Уровень персонажа» lives in a hidden cards pane; use the level field.
    const levelInput = page
      .locator('.create-pipeline__level-block input[type="number"]')
      .or(page.getByRole('spinbutton', { name: /^Уровень$/ }))
      .first()
    await expect(levelInput).toBeVisible({ timeout: 10_000 })
    await levelInput.fill('5')
    await levelInput.blur()
    await expect(levelInput).toHaveValue('5')
    await expect(
      page.locator('.create-pipeline__level-block').getByText(/Воин/i).first(),
    ).toBeVisible()
    const forksBtn = page.getByRole('button', { name: /Развилки и умения/i }).first()
    await expect(forksBtn).toBeVisible()
    await forksBtn.click()
    const forkDlg = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /Боевой стиль|Развилки|архетип/i }),
    })
    await expect(forkDlg).toBeVisible({ timeout: 10_000 })
    await expect(forkDlg.getByText(/Шаг\s*1\s*из/i)).toBeVisible()
    // Let dialog animation settle so before/after phone shots match.
    await page.waitForTimeout(400)
    await shot(page, ARTIFACTS_2014, `create-2014-leveling-${tag}`, project)
    if (tag === 'after') {
      await shot(page, ARTIFACTS_2014, 'create-2014-leveling', project)
    }
  })
})
