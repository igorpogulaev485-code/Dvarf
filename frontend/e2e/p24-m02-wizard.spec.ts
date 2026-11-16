/**
 * P24-M02-wizard: preview + sheet mock shots (1440/390) and real 2014 create walk
 * to the Wizard class setup dialog (not Race).
 *
 * SHOT_TAG=before|after controls 2014 regression suffix.
 */
import { expect, test, type Page, type Route } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = '/opt/cursor/artifacts/p24-m02-wizard'
const ARTIFACTS_2014 = '/opt/cursor/artifacts/p24-m02-wizard/regression-2014'
const CATALOG_2014 = JSON.parse(
  fs.readFileSync(path.join(here, 'fixtures/p24-m03c-2014-catalog.json'), 'utf8'),
) as Record<string, unknown[]>

const SHOT_TAG = process.env.P24_M02_WIZARD_SHOT_TAG || 'after'

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
        email: 'm02w@example.com',
        display_name: 'M02w',
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

async function walk2014ToWizardClass(page: Page) {
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
  await raceDlg.getByRole('textbox').first().fill('Гимли')
  const smith = chipByText(raceDlg, /Инструменты кузнеца/)
  if (await smith.count()) {
    await smith.click()
  }
  await applyDialog(page, /настройка расы/i)
  await expect(page.getByRole('button', { name: /Предыстория/i }).first()).toBeVisible()

  await expect(cardByTitle(page, 'Солдат')).toBeVisible({ timeout: 10_000 })
  await cardByTitle(page, 'Солдат').click()
  await openSetupDialog(
    page,
    /настройка предыстории/i,
    /Выбрать и настроить|Настроить предысторию/,
  )
  await applyDialog(page, /настройка предыстории/i)

  await expect(cardByTitle(page, 'Волшебник')).toBeVisible({ timeout: 10_000 })
  await cardByTitle(page, 'Волшебник').click()
  const classDlg = await openSetupDialog(
    page,
    /настройка класса/i,
    /Выбрать и настроить|Настроить класс/,
  )
  await chipByText(classDlg, /^Магия$/).click()
  await chipByText(classDlg, /^История$/).click()
  await chipByText(classDlg, /^Боевой посох$/).click()
  await chipByText(classDlg, /^Сумка с компонентами$/).click()
  await chipByText(classDlg, /^Набор учёного$/).click()
  return classDlg
}

function sheetCharacter(input: {
  id: string
  name: string
  level: number
  subclass?: string
  subclassName?: string
  prepared: number
  slots: Record<string, { max: number; used: number }>
}) {
  return {
    id: input.id,
    name: input.name,
    level: input.level,
    class_name: `Волшебник ${input.level}`,
    race_name: 'Эльф',
    hp_current: 6 + (input.level - 1) * 4,
    hp_max: 6 + (input.level - 1) * 4,
    rules_edition: '2024',
    sheet_version: 1,
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    sheet: {
      abilities: {
        str: { score: 8 },
        dex: { score: 14 },
        con: { score: 14 },
        int: { score: 16 },
        wis: { score: 12 },
        cha: { score: 10 },
      },
      combat: {
        hp_max: 6 + (input.level - 1) * 4,
        hp_current: 6 + (input.level - 1) * 4,
        ac: 12,
        proficiency_bonus: Math.floor((input.level - 1) / 4) + 2,
        speed: 30,
        initiative: 2,
      },
      classes: [
        {
          id: 'wiz1',
          slug: 'wizard',
          name: 'Волшебник',
          level: input.level,
          subclass_slug: input.subclass || null,
          subclass_name: input.subclassName || null,
          catalog_id: 'wizard',
        },
      ],
      identity: { background: 'Мудрец', species_slug: 'elf', race_catalog_id: 'elf' },
      spells: {
        slots: input.slots,
        known: [
          {
            id: 'shield',
            name: 'Щит',
            level: 1,
            prepared: true,
            in_spellbook: true,
            class_slug: 'wizard',
          },
          {
            id: 'magic-missile',
            name: 'Волшебная стрела',
            level: 1,
            prepared: true,
            in_spellbook: true,
            class_slug: 'wizard',
          },
          {
            id: 'fire-bolt',
            name: 'Огненный снаряд',
            level: 0,
            prepared: true,
            class_slug: 'wizard',
          },
        ],
        prepared: [],
        cantrips: [],
      },
      class_progress_2024: {
        total_level: input.level,
        proficiency_bonus: Math.floor((input.level - 1) / 4) + 2,
        multiclass_slots: Object.fromEntries(
          Object.entries(input.slots).map(([k, v]) => [k, v.max]),
        ),
        multiclass_pact: null,
        features: [],
        resources: [
          {
            id: 'feat:wizard:arcane_recovery:arcane_recovery',
            pool_id: 'arcane_recovery',
            name_ru: 'Магическое восстановление',
            max: 1,
            reset: 'long',
          },
        ],
        spellcasting: [
          {
            class_slug: 'wizard',
            cantrips: input.level >= 10 ? 5 : input.level >= 4 ? 4 : 3,
            prepared_spells: input.prepared,
          },
        ],
      },
      meta: { rules_edition: '2024' },
      inventory: {
        coins: { gp: 50 },
        items: [
          {
            id: 'book1',
            name: 'Книга заклинаний',
            qty: 1,
            tags: ['spellbook'],
          },
        ],
        notes: '',
      },
      skills: {},
      saves: {},
      play: {
        resources: [
          {
            id: 'feat:wizard:arcane_recovery:wiz1',
            pool_id: 'arcane_recovery',
            name: 'Магическое восстановление',
            current: 1,
            max: 1,
          },
        ],
      },
    },
  }
}

