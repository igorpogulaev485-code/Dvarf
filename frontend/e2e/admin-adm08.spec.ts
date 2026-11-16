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
      signups: i === 15 ? 3 : i === 29 ? 2 : 0,
      logins_unique: i === 29 ? 4 : 0,
      characters_created: i === 20 ? 5 : 0,
      lobbies_created: i === 10 ? 1 : 0,
      play_started: i === 12 ? 2 : 0,
    })
  }
  return days
}

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
  feedback_new: 0,
  daily: buildDaily(),
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

async function mockAdminShell(page: import('@playwright/test').Page) {
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
  name: 'Метрики' | 'Справочники' | 'Аккаунты',
  section: string,
) {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()
  const tab = page.getByRole('tab', { name })
  if (await tab.isVisible()) {
    await tab.click()
  } else {
    await page.locator('select[aria-label="Разделы админки"]').selectOption(section)
  }
  await expect(page).toHaveURL(new RegExp(`/admin/${section}`))
}

test('ADM-08: графики с данными — ненулевая высота столбцов и подсказка', async ({ page }) => {
  await mockAdminShell(page)
  await openSection(page, 'Метрики', 'metrics')
  await expect(page.getByText('По дням (30 дней)')).toBeVisible()
  await expect(page.getByText('Итого за 30 дней: 5').first()).toBeVisible()

  await page.locator('.ui-bar-chart').first().scrollIntoViewIfNeeded()
  const tallHeight = await page.locator('.ui-bar-chart__bar').evaluateAll((nodes) => {
    let max = 0
    for (const node of nodes) {
      const h = Number.parseFloat((node as HTMLElement).style.height || '0')
      if (h > max) max = h
    }
    return max
  })
  expect(tallHeight).toBeGreaterThan(0)

  const col = page.locator('.ui-bar-chart__col').filter({ hasText: '16.11' }).first()
  await col.scrollIntoViewIfNeeded()
  await col.click()
  await expect(page.getByText(/16\.11 — 3 регистрации/)).toBeVisible()
})

test('ADM-08: пагинатор — номера, переход, размер, адрес', async ({ page }) => {
  await mockAdminShell(page)
  await openSection(page, 'Справочники', 'catalog')
  await expect(page.getByText(/Страница 1 из 281 · всего 5618/)).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Страницы списка' })).toBeVisible()
  await expect(page.getByRole('button', { name: '‹ Назад' })).toBeDisabled()

  await page.getByRole('button', { name: '2', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText(/Страница 2 из 281/)).toBeVisible()

  await page.locator('#ui-pagination-jump').fill('10')
  await page.getByRole('button', { name: 'Перейти' }).click()
  await expect(page).toHaveURL(/page=10/)
  await expect(page.getByText(/Страница 10 из 281/)).toBeVisible()

  await page.locator('#ui-pagination-size').selectOption('50')
  await expect(page).toHaveURL(/page_size=50/)
  await expect(page).toHaveURL(/page=1/)
  await expect(page.getByText(/Страница 1 из 113 · всего 5618/)).toBeVisible()
})

test('ADM-08: пагинатор аккаунтов сохраняет место в адресе', async ({ page }) => {
  await mockAdminShell(page)
  await openSection(page, 'Аккаунты', 'accounts')
  await expect(page.getByText(/Страница 1 из 3 · всего 45/)).toBeVisible()
  await page.getByRole('button', { name: 'Вперёд ›' }).click()
  await expect(page).toHaveURL(/\/admin\/accounts\?.*page=2/)
  await page.reload()
  await expect(page.getByText(/Страница 2 из 3 · всего 45/)).toBeVisible()
  await expect(page.getByText('player21@example.com')).toBeVisible()
})
