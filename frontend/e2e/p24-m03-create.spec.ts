import { expect, test, type Locator, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ARTIFACTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../artifacts/p24-m03',
)
const API = process.env.P24_E2E_API || 'http://127.0.0.1:8000'
const CREATE_2024_URL = '/characters/create?edition=2024&preview=1'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

async function shot(page: Page, name: string, project: string) {
  await page.screenshot({
    path: path.join(ARTIFACTS, `${name}-${project}.png`),
    fullPage: true,
  })
}

type PickGroup = { prefix: string; ids: string[] }

async function pickPrefixed(page: Page, prefix: string, ids: string[]) {
  for (const id of ids) {
    const chip = page.getByTestId(`${prefix}-${id}`)
    await chip.scrollIntoViewIfNeeded()
    // Single-choice groups toggle off on a repeated click: only click what is not on yet.
    if ((await chip.getAttribute('aria-checked')) === 'true') continue
    await chip.click()
    await expect(chip).toHaveAttribute('aria-checked', 'true')
  }
}

async function pickGroups(page: Page, groups: PickGroup[] = []) {
  for (const group of groups) await pickPrefixed(page, group.prefix, group.ids)
}

function setupDialog(page: Page): Locator {
  return page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: /^Настроить/ }) })
}

/** Phone: card click opens the setup dialog; reopen via `p24-m03-setup-open` if it is closed. */
async function ensureSetupOpen(page: Page) {
  const setup = page.locator('[data-testid$="-setup"]').first()
  const visible = await setup
    .waitFor({ state: 'visible', timeout: 3_000 })
    .then(() => true)
    .catch(() => false)
  if (!visible) {
    const open = page.getByTestId('p24-m03-setup-open')
    await expect(open).toBeVisible()
    await open.click()
  }
  await expect(setup).toBeVisible()
}

async function closeSetupDialog(page: Page) {
  const dialog = setupDialog(page)
  if (!(await dialog.count())) return
  await dialog.getByRole('button', { name: 'Готово' }).click()
  await expect(dialog).toHaveCount(0)
}

async function next(page: Page) {
  await closeSetupDialog(page)
  const button = page.getByTestId('p24-m03-next')
  await expect(button).toBeEnabled()
  await button.click()
}

async function selectCatalogCard(page: Page, title: string) {
  const card = page
    .locator('.create-pipeline__card')
    .filter({
      has: page.locator('.create-pipeline__card-title', {
        hasText: new RegExp(`^${title}$`),
      }),
    })
    .first()
  await card.scrollIntoViewIfNeeded()
  await card.click()
  await ensureSetupOpen(page)
}

/** Safety net for species picks the walk data does not know about (e.g. lineage names). */
async function fillUnderfilledPicks(page: Page) {
  const grids = page.locator('[data-testid$="-setup"] .create-2024__pick-grid')
  const count = await grids.count()
  for (let i = 0; i < count; i += 1) {
    const grid = grids.nth(i)
    const head = (await grid.locator('xpath=preceding-sibling::h3[1]').textContent()) ?? ''
    const m = head.match(/\((\d+)\/(\d+)\)/)
    if (!m) continue
    let need = Number(m[2]) - Number(m[1])
    const chips = grid.locator('[role="checkbox"][aria-checked="false"]:not([disabled])')
    while (need > 0 && (await chips.count())) {
      await chips.first().click()
      need -= 1
    }
  }
}

type SpeciesWalk = {
  title: string
  size?: string
  anyLineage?: boolean
  picks?: PickGroup[]
}

type BackgroundWalk = {
  title: string
  asiPlus2: string
  asiPlus1: string
  tool?: string
  origin?: PickGroup[]
  languages: string[]
  equipment: 'pack' | 'gold'
}

type ClassWalk = {
  title: string
  skills: string[]
  mastery?: string[]
  style?: string
  order?: string
  equipment: 'a' | 'b' | 'gold'
}

type SpellWalk = { cantrips: string[]; prepared: string[] }

type Walk = {
  key: string
  name: string
  species: SpeciesWalk
  background: BackgroundWalk
  class: ClassWalk
  spells: SpellWalk | null
}

