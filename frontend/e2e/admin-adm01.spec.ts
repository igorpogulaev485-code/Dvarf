import { expect, test } from '@playwright/test'

/**
 * ADM-01 e2e (без реальных адресов прода).
 * Флаг выкл / нет прав — страница уходит с /admin.
 * Полный админ при флаге вкл — мок API: список аккаунтов и ссылка в кабинете.
 */

test.describe('ADM-01 admin shell', () => {
  test('неадмин: /admin без прав → нет доступа', async ({ page }) => {
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
    await expect(page.getByText('Аккаунты')).toHaveCount(0)
  })

  test('флаг выкл: /admin → уход с раздела', async ({ page }) => {
    await page.route('**/admin/status', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Не найдено', code: 'not_found' }),
      })
    })
    await page.addInitScript(() => {
      localStorage.setItem('dvarf.access_token', 'test-access')
      localStorage.setItem('dvarf.refresh_token', 'test-refresh')
    })
    await page.goto('/admin')
    await expect(page).not.toHaveURL(/\/admin$/)
  })

  test('полный админ: список аккаунтов и диалог пароля', async ({ page }) => {
    await page.route('**/admin/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          panel_enabled: true,
          is_full_admin: true,
          admin_password_set: false,
          display_name: 'Тест-админ',
        }),
      })
    })
    await page.route('**/admin/accounts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              email: 'player@example.com',
              email_verified: true,
              display_name: 'Игрок',
              created_at: '2026-01-01T12:00:00Z',
              last_seen_at: '2026-01-02T12:00:00Z',
              login_methods: { has_password: true, yandex: false, vk: false },
              characters: {
                total: 2,
                edition_2014: 2,
                edition_2024: 0,
                drafts: 1,
              },
              lobbies: { owned: 1, as_player: 0 },
            },
          ],
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
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()
    await expect(page.getByText('Игрок').first()).toBeVisible()
    await expect(page.getByText(/Персонажи: всего 2/)).toBeVisible()
    await page.getByRole('button', { name: 'Задать пароль админки' }).click()
    await expect(page.getByRole('dialog', { name: /Задать пароль админки/i })).toBeVisible()
    // Не вводим секрет на кадре — поля пустые.
    await expect(page.getByLabel('Новый пароль админки')).toHaveValue('')
  })

  test('кабинет: ссылка Админка только при is_admin', async ({ page }) => {
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '11111111-1111-1111-1111-111111111111',
          email: 'player@example.com',
          login: null,
          display_name: 'Игрок',
          full_name: null,
          phone: null,
          avatar_url: null,
          theme_id: 'wis',
          ability_colors: 'identity',
          onboarding: null,
          email_verified_at: '2026-01-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          providers: ['password'],
          is_admin: false,
        }),
      })
    })
    await page.addInitScript(() => {
      localStorage.setItem('dvarf.access_token', 'test-access')
      localStorage.setItem('dvarf.refresh_token', 'test-refresh')
    })
    await page.goto('/cabinet')
    await expect(page.getByRole('heading', { name: 'Личный кабинет' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Админка' })).toHaveCount(0)
  })

  test('кабинет админа: ссылка Админка видна', async ({ page }) => {
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '22222222-2222-2222-2222-222222222222',
          email: 'admin@example.com',
          login: null,
          display_name: 'Админ',
          full_name: null,
          phone: null,
          avatar_url: null,
          theme_id: 'wis',
          ability_colors: 'identity',
          onboarding: null,
          email_verified_at: '2026-01-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          providers: ['password'],
          is_admin: true,
        }),
      })
    })
    await page.addInitScript(() => {
      localStorage.setItem('dvarf.access_token', 'test-access')
      localStorage.setItem('dvarf.refresh_token', 'test-refresh')
    })
    await page.goto('/cabinet')
    await expect(page.getByRole('link', { name: 'Админка' })).toBeVisible()
  })
})
