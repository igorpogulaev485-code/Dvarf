/**
 * P24-M02-druid live create / level-up / Wild Shape / rest evidence (no e2eSeed).
 *
 * Walks the real create wizard at `/characters/create?edition=2024&preview=1`
 * with API mocking (auth/catalog/create-2024 bridge) — infrastructure only.
 * Bestiary rows come from the repo 2024 SRD animals file.
 * Every major step is clicked; seed harness is NOT used as create evidence.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  createStore,
  installDruidHarness,
  type HarnessStore,
} from './support/druid2024Harness'

const ARTIFACTS = '/opt/cursor/artifacts/p24-m02-druid'
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
  'produce-flame', 'thorn-whip', 'shillelagh', 'druidcraft', 'guidance', 'mending',
  'message', 'poison-spray', 'resistance', 'spare-the-dying', 'elementalism', 'thunderclap',
]
/** Druid list spells that are not granted by any PHB circle or class feature, interleaved by circle. */
const PREPARED = [
  'animal-friendship', 'aid', 'dispel-magic', 'blight', 'awaken',
  'detect-magic', 'barkskin', 'daylight', 'charm-monster', 'commune-with-nature',
  'goodberry', 'augury', 'plant-growth', 'confusion', 'contagion',
  'healing-word', 'enhance-ability', 'meld-into-stone', 'divination', 'heal',
  'jump', 'hold-person', 'protection-from-energy', 'control-water', 'mass-cure-wounds',
  'longstrider', 'animal-messenger', 'revivify', 'dominate-beast', 'scrying',
  'entangle', 'flame-blade', 'sleet-storm', 'freedom-of-movement', 'greater-restoration',
  'purify-food-and-drink', 'darkvision', 'speak-with-plants', 'giant-insect', 'tree-stride',
  'create-or-destroy-water', 'heat-metal', 'water-walk', 'locate-creature', 'planar-binding',
  'detect-poison-and-disease', 'continual-flame', 'wind-wall', 'stone-shape', 'reincarnate',
  'protection-from-evil-and-good', 'enlarge-reduce', 'conjure-woodland-beings', 'wall-of-stone',
]

const SUB = {
  land: 'druid__land',
  moon: 'druid__moon',
  sea: 'druid__sea',
  stars: 'druid__stars',
} as const

const SHOT = '2024-druid'

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
    if (!(await card.count())) continue
    await card.scrollIntoViewIfNeeded()
    await card.click()
    picked += 1
  }
  expect(picked, `could not fill ${tab} quota`).toBe(need)
  return need
}

type LiveDruidOpts = {
  name: string
  level: number
  order?: 'magician' | 'warden'
  subclassSlug: string | null
  land?: 'arid' | 'polar' | 'temperate' | 'tropical'
  fury?: 'potent_spellcasting' | 'primal_strike'
  shotDir: string
  project: string
  stepShots?: boolean
  shotPrefix?: string
  duringLeveling?: (page: Page) => Promise<void>
  stopAfterForks?: boolean
  classEquipment?: 'a' | 'gold'
  asiPlan?: 'plus2' | 'feat'
}

async function pickKnownForms(page: Page, level: number) {
  const budget = level >= 8 ? 8 : level >= 4 ? 6 : 4
  const picker = page.getByTestId('p24-m02-known-forms-pick')
  await picker.scrollIntoViewIfNeeded()
  await expect(picker).toContainText(new RegExp(`0/${budget}`))
  await picker.getByRole('textbox').first().fill('Волк')
  await page.waitForTimeout(300)
  await picker.getByRole('button', { name: /^\+ Волк · CR 1\/4/ }).first().click()
  await picker.getByRole('textbox').first().fill('')
  for (let i = 1; i < budget; i += 1) {
    await picker.getByRole('button', { name: /^\+ / }).first().click()
  }
  await expect(picker).toContainText(new RegExp(`${budget}/${budget}`))
}

