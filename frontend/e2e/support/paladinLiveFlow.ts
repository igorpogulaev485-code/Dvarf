/**
 * Shared live-flow helpers for P24-M02-paladin e2e (real create wizard + sheet scenes).
 * No e2eSeed: every character is created by clicking through /characters/create?edition=2024&preview=1.
 */
import { expect, type Locator, type Page } from '@playwright/test'
import path from 'node:path'
import {
  createStore,
  installPaladinHarness,
  type HarnessStore,
} from './paladin2024Harness'

export const ARTIFACTS = '/opt/cursor/artifacts/p24-m02-paladin'
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

export async function openExploreScene(page: Page, project: string) {
  if (isPhone(project)) await page.getByText('Снаряж.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Снаряжение$|^Инвентарь$/ }).first().click()
  await page.waitForTimeout(600)
}

/** Play Desk identity dialog (name / +1 уровень / −1). */
export async function openIdentity(page: Page) {
  await page
    .locator('.play-desk__top button, [data-onboarding="combat-header"] button')
    .first()
    .click()
  const dlg = page.getByRole('dialog').last()
  await expect(dlg.getByRole('button', { name: /\+1 уровень/ })).toBeVisible()
  return dlg
}

/**
 * Live sheet level-up via identity «+1 уровень» → «Повышение уровня»
 * (same path as bard/cleric `liveLevelUp`; captures the features step).
 */
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

/** Live sheet level-down via identity «−1» (before/after shots of the dialog). */
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

/** Rest dialog: «Сброс коротких ресурсов» → preview → Применить (or Назад). */
export async function shortRestResources(
  page: Page,
  project: string,
  opts: { apply: boolean; previewShot?: string },
) {
  await openRest(page, project)
  const dlg = page.getByRole('dialog').last()
  await dlg.getByRole('button', { name: /Сброс коротких ресурсов/ }).click()
  await expect(dlg).toContainText(/Ресурсы «короткий»/)
  if (opts.previewShot) await shot(page, ARTIFACTS, opts.previewShot, project)
  if (opts.apply) {
    await dlg.getByRole('button', { name: /^Применить$/ }).click()
    await page.waitForTimeout(400)
    const close = page.getByRole('dialog').last().getByRole('button', { name: /^Закрыть$/ })
    if (await close.isVisible().catch(() => false)) await close.click()
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 })
  } else {
    await dlg.getByRole('button', { name: /^Назад$/ }).click()
    await dlg.getByRole('button', { name: /^Закрыть$/ }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 })
  }
  await page.waitForTimeout(400)
}

/** Rest dialog: Продолжительный → «Сводка и применение…» → Применить. */
export async function longRest(page: Page, project: string, previewShot?: string) {
  await openRest(page, project)
  const dlg = page.getByRole('dialog').last()
  await dlg.getByRole('tab', { name: /Продолжительный/ }).click()
  await dlg.getByRole('button', { name: /Сводка и применение/ }).click()
  if (previewShot) await shot(page, ARTIFACTS, previewShot, project)
  await dlg.getByRole('button', { name: /^Применить$/ }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 })
  await page.waitForTimeout(400)
}

/** Paladin list spells (leveled) — enough for L11 prepare quota (10). */
export const PREPARED = [
  'bless',
  'command',
  'cure-wounds',
  'detect-magic',
  'divine-favor',
  'heroism',
  'compelled-duel',
  'searing-smite',
  'thunderous-smite',
  'wrathful-smite',
  'aid',
  'lesser-restoration',
  'magic-weapon',
  'zone-of-truth',
  'find-steed',
  'shining-smite',
  'aura-of-vitality',
  'dispel-magic',
  'revivify',
  'crusaders-mantle',
  'blinding-smite',
  'daylight',
  'remove-curse',
  'elemental-weapon',
]

export const OATH = {
  devotion: 'paladin__oath-of-devotion',
  glory: 'paladin__oath-of-glory',
  ancients: 'paladin__oath-of-the-ancients',
  vengeance: 'paladin__oath-of-vengeance',
} as const

export type OathKey = keyof typeof OATH

export const SHOT = '2024-paladin'

/** Skills on class step (Soldier already grants Athletics + Intimidation). */
export const PALADIN_SKILLS = ['persuasion', 'insight'] as const
/** Two weapon mastery picks (any martial/simple the class allows). */
export const PALADIN_MASTERY = ['longsword', 'warhammer'] as const
export const FIGHTING_STYLE_DEFENSE = 'defense'
export const FIGHTING_STYLE_BLESSED = 'blessed-warrior'
export const BLESSED_CANTRIPS = ['guidance', 'sacred-flame'] as const

