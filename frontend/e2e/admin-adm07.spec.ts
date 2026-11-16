import { expect, test } from '@playwright/test'

const PLAYER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'player@example.com',
  email_verified: true,
  display_name: 'Игрок',
  created_at: '2026-01-01T12:00:00Z',
  last_seen_at: '2026-01-02T12:00:00Z',
  is_blocked: false,
  login_methods: { has_password: true, yandex: false, vk: false },
  characters: { total: 1, edition_2014: 1, edition_2024: 0, drafts: 0 },
  lobbies: { owned: 0, as_player: 1 },
  roles: [] as Array<{
    role: string
    label: string
    source: string | null
    source_label: string | null
    can_revoke: boolean
  }>,
}

async function mockFullAdmin(page: import('@playwright/test').Page) {
  let account = structuredClone(PLAYER)

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
  await page.route('**/admin/accounts/**/sessions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  })
  await page.route(`**/admin/accounts/${PLAYER.id}/roles/grant`, async (route) => {
    const body = route.request().postDataJSON() as { role: string; admin_password: string }
    if (body.admin_password !== 'admin-secret-1') {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Неверный пароль админки' }),
      })
      return
    }
    const label =
      body.role === 'full_admin' ? 'Полный админ' : 'Модератор справочников'
    account.roles = [
      ...account.roles.filter((r) => r.role !== body.role),
      {
        role: body.role,
        label,
        source: null,
        source_label: null,
        can_revoke: true,
      },
    ]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Роль «${label}» выдана` }),
    })
  })
  await page.route(`**/admin/accounts/${PLAYER.id}/roles/revoke`, async (route) => {
    const body = route.request().postDataJSON() as { role: string; admin_password: string }
    if (body.admin_password !== 'admin-secret-1') {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Неверный пароль админки' }),
      })
      return
    }
    if (body.role === 'full_admin' && account.roles.length <= 1) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Нельзя снять последнего полного админа' }),
      })
      return
    }
    account.roles = account.roles.filter((r) => r.role !== body.role)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Роль снята' }),
    })
  })
  await page.route(`**/admin/accounts/${PLAYER.id}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(account),
    })
  })
  await page.route('**/admin/accounts**', async (route) => {
    const url = route.request().url()
    if (url.includes('/sessions') || url.includes('/roles/') || /\/accounts\/[^/?]+$/.test(url.split('?')[0])) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [account],
        total: 1,
        page: 1,
        page_size: 20,
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
    if (url.includes('name-feedback')) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
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
      }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'test-access')
    localStorage.setItem('dvarf.refresh_token', 'test-refresh')
  })
}

test.describe('ADM-07 roles', () => {
  test('блок Роли: выдача модератора и диалог', async ({ page }) => {
    await mockFullAdmin(page)
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Подробнее' }).click()
    await page.getByRole('button', { name: 'Помощь' }).click()

    await expect(page.getByRole('heading', { name: 'Роли' })).toBeVisible()
    await expect(page.getByText('Ролей админки нет')).toBeVisible()

    await page.getByRole('button', { name: 'Сделать модератором справочников' }).click()
    const dialog = page.getByRole('dialog', { name: /Сделать модератором справочников/i })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('Пароль админки')).toHaveValue('')
    await dialog.getByLabel('Пароль админки').fill('admin-secret-1')
    await dialog.getByRole('button', { name: 'Выдать роль' }).click()

    await expect(page.getByText('Модератор справочников').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Снять роль «Модератор справочников»/ })).toBeVisible()
  })

  test('подсказка и ошибка длины пароля админки', async ({ page }) => {
    await mockFullAdmin(page)
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Сменить пароль админки' }).click()
    const dialog = page.getByRole('dialog', { name: /Сменить пароль админки/i })
    await expect(dialog.getByText('Минимум 8 символов')).toBeVisible()
    await dialog.getByLabel('Текущий пароль админки').fill('admin-secret-1')
    await dialog.getByLabel('Новый пароль админки').fill('short')
    await dialog.getByLabel('Повтор пароля').fill('short')
    await expect(dialog.getByText(/Пароль слишком короткий/)).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Сменить' })).toBeEnabled()
  })

  test('чип Черновик с заглавной', async ({ page }) => {
    await mockFullAdmin(page)
    await page.goto('/admin')
    await page.getByRole('tab', { name: 'Справочники' }).click()
    await expect(page.getByRole('heading', { name: 'Справочники' })).toBeVisible()
    await expect(page.getByText('Черновик', { exact: true })).toBeVisible()
  })

  test('модератор не видит блок Роли', async ({ page }) => {
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
    await page.route('**/admin/catalog**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 20 }),
      })
    })
    await page.route('**/admin/catalog/name-feedback**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0 }),
      })
    })
    await page.addInitScript(() => {
      localStorage.setItem('dvarf.access_token', 'test-access')
      localStorage.setItem('dvarf.refresh_token', 'test-refresh')
    })
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Роли' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Аккаунты' })).toHaveCount(0)
  })
})
