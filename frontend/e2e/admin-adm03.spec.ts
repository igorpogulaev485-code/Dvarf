import { expect, test } from '@playwright/test'

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
      signups: i === 29 ? 2 : 0,
      logins_unique: i === 29 ? 3 : 0,
      characters_created: i === 29 ? 1 : 0,
      lobbies_created: i === 29 ? 1 : 0,
      play_started: i === 29 ? 1 : 0,
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

test.describe('ADM-03 metrics', () => {
  test('раздел Метрики: плитки, период, столбцы', async ({ page }) => {
    await mockMetrics(page)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()

    await page.getByRole('tab', { name: 'Метрики' }).click()
    await expect(page.getByRole('heading', { name: 'Аккаунты', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Живые', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Персонажи', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Лобби и партии', exact: true })).toBeVisible()
    await expect(page.getByText('12').first()).toBeVisible()
    await expect(page.getByText('Почта подтверждена')).toBeVisible()
    await expect(page.getByText(/дневные ряды/i)).toBeVisible()
    await expect(page.getByText('Екатеринбург (UTC+5)')).toBeVisible()
    await expect(page.getByText('Asia/Yekaterinburg')).toHaveCount(0)
    await expect(page.getByText('Регистрации')).toBeVisible()
    await expect(page.getByText('Входы (уникальные люди)')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Обновить' })).toBeVisible()

    await page.getByRole('tab', { name: '1 день' }).click()
    await expect(page.getByText('Новых за 1 день', { exact: true })).toBeVisible()
  })
})
