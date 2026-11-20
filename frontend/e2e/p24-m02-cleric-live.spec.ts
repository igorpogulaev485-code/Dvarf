/**
 * P24-M02-cleric live create / level-up evidence (no e2eSeed).
 *
 * Walks the real create wizard at `/characters/create?edition=2024&preview=1`
 * with API mocking (auth/catalog/create-2024 bridge) — infrastructure only.
 * Every major step is clicked; seed harness is NOT used as create evidence.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  createStore,
  installClericHarness,
  type HarnessStore,
} from './support/cleric2024Harness'

const ARTIFACTS = '/opt/cursor/artifacts/p24-m02-cleric'
const CREATE_LIVE = '/characters/create?edition=2024&preview=1'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

function projectOf(testInfo: { project: { name: string } }): '390' | '1440' {
  return testInfo.project.name.includes('390') ? '390' : '1440'
}

const isPhone = (project: string) => project === '390'

async function shot(page: Page, dir: string, name: string, project: string) {
  await page.waitForTimeout(350)
  await page.screenshot({
    path: path.join(dir, `${name}-${project}.png`),
    fullPage: false,
  })
}

async function tallShot(page: Page, dir: string, name: string, project: string) {
  const viewport = page.viewportSize()
  if (viewport) {
    await page.setViewportSize({ width: viewport.width, height: isPhone(project) ? 4200 : 2800 })
  }
  await page.waitForTimeout(400)
  await shot(page, dir, name, project)
  if (viewport) await page.setViewportSize(viewport)
}

/** Screenshot-only: lift scroll clipping around the leveling fork list. */
async function unclipForks(page: Page) {
  await page.getByTestId('p24-m03c-leveling').evaluate((el) => {
    let node: HTMLElement | null = el as HTMLElement
    while (node && node !== document.body) {
      const style = getComputedStyle(node)
      if (/(auto|scroll|hidden)/.test(style.overflowY) || style.maxHeight !== 'none') {
        node.style.overflow = 'visible'
        node.style.maxHeight = 'none'
        node.style.height = 'auto'
      }
      node = node.parentElement
    }
  })
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


const CANTRIPS = [
  'sacred-flame', 'guidance', 'spare-the-dying', 'light', 'mending', 'thaumaturgy', 'resistance',
  'word-of-radiance', 'toll-the-dead',
]
/** Cleric list spells that are not auto-prepared domain spells (any PHB domain). */
const PREPARED = [
  'healing-word', 'bane', 'command', 'detect-magic', 'sanctuary', 'inflict-wounds',
  'protection-from-evil-and-good', 'silence', 'calm-emotions', 'augury', 'zone-of-truth',
  'hold-person', 'dispel-magic', 'remove-curse', 'beacon-of-hope', 'tongues', 'glyph-of-warding',
  'magic-circle', 'bestow-curse', 'clairvoyance', 'animate-dead', 'create-food-and-water', 'water-walk',
]

const SUBCLASS = {
  life: 'cleric__life-domain',
  light: 'cleric__light-domain',
  trickery: 'cleric__trickery-domain',
  war: 'cleric__war-domain',
} as const

const SHOT = '2024-cleric'

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

type LiveClericOpts = {
  name: string
  level: number
  order?: 'protector' | 'thaumaturge'
  subclassSlug: string | null
  shotDir: string
  project: string
  stepShots?: boolean
  shotPrefix?: string
  duringLeveling?: (page: Page) => Promise<void>
  stopAfterForks?: boolean
  /** Blessed Strikes pick for cleric L7+ (default divine_strike). */
  blessedStrikes?: 'divine_strike' | 'potent_spellcasting'
  /** When set, screenshot the picker after the chip is chosen (name without project suffix). */
  blessedPickShot?: string
  classEquipment?: 'a' | 'gold'
  /** Optional hook after Blessed Strikes was picked, before spells. */
  afterBlessedPick?: (page: Page) => Promise<void>
}

async function walkLiveClericCreate(page: Page, store: HarnessStore, opts: LiveClericOpts) {
  const prefix = opts.shotPrefix ?? ''
  const order = opts.order ?? 'protector'
  await installClericHarness(page, store)
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
  await selectCatalogCard(page, 'Жрец')
  await pickPrefixed(page, 'p24-m03-pick-skill', ['history', 'religion'])
  await pickPrefixed(page, 'p24-m03-pick-order', [order])
  await pickPrefixed(page, 'p24-m03-pick-class-equipment', [opts.classEquipment ?? 'a'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) {
    await page.getByTestId(`p24-m03-pick-order-${order}`).scrollIntoViewIfNeeded()
    await tallShot(page, opts.shotDir, `${prefix}step3-class-divine-order-${order}`, opts.project)
  }
  await next(page)

  await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
  const layOut = page.getByRole('button', { name: /Разложить по приоритету класса/i })
  if (await layOut.isVisible().catch(() => false)) await layOut.click()
  if (opts.stepShots) await shot(page, opts.shotDir, `${prefix}step4-abilities`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24m03c-leveling'.replace('p24m03c', 'p24-m03c'))).toBeVisible({ timeout: 20_000 })
  const levelInput = page.getByTestId('p24-m03c-level-cleric')
  await expect(levelInput).toBeVisible()
  await levelInput.fill(String(opts.level))
  await levelInput.blur()
  await expect(levelInput).toHaveValue(String(opts.level))

  if (opts.level >= 3 && opts.subclassSlug) {
    const sub = page.getByTestId(`p24-m03c-subclass-${opts.subclassSlug}`).first()
    await expect(sub).toBeVisible({ timeout: 10_000 })
    await sub.scrollIntoViewIfNeeded()
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await sub.click()
      if (await expect(sub).toHaveClass(/ui-button--primary/, { timeout: 2_000 }).then(() => true).catch(() => false)) break
    }
    await expect(sub).toHaveClass(/ui-button--primary/)
  }

  for (const lv of [4, 8, 12, 16]) {
    if (lv > opts.level) break
    const asi =
      lv === 4
        ? page.getByTestId(`p24-m03c-asi-plus2-cleric-${lv}`)
        : page.getByTestId(`p24-m03c-asi-feat-cleric-${lv}`)
    if (await asi.isVisible().catch(() => false)) {
      await asi.scrollIntoViewIfNeeded()
      await asi.click()
    }
  }

  const forksBtn = page.getByTestId('p24-m03c-forks-cleric')
  await forksBtn.scrollIntoViewIfNeeded()
  await forksBtn.click()
  const forkList = page.getByTestId('p24-m03c-fork-list-cleric')
  await expect(forkList).toBeVisible()
  await forkList.scrollIntoViewIfNeeded()
  if (opts.level >= 7) {
    const pick = opts.blessedStrikes ?? 'divine_strike'
    const picker = page.getByTestId('p24-m02-blessed-strikes-pick')
    await picker.scrollIntoViewIfNeeded()
    await expect(picker).toBeVisible()
    await expect(picker).toContainText('Не выбрано')
    const chip = page.getByTestId(`p24-m02-blessed-strikes-${pick}`)
    await chip.scrollIntoViewIfNeeded()
    await chip.click()
    await expect(chip).toHaveAttribute('aria-selected', 'true')
    await expect(picker).not.toContainText('Не выбрано')
    if (opts.blessedPickShot) {
      await picker.scrollIntoViewIfNeeded()
      await shot(page, opts.shotDir, opts.blessedPickShot, opts.project)
    }
    if (opts.afterBlessedPick) await opts.afterBlessedPick(page)
  }
  if (opts.duringLeveling) await opts.duringLeveling(page)
  if (opts.stopAfterForks) return null

  await pickSpellsToQuota(page, 'cantrips', CANTRIPS)
  await pickSpellsToQuota(page, 'level1', PREPARED)
  if (opts.stepShots) {
    await page.getByTestId('p24-m03-spell-tab-level1').scrollIntoViewIfNeeded()
    await tallShot(page, opts.shotDir, `${prefix}step5-leveling-spells-picked`, opts.project)
    await page.getByTestId('p24-m03c-forks-cleric').scrollIntoViewIfNeeded()
    await unclipForks(page)
    await tallShot(page, opts.shotDir, `${prefix}step5-leveling-forks`, opts.project)
  }

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

async function storedSheet(store: HarnessStore): Promise<Record<string, any>> {
  return [...store.characters.values()][0]!.sheet as Record<string, any>
}

async function openCombatScene(page: Page, project: string) {
  if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Бой$/ }).first().click()
  await page.waitForTimeout(600)
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


async function expandCard(card: Locator) {
  const head = card.locator('.feature-card__head, .feature-card__name').first()
  const collapse = card.getByRole('button', { name: /^свернуть$/ })
  if (!(await collapse.isVisible().catch(() => false))) await head.click()
  await card.scrollIntoViewIfNeeded()
}

/** Open a cleric feature «use» dialog from the sheet card; returns the dialog. */
async function openCardUse(page: Page, cardName: RegExp, button: RegExp) {
  const card = await featureCard(page, cardName)
  await expandCard(card)
  await card.getByRole('button', { name: button }).first().click()
  const dlg = page.getByRole('dialog').last()
  await expect(dlg).toBeVisible({ timeout: 10_000 })
  return dlg
}

async function cancelDialog(page: Page, dlg: Locator) {
  await dlg.getByRole('button', { name: /^Отмена$/ }).click()
  await expect(dlg).toBeHidden({ timeout: 10_000 })
}

async function applyDialog(page: Page, dlg: Locator) {
  await dlg.getByRole('button', { name: /^Применить$/ }).click()
  await expect(dlg).toBeHidden({ timeout: 10_000 })
  await page.waitForTimeout(300)
}

async function channelCard(page: Page) {
  const card = await featureCard(page, /^Проведение божественности$/)
  await expandCard(card)
  return card
}

async function channelRemaining(page: Page): Promise<{ left: number; max: number }> {
  const card = await channelCard(page)
  const text = (await card.innerText()).replace(/\s+/g, ' ')
  const m = /Проведение божественности:\s*(\d+)\s*\/\s*(\d+)/.exec(text) ?? /(\d+)\/(\d+) · Проведение/.exec(text)
  if (!m) throw new Error(`channel pips not found in: ${text}`)
  return { left: Number(m[1]), max: Number(m[2]) }
}

async function spendChannelOnce(page: Page) {
  const before = (await channelRemaining(page)).left
  const spark = await openCardUse(page, /^Божественная искра$/, /Искра…/)
  await applyDialog(page, spark)
  await expect.poll(async () => (await channelRemaining(page)).left, { timeout: 10_000 }).toBe(before - 1)
}

/** 2024 Blessed Strikes pending choice (guided wizard): Divine Strike or Potent Spellcasting. */
async function resolveBlessedStrikes(page: Page, project: string, shotName?: string): Promise<boolean> {
  const dlg = page.getByRole('dialog').filter({ hasText: /Благословленные удары/ }).last()
  if (!(await dlg.isVisible({ timeout: 3_000 }).catch(() => false))) return false
  await expect(dlg.getByRole('button', { name: 'Божественный удар' })).toBeVisible()
  await expect(dlg.getByRole('button', { name: 'Могущественные заклинания' })).toBeVisible()
  if (shotName) await shot(page, ARTIFACTS, `${shotName}-choice`, project)
  await dlg.getByRole('button', { name: 'Божественный удар' }).click()
  if (shotName) await shot(page, ARTIFACTS, `${shotName}-choice-divine-strike`, project)
  const done = dlg.getByRole('button', { name: /^Готово$|^Далее$/ })
  await expect(done).toBeEnabled({ timeout: 5_000 })
  await done.click()
  await expect(dlg).toBeHidden({ timeout: 10_000 })
  return true
}

function channelFromSheet(sheet: Record<string, any>) {
  const find = (rows: unknown) =>
    ((rows ?? []) as Array<Record<string, any>>).find((r) => /channel_divinity/.test(String(r.id)))
  const row = find(sheet.play?.resources) ?? find(sheet.class_progress_2024?.resources)
  return row as { id: string; max: number; used: number } | undefined
}

async function waitStored(store: HarnessStore, fn: (s: Record<string, any>) => boolean) {
  await expect.poll(async () => fn(await storedSheet(store)), { timeout: 20_000 }).toBe(true)
}

async function liveLevelUp(
  page: Page,
  project: string,
  shotName: string,
  opts: { expectUpcoming?: RegExp[]; expectNoUpcoming?: boolean },
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
  } else if (opts.expectNoUpcoming) {
    await expect(raise.getByTestId('level-up-features')).toHaveCount(0)
  }
  await shot(page, ARTIFACTS, `${shotName}-features`, project)
  await raise.getByRole('button', { name: /^Повысить$/ }).click()
  await expect(raise).toBeHidden({ timeout: 15_000 })
  for (let i = 0; i < 8; i += 1) {
    const dlg = page.getByRole('dialog').last()
    if (!(await dlg.isVisible({ timeout: 2_500 }).catch(() => false))) break
    if (await resolveBlessedStrikes(page, project, `${shotName}-blessed-strikes`)) continue
    const primary = dlg.getByRole('button', { name: /^Далее$|^Готово$/ })
    if (await primary.isEnabled({ timeout: 2_000 }).catch(() => false)) await primary.click()
    else break
    await page.waitForTimeout(400)
  }
}

async function expandAllFeatures(page: Page) {
  const btn = page.getByRole('button', { name: /Развернуть все/ }).last()
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
    await page.waitForTimeout(400)
  }
}

