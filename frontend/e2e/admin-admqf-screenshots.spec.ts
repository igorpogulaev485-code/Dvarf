/**
 * ADM-QF screenshots — фильтры, danger-блок, модератор, форма «Написать нам».
 * Run: ADM_SHOT_DIR=/opt/cursor/artifacts/adm-qf npx playwright test e2e/admin-admqf-screenshots.spec.ts --config=playwright.admin.config.ts
 */
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.ADM_SHOT_DIR || '/opt/cursor/artifacts/adm-qf'

const ACCOUNT = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'player@example.com',
  email_verified: true,
  display_name: 'Игрок',
  created_at: '2026-01-01T12:00:00Z',
  last_seen_at: '2026-01-02T12:00:00Z',
  is_blocked: false,
  login_methods: { has_password: true, yandex: false, vk: false },
  characters: { total: 2, edition_2014: 2, edition_2024: 0, drafts: 0 },
  lobbies: { owned: 1, as_player: 0 },
}

const CATALOG_PAGE = {
  items: [
    {
      id: 'cat-1',
      kind: 'spell',
      kind_label: 'Заклинание',
      slug: 'fireball',
      name_ru_live: 'Огненный шар',
      name_en_live: 'Fireball',
      name_ru_seed: 'Огненный шар',
      name_en_seed: 'Fireball',
      names_differ: false,
      rules_edition: '2014',
      source: 'srd-5.1',
      content_layer: 'srd',
      content_layer_label: 'Базовые правила',
      has_pending: true,
      pending_name_ru: 'Шар пламени',
      is_active: true,
      updated_at: '2026-11-16T12:30:00+05:00',
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
}

const FEEDBACK_PAGE = {
  items: [
    {
      id: 'fb-1',
      topic: 'bug',
      topic_label: 'Ошибка',
      status: 'new',
      status_label: 'Новое',
      body: 'Не уходит форма «Написать нам» — проверьте прокси.',
      is_anonymous: false,
      created_at: '2026-11-16T09:00:00+05:00',
      updated_at: '2026-11-16T09:00:00+05:00',
      admin_note: null,
      author: {
        id: ACCOUNT.id,
        email: ACCOUNT.email,
        display_name: ACCOUNT.display_name,
      },
      character_name: null,
      lobby_name: null,
      page_path: '/cabinet',
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
  new_count: 1,
}

function isApiRequest(route: {
  request: () => { resourceType: () => string; method: () => string }
}) {
  const type = route.request().resourceType()
  return type === 'xhr' || type === 'fetch'
}

async function mockFullAdmin(page: Page) {
  await page.route('**/admin/status', async (route) => {
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        panel_enabled: true,
        is_full_admin: true,
        is_catalog_moderator: false,
        admin_password_set: true,
        display_name: 'Тест-админ',
        sections: ['accounts', 'help', 'metrics', 'feedback', 'catalog'],
      }),
    })
  })
  await page.route('**/admin/catalog/name-feedback**', async (route) => {
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0 }),
    })
  })
  await page.route('**/admin/catalog**', async (route) => {
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CATALOG_PAGE),
    })
  })
  await page.route('**/admin/feedback**', async (route) => {
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FEEDBACK_PAGE),
    })
  })
  await page.route('**/admin/accounts/**/sessions', async (route) => {
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  })
  await page.route(`**/admin/accounts/${ACCOUNT.id}`, async (route) => {
    if (!isApiRequest(route) || route.request().method() !== 'GET') {
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
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
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
  await page.route('**/auth/me', async (route) => {
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'admin-1',
        email: 'admin@example.com',
        display_name: 'Тест-админ',
        login: null,
        full_name: null,
        phone: null,
        avatar_url: null,
        email_verified_at: '2026-11-01T00:00:00Z',
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-01T00:00:00Z',
        providers: ['password'],
        is_admin: true,
        theme_id: 'wis',
        ability_colors: 'identity',
      }),
    })
  })
  await page.route('**/auth/sessions**', async (route) => {
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  })
  await page.route(url => /\/characters\/?(\?|$)/.test(new URL(url).pathname), async (route) => {
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
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
          is_draft: false,
          created_at: '2026-11-01T00:00:00Z',
          updated_at: '2026-11-01T00:00:00Z',
        },
      ]),
    })
  })
  await page.route(url => /\/lobbies\/?(\?|$)/.test(new URL(url).pathname), async (route) => {
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
  await page.route(url => /\/feedback\/?(\?|$)/.test(new URL(url).pathname), async (route) => {
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'fb-new',
          message: 'Сообщение принято',
        }),
      })
      return
    }
    await route.fallback()
  })
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'test-access')
    localStorage.setItem('dvarf.refresh_token', 'test-refresh')
  })
}