async function walkSpecies(page: Page, walk: Walk) {
  await expect(page.getByTestId('p24-m03-step-species')).toBeVisible()
  await selectCatalogCard(page, walk.species.title)
  // Name and gender live in the species setup (and are repeated on leveling).
  await page.getByTestId('p24-m03-name').fill(walk.name)
  await page.getByTestId('p24-m03-gender-male').click()
  if (walk.species.size) await pickPrefixed(page, 'p24-m03-pick-size', [walk.species.size])
  if (walk.species.anyLineage) {
    const lineage = page.locator('[data-testid^="p24-m03-pick-lineage-"]').first()
    if (await lineage.count()) {
      await lineage.scrollIntoViewIfNeeded()
      if ((await lineage.getAttribute('aria-checked')) !== 'true') await lineage.click()
    }
  }
  await pickGroups(page, walk.species.picks)
  await fillUnderfilledPicks(page)
}

async function walkBackground(page: Page, walk: Walk) {
  const bg = walk.background
  await expect(page.getByTestId('p24-m03-step-background')).toBeVisible()
  await selectCatalogCard(page, bg.title)
  await pickPrefixed(page, 'p24-m03-pick-asi-mode', ['+2/+1'])
  await pickPrefixed(page, 'p24-m03-pick-asi-plus2', [bg.asiPlus2])
  await pickPrefixed(page, 'p24-m03-pick-asi-plus1', [bg.asiPlus1])
  if (bg.tool) await pickPrefixed(page, 'p24-m03-pick-bg-tool', [bg.tool])
  await pickGroups(page, bg.origin)
  await pickPrefixed(page, 'p24-m03-pick-language', bg.languages)
  await pickPrefixed(page, 'p24-m03-pick-bg-equipment', [bg.equipment])
}

async function walkClass(page: Page, walk: Walk) {
  const cls = walk.class
  await expect(page.getByTestId('p24-m03-step-class')).toBeVisible()
  await selectCatalogCard(page, cls.title)
  await pickPrefixed(page, 'p24-m03-pick-skill', cls.skills)
  if (cls.mastery?.length) await pickPrefixed(page, 'p24-m03-pick-mastery', cls.mastery)
  if (cls.style) await pickPrefixed(page, 'p24-m03-pick-style', [cls.style])
  if (cls.order) await pickPrefixed(page, 'p24-m03-pick-order', [cls.order])
  await pickPrefixed(page, 'p24-m03-pick-class-equipment', [cls.equipment])
}

async function walkSpells(page: Page, spells: SpellWalk) {
  await expect(page.getByTestId('p24-m03-step-spells')).toBeVisible()
  for (const id of spells.cantrips) {
    await page.getByTestId(`p24-m03-card-${id}`).click()
  }
  await page.getByTestId('p24-m03-spell-tab-level1').click()
  for (const id of spells.prepared) {
    await page.getByTestId(`p24-m03-card-${id}`).click()
  }
}

/** Visible UI must not show service English / fixture banners. */
async function assertNoServiceLatin(page: Page) {
  const body = await page.locator('main').innerText()
  const forbidden = [
    'RULES_EDITION_2024_OPEN',
    'фикстуры',
    'ASI',
    'srd-5.2',
    'common +',
    'pack',
    'Превью-fighter',
    'локальный превью',
    'preview-fighter',
  ]
  for (const word of forbidden) {
    expect(body, `forbidden «${word}»`).not.toContain(word)
  }
  const labels = await page
    .locator(
      '.create-pipeline__step-label, .create-2024__pick-grid .ui-toggle-chip__main, .create-pipeline__card-title',
    )
    .allTextContents()
  for (const label of labels) {
    const trimmed = label.trim()
    if (!trimmed) continue
    expect(trimmed, `latin label «${trimmed}»`).not.toMatch(/[A-Za-z]{4,}/)
  }
}