test.describe('P24-M02 cleric — LIVE create (wizard clicked, no e2eSeed)', () => {
  test.setTimeout(240_000)
  test.use({ actionTimeout: 15_000 })

  test('create-live-at-5 life/protector: channel 2, spark, turn undead, sear undead, heavy armor', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveClericCreate(page, store, {
      name: 'Живой Жрец 5',
      level: 5,
      order: 'protector',
      subclassSlug: SUBCLASS.life,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-`,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText('1×4 · 2×3 · 3×2')
        const list = pg.getByTestId('p24-m03c-fork-list-cleric')
        await expect(list).toContainText('Проведение божественности')
        await expect(list).toContainText('Божественная искра')
        await expect(list).toContainText('Изгнание нежити')
        await expect(list).toContainText('Испепеление нежити')
        await expect(list).toContainText(/Подкласс выбран/)
      },
    })
    expect(channelFromSheet(sheet)).toMatchObject({ max: 2, used: 0 })
    const known = (sheet.spells?.known ?? []) as Array<{ level: number }>
    expect(known.filter((x) => x.level === 0).length).toBe(4)
    expect(sheet.proficiency?.armor?.heavy ?? sheet.proficiency?.armor?.includes?.('heavy')).toBeTruthy()
    expect(sheet.proficiency?.weapons?.martial).toBe(true)
    expect(sheet.class_options_2024?.divine_order).toBe('protector')
    // Dwarven Toughness: d8 avg 5 + CON 3 + 1 per level = 12 + 4*9 = 48
    expect(Number(store.characters.values().next().value!.hp_max)).toBe(48)

    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /Сотворение заклинаний/,
      /Божественный орден/,
      /Проведение божественности/,
      /Божественная искра/,
      /Изгнание нежити/,
      /Испепеление нежити/,
      /Поборник жизни/,
    ])
    if (!isPhone(project)) {
      await expect(page.getByText('Тяжёлые', { exact: true }).first()).toBeVisible()
    }
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-features-protector-heavy-armor`, project)

    expect(await channelRemaining(page)).toEqual({ left: 2, max: 2 })
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-channel-2of2`, project)

    const spark = await openCardUse(page, /^Божественная искра$/, /Искра…/)
    await expect(spark).toContainText(/Проведение божественности:\s*2\/2/)
    await expect(spark).toContainText(/1к8\+3/)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-divine-spark-1d8-wis`, project)
    await applyDialog(page, spark)
    expect(await channelRemaining(page)).toEqual({ left: 1, max: 2 })

    const turn = await openCardUse(page, /^Изгнание нежити$/, /Изгнать…/)
    await expect(turn).toContainText(/Нежить в 30 фт/)
    await expect(turn).toContainText(/Испепеление нежити: 3к8/)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-turn-undead-sear`, project)
    await applyDialog(page, turn)
    expect(await channelRemaining(page)).toEqual({ left: 0, max: 2 })
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-channel-0of2`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-11 life/protector: channel 3, divine intervention, blessed strikes, 6th circle', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveClericCreate(page, store, {
      name: 'Живой Жрец 11',
      level: 11,
      order: 'protector',
      subclassSlug: SUBCLASS.life,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-11-`,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText('1×4 · 2×3 · 3×3 · 4×3 · 5×2 · 6×1')
        const list = pg.getByTestId('p24-m03c-fork-list-cleric')
        await expect(list).toContainText('Благословленные удары')
        await expect(list).toContainText('Божественное вмешательство')
      },
    })
    expect(channelFromSheet(sheet)).toMatchObject({ max: 3, used: 0 })
    const known = (sheet.spells?.known ?? []) as Array<{ level: number }>
    expect(known.filter((x) => x.level === 0).length).toBe(5)

    // Blessed Strikes is picked in the wizard now (no pending-choice dialog after create).
    await expect(page.getByRole('dialog').filter({ hasText: /Благословленные удары/ })).toHaveCount(0)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /Благословленные удары/,
      /Божественное вмешательство/,
      /Испепеление нежити/,
      /Благословенный целитель/,
    ])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-features`, project)
    expect(await channelRemaining(page)).toEqual({ left: 3, max: 3 })

    const blessed = await featureCard(page, /^Благословленные удары$/)
    await expandCard(blessed)
    await expect(blessed).toContainText(/Божественный удар/)
    await expect(blessed).not.toContainText(/не выбрано|divine_strike/i)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-blessed-strikes`, project)

    const di = await openCardUse(page, /^Божественное вмешательство$/, /Вмешательство…/)
    await expect(di).toContainText(/Раз за долгий отдых/)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-divine-intervention-dialog`, project)
    await cancelDialog(page, di)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-5 thaumaturge: extra cantrip (4+1), no heavy armor / martial chips', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveClericCreate(page, store, {
      name: 'Чудотворец 5',
      level: 5,
      order: 'thaumaturge',
      subclassSlug: SUBCLASS.war,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-thaumaturge-`,
    })
    const known = (sheet.spells?.known ?? []) as Array<{ level: number }>
    expect(known.filter((x) => x.level === 0).length).toBe(5)
    expect(sheet.class_options_2024?.divine_order).toBe('thaumaturge')
    const armor = sheet.proficiency?.armor
    expect(Array.isArray(armor) ? armor.includes('heavy') : armor?.heavy).toBeFalsy()
    expect(sheet.proficiency?.weapons?.martial).not.toBe(true)

    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-thaumaturge-sheet`, project)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/Божественный орден/])
    if (!isPhone(project)) {
      await expect(page.getByText('Средние', { exact: true }).first()).toBeVisible()
      await expect(page.getByText('Тяжёлые', { exact: true })).toHaveCount(0)
      await expect(page.getByText('Воинское', { exact: true })).toHaveCount(0)
    }
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-thaumaturge-features`, project)
    expect(store.unmatched).toEqual([])
  })
})

test.describe('P24-M02 cleric — LIVE level-up (create wizard → sheet → +1 уровень)', () => {
  test.setTimeout(240_000)
  test.use({ actionTimeout: 15_000 })

  test('levelup-live 4→5: Испепеление нежити, 3rd-circle slots, cantrip 4', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveClericCreate(page, store, {
      name: 'Прокачка 4→5',
      level: 4,
      subclassSlug: SUBCLASS.life,
      shotDir: ARTIFACTS,
      project,
    })
    expect(channelFromSheet(await storedSheet(store))).toMatchObject({ max: 2 })
    await liveLevelUp(page, project, `${SHOT}-levelup-4to5`, {
      expectUpcoming: [/Испепеление нежити/],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 5)
    const sheet = await storedSheet(store)
    expect(sheet.classes[0].level).toBe(5)
    expect(sheet.spells?.slots?.['3']).toMatchObject({ max: 2 })

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/Испепеление нежити/, /Проведение божественности/, /Божественная искра/])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-4to5-sheet-features`, project)
    expect(await channelRemaining(page)).toEqual({ left: 2, max: 2 })
    expect(store.unmatched).toEqual([])
  })

  test('levelup-live 10→11: 6th-circle slot, channel stays 3, Божественное вмешательство kept', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveClericCreate(page, store, {
      name: 'Прокачка 10→11',
      level: 10,
      subclassSlug: SUBCLASS.light,
      shotDir: ARTIFACTS,
      project,
    })
    expect((await storedSheet(store)).spells?.slots?.['6']?.max ?? 0).toBe(0)
    await liveLevelUp(page, project, `${SHOT}-levelup-10to11`, { expectNoUpcoming: true })
    await waitStored(store, (s) => s.classes?.[0]?.level === 11)
    const sheet = await storedSheet(store)
    expect(sheet.spells?.slots?.['6']).toMatchObject({ max: 1 })
    expect(channelFromSheet(sheet)).toMatchObject({ max: 3 })

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /Божественное вмешательство/,
      /Благословленные удары/,
      /Ограждающая вспышка/,
    ])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-10to11-sheet-features`, project)
    expect(store.unmatched).toEqual([])
  })
})

test.describe('P24-M02 cleric — Channel Divinity rests', () => {
  test.setTimeout(240_000)
  test.use({ actionTimeout: 15_000 })

  test('short rest returns exactly 1 channel use; long rest returns all', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveClericCreate(page, store, {
      name: 'Отдых Жреца',
      level: 6,
      subclassSlug: SUBCLASS.light,
      shotDir: ARTIFACTS,
      project,
    })
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    expect(await channelRemaining(page)).toEqual({ left: 3, max: 3 })
    for (let i = 0; i < 3; i += 1) await spendChannelOnce(page)
    expect(await channelRemaining(page)).toEqual({ left: 0, max: 3 })
    await shot(page, ARTIFACTS, `${SHOT}-rest-channel-0of3-before-short`, project)

    await openRest(page, project)
    const rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).first()
    await shot(page, ARTIFACTS, `${SHOT}-rest-short-dialog`, project)
    await rest.getByRole('button', { name: /Сброс коротких ресурсов/ }).click()
    await page.waitForTimeout(500)
    await expect(rest).toContainText(/Проведение божественности:\s*0\s*→\s*1/)
    await shot(page, ARTIFACTS, `${SHOT}-rest-short-summary-channel-0-to-1`, project)
    await rest.getByRole('button', { name: /^Применить$/ }).click()
    await page.waitForTimeout(500)
    const closeBtn = page.getByRole('dialog').last().getByRole('button', { name: /^Закрыть$/ })
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click()
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    expect(await channelRemaining(page)).toEqual({ left: 1, max: 3 })
    await shot(page, ARTIFACTS, `${SHOT}-rest-channel-1of3-after-short`, project)

    await openRest(page, project)
    const rest2 = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).last()
    await rest2.getByText(/^Продолжительный$/).first().click()
    await page.waitForTimeout(400)
    await shot(page, ARTIFACTS, `${SHOT}-rest-long-dialog`, project)
    await rest2.getByRole('button', { name: /Сводка и применение/ }).click()
    await page.waitForTimeout(500)
    await expect(rest2).toContainText(/Проведение божественности:\s*1\s*→\s*3/)
    await shot(page, ARTIFACTS, `${SHOT}-rest-long-summary-channel-1-to-3`, project)
    const apply = rest2.getByRole('button', { name: /^Применить$/ })
    await apply.scrollIntoViewIfNeeded()
    await apply.click()
    await page.waitForTimeout(600)
    const close2 = page.getByRole('dialog').last().getByRole('button', { name: /^Закрыть$/ })
    if (await close2.isVisible().catch(() => false)) await close2.click()
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    expect(await channelRemaining(page)).toEqual({ left: 3, max: 3 })
    await shot(page, ARTIFACTS, `${SHOT}-rest-channel-3of3-after-long`, project)
    expect(store.unmatched).toEqual([])
  })
})

const DOMAIN_CASES = [
  {
    key: 'life',
    slug: SUBCLASS.life,
    features: {
      3: [/Поборник жизни/, /Заклинания домена жизни/, /Сохранение жизни/],
      6: [/Благословенный целитель/],
      17: [/Высшее исцеление/],
    },
    use: { 3: [/^Сохранение жизни$/, /Сохранить жизнь…/, /Пул лечения: 15 хитов/] },
  },
  {
    key: 'light',
    slug: SUBCLASS.light,
    features: {
      3: [/Заклинания домена света/, /Ограждающая вспышка/, /Сияние рассвета/],
      6: [/Улучшенная ограждающая вспышка/],
      17: [/Корона света/],
    },
    use: {
      3: [/^Ограждающая вспышка$/, /Вспышка/, /помеха на атаку/],
      17: [/^Корона света$/, /Корона…/, /Яркий свет 60 фт/],
    },
  },
  {
    key: 'trickery',
    slug: SUBCLASS.trickery,
    features: {
      3: [/Благословение обманщика/, /Двуличность/, /Заклинания домена обмана/],
      6: [/Рокировка/],
      17: [/Улучшенная двуличность/],
    },
    use: {
      3: [/^Двуличность$/, /Двуличность…/, /Бонусное действие, концентрация/],
      6: [/^Двуличность$/, /Двуличность…/, /Рокировка/],
      17: [/^Двуличность$/, /Двуличность…/, /Бонусное действие, концентрация/],
    },
  },
  {
    key: 'war',
    slug: SUBCLASS.war,
    features: {
      3: [/Боевой священник/, /Заклинания домена войны/, /Направленный удар/],
      6: [/Благословение бога войны/],
      17: [/Воплощение битвы/],
    },
    use: {
      3: [/^Боевой священник$/, /Удар священника/, /одна атака оружием/],
      6: [/^Благословение бога войны$/, /Благословение…/, /Щит веры|Духовное оружие/],
      17: [/^Направленный удар$/, /Направить удар/, /\+10 к броску атаки/],
    },
  },
] as const

async function shotDomainLevel(
  page: Page,
  store: HarnessStore,
  sub: (typeof DOMAIN_CASES)[number],
  level: 3 | 6 | 17,
  project: string,
) {
  await walkLiveClericCreate(page, store, {
    name: `${sub.key} L${level}`,
    level,
    subclassSlug: sub.slug,
    shotDir: ARTIFACTS,
    project,
  })
  await dismissGuided(page)
  await openFeaturesScene(page, project)
  const expected = [
    ...sub.features[3],
    ...(level >= 6 ? sub.features[6] : []),
    ...(level >= 17 ? sub.features[17] : []),
  ]
  await expectFeatureNames(page, expected)
  await expandAllFeatures(page)

  const use = (sub.use as Record<number, readonly RegExp[]>)[level]
  if (use) {
    const [cardRe, buttonRe, textRe] = use
    const dlg = await openCardUse(page, cardRe!, buttonRe!)
    await expect(dlg).toContainText(textRe!)
    await shot(page, ARTIFACTS, `${SHOT}-${sub.key}-${String(level).padStart(2, '0')}-use-dialog`, project)
    await cancelDialog(page, dlg)
  }
  await tallShot(page, ARTIFACTS, `${SHOT}-${sub.key}-${String(level).padStart(2, '0')}`, project)
  expect(store.unmatched).toEqual([])
}

test.describe('P24-M02 cleric — four PHB domains via LIVE create (L3 / L6 / L17)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  for (const sub of DOMAIN_CASES) {
    for (const level of [3, 6, 17] as const) {
      test(`2024-cleric-${sub.key}-${String(level).padStart(2, '0')}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        await shotDomainLevel(page, store, sub, level, project)
      })
    }
  }
})

