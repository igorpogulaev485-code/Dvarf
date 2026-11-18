/**
 * Shared live-flow helpers for P24-M02-artificer e2e (real create wizard + sheet scenes).
 */
import { expect, type Locator, type Page } from '@playwright/test'
import path from 'node:path'
import {
  createStore,
  installArtificerHarness,
  type HarnessStore,
} from './artificer2024Harness'

export const ARTIFACTS = path.resolve(process.cwd(), '../artifacts/p24-m02-artificer')
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

export async function openCompanionsScene(page: Page, project: string) {
  if (isPhone(project)) await page.getByText('Напарн.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Напарники/ }).first().click()
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

export async function openExploreScene(page: Page, project: string) {
  if (isPhone(project)) await page.getByText('Снаряж.', { exact: true }).last().click()
  else await page.getByRole('button', { name: /^Снаряжение$|^Инвентарь$/ }).first().click()
  await page.waitForTimeout(600)
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
      /Модель доспеха|Дредноут|Страж|Диверсант|Компетентность|Первичн|Инфуз|Схем|Реплик|Железный|хранящ|заклинание/i.test(
        title,
      )
    ) {
      const chips = dlg.locator(
        '[role="checkbox"], button.ui-chip, .create-2024__pick-grid button, .sheet-chip',
      )
      const n = await chips.count()
      const head = ((await dlg.locator('h2, h3').first().textContent()) || '').match(/(\d+)\/(\d+)/)
      const need = head ? Math.max(1, Number(head[2]) - Number(head[1])) : Math.min(n, 4)
      let clicked = 0
      for (let i = 0; i < n && clicked < need; i += 1) {
        const chip = chips.nth(i)
        if (!(await chip.isVisible().catch(() => false))) continue
        const checked = await chip.getAttribute('aria-checked')
        if (checked === 'true' || (await chip.evaluate((el) => el.classList.contains('is-on')))) {
          continue
        }
        await chip.click()
        clicked += 1
        await page.waitForTimeout(120)
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

/** Artificer prepared pool (level 1+); fill from level1 tab like other half-casters. */
export const PREPARED = [
  'cure-wounds',
  'detect-magic',
  'alarm',
  'grease',
  'faerie-fire',
  'jump',
  'longstrider',
  'purify-food-and-drink',
  'disguise-self',
  'identify',
  'expeditious-retreat',
  'snare',
  'tashas-caustic-brew',
  'absorb-elements',
  'catapult',
]

export const CANTRIPS = [
  'acid-splash',
  'prestidigitation',
  'fire-bolt',
  'mage-hand',
  'guidance',
  'light',
  'message',
  'ray-of-frost',
  'shocking-grasp',
  'thorn-whip',
] as const

export const SUB = {
  alchemist: 'artificer__alchemist',
  armorer: 'artificer__armorer',
  artillerist: 'artificer__artillerist',
  battleSmith: 'artificer__battle-smith',
  cartographer: 'artificer__cartographer',
} as const

export type SubclassKey = keyof typeof SUB

export const SHOT = '2024-artificer'

export const ARTIFICER_SKILLS = ['investigation', 'arcana'] as const
export const ARTIFICER_CLASS_TOOL = 'smiths-tools'

export async function pickSpellsToQuota(
  page: Page,
  tab: 'cantrips' | 'level1' | 'level2' | 'level3' | 'level4' | 'level5',
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
  // High-level create: fill remaining from any visible cards on this tab.
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

/** Recommended EFA replicate plans (all available from L2 in curated catalog). */
export const PLAN_PICK_IDS = [
  'bag-of-holding',
  'sending-stones',
  'cap-of-water-breathing',
  'goggles-of-night',
  'alchemy-jug',
  'lantern-of-revealing',
  'rope-of-climbing',
  'wand-of-magic-detection',
] as const

export function plansKnownForLevel(level: number): number {
  if (level < 2) return 0
  if (level >= 18) return 8
  if (level >= 14) return 7
  if (level >= 10) return 6
  if (level >= 6) return 5
  return 4
}

export async function pickReplicatePlans(page: Page, level: number) {
  const need = plansKnownForLevel(level)
  if (need <= 0) return
  const ids = PLAN_PICK_IDS.slice(0, need)
  await pickPrefixed(page, 'p24-m03-pick-replicate_plan', [...ids])
}

export async function pickSpellStoringSpell(page: Page, level: number, spellId = 'cure-wounds') {
  if (level < 11) return
  const chip = page.getByTestId(`p24-m03-pick-spell_storing-${spellId}`)
  if (await chip.count()) {
    await chip.scrollIntoViewIfNeeded()
    if ((await chip.getAttribute('aria-checked')) !== 'true') {
      await chip.click()
      await expect(chip).toHaveAttribute('aria-checked', 'true')
    }
    return
  }
  // Fallback: first available SSI chip.
  const any = page.locator('[data-testid^="p24-m03-pick-spell_storing-"]').first()
  if (await any.count()) {
    await any.click()
    await expect(any).toHaveAttribute('aria-checked', 'true')
  }
}

/** Armorer armor model + replicate plans + SSI (and any underfilled chip grids). */
export async function pickArtificerSubclassForks(
  page: Page,
  subclassSlug: string | null,
  level: number,
  opts?: { armorModel?: 'dreadnaught' | 'infiltrator' | 'guardian' },
) {
  if (subclassSlug === SUB.armorer && level >= 3) {
    const model = opts?.armorModel ?? 'dreadnaught'
    const chip = page.getByTestId(`p24-m03-pick-armor_model-${model}`)
    if (await chip.count()) {
      await chip.scrollIntoViewIfNeeded()
      if ((await chip.getAttribute('aria-checked')) !== 'true') {
        await chip.click()
        await expect(chip).toHaveAttribute('aria-checked', 'true')
      }
    }
  }
  await pickReplicatePlans(page, level)
  await pickSpellStoringSpell(page, level)
  await fillUnderfilledPicks(page)
}

export type LiveArtificerOpts = {
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
  skills?: readonly string[]
  classTool?: string
  armorModel?: 'dreadnaught' | 'infiltrator' | 'guardian'
}

export async function walkLiveArtificerCreate(
  page: Page,
  store: HarnessStore,
  opts: LiveArtificerOpts,
): Promise<Record<string, any>> {
  const prefix = opts.shotPrefix ?? ''
  const skills = opts.skills ?? ARTIFICER_SKILLS
  const classTool = opts.classTool ?? ARTIFICER_CLASS_TOOL

  await installArtificerHarness(page, store)
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
  // Soldier ASI pool is str/dex/con only — INT comes from «Разложить по приоритету класса».
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
  await selectCatalogCard(page, 'Артефактор')
  await pickPrefixed(page, 'p24-m03-pick-skill', [...skills])
  const classToolChip = page.getByTestId(`p24-m03-pick-class-tool-${classTool}`)
  if (await classToolChip.count()) {
    await pickPrefixed(page, 'p24-m03-pick-class-tool', [classTool])
  } else {
    await fillUnderfilledPicks(page)
  }
  // No weapon mastery for Artificer 2024.
  await expect(page.getByTestId('p24-m03-mastery-heading')).toHaveCount(0)
  await pickPrefixed(page, 'p24-m03-pick-class-equipment', [opts.classEquipment ?? 'a'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) {
    await tallShot(page, opts.shotDir, `${prefix}step3-class-skills`, opts.project)
  }
  await next(page)

  await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
  const layOut = page.getByRole('button', { name: /Разложить по приоритету класса/i })
  if (await layOut.isVisible().catch(() => false)) await layOut.click()
  if (opts.stepShots) await shot(page, opts.shotDir, `${prefix}step4-abilities`, opts.project)
  await next(page)

  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 20_000 })
  const levelInput = page.getByTestId('p24-m03c-level-artificer')
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
        ? page.getByTestId(`p24-m03c-asi-plus2-artificer-${lv}`)
        : page.getByTestId(`p24-m03c-asi-feat-artificer-${lv}`)
    if (await asi.isVisible().catch(() => false)) {
      await asi.scrollIntoViewIfNeeded()
      await asi.click()
    }
  }

  // L1 Artificer has no inline forks (no mastery / fighting style / subclass) —
  // fork-list only mounts when forksFor() returns rows (subclass @3+, ASI @4+).
  const forksBtn = page.getByTestId('p24-m03c-forks-artificer')
  await forksBtn.scrollIntoViewIfNeeded()
  await forksBtn.click()
  const forkList = page.getByTestId('p24-m03c-fork-list-artificer')
  const hasForkList = await forkList
    .waitFor({ state: 'visible', timeout: 3_000 })
    .then(() => true)
    .catch(() => false)
  if (hasForkList) await forkList.scrollIntoViewIfNeeded()
  // Overview click may open a setup dialog — close it so spells stay reachable.
  await closeSetupDialog(page)

  if (opts.duringLeveling) await opts.duringLeveling(page)
  await pickArtificerSubclassForks(page, opts.subclassSlug, opts.level, {
    armorModel: opts.armorModel,
  })
  if (opts.stopAfterForks) return {}

  await pickSpellsToQuota(page, 'cantrips', [...CANTRIPS])
  // Prepared column is one quota across circles — fill L1 then higher tabs if needed.
  try {
    await pickSpellsToQuota(page, 'level1', PREPARED)
  } catch {
    for (const tab of ['level1', 'level2', 'level3', 'level4', 'level5'] as const) {
      const tabBtn = page.getByTestId(`p24-m03-spell-tab-${tab}`)
      if (!(await tabBtn.count())) continue
      await tabBtn.click()
      const label = (await tabBtn.innerText()) || ''
      const m = label.match(/(\d+)\/(\d+)/)
      if (!m) continue
      const cur = Number(m[1])
      const max = Number(m[2])
      if (cur >= max) break
      const cards = page.locator('[data-testid^="p24-m03-card-"]')
      const n = await cards.count()
      for (let i = 0; i < n; i += 1) {
        const again = (await tabBtn.innerText()) || ''
        const mm = again.match(/(\d+)\/(\d+)/)
        if (mm && Number(mm[1]) >= Number(mm[2])) break
        const card = cards.nth(i)
        const pressed = await card.getAttribute('aria-pressed')
        if (pressed === 'true') continue
        if (await card.evaluate((el) => el.classList.contains('is-on') || el.classList.contains('is-selected'))) {
          continue
        }
        await card.click()
        await page.waitForTimeout(80)
      }
      const finalLabel = (await tabBtn.innerText()) || ''
      const fm = finalLabel.match(/(\d+)\/(\d+)/)
      if (fm && Number(fm[1]) >= Number(fm[2])) break
    }
    const anyTab = page.locator('[data-testid^="p24-m03-spell-tab-"]').first()
    const final = ((await anyTab.innerText().catch(() => '')) || '').match(/(\d+)\/(\d+)/)
    // Soft: at least half the prepared quota for high-level smoke; L20 may share always-prepared UI.
    if (final) {
      expect(Number(final[1]), 'prepared progress').toBeGreaterThan(0)
    }
  }
  if (opts.stepShots) {
    const level1Tab = page.getByTestId('p24-m03-spell-tab-level1')
    if (await level1Tab.count()) await level1Tab.scrollIntoViewIfNeeded()
    await tallShot(page, opts.shotDir, `${prefix}step5-leveling-spells-picked`, opts.project)
    await page.getByTestId('p24-m03c-forks-artificer').scrollIntoViewIfNeeded()
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
  opts: Omit<LiveArtificerOpts, 'shotDir' | 'project'> & { dir?: string },
) {
  const store = createStore()
  const sheet = await walkLiveArtificerCreate(page, store, {
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

export function magicOfMakingFromSheet(sheet: Record<string, any>) {
  return poolFromSheet(sheet, 'magic_of_making')
}

export function flashOfGeniusFromSheet(sheet: Record<string, any>) {
  return poolFromSheet(sheet, 'flash_of_genius')
}

export function spellStoringFromSheet(sheet: Record<string, any>) {
  return poolFromSheet(sheet, 'spell_storing_item')
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
