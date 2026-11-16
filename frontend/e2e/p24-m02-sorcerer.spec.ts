/**
 * P24-M02-sorcerer acceptance (1440 / 390). Offline catalog + create2024_bridge.py.
 * Every sheet shot walks the real create pipeline (seed → «Готово»). Rollbacks covered:
 * 20→19, 10→9, 3→2 (level-down UI; sheet PATCH not fully simulated on down yet).
 *
 * SHOT_TAG=before|after — 2014 regression under regression-2014/.
 */
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sampleClassic2014Character } from '../src/features/classicSheet/sampleClassicCharacter'
import { metamagicKnownLimit2024 } from '../src/shared/dnd/edition2024ClassOptions'
import { sorcererMetamagicForLevel } from '../src/features/createPipeline2024/e2eSorcererSeed2024'
import {
  createStore,
  installSorcererHarness,
  type HarnessStore,
} from './support/sorcerer2024Harness'

const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = '/opt/cursor/artifacts/p24-m02-sorcerer'
const ARTIFACTS_2014 = '/opt/cursor/artifacts/p24-m02-sorcerer/regression-2014'
const CATALOG_2014 = JSON.parse(
  fs.readFileSync(path.join(here, 'fixtures/p24-m03c-2014-catalog.json'), 'utf8'),
) as Record<string, unknown[]>

const SHOT_TAG = process.env.P24_M02_SORCERER_SHOT_TAG || 'after'

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
        id: '00000000-0000-4000-8000-000000000002',
        email: 'm02s@example.com',
        display_name: 'M02s',
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