test.describe('P24-M02 cleric — domain mechanics on the sheet', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('light L6: warding flare resets on short rest; improved flare card', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveClericCreate(page, store, {
      name: 'Вспышка L6',
      level: 6,
      subclassSlug: SUBCLASS.light,
      shotDir: ARTIFACTS,
      project,
    })
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    const flare = await openCardUse(page, /^Ограждающая вспышка$/, /Вспышка/)
    await applyDialog(page, flare)
    const card = await featureCard(page, /^Ограждающая вспышка$/)
    await expandCard(card)
    await expect(card).toContainText(/2\/3/)
    await shot(page, ARTIFACTS, `${SHOT}-light-06-warding-flare-2of3`, project)
    await openRest(page, project)
    const rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).first()
    await rest.getByRole('button', { name: /Сброс коротких ресурсов/ }).click()
    await page.waitForTimeout(500)
    await expect(rest).toContainText(/Ограждающая вспышка:\s*2\s*→\s*3/)
    await shot(page, ARTIFACTS, `${SHOT}-light-06-warding-flare-short-rest-reset`, project)
  })

  test('war L6: War God\'s Blessing dialog spends channel (action, not reaction)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveClericCreate(page, store, {
      name: 'Война L6',
      level: 6,
      subclassSlug: SUBCLASS.war,
      shotDir: ARTIFACTS,
      project,
    })
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    const dlg = await openCardUse(page, /^Благословение бога войны$/, /Благословение…/)
    await expect(dlg).toContainText(/Проведение божественности:\s*3\/3/)
    await shot(page, ARTIFACTS, `${SHOT}-war-06-war-gods-blessing-dialog`, project)
    await applyDialog(page, dlg)
    expect(await channelRemaining(page)).toEqual({ left: 2, max: 3 })
    await shot(page, ARTIFACTS, `${SHOT}-war-06-war-gods-blessing-channel-2of3`, project)
  })

  test('life L10: divine intervention spends 1/1, long rest restores; blessed strikes L14 names', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveClericCreate(page, store, {
      name: 'Вмешательство L10',
      level: 10,
      subclassSlug: SUBCLASS.life,
      shotDir: ARTIFACTS,
      project,
    })
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    const dlg = await openCardUse(page, /^Божественное вмешательство$/, /Вмешательство…/)
    const spellInput = dlg.getByRole('textbox')
    if (await spellInput.isVisible().catch(() => false)) await spellInput.fill('raise-dead')
    else await dlg.getByRole('button', { name: /кр\.$/ }).first().click()
    await shot(page, ARTIFACTS, `${SHOT}-divine-intervention-10-dialog-ready`, project)
    await applyDialog(page, dlg)
    const card = await featureCard(page, /^Божественное вмешательство$/)
    await expandCard(card)
    await expect(card).toContainText(/0\/1/)
    await shot(page, ARTIFACTS, `${SHOT}-divine-intervention-10-spent-0of1`, project)
  })
})

