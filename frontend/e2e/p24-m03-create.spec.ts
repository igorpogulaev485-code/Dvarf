import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ARTIFACTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../artifacts/p24-m03',
)

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

async function shot(page: Page, name: string, project: string) {
  await page.screenshot({
    path: path.join(ARTIFACTS, `${name}-${project}.png`),
    fullPage: true,
  })
}

async function selectCatalogCard(page: Page, title: string) {
  await page
    .locator('.create-pipeline__card')
    .filter({ hasText: title })
    .first()
    .click()
}

async function pickIds(page: Page, ids: string[]) {
  for (const id of ids) {
    await page.getByTestId(`p24-m03-pick-${id}`).click()
  }
}

async function next(page: Page) {
  await page.getByTestId('p24-m03-next').click()
}

async function walkClassStep(
  page: Page,
  opts: {
    classTitle: string
    skills: string[]
    mastery?: string[]
    fightingStyle?: string
    divineOrder?: string
  },
) {
  await expect(page.getByTestId('p24-m03-step-class')).toBeVisible()
  await selectCatalogCard(page, opts.classTitle)
  await pickIds(page, opts.skills)
  if (opts.mastery?.length) await pickIds(page, opts.mastery)
  if (opts.fightingStyle) await pickIds(page, [opts.fightingStyle])
  if (opts.divineOrder) await pickIds(page, [opts.divineOrder])
}

async function walkBackground(
  page: Page,
  opts: {
    title: string
    tool?: string
    magicInitiate?: { list: string; cantrips: string[]; spell: string }
  },
) {
  await expect(page.getByTestId('p24-m03-step-background')).toBeVisible()
  await selectCatalogCard(page, opts.title)
  if (opts.tool) await pickIds(page, [opts.tool])
  if (opts.magicInitiate) {
    await pickIds(page, [opts.magicInitiate.list])
    await pickIds(page, opts.magicInitiate.cantrips)
    await pickIds(page, [opts.magicInitiate.spell])
  }
}

async function walkSpecies(page: Page, title: string, extras: string[] = []) {
  await expect(page.getByTestId('p24-m03-step-species')).toBeVisible()
  await selectCatalogCard(page, title)
  if (extras.length) await pickIds(page, extras)
}

async function walkAbilities(page: Page) {
  await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
  await page.getByRole('button', { name: /Массив/i }).click()
  const priority = page.getByRole('button', { name: /Разложить по приоритету класса/i })
  if (await priority.count()) await priority.click()
}

async function walkLanguages(page: Page, ids: string[]) {
  await expect(page.getByTestId('p24-m03-step-languages')).toBeVisible()
  await pickIds(page, ids)
}

async function walkSpellsIfPresent(
  page: Page,
  picks: { cantrips: string[]; prepared: string[] },
) {
  const active = await page.locator('.create-pipeline__step--active').textContent()
  if (!active?.includes('Заклинания')) return false
  await expect(page.getByTestId('p24-m03-step-spells')).toBeVisible()
  await pickIds(page, picks.cantrips)
  await pickIds(page, picks.prepared)
  return true
}

async function walkSummary(page: Page, name: string) {
  await expect(page.getByTestId('p24-m03-step-summary')).toBeVisible()
  await page.getByTestId('p24-m03-name').fill(name)
  await page.getByTestId('p24-m03-finish').click()
}

