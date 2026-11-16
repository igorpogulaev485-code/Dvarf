import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.ADM_SHOT_DIR || '/opt/cursor/artifacts/adm01'

async function mockAdmin(page: Page, opts?: { passwordSet?: boolean }) {
  await page.route('**/admin/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        panel_enabled: true,
        is_full_admin: true,
        admin_password_set: Boolean(opts?.passwordSet),
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
            login_methods: { has_password: true, yandex: true, vk: false },
            characters: { total: 3, edition_2014: 2, edition_2024: 1, drafts: 1 },
            lobbies: { owned: 1, as_player: 2 },
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
}

async function mockMe(page: Page, isAdmin: boolean) {
  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '22222222-2222-2222-2222-222222222222',
        email: isAdmin ? 'admin@example.com' : 'player@example.com',
        login: null,
        display_name: isAdmin ? 'Админ' : 'Игрок',
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
        is_admin: isAdmin,
      }),
    })
  })
  await page.route('**/auth/sessions', async (route) => {
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

test.describe('ADM-01 screenshots', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const [name, size] of [
    ['1440x900', { width: 1440, height: 900 }],
    ['1024x768', { width: 1024, height: 768 }],
    ['390x844', { width: 390, height: 844 }],
  ] as const) {
    test(`accounts ${name}`, async ({ page }) => {
      await page.setViewportSize(size)
      await mockAdmin(page, { passwordSet: true })
      await page.goto('/admin')
      await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()
      await page.screenshot({
        path: join(OUT, `admin-accounts-${name}.png`),
        fullPage: true,
      })
    })
  }

  test('accounts expanded search 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await mockAdmin(page, { passwordSet: true })
    await page.goto('/admin')
    await page.getByPlaceholder('Почта, имя или идентификатор').fill('player')
    await page.getByRole('button', { name: 'Подробнее' }).click()
    await expect(page.getByText('Идентификатор:')).toBeVisible()
    await page.screenshot({
      path: join(OUT, 'admin-accounts-expanded-1440x900.png'),
      fullPage: true,
    })
  })

  test('password setup dialog 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await mockAdmin(page, { passwordSet: false })
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Задать пароль админки' }).click()
    await expect(page.getByRole('dialog', { name: /Задать пароль админки/i })).toBeVisible()
    await page.screenshot({
      path: join(OUT, 'admin-password-setup-dialog-1440x900.png'),
      fullPage: true,
    })
  })

  test('cabinet admin link', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await mockMe(page, true)
    await page.goto('/cabinet')
    await expect(page.getByRole('link', { name: 'Админка' })).toBeVisible()
    await page.screenshot({
      path: join(OUT, 'cabinet-admin-link-1440x900.png'),
      fullPage: true,
    })
  })

  test('cabinet player no link', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await mockMe(page, false)
    await page.goto('/cabinet')
    await expect(page.getByRole('link', { name: 'Админка' })).toHaveCount(0)
    await page.screenshot({
      path: join(OUT, 'cabinet-player-no-admin-1440x900.png'),
      fullPage: true,
    })
  })

  test('forbidden', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
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
    await page.screenshot({
      path: join(OUT, 'admin-forbidden-1440x900.png'),
      fullPage: true,
    })
  })

  test('flag off redirect', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
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
    await page.screenshot({
      path: join(OUT, 'admin-flag-off-1440x900.png'),
      fullPage: true,
    })
  })
})