async function walkLiveDruidCreate(page: Page, store: HarnessStore, opts: LiveDruidOpts) {
  const prefix = opts.shotPrefix ?? ''
  const order = opts.order ?? 'magician'
  await installDruidHarness(page, store)
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
  await selectCatalogCard(page, 'Друид')
  await pickPrefixed(page, 'p24-m03-pick-skill', ['nature', 'survival'])
  await pickPrefixed(page, 'p24-m03-pick-order', [order])
  await pickPrefixed(page, 'p24-m03-pick-class-equipment', [opts.classEquipment ?? 'a'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) {
    await page.getByTestId(`p24-m03-pick-order-${order}`).scrollIntoViewIfNeeded()
    await tallShot(page, opts.shotDir, `${prefix}step3-class-primal-order-${order}`, opts.project)
  }
  await next(page)

  await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
  const layOut = page.getByRole('button', { name: /Разложить по приоритету класса/i })
  if (await layOut.isVisible().catch(() => false)) await layOut.click()
  if (opts.stepShots) await shot(page, opts.shotDir, `${prefix}step4-abilities`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 20_000 })
  const levelInput = page.getByTestId('p24-m03c-level-druid')
  await expect(levelInput).toBeVisible()
  await levelInput.fill(String(opts.level))
  await levelInput.blur()
  await expect(levelInput).toHaveValue(String(opts.level))

  if (opts.level >= 3 && opts.subclassSlug) {
    const sub = page.getByTestId(`p24m03c-subclass-${opts.subclassSlug}`.replace('p24m03c', 'p24-m03c')).first()
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
        ? page.getByTestId(`p24-m03c-asi-plus2-druid-${lv}`)
        : page.getByTestId(`p24-m03c-asi-feat-druid-${lv}`)
    if (await asi.isVisible().catch(() => false)) {
      await asi.scrollIntoViewIfNeeded()
      await asi.click()
    }
  }

  const forksBtn = page.getByTestId('p24-m03c-forks-druid')
  await forksBtn.scrollIntoViewIfNeeded()
  await forksBtn.click()
  const forkList = page.getByTestId('p24-m03c-fork-list-druid')
  await expect(forkList).toBeVisible()
  await forkList.scrollIntoViewIfNeeded()

  if (opts.level >= 2) await pickKnownForms(page, opts.level)
  if (opts.level >= 3 && opts.subclassSlug === SUB.land) {
    const picker = page.getByTestId('p24-m02-land-terrain-pick')
    await picker.scrollIntoViewIfNeeded()
    await expect(picker).toContainText('Не выбрано')
    const chip = page.getByTestId(`p24-m02-land-terrain-${opts.land ?? 'temperate'}`)
    await chip.scrollIntoViewIfNeeded()
    await chip.click()
    await expect(picker).not.toContainText('Не выбрано')
  }
  if (opts.level >= 7) {
    const pick = opts.fury ?? 'primal_strike'
    const picker = page.getByTestId('p24-m02-elemental-fury-pick')
    await picker.scrollIntoViewIfNeeded()
    await expect(picker).toContainText('Не выбрано')
    const chip = page.getByTestId(`p24-m02-elemental-fury-${pick}`)
    await chip.scrollIntoViewIfNeeded()
    await chip.click()
    await expect(picker).not.toContainText('Не выбрано')
  }
  if (opts.duringLeveling) await opts.duringLeveling(page)
  if (opts.stopAfterForks) return null

  await pickSpellsToQuota(page, 'cantrips', CANTRIPS)
  await pickSpellsToQuota(page, 'level1', PREPARED)
  if (opts.stepShots) {
    await page.getByTestId('p24-m03-spell-tab-level1').scrollIntoViewIfNeeded()
    await tallShot(page, opts.shotDir, `${prefix}step5-leveling-spells-picked`, opts.project)
    await page.getByTestId('p24-m03c-forks-druid').scrollIntoViewIfNeeded()
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
  const sheet = store.createdSheet as Record<string, any>
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

async function openCompanionsScene(page: Page, project: string) {
  if (isPhone(project)) await page.getByText('Напарн.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Напарники/ }).first().click()
  await page.waitForTimeout(600)
}

async function openExploreScene(page: Page, project: string) {
  if (isPhone(project)) await page.getByText('Исслед.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Исследование$/ }).first().click()
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

async function expectNoFeatureNames(page: Page, names: RegExp[]) {
  for (const re of names) {
    await expect(
      page.locator('.feature-card__name, .feature-card__title').filter({ hasText: re }),
      `feature must be absent ${re}`,
    ).toHaveCount(0)
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

async function expandAllFeatures(page: Page) {
  const btn = page.getByRole('button', { name: /Развернуть все/ }).last()
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
    await page.waitForTimeout(400)
  }
}

async function openCardUse(page: Page, cardName: RegExp, button: RegExp) {
  const card = await featureCard(page, cardName)
  await expandCard(card)
  await card.getByRole('button', { name: button }).first().click()
  const dlg = page.getByRole('dialog').last()
  await expect(dlg).toBeVisible({ timeout: 10_000 })
  return dlg
}

async function cancelDialog(page: Page, dlg: Locator) {
  await dlg.getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click()
  await expect(dlg).toBeHidden({ timeout: 10_000 })
}

async function applyDialog(page: Page, dlg: Locator) {
  await dlg.getByRole('button', { name: /^Применить$/ }).click()
  await expect(dlg).toBeHidden({ timeout: 10_000 })
  await page.waitForTimeout(300)
}

function wisModOf(sheet: Record<string, any>): number {
  return Math.floor((Number(sheet.abilities?.wis?.score ?? 10) - 10) / 2)
}

function wildShapeFromSheet(sheet: Record<string, any>) {
  const row = ((sheet.resources ?? []) as Array<Record<string, any>>).find((r) =>
    /wild_shape:wild_shape$/.test(String(r.id)),
  )
  return row as { id: string; max: number; used: number; shortRestRegain?: number } | undefined
}

function armorHas(sheet: Record<string, any>, kind: 'light' | 'medium' | 'heavy') {
  const armor = sheet.proficiency?.armor
  return Array.isArray(armor) ? armor.includes(kind) : Boolean(armor?.[kind])
}

function knownByLevel(sheet: Record<string, any>, level: number) {
  return ((sheet.spells?.known ?? []) as Array<{ level: number }>).filter((x) => x.level === level)
    .length
}

function preparedLeveled(sheet: Record<string, any>) {
  return ((sheet.spells?.known ?? []) as Array<{ level: number; prepared?: boolean }>).filter(
    (x) => x.level > 0,
  ).length
}

async function readPreparedMax(page: Page, project: string): Promise<number> {
  await openCombatScene(page, project)
  if (isPhone(project)) {
    await page
      .locator(':is(button,[role=tab],[role=button]):visible', { hasText: /^Заклинания$/ })
      .first()
      .click()
    await page.waitForTimeout(500)
  }
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
  const m = /подготовлено\s+(\d+)\s+из\s+(\d+)/i.exec(text)
  if (!m) throw new Error('prepared counter not found')
  return Number(m[2])
}

async function waitStored(store: HarnessStore, fn: (s: Record<string, any>) => boolean) {
  await expect.poll(async () => fn(await storedSheet(store)), { timeout: 20_000 }).toBe(true)
}

async function wildShapeCounter(page: Page): Promise<{ left: number; max: number }> {
  const card = await featureCard(page, /^Дикий облик/)
  await expandCard(card)
  const text = (await card.innerText()).replace(/\s+/g, ' ')
  const m = /Дикий облик:\s*(\d+)\s*\/\s*(\d+)/.exec(text)
  if (!m) throw new Error(`wild shape pips not found in: ${text}`)
  return { left: Number(m[1]), max: Number(m[2]) }
}

/** Real sheet flow: Способности → Дикий облик → бестиарий → снаряжение. */
async function enterWildShape(
  page: Page,
  project: string,
  opts: { query: string; name: RegExp; equipment?: RegExp; shotPrefix?: string },
) {
  await openFeaturesScene(page, project)
  const card = await featureCard(page, /^Дикий облик/)
  await expandCard(card)
  await card.getByRole('button', { name: /Потратить…|Облик…/ }).first().click()
  const dlg = page.getByRole('dialog').last()
  await expect(dlg).toContainText(/Известных обликов:/)
  if (opts.shotPrefix) await shot(page, ARTIFACTS, `${opts.shotPrefix}-fork-dialog`, project)
  await dlg.getByRole('button', { name: /Дикий облик \(бонусным\)/ }).click()
  await expect(dlg).toContainText(/Известные облики: \d+\/\d+/)
  if (opts.shotPrefix) await shot(page, ARTIFACTS, `${opts.shotPrefix}-beast-filter-all`, project)
  await dlg.getByRole('button', { name: opts.name }).first().click()
  await expect(dlg).toContainText(/Снаряжение в облике/)
  if (opts.shotPrefix) await shot(page, ARTIFACTS, `${opts.shotPrefix}-equipment-step`, project)
  await dlg.getByRole('button', { name: opts.equipment ?? /Надето на облик/ }).click()
  const tempPool = page.getByRole('dialog').filter({ hasText: /один пул/i })
  if (await tempPool.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await tempPool.getByRole('button', { name: /^Заменить на/ }).click()
  }
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 })
  await page.waitForTimeout(500)
}

async function exitWildShape(page: Page, project: string, name: RegExp) {
  await openCompanionsScene(page, project)
  const reset = page.getByRole('button', { name: /Сбросить облик/ }).first()
  if (!(await reset.isVisible({ timeout: 1_000 }).catch(() => false))) {
    const change = page.getByRole('button', { name: /^Изменить$/ }).first()
    if (!(await change.isVisible({ timeout: 1_000 }).catch(() => false))) {
      await page.getByRole('button', { name }).first().click()
    }
    if (await change.isVisible({ timeout: 2_000 }).catch(() => false)) await change.click()
  }
  await reset.scrollIntoViewIfNeeded()
  await reset.click()
  await page.waitForTimeout(500)
}

async function openHeaderHp(page: Page, project: string) {
  if (isPhone(project)) await ensureMobileVitalsExpanded(page)
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
    const primary = dlg.getByRole('button', { name: /^Далее$|^Готово$/ })
    if (await primary.isEnabled({ timeout: 2_000 }).catch(() => false)) await primary.click()
    else break
    await page.waitForTimeout(400)
  }
}

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

async function openInventoryItem(page: Page, name: RegExp) {
  const card = page.locator('.inventory-card').filter({ hasText: name }).first()
  await expect(card).toBeVisible({ timeout: 10_000 })
  await card.scrollIntoViewIfNeeded()
  return card
}

async function equipItem(page: Page, name: RegExp) {
  const card = await openInventoryItem(page, name)
  const equip = card.locator('.inventory-equip').first()
  if (!(await equip.evaluate((el) => el.classList.contains('is-on')))) await equip.click()
  await page.waitForTimeout(400)
}

async function scrollTop(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      if (el.scrollTop > 0) el.scrollTop = 0
    })
  })
}

