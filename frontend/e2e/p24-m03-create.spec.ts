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
    path: path.join(ARTIFACTS, `${name}-${project}.png`),
    fullPage: true,
  })
}

async function ensurePhoneSetupOpen(page: Page) {
  const setup = page.locator('[data-testid$="-setup"]').first()
  if (await setup.isVisible().catch(() => false)) return
  const open = page.getByTestId('p24-m03-setup-open')
  if (!(await open.count())) return
  // Phone body scrolls inside `.create-pipeline__body`, not the window.
  await page.locator('.create-pipeline__body').evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await open.click({ force: true })
  await expect(setup).toBeVisible()
}

async function selectCatalogCard(page: Page, title: string) {
  await page
    .locator('.create-pipeline__card')
    .filter({ hasText: title })
    .first()
    .click()
  await ensurePhoneSetupOpen(page)
}

async function pickPrefixed(page: Page, prefix: string, ids: string[]) {
  for (const id of ids) {
    await page.getByTestId(`${prefix}-${id}`).click()
  }
}

async function next(page: Page) {
  const primary = page.getByRole('button', { name: 'Готово' })
  if (await primary.count()) {
    const dialog = page.locator('[data-testid$="-setup"]')
    if (await dialog.count()) {
      await primary.first().click()
    }
  }
  await page.getByTestId('p24-m03-next').click()
}

async function walkClass(
  page: Page,
  opts: {
    title: string
    skills: string[]
    mastery?: string[]
    style?: string
    order?: string
  },
) {
  await expect(page.getByTestId('p24-m03-step-class')).toBeVisible()
  await selectCatalogCard(page, opts.title)
  await pickPrefixed(page, 'p24-m03-pick-skill', opts.skills)
  if (opts.mastery?.length) await pickPrefixed(page, 'p24-m03-pick-mastery', opts.mastery)
  if (opts.style) await pickPrefixed(page, 'p24-m03-pick-style', [opts.style])
  if (opts.order) await pickPrefixed(page, 'p24-m03-pick-order', [opts.order])
}

async function walkBackground(
  page: Page,
  opts: {
    title: string
    tool?: string
    asiPlus2?: string
    asiPlus1?: string
    origin?: Array<{ prefix: string; ids: string[] }>
  },
) {
  await expect(page.getByTestId('p24-m03-step-background')).toBeVisible()
  await selectCatalogCard(page, opts.title)
  await pickPrefixed(page, 'p24-m03-pick-asi-mode', ['+2/+1'])
  if (opts.asiPlus2) await pickPrefixed(page, 'p24-m03-pick-asi-plus2', [opts.asiPlus2])
  if (opts.asiPlus1) await pickPrefixed(page, 'p24-m03-pick-asi-plus1', [opts.asiPlus1])
  if (opts.tool) await pickPrefixed(page, 'p24-m03-pick-bg-tool', [opts.tool])
  for (const group of opts.origin || []) {
    await pickPrefixed(page, group.prefix, group.ids)
  }
}

async function walkSpecies(
  page: Page,
  opts: {
    title: string
    size?: string
    lineage?: string
    ancestry?: string
    form?: string
    skills?: string[]
    tools?: string[]
    ability?: string
    humanFeat?: string
    humanFeatPicks?: Array<{ prefix: string; ids: string[] }>
  },
) {
  await expect(page.getByTestId('p24-m03-step-species')).toBeVisible()
  await selectCatalogCard(page, opts.title)
  if (opts.size) await pickPrefixed(page, 'p24-m03-pick-size', [opts.size])
  if (opts.lineage) await pickPrefixed(page, 'p24-m03-pick-lineage', [opts.lineage])
  if (opts.ancestry) await pickPrefixed(page, 'p24-m03-pick-ancestry', [opts.ancestry])
  if (opts.form) await pickPrefixed(page, 'p24-m03-pick-species-form', [opts.form])
  if (opts.skills?.length) await pickPrefixed(page, 'p24-m03-pick-species-skills', opts.skills)
  if (opts.tools?.length) await pickPrefixed(page, 'p24-m03-pick-species-tools', opts.tools)
  if (opts.ability) await pickPrefixed(page, 'p24-m03-pick-species-ability', [opts.ability])
  if (opts.humanFeat) {
    await pickPrefixed(page, 'p24-m03-pick-human-feat', [opts.humanFeat])
    for (const group of opts.humanFeatPicks || []) {
      await pickPrefixed(page, group.prefix, group.ids)
    }
  }
}

async function walkAbilities(page: Page) {
  await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
  await page.getByRole('button', { name: /Массив/i }).click()
}