async function loginViaApi(page: Page) {
  const email = `m03_${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`
  const password = 'TestPass123!'
  const reg = await page.request.post(`${API}/auth/register`, {
    data: { email, password, display_name: 'M03 Тестер' },
  })
  expect(reg.ok(), await reg.text()).toBeTruthy()
  const regBody = await reg.json()
  const verifyUrl = String(regBody.debug_verify_url || '')
  const token = new URL(verifyUrl).searchParams.get('token')
  expect(token).toBeTruthy()
  const verified = await page.request.post(`${API}/auth/verify-email`, {
    data: { token },
  })
  expect(verified.ok(), await verified.text()).toBeTruthy()
  const tokens = await verified.json()
  // Seed storage on a same-origin document first (more reliable than initScript alone).
  await page.goto('/')
  await page.evaluate(
    ([access, refresh]) => {
      localStorage.setItem('dvarf.access_token', access)
      localStorage.setItem('dvarf.refresh_token', refresh)
    },
    [tokens.access_token as string, tokens.refresh_token as string],
  )
  return { email, password }
}

const WALKS: Walk[] = [
  {
    key: 'fighter',
    name: 'Герой воин',
    species: { title: 'Дварф' },
    background: {
      title: 'Солдат',
      tool: 'dice-set',
      asiPlus2: 'str',
      asiPlus1: 'con',
      languages: ['elvish', 'dwarvish'],
      equipment: 'pack',
    },
    class: {
      title: 'Воин',
      skills: ['athletics', 'perception'],
      mastery: ['longsword', 'longbow', 'battleaxe'],
      style: 'defense',
      equipment: 'a',
    },
    spells: null,
  },
  {
    key: 'wizard',
    name: 'Герой волшебник',
    species: { title: 'Эльф', anyLineage: true },
    background: {
      title: 'Мудрец',
      asiPlus2: 'int',
      asiPlus1: 'con',
      origin: [
        { prefix: 'p24-m03-pick-origin-list', ids: ['wizard'] },
        { prefix: 'p24-m03-pick-origin-cantrips', ids: ['fire-bolt', 'mage-hand'] },
        { prefix: 'p24-m03-pick-origin-spell', ids: ['shield'] },
        { prefix: 'p24-m03-pick-origin-ability', ids: ['int'] },
      ],
      languages: ['elvish', 'draconic'],
      equipment: 'pack',
    },
    class: {
      title: 'Волшебник',
      skills: ['arcana', 'history'],
      equipment: 'a',
    },
    spells: {
      cantrips: ['fire-bolt', 'light', 'prestidigitation'],
      prepared: ['shield', 'magic-missile', 'detect-magic', 'mage-armor'],
    },
  },
  {
    key: 'cleric',
    name: 'Герой жрец',
    species: { title: 'Дварф' },
    background: {
      title: 'Послушник',
      asiPlus2: 'wis',
      asiPlus1: 'cha',
      origin: [
        { prefix: 'p24-m03-pick-origin-list', ids: ['cleric'] },
        { prefix: 'p24-m03-pick-origin-cantrips', ids: ['sacred-flame', 'guidance'] },
        { prefix: 'p24-m03-pick-origin-spell', ids: ['bless'] },
        { prefix: 'p24-m03-pick-origin-ability', ids: ['wis'] },
      ],
      languages: ['celestial', 'elvish'],
      equipment: 'pack',
    },
    class: {
      title: 'Жрец',
      skills: ['insight', 'religion'],
      order: 'protector',
      equipment: 'a',
    },
    spells: {
      cantrips: ['sacred-flame', 'guidance', 'thaumaturgy'],
      prepared: ['bless', 'cure-wounds', 'guiding-bolt', 'healing-word'],
    },
  },
  {
    key: 'warforged-artisan',
    name: 'Герой кованый',
    species: {
      title: 'Кованый',
      size: 'medium',
      picks: [{ prefix: 'p24-m03-pick-species-tools', ids: ['smiths-tools'] }],
    },
    background: {
      title: 'Ремесленник',
      asiPlus2: 'str',
      asiPlus1: 'dex',
      tool: 'smiths-tools',
      origin: [
        {
          prefix: 'p24-m03-pick-origin-tools',
          ids: ['alchemists-supplies', 'smiths-tools', 'tinkers-tools'],
        },
      ],
      languages: ['goblin', 'dwarvish'],
      equipment: 'pack',
    },
    class: {
      title: 'Воин',
      skills: ['athletics', 'perception'],
      mastery: ['longsword', 'mace', 'javelin'],
      style: 'defense',
      equipment: 'a',
    },
    spells: null,
  },
]