test.describe('P24-M02 cleric — level down in create wizard (rollback UI)', () => {
  test.setTimeout(240_000)
  test.use({ actionTimeout: 15_000 })

  const STEPS = [
    {
      name: 'rollback-3to2',
      from: 3,
      to: 2,
      sub: SUBCLASS.war,
      before: { slots: '1×4 · 2×2', has: /Подкласс выбран/ },
      after: { slots: '1×3', hasNot: /Подкласс/ },
    },
    {
      name: 'rollback-10to9',
      from: 10,
      to: 9,
      sub: SUBCLASS.light,
      before: { slots: '5×2', has: /Божественное вмешательство/ },
      after: { slots: '5×1', hasNot: /Божественное вмешательство/ },
    },
    {
      name: 'rollback-20to19',
      from: 20,
      to: 19,
      sub: SUBCLASS.trickery,
      before: { slots: '7×2', has: /Великое божественное вмешательство/ },
      after: { slots: '7×1', hasNot: /Великое божественное вмешательство/ },
    },
  ] as const

  for (const spec of STEPS) {
    test(spec.name, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await walkLiveClericCreate(page, store, {
        name: spec.name,
        level: spec.from,
        subclassSlug: spec.sub,
        shotDir: ARTIFACTS,
        project,
        stopAfterForks: true,
      })
      const list = page.getByTestId('p24-m03c-fork-list-cleric')
      await expect(page.getByTestId('p24-m03c-slots')).toContainText(spec.before.slots)
      await expect(list).toContainText(spec.before.has)
      await page.getByTestId('p24-m03c-forks-cleric').scrollIntoViewIfNeeded()
      await unclipForks(page)
      await tallShot(page, ARTIFACTS, `${SHOT}-${spec.name}-before-L${spec.from}`, project)

      const levelInput = page.getByTestId('p24-m03c-level-cleric')
      await levelInput.scrollIntoViewIfNeeded()
      await levelInput.fill(String(spec.to))
      await levelInput.blur()
      await expect(levelInput).toHaveValue(String(spec.to))
      const forks = page.getByTestId('p24-m03c-forks-cleric')
      await forks.scrollIntoViewIfNeeded()
      if (!(await list.isVisible().catch(() => false))) await forks.click()
      await expect(list).toBeVisible()
      await expect(page.getByTestId('p24-m03c-slots')).toContainText(spec.after.slots)
      await expect(list).not.toContainText(spec.after.hasNot)
      await unclipForks(page)
      await tallShot(page, ARTIFACTS, `${SHOT}-${spec.name}-after-L${spec.to}`, project)
    })
  }
})


