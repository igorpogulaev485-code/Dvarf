import { expect, test } from '@playwright/test'

const FEEDBACK_PAGE = {
  items: [
    {
      id: 'fb-1',
      topic: 'bug',
      topic_label: 'Ошибка',
      status: 'new',
      status_label: 'Новое',
      body: 'Тестовая ошибка на экране кабинета',
      is_anonymous: false,
      author: {
        id: 'user-1',
        email: 'player@example.com',
        display_name: 'Тест-игрок',
      },
      character_id: null,
      character_name: null,
      lobby_id: null,
      lobby_name: null,
      page_path: '/cabinet',
      admin_note: null,
      created_at: '2026-11-16T10:00:00+05:00',
      updated_at: '2026-11-16T10:00:00+05:00',
    },
    {
      id: 'fb-2',
      topic: 'idea',
      topic_label: 'Идея',
      status: 'in_progress',
      status_label: 'В работе',
      body: 'Анонимная идея без автора',
      is_anonymous: true,
      author: null,
      character_id: null,
      character_name: null,
      lobby_id: null,
      lobby_name: null,
      page_path: null,
      admin_note: 'Смотрим',
      created_at: '2026-11-15T09:00:00+05:00',
      updated_at: '2026-11-16T08:00:00+05:00',
    },
  ],
  total: 2,
  page: 1,
  page_size: 20,
  new_count: 1,
}

async function mockAdmin(page: import('@playwright/test').Page) {
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
  await page.route('**/admin/feedback**', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as { status?: string; admin_note?: string }
      const item = {
        ...FEEDBACK_PAGE.items[0],
        status: body.status || FEEDBACK_PAGE.items[0].status,
        status_label:
          body.status === 'closed'
            ? 'Закрыто'
            : body.status === 'in_progress'
              ? 'В работе'
              : 'Новое',
        admin_note: body.admin_note ?? FEEDBACK_PAGE.items[0].admin_note,
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(item),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FEEDBACK_PAGE),
    })
  })
  await page.route('**/admin/accounts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 20 }),
    })
  })
  await page.route('**/admin/metrics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        period_days: 7,
        timezone: 'Asia/Yekaterinburg',
        note: 'тест',
        accounts: {
          total: 1,
          email_verified: 1,
          new_in_period: 0,
          new_1d: 0,
          new_7d: 0,
          new_30d: 0,
          blocked: 0,
        },
        active: { active_1d: 0, active_7d: 0, active_30d: 0 },
        characters: { total_alive: 0, edition_2014: 0, edition_2024: 0, drafts: 0 },
        lobbies: { total: 0, new_in_period: 0 },
        sessions: { started_in_period: 0, closed_in_period: 0 },
        feedback_new: 1,
        daily: [],
      }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'test-access')
    localStorage.setItem('dvarf.refresh_token', 'test-refresh')
  })
}

async function mockCabinet(page: import('@playwright/test').Page) {
  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        email: 'player@example.com',
        display_name: 'Тест-игрок',
        login: null,
        full_name: null,
        phone: null,
        avatar_url: null,
        email_verified_at: '2026-11-01T00:00:00Z',
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-01T00:00:00Z',
        providers: ['password'],
        is_admin: false,
        theme_id: 'wis',
        ability_colors: 'identity',
      }),
    })
  })
  await page.route('**/characters', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'char-1',
          name: 'Тестовый герой',
          avatar_url: null,
          level: 3,
          class_name: 'Воин',
          race_name: 'Человек',
          hp_current: 20,
          hp_max: 20,
          rules_edition: '2014',
          sheet_version: 1,
          created_at: '2026-11-01T00:00:00Z',
          updated_at: '2026-11-01T00:00:00Z',
        },
      ]),
    })
  })
  await page.route('**/lobbies', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'lobby-1',
          name: 'Тестовое лобби',
          invite_code: 'ABC',
          is_owner: true,
          member_count: 1,
          created_at: '2026-11-01T00:00:00Z',
          updated_at: '2026-11-01T00:00:00Z',
        },
      ]),
    })
  })
  await page.route('**/feedback', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'fb-new', message: 'Сообщение принято' }),
      })
      return
    }
    await route.continue()
  })
  await page.route('**/auth/sessions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'test-access')
    localStorage.setItem('dvarf.refresh_token', 'test-refresh')
  })
}

test.describe('ADM-04 feedback', () => {
  test('кабинет: форма Написать нам отправляет сообщение', async ({ page }) => {
    await mockCabinet(page)
    await page.goto('/cabinet')
    await expect(page.getByRole('heading', { name: 'Написать нам' })).toBeVisible()
    await page.getByRole('tab', { name: 'Идея' }).click()
    const form = page.locator('.cabinet-layout__feedback')
    await form.getByPlaceholder(/Опишите коротко/).fill('Хочу кнопку быстрого броска')
    await form.getByRole('button', { name: 'Отправить', exact: true }).click()
    await expect(form.getByText('Сообщение ушло, спасибо!')).toBeVisible()
  })

  test('админка: очередь и карточка сообщения', async ({ page }) => {
    await mockAdmin(page)
    await page.goto('/admin')
    await page.getByRole('tab', { name: 'Обратная связь' }).click()
    await expect(page.getByText('Новых: 1')).toBeVisible()
    await expect(page.getByText('Тестовая ошибка на экране кабинета')).toBeVisible()
    await page.getByRole('button', { name: 'Открыть' }).first().click()
    await expect(page.getByText('Перейти к аккаунту')).toBeVisible()
    await expect(page.getByText('Екатеринбург (UTC+5)').first()).toBeVisible()
  })
})
