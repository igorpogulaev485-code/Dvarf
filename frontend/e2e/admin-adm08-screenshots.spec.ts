import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildLast30DailyDense, formatDayLabel } from './adminMetricsDaily'

const OUT = process.env.ADM_SHOT_DIR || '/opt/cursor/artifacts/adm-08'

const DAILY = buildLast30DailyDense()
const TODAY_LABEL = formatDayLabel(DAILY[DAILY.length - 1].date)

const METRICS = {
  period_days: 7,
  timezone: 'Asia/Yekaterinburg',
  note: 'Итоговые числа и дневные ряды — из таблиц.',
  accounts: {
    total: 12,
    email_verified: 10,
    new_in_period: 2,
    new_1d: 1,
    new_7d: 2,
    new_30d: 5,
    blocked: 1,
  },
  active: { active_1d: 4, active_7d: 8, active_30d: 11 },
  characters: {
    total_alive: 20,
    edition_2014: 18,
    edition_2024: 2,
    drafts: 3,
  },
  lobbies: { total: 6, new_in_period: 1 },
  sessions: { started_in_period: 2, closed_in_period: 1 },
  feedback_new: 1,
  daily: DAILY,
}

function catalogPage(page: number, pageSize: number, total = 5618) {
  const start = (page - 1) * pageSize
  const items = Array.from({ length: Math.min(pageSize, Math.max(0, total - start)) }, (_, i) => {
    const n = start + i + 1
    return {
      id: `cat-${n}`,
      kind: 'spell',
      kind_label: 'Заклинание',
      slug: `spell-${n}`,
      name_ru_live: `Заклинание ${n}`,
      name_en_live: `Spell ${n}`,
      name_ru_seed: `Заклинание ${n}`,
      name_en_seed: `Spell ${n}`,
      names_differ: false,
      rules_edition: '2014',
      source: 'srd-5.1',
      content_layer: 'srd',
      content_layer_label: 'Базовые правила',
      has_pending: false,
      pending_name_ru: null,
      is_active: true,
      updated_at: '2026-11-16T10:00:00+05:00',
    }
  })
  return { items, total, page, page_size: pageSize }
}

function isDocument(route: import('@playwright/test').Route): boolean {
  return route.request().resourceType() === 'document'
}

async function mockAll(page: import('@playwright/test').Page) {
  await page.route('**/admin/status', async (route) => {
    if (isDocument(route)) {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        panel_enabled: true,
        is_full_admin: true,
        admin_password_set: true,
        display_name: 'Тест-админ',
        sections: ['accounts', 'help', 'metrics', 'feedback', 'catalog'],
      }),
    })
  })
  await page.route('**/admin/metrics**', async (route) => {
    if (isDocument(route)) {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(METRICS),
    })
  })
  await page.route('**/admin/accounts**', async (route) => {
    if (isDocument(route)) {
      await route.continue()
      return
    }
    const url = new URL(route.request().url())
    const pageNum = Number(url.searchParams.get('page') || '1')
    const pageSize = Number(url.searchParams.get('page_size') || '20')
    const total = 45
    const start = (pageNum - 1) * pageSize
    const items = Array.from({ length: Math.min(pageSize, Math.max(0, total - start)) }, (_, i) => {
      const n = start + i + 1
      return {
        id: `user-${n}`,
        email: `player${n}@example.com`,
        display_name: `Игрок ${n}`,
        email_verified: true,
        is_blocked: false,
        created_at: '2026-11-01T10:00:00+05:00',
        last_seen_at: '2026-11-16T10:00:00+05:00',
        login_methods: { has_password: true, yandex: false, vk: false },
        characters: { total: 1, edition_2014: 1, edition_2024: 0, drafts: 0 },
        lobbies: { owned: 0, as_player: 0 },
        roles: [],
      }
    })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items, total, page: pageNum, page_size: pageSize }),
    })
  })
  await page.route('**/admin/catalog/name-feedback**', async (route) => {
    if (isDocument(route)) {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0 }),
    })
  })
  await page.route('**/admin/catalog**', async (route) => {
    if (isDocument(route)) {
      await route.continue()
      return
    }
    const url = new URL(route.request().url())
    const pageNum = Number(url.searchParams.get('page') || '1')
    const pageSize = Number(url.searchParams.get('page_size') || '20')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(catalogPage(pageNum, pageSize)),
    })
  })
  await page.route('**/admin/feedback**', async (route) => {
    if (isDocument(route)) {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 20, new_count: 0 }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'test-access')
    localStorage.setItem('dvarf.refresh_token', 'test-refresh')
  })
}

async function openSection(
  page: import('@playwright/test').Page,
  label: string,
  section: string,
) {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()
  const tab = page.getByRole('tab', { name: label })
  const select = page.locator('select[aria-label="Разделы админки"]')
  if (await tab.count()) {
    await tab.first().click()
  } else {
    await select.selectOption(section)
  }
  await expect(page).toHaveURL(new RegExp(`/admin/${section}`))
  await page.waitForTimeout(280)
}

test('ADM-08 screenshots', async ({ page }) => {
  test.setTimeout(120_000)
  mkdirSync(OUT, { recursive: true })
  await mockAll(page)

  await page.setViewportSize({ width: 1440, height: 900 })
  await openSection(page, 'Метрики', 'metrics')
  const chart = page.locator('.ui-bar-chart').first()
  await chart.scrollIntoViewIfNeeded()
  await chart.locator('.ui-bar-chart__col').last().click()
  await expect(
    page.getByText(new RegExp(`${TODAY_LABEL.replace('.', '\\.')} — 3 регистрации`)),
  ).toBeVisible()
  await page.screenshot({
    path: join(OUT, 'a1440-metrics-charts.png'),
    fullPage: false,
  })

  await openSection(page, 'Справочники', 'catalog')
  await page.locator('.ui-pagination').scrollIntoViewIfNeeded()
  await page.screenshot({
    path: join(OUT, 'a1440-catalog-pagination.png'),
    fullPage: false,
  })

  await openSection(page, 'Аккаунты', 'accounts')
  await page.locator('.ui-pagination').scrollIntoViewIfNeeded()
  await page.screenshot({
    path: join(OUT, 'a1440-accounts-pagination.png'),
    fullPage: false,
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await openSection(page, 'Справочники', 'catalog')
  await page.locator('.ui-pagination').scrollIntoViewIfNeeded()
  await page.screenshot({
    path: join(OUT, 'a390-catalog-pagination.png'),
    fullPage: false,
  })

  await openSection(page, 'Метрики', 'metrics')
  await page.locator('.ui-bar-chart').first().scrollIntoViewIfNeeded()
  await page.screenshot({
    path: join(OUT, 'a390-metrics-charts.png'),
    fullPage: false,
  })
})