async function walkLanguages(page: Page, ids: string[]) {
  await expect(page.getByTestId('p24-m03-step-languages')).toBeVisible()
  for (const id of ids) {
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
  // Visible step chips / pick labels: no long Latin tokens (allow abbreviations like КД).
  const labels = await page.locator('.create-pipeline__step-label, .create-2024__pick-grid button, .create-pipeline__card-title').allTextContents()
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

test.describe('P24-M03 create 2024 wizard', () => {
  test('нет CTA 2024; мастер 2014 маршрут жив; без служебного текста', async ({
    page,
  }, testInfo) => {
    await page.goto('/characters/create')
    await expect(page).toHaveURL(/\/(characters\/create|login)/)
    await expect(page.getByTestId('create-character-2024')).toHaveCount(0)
    await shot(page, 'create-2014-route', testInfo.project.name)

    // Fixtures harness is DEV-only smoke — not the live create path.
    await page.goto('/dev/p24-m03-preview')
    await expect(page.getByTestId('p24-m03-preview')).toBeVisible()
    await assertNoServiceLatin(page)
  })

  for (const walk of [
    {
      key: 'fighter',
      class: {
        title: 'Воин',
        skills: ['athletics', 'perception'],
        mastery: ['longsword', 'longbow', 'battleaxe'],
        style: 'defense',
      },
      background: {
        title: 'Солдат',
        tool: 'dice-set',
        asiPlus2: 'str',
        asiPlus1: 'con',
      },
      species: { title: 'Дварф' },
      languages: ['elvish', 'dwarvish'],
      spells: null as null | { cantrips: string[]; prepared: string[] },
    },
    {
      key: 'wizard',
      class: { title: 'Волшебник', skills: ['arcana', 'history'] },
      background: {
        title: 'Мудрец',
        asiPlus2: 'int',
        asiPlus1: 'wis',
        origin: [
          { prefix: 'p24-m03-pick-origin-list', ids: ['wizard'] },
          { prefix: 'p24-m03-pick-origin-cantrips', ids: ['fire-bolt', 'mage-hand'] },
          { prefix: 'p24-m03-pick-origin-spell', ids: ['shield'] },
          { prefix: 'p24-m03-pick-origin-ability', ids: ['int'] },
        ],
      },
      species: {
        title: 'Эльф',
        lineage: 'high-elf',
        skills: ['perception'],
        ability: 'int',
      },
      languages: ['elvish', 'draconic'],
      spells: {
        cantrips: ['fire-bolt', 'light', 'prestidigitation'],
        prepared: ['shield', 'magic-missile', 'detect-magic', 'mage-armor'],
      },
    },
    {
      key: 'cleric',
      class: {
        title: 'Жрец',
        skills: ['insight', 'religion'],
        order: 'protector',
      },
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
      },
      species: {
        title: 'Человек',
        size: 'medium',
        skills: ['athletics'],
        humanFeat: 'alert',
      },
      languages: ['celestial', 'common-sign-language'],
      spells: {
        cantrips: ['sacred-flame', 'guidance', 'thaumaturgy'],
        prepared: ['bless', 'cure-wounds', 'guiding-bolt', 'healing-word'],
      },
    },
    {
      key: 'warforged-artisan',
      class: {
        title: 'Воин',
        skills: ['athletics', 'perception'],
        mastery: ['longsword', 'mace', 'javelin'],
        style: 'defense',
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
      },
      species: {
        title: 'Кованый',
        size: 'medium',
        skills: ['athletics'],
        tools: ['smiths-tools'],
      },
      languages: ['goblin', 'dwarvish'],
      spells: null,
      nonSrd: true,
    },
  ] as const) {
    test(`live create ${walk.key}`, async ({ page }, testInfo) => {
      test.skip(process.env.P24_E2E_SKIP_LIVE === '1', 'live API skipped')
      const project = testInfo.project.name
      await loginViaApi(page)
      await page.goto('/characters/create-2024?preview=1')
      await expect(page.getByTestId('p24-m03-step-class')).toBeVisible({ timeout: 45_000 })
      await assertNoServiceLatin(page)

      await walkClass(page, walk.class)
      await shot(page, `${walk.key}-class`, project)
      await next(page)

      await walkBackground(page, walk.background)
      await shot(page, `${walk.key}-background`, project)
      await next(page)

      await walkSpecies(page, walk.species)
      await shot(page, `${walk.key}-species`, project)
      await next(page)

      await walkAbilities(page)
      await shot(page, `${walk.key}-abilities`, project)
      await next(page)

      await walkLanguages(page, [...walk.languages])
      await shot(page, `${walk.key}-languages`, project)
      await next(page)

      await expect(page.getByTestId('p24-m03-step-equipment')).toBeVisible()
      await expect(page.getByTestId('p24-m03-equipment-items')).toBeVisible()
      await shot(page, `${walk.key}-equipment`, project)
      await next(page)

      if (walk.spells) {
        await expect(page.getByTestId('p24-m03-step-spells')).toBeVisible()
        for (const id of walk.spells.cantrips) {
          await page.getByTestId(`p24-m03-card-${id}`).click()
        }
        await page.getByTestId('p24-m03-spell-tab-level1').click()
        for (const id of walk.spells.prepared) {
          await page.getByTestId(`p24-m03-card-${id}`).click()
        }
        await shot(page, `${walk.key}-spells`, project)
        await next(page)
      }

      await expect(page.getByTestId('p24-m03-step-summary')).toBeVisible()
      await page.getByTestId('p24-m03-name').fill(`Герой ${walk.key}`)
      await page.getByTestId('p24-m03-gender-male').click()
      await expect(page.getByTestId('p24-m03-sheet-preview')).toBeVisible()
      await expect(page.getByTestId('p24-m03-sheet-hp')).toBeVisible()
      await shot(page, `${walk.key}-summary`, project)
      await assertNoServiceLatin(page)

      await page.getByTestId('p24-m03-finish').click()
      await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}/i, { timeout: 45_000 })
      await shot(page, `${walk.key}-sheet-open`, project)
    })
  }
})
