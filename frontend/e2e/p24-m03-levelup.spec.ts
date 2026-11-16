import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ARTIFACTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../artifacts/p24-m03',
)
const API = process.env.P24_E2E_API || 'http://127.0.0.1:8000'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

async function shot(page: Page, name: string, project: string) {
  await page.screenshot({
    path: path.join(ARTIFACTS, `levelup-${name}-${project}.png`),
    fullPage: true,
  })
}

async function loginViaApi(page: Page) {
  const email = `m03l_${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`
  const password = 'TestPass123!'
  const reg = await page.request.post(`${API}/auth/register`, {
    data: { email, password, display_name: 'M03 Тестер' },
  })
  expect(reg.ok(), await reg.text()).toBeTruthy()
  const regBody = await reg.json()
  const token = new URL(String(regBody.debug_verify_url || '')).searchParams.get('token')
  expect(token).toBeTruthy()
  const verified = await page.request.post(`${API}/auth/verify-email`, { data: { token } })
  expect(verified.ok(), await verified.text()).toBeTruthy()
  const tokens = await verified.json()
  await page.goto('/')
  await page.evaluate(
    ([access, refresh]) => {
      localStorage.setItem('dvarf.access_token', access)
      localStorage.setItem('dvarf.refresh_token', refresh)
    },
    [tokens.access_token as string, tokens.refresh_token as string],
  )
  return tokens.access_token as string
}

async function createFighter2024(page: Page, access: string): Promise<string> {
  const res = await page.request.post(`${API}/characters/create-2024`, {
    headers: { authorization: `Bearer ${access}` },
    data: {
      name: 'Воин для уровней',
      is_preview: true,
      class_slug: 'fighter',
      background_slug: 'soldier',
      species_slug: 'dwarf',
      ability_method: 'standard_array',
      base_abilities: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
      background_asi_mode: '+2/+1',
      background_asi: { str: 2, con: 1 },
      language_ids: ['elvish', 'dwarvish'],
      class_skill_ids: ['athletics', 'perception'],
      weapon_mastery_ids: ['longsword', 'mace', 'javelin'],
      fighting_style_slug: 'defense',
      background_tool_id: 'dice-set',
      background_equipment: 'pack',
      class_equipment: 'a',
    },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  const body = await res.json()
  expect(body.rules_edition).toBe('2024')
  return String(body.id)
}

async function skipOnboarding(page: Page) {
  const skip = page.getByRole('button', { name: 'Пропустить подсказки' })
  try {
    await skip.waitFor({ state: 'visible', timeout: 2_500 })
    await skip.click()
  } catch {
    // Onboarding is shown once per account; later calls find nothing to skip.
  }
  await expect(page.locator('.ui-dialog-backdrop')).toHaveCount(0)
}

async function inputValues(page: Page): Promise<string[]> {
  return page.locator('input').evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value))
}

async function openIdentity(page: Page) {
  await skipOnboarding(page)
  await page.locator('button[title="Открыть основное"]:visible').first().click()
  await expect(page.getByRole('button', { name: '+1 уровень' })).toBeVisible()
}

async function levelUpSameClass(page: Page) {
  await page.getByRole('button', { name: '+1 уровень' }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: 'Повышение уровня' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Повысить' }).click()
  await expect(dialog).toBeHidden()
}

test.describe('P24-M03 level-up 2024', () => {
  test('воин 2024: 1→4 ур. (подкласс, ASI), −1 снимает ASI, текст без «PHB 2014»', async ({
    page,
  }, testInfo) => {
    const project = testInfo.project.name
    const access = await loginViaApi(page)
    const id = await createFighter2024(page, access)

    await page.goto(`/characters/${id}`)
    await expect(page.getByText('Воин для уровней').first()).toBeVisible({ timeout: 45_000 })
    await openIdentity(page)

    await page.getByRole('button', { name: '+1 уровень' }).click()
    const dialog = page.getByRole('dialog').filter({ hasText: 'Повышение уровня' })
    await expect(dialog).toBeVisible()
    await expect(dialog).not.toContainText('PHB 2014')
    await expect(dialog).toContainText('2024')
    await page.waitForTimeout(400)
    await shot(page, 'dialog', project)
    await dialog.getByRole('button', { name: 'Повысить' }).click()
    await expect(dialog).toBeHidden()
    await shot(page, 'l2', project)
    await expect(page.getByText('Ячейки обновлены по таблице 2014')).toHaveCount(0)

    await openIdentity(page)
    await levelUpSameClass(page)
    // L3: 2024 queue asks for a subclass in the guided wizard.
    const wizard = page.getByRole('dialog').filter({ hasText: 'подкласс' })
    await expect(wizard.first()).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(400)
    await shot(page, 'l3-subclass', project)

    const combo = wizard.first().getByRole('combobox')
    await combo.fill('Чемпион')
    await page.getByRole('option', { name: 'Чемпион', exact: true }).click()
    await expect(wizard.first()).toBeHidden({ timeout: 15_000 })

    await openIdentity(page)
    await levelUpSameClass(page)
    const asi = page.getByRole('dialog').filter({ hasText: 'Увеличение характеристик' })
    await expect(asi.first()).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(400)
    await shot(page, 'l4-asi', project)

    await asi.first().getByRole('button', { name: /^СИЛ/ }).click()
    await asi.first().getByRole('button', { name: 'Готово' }).click()
    await expect(asi.first()).toBeHidden()
    await expect.poll(() => inputValues(page)).toContain('19')
    await shot(page, 'l4-asi-applied', project)

    await openIdentity(page)
    await page.getByRole('button', { name: '−1', exact: true }).click()
    await expect.poll(() => inputValues(page)).not.toContain('19')
    await expect(page.getByText('Воин 3').first()).toBeAttached()
    await expect(page.getByText('Ячейки обновлены по таблице 2014')).toHaveCount(0)
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
    await shot(page, 'l3-after-level-down', project)
  })
})
