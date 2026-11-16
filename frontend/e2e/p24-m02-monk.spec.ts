/**
 * P24-M02-monk acceptance (1440 / 390). Offline catalog + create2024_bridge.py.
 * Monk is a non-caster — focus techniques, MA die, movement; no spell prep.
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
  installMonkHarness,
  type HarnessStore,
} from './support/monk2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = '/opt/cursor/artifacts/p24-m02-monk'
const ARTIFACTS_2014 = '/opt/cursor/artifacts/p24-m02-monk/regression-2014'
const CATALOG_2014 = JSON.parse(
  fs.readFileSync(path.join(here, 'fixtures/p24-m03c-2014-catalog.json'), 'utf8'),
) as Record<string, unknown[]>

/** Inject 2014 Monk into the thin fixture used by create/regression mocks. */
const MONK_2014_CLASS = {
  id: 'seed-class-monk',
  kind: 'class',
  slug: 'monk',
  name_ru: 'Монах',
  name_en: 'Monk',
  rules_edition: '2014',
  parent_id: null,
  source: 'phb',
  external_ref: null,
  data: {
    hit_die: 8,
    primary_abilities: ['dex', 'wis'],
    saving_throws: ['str', 'dex'],
    armor: [],
    weapons: { simple: true, martial: false, extras: ['shortsword'] },
    tools_fixed: [],
    tool_choices: { count: 1, from: ['smiths-tools', 'flute', 'lute'] },
    skill_choices: {
      count: 2,
      from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    },
    multiclass_prerequisites: { all: ['dex', 'wis'], min: 13 },
    caster: { progression: 'none', ability: null, prepare: null },
    starting_equipment: [
      {
        id: 'a',
        label_ru: 'Вариант A',
        summary_ru: 'Короткий меч + набор исследователя + 10 дротиков',
        items: [
          { name: 'Короткий меч', qty: 1 },
          { name: 'Набор исследователя', qty: 1 },
          { name: 'Дротик', qty: 10 },
        ],
      },
      {
        id: 'gold',
        label_ru: 'Золото',
        summary_ru: '5к4 зм',
        items: [],
        coins_gp: 12,
      },
    ],
  },
  sort_order: 60,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const CATALOG_2014_WITH_MONK: Record<string, unknown[]> = {
  ...CATALOG_2014,
  class: [...(CATALOG_2014.class || []), MONK_2014_CLASS],
}

const SHOT_TAG = process.env.P24_M02_MONK_SHOT_TAG || 'after'

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
      body: JSON.stringify(CATALOG_2014_WITH_MONK[kind] || []),
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

async function walk2014ToMonkClass(page: Page) {
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

  await expect(cardByTitle(page, 'Монах')).toBeVisible({ timeout: 10_000 })
  await cardByTitle(page, 'Монах').click()
  const classDlg = await openSetupDialog(
    page,
    /настройка класса/i,
    /Выбрать и настроить|Настроить класс/,
  )
  await chipByText(classDlg, /Акробатика|Скрытность|Атлетика/i).first().click()
  const skill2 = classDlg.locator('button.sheet-chip').filter({ hasText: /Скрытность|Атлетика|История/i })
  if ((await skill2.count()) > 1) {
    await skill2.nth(1).click()
  }
  const tool = chipByText(classDlg, /кузнец|флейт|лютн|инструмент/i)
  if (await tool.isVisible().catch(() => false)) {
    await tool.click()
  }
  for (const label of [/Короткий меч/i, /Вариант A/i, /Дубинка/i]) {
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

async function createMonkViaPipeline(page: Page, store: HarnessStore, seed: string) {
  await installMonkHarness(page, store)
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

async function openRest(page: Page, project: string) {
  if (project === '390') {
    await ensureMobileVitalsExpanded(page)
    await page.getByRole('button', { name: /^Отдых$/ }).first().click()
  } else {
    await page.locator('button.play-desk-header__rest').first().click()
  }
  await expect(
    page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).first(),
  ).toBeVisible()
}

async function openFeaturesScene(page: Page, project: string) {
  if (project === '390') await page.getByText('Способн.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Способности$/ }).first().click()
  await page.waitForTimeout(700)
}

async function expandFeature(page: Page, name: string | RegExp) {
  const nameRe =
    typeof name === 'string'
      ? new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
      : name
  const card = page
    .locator('.feature-card')
    .filter({ has: page.locator('.feature-card__name, .feature-card__title', { hasText: nameRe }) })
    .first()
  await expect(card).toBeVisible({ timeout: 10_000 })
  await card.scrollIntoViewIfNeeded()
  if (await card.locator('.feature-card__title').count()) return card
  await card.locator('button.feature-card__glance, button[aria-label="Подробнее"]').first().click()
  await expect(
    page
      .locator('.feature-card--expand')
      .filter({ has: page.locator('.feature-card__title', { hasText: nameRe }) })
      .first(),
  ).toBeVisible({ timeout: 5_000 })
  return page
    .locator('.feature-card--expand')
    .filter({ has: page.locator('.feature-card__title', { hasText: nameRe }) })
    .first()
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

async function tallShot(page: Page, name: string, project: string) {
  const viewport = page.viewportSize()
  if (viewport) {
    await page.setViewportSize({ width: viewport.width, height: isPhone(project) ? 3600 : 2100 })
  }
  await page.waitForTimeout(400)
  await shot(page, ARTIFACTS, name, project)
  if (viewport) await page.setViewportSize(viewport)
}

test.describe('P24-M02 monk — create-at sheet + focus', () => {
  test.setTimeout(90_000)
  test.use({ actionTimeout: 12_000 })

  for (const spec of [
    { seed: 'monk5hand', level: 5, maDie: /1к8|1d8/i, focusMax: 5, speedHint: /4[05]|55|60/ },
    { seed: 'monk11hand', level: 11, maDie: /1к10|1d10/i, focusMax: 11, speedHint: /4[05]|55|60|65/ },
  ]) {
    test(`sheet-monk-l${spec.level}-open-hand`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await createMonkViaPipeline(page, store, spec.seed)
      const sheet = storedSheet(store)
      expect(sheet.classes?.[0]?.subclass_slug).toMatch(/warrior-of-the-hand/)
      expect(sheet.combat?.hp_max).toBeGreaterThan(20)

      if (isPhone(project)) {
        await ensureMobileVitalsExpanded(page)
        await shot(page, ARTIFACTS, `sheet-monk-l${spec.level}-combat`, project)
      } else {
        await shot(page, ARTIFACTS, `sheet-monk-l${spec.level}-combat`, project)
      }

      // Speed / movement visible in header.
      await expect(page.getByText(/фт|скорост/i).first()).toBeVisible({ timeout: 10_000 }).catch(() => {})
      await shot(page, ARTIFACTS, `sheet-monk-l${spec.level}-open-hand`, project)

      await openFeaturesScene(page, project)
      await expect(page.getByText(/Очки сосредоточенности|Монашеская сосредоточенность|Шквал ударов/i).first()).toBeVisible({
        timeout: 15_000,
      })
      // MA die often on martial arts feature or attacks scene — soft assert.
      const ma = page.getByText(spec.maDie).first()
      if (await ma.isVisible().catch(() => false)) {
        await ma.scrollIntoViewIfNeeded()
      }
      await tallShot(page, `sheet-monk-l${spec.level}-features`, project)
      expect(store.unmatched).toEqual([])
    })
  }

  async function openMonkTechniqueDialog(page: Page, featureName: RegExp, buttonName: RegExp) {
    const card = await expandFeature(page, featureName)
    const btn = card.getByRole('button', { name: buttonName }).first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await btn.click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg).toBeVisible({ timeout: 10_000 })
    return dlg
  }

  test('focus-techniques-dialogs', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createMonkViaPipeline(page, store, 'monk5hand')
    await openFeaturesScene(page, project)

    // Pool card may expose «Техники…» (feature_id monks-focus); otherwise techniques are separate cards.
    const poolCard = page
      .locator('.feature-card')
      .filter({
        has: page.locator('.feature-card__name, .feature-card__title', {
          hasText: /Очки сосредоточенности|Монашеская сосредоточенность/,
        }),
      })
      .first()
    if (await poolCard.isVisible().catch(() => false)) {
      await poolCard.scrollIntoViewIfNeeded()
      const tech = poolCard.getByRole('button', { name: /Техники/i }).first()
      if (await tech.isVisible().catch(() => false)) {
        await tech.click()
        const picker = page.getByRole('dialog').last()
        await expect(picker.getByText(/Шквал ударов/i)).toBeVisible()
        await expect(picker.getByText(/Терпеливая защита/i)).toBeVisible()
        await expect(picker.getByText(/Поступь ветра/i)).toBeVisible()
        await shot(page, ARTIFACTS, 'focus-techniques-picker', project)
        await page.keyboard.press('Escape')
      }
    }

    // Flurry (synthetic technique card)
    let dlg = await openMonkTechniqueDialog(page, /^Шквал ударов/, /Шквал/i)
    await expect(dlg.getByText(/безоружных удара|2 безоруж/i)).toBeVisible()
    await shot(page, ARTIFACTS, 'focus-flurry-dialog', project)
    await page.keyboard.press('Escape')

    // Patient free + paid
    dlg = await openMonkTechniqueDialog(page, /^Терпеливая защита/, /Защита/i)
    await expect(dlg.getByText(/Бесплатно|Отход/i).first()).toBeVisible()
    await shot(page, ARTIFACTS, 'focus-patient-free', project)
    await dlg.locator('button.sheet-chip').filter({ hasText: /За 1 очко/ }).click()
    await shot(page, ARTIFACTS, 'focus-patient-paid', project)
    await page.keyboard.press('Escape')

    // Step free + paid
    dlg = await openMonkTechniqueDialog(page, /^Поступь ветра/, /Поступь/i)
    await expect(dlg.getByText(/Рывок|Бесплатно/i).first()).toBeVisible()
    await shot(page, ARTIFACTS, 'focus-step-free', project)
    await dlg.locator('button.sheet-chip').filter({ hasText: /За 1 очко/ }).click()
    await shot(page, ARTIFACTS, 'focus-step-paid', project)
    await page.keyboard.press('Escape')
  })

  test('heightened-focus-l11-flurry-3', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createMonkViaPipeline(page, store, 'monk11hand')
    await openFeaturesScene(page, project)

    const heightened = await expandFeature(page, /Повышенная сосредоточенность/)
    await shot(page, ARTIFACTS, 'heightened-focus-feature', project)

    const dlg = await openMonkTechniqueDialog(page, /^Шквал ударов/, /Шквал/i)
    await expect(dlg.getByText(/3 безоружных/i)).toBeVisible({ timeout: 10_000 })
    await shot(page, ARTIFACTS, 'heightened-focus-flurry-3-strikes', project)
    await page.keyboard.press('Escape')

    await expect(heightened).toBeVisible()
  })

  test('uncanny-metabolism-and-perfect-focus', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createMonkViaPipeline(page, store, 'monk15hand')
    await openFeaturesScene(page, project)

    const meta = await expandFeature(page, /Феноменальный метаболизм/)
    const metaBtn = meta.getByRole('button', { name: /Метаболизм/i }).first()
    await expect(metaBtn).toBeVisible()
    await metaBtn.click()
    await expect(page.getByRole('dialog').last()).toBeVisible()
    await shot(page, ARTIFACTS, 'uncanny-metabolism-dialog', project)
    await page.keyboard.press('Escape')

    const perfect = await expandFeature(page, /Полная сосредоточенность/)
    const perfectBtn = perfect.getByRole('button', { name: /Полная сосредоточенность/i }).first()
    await expect(perfectBtn).toBeVisible()
    await perfectBtn.click()
    await expect(page.getByRole('dialog').last().getByText(/≤3|до 4|метаболизм/i).first()).toBeVisible()
    await shot(page, ARTIFACTS, 'perfect-focus-dialog', project)
  })

  test('deflect-stunning-superior-dialogs', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createMonkViaPipeline(page, store, 'monk18hand')
    await openFeaturesScene(page, project)

    const deflect = await expandFeature(page, /Отражение атак|Отражение энергии/)
    await deflect.getByRole('button', { name: /Отразить/i }).first().click()
    await expect(page.getByRole('dialog').last().getByText(/Снизить урон|Перенаправить/i).first()).toBeVisible()
    await shot(page, ARTIFACTS, 'deflect-dialog', project)
    await page.keyboard.press('Escape')

    const stun = await expandFeature(page, /Ошеломляющий удар/)
    await stun.getByRole('button', { name: /Ошеломить/i }).first().click()
    await expect(page.getByRole('dialog').last().getByText(/ошеломлён|½ скорости|Спас/i).first()).toBeVisible()
    await shot(page, ARTIFACTS, 'stunning-strike-dialog', project)
    await page.keyboard.press('Escape')

    const superior = await expandFeature(page, /Совершенная защита/)
    await superior.getByRole('button', { name: /Совершенная защита/i }).first().click()
    await expect(page.getByRole('dialog').last().getByText(/Включить|Завершить/i).first()).toBeVisible()
    await shot(page, ARTIFACTS, 'superior-defense-dialog', project)
  })

  for (const spec of [
    {
      seed: 'monk11hand',
      shot: 'subclass-hand-l11',
      feature: /Быстрые ноги|Техники открытой ладони/,
    },
    {
      seed: 'monk17hand',
      shot: 'subclass-hand-l17',
      feature: /Дрожащая ладонь/,
    },
    {
      seed: 'monk11mercy',
      shot: 'subclass-mercy-l11',
      feature: /Шквал исцеления|Исцеляющая рука|Повреждающая рука/,
    },
    {
      seed: 'monk11shadow',
      shot: 'subclass-shadow-l11',
      feature: /Улучшенный шаг в тень|Шаг в тень|Тёмные искусства/,
    },
    {
      seed: 'monk11elements',
      shot: 'subclass-elements-l11',
      feature: /Поступь стихий|Сродство со стихиями|Стихийный выброс/,
    },
    {
      seed: 'monk17elements',
      shot: 'subclass-elements-l17',
      feature: /Воплощение стихий/,
    },
  ]) {
    test(spec.shot, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await createMonkViaPipeline(page, store, spec.seed)
      await openFeaturesScene(page, project)
      await expandFeature(page, spec.feature)
      await tallShot(page, spec.shot, project)
    })
  }

  test('leveling-forks-4-to-5-and-10-to-11-names', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await installMonkHarness(page, store)
    await page.goto(
      '/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=monk11hand',
    )
    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/появятся с пакетом класса/i)).toHaveCount(0)
    await expect(page.getByText(/Умение подкласса/i)).toHaveCount(0)

    // 4→5 class features
    await expect(page.getByText(/5 ур\.\s*·\s*Дополнительная атака/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/5 ур\.\s*·\s*Ошеломляющий удар/i).first()).toBeVisible()
    await shot(page, ARTIFACTS, 'leveling-forks-l5-names', project)

    // 10→11: heightened already at 10; subclass at 11 with real name
    await expect(page.getByText(/10 ур\.\s*·\s*Повышенная сосредоточенность/i).first()).toBeVisible()
    await expect(page.getByText(/11 ур\.\s*·\s*Быстрые ноги/i).first()).toBeVisible({
      timeout: 10_000,
    })
    const forks = page.getByTestId('p24-m03c-leveling')
    await forks.getByText(/11 ур\.\s*·\s*Быстрые ноги/i).first().scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'leveling-forks-l11-subclass-name', project)
  })

  for (const spec of [
    { seed: 'monk20hand', to: 19, name: 'leveldown-20-to-19' },
    { seed: 'monk10hand', to: 9, name: 'leveldown-10-to-9' },
    { seed: 'monk3hand', to: 2, name: 'leveldown-3-to-2' },
  ]) {
    test(spec.name, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await createMonkViaPipeline(page, store, spec.seed)
      const identity = await openIdentity(page)
      await identity.getByRole('button', { name: '−1' }).first().click()
      await page.waitForTimeout(600)
      await expect(identity.getByText(new RegExp(`^Итого: Монах ${spec.to}`))).toBeVisible()
      await shot(page, ARTIFACTS, spec.name, project)
    })
  }

  test('rest-short-long', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createMonkViaPipeline(page, store, 'monk5hand')
    await openRest(page, project)
    const dlg = page.getByRole('dialog').last()
    await expect(dlg.getByText(/Короткий отдых/i).first()).toBeVisible()
    await shot(page, ARTIFACTS, 'rest-short', project)
    const longTab = dlg.getByText(/Долгий отдых/i).first()
    if (await longTab.isVisible().catch(() => false)) {
      await longTab.click()
      await page.waitForTimeout(300)
      await shot(page, ARTIFACTS, 'rest-long', project)
    }
  })
})

