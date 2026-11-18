/**
 * Shared live-flow helpers for P24-M02-fighter e2e (real create wizard + sheet scenes).
 */
import { expect, type Locator, type Page } from '@playwright/test'
import path from 'node:path'
import {
  createStore,
  installFighterHarness,
  type HarnessStore,
} from './fighter2024Harness'

export const ARTIFACTS = path.resolve(process.cwd(), '../artifacts/p24-m02-fighter')
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

export async function dismissGuided(page: Page) {
  const later = page.getByRole('dialog').getByRole('button', { name: /Позже|Пропустить|Готово/ })
  for (let i = 0; i < 6; i += 1) {
    if (await later.first().isVisible({ timeout: 1_500 }).catch(() => false)) {
      await later.first().click()
      await page.waitForTimeout(200)
    } else break
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

export async function openCombatScene(page: Page, project: string) {
  if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Бой$/ }).first().click()
  await page.waitForTimeout(600)
}

export async function openSpellsPane(page: Page, project: string) {
  if (isPhone(project)) {
    await openCombatScene(page, project)
    await page
      .locator(':is(button,[role=tab],[role=button]):visible', { hasText: /^Заклинания$/ })
      .first()
      .click()
    await page.waitForTimeout(500)
    return
  }
  const deskTab = page.getByRole('button', { name: /^Заклинания$/ }).first()
  if (await deskTab.isVisible().catch(() => false)) {
    await deskTab.click()
  } else {
    await openCombatScene(page, project)
    const tab = page
      .locator(':is(button,[role=tab],[role=button]):visible', { hasText: /^Заклинания$/ })
      .first()
    if (await tab.isVisible().catch(() => false)) await tab.click()
  }
  await expect(page.getByRole('heading', { name: /^Заклинания$/ }).first()).toBeVisible({
    timeout: 10_000,
  })
  await page.waitForTimeout(400)
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
  for (let i = 0; i < 12; i += 1) {
    const dlg = page.getByRole('dialog').last()
    if (!(await dlg.isVisible({ timeout: 2_500 }).catch(() => false))) break
    const title = ((await dlg.locator('h2, h3, [role="heading"]').first().textContent()) || '').trim()
    if (
      /Манёвр|Маневр|Боевое превосходство|Ученик войны|Боевой стиль|Оружейное мастерство|Псионическ|Заклинани/i.test(
        title,
      )
    ) {
      const chip = dlg.locator('[role="checkbox"], button.ui-chip, .create-2024__pick-grid button').first()
      if (await chip.isVisible().catch(() => false)) {
        await chip.click()
        await page.waitForTimeout(200)
      }
    }
    const primary = dlg.getByRole('button', { name: /^Далее$|^Готово$/ })
    if (await primary.isEnabled({ timeout: 1_500 }).catch(() => false)) {
      await primary.click()
      await page.waitForTimeout(400)
      continue
    }
    const later = dlg.getByRole('button', { name: /^Позже$|^Пропустить$|^Закрыть$/ })
    if (await later.isVisible().catch(() => false)) {
      await later.click()
      await page.waitForTimeout(300)
      continue
    }
    break
  }
}

export async function liveLevelDown(
  page: Page,
  project: string,
  shotName: string,
  opts: { from: number; to: number },
) {
  const identity = await openIdentity(page)
  const minus = identity.getByRole('button', { name: '−1', exact: true }).first()
  await minus.scrollIntoViewIfNeeded()
  await expect(identity).toContainText(new RegExp(`(^|\\D)${opts.from}(\\D|$)`))
  await shot(page, ARTIFACTS, `${shotName}-before`, project)
  await minus.click()
  await page.waitForTimeout(800)
  await minus.scrollIntoViewIfNeeded()
  await expect(identity).toContainText(new RegExp(`(^|\\D)${opts.to}(\\D|$)`))
  await shot(page, ARTIFACTS, `${shotName}-after`, project)
  await identity.getByRole('button', { name: /^Готово$|^Закрыть$/ }).first().click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 })
}

/** Eldritch Knight prepared wizard spells (1st+) + cantrips. */
export const EK_CANTRIPS = ['ray-of-frost', 'shocking-grasp', 'mage-hand'] as const
export const EK_PREPARED = [
  'burning-hands',
  'shield',
  'magic-missile',
  'jump',
  'thunderwave',
  'misty-step',
  'mirror-image',
  'scorching-ray',
  'counterspell',
  'fireball',
  'fly',
  'haste',
] as const

