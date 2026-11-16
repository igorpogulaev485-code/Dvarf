/**
 * P24-M02-wizard acceptance (1440 / 390). No live API: catalog, auth and the 2024
 * create validator run offline (e2e/support/wizard2024Harness.ts + create2024_bridge.py).
 * Every sheet shot walks the real create pipeline (seed → «Готово») and opens the real
 * sheet dialogs. The 2014 regression walks the wizard class dialog before/after.
 *
 * SHOT_TAG=before|after controls the 2014 regression suffix.
 */
import { expect, test, type Page } from '@playwright/test'
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

import {
  createStore,
  installWizardHarness,
  loadCatalog2024,
  type HarnessStore,
} from './support/wizard2024Harness'

async function dismissWelcome(page: Page) {
  const skip = page.getByRole('button', { name: /Пропустит.*подсказ/i })
  try {
    await skip.waitFor({ state: 'visible', timeout: 3_000 })
    await skip.click()
  } catch {
    // already dismissed
  }
}

/** Real 2024 create pipeline: seeded leveling step → «Готово» → sheet. */
async function createWizardViaPipeline(page: Page, store: HarnessStore, seed: string) {
  await installWizardHarness(page, store)
  await page.goto(`/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=${seed}`)
  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 30_000 })
  const finish = page.getByTestId('p24-m03-finish')
  await expect(finish).toBeEnabled({ timeout: 30_000 })
  await finish.click()
  await page.waitForURL(/\/characters\/[0-9a-f-]{36}$/i, { timeout: 30_000 })
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
  await dismissWelcome(page)
}

function projectOf(testInfo: { project: { name: string } }): '390' | '1440' {
  return testInfo.project.name.includes('390') ? '390' : '1440'
}