test.describe('P24-M03 create 2024 wizard v2', () => {
  test('без edition: мастер 2014 жив, нет CTA 2024, нет служебного текста', async ({
    page,
  }, testInfo) => {
    const project = testInfo.project.name
    await loginViaApi(page)

    await page.goto('/characters')
    await expect(page.getByTestId('create-character-2024')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /2024/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /2024/ })).toHaveCount(0)

    await page.goto('/characters/create')
    await expect(page.locator('.create-pipeline')).toBeVisible({ timeout: 45_000 })
    // Subtitle is hidden on phone, so check it is attached and the first step chip says «Раса».
    await expect(page.getByText(/^Раса → черта\*/)).toBeAttached()
    await expect(page.locator('.create-pipeline__step-label').first()).toHaveText('Раса')
    await expect(page.getByTestId('create-character-2024')).toHaveCount(0)
    await expect(page.getByTestId('p24-m03-step-species')).toHaveCount(0)
    await shot(page, 'create-2014-route', project)
  })

  test('вход 2024 по ?edition=2024&preview=1: порядок шагов, без латиницы', async ({
    page,
  }, testInfo) => {
    test.skip(process.env.P24_E2E_SKIP_LIVE === '1', 'live API skipped')
    await loginViaApi(page)
    await page.goto(CREATE_2024_URL)
    await expect(page.getByTestId('create-character-2024')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByTestId('p24-m03-step-species')).toBeVisible({ timeout: 45_000 })

    const labels = (await page.locator('.create-pipeline__step-label').allTextContents()).map(
      (l) => l.trim(),
    )
    expect(labels.slice(0, 1)).toEqual(['Вид'])
    expect(labels).not.toContain('Черта')
    expect(labels.indexOf('Предыстория')).toBeLessThan(labels.indexOf('Класс'))
    expect(labels.indexOf('Класс')).toBeLessThan(labels.indexOf('Характеристики'))
    await assertNoServiceLatin(page)
    await shot(page, 'create-2024-entry', testInfo.project.name)
  })

  for (const walk of WALKS) {
    test(`live create ${walk.key}`, async ({ page }, testInfo) => {
      test.skip(process.env.P24_E2E_SKIP_LIVE === '1', 'live API skipped')
      const project = testInfo.project.name
      await loginViaApi(page)
      await page.goto(CREATE_2024_URL)
      await expect(page.getByTestId('p24-m03-step-species')).toBeVisible({ timeout: 45_000 })
      await assertNoServiceLatin(page)

      await walkSpecies(page, walk)
      await shot(page, `${walk.key}-species`, project)
      await assertNoServiceLatin(page)
      await next(page)

      // Feat step exists for Human only; none of the walks use Human.
      await expect(page.getByTestId('p24-m03-step-feat')).toHaveCount(0)

      await walkBackground(page, walk)
      await shot(page, `${walk.key}-background`, project)
      await assertNoServiceLatin(page)
      await next(page)

      await walkClass(page, walk)
      await shot(page, `${walk.key}-class`, project)
      await assertNoServiceLatin(page)
      await next(page)

      await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
      await shot(page, `${walk.key}-abilities`, project)
      await next(page)

      await expect(page.getByTestId('p24-m03-step-leveling')).toBeVisible()
      await expect(page.getByTestId('p24-m03-name')).toHaveValue(walk.name)
      if (walk.spells) await walkSpells(page, walk.spells)
      await expect(page.getByTestId('p24-m03-finish')).toBeEnabled()
      await shot(page, `${walk.key}-leveling`, project)
      await assertNoServiceLatin(page)

      await page.getByTestId('p24-m03-finish').click()
      await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}/i, { timeout: 45_000 })
      await shot(page, `${walk.key}-sheet-open`, project)
    })
  }
})