export const SUB = {
  champion: 'fighter__champion',
  battlemaster: 'fighter__battlemaster',
  eldritchKnight: 'fighter__eldritch-knight',
  psiWarrior: 'fighter__psi-warrior',
} as const

export type SubclassKey = keyof typeof SUB

export const SHOT = '2024-fighter'

export const FIGHTER_SKILLS = ['athletics', 'perception'] as const
/** Fighter 2024 starts with 3 mastery slots at L1. */
export const FIGHTER_MASTERY = ['longsword', 'battleaxe', 'longbow'] as const
export const FIGHTING_STYLE_DEFENSE = 'defense'
export const BM_MANEUVERS_START = ['precision_attack', 'trip_attack', 'riposte'] as const

export async function pickSpellsToQuota(
  page: Page,
  tab: 'cantrips' | 'level1' | 'level2' | 'level3',
  pool: string[],
) {
  const tabBtn = page.getByTestId(`p24-m03-spell-tab-${tab}`)
  if (!(await tabBtn.count())) return 0
  await tabBtn.scrollIntoViewIfNeeded()
  await tabBtn.click()
  const label = (await tabBtn.innerText()) || ''
  const m = label.match(/(\d+)\/(\d+)/)
  const need = m ? Number(m[2]) - Number(m[1]) : 0
  let picked = 0
  const tryClick = async (card: Locator) => {
    const pressed = await card.getAttribute('aria-pressed')
    const checked = await card.getAttribute('aria-checked')
    if (pressed === 'true' || checked === 'true') return false
    if (await card.evaluate((el) => el.classList.contains('is-on') || el.classList.contains('is-selected'))) {
      return false
    }
    await card.scrollIntoViewIfNeeded()
    await card.click()
    return true
  }
  for (const slug of pool) {
    if (picked >= need) break
    const card = page.getByTestId(`p24-m03-card-${slug}`)
    if (!(await card.count())) continue
    if (await tryClick(card)) picked += 1
  }
  if (picked < need) {
    const cards = page.locator('[data-testid^="p24-m03-card-"]')
    const n = await cards.count()
    for (let i = 0; i < n && picked < need; i += 1) {
      if (await tryClick(cards.nth(i))) picked += 1
    }
  }
  if (need > 0) expect(picked, `could not fill ${tab} quota`).toBe(need)
  return need
}

/** Subclass mandatory picks if chip grids appear on the leveling step. */
export async function pickFighterSubclassForks(
  page: Page,
  subclassSlug: string | null,
  level: number,
) {
  if (!subclassSlug || level < 3) return
  const tryPick = async (prefix: string, ids: string[]) => {
    const first = page.getByTestId(`${prefix}-${ids[0]}`)
    if (await first.count()) await pickPrefixed(page, prefix, ids)
  }
  if (subclassSlug === SUB.battlemaster) {
    await tryPick('p24-m03-pick-maneuver', [...BM_MANEUVERS_START])
    await tryPick('p24-m03-pick-battle_master_maneuvers', [...BM_MANEUVERS_START])
    // Student of War tool if shown.
    const tool = page.locator('[data-testid^="p24-m03-pick-"][data-testid*="tool"]').first()
    if (await tool.count()) {
      if ((await tool.getAttribute('aria-checked')) !== 'true') await tool.click()
    }
  }
  await fillUnderfilledPicks(page)
}

export type LiveFighterOpts = {
  name: string
  level: number
  subclassSlug: string | null
  shotDir: string
  project: string
  stepShots?: boolean
  shotPrefix?: string
  duringLeveling?: (page: Page) => Promise<void>
  stopAfterForks?: boolean
  classEquipment?: 'a' | 'b' | 'gold'
  /** Fighting style on class step (required at L1 for fighter). null = leave unset. */
  fightingStyle?: string | null
  mastery?: readonly string[]
  skills?: readonly string[]
}

