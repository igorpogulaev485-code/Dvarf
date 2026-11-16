/**
 * P24-M03c: create-at-N UI forks + screenshots 1440/390.
 * Catalog mocked from e2e/fixtures/p24-m03c-catalog.json.
 * Leveling walk uses ?e2eLeveling=1 seed (internal preview only).
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
) as {
  classes: unknown[]
  subclasses: unknown[]
  backgrounds: unknown[]
  species: unknown[]
  feats: unknown[]
  spells: unknown[]
  weapons: unknown[]
  armor: unknown[]
  items: unknown[]
  languages: unknown
}

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  fs.mkdirSync(ARTIFACTS_2014, { recursive: true })
})

async function shot(page: Page, dir: string, name: string, project: string) {
  // Create shell scrolls inside a panel — fullPage misses inner overflow. Viewport after scroll.
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
    if (!isApi(url)) {
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
    if (!isApi(route.request().url())) {
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
    if (!isApi(reqUrl) || reqUrl.includes('/src/')) {
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
      class: CATALOG.classes,
      subclass: CATALOG.subclasses,
      background: CATALOG.backgrounds,
      race: CATALOG.species,
      feat: CATALOG.feats,
      weapon: CATALOG.weapons,
      spell: CATALOG.spells,
      armor: CATALOG.armor,
      item: CATALOG.items,
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(map[kind || ''] || []),
    })
  })

  await page.route('**/characters/create-2024/validate**', async (route) => {
    if (!isApi(route.request().url())) {
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
        class_name: 'Воин',
        race_name: 'Дварф',
        hp_max: 44,
        sheet: {
          combat: { hp_max: 44, proficiency_bonus: 3 },
          classes: [{ slug: 'fighter', level: 5 }],
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

test.describe('P24-M03c leveling UI', () => {
  test('Прокачка forks 1–5, multiclass blocked, back reset', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    await mockAuthAndCatalog(page)
    await page.goto('/characters/create?edition=2024&preview=1&e2eLeveling=1')

    await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('p24-m03c-fork-list-fighter')).toBeVisible()
    await page.getByTestId('p24-m03c-fork-list-fighter').scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'leveling-forks-1-5', project)

    await page.getByTestId('p24-m03c-mc-open').click()
    await expect(page.getByTestId('p24-m03c-mc-list')).toBeVisible()
    // Волшебник недоступен при низком Int (сиды e2e) — карточка с подсказкой.
    const wizardCard = page.getByTestId('p24-m03c-mc-wizard')
    await expect(wizardCard).toBeVisible()
    await expect(wizardCard).toBeDisabled()
    await wizardCard.scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'multiclass-blocked', project)

    const slots = page.getByTestId('p24-m03c-slots')
    await expect(slots).toBeVisible()
    await slots.scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, 'slots-panel', project)

    // «Назад» сбрасывает только прокачку → характеристики, затем снова прокачка с уровнем 1.
    const back = page.getByRole('button', { name: /Назад/i }).first()
    await back.click()
    await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
    await page.getByTestId('p24-m03-next').click()
    await expect(page.getByTestId('p24-m03c-level-fighter')).toHaveValue('1')
  })

  test('итоговый лист мультикласса + ячейки (мок API)', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    await page.route('**/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      })
    })
    await page.addInitScript(() => {
      localStorage.setItem('dvarf.access_token', 'access')
      localStorage.setItem('dvarf.refresh_token', 'refresh')
    })
    const sheet = {
      abilities: {
        str: { score: 17 },
        dex: { score: 13 },
        con: { score: 15 },
        int: { score: 14 },
        wis: { score: 10 },
        cha: { score: 8 },
      },
      combat: { hp_max: 44, hp_current: 44, ac: 16, proficiency_bonus: 3 },
      classes: [
        {
          id: 'c1',
          slug: 'fighter',
          name: 'Воин',
          level: 4,
          subclass_slug: 'fighter__champion',
          subclass_name: 'Чемпион',
        },
        { id: 'c2', slug: 'wizard', name: 'Волшебник', level: 1 },
      ],
      identity: { background: 'Солдат', species_slug: 'dwarf' },
      spells: { slots: { '1': { max: 2, used: 0 } }, known: [] },
      class_progress_2024: {
        total_level: 5,
        proficiency_bonus: 3,
        multiclass_slots: { '1': 2, '2': 0, '3': 0 },
        multiclass_pact: null,
        features: [],
        resources: [],
        spellcasting: [{ class_slug: 'wizard', cantrips: 3, prepared_spells: 4 }],
      },
      meta: { rules_edition: '2024' },
    }
    await page.route('**/characters/**', async (route) => {
      const url = route.request().url()
      if (route.request().method() === 'GET' && /\/characters\/[0-9a-f-]{36}/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Воин 4 / Волшебник 1',
            level: 5,
            class_name: 'Воин 4 / Волшебник 1',
            race_name: 'Дварф',
            hp_current: 44,
            hp_max: 44,
            rules_edition: '2024',
            sheet_version: 1,
            sheet,
            avatar_url: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }),
        })
        return
      }
      if (route.request().method() === 'GET' && url.endsWith('/characters')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.goto('/characters/11111111-1111-4111-8111-111111111111')
    await expect(page.getByText(/Воин|Волшебник|Дварф/i).first()).toBeVisible({
      timeout: 20_000,
    })
    await shot(page, ARTIFACTS, 'sheet-multiclass', project)
    await shot(page, ARTIFACTS, 'sheet-slots', project)
  })

  test('2014 create shell регресс', async ({ page }, testInfo) => {
    const project = testInfo.project.name.includes('390') ? '390' : '1440'
    await page.route('**/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      })
    })
    await page.addInitScript(() => {
      localStorage.setItem('dvarf.access_token', 'access')
      localStorage.setItem('dvarf.refresh_token', 'refresh')
    })
    await page.route('**/catalog**', async (route) => {
      const url = route.request().url()
      if (url.includes('/src/') || url.endsWith('.ts') || url.endsWith('.tsx')) {
        await route.continue()
        return
      }
      if (!new URL(url).pathname.startsWith('/catalog')) {
        await route.continue()
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.route('**/characters', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        return
      }
      await route.continue()
    })
    await page.route('**/auth/**', async (route) => {
      const url = route.request().url()
      if (url.includes('/src/')) {
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
    await page.goto('/characters/create')
    await expect(page.getByText(/Создание|Раса|Прокачка/i).first()).toBeVisible({
      timeout: 20_000,
    })
    await shot(page, ARTIFACTS_2014, 'create-2014-shell', project)
  })
})
