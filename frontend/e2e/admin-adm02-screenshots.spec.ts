import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.ADM_SHOT_DIR || '/opt/cursor/artifacts/adm02'

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

async function mockHelp(page: Page) {
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

async function openHelpCard(page: Page) {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()
  await page.getByRole('button', { name: 'Подробнее' }).click()
  await page.getByRole('button', { name: 'Помощь' }).click()
  await expect(page.getByText('Не заблокирован')).toBeVisible()
}

test.describe('ADM-02 screenshots', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const [name, size] of [
    ['1440x900', { width: 1440, height: 900 }],
    ['1024x768', { width: 1024, height: 768 }],
    ['390x844', { width: 390, height: 844 }],
  ] as const) {
    test(`help card ${name}`, async ({ page }) => {
      await page.setViewportSize(size)
      await mockHelp(page)
      await openHelpCard(page)
      await page.screenshot({
        path: join(OUT, `admin-help-card-${name}.png`),
        fullPage: true,
      })
    })

    test(`email dialog ${name}`, async ({ page }) => {
      await page.setViewportSize(size)
      await mockHelp(page)
      await openHelpCard(page)
      await page.getByRole('button', { name: 'Сменить почту' }).click()
      const dialog = page.getByRole('dialog', { name: /Смена почты/i })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByLabel('Пароль админки')).toHaveValue('')
      await page.screenshot({
        path: join(OUT, `admin-help-email-${name}.png`),
        fullPage: true,
      })
    })

    test(`block dialog ${name}`, async ({ page }) => {
      await page.setViewportSize(size)
      await mockHelp(page)
      await openHelpCard(page)
      await page.getByRole('button', { name: 'Заблокировать' }).click()
      await expect(page.getByRole('dialog', { name: /Заблокировать аккаунт/i })).toBeVisible()
      await page.screenshot({
        path: join(OUT, `admin-help-block-${name}.png`),
        fullPage: true,
      })
    })

    test(`delete dialog ${name}`, async ({ page }) => {
      await page.setViewportSize(size)
      await mockHelp(page)
      await openHelpCard(page)
      await page.getByRole('button', { name: 'Удалить аккаунт' }).click()
      const dialog = page.getByRole('dialog', { name: /Удалить аккаунт/i })
      await expect(dialog.getByText(/персонажи человека \(3\)/)).toBeVisible()
      await expect(dialog.getByLabel('Пароль админки')).toHaveValue('')
      await page.screenshot({
        path: join(OUT, `admin-help-delete-${name}.png`),
        fullPage: true,
      })
    })
  }
})
