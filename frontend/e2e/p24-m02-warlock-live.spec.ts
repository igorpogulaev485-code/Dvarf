/**
 * P24-M02-warlock live create / level-up evidence (no e2eSeed).
 *
 * Walks the real create wizard at `/characters/create?edition=2024&preview=1`
 * with API mocking (auth/catalog/create-2024 bridge) — infrastructure only.
 * Every major step is clicked; seed harness is NOT used as create evidence.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { ELDRITCH_INVOCATIONS_2024 } from '../src/shared/dnd/edition2024ClassOptions'
import {
  createStore,
  installWarlockHarness,
  type HarnessStore,
} from './support/warlock2024Harness'

const ARTIFACTS = '/opt/cursor/artifacts/p24-m02-warlock'
const CREATE_LIVE = '/characters/create?edition=2024&preview=1'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

function projectOf(testInfo: { project: { name: string } }): '390' | '1440' {
  return testInfo.project.name.includes('390') ? '390' : '1440'
}

const isPhone = (project: string) => project === '390'

async function shot(page: Page, dir: string, name: string, project: string) {
  await page.screenshot({
    path: path.join(dir, `${name}-${project}.png`),
    fullPage: false,
  })
}

async function tallShot(page: Page, dir: string, name: string, project: string) {
  const viewport = page.viewportSize()
  if (viewport) {
    await page.setViewportSize({ width: viewport.width, height: isPhone(project) ? 3600 : 2100 })
  }
  await page.waitForTimeout(400)
  await shot(page, dir, name, project)
  if (viewport) await page.setViewportSize(viewport)
}

function setupDialog(page: Page): Locator {
  return page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: /^Настроить/ }) })
}

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
  await expect(button).toBeEnabled({ timeout: 15_000 })
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

async function pickPrefixed(page: Page, prefix: string, ids: string[]) {
  for (const id of ids) {
    const chip = page.getByTestId(`${prefix}-${id}`)
    await chip.scrollIntoViewIfNeeded()
    if ((await chip.getAttribute('aria-checked')) === 'true') continue
    await chip.click()
    await expect(chip).toHaveAttribute('aria-checked', 'true')
  }
}

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

async function dismissWelcome(page: Page) {
  const skip = page.getByRole('button', { name: /Пропустит.*подсказ/i })
  try {
    await skip.waitFor({ state: 'visible', timeout: 3_000 })
    await skip.click()
  } catch {
    /* already dismissed */
  }
}

async function ensureMobileVitalsExpanded(page: Page) {
  const rest = page.getByRole('button', { name: /^Отдых$/ })
  if (await rest.isVisible().catch(() => false)) return
  const expand = page.getByRole('button', { name: /Развернуть шапку/ })
  if (await expand.isVisible().catch(() => false)) {
    await expand.click()
    await page.waitForTimeout(300)
  }
}

async function openFeaturesScene(page: Page, project: string) {
  if (project === '390') await page.getByText('Способн.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Способности$/ }).first().click()
  await page.waitForTimeout(700)
}

async function openIdentity(page: Page) {
  await page
    .locator('.play-desk__top button, [data-onboarding="combat-header"] button')
    .first()
    .click()
  const dlg = page.getByRole('dialog').last()
  await expect(dlg.getByRole('button', { name: /\+1 уровень/ })).toBeVisible()
  return dlg
}

async function openRest(page: Page, project: string) {
  if (project === '390') {
    await ensureMobileVitalsExpanded(page)
    await page.getByRole('button', { name: /^Отдых$/ }).first().click()
  } else {
    await page.locator('button.play-desk-header__rest').first().click()
  }
  await expect(
    page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).first(),
  ).toBeVisible()
}


const CANTRIPS = ['eldritch-blast', 'mage-hand', 'prestidigitation', 'chill-touch', 'poison-spray']
/** Ordered so every prefix stays legal for the pact-slot circle at that level. */
const PREPARED = [
  'hex', 'armor-of-agathys', 'hellish-rebuke', 'misty-step', 'hold-person', 'counterspell',
  'fear', 'hypnotic-pattern', 'major-image', 'blight', 'hold-monster', 'dream', 'scrying',
  'eyebite', 'true-seeing',
]

const SUBCLASS = {
  archfey: 'warlock__archfey',
  celestial: 'warlock__celestial-patron',
  fiend: 'warlock__fiend-patron',
  goo: 'warlock__greate-old-one-patron',
} as const

const INV_NAME = Object.fromEntries(ELDRITCH_INVOCATIONS_2024.map((r) => [r.id, r.nameRu])) as Record<
  string,
  string
>

const SHOT = '2024-warlock'