async function mockModerator(page: Page) {
  await page.route('**/admin/status', async (route) => {
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        panel_enabled: true,
        is_full_admin: false,
        is_catalog_moderator: true,
        admin_password_set: false,
        display_name: 'Модератор',
        sections: ['catalog'],
      }),
    })
  })
  await page.route('**/admin/catalog/name-feedback**', async (route) => {
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0 }),
    })
  })
  await page.route('**/admin/catalog**', async (route) => {
    if (!isApiRequest(route)) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CATALOG_PAGE),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'test-access')
    localStorage.setItem('dvarf.refresh_token', 'test-refresh')
  })
}

async function openAdminSection(page: Page, section: 'catalog' | 'feedback' | 'accounts' | 'help') {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()
  const labels: Record<typeof section, string> = {
    catalog: 'Справочники',
    feedback: 'Обратная связь',
    accounts: 'Аккаунты',
    help: 'Помощь',
  }
  const tab = page.getByRole('tab', { name: labels[section] })
  const select = page.getByLabel('Разделы админки')
  if ((await tab.count()) > 0) {
    await tab.click()
  } else if ((await select.count()) > 0) {
    await select.selectOption(section)
    await expect(select).toHaveValue(section)
  }
  await expect(page.getByRole('heading', { name: labels[section] })).toBeVisible({
    timeout: 15_000,
  })
}

test.describe('ADM-QF screenshots', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const [tag, size] of [
    ['1440', { width: 1440, height: 900 }],
    ['390', { width: 390, height: 844 }],
  ] as const) {
    test(`catalog filters ${tag}`, async ({ page }) => {
      await page.setViewportSize(size)
      await mockFullAdmin(page)
      await openAdminSection(page, 'catalog')
      await expect(page.getByText('Редакция')).toBeVisible()
      await page.screenshot({
        path: join(OUT, `qf-${tag}-catalog-filters.png`),
        fullPage: true,
      })
    })

    test(`feedback filters ${tag}`, async ({ page }) => {
      await page.setViewportSize(size)
      await mockFullAdmin(page)
      await openAdminSection(page, 'feedback')
      await page.screenshot({
        path: join(OUT, `qf-${tag}-feedback-filters.png`),
        fullPage: true,
      })
    })

    test(`moderator ${tag}`, async ({ page }) => {
      await page.setViewportSize(size)
      await mockModerator(page)
      await openAdminSection(page, 'catalog')
      await expect(page.getByLabel('Разделы админки')).toHaveCount(0)
      await page.screenshot({
        path: join(OUT, `qf-${tag}-moderator.png`),
        fullPage: true,
      })
    })
  }

  test('danger block dialog 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await mockFullAdmin(page)
    await openAdminSection(page, 'accounts')
    await page.getByRole('button', { name: 'Подробнее' }).click()
    await page.getByRole('button', { name: 'Помощь' }).click()
    await expect(page.getByRole('button', { name: 'Заблокировать' })).toBeVisible()
    await page.screenshot({
      path: join(OUT, 'qf-1440-help-danger-zone.png'),
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Заблокировать' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.waitForTimeout(280)
    await page.screenshot({
      path: join(OUT, 'qf-1440-dialog-block.png'),
      fullPage: false,
    })
  })

  test('cabinet feedback sent + admin queue 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await mockFullAdmin(page)
    await page.goto('/cabinet')
    await expect(page.getByRole('heading', { name: 'Написать нам' })).toBeVisible()
    const form = page.locator('.cabinet-layout__feedback')
    await form.getByPlaceholder(/Опишите коротко/).fill('Проверка прокси /feedback после ADM-QF')
    await form.getByRole('button', { name: 'Отправить', exact: true }).click()
    await expect(form.getByText('Сообщение ушло, спасибо!')).toBeVisible({ timeout: 10_000 })
    await page.screenshot({
      path: join(OUT, 'qf-1440-cabinet-feedback-sent.png'),
      fullPage: true,
    })

    await openAdminSection(page, 'feedback')
    await expect(page.getByText(/Не уходит форма|прокси/i).first()).toBeVisible()
    await page.screenshot({
      path: join(OUT, 'qf-1440-admin-feedback-after-send.png'),
      fullPage: true,
    })
  })

  test('catalog filters 390 more', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockFullAdmin(page)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()
    await page.getByLabel('Разделы админки').selectOption({ label: 'Справочники' })
    await expect(page.getByRole('heading', { name: 'Справочники' })).toBeVisible()
    const more = page.getByText('Ещё фильтры')
    await expect(more).toBeVisible()
    await more.click()
    await page.waitForTimeout(200)
    await page.screenshot({
      path: join(OUT, 'qf-390-catalog-filters-more.png'),
      fullPage: true,
    })
  })
})
