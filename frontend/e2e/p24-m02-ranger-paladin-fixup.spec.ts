/**
 * Paladin artifact fixups (tall capstone + step3 mastery header) — shares ranger playwright config.
 */
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  ARTIFACTS as PALADIN_ARTIFACTS,
  OATH,
  SHOT as PALADIN_SHOT,
  FIGHTING_STYLE_DEFENSE,
  createAt,
  openFeaturesScene,
  projectOf,
  tallShot,
  walkLivePaladinCreate,
} from './support/paladinLiveFlow'
import { createStore } from './support/paladin2024Harness'

const PALADIN_DIR = path.resolve(process.cwd(), '../artifacts/p24-m02-paladin')

test.beforeAll(() => {
  fs.mkdirSync(PALADIN_DIR, { recursive: true })
})

test.describe('P24-M02 paladin fixup shots (ranger pack)', () => {
  test.setTimeout(360_000)

  test('re-shot create-at-20 devotion capstone with tallShot', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Клятва преданности 20',
      level: 20,
      subclassSlug: OATH.devotion,
      fightingStyle: FIGHTING_STYLE_DEFENSE,
      dir: PALADIN_DIR,
    })
    await openFeaturesScene(page, project)
    await page.getByRole('button', { name: /Развернуть все/ }).last().click().catch(() => {})
    // Capstone list is long: grow viewport enough that «Священный нимб» fits with «Эпический дар».
    const viewport = page.viewportSize()
    if (viewport) {
      await page.setViewportSize({
        width: viewport.width,
        height: project === '390' ? 5200 : 5600,
      })
    }
    const nimbus = page.getByText(/^Священный нимб$/).first()
    await nimbus.scrollIntoViewIfNeeded()
    await expect(nimbus).toBeVisible()
    await expect(page.getByText(/^Эпический дар$/).first()).toBeVisible()
    await page.waitForTimeout(400)
    await page.screenshot({
      path: `${PALADIN_DIR}/${PALADIN_SHOT}-create-at-20-devotion-capstone-${project}.png`,
      fullPage: false,
    })
    if (viewport) await page.setViewportSize(viewport)
    expect(store.unmatched).toEqual([])
    expect(PALADIN_ARTIFACTS).toBeTruthy()
  })

  test('step3 mastery header visible (2/2)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLivePaladinCreate(page, store, {
      name: 'Шапка мастерства',
      level: 1,
      subclassSlug: null,
      shotDir: PALADIN_DIR,
      project,
      stepShots: true,
      shotPrefix: `${PALADIN_SHOT}-step3-mastery-header-fix-`,
      stopAfterClassStep: true,
      fightingStyle: null,
    })
    await expect(page.getByText(/Оружейное мастерство.*\(2\/2\)/i).first()).toBeVisible()
    await page.getByTestId('p24-m03-pick-mastery-longsword').scrollIntoViewIfNeeded()
    await tallShot(page, PALADIN_DIR, `${PALADIN_SHOT}-step3-mastery-header-fix`, project)
    expect(store.unmatched).toEqual([])
  })
})