export async function pickSpellsToQuota(page: Page, tab: 'cantrips' | 'level1', pool: string[]) {
  const tabBtn = page.getByTestId(`p24-m03-spell-tab-${tab}`)
  if (!(await tabBtn.count())) return 0
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
    const pressed = await card.getAttribute('aria-pressed')
    const checked = await card.getAttribute('aria-checked')
    if (pressed === 'true' || checked === 'true') continue
    if (await card.evaluate((el) => el.classList.contains('is-on') || el.classList.contains('is-selected'))) {
      continue
    }
    await card.scrollIntoViewIfNeeded()
    await card.click()
    picked += 1
  }
  expect(picked, `could not fill ${tab} quota`).toBe(need)
  return need
}

export type LivePaladinOpts = {
  name: string
  level: number
  subclassSlug: string | null
  shotDir: string
  project: string
  stepShots?: boolean
  shotPrefix?: string
  duringLeveling?: (page: Page) => Promise<void>
  stopAfterForks?: boolean
  classEquipment?: 'a' | 'gold'
  /** Fighting style on class step (required at L2+). null = leave unset (create-at-1). */
  fightingStyle?: string | null
  blessedCantrips?: readonly string[]
  mastery?: readonly string[]
  skills?: readonly string[]
}

export async function walkLivePaladinCreate(
  page: Page,
  store: HarnessStore,
  opts: LivePaladinOpts,
): Promise<Record<string, any>> {
  const prefix = opts.shotPrefix ?? ''
  const skills = opts.skills ?? PALADIN_SKILLS
  const mastery = opts.mastery ?? PALADIN_MASTERY
  const fightingStyle =
    opts.fightingStyle === undefined
      ? opts.level >= 2
        ? FIGHTING_STYLE_DEFENSE
        : null
      : opts.fightingStyle

  await installPaladinHarness(page, store)
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
  // Soldier ASI pool is STR/DEX/CON only (no CHA).
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
  await selectCatalogCard(page, 'Паладин')
  await pickPrefixed(page, 'p24-m03-pick-skill', [...skills])
  await pickPrefixed(page, 'p24-m03-pick-mastery', [...mastery])
  if (fightingStyle) {
    await pickPrefixed(page, 'p24-m03-pick-style-paladin', [fightingStyle])
    if (fightingStyle === FIGHTING_STYLE_BLESSED) {
      const cantrips = opts.blessedCantrips ?? BLESSED_CANTRIPS
      await expect(page.getByTestId(`p24-m03-pick-blessed-cantrip-${cantrips[0]}`)).toBeVisible({
        timeout: 10_000,
      })
      await pickPrefixed(page, 'p24-m03-pick-blessed-cantrip', [...cantrips])
    }
  }
  await pickPrefixed(page, 'p24-m03-pick-class-equipment', [opts.classEquipment ?? 'a'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) {
    await page.getByTestId('p24-m03-pick-mastery-longsword').scrollIntoViewIfNeeded()
    await tallShot(page, opts.shotDir, `${prefix}step3-class-skills-mastery`, opts.project)
  }
  await next(page)

  await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
  const layOut = page.getByRole('button', { name: /Разложить по приоритету класса/i })
  if (await layOut.isVisible().catch(() => false)) await layOut.click()
  if (opts.stepShots) await shot(page, opts.shotDir, `${prefix}step4-abilities`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 20_000 })
  const levelInput = page.getByTestId('p24-m03c-level-paladin')
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

  for (const lv of [4, 8, 12, 16, 19]) {
    if (lv > opts.level) break
    const asi =
      lv === 4
        ? page.getByTestId(`p24-m03c-asi-plus2-paladin-${lv}`)
        : page.getByTestId(`p24-m03c-asi-feat-paladin-${lv}`)
    if (await asi.isVisible().catch(() => false)) {
      await asi.scrollIntoViewIfNeeded()
      await asi.click()
    }
  }

  const forksBtn = page.getByTestId('p24-m03c-forks-paladin')
  await forksBtn.scrollIntoViewIfNeeded()
  await forksBtn.click()
  const forkList = page.getByTestId('p24-m03c-fork-list-paladin')
  await expect(forkList).toBeVisible()
  await forkList.scrollIntoViewIfNeeded()

  if (opts.duringLeveling) await opts.duringLeveling(page)
  if (opts.stopAfterForks) return {}

  // Paladin has 0 class cantrips (Blessed Warrior cantrips are class options, not this tab).
  const cantripTab = page.getByTestId('p24-m03-spell-tab-cantrips')
  if (await cantripTab.count()) {
    await pickSpellsToQuota(page, 'cantrips', ['guidance', 'sacred-flame', 'light', 'thaumaturgy'])
  }
  await pickSpellsToQuota(page, 'level1', PREPARED)
  if (opts.stepShots) {
    await page.getByTestId('p24-m03-spell-tab-level1').scrollIntoViewIfNeeded()
    await tallShot(page, opts.shotDir, `${prefix}step5-leveling-spells-picked`, opts.project)
    await page.getByTestId('p24-m03c-forks-paladin').scrollIntoViewIfNeeded()
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
  opts: Omit<LivePaladinOpts, 'shotDir' | 'project'> & { dir?: string },
) {
  const store = createStore()
  const sheet = await walkLivePaladinCreate(page, store, {
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
  ) as { id: string; max: number; used: number; reset?: string; shortRestRegain?: number } | undefined
}

export function channelFromSheet(sheet: Record<string, any>) {
  return poolFromSheet(sheet, 'channel_divinity')
}

export function layOnHandsFromSheet(sheet: Record<string, any>) {
  return poolFromSheet(sheet, 'lay_on_hands_hp')
}

export function freeSmiteFromSheet(sheet: Record<string, any>) {
  return poolFromSheet(sheet, 'paladin_free_smite')
}

export function freeSteedFromSheet(sheet: Record<string, any>) {
  return poolFromSheet(sheet, 'paladin_free_steed')
}

export function auraRadiusFt(sheet: Record<string, any>): number | undefined {
  const scales =
    (sheet.class_progress_2024?.scales as Record<string, unknown> | undefined) ??
    (sheet.scales as Record<string, unknown> | undefined) ??
    {}
  const raw = scales['paladin:aura_radius_ft']
  return typeof raw === 'number' ? raw : undefined
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

export async function applyDialog(page: Page, dlg: Locator) {
  await dlg.getByRole('button', { name: /^Применить$/ }).click()
  await expect(dlg).toBeHidden({ timeout: 10_000 })
  await page.waitForTimeout(300)
}

export async function cancelDialog(page: Page, dlg: Locator) {
  await dlg.getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click()
  await expect(dlg).toBeHidden({ timeout: 10_000 })
}

export async function channelRemaining(page: Page): Promise<{ left: number; max: number }> {
  const card = await featureCard(page, /^Проведение божественности$/)
  await expandCard(card)
  const text = (await card.innerText()).replace(/\s+/g, ' ')
  const m =
    /Проведение божественности:\s*(\d+)\s*\/\s*(\d+)/.exec(text) ??
    /(\d+)\/(\d+) · Проведение/.exec(text) ??
    /доступно\s+(\d+)\s+из\s+(\d+)/.exec(text) ??
    /(\d+)\s*\/\s*(\d+)/.exec(text)
  if (!m) throw new Error(`channel pips not found in: ${text}`)
  return { left: Number(m[1]), max: Number(m[2]) }
}

export async function lohRemaining(page: Page): Promise<{ left: number; max: number }> {
  const card = await featureCard(page, /^Возложение рук$/)
  await expandCard(card)
  const text = (await card.innerText()).replace(/\s+/g, ' ')
  const m =
    /Возложение рук:\s*(\d+)\s*\/\s*(\d+)/.exec(text) ??
    /доступно\s+(\d+)\s+из\s+(\d+)/.exec(text) ??
    /(\d+)\s*\/\s*(\d+)/.exec(text)
  if (!m) throw new Error(`LoH pips not found in: ${text}`)
  return { left: Number(m[1]), max: Number(m[2]) }
}

/** Spend one Channel Divinity via Sacred Weapon (Devotion) dialog. */
export async function spendChannelSacredWeapon(page: Page, project?: string, shotName?: string) {
  const before = (await channelRemaining(page)).left
  const dlg = await openCardUse(page, /^Священное оружие$/, /Оружие…/)
  if (shotName && project) await shot(page, ARTIFACTS, shotName, project)
  await applyDialog(page, dlg)
  await expect
    .poll(async () => (await channelRemaining(page)).left, { timeout: 10_000 })
    .toBe(before - 1)
}

/** Open LoH 2024 dialog (bonus action + poison). */
export async function openLayOnHandsDialog(page: Page) {
  return openCardUse(page, /^Возложение рук$/, /Возложение…/)
}