async function pickSpellsToQuota(page: Page, tab: 'cantrips' | 'level1', pool: string[]) {
  const tabBtn = page.getByTestId(`p24-m03-spell-tab-${tab}`)
  await tabBtn.scrollIntoViewIfNeeded()
  await tabBtn.click()
  const label = (await tabBtn.innerText()) || ''
  const m = label.match(/(\d+)\/(\d+)/)
  const need = m ? Number(m[2]) - Number(m[1]) : 0
  let picked = 0
  for (const slug of pool) {
    if (picked >= need) break
    const card = page.getByTestId(`p24-m03-card-${slug}`)
    await card.scrollIntoViewIfNeeded()
    await card.click()
    picked += 1
  }
  return need
}

type LiveWarlockOpts = {
  name: string
  level: number
  subclassSlug: string | null
  shotDir: string
  project: string
  /** Capture each major wizard step. */
  stepShots?: boolean
  shotPrefix?: string
  /** Hook while the leveling step is on screen (before spells / finish). */
  duringLeveling?: (page: Page) => Promise<void>
  /** Skip spell picks + finish (rollback demos). */
  stopAfterForks?: boolean
}

async function walkLiveWarlockCreate(page: Page, store: HarnessStore, opts: LiveWarlockOpts) {
  const prefix = opts.shotPrefix ?? ''
  await installWarlockHarness(page, store)
  await page.goto(CREATE_LIVE)
  await expect(page.getByTestId('create-character-2024')).toBeVisible({ timeout: 45_000 })
  await expect(page.getByTestId('p24-m03-step-species')).toBeVisible({ timeout: 45_000 })

  await selectCatalogCard(page, 'Дварф')
  await page.getByTestId('p24-m03-name').fill(opts.name)
  await page.getByTestId('p24-m03-gender-male').click()
  await fillUnderfilledPicks(page)
  if (opts.stepShots) await shot(page, opts.shotDir, `${prefix}step1-species`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24-m03-step-background')).toBeVisible()
  await selectCatalogCard(page, 'Солдат')
  await pickPrefixed(page, 'p24-m03-pick-asi-mode', ['+2/+1'])
  await pickPrefixed(page, 'p24-m03-pick-asi-plus2', ['con'])
  await pickPrefixed(page, 'p24-m03-pick-asi-plus1', ['dex'])
  const toolChip = page.getByTestId('p24-m03-pick-bg-tool-dice-set')
  if (await toolChip.count()) await pickPrefixed(page, 'p24-m03-pick-bg-tool', ['dice-set'])
  else await fillUnderfilledPicks(page)
  await pickPrefixed(page, 'p24-m03-pick-language', ['elvish', 'dwarvish'])
  await pickPrefixed(page, 'p24-m03-pick-bg-equipment', ['pack'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) await shot(page, opts.shotDir, `${prefix}step2-background`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24-m03-step-class')).toBeVisible()
  await selectCatalogCard(page, 'Колдун')
  await pickPrefixed(page, 'p24-m03-pick-skill', ['arcana', 'history'])
  await pickPrefixed(page, 'p24-m03-pick-invocation', ['armor-of-shadows'])
  await pickPrefixed(page, 'p24-m03-pick-class-equipment', ['a'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) {
    await page.getByTestId('p24-m03-pick-invocation-armor-of-shadows').scrollIntoViewIfNeeded()
    await tallShot(page, opts.shotDir, `${prefix}step3-class-invocation-picker`, opts.project)
  }
  await next(page)

  await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
  const layOut = page.getByRole('button', { name: /Разложить по приоритету класса/i })
  if (await layOut.isVisible().catch(() => false)) await layOut.click()
  if (opts.stepShots) await shot(page, opts.shotDir, `${prefix}step4-abilities`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 20_000 })
  const levelInput = page.getByTestId('p24-m03c-level-warlock')
  await expect(levelInput).toBeVisible()
  await levelInput.fill(String(opts.level))
  await levelInput.blur()
  await expect(levelInput).toHaveValue(String(opts.level))

  if (opts.level >= 3 && opts.subclassSlug) {
    const sub = page.getByTestId(`p24-m03c-subclass-${opts.subclassSlug}`).first()
    await expect(sub).toBeVisible({ timeout: 10_000 })
    await sub.scrollIntoViewIfNeeded()
    await sub.click()
  }

  for (const lv of [4, 8, 12, 16]) {
    if (lv > opts.level) break
    const asi =
      lv === 4
        ? page.getByTestId(`p24-m03c-asi-plus2-warlock-${lv}`)
        : page.getByTestId(`p24-m03c-asi-feat-warlock-${lv}`)
    if (await asi.isVisible().catch(() => false)) {
      await asi.scrollIntoViewIfNeeded()
      await asi.click()
    }
  }

  const forksBtn = page.getByTestId('p24-m03c-forks-warlock')
  await forksBtn.scrollIntoViewIfNeeded()
  await forksBtn.click()
  const forkList = page.getByTestId('p24-m03c-fork-list-warlock')
  await expect(forkList).toBeVisible()
  await forkList.scrollIntoViewIfNeeded()
  if (opts.duringLeveling) await opts.duringLeveling(page)
  if (opts.stopAfterForks) return null

  await pickSpellsToQuota(page, 'cantrips', CANTRIPS)
  await pickSpellsToQuota(page, 'level1', PREPARED)
  await page.getByTestId('p24-m03-spell-tab-level1').scrollIntoViewIfNeeded()
  await tallShot(page, opts.shotDir, `${prefix}step5-leveling-spells-picked`, opts.project)
  await page.getByTestId('p24-m03c-forks-warlock').scrollIntoViewIfNeeded()
  await tallShot(page, opts.shotDir, `${prefix}step5-leveling-forks`, opts.project)

  await expect(page.getByTestId('p24-m03-finish')).toBeEnabled({ timeout: 20_000 })
  await page.getByTestId('p24-m03-finish').click()
  try {
    await page.waitForURL(/\/characters\/[0-9a-f-]{36}$/i, { timeout: 45_000 })
  } catch {
    const issues = page.getByTestId('p24-m03-issues')
    const banner = await page.locator('.create-2024__issues, [role="alert"], [role="status"]').allTextContents()
    throw new Error(
      `finish did not navigate; issues=${await issues.textContent().catch(() => '')}; banner=${banner.join(' | ')}`,
    )
  }
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
  await dismissWelcome(page)
  const sheet = [...store.characters.values()][0]?.sheet as Record<string, any>
  expect(sheet?.classes?.[0]?.level).toBe(opts.level)
  if (opts.level >= 3 && opts.subclassSlug) {
    expect(String(sheet?.classes?.[0]?.subclass_slug || '')).toBe(opts.subclassSlug)
  }
  expect(store.unmatched).toEqual([])
  return sheet
}

async function openInvocationPicker(page: Page, project: string) {
  await openFeaturesScene(page, project)
  const box = page.getByTestId('class-options-invocations')
  await expect(box).toBeVisible({ timeout: 15_000 })
  await box.scrollIntoViewIfNeeded()
  return box
}

async function invocationCount(box: Locator): Promise<{ have: number; limit: number }> {
  const head = (await box.locator('h3').first().innerText()) || ''
  const m = head.match(/\((\d+)\/(\d+)\)/)
  return { have: Number(m?.[1] ?? 0), limit: Number(m?.[2] ?? 0) }
}

/** Click sheet invocation chips (real class-options picker) until `ids` are on. */
async function pickSheetInvocations(box: Locator, ids: string[]) {
  for (const id of ids) {
    const chip = box.locator('button.sheet-chip').filter({ hasText: new RegExp(`^${INV_NAME[id]}`) }).first()
    await chip.scrollIntoViewIfNeeded()
    if (((await chip.getAttribute('class')) || '').includes('is-on')) continue
    await expect(chip, `invocation ${id} should be selectable`).toBeEnabled()
    await chip.click()
  }
}

async function storedSheet(store: HarnessStore): Promise<Record<string, any>> {
  return [...store.characters.values()][0]!.sheet as Record<string, any>
}

async function waitForSavedInvocations(store: HarnessStore, count: number) {
  await expect
    .poll(async () => (await storedSheet(store)).class_options_2024?.eldritch_invocations?.length ?? 0, {
      timeout: 20_000,
    })
    .toBe(count)
}

async function pactPips(page: Page) {
  const group = page.getByLabel('Ячейки договора', { exact: true }).first()
  return group
}

async function openCombatScene(page: Page, project: string) {
  if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Бой$/ }).first().click()
  await page.waitForTimeout(600)
}

async function revealPact(page: Page, project: string) {
  await openCombatScene(page, project)
  const group = await pactPips(page)
  if (isPhone(project)) {
    await page.locator(':is(button,[role=tab],[role=button]):visible', { hasText: /^Заклинания$/ }).first().click()
    await page.waitForTimeout(500)
  }
  if (!(await group.isVisible().catch(() => false))) {
    const magic = page.getByRole('button', { name: /^Магия$/ }).first()
    if (await magic.isVisible().catch(() => false)) {
      await magic.click()
      await page.waitForTimeout(500)
    }
  }
  await expect(group).toBeVisible({ timeout: 15_000 })
  await group.scrollIntoViewIfNeeded()
  return group
}

async function pactRemaining(page: Page): Promise<number> {
  const g = page.locator('.play-desk-compact__slot-pips.is-pact').first()
  return g.locator('button.is-on').count()
}

async function featureCard(page: Page, name: RegExp) {
  const card = page
    .locator('.feature-card')
    .filter({ has: page.locator('.feature-card__name, .feature-card__title', { hasText: name }) })
    .first()
  await expect(card).toBeVisible({ timeout: 15_000 })
  await card.scrollIntoViewIfNeeded()
  return card
}

async function expectFeatureNames(page: Page, names: RegExp[]) {
  for (const re of names) {
    await expect(
      page.locator('.feature-card__name, .feature-card__title').filter({ hasText: re }).first(),
      `feature ${re}`,
    ).toBeVisible({ timeout: 15_000 })
  }
}

async function dismissGuided(page: Page) {
  const later = page.getByRole('dialog').getByRole('button', { name: /Позже|Пропустить|Готово/ })
  for (let i = 0; i < 6; i += 1) {
    if (await later.first().isVisible({ timeout: 1_500 }).catch(() => false)) {
      await later.first().click()
      await page.waitForTimeout(200)
    } else break
  }
}

test.describe('P24-M02 warlock — LIVE create (wizard clicked, no e2eSeed)', () => {
  test.setTimeout(240_000)
  test.use({ actionTimeout: 15_000 })

  test('create-live-at-5 fiend: dwarf, invocations, pact 2x3rd, prepared 6', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveWarlockCreate(page, store, {
      name: 'Живой Колдун 5',
      level: 5,
      subclassSlug: SUBCLASS.fiend,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-`,
      duringLeveling: async (pg) => {
        const slots = pg.getByTestId('p24-m03c-slots')
        await expect(slots).toContainText('Магия договора 2×3')
        await expect(pg.getByTestId('p24-m03c-fork-list-warlock')).toContainText('Магическая искусность')
        await expect(pg.getByTestId('p24-m03c-fork-list-warlock')).toContainText(/Подкласс выбран/)
      },
    })
    expect(sheet.spells?.pact_slots).toMatchObject({ level: 3, max: 2 })
    expect((sheet.class_options_2024?.eldritch_invocations ?? []).length).toBe(1)
    const known = (sheet.spells?.known ?? []) as Array<{ level: number; prepared?: boolean }>
    expect(known.filter((x) => x.level === 0).length).toBe(3)
    expect(known.filter((x) => x.level > 0).length).toBe(6)
    // Dwarven Toughness: d8 avg 5 + CON 3 + 1 per level (L1: 8+3+1=12; L2..5: 4*(5+3+1)=36) = 48
    expect(Number(store.characters.values().next().value!.hp_max)).toBe(48)

    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /Магическая искусность/,
      /Таинственные воззвания/,
      /Магия договора/,
      /Благословение темнейшего/,
    ])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-features`, project)

    // Sheet «Class options» invocation picker: 1/5 → 5/5 (real chips).
    const box = await openInvocationPicker(page, project)
    expect(await invocationCount(box)).toEqual({ have: 1, limit: 5 })
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-invocations-1of5`, project)
    await pickSheetInvocations(box, [
      'agonizing-blast',
      'devils-sight',
      'eldritch-mind',
      'fiendish-vigor',
    ])
    expect(await invocationCount(box)).toEqual({ have: 5, limit: 5 })
    await box.scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-invocations-5of5`, project)
    await waitForSavedInvocations(store, 5)

    const pact = await revealPact(page, project)
    await expect(pact).toBeVisible()
    expect(await pactRemaining(page)).toBe(2)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-pact-slots`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-11 archfey: arcanum, contact patron, 3 pact slots 5th', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveWarlockCreate(page, store, {
      name: 'Живой Колдун 11',
      level: 11,
      subclassSlug: SUBCLASS.archfey,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-11-`,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText('Магия договора 3×5')
        const list = pg.getByTestId('p24-m03c-fork-list-warlock')
        await expect(list).toContainText('Связь с покровителем')
        await expect(list).toContainText('Таинственный арканум')
      },
    })
    expect(sheet.spells?.pact_slots).toMatchObject({ level: 5, max: 3 })
    const known = (sheet.spells?.known ?? []) as Array<{ level: number }>
    expect(known.filter((x) => x.level === 0).length).toBe(4)
    expect(known.filter((x) => x.level > 0).length).toBe(11)

    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /Магическая искусность/,
      /Таинственные воззвания/,
      /Связь с покровителем/,
      /Таинственный арканум/,
      /Шаг феи/,
    ])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-features`, project)

    const box = await openInvocationPicker(page, project)
    expect(await invocationCount(box)).toEqual({ have: 1, limit: 7 })
    await pickSheetInvocations(box, [
      'agonizing-blast',
      'devils-sight',
      'eldritch-mind',
      'gaze-of-two-minds',
      'mask-of-many-faces',
      'misty-visions',
    ])
    expect(await invocationCount(box)).toEqual({ have: 7, limit: 7 })
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-invocations-7of7`, project)

    const card = await featureCard(page, /Таинственный арканум/)
    await card.scrollIntoViewIfNeeded()
    const open = card.getByRole('button', { name: /Арканум/ }).first()
    if (await open.isVisible().catch(() => false)) {
      await open.click()
      const dlg = page.getByRole('dialog').last()
      await expect(dlg).toBeVisible()
      await shot(page, ARTIFACTS, `${SHOT}-create-at-11-arcanum-dialog`, project)
    }
    const pactGroup = await revealPact(page, project)
    await expect(pactGroup).toBeVisible()
    expect(await pactRemaining(page)).toBe(3)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-pact-slots`, project)
    expect(store.unmatched).toEqual([])
  })
})

/** Live level-up through «+1 уровень» → Повысить → guided wizard (real invocation picks). */
async function liveLevelUp(
  page: Page,
  project: string,
  shotName: string,
  opts: { expectUpcoming?: RegExp[]; invocationPicks?: string[] },
) {
  const identity = await openIdentity(page)
  await identity.getByRole('button', { name: /\+1 уровень/ }).first().click()
  const raise = page.getByRole('dialog').filter({ hasText: 'Повышение уровня' })
  await expect(raise).toBeVisible()
  await expect(raise.getByText(/Дварфийская стойкость/i).first()).toBeVisible({ timeout: 10_000 })
  if (opts.expectUpcoming?.length) {
    const feats = raise.getByTestId('level-up-features')
    await expect(feats).toBeVisible()
    for (const re of opts.expectUpcoming) await expect(feats.getByText(re).first()).toBeVisible()
    await feats.scrollIntoViewIfNeeded()
  } else {
    await expect(raise.getByTestId('level-up-features')).toHaveCount(0)
  }
  await shot(page, ARTIFACTS, `${shotName}-features`, project)
  await raise.getByRole('button', { name: /^Повысить$/ }).click()
  await expect(raise).toBeHidden({ timeout: 15_000 })

  let sawInvocationStep = false
  for (let i = 0; i < 8; i += 1) {
    const dlg = page.getByRole('dialog').last()
    if (!(await dlg.isVisible({ timeout: 2_500 }).catch(() => false))) break
    const picks = dlg.getByTestId('wizard-invocation-picks')
    if (await picks.isVisible().catch(() => false)) {
      sawInvocationStep = true
      await expect(dlg.getByText(/Выбери \d+ воззвание/)).toBeVisible()
      await shot(page, ARTIFACTS, `${shotName}-invocations-before`, project)
      await pickSheetInvocations(picks, opts.invocationPicks ?? [])
      await shot(page, ARTIFACTS, `${shotName}-invocations-after`, project)
    }
    const primary = dlg.getByRole('button', { name: /^Далее$|^Готово$/ })
    if (await primary.isEnabled({ timeout: 2_000 }).catch(() => false)) await primary.click()
    else break
    await page.waitForTimeout(400)
  }
  return sawInvocationStep
}

test.describe('P24-M02 warlock — LIVE level-up (create wizard → sheet → +1 уровень)', () => {
  test.setTimeout(240_000)
  test.use({ actionTimeout: 15_000 })

  test('levelup-live 4→5: invocation picks 3→5, pact 2×2nd → 2×3rd', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveWarlockCreate(page, store, {
      name: 'Прокачка 4→5',
      level: 4,
      subclassSlug: SUBCLASS.fiend,
      shotDir: ARTIFACTS,
      project,
    })
    expect((await storedSheet(store)).spells?.pact_slots).toMatchObject({ level: 2, max: 2 })
    const box = await openInvocationPicker(page, project)
    expect(await invocationCount(box)).toEqual({ have: 1, limit: 3 })
    await pickSheetInvocations(box, ['agonizing-blast', 'devils-sight'])
    expect(await invocationCount(box)).toEqual({ have: 3, limit: 3 })
    await waitForSavedInvocations(store, 3)
    await shot(page, ARTIFACTS, `${SHOT}-levelup-4to5-before-invocations-3of3`, project)

    const sawStep = await liveLevelUp(page, project, `${SHOT}-levelup-4to5`, {
      invocationPicks: ['eldritch-mind', 'fiendish-vigor'],
    })
    expect(sawStep, 'guided wizard must offer invocation picks 3→5').toBe(true)
    await waitForSavedInvocations(store, 5)
    const sheet = await storedSheet(store)
    expect(sheet.classes[0].level).toBe(5)
    expect(sheet.spells?.pact_slots).toMatchObject({ level: 3, max: 2 })

    const box2 = await openInvocationPicker(page, project)
    expect(await invocationCount(box2)).toEqual({ have: 5, limit: 5 })
    await shot(page, ARTIFACTS, `${SHOT}-levelup-4to5-after-invocations-5of5`, project)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/Магическая искусность/, /Таинственные воззвания/, /Магия договора/])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-4to5-sheet-features`, project)
    await revealPact(page, project)
    expect(await pactRemaining(page)).toBe(2)
    await shot(page, ARTIFACTS, `${SHOT}-levelup-4to5-pact-2x3rd`, project)
  })

  test('levelup-live 10→11: Таинственный арканум, pact 2×5th → 3×5th', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveWarlockCreate(page, store, {
      name: 'Прокачка 10→11',
      level: 10,
      subclassSlug: SUBCLASS.celestial,
      shotDir: ARTIFACTS,
      project,
    })
    expect((await storedSheet(store)).spells?.pact_slots).toMatchObject({ level: 5, max: 2 })
    await liveLevelUp(page, project, `${SHOT}-levelup-10to11`, {
      expectUpcoming: [/Таинственный арканум/],
    })
    await expect.poll(async () => (await storedSheet(store)).classes?.[0]?.level).toBe(11)
    const sheet = await storedSheet(store)
    expect(sheet.spells?.pact_slots).toMatchObject({ level: 5, max: 3 })

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /Таинственный арканум/,
      /Связь с покровителем/,
      /Сияющая душа/,
      /Небесная стойкость/,
    ])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-10to11-sheet-features`, project)
    await revealPact(page, project)
    expect(await pactRemaining(page)).toBe(3)
    await shot(page, ARTIFACTS, `${SHOT}-levelup-10to11-pact-3x5th`, project)
  })
})

test.describe('P24-M02 warlock — Magical Cunning + short rest', () => {
  test.setTimeout(240_000)
  test.use({ actionTimeout: 15_000 })

  test('magical-cunning dialog restores pact slots; short rest restores all', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveWarlockCreate(page, store, {
      name: 'Искусность',
      level: 5,
      subclassSlug: SUBCLASS.archfey,
      shotDir: ARTIFACTS,
      project,
    })

    // Spend both pact slots on the combat table.
    await revealPact(page, project)
    const pips = page.locator('.play-desk-compact__slot-pips.is-pact button')
    await pips.first().click()
    await pips.first().click()
    await expect.poll(() => pactRemaining(page)).toBe(0)
    await shot(page, ARTIFACTS, `${SHOT}-pact-spent-0of2`, project)

    // Magical Cunning button on the feature card.
    await openFeaturesScene(page, project)
    const card = await featureCard(page, /Магическая искусность/)
    await card.click().catch(() => {})
    const cunningBtn = page.getByRole('button', { name: /Восстановить ячейки/ }).first()
    await expect(cunningBtn).toBeVisible({ timeout: 10_000 })
    await cunningBtn.scrollIntoViewIfNeeded()
    await shot(page, ARTIFACTS, `${SHOT}-magical-cunning-button`, project)
    await cunningBtn.click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg).toBeVisible()
    await expect(dlg).toContainText(/Магическая искусность/)
    await shot(page, ARTIFACTS, `${SHOT}-magical-cunning-dialog`, project)
    await dlg.getByRole('button', { name: /Применить|Восстановить|Готово|Подтвердить/ }).last().click()
    await expect(dlg).toBeHidden({ timeout: 10_000 })
    await revealPact(page, project)
    await expect.poll(() => pactRemaining(page)).toBe(1)
    await shot(page, ARTIFACTS, `${SHOT}-magical-cunning-after-1of2`, project)

    // Short rest → both pact slots back.
    await openRest(page, project)
    const rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).first()
    await shot(page, ARTIFACTS, `${SHOT}-short-rest-dialog`, project)
    await expect(rest).toContainText(/ячейки договора восстановятся/i)
    await rest.getByRole('button', { name: /Сброс коротких ресурсов/ }).click()
    await page.waitForTimeout(500)
    await expect(rest).toContainText(/Ячейки договора:\s*1\/2\s*→\s*2\/2/)
    await shot(page, ARTIFACTS, `${SHOT}-short-rest-summary-pact-1of2-to-2of2`, project)
    await rest.getByRole('button', { name: /^Применить$/ }).click()
    await page.waitForTimeout(500)
    const closeBtn = page.getByRole('dialog').last().getByRole('button', { name: /^Закрыть$/ })
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click()
    await dismissGuided(page)
    await revealPact(page, project)
    await expect.poll(() => pactRemaining(page)).toBe(2)
    await shot(page, ARTIFACTS, `${SHOT}-short-rest-pact-restored-2of2`, project)
  })
})

const SUBCLASS_CASES = [
  {
    key: 'archfey',
    slug: SUBCLASS.archfey,
    features: {
      3: [/Заклинания Архифеи/, /Шаг феи/],
      6: [/Туманное исчезновение/],
      10: [/Чарующая защита/],
      14: [/Завораживающая магия/],
    },
  },
  {
    key: 'fiend',
    slug: SUBCLASS.fiend,
    features: {
      3: [/Благословение темнейшего/, /Заклинания исчадия/],
      6: [/Удача темнейшего/],
      10: [/Устойчивость исчадия/],
      14: [/Бросок через преисподнюю/],
    },
  },
  {
    key: 'celestial',
    slug: SUBCLASS.celestial,
    features: {
      3: [/Заклинания Небожителя/, /Лечащий свет/],
      6: [/Сияющая душа/],
      10: [/Небесная стойкость/],
      14: [/Опаляющее возмездие/],
    },
  },
  {
    key: 'goo',
    slug: SUBCLASS.goo,
    features: {
      3: [/Заклинания Великого древнего/, /Пробуждённый разум/, /Психические заклинания/],
      6: [/Провидящий боец/],
      10: [/Мистический сглаз/, /Ментальный щит/],
      14: [/Порабощение/],
    },
  },
] as const

async function shotSubclassLevel(
  page: Page,
  store: HarnessStore,
  sub: (typeof SUBCLASS_CASES)[number],
  level: 3 | 6 | 10 | 14,
  project: string,
) {
  await walkLiveWarlockCreate(page, store, {
    name: `${sub.key} L${level}`,
    level,
    subclassSlug: sub.slug,
    shotDir: ARTIFACTS,
    project,
  })
  await openFeaturesScene(page, project)
  const expected = [
    ...sub.features[3],
    ...(level >= 6 ? sub.features[6] : []),
    ...(level >= 10 ? sub.features[10] : []),
    ...(level >= 14 ? sub.features[14] : []),
  ]
  await expectFeatureNames(page, expected)
  const highlight =
    level >= 14
      ? sub.features[14][0]
      : level >= 10
        ? sub.features[10][0]
        : level >= 6
          ? sub.features[6][0]
          : sub.features[3][0]
  const card = await featureCard(page, highlight)
  const useBtn = card.locator('button').filter({ hasText: /…|Защита|Сглаз|Порабощение|Бросок|Возмездие|Стойкость|Устойчивость|Завораживающая|Ментальн/ }).first()
  if (await useBtn.isVisible().catch(() => false)) {
    await useBtn.scrollIntoViewIfNeeded()
  } else {
    const glance = card.locator('button.feature-card__glance, button[aria-label="Подробнее"]')
    if (await glance.count()) {
      await glance.first().click()
      await page.waitForTimeout(300)
    }
  }
  await tallShot(page, ARTIFACTS, `${SHOT}-${sub.key}-${String(level).padStart(2, '0')}`, project)
  expect(store.unmatched).toEqual([])
}

test.describe('P24-M02 warlock — subclasses via LIVE create (L3 + L6)', () => {
  test.setTimeout(240_000)
  test.use({ actionTimeout: 15_000 })

  for (const sub of SUBCLASS_CASES) {
    for (const level of [3, 6] as const) {
      test(`2024-warlock-${sub.key}-${String(level).padStart(2, '0')}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await shotSubclassLevel(page, store, sub, level, project)
      })
    }
  }
})