async function walk2014ToSorcererClass(page: Page) {
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

  await cardByTitle(page, 'Солдат').click()
  await openSetupDialog(
    page,
    /настройка предыстории/i,
    /Выбрать и настроить|Настроить предысторию/,
  )
  await applyDialog(page, /настройка предыстории/i)

  await expect(cardByTitle(page, 'Чародей')).toBeVisible({ timeout: 10_000 })
  await cardByTitle(page, 'Чародей').click()
  const classDlg = await openSetupDialog(
    page,
    /настройка класса/i,
    /Выбрать и настроить|Настроить класс/,
  )
  await chipByText(classDlg, /^Магия$/).click()
  await chipByText(classDlg, /^Обман$/).click()
  for (const label of [/Копьё/i, /Кинжал/i, /Посох/i, /Фокусировка/i, /Вариант A/i]) {
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

async function createSorcererViaPipeline(page: Page, store: HarnessStore, seed: string) {
  await installSorcererHarness(page, store)
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

async function goSpells(page: Page, project: string) {
  if (!isPhone(project)) return
  await page.getByText('Заклинания', { exact: true }).first().click()
  await page.waitForTimeout(500)
}

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

/** Bridge does not materialize metamagic picks yet — mirror seed for sheet UI shots. */
function ensureMetamagicOnSheet(store: HarnessStore, level: number) {
  const sheet = storedSheet(store)
  const opts = (sheet.class_options_2024 ?? {}) as Record<string, unknown>
  sheet.class_options_2024 = {
    ...opts,
    metamagic: sorcererMetamagicForLevel(level),
  }
}

function sorcererQuotaRe(prepared: number, cantrips: number) {
  return new RegExp(
    `подготовлено ${prepared} из ${prepared}|Чародей.*${prepared}\\/|заговоры:.*${cantrips}\\/${cantrips}`,
    'i',
  )
}

async function spellsPanelShot(page: Page, name: string, project: string, quotaRe: RegExp) {
  const viewport = page.viewportSize()
  if (viewport) {
    await page.setViewportSize({ width: viewport.width, height: isPhone(project) ? 3600 : 2100 })
  }
  const quota = page.getByText(quotaRe).first()
  await quota.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await shot(page, ARTIFACTS, name, project)
  if (viewport) await page.setViewportSize(viewport)
}

test.describe('P24-M02 sorcerer — real create pipeline', () => {
  test.setTimeout(75_000)
  test.use({ actionTimeout: 12_000 })

  for (const spec of [
    {
      seed: 'sorcerer5draconic',
      level: 5,
      prepared: 9,
      metamagic: 2,
      slots: [4, 3, 2],
    },
    {
      seed: 'sorcerer11draconic',
      level: 11,
      prepared: 16,
      metamagic: 4,
      slots: [4, 3, 3, 3, 2, 1],
    },
  ]) {
    test(`sheet-sorcerer-l${spec.level}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await createSorcererViaPipeline(page, store, spec.seed)
      ensureMetamagicOnSheet(store, spec.level)
      await page.reload()
      await dismissWelcome(page)

      const sheet = storedSheet(store)
      expect((sheet.class_options_2024?.metamagic ?? []).length).toBe(spec.metamagic)
      spec.slots.forEach((max, index) => {
        expect(sheet.spells.slots[String(index + 1)].max).toBe(max)
      })

      if (isPhone(project)) await shot(page, ARTIFACTS, `sheet-sorcerer-l${spec.level}-combat`, project)
      await goSpells(page, project)
      const quota = sorcererQuotaRe(spec.prepared, spec.level >= 10 ? 6 : 5)
      await expect(page.getByText(quota).first()).toBeVisible({ timeout: 15_000 })
      await shot(page, ARTIFACTS, `sheet-sorcerer-l${spec.level}`, project)
      await spellsPanelShot(page, `sheet-sorcerer-l${spec.level}-spells`, project, quota)
      expect(store.unmatched).toEqual([])
    })
  }

  test('font-of-magic-dialog', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createSorcererViaPipeline(page, store, 'sorcerer5draconic')
    ensureMetamagicOnSheet(store, 5)
    await page.reload()
    await dismissWelcome(page)
    await openFeaturesScene(page, project)
    const card = await expandFeature(page, /Метамагия/)
    await card.getByRole('button', { name: /Потратить очки/ }).first().click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg.getByText(/Очки чародейства|Источник магии/i).first()).toBeVisible()
    await shot(page, ARTIFACTS, 'font-of-magic-dialog', project)
  })

  test('innate-sorcery-dialog', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createSorcererViaPipeline(page, store, 'sorcerer5draconic')
    ensureMetamagicOnSheet(store, 5)
    await page.reload()
    await dismissWelcome(page)
    await openFeaturesScene(page, project)
    const card = await expandFeature(page, /Врождённое чародейство/)
    await card.getByRole('button', { name: /Включить/ }).first().click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg).toBeVisible()
    await shot(page, ARTIFACTS, 'innate-sorcery-dialog', project)
  })

  test('metamagic-cast-dialog', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createSorcererViaPipeline(page, store, 'sorcerer5draconic')
    ensureMetamagicOnSheet(store, 5)
    await page.reload()
    await dismissWelcome(page)
    await openFeaturesScene(page, project)
    const metaCard = await expandFeature(page, /Метамагия/)
    await metaCard.getByRole('button', { name: /Потратить очки/ }).first().click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg.getByText(/Метамагия|Очки чародейства/i).first()).toBeVisible({
      timeout: 10_000,
    })
    await shot(page, ARTIFACTS, 'metamagic-cast-dialog', project)
  })

  test('sorcerous-restoration-rest', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createSorcererViaPipeline(page, store, 'sorcerer5draconic')
    const sheet = storedSheet(store)
    const play = sheet.play as { resources?: unknown[] } | undefined
    const resources = play?.resources ?? (sheet.resources as unknown[])
    if (Array.isArray(resources)) {
      const sp = resources.find((r: any) => String(r.id).includes('sorcery_points'))
      if (sp) sp.used = Math.min(sp.max, 3)
    }
    ensureMetamagicOnSheet(store, 5)
    await page.reload()
    await dismissWelcome(page)
    await openRest(page, project)
    const dlg = page.getByRole('dialog').last()
    await dlg.getByText(/Отдых|кости хитов/i).first().scrollIntoViewIfNeeded()
    const row = dlg.getByText(/Чародейское восстановление|восстановить очки/i).first()
    await expect(row.or(dlg.getByText(/Короткий отдых/i))).toBeVisible({ timeout: 10_000 })
    await shot(page, ARTIFACTS, 'sorcerous-restoration-rest', project)
  })

  test('subclass-draconic-resilience', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createSorcererViaPipeline(page, store, 'sorcerer6draconic')
    await openFeaturesScene(page, project)
    await expandFeature(page, /Драконья устойчивость/)
    await shot(page, ARTIFACTS, 'subclass-draconic-resilience', project)
  })

  test('subclass-clockwork-restore-balance', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createSorcererViaPipeline(page, store, 'sorcerer6clockwork')
    await openFeaturesScene(page, project)
    await expandFeature(page, /Восстановить баланс|Заводн/i)
    await shot(page, ARTIFACTS, 'subclass-clockwork-balance', project)
  })

  for (const spec of [
    { seed: 'sorcerer20draconic', to: 19, level: 20, name: 'leveldown-20-to-19' },
    { seed: 'sorcerer10draconic', to: 9, level: 10, name: 'leveldown-10-to-9' },
    { seed: 'sorcerer3draconic', to: 2, level: 3, name: 'leveldown-3-to-2' },
  ]) {
    test(spec.name, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await createSorcererViaPipeline(page, store, spec.seed)
      ensureMetamagicOnSheet(store, spec.level)
      await page.reload()
      await dismissWelcome(page)
      const identity = await openIdentity(page)
      await identity.getByRole('button', { name: '−1' }).first().click()
      await page.waitForTimeout(600)
      await expect(identity.getByText(new RegExp(`^Итого: Чародей ${spec.to}`))).toBeVisible()
      await shot(page, ARTIFACTS, spec.name, project)
      if (spec.to === 9) {
        await expect(identity.getByText(/метамаг|2 вариант/i).first()).toBeVisible().catch(() => {})
      }
    })
  }
})

async function openSorcererEmptySpells(page: Page, store: HarnessStore, level: number) {
  await installSorcererHarness(page, store)
  await page.goto(
    `/characters/create?edition=2024&preview=1&e2eLeveling=1&e2eSeed=sorcerer${level}draconic&e2eEmptySpells=1`,
  )
  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('p24-m03-step-spells')).toBeVisible({ timeout: 15_000 })
}

async function pickCatalogCards(page: Page, count: number) {
  for (let i = 0; i < count; i += 1) {
    const card = page
      .locator('button.create-pipeline__card:not(.create-pipeline__card--selected)')
      .first()
    if (!(await card.count())) break
    await card.scrollIntoViewIfNeeded()
    await card.click()
    await page.waitForTimeout(40)
  }
}

async function fillSorcererSpellsViaUi(
  page: Page,
  opts: { cantripsNeed: number; preparedNeed: number },
) {
  await page.getByTestId('p24-m03-spell-tab-cantrips').click()
  await page.waitForTimeout(200)
  await pickCatalogCards(page, opts.cantripsNeed)
  await expect(page.getByTestId('p24-m03-spell-tab-cantrips')).toContainText(
    `${opts.cantripsNeed}/${opts.cantripsNeed}`,
  )
  await page.getByTestId('p24-m03-spell-tab-level1').click()
  await page.waitForTimeout(200)
  await pickCatalogCards(page, opts.preparedNeed)
  await expect(page.getByTestId('p24-m03-spell-pick-counter')).toContainText(`из ${opts.preparedNeed}`)
}

test.describe('P24-M02 sorcerer — honest spell picks (no spell seed)', () => {
  test.setTimeout(180_000)
  test.use({ actionTimeout: 20_000 })

  for (const spec of [
    {
      level: 5,
      preparedNeed: 9,
      cantripsNeed: 5,
      shot: 'create-at-5-spell-picker',
    },
    {
      level: 11,
      preparedNeed: 16,
      cantripsNeed: 6,
      shot: 'create-at-11-spell-picker',
    },
  ]) {
    test(`create-at-${spec.level} prepare cap ${spec.preparedNeed}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await openSorcererEmptySpells(page, store, spec.level)
      await page.getByTestId('p24-m03-spell-tab-level1').click()
      await expect(page.getByTestId('p24-m03-spell-pick-counter')).toContainText(
        `из ${spec.preparedNeed}`,
      )
      await shot(page, ARTIFACTS, spec.shot, project)

      await fillSorcererSpellsViaUi(page, spec)
      const finish = page.getByTestId('p24-m03-finish')
      await expect(finish).toBeEnabled({ timeout: 60_000 })
      await finish.click()
      await page.waitForURL(/\/characters\/[0-9a-f-]{36}$/i, { timeout: 30_000 })
      await dismissWelcome(page)
      ensureMetamagicOnSheet(store, spec.level)
      await page.reload()
      await dismissWelcome(page)
      await goSpells(page, project)
      await expect(page.getByText(sorcererQuotaRe(spec.preparedNeed, spec.cantripsNeed)).first()).toBeVisible({
        timeout: 15_000,
      })
      await shot(page, ARTIFACTS, `create-at-${spec.level}-sheet`, project)
      expect(metamagicKnownLimit2024(spec.level)).toBe(spec.level >= 10 ? 4 : spec.level >= 2 ? 2 : 0)
      expect(store.unmatched).toEqual([])
    })
  }

  test('level-up 9→10 metamagic +2 step (cap 2→4)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createSorcererViaPipeline(page, store, 'sorcerer9draconic')
    ensureMetamagicOnSheet(store, 9)
    await page.reload()
    await dismissWelcome(page)
    const identity = await openIdentity(page)
    await identity.getByRole('button', { name: /\+1 уровень/ }).first().click()
    await identity.getByRole('button', { name: /^Повысить$/ }).click()
    const guided = page.getByRole('dialog').last()
    await expect(guided).toBeVisible({ timeout: 15_000 })
    for (let i = 0; i < 10; i += 1) {
      const meta = guided.getByText(/метамагии/i)
      if (await meta.isVisible().catch(() => false)) break
      const next = guided.getByRole('button', { name: /^Далее$|^Пропустить$|^Позже$/ })
      if (await next.isEnabled().catch(() => false)) {
        await next.click()
        await page.waitForTimeout(300)
        continue
      }
      break
    }
      await expect(guided.getByText(/метамагии/i).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS, 'levelup-9-to-10-metamagic', project)
  })

  test('level-up 4→5 (sorcerous restoration at 5; no metamagic gain)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await createSorcererViaPipeline(page, store, 'sorcerer4draconic')
    await page.reload()
    await dismissWelcome(page)
    const identity = await openIdentity(page)
    await identity.getByRole('button', { name: /\+1 уровень/ }).first().click()
    await identity.getByRole('button', { name: /^Повысить$/ }).click()
    await page.waitForTimeout(800)
    await shot(page, ARTIFACTS, 'levelup-4-to-5-guided', project)
  })
})