async function expectVisibleNoRawIds(page: Page) {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/potent_spellcasting|primal_strike|wild_shape|elemental_fury/)
}

async function createAt(
  page: Page,
  project: string,
  opts: Omit<LiveDruidOpts, 'shotDir' | 'project'> & { dir?: string },
) {
  const store = createStore()
  const sheet = await walkLiveDruidCreate(page, store, {
    ...opts,
    shotDir: opts.dir ?? ARTIFACTS,
    project,
  })
  await dismissGuided(page)
  return { store, sheet: sheet as Record<string, any> }
}

/* ------------------------------------------------------------------ */
/* Create-at-5 / create-at-11                                          */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 druid — LIVE create (wizard clicked, no e2eSeed)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('create-live-at-5 warden/land: table, Wild Shape 2, Wild Resurgence, spell picker N of M', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveDruidCreate(page, store, {
      name: 'Живой Друид 5',
      level: 5,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'temperate',
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-`,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText('1×4 · 2×3 · 3×2')
        const list = pg.getByTestId('p24-m03c-fork-list-druid')
        await expect(list).toContainText('Дикий облик')
        await expect(list).toContainText('Дикое восстановление')
        await expect(list).toContainText(/Подкласс выбран/)
        await expect(list).not.toContainText('Ярость стихий')
        await expect(pg.getByTestId('p24-m03-spell-tab-cantrips')).toContainText('0/3')
        await expect(pg.getByTestId('p24-m03-spell-tab-level1')).toContainText('0/9')
        await pg.getByTestId('p24-m03-spell-tab-level1').click()
        await expect(pg.getByTestId('p24-m03-spell-pick-counter')).toContainText('Выбрано 0 из 9')
        await expect(pg.getByTestId('p24-m03-spell-pick-counter')).toContainText('круги 1–3')
        await expect(pg.getByTestId('p24-m03-card-dispel-magic')).toBeVisible()
        await expect(pg.getByTestId('p24-m03-card-blight')).toHaveCount(0)
        await pg.getByTestId('p24-m03-spell-pick-counter').scrollIntoViewIfNeeded()
        await tallShot(pg, ARTIFACTS, `${SHOT}-create-at-5-spell-picker-0-of-9`, project)
      },
    })
    const counter = page.getByTestId('p24-m03-spell-pick-counter')
    void counter
    expect(knownByLevel(sheet, 0)).toBe(3)
    expect(preparedLeveled(sheet)).toBeGreaterThanOrEqual(9)
    expect(sheet.spells?.slots?.['3']).toMatchObject({ max: 2 })
    expect(sheet.spells?.slots?.['4']?.max ?? 0).toBe(0)
    expect(sheet.class_options_2024?.primal_order).toBe('warden')
    expect(armorHas(sheet, 'medium')).toBe(true)
    expect(armorHas(sheet, 'heavy')).toBe(false)
    expect(sheet.proficiency?.weapons?.martial).toBe(true)
    expect(sheet.weapon_mastery?.picks ?? sheet.weapon_mastery?.ids ?? []).toEqual([])
    // Dwarven Toughness: d8 avg 5 + CON 3 + 1 per level = 8 + 4*(5+3) + 5 = 48
    expect(Number(store.characters.values().next().value!.hp_max)).toBe(48)

    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /^Сотворение заклинаний/,
      /^Друидический язык/,
      /^Природный орден/,
      /^Дикий облик/,
      /^Дикий спутник/,
      /^Дикое восстановление/,
      /^Заклинания круга земли/,
      /^Помощь земли/,
    ])
    await expectNoFeatureNames(page, [/^Ярость стихий/, /^Естественное восстановление/])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-features`, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 2, max: 2 })
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-wild-shape-2of2`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-11 magician/moon: table, Wild Shape 3, Elemental Fury, 6th circle', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLiveDruidCreate(page, store, {
      name: 'Живой Друид 11',
      level: 11,
      order: 'magician',
      subclassSlug: SUB.moon,
      fury: 'primal_strike',
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-11-`,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText('1×4 · 2×3 · 3×3 · 4×3 · 5×2 · 6×1')
        const list = pg.getByTestId('p24-m03c-fork-list-druid')
        await expect(list).toContainText('Ярость стихий')
        await expect(list).toContainText('Шаг в лунный свет')
        await expect(list).not.toContainText('Улучшенная ярость стихий')
        await expect(pg.getByTestId('p24-m03-spell-tab-cantrips')).toContainText('0/5')
        await expect(pg.getByTestId('p24-m03-spell-tab-level1')).toContainText('0/16')
        await pg.getByTestId('p24-m03-spell-tab-level1').click()
        await expect(pg.getByTestId('p24-m03-spell-pick-counter')).toContainText('Выбрано 0 из 16')
        await expect(pg.getByTestId('p24-m03-spell-pick-counter')).toContainText('круги 1–6')
        await expect(pg.getByTestId('p24-m03-card-heal')).toBeVisible()
        await expect(pg.getByTestId('p24-m03-card-fire-storm')).toHaveCount(0)
        await pg.getByTestId('p24-m03-spell-pick-counter').scrollIntoViewIfNeeded()
        await tallShot(pg, ARTIFACTS, `${SHOT}-create-at-11-spell-picker-0-of-16`, project)
      },
    })
    expect(knownByLevel(sheet, 0)).toBe(5)
    expect(preparedLeveled(sheet)).toBeGreaterThanOrEqual(16)
    expect(sheet.class_options_2024).toMatchObject({ primal_order: 'magician', elemental_fury: 'primal_strike' })
    expect(sheet.spells?.slots?.['6']).toMatchObject({ max: 1 })
    expect(sheet.spells?.slots?.['7']?.max ?? 0).toBe(0)
    expect(armorHas(sheet, 'medium')).toBe(false)
    expect(sheet.proficiency?.weapons?.martial).not.toBe(true)

    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      /^Ярость стихий/,
      /^Шаг в лунный свет/,
      /^Улучшенные облики Круга/,
      /^Заклинания Круга луны/,
    ])
    await expectNoFeatureNames(page, [
      /^Улучшенная ярость стихий/,
      /^Заклинания зверя/,
      /^Лунный облик/,
      /^Архидруид/,
    ])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-features`, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 3, max: 3 })
    const fury = await featureCard(page, /^Ярость стихий/)
    await expandCard(fury)
    await expect(fury).toContainText(/Природный удар/)
    await expect(fury).toContainText(/1к8/)
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-elemental-fury`, project)
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Primal Order                                                        */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 druid — Primal Order (Ведун / Страж)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('Страж L5: средние доспехи и воинское оружие реально работают (чешуйчатый доспех + длинный меч)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Страж 5',
      level: 5,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'arid',
    })
    expect(armorHas(sheet, 'medium')).toBe(true)
    expect(sheet.proficiency?.weapons?.martial).toBe(true)
    expect(armorHas(sheet, 'heavy')).toBe(false)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-warden-sheet-before-gear`, project)

    await addGearFromPicker(page, project, 'Чешуйчатый', /^Чешуйчатый доспех/)
    await addGearFromPicker(page, project, 'Длинный меч', /^Длинный меч/)
    await openExploreScene(page, project)
    await equipItem(page, /Чешуйчатый доспех/)
    await equipItem(page, /Длинный меч/)
    await page.getByRole('tablist', { name: 'Фильтр инвентаря' }).getByText('Надето', { exact: true }).click()
    await page.waitForTimeout(400)
    await expect(page.locator('.inventory-card').filter({ hasText: /Чешуйчатый доспех/ }).first()).toBeVisible()
    await page.mouse.move(2, 2)
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-warden-medium-armor-equipped`, project)
    await scrollTop(page)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    // Scale mail 14 + DEX (max +2), not unarmored 10+DEX. Header must show the armor, not unarmored 10+DEX.
    const dexMod = Math.floor((Number(sheet.abilities?.dex?.score) - 10) / 2)
    await expect(page.getByText(new RegExp(`^КД ${14 + Math.min(2, dexMod)}$`)).first()).toBeVisible({ timeout: 10_000 })
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-warden-ac-header`, project)

    await openCombatScene(page, project)
    const str = Math.floor((Number(sheet.abilities?.str?.score) - 10) / 2)
    const sword = page.locator('[class*="attack"]').filter({ hasText: /Длинный меч/ }).first()
    await expect(sword).toBeVisible({ timeout: 10_000 })
    await expect(sword.locator('button').filter({ hasText: /^[+-]\d+$/ }).first()).toHaveText(
      `${str + 3 >= 0 ? '+' : ''}${str + 3}`,
    )
    await expect(sword).toContainText(/рубящий/)
    await expect(sword).not.toContainText(/\bslashing\b/i)
    await sword.scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-warden-martial-weapon-attack`, project)
    expect(store.unmatched).toEqual([])
  })

  test('Ведун L5: 4 заговора (3+1), Природа и Тайная магия получают бонус Мудрости; средних доспехов нет', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Ведун 5',
      level: 5,
      order: 'magician',
      subclassSlug: SUB.land,
      land: 'polar',
      stepShots: true,
      shotPrefix: `${SHOT}-primal-order-magician-`,
    })
    expect(knownByLevel(sheet, 0)).toBe(4)
    expect(armorHas(sheet, 'medium')).toBe(false)
    expect(sheet.proficiency?.weapons?.martial).not.toBe(true)
    const wis = wisModOf(sheet)
    const pb = 3
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-magician-sheet`, project)

    const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
    if (isPhone(project)) {
      await page.getByRole('button', { name: /Характеристики|Хар\./ }).first().click().catch(() => {})
    }
    await page.getByRole('button', { name: /Развернуть все/ }).locator('visible=true').first().click()
    await page.waitForTimeout(400)
    const intScore = Number(
      await page.locator('.abil-block:visible').filter({ hasText: /Интеллект/ }).first().locator('input').first().inputValue(),
    )
    const intMod = Math.floor((intScore - 10) / 2)
    const natureTotal = intMod + pb + Math.max(1, wis)
    const arcanaTotal = intMod + Math.max(1, wis)
    const rollOf = async (label: string) => {
      const row = page.locator('.abil-skill:visible').filter({ hasText: new RegExp(`^\\s*${label}`) }).first()
      await row.scrollIntoViewIfNeeded()
      return (await row.locator('.abil-skill__roll').innerText()).replace(/\s+/g, '')
    }
    expect(await rollOf('Природа')).toContain(sign(natureTotal))
    expect(await rollOf('Магия')).toContain(sign(arcanaTotal))
    await page.locator('.abil-skill:visible').filter({ hasText: /^\s*Природа/ }).first().scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-magician-skills-explore`, project)
    if (isPhone(project)) await page.locator('button:visible', { hasText: '←' }).first().click()
    expect(await readPreparedMax(page, project)).toBe(9)
    await expect(page.getByText(/заговоры: Друид 4\/4/).first()).toBeVisible({ timeout: 10_000 })
    await shot(page, ARTIFACTS, `${SHOT}-primal-order-magician-cantrips-4of4-combat`, project)
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Wild Shape: enter / exit / rests                                    */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 druid — Wild Shape on the sheet', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('land L5: enter Волк (own HP kept, temp HP = 5), exit clears temp HP', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Облик 5',
      level: 5,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'temperate',
    })
    const hpMax = Number(store.characters.values().next().value!.hp_max)
    expect(hpMax).toBe(48)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await shot(page, ARTIFACTS, `${SHOT}-wild-shape-land-5-before-form`, project)

    await enterWildShape(page, project, {
      query: 'Волк',
      name: /^Волк · CR 1\/4/,
      shotPrefix: `${SHOT}-wild-shape-land-5-wolf`,
    })
    await waitStored(store, (s) => (s.combat?.hp_temp ?? 0) === 5)
    const inForm = await storedSheet(store)
    expect(inForm.combat.hp_current).toBe(hpMax)
    expect(inForm.combat.hp_max).toBe(hpMax)
    const form = (inForm.companions ?? []).find((c: any) => c.role === 'self_form' && c.active)
    expect(form).toBeTruthy()
    expect(form.stats.hp ?? null).toBeNull()
    expect(wildShapeFromSheet(inForm)?.used).toBe(1)
    expect(String(form.notes)).toContain('свои хиты сохраняются')

    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await expect(page.getByText(new RegExp(`вр\\. ?\\+?5|врем\\. ?\\+5`)).first()).toBeVisible({ timeout: 10_000 })
    await page.mouse.move(2, 2)
    await shot(page, ARTIFACTS, `${SHOT}-wild-shape-land-5-wolf-header-own-hp-temp-hp`, project)
    await openFeaturesScene(page, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 1, max: 2 })
    await shot(page, ARTIFACTS, `${SHOT}-wild-shape-land-5-wolf-pool-1of2`, project)

    await openCompanionsScene(page, project)
    const row = page.getByRole('button', { name: /Волк/ }).first()
    await row.click()
    await page.waitForTimeout(500)
    await expect(page.getByText(/свои хиты сохраняются/).first()).toBeVisible()
    await tallShot(page, ARTIFACTS, `${SHOT}-wild-shape-land-5-wolf-form-card`, project)

    await exitWildShape(page, project, /Волк/)
    await waitStored(store, (s) => (s.combat?.hp_temp ?? 0) === 0 && !(s.companions ?? []).some((c: any) => c.active && c.role === 'self_form'))
    const after = await storedSheet(store)
    expect(after.combat.hp_current).toBe(hpMax)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await page.mouse.move(2, 2)
    await shot(page, ARTIFACTS, `${SHOT}-wild-shape-land-5-after-exit-header`, project)
    await openFeaturesScene(page, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 1, max: 2 })
    void sheet
    expect(store.unmatched).toEqual([])
  })

  test('moon L6: CR cap 2, temp HP = 18 (level × 3), AC = 13 + Wis', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Луна 6',
      level: 6,
      order: 'warden',
      subclassSlug: SUB.moon,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Облики Круга/])
    await expect(page.getByRole('button', { name: /Облики Круга.*CR 2, плавание/ }).first()).toBeVisible()
    await tallShot(page, ARTIFACTS, `${SHOT}-wild-shape-moon-6-features-cr2`, project)
    await enterWildShape(page, project, {
      query: 'Волк',
      name: /^Волк · CR 1\/4/,
      shotPrefix: `${SHOT}-wild-shape-moon-6-wolf`,
    })
    await waitStored(store, (s) => (s.combat?.hp_temp ?? 0) === 18)
    const inForm = await storedSheet(store)
    const wis = wisModOf(inForm)
    const form = (inForm.companions ?? []).find((c: any) => c.role === 'self_form' && c.active)
    expect(form.stats.ac).toBe(Math.max(12, 13 + wis))
    expect(inForm.combat.hp_current).toBe(inForm.combat.hp_max)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    await page.mouse.move(2, 2)
    await shot(page, ARTIFACTS, `${SHOT}-wild-shape-moon-6-wolf-header-temp-hp-18`, project)
    await openCompanionsScene(page, project)
    await page.getByRole('button', { name: /Волк/ }).first().click()
    await page.waitForTimeout(500)
    await tallShot(page, ARTIFACTS, `${SHOT}-wild-shape-moon-6-wolf-form-card-ac`, project)
    expect(store.unmatched).toEqual([])
  })
})

