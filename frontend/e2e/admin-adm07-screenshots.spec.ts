import { expect, test, type Locator, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.ADM_SHOT_DIR || '/opt/cursor/artifacts/adm-07'

type RoleItem = {
  role: string
  label: string
  source: string | null
  source_label: string | null
  can_revoke: boolean
}

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
  roles: [] as RoleItem[],
}

const LAST_ADMIN = {
  ...PLAYER,
  id: '22222222-2222-2222-2222-222222222222',
  email: 'lonely-admin@example.com',
  display_name: 'Единственный админ',
  roles: [
    {
      role: 'full_admin',
      label: 'Полный админ',
      source: null,
      source_label: null,
      can_revoke: true,
    },
  ] as RoleItem[],
}

async function settleDialog(dialog: Locator) {
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveCSS('opacity', '1')
  await dialog.page().waitForTimeout(280)
}

async function shot(page: Page, name: string, width: number) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
  await page.waitForTimeout(200)
  await page.screenshot({
    path: join(OUT, `${name}-${width}.png`),
    fullPage: true,
  })
}

function isDocument(route: import('@playwright/test').Route): boolean {
  return route.request().resourceType() === 'document'
}

async function mockShell(
  page: Page,
  opts: {
    account?: typeof PLAYER
    isFullAdmin?: boolean
    revokeError?: string | null
  } = {},
) {
  const isFullAdmin = opts.isFullAdmin !== false
  let account = structuredClone(opts.account ?? PLAYER)

  await page.route('**/admin/status', async (route) => {
    if (isDocument(route)) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        isFullAdmin
          ? {
              panel_enabled: true,
              is_full_admin: true,
              is_catalog_moderator: false,
              admin_password_set: true,
              display_name: 'Тест-админ',
              sections: ['accounts', 'help', 'metrics', 'feedback', 'catalog'],
            }
          : {
              panel_enabled: true,
              is_full_admin: false,
              is_catalog_moderator: true,
              admin_password_set: false,
              display_name: 'Модератор',
              sections: ['catalog'],
            },
      ),
    })
  })
  await page.route('**/admin/accounts/**/sessions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  })
  await page.route('**/admin/accounts/**/roles/grant', async (route) => {
    const body = route.request().postDataJSON() as { role: string }
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
  await page.route('**/admin/accounts/**/roles/revoke', async (route) => {
    if (opts.revokeError) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ detail: opts.revokeError }),
      })
      return
    }
    const body = route.request().postDataJSON() as { role: string }
    account.roles = account.roles.filter((r) => r.role !== body.role)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Роль снята' }),
    })
  })
  await page.route(`**/admin/accounts/${account.id}`, async (route) => {
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
    if (isDocument(route)) {
      await route.fallback()
      return
    }
    const url = route.request().url()
    if (
      url.includes('/sessions') ||
      url.includes('/roles/') ||
      /\/accounts\/[^/?]+$/.test(url.split('?')[0])
    ) {
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
    if (isDocument(route)) {
      await route.fallback()
      return
    }
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

async function openHelpFromAccounts(page: Page) {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()
  const accountsTab = page.getByRole('tab', { name: 'Аккаунты' })
  if (await accountsTab.count()) {
    await accountsTab.click()
  }
  await page.getByRole('button', { name: 'Подробнее' }).click()
  await page.getByRole('button', { name: 'Помощь' }).click()
  await expect(page.getByRole('heading', { name: 'Роли' })).toBeVisible()
}

test.describe('ADM-07 screenshots', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const width of [1440, 390] as const) {
    test(`роли игрока + диалог + выданы (${width})`, async ({ page }) => {
      await mockShell(page)
      await openHelpFromAccounts(page)
      await shot(page, 'roles-empty-player', width)

      await page.getByRole('button', { name: 'Сделать модератором справочников' }).click()
      const grantDialog = page.getByRole('dialog', {
        name: /Сделать модератором справочников/i,
      })
      await settleDialog(grantDialog)
      await shot(page, 'roles-grant-dialog', width)
      await grantDialog.getByLabel('Пароль админки').fill('admin-secret-1')
      await grantDialog.getByRole('button', { name: 'Выдать роль' }).click()
      await expect(page.getByText('Модератор справочников').first()).toBeVisible()
      await shot(page, 'roles-granted', width)
    })

    test(`отказ последний админ (${width})`, async ({ page }) => {
      await mockShell(page, {
        account: LAST_ADMIN,
        revokeError: 'Нельзя снять последнего полного админа',
      })
      await openHelpFromAccounts(page)
      await expect(page.getByText('Полный админ').first()).toBeVisible()
      await page.getByRole('button', { name: /Снять роль «Полный админ»/ }).click()
      const revokeDialog = page.getByRole('dialog', { name: /Снять роль/i })
      await settleDialog(revokeDialog)
      await revokeDialog.getByLabel('Пароль админки').fill('admin-secret-1')
      await revokeDialog.getByRole('button', { name: 'Снять роль' }).click()
      await expect(page.getByText('Нельзя снять последнего полного админа')).toBeVisible()
      await shot(page, 'roles-last-admin-denied', width)
    })

    test(`пароль подсказка и ошибка (${width})`, async ({ page }) => {
      await mockShell(page)
      await page.goto('/admin')
      await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()
      await page.getByRole('button', { name: 'Сменить пароль админки' }).click()
      const pwdDialog = page.getByRole('dialog', { name: /Сменить пароль админки/i })
      await settleDialog(pwdDialog)
      await pwdDialog.getByLabel('Текущий пароль админки').fill('admin-secret-1')
      await pwdDialog.getByLabel('Новый пароль админки').fill('short')
      await pwdDialog.getByLabel('Повтор пароля').fill('short')
      await expect(pwdDialog.getByText(/Пароль слишком короткий/)).toBeVisible()
      await shot(page, 'password-hint-error', width)
    })

    test(`чип Черновик (${width})`, async ({ page }) => {
      await mockShell(page)
      await page.goto('/admin')
      await page.getByRole('tab', { name: 'Справочники' }).click()
      await expect(page.getByRole('heading', { name: 'Справочники' })).toBeVisible()
      await expect(page.getByText('Черновик', { exact: true })).toBeVisible()
      await shot(page, 'catalog-draft-chip', width)
    })

    test(`модератор без блока Роли (${width})`, async ({ page }) => {
      await mockShell(page, { isFullAdmin: false })
      await page.goto('/admin')
      await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Роли' })).toHaveCount(0)
      await shot(page, 'moderator-no-roles', width)
    })
  }
})
