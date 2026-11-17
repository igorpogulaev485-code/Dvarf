/**
 * Shared live-flow helpers for P24-M02-druid e2e (real create wizard + sheet scenes).
 */
import { expect, type Locator, type Page } from '@playwright/test'
import path from 'node:path'
import {
  createStore,
  installDruidHarness,
  type HarnessStore,
} from './druid2024Harness'

export const ARTIFACTS = '/opt/cursor/artifacts/p24-m02-druid'
export const CREATE_LIVE = '/characters/create?edition=2024&preview=1'

export function projectOf(testInfo: { project: { name: string } }): '390' | '1440' {
  return testInfo.project.name.includes('390') ? '390' : '1440'
}

export const isPhone = (project: string) => project === '390'

export async function shot(page: Page, dir: string, name: string, project: string) {
  await page.waitForTimeout(350)
  await page.screenshot({
    path: path.join(dir, `${name}-${project}.png`),
    fullPage: false,
  })
}

export async function tallShot(page: Page, dir: string, name: string, project: string) {
  const viewport = page.viewportSize()
  if (viewport) {
    await page.setViewportSize({ width: viewport.width, height: isPhone(project) ? 4200 : 2800 })
  }
  await page.waitForTimeout(400)
  await shot(page, dir, name, project)
  if (viewport) await page.setViewportSize(viewport)
}

/** Screenshot-only: lift scroll clipping around the leveling fork list. */
export async function unclipForks(page: Page) {
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

export function setupDialog(page: Page): Locator {
  return page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: /^Настроить/ }) })
}