test.describe('P24-M03 create 2024 wizard', () => {
  test('флаг закрыт; нет CTA 2024; 2014 create route жив', async ({ page }, testInfo) => {
    await page.goto('/dev/p24-m03-preview')
    await expect(page.getByTestId('p24-m03-preview')).toBeVisible()
    await expect(page.getByTestId('p24-m03-flag')).toContainText('false')

    await page.goto('/dev/p24-01-preview')
    await expect(page.getByTestId('create-character-2014')).toBeVisible()
    await expect(page.getByTestId('create-character-2024')).toHaveCount(0)

    await page.goto('/characters/create')
    await expect(page).toHaveURL(/\/(characters\/create|login)/)
    await shot(page, 'create-2014-route', testInfo.project.name)
  })

  for (const walk of [
    {
      key: 'fighter',
      classTitle: 'Воин',
      skills: ['athletics', 'perception'],
      mastery: ['longsword', 'longbow', 'battleaxe'],
      fightingStyle: 'defense',
      background: { title: 'Солдат', tool: 'dice-set' },
      species: { title: 'Дварф' },
      languages: ['elvish', 'dwarvish'],
      spells: null as null | { cantrips: string[]; prepared: string[] },
    },
    {
      key: 'wizard',
      classTitle: 'Волшебник',
      skills: ['arcana', 'history'],
      mastery: undefined as string[] | undefined,
      fightingStyle: undefined as string | undefined,
      background: {
        title: 'Мудрец',
        magicInitiate: {
          list: 'wizard',
          cantrips: ['fire-bolt', 'mage-hand'],
          spell: 'shield',
        },
      },
      species: { title: 'Эльф', extras: ['high-elf'] },
      languages: ['elvish', 'draconic'],
      spells: {
        cantrips: ['fire-bolt', 'light', 'prestidigitation'],
        prepared: ['shield', 'magic-missile', 'detect-magic', 'mage-armor'],
      },
    },
    {
      key: 'cleric',
      classTitle: 'Жрец',
      skills: ['insight', 'religion'],
      mastery: undefined as string[] | undefined,
      fightingStyle: undefined as string | undefined,
      divineOrder: 'protector',
      background: {
        title: 'Послушник',
        magicInitiate: {
          list: 'cleric',
          cantrips: ['sacred-flame', 'guidance'],
          spell: 'bless',
        },
      },
      species: { title: 'Человек', extras: ['medium'] },
      languages: ['celestial', 'common-sign-language'],
      spells: {
        cantrips: ['sacred-flame', 'guidance', 'thaumaturgy'],
        prepared: ['bless', 'cure-wounds', 'guiding-bolt', 'healing-word'],
      },
    },
  ] as const) {
    test(`wizard walk ${walk.key}`, async ({ page }, testInfo) => {
      const project = testInfo.project.name
      await page.goto('/dev/p24-m03-preview')
      await expect(page.getByTestId('p24-m03-preview')).toBeVisible()
      await expect(page.getByTestId('p24-m03-flag')).toContainText('false')

      await walkClassStep(page, {
        classTitle: walk.classTitle,
        skills: [...walk.skills],
        mastery: walk.mastery ? [...walk.mastery] : undefined,
        fightingStyle: walk.fightingStyle,
        divineOrder: 'divineOrder' in walk ? walk.divineOrder : undefined,
      })
      await shot(page, `${walk.key}-class`, project)
      await next(page)

      await walkBackground(page, {
        title: walk.background.title,
        tool: 'tool' in walk.background ? walk.background.tool : undefined,
        magicInitiate:
          'magicInitiate' in walk.background ? walk.background.magicInitiate : undefined,
      })
      await shot(page, `${walk.key}-background`, project)
      await next(page)

      await walkSpecies(
        page,
        walk.species.title,
        'extras' in walk.species ? [...walk.species.extras] : [],
      )
      await shot(page, `${walk.key}-species`, project)
      await next(page)

      await walkAbilities(page)
      await shot(page, `${walk.key}-abilities`, project)
      await next(page)

      await walkLanguages(page, [...walk.languages])
      await shot(page, `${walk.key}-languages`, project)
      await next(page)

      await expect(page.getByTestId('p24-m03-step-equipment')).toBeVisible()
      await shot(page, `${walk.key}-equipment`, project)
      await next(page)

      if (walk.spells) {
        const did = await walkSpellsIfPresent(page, walk.spells)
        expect(did).toBe(true)
        await shot(page, `${walk.key}-spells`, project)
        await next(page)
      }

      await walkSummary(page, `Превью-${walk.key}`)
      await shot(page, `${walk.key}-summary`, project)
      await expect(page.getByTestId('p24-m03-step-summary')).toContainText('Превью')
    })
  }
})
