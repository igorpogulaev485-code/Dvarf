/**
 * Wizard pack preview must match sheet inventory (Entertainer + bagpipes).
 * Artifacts → /opt/cursor/artifacts/fix-create-pack-preview/
 */
import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  createStore,
  installWarlockHarness,
  runCreate2024Bridge,
} from './support/warlock2024Harness'

const OUT = '/opt/cursor/artifacts/fix-create-pack-preview'

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

const ENTERTAINER_PAYLOAD = {
  name: 'Артист-предпросмотр',
  class_slug: 'fighter',
  background_slug: 'entertainer',
  species_slug: 'dwarf',
  ability_method: 'standard_array',
  base_abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
  background_asi_mode: '+2/+1',
  background_asi: { cha: 2, dex: 1 },
  language_ids: ['elvish', 'dwarvish'],
  class_skill_ids: ['acrobatics', 'animal_handling'],
  weapon_mastery_ids: ['battleaxe', 'blowgun', 'club'],
  fighting_style_slug: 'defense',
  background_tool_id: 'bagpipes',
  background_equipment: 'pack',
  class_equipment: 'a',
  cantrip_ids: [] as string[],
  prepared_spell_ids: [] as string[],
  class_option_picks: {
    client_picks: {
      origin_feat_picks: { instruments: ['lute', 'flute', 'drum'] },
      species_picks: {},
    },
  },
  is_preview: true,
  is_draft: false,
  species_size: 'medium',
}

test.describe('2024 create pack preview', () => {
  test('validate inventory: bagpipes + perfume + 15gp', async () => {
    const result = runCreate2024Bridge(ENTERTAINER_PAYLOAD)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) return
    const inv = result.sheet.inventory as {
      coins: { gp: number }
      items: Array<{ name_ru?: string; slug?: string }>
    }
    const names = inv.items.map((it) => String(it.name_ru || ''))
    const slugs = inv.items.map((it) => String(it.slug || ''))
    expect(slugs).toContain('bagpipes')
    expect(slugs).toContain('perfume')
    expect(names.join(' | ')).not.toMatch(/выбранн/i)
    expect(names.join(' | ')).not.toMatch(/\bду\b/i)
    expect(names.some((n) => /^\d+\s*зм/i.test(n))).toBe(false)
    expect(inv.coins.gp).toBeGreaterThanOrEqual(15)
    fs.mkdirSync(OUT, { recursive: true })
    fs.writeFileSync(
      path.join(OUT, 'entertainer-validate-inventory.json'),
      JSON.stringify({ coins: inv.coins, items: inv.items }, null, 2),
    )
  })

  test('background step pack chip shows Волынка', async ({ page }, testInfo) => {
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
    await page.getByTestId('p24-m03-name').fill('Артист-UI')
    await page.getByTestId('p24-m03-gender-male').click()
    const done = page.getByRole('button', { name: 'Готово' })
    if (await done.isVisible().catch(() => false)) await done.click()
    await page.getByTestId('p24-m03-next').click()

    await expect(page.getByTestId('p24-m03-step-background')).toBeVisible({ timeout: 20_000 })
    await page.getByText('Артист', { exact: true }).first().click()
    await expect(page.getByTestId('p24-m03-pick-bg-tool-bagpipes')).toBeVisible({
      timeout: 15_000,
    })
    await page.getByTestId('p24-m03-pick-bg-tool-bagpipes').click()

    const packChip = page.getByTestId('p24-m03-pick-bg-equipment-pack')
    await expect(packChip).toBeVisible()
    const packText = await packChip.innerText()
    expect(packText).toMatch(/Волынка/)
    expect(packText).not.toMatch(/выбранн/i)
    expect(packText).toMatch(/Духи|духи/)
    expect(packText).toMatch(/11\s*зм/i)

    const detail = page.locator('.create-pipeline__detail-list').filter({ hasText: 'Пакет:' })
    if (await detail.count()) {
      const detailText = await detail.first().innerText()
      expect(detailText).toMatch(/Волынка/)
      expect(detailText).not.toMatch(/выбранн/i)
    }

    await shot(page, 'background-pack-chip-after', project)
  })
})