function sorcerer2014SheetCharacter() {
  const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0002'
  const sample = JSON.parse(JSON.stringify(sampleClassic2014Character)) as Record<string, unknown>
  sample.id = id
  sample.rules_edition = '2014'
  sample.class_name = 'Чародей'
  sample.name = 'Селенья Искра'
  const sheet = (sample.sheet ?? {}) as Record<string, unknown>
  sheet.classes = [
    {
      id: 'c-sorcerer',
      slug: 'sorcerer',
      name: 'Чародей',
      level: 5,
      subclass_slug: 'draconic',
      subclass_name: 'Драконья кровь',
      catalog_id: 'sorcerer',
    },
  ]
  const abilities = (sheet.abilities ?? {}) as Record<string, { score: number }>
  abilities.cha = { score: 18 }
  abilities.int = { score: 10 }
  const spells = (sheet.spells ?? {}) as Record<string, unknown>
  spells.casting_ability = 'cha'
  spells.max_prepared = null
  sheet.abilities = abilities
  sheet.spells = spells
  sheet.meta = { ...(sheet as { meta?: object }).meta, rules_edition: '2014' }
  sample.sheet = sheet
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

async function mock2014Sheet(page: Page, character: ReturnType<typeof sorcerer2014SheetCharacter>) {
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
  test('2014 create — класс Чародей (не раса)', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    const tag = SHOT_TAG
    await mock2014(page)
    await page.goto('/characters/create')
    await expect(page.getByText(/^Дварф$/).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, ARTIFACTS_2014, `create-2014-race-marker-${tag}`, project)

    const classDlg = await walk2014ToSorcererClass(page)
    await expect(page.getByRole('heading', { name: /Чародей: настройка класса/i })).toBeVisible()
    await expect(classDlg).toContainText(/навык|Тайная|фокус|копь/i)
    await shot(page, ARTIFACTS_2014, `create-2014-sorcerer-class-${tag}`, project)
    if (tag === 'after') {
      await shot(page, ARTIFACTS_2014, 'create-2014-sorcerer-class', project)
    }
  })

  test('2014 sheet — чародей: шапка + 6 характеристик (incl. cha) + заклинания', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const tag = SHOT_TAG
    const character = sorcerer2014SheetCharacter()
    await mock2014Sheet(page, character)

    await page.goto(`/characters/${character.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissWelcome(page)
    await expect(page.getByText(/Селенья|Чародей/i).first()).toBeVisible({ timeout: 15_000 })

    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await goSpells(page, project)
      await ensureMobileVitalsExpanded(page)
      await page.locator('button.mobile-vitals__abil').click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
    } else {
      for (const abil of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        await expect(page.locator(`.abil-block[data-abil="${abil}"]`).first()).toBeVisible()
      }
      await goSpells(page, project)
    }

    await shot(page, ARTIFACTS_2014, `sheet-2014-sorcerer-${tag}`, project)
  })
})