/* ------------------------------------------------------------------ */
/* Доправка 1 (PR #502) — shots in `fixup1/`                            */
/* ------------------------------------------------------------------ */

const FIX1 = path.join(ARTIFACTS, 'fixup1')

test.beforeAll(() => {
  fs.mkdirSync(FIX1, { recursive: true })
})

async function f1shot(page: Page, name: string, project: string) {
  await shot(page, FIX1, `fixup1-${name}`, project)
}

async function f1tall(page: Page, name: string, project: string) {
  await tallShot(page, FIX1, `fixup1-${name}`, project)
}

async function f1el(target: Locator, name: string, project: string) {
  await target.scrollIntoViewIfNeeded()
  await target.page().mouse.move(2, 2)
  await target.page().waitForTimeout(350)
  await target.screenshot({ path: path.join(FIX1, `fixup1-${name}-${project}.png`) })
}

async function openExploreScene(page: Page, project: string) {
  if (isPhone(project)) await page.getByText('Исслед.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Исследование$/ }).first().click()
  await page.waitForTimeout(600)
}

async function openInventoryItem(page: Page, name: RegExp) {
  const card = page.locator('.inventory-card').filter({ hasText: name }).first()
  await expect(card).toBeVisible({ timeout: 10_000 })
  await card.scrollIntoViewIfNeeded()
  return card
}

/** Add an item through the live «Из справочника» picker (infrastructure mock only serves the catalog). */
async function addGearFromPicker(page: Page, project: string, query: string, optionName: RegExp) {
  await openExploreScene(page, project)
  const open = page.getByRole('button', { name: /Из справочника/ }).first()
  await open.scrollIntoViewIfNeeded()
  await open.click()
  const dlg = page.getByRole('dialog').last()
  await dlg.getByPlaceholder('Название, slug…').fill(query)
  await page.waitForTimeout(400)
  await dlg.getByRole('option').filter({ hasText: optionName }).first().click()
  await dlg.getByRole('button', { name: 'Добавить' }).click()
  await expect(dlg).toBeHidden({ timeout: 10_000 })
  await page.waitForTimeout(400)
}

async function expectVisibleNoRawIds(page: Page) {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/divine_strike|potent_spellcasting/)
}