test.describe('P24-M02 druid — Wild Shape rests (+1 short, all long)', () => {
  test.setTimeout(420_000)
  test.use({ actionTimeout: 15_000 })

  test('short rest returns exactly 1 use; long rest returns all', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Отдых Друида',
      level: 6,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'temperate',
    })
    await openFeaturesScene(page, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 3, max: 3 })
    await enterWildShape(page, project, { query: 'Волк', name: /^Волк · CR 1\/4/ })
    await enterWildShape(page, project, { query: 'Паук', name: /^Паук · CR 0/ })
    await enterWildShape(page, project, { query: 'Крыса', name: /^Крыса · CR 0/ })
    await openFeaturesScene(page, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 0, max: 3 })
    await shot(page, ARTIFACTS, `${SHOT}-rest-wild-shape-0of3-before-short`, project)

    await openRest(page, project)
    const rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).first()
    await shot(page, ARTIFACTS, `${SHOT}-rest-short-dialog`, project)
    await rest.getByRole('button', { name: /Сброс коротких ресурсов/ }).click()
    await page.waitForTimeout(500)
    await expect(rest).toContainText(/Дикий облик:\s*0\s*→\s*1/)
    await shot(page, ARTIFACTS, `${SHOT}-rest-short-summary-wild-shape-0-to-1`, project)
    await rest.getByRole('button', { name: /^Применить$/ }).click()
    await page.waitForTimeout(500)
    const closeBtn = page.getByRole('dialog').last().getByRole('button', { name: /^Закрыть$/ })
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click()
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 1, max: 3 })
    await shot(page, ARTIFACTS, `${SHOT}-rest-wild-shape-1of3-after-short`, project)

    await openRest(page, project)
    const rest2 = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).last()
    await rest2.getByText(/^Продолжительный$/).first().click()
    await page.waitForTimeout(400)
    await shot(page, ARTIFACTS, `${SHOT}-rest-long-dialog`, project)
    await rest2.getByRole('button', { name: /Сводка и применение/ }).click()
    await page.waitForTimeout(500)
    await expect(rest2).toContainText(/Дикий облик:\s*1\s*→\s*3/)
    await shot(page, ARTIFACTS, `${SHOT}-rest-long-summary-wild-shape-1-to-3`, project)
    const apply = rest2.getByRole('button', { name: /^Применить$/ })
    await apply.scrollIntoViewIfNeeded()
    await apply.click()
    await page.waitForTimeout(600)
    const close2 = page.getByRole('dialog').last().getByRole('button', { name: /^Закрыть$/ })
    if (await close2.isVisible().catch(() => false)) await close2.click()
    await dismissGuided(page)
    await openFeaturesScene(page, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 3, max: 3 })
    await shot(page, ARTIFACTS, `${SHOT}-rest-wild-shape-3of3-after-long`, project)
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Elemental Fury                                                      */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 druid — Elemental Fury formulas', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  async function longswordAttack(page: Page, project: string) {
    await addGearFromPicker(page, project, 'Длинный меч', /^Длинный меч/)
    await openExploreScene(page, project)
    await equipItem(page, /Длинный меч/)
    await openCombatScene(page, project)
    if (!isPhone(project)) {
      const hide = page.getByRole('button', { name: /^магия$/ }).first()
      if (await hide.isVisible().catch(() => false)) await hide.click()
      await page.waitForTimeout(400)
    }
    const attack = page.locator('[class*="attack"]').filter({ hasText: /Длинный меч/ }).first()
    await expect(attack).toBeVisible({ timeout: 10_000 })
    await attack.scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    return attack
  }

  for (const lvl of [7, 15] as const) {
    test(`Природный удар L${lvl}: ${lvl === 7 ? '1к8' : '2к8'} на атаке оружием и карточка`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const dice = lvl === 7 ? '1к8' : '2к8'
      const { store, sheet } = await createAt(page, project, {
        name: `Удар ${lvl}`,
        level: lvl,
        order: 'warden',
        subclassSlug: SUB.stars,
        fury: 'primal_strike',
      })
      expect(sheet.class_options_2024?.elemental_fury).toBe('primal_strike')
      const attack = await longswordAttack(page, project)
      await expect(attack).toContainText(new RegExp(`${dice} холодом, огнём, электричеством или звуком, раз в ход`))
      await shot(page, ARTIFACTS, `${SHOT}-elemental-fury-primal-strike-${lvl}-weapon`, project)
      await openFeaturesScene(page, project)
      await expandAllFeatures(page)
      const fury = await featureCard(page, /^Ярость стихий/)
      await expandCard(fury)
      await expect(fury).toContainText(new RegExp(dice))
      if (lvl === 15) {
        await expectFeatureNames(page, [/^Улучшенная ярость стихий/])
        await expect(
          page.locator('.feature-card__name, .feature-card__title').filter({ hasText: /^Ярость стихий/ }),
        ).toHaveCount(1)
      }
      await expectVisibleNoRawIds(page)
      await tallShot(page, ARTIFACTS, `${SHOT}-elemental-fury-primal-strike-${lvl}-features`, project)
      expect(store.unmatched).toEqual([])
    })
  }

  for (const lvl of [7, 15] as const) {
    test(`Мощные заклинания L${lvl}: + Мудрость к заговору${lvl === 15 ? ', дистанция +300 фт' : ''}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const { store, sheet } = await createAt(page, project, {
        name: `Мощные ${lvl}`,
        level: lvl,
        order: 'magician',
        subclassSlug: SUB.stars,
        fury: 'potent_spellcasting',
      })
      expect(sheet.class_options_2024?.elemental_fury).toBe('potent_spellcasting')
      const wis = wisModOf(sheet)
      const dice = lvl >= 11 ? 3 : 2
      await openCombatScene(page, project)
      if (isPhone(project)) {
        await page
          .locator(':is(button,[role=tab],[role=button]):visible', { hasText: /^Заклинания$/ })
          .first()
          .click()
        await page.waitForTimeout(500)
      }
      const row = page.locator('.play-desk-compact__row.is-spell').filter({ hasText: /Сотворение пламени/ }).first()
      await expect(row).toBeVisible({ timeout: 10_000 })
      await row.scrollIntoViewIfNeeded()
      await expect(row).toContainText(new RegExp(`${dice}[dк]8\\+${wis}`))
      await page.mouse.move(2, 2)
      await shot(page, ARTIFACTS, `${SHOT}-elemental-fury-potent-${lvl}-produce-flame-row`, project)
      await row.getByRole('button', { name: /^Каст$/i }).click()
      const dlg = page.getByRole('dialog').last()
      await expect(dlg).toBeVisible({ timeout: 10_000 })
      await expect(dlg).toContainText(new RegExp(`${dice}[dк]8\\+${wis}`))
      await shot(page, ARTIFACTS, `${SHOT}-elemental-fury-potent-${lvl}-cast-dialog`, project)
      await dlg.getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click()

      await openFeaturesScene(page, project)
      await expandAllFeatures(page)
      const card = await featureCard(page, /^Ярость стихий/)
      await expandCard(card)
      await expect(card).toContainText(/Мощные заклинания/)
      if (lvl === 15) {
        await expectFeatureNames(page, [/^Улучшенная ярость стихий/])
        const improved = await featureCard(page, /^Улучшенная ярость стихий/)
        await expandCard(improved)
        await expect(improved).toContainText(/300/)
      }
      await expectVisibleNoRawIds(page)
      await tallShot(page, ARTIFACTS, `${SHOT}-elemental-fury-potent-${lvl}-features`, project)
      expect(store.unmatched).toEqual([])
    })
  }
})

/* ------------------------------------------------------------------ */
/* Level-up (create wizard → sheet → +1 уровень)                       */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 druid — LIVE level-up', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('levelup-live 4→5: Дикое восстановление, 3rd-circle slots, prep 7→9', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Прокачка 4→5',
      level: 4,
      order: 'warden',
      subclassSlug: SUB.land,
      land: 'temperate',
    })
    expect(await readPreparedMax(page, project)).toBe(7)
    expect(sheet.spells?.slots?.['3']?.max ?? 0).toBe(0)
    await liveLevelUp(page, project, `${SHOT}-levelup-4to5`, {
      expectUpcoming: [/Дикое восстановление/],
    })
    await waitStored(store, (s) => s.classes?.[0]?.level === 5)
    const after = await storedSheet(store)
    expect(after.spells?.slots?.['3']).toMatchObject({ max: 2 })
    expect(await readPreparedMax(page, project)).toBe(9)
    expect(knownByLevel(after, 0)).toBe(3)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Дикое восстановление/, /^Дикий облик/])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-4to5-sheet-features`, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 2, max: 2 })
    expect(store.unmatched).toEqual([])
  })

  test('levelup-live 10→11: 6th-circle slot, prep 15→16, Wild Shape stays 3', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Прокачка 10→11',
      level: 10,
      order: 'warden',
      subclassSlug: SUB.moon,
      fury: 'primal_strike',
    })
    expect(sheet.spells?.slots?.['6']?.max ?? 0).toBe(0)
    expect(await readPreparedMax(page, project)).toBe(15)
    await liveLevelUp(page, project, `${SHOT}-levelup-10to11`, { expectNoUpcoming: true })
    await waitStored(store, (s) => s.classes?.[0]?.level === 11)
    const after = await storedSheet(store)
    expect(after.spells?.slots?.['6']).toMatchObject({ max: 1 })
    expect(await readPreparedMax(page, project)).toBe(16)
    expect(knownByLevel(after, 0)).toBe(4)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Шаг в лунный свет/, /^Ярость стихий/])
    await tallShot(page, ARTIFACTS, `${SHOT}-levelup-10to11-sheet-features`, project)
    expect(await wildShapeCounter(page)).toEqual({ left: 3, max: 3 })
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Rollback in the wizard                                              */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 druid — level down in create wizard (rollback UI)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  const STEPS = [
    {
      name: 'rollback-3to2',
      from: 3,
      to: 2,
      sub: SUB.land,
      before: { slots: '1×4 · 2×2', has: /Подкласс выбран/ },
      after: { slots: '1×3', hasNot: /Подкласс/ },
    },
    {
      name: 'rollback-10to9',
      from: 10,
      to: 9,
      sub: SUB.moon,
      before: { slots: '5×2', has: /Шаг в лунный свет/ },
      after: { slots: '5×1', hasNot: /Шаг в лунный свет/ },
    },
    {
      name: 'rollback-20to19',
      from: 20,
      to: 19,
      sub: SUB.stars,
      before: { slots: '7×2', has: /Архидруид/ },
      after: { slots: '7×1', hasNot: /Архидруид/ },
    },
  ] as const

  for (const spec of STEPS) {
    test(spec.name, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      await walkLiveDruidCreate(page, store, {
        name: spec.name,
        level: spec.from,
        subclassSlug: spec.sub,
        shotDir: ARTIFACTS,
        project,
        stopAfterForks: true,
      })
      const list = page.getByTestId('p24-m03c-fork-list-druid')
      await expect(page.getByTestId('p24-m03c-slots')).toContainText(spec.before.slots)
      await expect(list).toContainText(spec.before.has)
      await page.getByTestId('p24-m03c-forks-druid').scrollIntoViewIfNeeded()
      await unclipForks(page)
      await tallShot(page, ARTIFACTS, `${SHOT}-${spec.name}-before-L${spec.from}`, project)

      const levelInput = page.getByTestId('p24-m03c-level-druid')
      await levelInput.scrollIntoViewIfNeeded()
      await levelInput.fill(String(spec.to))
      await levelInput.blur()
      await expect(levelInput).toHaveValue(String(spec.to))
      const forks = page.getByTestId('p24-m03c-forks-druid')
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
/* Four PHB circles at 3 / 6 / 10 / 14                                 */
/* ------------------------------------------------------------------ */

type CircleKey = 'land' | 'moon' | 'sea' | 'stars'
type CircleCase = {
  key: CircleKey
  nameRu: string
  names: Record<3 | 6 | 10 | 14, RegExp[]>
  terrain?: Record<3 | 6 | 10 | 14, 'arid' | 'polar' | 'temperate' | 'tropical'>
  use?: Partial<Record<3 | 6 | 10 | 14, { card: RegExp; button: RegExp; text: (wis: number) => RegExp }>>
}

const CIRCLES: CircleCase[] = [
  {
    key: 'land',
    nameRu: 'Круг земли',
    terrain: { 3: 'arid', 6: 'polar', 10: 'temperate', 14: 'tropical' },
    names: {
      3: [/^Заклинания круга земли/, /^Помощь земли/],
      6: [/^Естественное восстановление/],
      10: [/^Покровительство природы/],
      14: [/^Природное убежище/],
    },
    use: {
      3: { card: /^Помощь земли/, button: /Помощь земли…/, text: () => /2к6/ },
      6: { card: /^Помощь земли/, button: /Помощь земли…/, text: () => /2к6/ },
      10: { card: /^Помощь земли/, button: /Помощь земли…/, text: () => /3к6/ },
      14: { card: /^Помощь земли/, button: /Помощь земли…/, text: () => /4к6/ },
    },
  },
  {
    key: 'moon',
    nameRu: 'Круг луны',
    names: {
      3: [/^Заклинания Круга луны/, /^Облики Круга/],
      6: [/^Улучшенные облики Круга/],
      10: [/^Шаг в лунный свет/],
      14: [/^Лунный облик/],
    },
  },
  {
    key: 'sea',
    nameRu: 'Круг моря',
    names: {
      3: [/^Заклинания круга моря/, /^Гнев морей/],
      6: [/^Связь с водами/],
      10: [/^Рождённый бурей/],
      14: [/^Дар океана/],
    },
    use: {
      3: { card: /^Гнев морей/, button: /Гнев морей…/, text: (w) => new RegExp(`${Math.max(1, w)}к6`) },
      6: { card: /^Гнев морей/, button: /Гнев морей…/, text: (w) => new RegExp(`${Math.max(1, w)}к6`) },
      10: { card: /^Гнев морей/, button: /Гнев морей…/, text: (w) => new RegExp(`${Math.max(1, w)}к6`) },
      14: { card: /^Гнев морей/, button: /Гнев морей…/, text: (w) => new RegExp(`${Math.max(1, w)}к6`) },
    },
  },
  {
    key: 'stars',
    nameRu: 'Круг звёзд',
    names: {
      3: [/^Звёздная карта/, /^Звёздный облик/],
      6: [/^Космическое знамение/],
      10: [/^Мерцающие созвездия/],
      14: [/^Звёздное тело/],
    },
    use: {
      3: { card: /^Звёздный облик/, button: /Звёздный облик…/, text: (w) => new RegExp(`1к8\\+${w}`) },
      6: { card: /^Звёздный облик/, button: /Звёздный облик…/, text: (w) => new RegExp(`1к8\\+${w}`) },
      10: { card: /^Звёздный облик/, button: /Звёздный облик…/, text: (w) => new RegExp(`2к8\\+${w}`) },
      14: { card: /^Звёздный облик/, button: /Звёздный облик…/, text: (w) => new RegExp(`2к8\\+${w}`) },
    },
  },
]

test.describe('P24-M02 druid — four PHB circles via LIVE create (L3 / L6 / L10 / L14)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  for (const circle of CIRCLES) {
    for (const level of [3, 6, 10, 14] as const) {
      test(`2024-druid-${circle.key}-${String(level).padStart(2, '0')}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const { store, sheet } = await createAt(page, project, {
          name: `${circle.key} L${level}`,
          level,
          order: level % 2 === 0 ? 'warden' : 'magician',
          subclassSlug: SUB[circle.key],
          land: circle.terrain?.[level],
          fury: 'primal_strike',
        })
        const wis = wisModOf(sheet)
        await openFeaturesScene(page, project)
        const expected = ([3, 6, 10, 14] as const)
          .filter((lv) => lv <= level)
          .flatMap((lv) => circle.names[lv])
        await expectFeatureNames(page, expected)
        const later = ([3, 6, 10, 14] as const)
          .filter((lv) => lv > level)
          .flatMap((lv) => circle.names[lv])
        await expectNoFeatureNames(page, later)
        await expandAllFeatures(page)
        await expectVisibleNoRawIds(page)

        const use = circle.use?.[level]
        if (use) {
          const dlg = await openCardUse(page, use.card, use.button)
          await expect(dlg).toContainText(use.text(wis))
          await shot(page, ARTIFACTS, `${SHOT}-${circle.key}-${String(level).padStart(2, '0')}-use-dialog`, project)
          await cancelDialog(page, dlg)
        }
        if (circle.key === 'land') {
          const terrain = circle.terrain![level]
          const spells = await featureCard(page, /^Заклинания круга земли/)
          await expandCard(spells)
          await expect(spells).toContainText(
            { arid: 'Засушливая', polar: 'Полярная', temperate: 'Умеренная', tropical: 'Тропическая' }[terrain],
          )
        }
        await tallShot(page, ARTIFACTS, `${SHOT}-${circle.key}-${String(level).padStart(2, '0')}`, project)
        expect(store.unmatched).toEqual([])
      })
    }
  }
})
