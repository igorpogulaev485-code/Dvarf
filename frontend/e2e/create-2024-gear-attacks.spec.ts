/**
 * Evidence: 2024 create emits weapon attack cards; background tools are Russian.
 * Artifacts → /opt/cursor/artifacts/create-2024-gear-attacks/
 */
import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  createStore,
  installWarlockHarness,
  runCreate2024Bridge,
  seedCharacterFromCreate,
} from './support/warlock2024Harness'

const OUT = '/opt/cursor/artifacts/create-2024-gear-attacks'

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

async function dismissDiff(page: Page) {
  const dialog = page.getByTestId('edition-2024-diff-dialog')
  if (await dialog.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Понятно' }).click()
  }
}

/** Same shape as backend `build_valid_payload('fighter', class_equipment='a')`. */
const FIGHTER_PAYLOAD = {
  name: 'Воин-доказательство',
  class_slug: 'fighter',
  background_slug: 'soldier',
  species_slug: 'dwarf',
  ability_method: 'standard_array',
  base_abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
  background_asi_mode: '+2/+1',
  background_asi: { str: 2, dex: 1 },
  language_ids: ['elvish', 'dwarvish'],
  class_skill_ids: ['acrobatics', 'animal_handling'],
  weapon_mastery_ids: ['battleaxe', 'blowgun', 'club'],
  fighting_style_slug: 'defense',
  background_tool_id: 'dice-set',
  background_equipment: 'pack',
  class_equipment: 'a',
  cantrip_ids: [] as string[],
  prepared_spell_ids: [] as string[],
  class_option_picks: {
    client_picks: {
      origin_feat_picks: {},
      species_picks: {},
    },
  },
  is_preview: false,
  is_draft: false,
  species_size: 'medium',
}

test.describe('2024 create gear attacks + tool RU', () => {
  test('background tool chips are Russian (noble)', async ({ page }, testInfo) => {
    const project = testInfo.project.name
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
    await dismissDiff(page)

    await expect(page.getByTestId('p24-m03-step-species')).toBeVisible({ timeout: 30_000 })
    await page.getByText('Дварф', { exact: true }).first().click()
    await page.getByTestId('p24-m03-name').fill('Доказ')
    await page.getByTestId('p24-m03-gender-male').click()
    const done = page.getByRole('button', { name: 'Готово' })
    if (await done.isVisible().catch(() => false)) await done.click()
    await page.getByTestId('p24-m03-next').click()

    await expect(page.getByTestId('p24-m03-step-background')).toBeVisible({ timeout: 20_000 })
    await page.getByText('Благородный', { exact: true }).first().click()
    await expect(page.getByRole('heading', { name: /Инструмент предыстории/ })).toBeVisible({
      timeout: 15_000,
    })

    const toolChips = page.locator('[data-testid^="p24-m03-pick-bg-tool-"]')
    await expect(toolChips.first()).toBeVisible()
    await toolChips.first().scrollIntoViewIfNeeded()
    const labels = await toolChips.allTextContents()
    expect(labels.join(' | ')).toMatch(/Набор игральных костей/)
    expect(labels.join(' | ')).toMatch(/Набор игральных карт/)
    for (const label of labels) {
      expect(label, `EN tool chip «${label}»`).not.toMatch(
        /Dice set|Playing card|Alchemist's Supplies/i,
      )
      expect(label, `latin tool chip «${label}»`).toMatch(/[А-Яа-яЁё]/)
    }
    await shot(page, 'background-tools-ru', project)
  })

  test('fighter pack A → attack cards on sheet', async ({ page }, testInfo) => {
    const project = testInfo.project.name
    const store = createStore()
    await installWarlockHarness(page, store)

    const result = runCreate2024Bridge(FIGHTER_PAYLOAD)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) return

    fs.mkdirSync(OUT, { recursive: true })
    fs.writeFileSync(
      path.join(OUT, 'fighter-pack-a-weapons.json'),
      JSON.stringify(result.sheet.weapons, null, 2),
    )
    const weaponNames = (result.sheet.weapons as Array<{ name?: string }>).map((w) => w.name)
    expect(weaponNames).toEqual(
      expect.arrayContaining(['Двуручный меч', 'Цеп', 'Метательное копьё']),
    )

    const id = 'dddddddd-dddd-4ddd-8ddd-000000000099'
    store.characters.set(id, seedCharacterFromCreate(id, result, false))

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

    await page.goto(`/characters/${id}`)
    const combatNav = page.getByRole('button', { name: /Бой|Атаки/i }).first()
    if (await combatNav.isVisible().catch(() => false)) {
      await combatNav.click()
    }
    await expect(page.getByText('Двуручный меч').first()).toBeVisible({ timeout: 45_000 })
    await expect(page.getByText('Цеп').first()).toBeVisible()
    await expect(page.getByText(/Метательное копь/).first()).toBeVisible()
    await shot(page, 'fighter-attacks-after-create', project)
  })
})
