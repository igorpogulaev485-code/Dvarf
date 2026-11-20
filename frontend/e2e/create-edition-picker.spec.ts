/**
 * Evidence: one «Создать персонажа» → edition picker (restored pre-hide2024 UX)
 * + 2024 create back-link parity with 2014.
 * Artifacts → /opt/cursor/artifacts/create-edition-picker/
 */
import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const OUT = '/opt/cursor/artifacts/create-edition-picker'

function tag(name: string): '1440' | '390' {
  return name.includes('390') ? '390' : '1440'
}

async function shot(page: Page, stem: string, projectName: string) {
  fs.mkdirSync(OUT, { recursive: true })
  await page.screenshot({
    path: path.join(OUT, `${stem}-${tag(projectName)}.png`),
    fullPage: false,
  })
}

const SAMPLE_CHAR = {
  id: 'c1',
  name: 'Darrak',
  rules_edition: '2014',
  level: 3,
  class_name: 'Жрец',
  race_name: 'Дварф',
  hp_current: 20,
  hp_max: 24,
  is_draft: false,
  avatar_url: null,
  sheet_version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

async function mockAuthAndList(page: Page, list: unknown[]) {
  await page.route('**/auth/me', async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'u1',
        email: 'igor@example.com',
        display_name: 'Игорь',
        email_verified: true,
      }),
    })
  })
  await page.route('**/characters**', async (route) => {
    // Do not intercept SPA navigation to /characters
    if (route.request().resourceType() === 'document') {
      await route.continue()
      return
    }
    const pathName = new URL(route.request().url()).pathname
    if (pathName !== '/characters') {
      await route.continue()
      return
    }
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(list),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 't')
    localStorage.setItem('dvarf.refresh_token', 't')
    const onboarding = JSON.stringify({
      version: 1,
      welcomeDone: true,
      segment: 'skip',
      createHintVersion: 1,
      sheetTourDone: true,
      lobbyTourDone: true,
      dismissedPanelHelp: [],
      seenSceneIntros: [],
      helpOpened: false,
      pendingReadyBridge: false,
      pendingSheetTour: false,
      pendingLobbyTour: false,
      lobbyTourSeenSteps: [],
      joinIntroDone: true,
      edition2024DiffDone: true,
    })
    localStorage.setItem('creed20.onboarding.v1:u1', onboarding)
    localStorage.setItem('creed20.onboarding.v1', onboarding)
  })
}

test.describe('Create edition picker UX', () => {
  test('list with chars + open picker', async ({ page }, testInfo) => {
    const project = testInfo.project.name
    await mockAuthAndList(page, [SAMPLE_CHAR])

    await page.goto('/characters')
    await expect(page.getByTestId('create-character-open')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Darrak')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Создать персонажа' })).toBeVisible()
    await expect(page.getByTestId('create-character-2024')).toHaveCount(0)
    await shot(page, 'characters-one-cta', project)

    await page.getByTestId('create-character-open').click()
    await expect(page.getByTestId('create-character-edition')).toBeVisible()
    await expect(page.getByText('Выберите редакцию правил')).toBeVisible()
    await expect(page.getByTestId('create-character-2014')).toBeVisible()
    await expect(page.getByTestId('create-character-2024')).toBeVisible()
    await expect(page.getByTestId('create-character-cancel')).toBeVisible()
    await shot(page, 'characters-edition-picker', project)
  })

  test('empty list + open picker', async ({ page }, testInfo) => {
    const project = testInfo.project.name
    await mockAuthAndList(page, [])

    await page.goto('/characters')
    const openCreate = page.getByTestId('create-character-open').first()
    await expect(openCreate).toBeVisible({ timeout: 20_000 })
    await shot(page, 'characters-empty-one-cta', project)
    await openCreate.click()
    await expect(page.getByTestId('create-character-edition').first()).toBeVisible()
    await shot(page, 'characters-empty-edition-picker', project)
  })

  test('create 2024 topbar has ← К списку like 2014', async ({ page }, testInfo) => {
    const project = testInfo.project.name
    const { createStore, installWarlockHarness } = await import('./support/warlock2024Harness')
    const store = createStore()
    await installWarlockHarness(page, store)
    await page.addInitScript(() => {
      const onboarding = JSON.stringify({
        version: 1,
        welcomeDone: true,
        segment: 'skip',
        createHintVersion: 1,
        sheetTourDone: true,
        lobbyTourDone: true,
        dismissedPanelHelp: [],
        seenSceneIntros: [],
        helpOpened: false,
        pendingReadyBridge: false,
        pendingSheetTour: false,
        pendingLobbyTour: false,
        lobbyTourSeenSteps: [],
        joinIntroDone: true,
        edition2024DiffDone: true,
      })
      localStorage.setItem('creed20.onboarding.v1:u1', onboarding)
      localStorage.setItem('creed20.onboarding.v1', onboarding)
    })
    await page.goto('/characters/create?edition=2024')
    await expect(page.getByTestId('create-character-2024')).toBeVisible({ timeout: 45_000 })
    const dialog = page.getByTestId('edition-2024-diff-dialog')
    if (await dialog.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Понятно' }).click()
      await expect(dialog).toHaveCount(0)
    }
    await expect(page.getByTestId('create-2024-back')).toBeVisible()
    await expect(page.getByTestId('create-2024-back')).toHaveText('← К списку')
    await expect(page.getByText('Создание · D&D 2024')).toBeVisible()
    await expect(page.getByTestId('edition-2024-diff-reopen')).toBeVisible()
    await shot(page, 'create-2024-back-link', project)
  })
})
