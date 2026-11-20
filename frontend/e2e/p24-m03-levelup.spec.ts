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

const WIZARD_BOOK = ['shield', 'magic-missile', 'detect-magic', 'mage-armor', 'sleep', 'burning-hands']

async function createWizard2024(page: Page, access: string): Promise<string> {
  const res = await page.request.post(`${API}/characters/create-2024`, {
    headers: { authorization: `Bearer ${access}` },
    data: {
      name: 'Волшебник для книги',
      is_preview: true,
      class_slug: 'wizard',
      background_slug: 'soldier',
      species_slug: 'dwarf',
      ability_method: 'standard_array',
      base_abilities: { str: 8, dex: 13, con: 14, int: 15, wis: 10, cha: 12 },
      background_asi_mode: '+2/+1',
      background_asi: { str: 2, con: 1 },
      language_ids: ['elvish', 'dwarvish'],
      class_skill_ids: ['arcana', 'history'],
      background_tool_id: 'dice-set',
      background_equipment: 'pack',
      class_equipment: 'a',
      cantrip_ids: ['fire-bolt', 'light', 'prestidigitation'],
      spellbook_spell_ids: WIZARD_BOOK,
      prepared_spell_ids: WIZARD_BOOK.slice(0, 4),
    },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  return String((await res.json()).id)
}

async function bookSpellCount(page: Page, access: string, id: string): Promise<number> {
  const res = await page.request.get(`${API}/characters/${id}`, {
    headers: { authorization: `Bearer ${access}` },
  })
  const body = await res.json()
  const known = (body.sheet?.spells?.known ?? []) as Array<{ level: number; in_spellbook?: boolean }>
  return known.filter((row) => row.level >= 1 && row.in_spellbook).length
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

type SheetJson = {
  classes?: Array<{ name?: string; level?: number }>
  abilities?: Record<string, { score: number }>
  proficiency?: { armor?: Record<string, boolean>; weapons?: Record<string, boolean> }
  spells?: { slots?: Record<string, { max?: number; used?: number } | number> }
  [key: string]: unknown
}

async function getSheet(page: Page, access: string, id: string): Promise<SheetJson> {
  const res = await page.request.get(`${API}/characters/${id}`, {
    headers: { authorization: `Bearer ${access}` },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  return ((await res.json()).sheet ?? {}) as SheetJson
}

async function slotMax(page: Page, access: string, id: string, level: string): Promise<number> {
  const slot = (await getSheet(page, access, id)).spells?.slots?.[level]
  if (typeof slot === 'number') return slot
  return slot?.max ?? 0
}

async function setAbilityScore(
  page: Page,
  access: string,
  id: string,
  key: string,
  score: number,
) {
  const detail = await page.request.get(`${API}/characters/${id}`, {
    headers: { authorization: `Bearer ${access}` },
  })
  const body = (await detail.json()) as { sheet: SheetJson; sheet_version: number }
  const abilities = { ...(body.sheet.abilities ?? {}), [key]: { score } }
  const res = await page.request.patch(`${API}/characters/${id}`, {
    headers: { authorization: `Bearer ${access}` },
    data: { sheet: { ...body.sheet, abilities }, sheet_version: body.sheet_version },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
}

async function createCharacter2024(
  page: Page,
  access: string,
  data: Record<string, unknown>,
): Promise<string> {
  const res = await page.request.post(`${API}/characters/create-2024`, {
    headers: { authorization: `Bearer ${access}` },
    data: { is_preview: true, ...data },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  return String((await res.json()).id)
}

async function openMulticlassDialog(page: Page) {
  await page.getByRole('button', { name: '+1 уровень' }).click()
  const dialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Повышение уровня', exact: true }),
  })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Мультикласс', exact: true }).click()
  await expect(dialog.getByText('Новый класс')).toBeVisible()
  return dialog
}

/** Class-feature picks that open right after a multiclass level (e.g. Fighting Style) can wait. */
async function postponeGuidedWizard(page: Page) {
  const later = page.getByRole('dialog').getByRole('button', { name: 'Позже' })
  while (await later.first().isVisible({ timeout: 2_500 }).catch(() => false)) {
    await later.first().click()
  }
  await expect(page.locator('.ui-dialog-backdrop')).toHaveCount(0)
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

  test('волшебник 2024: +2 в книгу на 2 ур., −1 снимает их', async ({ page }, testInfo) => {
    const project = testInfo.project.name
    const access = await loginViaApi(page)
    const id = await createWizard2024(page, access)
    expect(await bookSpellCount(page, access, id)).toBe(6)

    await page.goto(`/characters/${id}`)
    await expect(page.getByText('Волшебник для книги').first()).toBeVisible({ timeout: 45_000 })
    await openIdentity(page)
    await page.getByRole('button', { name: '+1 уровень' }).click()
    const levelDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: 'Повышение уровня', exact: true }),
    })
    await levelDialog.getByRole('button', { name: 'Повысить' }).click()

    const book = page.getByRole('dialog').filter({ hasText: 'Книга заклинаний' })
    await expect(book.first()).toBeVisible({ timeout: 15_000 })
    await expect(book.first()).toContainText('+2 бесплатно в книгу')
    await shot(page, 'wizard-l2-book-picks', project)
    const picks = book.first().getByRole('button', { name: 'В книгу' })
    await picks.first().click()
    await picks.first().click()
    await book.first().getByRole('button', { name: 'Готово' }).click()
    await expect(book.first()).toBeHidden({ timeout: 15_000 })
    await expect.poll(() => bookSpellCount(page, access, id), { timeout: 20_000 }).toBe(8)
    await shot(page, 'wizard-l2-after-book-picks', project)

    await openIdentity(page)
    await page.getByRole('button', { name: '−1', exact: true }).click()
    await expect.poll(() => bookSpellCount(page, access, id), { timeout: 20_000 }).toBe(6)
  })

  test('мультикласс 2024: воин 3 → волшебник 1 (требования, откат)', async ({ page }, testInfo) => {
    const project = testInfo.project.name
    const access = await loginViaApi(page)
    const id = await createFighter2024(page, access)

    await page.goto(`/characters/${id}`)
    await expect(page.getByText('Воин для уровней').first()).toBeVisible({ timeout: 45_000 })

    await openIdentity(page)
    await levelUpSameClass(page)
    await openIdentity(page)
    await levelUpSameClass(page)
    const subclassWizard = page.getByRole('dialog').filter({ hasText: 'подкласс' })
    await expect(subclassWizard.first()).toBeVisible({ timeout: 15_000 })
    await subclassWizard.first().getByRole('combobox').fill('Чемпион')
    await page.getByRole('option', { name: 'Чемпион', exact: true }).click()
    await expect(subclassWizard.first()).toBeHidden({ timeout: 15_000 })
    await expect
      .poll(async () => (await getSheet(page, access, id)).classes?.[0]?.level, { timeout: 20_000 })
      .toBe(3)

    // ИНТ 8: волшебник закрыт требованиями 2024.
    await openIdentity(page)
    let dialog = await openMulticlassDialog(page)
    await expect(dialog).toContainText('редакция 2024')
    const combo = dialog.getByRole('combobox')
    await combo.fill('Волшебник')
    await expect(page.getByRole('option', { name: 'Волшебник', exact: true })).toHaveCount(0)
    await page.waitForTimeout(300)
    await shot(page, 'mc-dialog-wizard-gated', project)
    await combo.fill('Плут')
    await expect(page.getByRole('option', { name: 'Плут', exact: true })).toBeVisible()
    await page.waitForTimeout(300)
    await shot(page, 'mc-dialog-gated', project)
    await dialog.getByRole('button', { name: 'Отмена' }).click()
    await expect(dialog).toBeHidden()

    // ИНТ 14: волшебник доступен.
    await setAbilityScore(page, access, id, 'int', 14)
    await page.reload()
    await expect(page.getByText('Воин для уровней').first()).toBeVisible({ timeout: 45_000 })
    await openIdentity(page)
    dialog = await openMulticlassDialog(page)
    await dialog.getByRole('combobox').fill('Волшебник')
    await page.getByRole('option', { name: 'Волшебник', exact: true }).click()
    await expect(dialog.locator('.ui-text--danger')).toHaveCount(0)
    await page.waitForTimeout(300)
    await shot(page, 'mc-dialog-pick', project)
    await dialog.getByRole('button', { name: 'Повысить' }).click()
    await expect(dialog).toBeHidden()
    await postponeGuidedWizard(page)

    await expect
      .poll(
        async () => {
          const sheet = await getSheet(page, access, id)
          return (sheet.classes ?? []).map((row) => `${row.name} ${row.level}`).join(' / ')
        },
        { timeout: 20_000 },
      )
      .toBe('Воин 3 / Волшебник 1')
    await expect.poll(() => slotMax(page, access, id, '1')).toBe(2)

    await openIdentity(page)
    await expect(page.getByText('Воин 3', { exact: false }).first()).toBeAttached()
    await expect(page.getByText('Волшебник 1', { exact: false }).first()).toBeAttached()
    await page.waitForTimeout(300)
    await shot(page, 'mc-sheet-identity', project)
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
    await page.waitForTimeout(300)
    await shot(page, 'mc-sheet', project)
    await openIdentity(page)

    // −1 на строке волшебника снимает класс целиком.
    await page.getByRole('button', { name: '−1', exact: true }).last().click()
    await expect
      .poll(
        async () => {
          const sheet = await getSheet(page, access, id)
          return (sheet.classes ?? []).map((row) => `${row.name} ${row.level}`).join(' / ')
        },
        { timeout: 20_000 },
      )
      .toBe('Воин 3')
    await expect.poll(() => slotMax(page, access, id, '1')).toBe(0)
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
    await shot(page, 'mc-sheet-after-rollback', project)
  })

  test('мультикласс 2024: владения воина (MULTICLASS_PROFICIENCIES_2024) и откат', async ({
    page,
  }, testInfo) => {
    const project = testInfo.project.name
    const access = await loginViaApi(page)
    const id = await createCharacter2024(page, access, {
      name: 'Маг-мультикласс',
      class_slug: 'wizard',
      background_slug: 'soldier',
      species_slug: 'dwarf',
      ability_method: 'standard_array',
      base_abilities: { str: 13, dex: 14, con: 12, int: 15, wis: 8, cha: 10 },
      background_asi_mode: '+2/+1',
      background_asi: { str: 2, con: 1 },
      language_ids: ['elvish', 'dwarvish'],
      class_skill_ids: ['arcana', 'history'],
      background_tool_id: 'dice-set',
      background_equipment: 'pack',
      class_equipment: 'a',
      cantrip_ids: ['fire-bolt', 'light', 'prestidigitation'],
      spellbook_spell_ids: WIZARD_BOOK,
      prepared_spell_ids: WIZARD_BOOK.slice(0, 4),
    })
    const armorOf = async () => (await getSheet(page, access, id)).proficiency?.armor ?? {}

    await page.goto(`/characters/${id}`)
    await expect(page.getByText('Маг-мультикласс').first()).toBeVisible({ timeout: 45_000 })
    expect(Boolean((await armorOf()).medium)).toBe(false)

    await openIdentity(page)
    const dialog = await openMulticlassDialog(page)
    await dialog.getByRole('combobox').fill('Воин')
    await page.getByRole('option', { name: 'Воин', exact: true }).click()
    await dialog.getByRole('button', { name: 'Повысить' }).click()
    await expect(dialog).toBeHidden()
    await postponeGuidedWizard(page)

    await expect
      .poll(async () => (await armorOf()).medium, { timeout: 20_000 })
      .toBe(true)
    const armor = await armorOf()
    expect(armor.light).toBe(true)
    expect(armor.shields).toBe(true)
    expect(Boolean(armor.heavy)).toBe(false)
    const weapons = (await getSheet(page, access, id)).proficiency?.weapons ?? {}
    expect(weapons.martial).toBe(true)
    await page.waitForTimeout(300)
    await shot(page, 'mc-fighter-granted', project)

    await openIdentity(page)
    await page.getByRole('button', { name: '−1', exact: true }).last().click()
    await expect
      .poll(async () => Boolean((await armorOf()).medium), { timeout: 20_000 })
      .toBe(false)
    expect(Boolean(((await getSheet(page, access, id)).proficiency?.weapons ?? {}).martial)).toBe(false)
  })
})
