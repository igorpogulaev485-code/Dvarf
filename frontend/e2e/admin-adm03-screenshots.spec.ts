import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.ADM_SHOT_DIR || '/opt/cursor/artifacts/adm03'

function buildDaily() {
  const days: Array<{
    date: string
    signups: number
    logins_unique: number
    characters_created: number
    lobbies_created: number
    play_started: number
  }> = []
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(Date.UTC(2026, 10, 1 + i))
    const iso = d.toISOString().slice(0, 10)
    days.push({
      date: iso,
      signups: i % 5 === 0 ? 2 : 0,
      logins_unique: i % 3 === 0 ? 4 : 1,
      characters_created: i % 4 === 0 ? 3 : 0,
      lobbies_created: i % 7 === 0 ? 1 : 0,
      play_started: i % 6 === 0 ? 2 : 0,
    })
  }
  return days
}

const METRICS = {
  period_days: 7,
  timezone: 'Asia/Yekaterinburg',
  note: 'Итоговые числа — из таблиц. Дневные ряды — из журнала событий и начинаются со дня выкладки (раньше данных нет).',
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
  daily: buildDaily(),
}

async function mockMetrics(page: import('@playwright/test').Page) {
  await page.route('**/admin/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        panel_enabled: true,
        is_full_admin: true,
        admin_password_set: true,
        display_name: 'Тест-админ',
      }),
    })
  })
  await page.route('**/admin/metrics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(METRICS),
    })
  })
  await page.route('**/admin/accounts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 20 }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'test-access')
    localStorage.setItem('dvarf.refresh_token', 'test-refresh')
  })
}

async function openMetrics(page: import('@playwright/test').Page) {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()
  const metricsTab = page.getByRole('tab', { name: 'Метрики' })
  if (await metricsTab.isVisible()) {
    await metricsTab.click()
  } else {
    await page.locator('select[aria-label="Разделы админки"]').selectOption('metrics')
  }
  await expect(page.getByRole('heading', { name: 'Аккаунты', exact: true })).toBeVisible()
  // Короткий запас после отрисовки столбцов.
  await page.waitForTimeout(280)
}

test.describe('ADM-03 screenshots', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const [name, size] of [
    ['1440x900', { width: 1440, height: 900 }],
    ['1024x768', { width: 1024, height: 768 }],
    ['390x844', { width: 390, height: 844 }],
  ] as const) {
    test(`metrics tiles ${name}`, async ({ page }) => {
      await page.setViewportSize(size)
      await mockMetrics(page)
      await openMetrics(page)
      await page.screenshot({
        path: join(OUT, `admin-metrics-${name}.png`),
      })
    })

    test(`metrics charts ${name}`, async ({ page }) => {
      await page.setViewportSize(size)
      await mockMetrics(page)
      await openMetrics(page)
      await page.getByText('По дням (30 дней)').scrollIntoViewIfNeeded()
      await expect(page.getByText('Регистрации')).toBeVisible()
      await page.waitForTimeout(200)
      await page.screenshot({
        path: join(OUT, `admin-metrics-charts-${name}.png`),
      })
    })
  }
})