async function mockAuthOnly(page: Page) {
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
    if (!isApi(route.request().url()) || route.request().resourceType() === 'document') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '00000000-0000-4000-8000-000000000001',
        email: 'm02w@example.com',
        display_name: 'M02w',
        is_email_verified: true,
        access_token: 'access',
        refresh_token: 'refresh',
      }),
    })
  })
  await page.route('**/catalog**', async (route: Route) => {
    const reqUrl = route.request().url()
    if (!isApi(reqUrl) || route.request().resourceType() === 'document') {
      await route.continue()
      return
    }
    if (!new URL(reqUrl).pathname.startsWith('/catalog')) {
      await route.continue()
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'access')
    localStorage.setItem('dvarf.refresh_token', 'refresh')
  })
}

async function mockSheet(page: Page, character: ReturnType<typeof sheetCharacter>) {
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'access')
    localStorage.setItem('dvarf.refresh_token', 'refresh')
  })
  await mockAuthOnly(page)
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

test.describe('P24-M02 wizard preview', () => {
  test('preview: уровни 1/3/5/11/20 + подклассы; флаг закрыт', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    await page.goto('/dev/p24-m02-wizard-preview')
    await expect(page.getByTestId('p24-m02-wizard-preview')).toBeVisible()
    await expect(page.getByTestId('p24-m02-wizard-flag')).toContainText('закрыт')
    await expect(page.getByTestId('p24-m02-wizard-l5-spells')).toContainText('подготовлено 9')
    await expect(page.getByTestId('p24-m02-wizard-l11-spells')).toContainText('подготовлено 16')
    await expect(page.getByTestId('p24-m02-wizard-l20-gates')).toContainText('Фирменные заклинания: есть')
    await expect(page.getByTestId('p24-m02-wizard-wizard__evoker-l14-school')).toContainText(
      'полцены: нет',
    )
    await page.getByTestId('p24-m02-wizard-l5').scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'preview-l5', project)
    await page.getByTestId('p24-m02-wizard-l11').scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'preview-l11', project)
    await page.getByTestId('p24-m02-wizard-l1').scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'preview-overview', project)
  })
})

test.describe('P24-M02 wizard sheet mock', () => {
  test('лист волшебника 5 и 11', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    const wiz5 = sheetCharacter({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Волшебник 5',
      level: 5,
      subclass: 'wizard__evoker',
      subclassName: 'Воплотитель',
      prepared: 9,
      slots: { '1': { max: 4, used: 0 }, '2': { max: 3, used: 0 }, '3': { max: 2, used: 0 } },
    })
    await openSheet(page, wiz5)
    await expect(page.getByText(/Волшебник/i).first()).toBeVisible({ timeout: 25_000 })
    await expect(page.locator('body')).not.toContainText(/Без имени/)
    await shot(page, ARTIFACTS, 'sheet-wizard-l5', project)
    const featuresTab = page.getByRole('button', { name: /^Умения$/i }).first()
    if (await featuresTab.count()) {
      await featuresTab.click({ timeout: 5_000 }).catch(() => undefined)
      await page.waitForTimeout(300)
      await shot(page, ARTIFACTS, 'sheet-wizard-l5-features', project)
    }
    const spellsTab = page.getByRole('button', { name: /^Заклинания$/i }).first()
    if (await spellsTab.count()) {
      await spellsTab.click({ timeout: 5_000 }).catch(() => undefined)
      await page.waitForTimeout(300)
      await shot(page, ARTIFACTS, 'sheet-wizard-l5-spells', project)
    }

    const wiz11 = sheetCharacter({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      name: 'Волшебник 11',
      level: 11,
      subclass: 'wizard__abjurer',
      subclassName: 'Оградитель',
      prepared: 16,
      slots: {
        '1': { max: 4, used: 0 },
        '2': { max: 3, used: 0 },
        '3': { max: 3, used: 0 },
        '4': { max: 3, used: 0 },
        '5': { max: 2, used: 0 },
        '6': { max: 1, used: 0 },
      },
    })
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await openSheet(page, wiz11)
    await expect(page.getByText(/Волшебник/i).first()).toBeVisible({ timeout: 25_000 })
    await expect(page.locator('body')).not.toContainText(/Без имени/)
    await shot(page, ARTIFACTS, 'sheet-wizard-l11', project)
  })
})

test.describe('P24-M02 2014 regression', () => {
  test('2014 create — класс Волшебник (не раса)', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    const tag = SHOT_TAG
    await mock2014(page)

    await page.goto('/')
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    // Race catalog only as a marker — walk continues past it.
    await shot(page, ARTIFACTS_2014, `create-2014-race-marker-${tag}`, project)

    const classDlg = await walk2014ToWizardClass(page)
    await expect(page.getByRole('heading', { name: /Волшебник: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Тайная|снаряжен|книга/i)
    await expect(page.getByRole('heading', { name: /настройка расы/i })).toHaveCount(0)
    await page.waitForTimeout(400)
    await shot(page, ARTIFACTS_2014, `create-2014-wizard-class-${tag}`, project)
    if (tag === 'after') {
      await shot(page, ARTIFACTS_2014, 'create-2014-wizard-class', project)
    }
  })
})
