import { expect, test } from '@playwright/test'

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
      updated_at: '2026-11-16T10:00:00+05:00',
    },
    {
      id: 'cat-2',
      kind: 'race',
      kind_label: 'Раса',
      slug: 'elf',
      name_ru_live: 'Эльф',
      name_en_live: 'Elf',
      name_ru_seed: 'Эльф',
      name_en_seed: 'Elf',
      names_differ: false,
      rules_edition: '2014',
      source: 'srd-5.1',
      content_layer: 'srd',
      content_layer_label: 'Базовые правила',
      has_pending: false,
      pending_name_ru: null,
      is_active: true,
      updated_at: '2026-11-15T09:00:00+05:00',
    },
  ],
  total: 2,
  page: 1,
  page_size: 20,
}

const CATALOG_DETAIL = {
  id: 'cat-1',
  kind: 'spell',
  kind_label: 'Заклинание',
  slug: 'fireball',
  name_ru_live: 'Огненный шар',
  name_en_live: 'Fireball',
  name_ru_seed: 'Огненный шар',
  name_en_seed: 'Fireball',
  names_differ: false,
  pending: {
    id: 'rev-1',
    status: 'pending',
    status_label: 'на проверку',
    name_ru: 'Шар пламени',
    name_en: null,
    previous_name_ru: null,
    previous_name_en: null,
    author_id: 'mod-1',
    author_name: 'Модератор',
    reviewer_id: null,
    reviewer_name: null,
    created_at: '2026-11-16T11:00:00+05:00',
    reviewed_at: null,
    can_rollback: false,
  },
  rules_edition: '2014',
  source: 'srd-5.1',
  content_layer: 'srd',
  content_layer_label: 'Базовые правила',
  parent_id: null,
  parent_name_ru: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00+05:00',
  updated_at: '2026-11-16T10:00:00+05:00',
  revisions: [
    {
      id: 'rev-1',
      status: 'pending',
      status_label: 'на проверку',
      name_ru: 'Шар пламени',
      name_en: null,
      previous_name_ru: null,
      previous_name_en: null,
      author_id: 'mod-1',
      author_name: 'Модератор',
      reviewer_id: null,
      reviewer_name: null,
      created_at: '2026-11-16T11:00:00+05:00',
      reviewed_at: null,
      can_rollback: false,
    },
  ],
  can_edit_draft: true,
  can_accept: true,
  can_reject: true,
  can_withdraw: true,
}

async function mockCatalogApis(page: import('@playwright/test').Page) {
  await page.route('**/admin/catalog**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()

    if (path.endsWith('/name-feedback') || path.includes('/name-feedback')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0 }),
      })
      return
    }
    if (path.endsWith('/draft') || path.includes('/accept') || path.includes('/reject')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...CATALOG_DETAIL,
          pending: method === 'POST' && path.includes('/accept') ? null : CATALOG_DETAIL.pending,
          name_ru_live:
            method === 'POST' && path.includes('/accept')
              ? 'Шар пламени'
              : CATALOG_DETAIL.name_ru_live,
          can_accept: !(method === 'POST' && path.includes('/accept')),
          can_reject: !(method === 'POST' && path.includes('/accept')),
        }),
      })
      return
    }
    // Карточка: /admin/catalog/<id>
    if (/\/admin\/catalog\/[^/]+$/.test(path)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(CATALOG_DETAIL),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CATALOG_PAGE),
    })
  })
  await page.route('**/admin/accounts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 20 }),
    })
  })
}

async function mockFullAdmin(page: import('@playwright/test').Page) {
  await page.route('**/admin/status', async (route) => {
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
  await mockCatalogApis(page)
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'test-access')
    localStorage.setItem('dvarf.refresh_token', 'test-refresh')
  })
}

async function mockModerator(page: import('@playwright/test').Page) {
  await page.route('**/admin/status', async (route) => {
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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0 }),
    })
  })
  await page.route('**/admin/catalog**', async (route) => {
    const url = route.request().url()
    if (url.match(/\/admin\/catalog\/[^/?]+/) && !url.includes('name-feedback')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...CATALOG_DETAIL,
          can_accept: false,
          can_reject: false,
          can_edit_draft: true,
          can_withdraw: true,
        }),
      })
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

test.describe('ADM-05 catalog admin', () => {
  test('full admin: list, card, draft, accept button', async ({ page }) => {
    await mockFullAdmin(page)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()

    await page.getByRole('tab', { name: 'Справочники' }).click()
    await expect(page.getByRole('heading', { name: 'Справочники' })).toBeVisible()
    await expect(page.getByText('Огненный шар').first()).toBeVisible()
    await expect(page.getByText('Черновик', { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Открыть' }).first().click()
    await expect(page.getByText('Код записи (только чтение): fireball')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Сохранить черновик' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Принять' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Отклонить' })).toBeVisible()

    await page.getByRole('button', { name: 'Принять' }).click()
    await expect(page.getByText('После принятия игроки увидят новое имя')).toBeVisible()
  })

  test('moderator: catalog only, no accept', async ({ page }) => {
    await mockModerator(page)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Справочники' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Аккаунты' })).toHaveCount(0)
    await expect(page.getByText('Пароль админки задан')).toHaveCount(0)

    await page.getByRole('button', { name: 'Открыть' }).first().click()
    await expect(page.getByRole('button', { name: 'Сохранить черновик' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Принять' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Отклонить' })).toHaveCount(0)
  })
})