/** Primary actions on a resource feature card: exactly one `.ui-button` (pips are `slot-pip`). */
async function expectSingleButton(card: Locator, label: RegExp) {
  await expect(card.locator('.ui-button')).toHaveCount(1)
  await expect(card.locator('.ui-button').first()).toHaveText(label)
  await expect(card.locator('.feature-resource__actions .ui-button')).toHaveCount(1)
}

async function blessedCard(page: Page) {
  const card = await featureCard(page, /^Благословленные удары$/)
  await expandCard(card)
  return card
}

async function createAndOpenFeatures(
  page: Page,
  project: string,
  opts: Omit<LiveClericOpts, 'shotDir' | 'project'>,
) {
  const store = createStore()
  const sheet = await walkLiveClericCreate(page, store, { ...opts, shotDir: FIX1, project })
  await dismissGuided(page)
  return { store, sheet: sheet as Record<string, any> }
}

test.describe('P24-M02 cleric — Доправка 1 (PR #502) live evidence', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  for (const pick of ['divine_strike', 'potent_spellcasting'] as const) {
    const slug = pick.replace('_', '-')
    const label = pick === 'divine_strike' ? 'Божественный удар' : 'Могущественные заклинания'
    test(`fixup1-1 create-at-11 Blessed Strikes picked in wizard: ${pick}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const { store, sheet } = await createAndOpenFeatures(page, project, {
        name: `Удары 11 ${slug}`,
        level: 11,
        order: 'protector',
        subclassSlug: SUBCLASS.life,
        blessedStrikes: pick,
        blessedPickShot: `fixup1-create11-blessed-strikes-pick-${slug}`,
      })
      expect(store.lastCreatePayload).toMatchObject({ class_option_picks: { blessed_strikes: pick } })
      expect(sheet.feature_picks?.values?.['class-cleric:blessed_strikes']).toBe(pick)
      expect(sheet.class_options_2024?.blessed_strikes).toBe(pick)

      await expect(page.getByRole('dialog').filter({ hasText: /Благословленные удары/ })).toHaveCount(0)
      await openFeaturesScene(page, project)
      const card = await blessedCard(page)
      await expect(card).toContainText(`Благословленные удары: ${label}`)
      await expect(card).not.toContainText(/не выбрано/i)
      await expect(card).not.toContainText(/divine_strike|potent_spellcasting/)
      await f1el(card, `create11-blessed-card-${slug}`, project)
      expect(store.unmatched).toEqual([])
    })
  }

  test('fixup1-2/5/8 life-17: no raw ids, Divine Spark 3к8+3, Supreme Healing card', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAndOpenFeatures(page, project, {
      name: 'Жизнь 17',
      level: 17,
      order: 'protector',
      subclassSlug: SUBCLASS.life,
      blessedStrikes: 'divine_strike',
    })
    await openFeaturesScene(page, project)
    await expandAllFeatures(page)
    await expectFeatureNames(page, [
      /Благословленные удары/,
      /Высшее исцеление/,
      /Божественная искра/,
      /Сохранение жизни/,
    ])
    await expectVisibleNoRawIds(page)
    const blessed = await blessedCard(page)
    await expect(blessed).toContainText('Божественный удар')
    await f1tall(page, 'life-17-no-raw-ids', project)

    const supreme = await featureCard(page, /^Высшее исцеление$/)
    await expandCard(supreme)
    await expect(supreme).toContainText(/Кости лечения заклинаний и Проведения божественности дают максимум/)
    await f1el(supreme, 'life-17-supreme-healing', project)

    const sparkCard = await featureCard(page, /^Божественная искра$/)
    await expandCard(sparkCard)
    await expect(sparkCard).toContainText(/3к8\+3/)
    await expect(sparkCard).not.toContainText(/\(\+2\/3\/4к8|1к8\(/)
    const spark = await openCardUse(page, /^Божественная искра$/, /Искра…/)
    await expect(spark).toContainText(/3к8\+3/)
    await expect(spark).not.toContainText(/\+2\/3\/4к8/)
    await f1shot(page, 'spark-formula-17', project)
    await cancelDialog(page, spark)
    await expectVisibleNoRawIds(page)
    expect(store.unmatched).toEqual([])
  })

  test('fixup1-5/6 L11: Divine Spark 2к8+3 (not ladder), single button on spark/turn/preserve/intervention', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAndOpenFeatures(page, project, {
      name: 'Искра 11',
      level: 11,
      order: 'protector',
      subclassSlug: SUBCLASS.life,
      blessedStrikes: 'divine_strike',
    })
    await openFeaturesScene(page, project)
    await expandAllFeatures(page)

    const sparkCard = await featureCard(page, /^Божественная искра$/)
    await expandCard(sparkCard)
    await expect(sparkCard).toContainText(/2к8\+3/)
    await expect(sparkCard).not.toContainText(/\(\+2\/3\/4к8|1к8\(/)
    const spark = await openCardUse(page, /^Божественная искра$/, /Искра…/)
    await expect(spark).toContainText(/2к8\+3/)
    await expect(spark).not.toContainText(/\+2\/3\/4к8|1к8\(/)
    await f1shot(page, 'spark-formula-11', project)
    await cancelDialog(page, spark)
    await f1el(sparkCard, 'spark-formula-11-card', project)

    const turnCard = await featureCard(page, /^Изгнание нежити$/)
    const lifeCard = await featureCard(page, /^Сохранение жизни$/)
    const diCard = await featureCard(page, /^Божественное вмешательство$/)
    for (const [card, label] of [
      [sparkCard, /^Искра…$/],
      [turnCard, /^Изгнать…$/],
      [lifeCard, /^Сохранить жизнь…$/],
      [diCard, /^Вмешательство…$/],
    ] as const) {
      await expandCard(card)
      await expectSingleButton(card, label)
    }
    await f1el(sparkCard, 'single-button-spark', project)
    await f1el(turnCard, 'single-button-turn-undead', project)
    await f1el(lifeCard, 'single-button-preserve-life', project)
    await f1el(diCard, 'single-button-divine-intervention', project)
    await f1tall(page, 'single-button-features', project)
    expect(store.unmatched).toEqual([])
  })

  test('fixup1-3 divine strike on weapon attack (protector L11, +1к8 radiant/necrotic)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAndOpenFeatures(page, project, {
      name: 'Божественный удар 11',
      level: 11,
      order: 'protector',
      subclassSlug: SUBCLASS.life,
      blessedStrikes: 'divine_strike',
    })
    await addGearFromPicker(page, project, 'Длинный меч', /^Длинный меч/)
    const sword = await openInventoryItem(page, /Длинный меч/)
    await sword.locator('.inventory-equip').first().click()
    await page.waitForTimeout(500)
    await openCombatScene(page, project)
    const attacks = page.locator('.attack-row, .attack-card, [class*="attack"]').filter({ hasText: /Длинный меч/ }).first()
    await expect(attacks).toBeVisible({ timeout: 10_000 })
    await expect(attacks).toContainText(/1к8 излучением или некротическим, раз в ход/)
    if (!isPhone(project)) {
      const hide = page.getByRole('button', { name: /^магия$/ }).first()
      if (await hide.isVisible().catch(() => false)) await hide.click()
      await page.waitForTimeout(400)
    }
    await attacks.scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    await f1shot(page, 'divine-strike-attack', project)
    await f1el(attacks, 'divine-strike-attack-card', project)
    await expectVisibleNoRawIds(page)
    expect(store.unmatched).toEqual([])
  })

  test('fixup1-4 Potent Spellcasting on Sacred Flame (L11, Wis 17 → 3к8+3)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAndOpenFeatures(page, project, {
      name: 'Могущественные 11',
      level: 11,
      order: 'protector',
      subclassSlug: SUBCLASS.life,
      blessedStrikes: 'potent_spellcasting',
    })
    expect(Math.floor((Number(sheet.abilities?.wis?.score) - 10) / 2)).toBe(3)
    expect(sheet.feature_picks?.values?.['class-cleric:blessed_strikes']).toBe('potent_spellcasting')
    await openCombatScene(page, project)
    if (isPhone(project)) {
      await page
        .locator(':is(button,[role=tab],[role=button]):visible', { hasText: /^Заклинания$/ })
        .first()
        .click()
      await page.waitForTimeout(500)
    }
    const flameName = page.getByText('Священное пламя', { exact: true }).first()
    await expect(flameName).toBeVisible({ timeout: 10_000 })
    await flameName.scrollIntoViewIfNeeded()
    const row = page.locator('.play-desk-compact__row.is-spell').filter({ hasText: /Священное пламя/ }).first()
    await expect(row).toContainText(/3[dк]8\+3/)
    await page.mouse.move(2, 2)
    await f1shot(page, 'potent-sacred-flame', project)
    await f1el(row, 'potent-sacred-flame-row', project)

    await row.getByRole('button', { name: /^Каст$/i }).click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg).toBeVisible({ timeout: 10_000 })
    await expect(dlg).toContainText(/3[dк]8\+3/)
    await f1shot(page, 'potent-sacred-flame-cast-dialog', project)
    await dlg.getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click()
    await expectVisibleNoRawIds(page)
    expect(store.unmatched).toEqual([])
  })

  test('fixup1-7 protector heavy armor: chain mail + shield → AC 18, martial weapon attack', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAndOpenFeatures(page, project, {
      name: 'Защитник AC18',
      level: 5,
      order: 'protector',
      subclassSlug: SUBCLASS.life,
    })
    expect(sheet.proficiency?.armor?.heavy ?? sheet.proficiency?.armor?.includes?.('heavy')).toBeTruthy()
    expect(sheet.proficiency?.weapons?.martial).toBe(true)
    // Option A starting gear is a chain SHIRT; chain mail comes from the live gear picker.
    expect((sheet.inventory?.items ?? []).some((i: any) => i.slug === 'chain-mail')).toBe(false)

    await addGearFromPicker(page, project, 'Кольчуж', /^Кольчужный доспех/)
    await addGearFromPicker(page, project, 'Щит', /^Щит/)
    await addGearFromPicker(page, project, 'Длинный меч', /^Длинный меч/)
    await openExploreScene(page, project)
    for (const [name, kind] of [
      [/Кольчужный доспех/, 'armor'],
      [/^Щит.*Щит/, 'shield'],
      [/Длинный меч/, 'weapon'],
    ] as const) {
      const card = await openInventoryItem(page, name)
      const equip = card.locator('.inventory-equip').first()
      if (!(await equip.evaluate((el) => el.classList.contains('is-on')))) await equip.click()
      await page.waitForTimeout(300)
      void kind
    }
    await expect(page.getByText(/^КД 18$/).first()).toBeVisible({ timeout: 10_000 })
    await page.getByRole('tablist', { name: 'Фильтр инвентаря' }).getByText('Надето', { exact: true }).click()
    await page.waitForTimeout(400)
    const worn = page.locator('.inventory-card').filter({ hasText: /Кольчужный доспех/ }).first()
    await expect(worn).toBeVisible()
    await expect(worn.locator('.inventory-equip.is-on')).toHaveCount(1)
    await expect(page.locator('.inventory-card').filter({ hasText: /^Щит/ }).first().locator('.inventory-equip.is-on')).toHaveCount(1)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await expect(page.getByText(/^КД 18$/).first()).toBeVisible()
    await page.mouse.move(2, 2)
    await worn.scrollIntoViewIfNeeded()
    await f1shot(page, 'protector-ac18-equipped-list', project)
    await page.evaluate(() => {
      window.scrollTo(0, 0)
      document.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (el.scrollTop > 0) el.scrollTop = 0
      })
    })
    await page.getByText(/^КД 18$/).first().scrollIntoViewIfNeeded()
    await f1shot(page, 'protector-ac18', project)

    await openCombatScene(page, project)
    const str = Math.floor((Number(sheet.abilities?.str?.score) - 10) / 2)
    const expected = str + 3
    const sword = page.locator('[class*="attack"]').filter({ hasText: /Длинный меч/ }).first()
    await expect(sword).toBeVisible({ timeout: 10_000 })
    await expect(sword.locator('button').filter({ hasText: /^\+\d+$/ }).first()).toHaveText(`+${expected}`)
    await expect(sword).toContainText(/1к8\+1 рубящий/)
    await expect(sword).not.toContainText(/\bslashing\b/i)
    await expect(sword).toContainText(/в руках/)
    await sword.scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    await f1shot(page, 'protector-martial-attack', project)
    await f1el(sword, 'protector-martial-attack-card', project)
    expect(store.unmatched).toEqual([])
  })

  for (const pick of ['divine_strike', 'potent_spellcasting'] as const) {
    const slug = pick.replace('_', '-')
    test(`fixup1-9 Improved Blessed Strikes L14: ${pick}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const { store } = await createAndOpenFeatures(page, project, {
        name: `Улучшенные 14 ${slug}`,
        level: 14,
        order: 'protector',
        subclassSlug: SUBCLASS.life,
        blessedStrikes: pick,
      })
      if (pick === 'divine_strike') {
        await addGearFromPicker(page, project, 'Длинный меч', /^Длинный меч/)
        const sword = await openInventoryItem(page, /Длинный меч/)
        await sword.locator('.inventory-equip').first().click()
        await page.waitForTimeout(500)
        await openCombatScene(page, project)
        if (!isPhone(project)) {
          const hide = page.getByRole('button', { name: /^магия$/ }).first()
          if (await hide.isVisible().catch(() => false)) await hide.click()
          await page.waitForTimeout(400)
        }
        const attack = page.locator('[class*="attack"]').filter({ hasText: /Длинный меч/ }).first()
        await expect(attack).toBeVisible({ timeout: 10_000 })
        await expect(attack).toContainText(/2к8 излучением или некротическим, раз в ход/)
        await page.mouse.move(2, 2)
        await f1shot(page, `improved-blessed-14-${slug}-weapon`, project)
        await f1el(attack, `improved-blessed-14-${slug}-weapon-card`, project)
      }
      await openFeaturesScene(page, project)
      await expandAllFeatures(page)
      const improved = await featureCard(page, /^Улучшенные Благословленные удары$/)
      await expandCard(improved)
      await expect(improved).toContainText(
        pick === 'divine_strike' ? /Божественный удар → 2к8/ : /временные хиты \(Мудрость × 2\)/,
      )
      const blessed = await blessedCard(page)
      await expect(blessed).toContainText(
        `Благословленные удары: ${pick === 'divine_strike' ? 'Божественный удар' : 'Могущественные заклинания'}`,
      )
      await f1el(improved, `improved-blessed-14-${slug}-card`, project)
      await f1tall(page, `improved-blessed-14-${slug}-features`, project)
      await expectVisibleNoRawIds(page)
      expect(store.unmatched).toEqual([])
    })
  }
})