async function openFeaturesScene(page: Page, project: string) {
  if (project === '390') await page.getByText('Способн.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Способности$/ }).first().click()
  await page.waitForTimeout(700)
}

const isPhone = (project: string) => project === '390'

/** Phone splits the desk: spells live on their own sub-tab of the combat scene. */
async function goSpells(page: Page, project: string) {
  if (!isPhone(project)) return
  await page.getByText('Заклинания', { exact: true }).first().click()
  await page.waitForTimeout(500)
}

async function openRest(page: Page, project: string) {
  if (isPhone(project)) {
    await page.locator('button:has-text("▾")').first().click()
    await page.waitForTimeout(400)
  }
  await page.getByRole('button', { name: /Отдых/ }).first().click()
  await expect(page.getByRole('dialog').last()).toBeVisible()
}

async function openMagicDialog(page: Page, project: string) {
  if (isPhone(project)) {
    await goSpells(page, project)
    await page.getByRole('button', { name: /^Книга$/ }).last().click()
  } else {
    await page.getByRole('button', { name: /^Магия$/ }).first().click()
  }
  await expect(page.getByRole('dialog').last()).toBeVisible()
}

async function openIdentity(page: Page) {
  await page
    .locator('.play-desk__top button, [data-onboarding="combat-header"] button')
    .first()
    .click()
  const dlg = page.getByRole('dialog').last()
  await expect(dlg.getByRole('button', { name: /\+1 уровень/ })).toBeVisible()
  return dlg
}

function storedSheet(store: HarnessStore): Record<string, any> {
  const row = [...store.characters.values()][0]
  return row.sheet as Record<string, any>
}

function spellEntryId(slug: string): string {
  const row = loadCatalog2024().spell.find((entry) => entry.slug === slug)
  if (!row) throw new Error(`spell ${slug} not in catalog`)
  return String(row.id)
}

async function pickFirstOption(page: Page, label: RegExp, index = 1) {
  const select = page.getByLabel(label).first()
  await select.scrollIntoViewIfNeeded()
  await select.selectOption({ index })
  await page.waitForTimeout(300)
}

async function logDialog(page: Page, tag: string) {
  const dlg = page.getByRole('dialog').last()
  const text = (await dlg.innerText()).replace(/\n+/g, ' | ').slice(0, 900)
  console.log(`DIALOG[${tag}] ${text}`)
}

async function spellsPanelShot(page: Page, name: string, project: string) {
  const viewport = page.viewportSize()
  if (viewport) {
    await page.setViewportSize({ width: viewport.width, height: isPhone(project) ? 3600 : 2100 })
  }
  const quota = page.getByText(/подготовлено \d+ из \d+/).first()
  await quota.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await shot(page, ARTIFACTS, name, project)
  if (viewport) await page.setViewportSize(viewport)
}

test.describe('P24-M02 wizard — real create pipeline', () => {
  test.setTimeout(75_000)
  test.use({ actionTimeout: 12_000 })

  for (const spec of [
    { seed: 'wizard5', level: 5, prepared: 9, book: 14, slots: [4, 3, 2] },
    { seed: 'wizard11', level: 11, prepared: 16, book: 26, slots: [4, 3, 3, 3, 2, 1] },
  ]) {
    test(`sheet-wizard-l${spec.level}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await createWizardViaPipeline(page, store, spec.seed)
      if (isPhone(project)) await shot(page, ARTIFACTS, `sheet-wizard-l${spec.level}-combat`, project)
      await goSpells(page, project)
      const sheet = storedSheet(store)
      expect(sheet.spells.known.filter((row: any) => row.in_spellbook).length).toBe(spec.book)
      spec.slots.forEach((max, index) => {
        expect(sheet.spells.slots[String(index + 1)].max).toBe(max)
      })
      await expect(
        page
          .getByText(`подготовлено ${spec.prepared} из ${spec.prepared} · в книге ${spec.book}`)
          .first(),
      ).toBeVisible({ timeout: 15_000 })
      await shot(page, ARTIFACTS, `sheet-wizard-l${spec.level}`, project)
      await spellsPanelShot(page, `sheet-wizard-l${spec.level}-spells`, project)
      expect(store.unmatched).toEqual([])
    })
  }

  test('book-2024-copy', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createWizardViaPipeline(page, store, 'wizard5')
    const sheet = storedSheet(store)
    const template = sheet.inventory.items[0]
    sheet.inventory.items.push({
      ...template,
      id: 'scroll-slow',
      name: 'Свиток: Замедление (3 ур.)',
      catalog_slug: 'spell_scroll_3',
      qty: 1,
      scroll_spell: {
        catalog_id: spellEntryId('slow'),
        slug: 'slow',
        name: 'Замедление',
        level: 3,
        school: 'transmutation',
        ritual: false,
        concentration: true,
      },
    })
    sheet.inventory.coins = { cp: 0, sp: 0, ep: 0, gp: 500, pp: 0 }
    await page.reload()
    await expect(page.locator('#root')).not.toBeEmpty()
    await dismissWelcome(page)
    await openMagicDialog(page, project)
    await page.getByRole('button', { name: /Книга: есть/ }).click()
    const manage = page.getByRole('dialog').last()
    await expect(manage.getByText(/50 зм · 2 ч/)).toBeVisible()
    await expect(manage.getByText(/10 зм · 1 ч/)).toBeVisible()
    await expect(manage.getByText(/СЛ 13/).first()).toBeVisible()
    await manage.getByText(/Тариф чужой копии/).scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'book-2024-copy', project)
  })

  test('arcane-recovery-dialog', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createWizardViaPipeline(page, store, 'wizard5')
    const sheet = storedSheet(store)
    sheet.spells.slots['1'].used = 3
    sheet.spells.slots['2'].used = 2
    sheet.spells.slots['3'].used = 1
    await page.reload()
    await dismissWelcome(page)
    await page.locator('[aria-label^="Магическое восстановление"] button').first().click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg.getByText(/Лимит суммы уровней ячеек: 3/)).toBeVisible()
    await dlg.getByRole('button', { name: '+' }).nth(1).click()
    await page.waitForTimeout(300)
    await shot(page, ARTIFACTS, 'arcane-recovery-dialog', project)
  })

  test('memorize-spell-short-rest', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createWizardViaPipeline(page, store, 'wizard5')
    await openRest(page, project)
    const dlg = page.getByRole('dialog').last()
    await expect(dlg.getByText(/Запомнить заклинание/)).toBeVisible()
    await dlg.getByText(/Запомнить заклинание/).scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'memorize-spell-short-rest', project)
  })

  test('levelup-book-plus2 (L2→3 abjurer)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createWizardViaPipeline(page, store, 'wizard2')
    const identity = await openIdentity(page)
    await identity.getByRole('button', { name: /\+1 уровень/ }).first().click()
    await page.getByRole('button', { name: /^Повысить$/ }).click()
    const guided = page.getByRole('dialog').last()
    await expect(guided.getByText(/Шаг 1 из 3/)).toBeVisible()
    const combo = guided.getByRole('combobox').first()
    await combo.click()
    await combo.fill('Оград')
    await page.getByRole('option', { name: /Оградитель/ }).click()
    await expect(guided.getByText(/Шаг 2 из 3/)).toBeVisible()
    await expect(guided.getByText(/\+2 бесплатно в книгу/)).toBeVisible()
    await guided.getByRole('button', { name: /^В книгу$/ }).first().click()
    await guided.getByRole('button', { name: /^В книгу$/ }).first().click()
    await expect(guided.getByText(/Выбрано: 2\/2/)).toBeVisible()
    await shot(page, ARTIFACTS, 'levelup-book-plus2', project)
    await guided.getByRole('button', { name: /^Далее$/ }).click()
    await expect(guided.getByText(/Шаг 3 из 3/)).toBeVisible()
    await expect(guided.getByText(/Знаток школы: 2 закл\./)).toBeVisible()
    await guided.getByRole('button', { name: /^В книгу$/ }).first().click()
    await guided.getByRole('button', { name: /^В книгу$/ }).first().click()
    await shot(page, ARTIFACTS, 'levelup-savant-abjuration', project)
    await guided.getByRole('button', { name: /^Готово$/ }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.waitForTimeout(500)
    await openFeaturesScene(page, project)
    await page.getByText('Волшебный щит').first().scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'subclass-abjurer-ward', project)
  })

  test('scholar-expertise-pick (L1→2)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createWizardViaPipeline(page, store, 'wizard1')
    const identity = await openIdentity(page)
    await identity.getByRole('button', { name: /\+1 уровень/ }).first().click()
    await page.getByRole('button', { name: /^Повысить$/ }).click()
    const guided = page.getByRole('dialog').last()
    await logDialog(page, 'scholar')
    await expect(guided.getByText(/Академические знания|Экспертиза/).first()).toBeVisible()
    await shot(page, ARTIFACTS, 'scholar-expertise-pick', project)
  })

  test('subclass-diviner-portent', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createWizardViaPipeline(page, store, 'wizard3diviner')
    await openFeaturesScene(page, project)
    await page.getByText('Знамение').first().scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'subclass-diviner-portent', project)
  })

  test('spell-mastery-l18', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createWizardViaPipeline(page, store, 'wizard18')
    await openFeaturesScene(page, project)
    const card = page.getByText('Мастерство заклинателя').first()
    await card.scrollIntoViewIfNeeded()
    await card.click()
    await page.waitForTimeout(500)
    await pickFirstOption(page, /1 круг, время/)
    await pickFirstOption(page, /2 круг, время/)
    await shot(page, ARTIFACTS, 'spell-mastery-l18', project)
  })

  test('signature-l20', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createWizardViaPipeline(page, store, 'wizard20')
    await openFeaturesScene(page, project)
    const card = page.getByText('Фирменные заклинания').first()
    await card.scrollIntoViewIfNeeded()
    await card.click()
    await page.waitForTimeout(500)
    await pickFirstOption(page, /Первое, 3 круг/)
    await pickFirstOption(page, /Второе, 3 круг/, 2)
    await shot(page, ARTIFACTS, 'signature-l20', project)
  })

  for (const spec of [
    { seed: 'wizard20', to: 19, name: 'leveldown-20-to-19' },
    { seed: 'wizard3', to: 2, name: 'leveldown-3-to-2' },
  ]) {
    test(spec.name, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await createWizardViaPipeline(page, store, spec.seed)
      const identity = await openIdentity(page)
      await identity.getByRole('button', { name: '−1' }).first().click()
      await page.waitForTimeout(600)
      await logDialog(page, spec.name)
      await identity.getByText(/^Итого: Волшебник/).scrollIntoViewIfNeeded()
      await expect(identity.getByText(new RegExp(`^Итого: Волшебник ${spec.to}`))).toBeVisible()
      await shot(page, ARTIFACTS, spec.name, project)
      await identity.getByRole('button', { name: /^Готово$/ }).click()
      await page.waitForTimeout(500)
      await openFeaturesScene(page, project)
      await shot(page, ARTIFACTS, `${spec.name}-features`, project)
    })
  }
})


test.describe('P24-M02 DEV test stand (not acceptance evidence)', () => {
  test('preview page is marked DEV and is not a sheet', async ({ page }) => {
    await page.goto('/dev/p24-m02-wizard-preview')
    await expect(page.getByTestId('p24-m02-wizard-dev-banner')).toContainText(
      'Только для тестов / DEV',
    )
    await expect(page.getByTestId('p24-m02-wizard-preview')).toBeVisible()
    await expect(page.locator('.play-desk')).toHaveCount(0)
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
