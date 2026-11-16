import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.ADM_SHOT_DIR || '/opt/cursor/artifacts/adm05'

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
    created_at: '2026-11-16T12:00:00+05:00',
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
  updated_at: '2026-11-16T12:30:00+05:00',
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
      created_at: '2026-11-16T12:00:00+05:00',
      reviewed_at: null,
      can_rollback: false,
    },
  ],
  can_edit_draft: true,
  can_accept: true,
  can_reject: true,
  can_withdraw: true,
}

async function mockAdmin(page: import('@playwright/test').Page) {
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
  await page.route('**/admin/catalog/name-feedback**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'fb-name-1',
            body: 'В справочнике опечатка в названии доспеха',
            author_name: 'Игрок',
            is_anonymous: false,
            status: 'new',
            status_label: 'Новое',
            created_at: '2026-11-16T11:00:00+05:00',
          },
        ],
        total: 1,
      }),
    })
  })
  await page.route('**/admin/catalog**', async (route) => {
    const url = route.request().url()
    if (url.includes('name-feedback')) {
      await route.fallback()
      return
    }
    if (url.match(/\/admin\/catalog\/[0-9a-f-]+/i) || url.includes('/cat-1')) {
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
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'test-access')
    localStorage.setItem('dvarf.refresh_token', 'test-refresh')
  })
}

async function settle(page: import('@playwright/test').Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(400)
}

test.describe('ADM-05 screenshots', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const vp of [
    { name: '1440', width: 1440, height: 900 },
    { name: '1024', width: 1024, height: 768 },
    { name: '390', width: 390, height: 844 },
  ]) {
    test(`catalog list ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await mockAdmin(page)
      await page.goto('/admin')
      if (vp.width <= 1100) {
        await page.getByLabel('Разделы админки').selectOption('catalog')
      } else {
        await page.getByRole('tab', { name: 'Справочники' }).click()
      }
      await expect(page.getByRole('heading', { name: 'Справочники' })).toBeVisible()
      await settle(page)
      await page.screenshot({
        path: join(OUT, `catalog-list-${vp.name}.png`),
        animations: 'disabled',
      })
    })

    test(`catalog card ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await mockAdmin(page)
      await page.goto('/admin')
      if (vp.width <= 1100) {
        await page.getByLabel('Разделы админки').selectOption('catalog')
      } else {
        await page.getByRole('tab', { name: 'Справочники' }).click()
      }
      await page.getByRole('button', { name: 'Открыть' }).first().click()
      await expect(page.getByText('Слаг (только чтение): fireball')).toBeVisible()
      await settle(page)
      await page.screenshot({
        path: join(OUT, `catalog-card-${vp.name}.png`),
        animations: 'disabled',
      })
    })
  }

  test('accept dialog 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await mockAdmin(page)
    await page.goto('/admin')
    await page.getByRole('tab', { name: 'Справочники' }).click()
    await page.getByRole('button', { name: 'Открыть' }).first().click()
    await page.getByRole('button', { name: 'Принять' }).click()
    await expect(page.getByText('После принятия игроки увидят новое имя')).toBeVisible()
    await settle(page)
    await page.screenshot({
      path: join(OUT, 'catalog-accept-dialog-1440.png'),
      animations: 'disabled',
    })
  })
})
