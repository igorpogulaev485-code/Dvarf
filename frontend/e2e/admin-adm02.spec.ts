import { expect, test } from '@playwright/test'

const ACCOUNT = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'player@example.com',
  email_verified: true,
  display_name: 'Игрок',
  created_at: '2026-01-01T12:00:00Z',
  last_seen_at: '2026-01-02T12:00:00Z',
  is_blocked: false,
  login_methods: { has_password: true, yandex: true, vk: false },
  characters: { total: 3, edition_2014: 2, edition_2024: 1, drafts: 1 },
  lobbies: { owned: 2, as_player: 1 },
}

async function mockAdminShell(page: import('@playwright/test').Page) {
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
  await page.route('**/admin/accounts/**/sessions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: '33333333-3333-3333-3333-333333333333',
            created_at: '2026-01-01T10:00:00Z',
            last_seen_at: '2026-01-02T11:00:00Z',
            user_agent: 'Mozilla/5.0 TestBrowser',
            ip_address: '203.0.113.10',
          },
        ],
      }),
    })
  })
  await page.route(`**/admin/accounts/${ACCOUNT.id}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(ACCOUNT),
    })
  })
  await page.route('**/admin/accounts**', async (route) => {
    const url = route.request().url()
    if (url.includes('/sessions') || /\/accounts\/[^/?]+$/.test(url.split('?')[0])) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [ACCOUNT],
        total: 1,
        page: 1,
        page_size: 20,
      }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'test-access')
    localStorage.setItem('dvarf.refresh_token', 'test-refresh')
  })
}

test.describe('ADM-02 help', () => {
  test('карточка помощи и диалоги блок/удаление/почта', async ({ page }) => {
    await mockAdminShell(page)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()

    await page.getByRole('button', { name: 'Подробнее' }).click()
    await page.getByRole('button', { name: 'Помощь' }).click()

    await expect(page.getByText('Не заблокирован')).toBeVisible()
    await expect(page.getByText(/Вход: пароль, Яндекс/)).toBeVisible()
    await expect(page.getByText(/Устройство: Mozilla\/5.0 TestBrowser/)).toBeVisible()

    await page.getByRole('button', { name: 'Сменить почту' }).click()
    const emailDialog = page.getByRole('dialog', { name: /Смена почты/i })
    await expect(emailDialog).toBeVisible()
    await expect(emailDialog.getByLabel('Пароль админки')).toHaveValue('')
    await emailDialog.getByRole('button', { name: 'Отмена' }).click()

    await page.getByRole('button', { name: 'Заблокировать' }).click()
    const blockDialog = page.getByRole('dialog', { name: /Заблокировать аккаунт/i })
    await expect(blockDialog).toBeVisible()
    await expect(blockDialog.getByText(/Вход будет закрыт/)).toBeVisible()
    await expect(blockDialog.getByLabel('Пароль админки')).toHaveValue('')
    await blockDialog.getByRole('button', { name: 'Отмена' }).click()

    await page.getByRole('button', { name: 'Удалить аккаунт' }).click()
    const deleteDialog = page.getByRole('dialog', { name: /Удалить аккаунт/i })
    await expect(deleteDialog).toBeVisible()
    await expect(deleteDialog.getByText(/Будут стерты персонажи человека \(3\)/)).toBeVisible()
    await expect(deleteDialog.getByText(/лобби, где он хозяин \(2\)/)).toBeVisible()
    await expect(deleteDialog.getByLabel('Пароль админки')).toHaveValue('')
    await expect(deleteDialog.getByLabel(/Введите почту удаляемого/)).toHaveValue('')
  })

  test('неадмин по-прежнему не входит', async ({ page }) => {
    await page.route('**/admin/status', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Нет доступа', code: 'forbidden' }),
      })
    })
    await page.addInitScript(() => {
      localStorage.setItem('dvarf.access_token', 'test-access')
      localStorage.setItem('dvarf.refresh_token', 'test-refresh')
    })
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Нет доступа' })).toBeVisible()
    await expect(page.getByText('Помощь')).toHaveCount(0)
  })
})