export async function walkLiveFighterCreate(
  page: Page,
  store: HarnessStore,
  opts: LiveFighterOpts,
): Promise<Record<string, any>> {
  const prefix = opts.shotPrefix ?? ''
  const skills = opts.skills ?? FIGHTER_SKILLS
  const mastery = opts.mastery ?? FIGHTER_MASTERY
  const fightingStyle =
    opts.fightingStyle === undefined ? FIGHTING_STYLE_DEFENSE : opts.fightingStyle

  await installFighterHarness(page, store)
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
  await pickPrefixed(page, 'p24-m03-pick-asi-plus2', ['str'])
  await pickPrefixed(page, 'p24-m03-pick-asi-plus1', ['con'])
  const toolChip = page.getByTestId('p24-m03-pick-bg-tool-dice-set')
  if (await toolChip.count()) await pickPrefixed(page, 'p24-m03-pick-bg-tool', ['dice-set'])
  else await fillUnderfilledPicks(page)
  await pickPrefixed(page, 'p24-m03-pick-language', ['elvish', 'dwarvish'])
  await pickPrefixed(page, 'p24-m03-pick-bg-equipment', ['pack'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) await shot(page, opts.shotDir, `${prefix}step2-background`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24-m03-step-class')).toBeVisible()
  await selectCatalogCard(page, 'Воин')
  await pickPrefixed(page, 'p24-m03-pick-skill', [...skills])
  await pickPrefixed(page, 'p24-m03-pick-mastery', [...mastery])
  if (fightingStyle) {
    await pickPrefixed(page, 'p24-m03-pick-style', [fightingStyle])
  }
  await pickPrefixed(page, 'p24-m03-pick-class-equipment', [opts.classEquipment ?? 'a'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) {
    const masteryHeading = page.getByTestId('p24-m03-mastery-heading')
    await expect(masteryHeading).toBeVisible()
    await masteryHeading.scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await tallShot(page, opts.shotDir, `${prefix}step3-class-skills-mastery`, opts.project)
  }
  await next(page)

  await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
  const layOut = page.getByRole('button', { name: /Разложить по приоритету класса/i })
  if (await layOut.isVisible().catch(() => false)) await layOut.click()
  if (opts.stepShots) await shot(page, opts.shotDir, `${prefix}step4-abilities`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 20_000 })
  const levelInput = page.getByTestId('p24-m03c-level-fighter')
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
      if (
        await expect(sub)
          .toHaveClass(/ui-button--primary/, { timeout: 2_000 })
          .then(() => true)
          .catch(() => false)
      )
        break
    }
    await expect(sub).toHaveClass(/ui-button--primary/)
  }

  // Fighter ASI / feat levels: 4, 6, 8, 12, 14, 16 + epic boon 19.
  for (const lv of [4, 6, 8, 12, 14, 16, 19]) {
    if (lv > opts.level) break
    const asi =
      lv === 4
        ? page.getByTestId(`p24-m03c-asi-plus2-fighter-${lv}`)
        : page.getByTestId(`p24-m03c-asi-feat-fighter-${lv}`)
    if (await asi.isVisible().catch(() => false)) {
      await asi.scrollIntoViewIfNeeded()
      await asi.click()
    }
  }

  const forksBtn = page.getByTestId('p24-m03c-forks-fighter')
  await forksBtn.scrollIntoViewIfNeeded()
  await forksBtn.click()
  const forkList = page.getByTestId('p24-m03c-fork-list-fighter')
  await expect(forkList).toBeVisible()
  await forkList.scrollIntoViewIfNeeded()

  if (opts.duringLeveling) await opts.duringLeveling(page)
  await pickFighterSubclassForks(page, opts.subclassSlug, opts.level)
  if (opts.stopAfterForks) return {}

  // Spells only for Eldritch Knight (⅓ caster).
  if (opts.subclassSlug === SUB.eldritchKnight && opts.level >= 3) {
    const spellsBtn = page.getByTestId('p24-m03c-spells')
    if (await spellsBtn.count()) {
      await spellsBtn.click()
      await page.waitForTimeout(300)
    }
    await pickSpellsToQuota(page, 'cantrips', [...EK_CANTRIPS])
    try {
      await pickSpellsToQuota(page, 'level1', [...EK_PREPARED])
    } catch {
      for (const tab of ['level1', 'level2', 'level3'] as const) {
        const tabBtn = page.getByTestId(`p24-m03-spell-tab-${tab}`)
        if (!(await tabBtn.count())) continue
        await pickSpellsToQuota(page, tab, [...EK_PREPARED])
      }
    }
  }

  if (opts.stepShots) {
    await page.getByTestId('p24-m03c-forks-fighter').scrollIntoViewIfNeeded()
    await unclipForks(page)
    await tallShot(page, opts.shotDir, `${prefix}step5-leveling-forks`, opts.project)
  }

  await expect(page.getByTestId('p24-m03-finish')).toBeEnabled({ timeout: 20_000 })
  await page.getByTestId('p24-m03-finish').click()
  try {
    await page.waitForURL(/\/characters\/[0-9a-f-]{36}$/i, { timeout: 45_000 })
  } catch {
    const issues = page.getByTestId('p24-m03-issues')
    const banner = await page
      .locator('.create-2024__issues, [role="alert"], [role="status"]')
      .allTextContents()
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

export async function createAt(
  page: Page,
  project: string,
  opts: Omit<LiveFighterOpts, 'shotDir' | 'project'> & { dir?: string },
) {
  const store = createStore()
  const sheet = await walkLiveFighterCreate(page, store, {
    ...opts,
    shotDir: opts.dir ?? ARTIFACTS,
    project,
  })
  await dismissGuided(page)
  return { store, sheet: sheet as Record<string, any> }
}

export async function storedSheet(store: HarnessStore): Promise<Record<string, any>> {
  return [...store.characters.values()][0]!.sheet as Record<string, any>
}

export async function waitStored(store: HarnessStore, fn: (s: Record<string, any>) => boolean) {
  await expect.poll(async () => fn(await storedSheet(store)), { timeout: 20_000 }).toBe(true)
}

export function poolFromSheet(sheet: Record<string, any>, poolId: string) {
  const pools = [
    ...((sheet.resources ?? []) as Array<Record<string, any>>),
    ...((sheet.play?.resources ?? []) as Array<Record<string, any>>),
    ...(((sheet.class_progress_2024?.resources ?? []) as Array<Record<string, any>>) || []),
  ]
  return pools.find(
    (r) =>
      String(r.pool_id ?? '') === poolId ||
      String(r.id ?? '').includes(poolId) ||
      new RegExp(poolId).test(String(r.id ?? '')),
  ) as
    | {
        id: string
        max: number
        used: number
        reset?: string
        shortRestRegain?: number
        blocks_magic_action?: boolean
      }
    | undefined
}

export function secondWindFromSheet(sheet: Record<string, any>) {
  return poolFromSheet(sheet, 'second_wind')
}

export function actionSurgeFromSheet(sheet: Record<string, any>) {
  return poolFromSheet(sheet, 'action_surge')
}

export function indomitableFromSheet(sheet: Record<string, any>) {
  return poolFromSheet(sheet, 'indomitable')
}

export function superiorityFromSheet(sheet: Record<string, any>) {
  return poolFromSheet(sheet, 'superiority_dice')
}

export function psionicEnergyFromSheet(sheet: Record<string, any>) {
  return poolFromSheet(sheet, 'psionic_energy')
}

export function scaleFromSheet(sheet: Record<string, any>, key: string): number | undefined {
  const scales =
    (sheet.class_progress_2024?.scales as Record<string, unknown> | undefined) ??
    (sheet.scales as Record<string, unknown> | undefined) ??
    {}
  const raw = scales[key]
  return raw == null ? undefined : Number(raw)
}

export function weaponMasteryScale(sheet: Record<string, any>) {
  return scaleFromSheet(sheet, 'fighter:weapon_mastery')
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
    const card = page.locator('.feature-card__name, .feature-card__title, .feature-card').filter({
      hasText: re,
    })
    if (await card.count()) {
      await card.first().scrollIntoViewIfNeeded()
      await expect(card.first(), `feature ${re}`).toBeVisible({ timeout: 15_000 })
      continue
    }
    if (re.test('Оружейное мастерство')) {
      await expect(page.getByText(/Оружейное мастерство/).first()).toBeVisible({ timeout: 15_000 })
      continue
    }
    await expect(page.getByText(re).first(), `feature ${re}`).toBeVisible({ timeout: 15_000 })
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
