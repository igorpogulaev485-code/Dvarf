import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.ADM_SHOT_DIR || '/opt/cursor/artifacts/adm04'

const FEEDBACK_PAGE = {
  items: [
    {
      id: 'fb-1',
      topic: 'bug',
      topic_label: 'Ошибка',
      status: 'new',
      status_label: 'Новое',
      body: 'Пример: не открывается инвентарь после боя',
      is_anonymous: false,
      author: {
        id: 'user-1',
        email: 'hero@example.com',
        display_name: 'Алёна',
      },
      character_id: 'char-1',
      character_name: 'Мира',
      lobby_id: 'lobby-1',
      lobby_name: 'Вечерний стол',
      page_path: '/cabinet',
      admin_note: '',
      created_at: '2026-11-16T12:30:00+05:00',
      updated_at: '2026-11-16T12:30:00+05:00',
    },
  ],
  total: 1,
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
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'test-access')
    localStorage.setItem('dvarf.refresh_token', 'test-refresh')
  })
}

async function mockCabinet(page: import('@playwright/test').Page, opts?: { sent?: boolean }) {
  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        email: 'hero@example.com',
        display_name: 'Алёна',
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
      body: JSON.stringify([]),
    })
  })
  await page.route('**/lobbies', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
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
  void opts
}

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 768 },
  { name: '390', width: 390, height: 844 },
] as const

test.describe('ADM-04 screenshots', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const vp of VIEWPORTS) {
    test(`кабинет форма пустая ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await mockCabinet(page)
      await page.goto('/cabinet')
      const panel = page.locator('.cabinet-layout__feedback')
      await expect(panel).toBeVisible()
      await page.waitForTimeout(400)
      await panel.screenshot({
        path: join(OUT, `cabinet-feedback-empty-${vp.name}.png`),
        animations: 'disabled',
      })
    })

    test(`кабинет форма ушло ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await mockCabinet(page, { sent: true })
      await page.goto('/cabinet')
      const panel = page.locator('.cabinet-layout__feedback')
      await expect(panel).toBeVisible()
      await panel.getByPlaceholder(/Опишите коротко/).fill('Спасибо за сервис')
      await panel.getByRole('button', { name: 'Отправить', exact: true }).click()
      await expect(panel.getByText('Сообщение ушло, спасибо!')).toBeVisible()
      await page.waitForTimeout(400)
      await panel.screenshot({
        path: join(OUT, `cabinet-feedback-sent-${vp.name}.png`),
        animations: 'disabled',
      })
    })

    test(`админка очередь ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await mockAdmin(page)
      await page.goto('/admin')
      if (vp.width <= 1100) {
        await page.getByLabel('Разделы админки').selectOption('feedback')
      } else {
        await page.getByRole('tab', { name: 'Обратная связь' }).click()
      }
      await expect(page.getByText('Новых: 1')).toBeVisible()
      await page.waitForTimeout(400)
      await page.screenshot({
        path: join(OUT, `admin-feedback-queue-${vp.name}.png`),
        animations: 'disabled',
      })
    })

    test(`админка карточка ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await mockAdmin(page)
      await page.goto('/admin')
      if (vp.width <= 1100) {
        await page.getByLabel('Разделы админки').selectOption('feedback')
      } else {
        await page.getByRole('tab', { name: 'Обратная связь' }).click()
      }
      await page.getByRole('button', { name: 'Открыть' }).first().click()
      await expect(page.getByText('Перейти к аккаунту')).toBeVisible()
      await page.waitForTimeout(400)
      await page.screenshot({
        path: join(OUT, `admin-feedback-card-${vp.name}.png`),
        animations: 'disabled',
      })
    })
  }
})