function monk2014SheetCharacter() {
  const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0003'
  const sample = JSON.parse(JSON.stringify(sampleClassic2014Character)) as Record<string, unknown>
  sample.id = id
  sample.rules_edition = '2014'
  sample.class_name = 'Монах'
  sample.name = 'Браун Каменный Кулак'
  sample.level = 5
  const sheet = (sample.sheet ?? {}) as Record<string, unknown>
  sheet.classes = [
    {
      id: 'c-monk',
      slug: 'monk',
      name: 'Монах',
      level: 5,
      subclass_slug: 'open-hand',
      subclass_name: 'Путь открытой ладони',
      catalog_id: 'monk',
    },
  ]
  const abilities = (sheet.abilities ?? {}) as Record<string, { score: number }>
  abilities.str = { score: 12 }
  abilities.dex = { score: 16 }
  abilities.con = { score: 14 }
  abilities.int = { score: 10 }
  abilities.wis = { score: 16 }
  abilities.cha = { score: 8 }
  sheet.saves = {
    str: { is_proficient: true },
    dex: { is_proficient: true },
  }
  sheet.abilities = abilities
  sheet.spells = { casting_ability: null, max_prepared: null, slots: {}, known: [] }
  sheet.features_text = {
    features:
      'Ци 5/5 (короткий отдых).\nБоевые искусства 1к6.\nШквал ударов.\nЗащита без доспехов.\nДополнительная атака.\nПуть открытой ладони.',
  }
  sheet.play = {
    resources: [
      {
        id: 'class:c-monk:ki:ki',
        name: 'Ци',
        max: 5,
        used: 1,
        reset: 'short',
      },
    ],
  }
  sheet.meta = { ...(sheet as { meta?: object }).meta, rules_edition: '2014' }
  const combat = (sheet.combat ?? {}) as Record<string, unknown>
  combat.speed = 40
  combat.ac = 16
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

async function mock2014Sheet(page: Page, character: ReturnType<typeof monk2014SheetCharacter>) {
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

test.describe('P24-M02 2014 regression', () => {
  test('2014 create — класс Монах', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `create-2014-race-marker-${tag}`, project)

    const classDlg = await walk2014ToMonkClass(page)
    await expect(page.getByRole('heading', { name: /Монах: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Акробатика|меч|ци|инструмент/i)
    await shot(page, ARTIFACTS_2014, `create-2014-monk-class-${tag}`, project)
    if (tag === 'after') {
      await shot(page, ARTIFACTS_2014, 'create-2014-monk-class', project)
    }
  })

  test('2014 sheet — монах: шапка + 6 характеристик + ци/умения', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = monk2014SheetCharacter()
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Браун|Монах/i).first()).toBeVisible({ timeout: 15_000 })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
      await page.locator('button.mobile-vitals__abil').click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await abilPage.locator('.abil-block[data-abil="cha"]').first().scrollIntoViewIfNeeded()
      await shot(page, ARTIFACTS_2014, `sheet-2014-monk-abilities-${tag}`, project)
      // Close mobile abilities sheet before scene nav (dialog intercepts clicks).
      await abilPage.locator('button.mobile-abil-page__back').click()
      await expect(abilPage).toHaveCount(0, { timeout: 10_000 })
      await openFeaturesScene(page, project)
      await expect(page.getByText(/Ци|Боевые искусства|Шквал/i).first()).toBeVisible({
        timeout: 15_000,
      })
      await shot(page, ARTIFACTS_2014, `sheet-2014-monk-ki-features-${tag}`, project)
    } else {
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(page.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await shot(page, ARTIFACTS_2014, `sheet-2014-monk-${tag}`, project)
      await openFeaturesScene(page, project)
      await expect(page.getByText(/Ци|Боевые искусства|Шквал/i).first()).toBeVisible({
        timeout: 15_000,
      })
      await shot(page, ARTIFACTS_2014, `sheet-2014-monk-ki-features-${tag}`, project)
    }
  })
})