export async function ensureSetupOpen(page: Page) {
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

export async function closeSetupDialog(page: Page) {
  const dialog = setupDialog(page)
  if (!(await dialog.count())) return
  await dialog.getByRole('button', { name: 'Готово' }).click()
  await expect(dialog).toHaveCount(0)
}

export async function next(page: Page) {
  await closeSetupDialog(page)
  const button = page.getByTestId('p24-m03-next')
  await expect(button).toBeEnabled({ timeout: 15_000 })
  await button.click()
}

export async function selectCatalogCard(page: Page, title: string) {
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

export async function pickPrefixed(page: Page, prefix: string, ids: string[]) {
  for (const id of ids) {
    const chip = page.getByTestId(`${prefix}-${id}`)
    await chip.scrollIntoViewIfNeeded()
    if ((await chip.getAttribute('aria-checked')) === 'true') continue
    await chip.click()
    await expect(chip).toHaveAttribute('aria-checked', 'true')
  }
}

export async function fillUnderfilledPicks(page: Page) {
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

export async function dismissWelcome(page: Page) {
  const skip = page.getByRole('button', { name: /Пропустит.*подсказ/i })
  try {
    await skip.waitFor({ state: 'visible', timeout: 3_000 })
    await skip.click()
  } catch {
    /* already dismissed */
  }
}

export async function ensureMobileVitalsExpanded(page: Page) {
  const rest = page.getByRole('button', { name: /^Отдых$/ })
  if (await rest.isVisible().catch(() => false)) return
  const expand = page.getByRole('button', { name: /Развернуть шапку/ })
  if (await expand.isVisible().catch(() => false)) {
    await expand.click()
    await page.waitForTimeout(300)
  }
}

export async function openFeaturesScene(page: Page, project: string) {
  if (project === '390') await page.getByText('Способн.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Способности$/ }).first().click()
  await page.waitForTimeout(700)
}

export async function openIdentity(page: Page) {
  await page
    .locator('.play-desk__top button, [data-onboarding="combat-header"] button')
    .first()
    .click()
  const dlg = page.getByRole('dialog').last()
  await expect(dlg.getByRole('button', { name: /\+1 уровень/ })).toBeVisible()
  return dlg
}

export async function openRest(page: Page, project: string) {
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


export const CANTRIPS = [
  'produce-flame', 'thorn-whip', 'shillelagh', 'druidcraft', 'guidance', 'mending',
  'message', 'poison-spray', 'resistance', 'spare-the-dying', 'elementalism', 'thunderclap',
]
/** Druid list spells that are not granted by any PHB circle or class feature, interleaved by circle. */
export const PREPARED = [
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

export const SUB = {
  land: 'druid__land',
  moon: 'druid__moon',
  sea: 'druid__sea',
  stars: 'druid__stars',
} as const

export const SHOT = '2024-druid'

export async function pickSpellsToQuota(page: Page, tab: 'cantrips' | 'level1', pool: string[]) {
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

export type LiveDruidOpts = {
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

export async function pickKnownForms(page: Page, level: number) {
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

export async function walkLiveDruidCreate(page: Page, store: HarnessStore, opts: LiveDruidOpts) {
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


export async function storedSheet(store: HarnessStore): Promise<Record<string, any>> {
  return [...store.characters.values()][0]!.sheet as Record<string, any>
}

export async function openCombatScene(page: Page, project: string) {
  if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Бой$/ }).first().click()
  await page.waitForTimeout(600)
}

export async function openCompanionsScene(page: Page, project: string) {
  if (isPhone(project)) await page.getByText('Напарн.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Напарники/ }).first().click()
  await page.waitForTimeout(600)
}

export async function openExploreScene(page: Page, project: string) {
  if (isPhone(project)) await page.getByText('Исслед.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Исследование$/ }).first().click()
  await page.waitForTimeout(600)
}

export async function featureCard(page: Page, name: RegExp) {
  const card = page
    .locator('.feature-card')
    .filter({ has: page.locator('.feature-card__name, .feature-card__title', { hasText: name }) })
    .first()
  await expect(card).toBeVisible({ timeout: 15_000 })
  await card.scrollIntoViewIfNeeded()
  return card
}

export async function expectFeatureNames(page: Page, names: RegExp[]) {
  for (const re of names) {
    await expect(
      page.locator('.feature-card__name, .feature-card__title').filter({ hasText: re }).first(),
      `feature ${re}`,
    ).toBeVisible({ timeout: 15_000 })
  }
}

export async function expectNoFeatureNames(page: Page, names: RegExp[]) {
  for (const re of names) {
    await expect(
      page.locator('.feature-card__name, .feature-card__title').filter({ hasText: re }),
      `feature must be absent ${re}`,
    ).toHaveCount(0)
  }
}

export async function dismissGuided(page: Page) {
  const later = page.getByRole('dialog').getByRole('button', { name: /Позже|Пропустить|Готово/ })
  for (let i = 0; i < 6; i += 1) {
    if (await later.first().isVisible({ timeout: 1_500 }).catch(() => false)) {
      await later.first().click()
      await page.waitForTimeout(200)
    } else break
  }
}

export async function expandCard(card: Locator) {
  const head = card.locator('.feature-card__head, .feature-card__name').first()
  const collapse = card.getByRole('button', { name: /^свернуть$/ })
  if (!(await collapse.isVisible().catch(() => false))) await head.click()
  await card.scrollIntoViewIfNeeded()
}

export async function expandAllFeatures(page: Page) {
  const btn = page.getByRole('button', { name: /Развернуть все/ }).last()
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
    await page.waitForTimeout(400)
  }
}

export async function openCardUse(page: Page, cardName: RegExp, button: RegExp) {
  const card = await featureCard(page, cardName)
  await expandCard(card)
  await card.getByRole('button', { name: button }).first().click()
  const dlg = page.getByRole('dialog').last()
  await expect(dlg).toBeVisible({ timeout: 10_000 })
  return dlg
}

export async function cancelDialog(page: Page, dlg: Locator) {
  await dlg.getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click()
  await expect(dlg).toBeHidden({ timeout: 10_000 })
}

export async function applyDialog(page: Page, dlg: Locator) {
  await dlg.getByRole('button', { name: /^Применить$/ }).click()
  await expect(dlg).toBeHidden({ timeout: 10_000 })
  await page.waitForTimeout(300)
}

export function wisModOf(sheet: Record<string, any>): number {
  return Math.floor((Number(sheet.abilities?.wis?.score ?? 10) - 10) / 2)
}

export function wildShapeFromSheet(sheet: Record<string, any>) {
  const row = ((sheet.resources ?? []) as Array<Record<string, any>>).find((r) =>
    /wild_shape:wild_shape$/.test(String(r.id)),
  )
  return row as { id: string; max: number; used: number; shortRestRegain?: number } | undefined
}

export function armorHas(sheet: Record<string, any>, kind: 'light' | 'medium' | 'heavy') {
  const armor = sheet.proficiency?.armor
  return Array.isArray(armor) ? armor.includes(kind) : Boolean(armor?.[kind])
}

export function knownByLevel(sheet: Record<string, any>, level: number) {
  return ((sheet.spells?.known ?? []) as Array<{ level: number }>).filter((x) => x.level === level)
    .length
}

export function preparedLeveled(sheet: Record<string, any>) {
  return ((sheet.spells?.known ?? []) as Array<{ level: number; prepared?: boolean }>).filter(
    (x) => x.level > 0,
  ).length
}

export async function readPreparedMax(page: Page, project: string): Promise<number> {
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

export async function waitStored(store: HarnessStore, fn: (s: Record<string, any>) => boolean) {
  await expect.poll(async () => fn(await storedSheet(store)), { timeout: 20_000 }).toBe(true)
}

export async function wildShapeCounter(page: Page): Promise<{ left: number; max: number }> {
  const card = await featureCard(page, /^Дикий облик/)
  await expandCard(card)
  const text = (await card.innerText()).replace(/\s+/g, ' ')
  const m = /Дикий облик:\s*(\d+)\s*\/\s*(\d+)/.exec(text)
  if (!m) throw new Error(`wild shape pips not found in: ${text}`)
  return { left: Number(m[1]), max: Number(m[2]) }
}

/** Real sheet flow: Способности → Дикий облик → бестиарий → снаряжение. */
export async function enterWildShape(
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

export async function exitWildShape(page: Page, project: string, name: RegExp) {
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

export async function openHeaderHp(page: Page, project: string) {
  if (isPhone(project)) await ensureMobileVitalsExpanded(page)
}

export async function liveLevelUp(
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

export async function addGearFromPicker(page: Page, project: string, query: string, optionName: RegExp) {
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

export async function openInventoryItem(page: Page, name: RegExp) {
  const card = page.locator('.inventory-card').filter({ hasText: name }).first()
  await expect(card).toBeVisible({ timeout: 10_000 })
  await card.scrollIntoViewIfNeeded()
  return card
}

export async function equipItem(page: Page, name: RegExp) {
  const card = await openInventoryItem(page, name)
  const equip = card.locator('.inventory-equip').first()
  if (!(await equip.evaluate((el) => el.classList.contains('is-on')))) await equip.click()
  await page.waitForTimeout(400)
}

export async function scrollTop(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      if (el.scrollTop > 0) el.scrollTop = 0
    })
  })
}

export async function expectVisibleNoRawIds(page: Page) {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/potent_spellcasting|primal_strike|wild_shape|elemental_fury/)
}

export async function createAt(
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