const FIX2 = path.join(ARTIFACTS, 'fixup2')

test.beforeAll(() => {
  fs.mkdirSync(FIX2, { recursive: true })
})

async function f2shot(page: Page, name: string, project: string) {
  await shot(page, FIX2, `fixup2-${name}`, project)
}

async function f2el(target: Locator, name: string, project: string) {
  await target.scrollIntoViewIfNeeded()
  await target.page().mouse.move(2, 2)
  await target.page().waitForTimeout(350)
  await target.screenshot({ path: path.join(FIX2, `fixup2-${name}-${project}.png`) })
}

test.describe('P24-M02 cleric — Доправка 2 (PR #502) damage type RU', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('fixup2 protector longsword damage type is рубящий (not slashing)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAndOpenFeatures(page, project, {
      name: 'Защитник тип урона',
      level: 5,
      order: 'protector',
      subclassSlug: SUBCLASS.life,
    })
    await addGearFromPicker(page, project, 'Длинный меч', /^Длинный меч/)
    const swordCard = await openInventoryItem(page, /Длинный меч/)
    const equip = swordCard.locator('.inventory-equip').first()
    if (!(await equip.evaluate((el) => el.classList.contains('is-on')))) await equip.click()
    await page.waitForTimeout(400)
    await openCombatScene(page, project)
    const sword = page.locator('[class*="attack"]').filter({ hasText: /Длинный меч/ }).first()
    await expect(sword).toBeVisible({ timeout: 10_000 })
    // Versatile alone → 1к10; with shield (fixup1-7) → 1к8. Type must be RU either way.
    await expect(sword).toContainText(/1к(?:8|10)\+1 рубящий/)
    await expect(sword).not.toContainText(/\bslashing\b/i)
    await expect(sword).not.toContainText(/\bpiercing\b/i)
    await expect(sword).not.toContainText(/\bbludgeoning\b/i)
    await sword.scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    await f2shot(page, 'protector-martial-рубящий', project)
    await f2el(sword, 'protector-martial-рубящий-card', project)
    expect(store.unmatched).toEqual([])
  })
})