test.describe('P24-M02 warlock — subclasses L10 + L14 (Доправка 1)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  for (const sub of SUBCLASS_CASES) {
    for (const level of [10, 14] as const) {
      test(`2024-warlock-${sub.key}-${String(level).padStart(2, '0')}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await shotSubclassLevel(page, store, sub, level, project)
      })
    }
  }
})

test.describe('P24-M02 warlock — Доправка 1: EB / tome rest / fiend resilience', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('eldritch-blast L11 CHA17: 3 beams 1к10+CHA, spear, repelling', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveWarlockCreate(page, store, {
      name: 'Заряд L11',
      level: 11,
      subclassSlug: SUBCLASS.fiend,
      shotDir: ARTIFACTS,
      project,
    })
    await dismissGuided(page)

    const box = await openInvocationPicker(page, project)
    await pickSheetInvocations(box, [
      'agonizing-blast',
      'eldritch-spear',
      'repelling-blast',
      'eldritch-mind',
      'fiendish-vigor',
      'devils-sight',
    ])
    await waitForSavedInvocations(store, 7)

    const cha = page.locator('.abil-block[data-abil="cha"]').first()
    if (isPhone(project)) {
      await page.getByText('Бой', { exact: true }).last().click()
      await ensureMobileVitalsExpanded(page)
      await page.locator('button.mobile-vitals__abil').click()
      const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
      await expect(abilPage).toBeVisible()
      await expect(abilPage.locator('.abil-block[data-abil="cha"]')).toContainText(/17|16/)
      await abilPage.locator('button.mobile-abil-page__back').click()
    } else {
      await expect(cha).toBeVisible()
      // ASI +2 CHA on L4 → 17 with standard array CHA 15
      await expect(cha).toContainText('17')
    }

    await openCombatScene(page, project)
    if (isPhone(project)) {
      const spellsTab = page
        .locator(':is(button,[role=tab],[role=button]):visible', { hasText: /^Заклинания$/ })
        .first()
      if (await spellsTab.isVisible().catch(() => false)) await spellsTab.click()
    }
    const ebRow = page.locator('.play-desk-compact__row.is-spell').filter({ hasText: /Мистический заряд/ }).first()
    await expect(ebRow).toBeVisible({ timeout: 15_000 })
    await ebRow.scrollIntoViewIfNeeded()
    await expect(ebRow.locator('.play-desk-compact__spell-dmg')).toContainText(/1к10\+[34]/)
    await expect(ebRow.locator('.play-desk-compact__spell-dmg')).toContainText(/×3/)
    await shot(page, ARTIFACTS, `${SHOT}-fixup1-eb-attack-card`, project)

    const castBtn = ebRow.locator('button.play-desk-compact__spell-cast').first()
    await expect(castBtn).toBeVisible()
    await castBtn.click()
    const castDlg = page.getByRole('dialog').filter({ hasText: /Мистический заряд/ }).first()
    await expect(castDlg).toBeVisible({ timeout: 15_000 })
    await expect(castDlg).toContainText(/3 луч/)
    await expect(castDlg).toContainText(/1к10\+/)
    await expect(castDlg).toContainText(/Мистическое копьё|фт/)
    await expect(castDlg).toContainText(/Отталкивающий заряд|оттолкнуть/)
    await shot(page, ARTIFACTS, `${SHOT}-fixup1-eb-cast-dialog`, project)
  })

  test('pact-of-the-tome rest re-pick Book of Shadows', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveWarlockCreate(page, store, {
      name: 'Гримуар L5',
      level: 5,
      subclassSlug: SUBCLASS.archfey,
      shotDir: ARTIFACTS,
      project,
    })
    await dismissGuided(page)
    const box = await openInvocationPicker(page, project)
    // replace one free slot / add tome (armor-of-shadows already on from create)
    await pickSheetInvocations(box, ['pact-of-the-tome', 'eldritch-mind', 'fiendish-vigor', 'devils-sight'])
    await waitForSavedInvocations(store, 5)

    await openRest(page, project)
    const rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).first()
    const tome = rest.getByTestId('warlock-2024-rest-tome')
    await expect(tome).toBeVisible({ timeout: 15_000 })
    await tome.scrollIntoViewIfNeeded()
    await expect(tome).toContainText(/Книга теней|Заговоры|Ритуалы/)
    await expect(tome.getByRole('button', { name: /Пропустить/ })).toBeVisible()
    await shot(page, ARTIFACTS, `${SHOT}-fixup1-tome-rest-repick`, project)
  })

  test('fiendish-resilience type pick after rest L10', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveWarlockCreate(page, store, {
      name: 'Устойчивость L10',
      level: 10,
      subclassSlug: SUBCLASS.fiend,
      shotDir: ARTIFACTS,
      project,
    })
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/Устойчивость исчадия/])

    await openRest(page, project)
    const rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).first()
    const fiend = rest.getByTestId('warlock-2024-rest-fiend')
    await expect(fiend).toBeVisible({ timeout: 15_000 })
    await fiend.scrollIntoViewIfNeeded()
    await expect(fiend).toContainText(/Устойчивость исчадия/)
    await expect(fiend.locator('select, [role="listbox"], .ui-select')).toBeVisible()
    await shot(page, ARTIFACTS, `${SHOT}-fixup1-fiendish-resilience-rest`, project)
  })
})

test.describe('P24-M02 warlock — level down in create wizard (rollback UI)', () => {
  test.setTimeout(240_000)
  test.use({ actionTimeout: 15_000 })

  const STEPS = [
    {
      name: 'rollback-3to2',
      from: 3,
      to: 2,
      sub: SUBCLASS.fiend,
      before: { slots: 'Магия договора 2×2', has: /Подкласс выбран/ },
      after: { slots: 'Магия договора 2×1', hasNot: /Подкласс/ },
    },
    {
      name: 'rollback-10to9',
      from: 10,
      to: 9,
      sub: SUBCLASS.archfey,
      before: { slots: 'Магия договора 2×5', has: /Чарующая защита/ },
      after: { slots: 'Магия договора 2×5', has: /Связь с покровителем/, hasNot: /Чарующая защита/ },
    },
    {
      name: 'rollback-20to19',
      from: 20,
      to: 19,
      sub: SUBCLASS.goo,
      before: { slots: 'Магия договора 4×5', has: /Таинственный мастер/ },
      after: { slots: 'Магия договора 4×5', hasNot: /Таинственный мастер/ },
    },
  ] as const

  for (const spec of STEPS) {
    test(spec.name, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await walkLiveWarlockCreate(page, store, {
        name: spec.name,
        level: spec.from,
        subclassSlug: spec.sub,
        shotDir: ARTIFACTS,
        project,
        stopAfterForks: true,
      })
      const list = page.getByTestId('p24-m03c-fork-list-warlock')
      await expect(page.getByTestId('p24-m03c-slots')).toContainText(spec.before.slots)
      if ('has' in spec.before) await expect(list).toContainText(spec.before.has)
      await page.getByTestId('p24-m03c-forks-warlock').scrollIntoViewIfNeeded()
      await tallShot(page, ARTIFACTS, `${SHOT}-${spec.name}-before-L${spec.from}`, project)

      const levelInput = page.getByTestId('p24-m03c-level-warlock')
      await levelInput.scrollIntoViewIfNeeded()
      await levelInput.fill(String(spec.to))
      await levelInput.blur()
      await expect(levelInput).toHaveValue(String(spec.to))
      const forks = page.getByTestId('p24-m03c-forks-warlock')
      await forks.scrollIntoViewIfNeeded()
      if (!(await list.isVisible().catch(() => false))) await forks.click()
      await expect(list).toBeVisible()
      await expect(page.getByTestId('p24-m03c-slots')).toContainText(spec.after.slots)
      if ('has' in spec.after) await expect(list).toContainText(spec.after.has)
      if ('hasNot' in spec.after) await expect(list).not.toContainText(spec.after.hasNot)
      await tallShot(page, ARTIFACTS, `${SHOT}-${spec.name}-after-L${spec.to}`, project)
    })
  }
})
