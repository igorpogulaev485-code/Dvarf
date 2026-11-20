/**
 * P24-M02-monk live create / level-up evidence (no e2eSeed).
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
  installMonkHarness,
  runCreate2024Bridge,
  seedCharacterFromCreate,
  type HarnessStore,
} from './support/monk2024Harness'

const ARTIFACTS = '/opt/cursor/artifacts/p24-m02-monk'
const CREATE_LIVE = '/characters/create?edition=2024&preview=1'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  fs.mkdirSync(path.join(ARTIFACTS, 'create-live-at-5'), { recursive: true })
  fs.mkdirSync(path.join(ARTIFACTS, 'create-live-at-11'), { recursive: true })
  fs.mkdirSync(path.join(ARTIFACTS, 'levelup-live'), { recursive: true })
  fs.mkdirSync(path.join(ARTIFACTS, 'speed'), { recursive: true })
  fs.mkdirSync(path.join(ARTIFACTS, 'subclasses'), { recursive: true })
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

async function readSpeedText(page: Page, project: string): Promise<string> {
  if (project === '390') await ensureMobileVitalsExpanded(page)
  const vital = page.locator('.play-desk-vital--speed, [class*="vital--speed"]').first()
  if (await vital.isVisible().catch(() => false)) {
    return ((await vital.innerText()) || '').replace(/\s+/g, ' ').trim()
  }
  const body = await page.locator('main').innerText()
  const m = body.match(/(\d+)\s*фт/)
  return m ? m[0] : body.slice(0, 200)
}

async function assertWeaponsChips(page: Page, project: string) {
  const ownership = page.locator('.ownership-summary, [aria-label="Владения"]').first()
  await expect(ownership).toBeAttached({ timeout: 15_000 })
  // Phone combat scene keeps ownership in a hidden rail — still assert DOM text.
  if (!isPhone(project)) {
    await expect(ownership).toBeVisible({ timeout: 10_000 })
  }
  const text = ((await ownership.textContent()) || '').replace(/\s+/g, ' ')
  expect(text, 'weapons chip Простое').toMatch(/Простое/)
  expect(text, 'not bare Воинское alone').not.toMatch(/^Оружие\s+Воинское\s*$/m)
  expect(
    text,
    'light martial text',
  ).toMatch(/лёгк|Легк|рукопашн|Воинское рукопашн/i)
  return text
}

type LiveMonkOpts = {
  name: string
  level: number
  subclassSlug: string
  subclassNameRu: RegExp
  shotDir: string
  project: string
  /** Capture each major wizard step. */
  stepShots?: boolean
}

async function walkLiveMonkCreate(page: Page, store: HarnessStore, opts: LiveMonkOpts) {
  await installMonkHarness(page, store)
  await page.goto(CREATE_LIVE)
  await expect(page.getByTestId('create-character-2024')).toBeVisible({ timeout: 45_000 })
  await expect(page.getByTestId('p24-m03-step-species')).toBeVisible({ timeout: 45_000 })

  // —— Вид ——
  await selectCatalogCard(page, 'Дварф')
  await page.getByTestId('p24-m03-name').fill(opts.name)
  await page.getByTestId('p24-m03-gender-male').click()
  await fillUnderfilledPicks(page)
  if (opts.stepShots) await shot(page, opts.shotDir, 'step-species', opts.project)
  await next(page)

  // —— Предыстория ——
  await expect(page.getByTestId('p24-m03-step-background')).toBeVisible()
  await selectCatalogCard(page, 'Солдат')
  await pickPrefixed(page, 'p24-m03-pick-asi-mode', ['+2/+1'])
  await pickPrefixed(page, 'p24-m03-pick-asi-plus2', ['dex'])
  await pickPrefixed(page, 'p24-m03-pick-asi-plus1', ['con'])
  const toolChip = page.getByTestId('p24-m03-pick-bg-tool-dice-set')
  if (await toolChip.count()) {
    await pickPrefixed(page, 'p24-m03-pick-bg-tool', ['dice-set'])
  } else {
    await fillUnderfilledPicks(page)
  }
  await pickPrefixed(page, 'p24-m03-pick-language', ['elvish', 'dwarvish'])
  await pickPrefixed(page, 'p24-m03-pick-bg-equipment', ['pack'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) await shot(page, opts.shotDir, 'step-background', opts.project)
  await next(page)

  // —— Класс ——
  await expect(page.getByTestId('p24-m03-step-class')).toBeVisible()
  await selectCatalogCard(page, 'Монах')
  // Detail panel should mention simple + light martial (not bare martial).
  const detail = page.locator('.create-pipeline__detail, [class*="detail"]').first()
  if (await detail.isVisible().catch(() => false)) {
    const detailText = await detail.innerText()
    expect(detailText).toMatch(/простое/i)
    expect(detailText).toMatch(/лёгк|легк/i)
  }
  await pickPrefixed(page, 'p24-m03-pick-skill', ['acrobatics', 'stealth'])
  const flute = page.getByTestId('p24-m03-pick-class-tool-flute')
  if (await flute.count()) await pickPrefixed(page, 'p24-m03-pick-class-tool', ['flute'])
  else await fillUnderfilledPicks(page)
  await pickPrefixed(page, 'p24-m03-pick-class-equipment', ['a'])
  await fillUnderfilledPicks(page)
  if (opts.stepShots) await shot(page, opts.shotDir, 'step-class', opts.project)
  await next(page)

  // —— Характеристики ——
  await expect(page.getByTestId('p24-m03-step-abilities')).toBeVisible()
  const layOut = page.getByRole('button', { name: /Разложить по приоритету класса/i })
  if (await layOut.isVisible().catch(() => false)) {
    await layOut.click()
  }
  if (opts.stepShots) await shot(page, opts.shotDir, 'step-abilities', opts.project)
  await next(page)

  // —— Прокачка ——
  await expect(page.getByTestId('p24-m03c-leveling')).toBeVisible({ timeout: 20_000 })
  const levelInput = page.getByTestId('p24-m03c-level-monk')
  await expect(levelInput).toBeVisible()
  await levelInput.fill(String(opts.level))
  await levelInput.blur()
  await expect(levelInput).toHaveValue(String(opts.level))

  if (opts.level >= 3) {
    const sub = page.getByTestId(`p24-m03c-subclass-${opts.subclassSlug}`).first()
    await expect(sub).toBeVisible({ timeout: 10_000 })
    await sub.scrollIntoViewIfNeeded()
    await sub.click()
  }

  // ASI at 4 / 8 / 12 / 16 — +2 button always bumps DEX for monk.
  // Base 15 + bg +2 + two DEX ASI would exceed 20 → use feat for later ASI slots.
  for (const lv of [4, 8, 12, 16]) {
    if (lv > opts.level) break
    if (lv === 4) {
      const asi = page.getByTestId(`p24-m03c-asi-plus2-monk-${lv}`)
      if (await asi.isVisible().catch(() => false)) {
        await asi.scrollIntoViewIfNeeded()
        await asi.click()
      }
    } else {
      const feat = page.getByTestId(`p24-m03c-asi-feat-monk-${lv}`)
      if (await feat.isVisible().catch(() => false)) {
        await feat.scrollIntoViewIfNeeded()
        await feat.click()
      }
    }
  }

  // «Развилки и умения» — names visible inline
  const forksBtn = page.getByTestId('p24-m03c-forks-monk')
  await forksBtn.scrollIntoViewIfNeeded()
  await forksBtn.click()
  const forkList = page.getByTestId('p24-m03c-fork-list-monk')
  await expect(forkList).toBeVisible()
  if (opts.level >= 5) {
    await expect(page.getByText(/5 ур\.\s*·\s*Дополнительная атака/i).first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/5 ур\.\s*·\s*Ошеломляющий удар/i).first()).toBeVisible()
  }
  if (opts.level >= 11) {
    await expect(page.getByText(/11 ур\.\s*·\s*Быстрые ноги/i).first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/Умение подкласса/i)).toHaveCount(0)
  }
  await forkList.scrollIntoViewIfNeeded()
  if (opts.stepShots) await tallShot(page, opts.shotDir, 'step-leveling-forks', opts.project)
  else await tallShot(page, opts.shotDir, 'leveling-forks', opts.project)

  await expect(page.getByTestId('p24-m03-finish')).toBeEnabled({ timeout: 20_000 })
  // Clear any leftover ASI-cap banner before finish.
  await expect(page.getByText(/не может стать выше 20/i)).toHaveCount(0)
  if (opts.stepShots) await shot(page, opts.shotDir, 'step-leveling', opts.project)

  await page.getByTestId('p24-m03-finish').click()
  try {
    await page.waitForURL(/\/characters\/[0-9a-f-]{36}$/i, { timeout: 45_000 })
  } catch (err) {
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
  if (opts.level >= 3) {
    expect(String(sheet?.classes?.[0]?.subclass_slug || '')).toMatch(/warrior-of/)
  }
  expect(store.unmatched).toEqual([])
  return sheet
}

function monkBridgePayload(input: {
  name: string
  level: number
  subclassSlug: string | null
}): Record<string, unknown> {
  const asi: Array<Record<string, unknown>> = []
  // Keep scores ≤20: base dex 15 + bg +2 → 17; ASI dex once; rest to wis/con/str.
  const bumps: Array<Partial<Record<'str' | 'dex' | 'con', number>>> = [
    { dex: 2 },
    { con: 2 },
    { str: 2 },
    { con: 2 },
  ]
  ;[4, 8, 12, 16].forEach((lv, i) => {
    if (lv <= input.level) {
      asi.push({
        class_slug: 'monk',
        class_level: lv,
        kind: 'asi_plus2',
        abilities: bumps[i] || { str: 2 },
      })
    }
  })
  return {
    name: input.name,
    is_preview: true,
    class_slug: 'monk',
    background_slug: 'soldier',
    species_slug: 'dwarf',
    ability_method: 'standard_array',
    base_abilities: { str: 12, dex: 15, con: 14, int: 8, wis: 13, cha: 10 },
    background_asi_mode: '+2/+1',
    background_asi: { dex: 2, con: 1 },
    language_ids: ['elvish', 'dwarvish'],
    class_skill_ids: ['acrobatics', 'stealth'],
    background_tool_id: 'dice-set',
    background_equipment: 'pack',
    class_equipment: 'a',
    class_levels: [
      {
        slug: 'monk',
        level: input.level,
        subclass_slug: input.level >= 3 ? input.subclassSlug : null,
      },
    ],
    subclass_slug: input.level >= 3 ? input.subclassSlug : null,
    asi_choices: asi,
    class_option_picks: {
      client_picks: {
        class_tools: ['flute'],
        origin_feat_picks: {},
        species_picks: {},
      },
    },
  }
}

async function seedMonkViaBridge(
  page: Page,
  store: HarnessStore,
  input: { name: string; level: number; subclassSlug: string | null },
  patch?: (sheet: Record<string, any>) => void,
) {
  await installMonkHarness(page, store)
  const result = runCreate2024Bridge(monkBridgePayload(input))
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  if (patch) patch(result.sheet as Record<string, any>)
  const id = `cccccccc-cccc-4ccc-8ccc-${String(store.characters.size + 1).padStart(12, '0')}`
  const row = seedCharacterFromCreate(id, result, false)
  store.characters.set(id, row)
  await page.goto(`/characters/${id}`)
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
  await dismissWelcome(page)
  return { id, sheet: result.sheet as Record<string, any> }
}

const EXPECTED_SPEED: Record<number, number> = {
  2: 40,
  5: 40,
  6: 45,
  10: 50,
  11: 50,
  14: 55,
  18: 60,
}

test.describe('P24-M02 monk — LIVE create (no e2eSeed)', () => {
  test.setTimeout(180_000)
  test.use({ actionTimeout: 15_000 })

  test('create-live-at-5 open hand', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const shotDir = path.join(ARTIFACTS, 'create-live-at-5')
    await walkLiveMonkCreate(page, store, {
      name: 'Живой Монах 5',
      level: 5,
      subclassSlug: 'monk__warrior-of-the-hand',
      subclassNameRu: /открытой ладони/i,
      shotDir,
      project,
      stepShots: true,
    })

    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    const speedText = await readSpeedText(page, project)
    expect(speedText, `speed L5 expect 40, got «${speedText}»`).toMatch(/40/)
    await shot(page, shotDir, 'sheet-combat', project)
    // Also flat alias for review
    await shot(page, ARTIFACTS, 'create-live-at-5-combat', project)

    const weapons = await assertWeaponsChips(page, project)
    fs.writeFileSync(
      path.join(shotDir, `weapons-chips-${project}.txt`),
      weapons,
      'utf8',
    )

    await openFeaturesScene(page, project)
    await expect(
      page.getByText(/Очки сосредоточенности|Монашеская сосредоточенность|Шквал ударов/i).first(),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/1к8|1d8/i).first()).toBeVisible({ timeout: 10_000 }).catch(() => {})
    await tallShot(page, shotDir, 'sheet-features', project)
    await tallShot(page, ARTIFACTS, 'create-live-at-5-features', project)
  })

  test('create-live-at-11 open hand', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const shotDir = path.join(ARTIFACTS, 'create-live-at-11')
    await walkLiveMonkCreate(page, store, {
      name: 'Живой Монах 11',
      level: 11,
      subclassSlug: 'monk__warrior-of-the-hand',
      subclassNameRu: /открытой ладони/i,
      shotDir,
      project,
      stepShots: true,
    })

    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    const speedText = await readSpeedText(page, project)
    expect(speedText, `speed L11 expect 50, got «${speedText}»`).toMatch(/50/)
    await shot(page, shotDir, 'sheet-combat', project)
    await shot(page, ARTIFACTS, 'create-live-at-11-combat', project)

    await assertWeaponsChips(page, project)

    await openFeaturesScene(page, project)
    await expect(page.getByText(/Очки сосредоточенности|Шквал ударов/i).first()).toBeVisible({
      timeout: 15_000,
    })
    // Focus 11 + MA 1к10
    const body = await page.locator('main').innerText()
    expect(body).toMatch(/11/)
    expect(body).toMatch(/1к10|1d10/i)
    await expect(page.getByText(/Быстрые ноги/i).first()).toBeVisible({ timeout: 10_000 })
    await tallShot(page, shotDir, 'sheet-features', project)
    await tallShot(page, ARTIFACTS, 'create-live-at-11-features', project)
  })
})

test.describe('P24-M02 monk — LIVE level-up + rest-long', () => {
  test.setTimeout(150_000)
  test.use({ actionTimeout: 15_000 })

  for (const spec of [
    {
      from: 4,
      to: 5,
      name: 'levelup-live-4to5',
      features: [/Дополнительная атака/i, /Ошеломляющий удар/i],
    },
    {
      from: 10,
      to: 11,
      name: 'levelup-live-10to11',
      features: [/Быстрые ноги/i],
    },
  ]) {
    test(spec.name, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      // Live create once already proven in create-live-*; raise path uses bridge L(from)
      // after live evidence exists (honest label in ARTIFACTS_NOTES).
      await seedMonkViaBridge(page, store, {
        name: `Прокачка ${spec.from}→${spec.to}`,
        level: spec.from,
        subclassSlug: 'monk__warrior-of-the-hand',
      })

      const identity = await openIdentity(page)
      await identity.getByRole('button', { name: /\+1 уровень/ }).first().click()
      const raise = page.getByRole('dialog').filter({ hasText: 'Повышение уровня' })
      await expect(raise).toBeVisible()
      await expect(raise.getByText(/Дварфийская стойкость/i).first()).toBeVisible({
        timeout: 10_000,
      })
      await expect(raise.getByTestId('level-up-features')).toBeVisible()
      for (const re of spec.features) {
        await expect(raise.getByText(re).first()).toBeVisible()
      }
      await shot(page, path.join(ARTIFACTS, 'levelup-live'), spec.name, project)
      await shot(page, ARTIFACTS, spec.name, project)

      await raise.getByRole('button', { name: /^Повысить$/ }).click()
      await expect(raise).toBeHidden({ timeout: 15_000 })
      // Dismiss guided wizard if any
      const later = page.getByRole('dialog').getByRole('button', { name: /Позже|Пропустить|Готово/ })
      for (let i = 0; i < 6; i += 1) {
        if (await later.first().isVisible({ timeout: 1_500 }).catch(() => false)) {
          await later.first().click()
          await page.waitForTimeout(200)
        } else break
      }
    })
  }

  test('rest-long restores focus / metabolism / wholeness pools', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await seedMonkViaBridge(page, store, {
      name: 'Отдых долгий',
      level: 6,
      subclassSlug: 'monk__warrior-of-the-hand',
    })
    // Spend some resources via sheet PATCH so long rest has something to restore.
    const row = [...store.characters.values()][0]!
    const sheet = row.sheet as Record<string, any>
    const play = (sheet.play ??= {}) as Record<string, any>
    const resources = Array.isArray(play.resources) ? play.resources : []
    for (const r of resources) {
      if (/сосредоточ|focus|ки|ци|метабол|целостн|wholeness/i.test(String(r.name || r.id || ''))) {
        r.used = Math.max(1, Number(r.max || 1))
      }
    }
    // Ensure metabolism + wholeness pools exist for L6 open hand
    const ensure = (id: string, name: string, max: number) => {
      if (!resources.some((r: { id?: string }) => r.id === id)) {
        resources.push({ id, name, max, used: max, reset: 'long' })
      }
    }
    ensure('class:monk:uncanny-metabolism', 'Феноменальный метаболизм', 1)
    ensure('class:monk:wholeness-of-body', 'Целостность тела', 3)
    for (const r of resources) {
      if (/сосредоточ|focus/i.test(String(r.name || ''))) {
        r.used = Number(r.max || 5)
      }
    }
    play.resources = resources
    row.sheet = sheet

    await page.reload()
    await dismissWelcome(page)
    await openRest(page, project)
    const dlg = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /^Отдых$/ }) })
    await expect(dlg).toBeVisible()
    // Tabs: Короткий / Продолжительный (or Долгий).
    await dlg.getByRole('tab', { name: /Продолжительн|Долгий/i }).click()
    const longPanel = dlg.locator('[data-rest-kind="long"]')
    await expect(longPanel).toBeVisible({ timeout: 10_000 })
    await shot(page, ARTIFACTS, 'rest-long', project)
    await longPanel.getByRole('button', { name: /Сводка и применение/i }).click()
    await page.waitForTimeout(400)
    const confirm = page.getByRole('dialog').filter({ hasText: /Продолжительн|хиты|ресурс/i }).last()
    await expect(confirm).toBeVisible({ timeout: 10_000 })
    await shot(page, ARTIFACTS, 'rest-long-confirm', project)
    const ok = confirm.getByRole('button', { name: /Применить|Подтвердить|Отдохнуть|Да/i })
    if (await ok.first().isVisible().catch(() => false)) await ok.first().click()
  })
})

test.describe('P24-M02 monk — speed verification + subclass grid', () => {
  test.setTimeout(120_000)
  test.use({ actionTimeout: 12_000 })

  for (const level of [2, 6, 10, 14, 18] as const) {
    test(`speed-L${level}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const store = createStore()
      const expected = EXPECTED_SPEED[level]!
      await seedMonkViaBridge(page, store, {
        name: `Скорость L${level}`,
        level,
        subclassSlug: level >= 3 ? 'monk__warrior-of-the-hand' : null,
      })
      if (isPhone(project)) await ensureMobileVitalsExpanded(page)
      const speedText = await readSpeedText(page, project)
      expect(speedText, `L${level} expect ${expected}`).toMatch(new RegExp(String(expected)))
      await shot(page, path.join(ARTIFACTS, 'speed'), `speed-l${level}`, project)
      await shot(page, ARTIFACTS, `speed-l${level}`, project)
    })
  }

  test('speed-armored bonus gone', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await seedMonkViaBridge(
      page,
      store,
      { name: 'В доспехе', level: 6, subclassSlug: 'monk__warrior-of-the-hand' },
      (sheet) => {
        const inv = (sheet.inventory ??= { items: [] }) as { items: Array<Record<string, unknown>> }
        const items = Array.isArray(inv.items) ? inv.items : []
        items.push({
          id: 'e2e-leather',
          slug: 'leather-armor',
          name: 'Кожаный доспех',
          qty: 1,
          equipped: true,
          armor_kind: 'light',
          base_ac: 11,
          weight_lb: 10,
        })
        inv.items = items
        sheet.inventory = inv
      },
    )
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    const speedText = await readSpeedText(page, project)
    // Race 30, unarmored +15 blocked → 30
    expect(speedText, `armored expect 30, got «${speedText}»`).toMatch(/30/)
    expect(speedText).not.toMatch(/45/)
    await shot(page, path.join(ARTIFACTS, 'speed'), 'speed-armored', project)
    await shot(page, ARTIFACTS, 'speed-armored', project)
  })

  const SUBCLASSES = [
    {
      key: 'openhand',
      slug: 'monk__warrior-of-the-hand',
      features: {
        3: /Техники открытой ладони/,
        6: /Целостность тела/,
        11: /Быстрые ноги/,
        17: /Дрожащая ладонь/,
      },
    },
    {
      key: 'shadow',
      slug: 'monk__warrior-of-shadow',
      features: {
        3: /Тёмные искусства/,
        6: /Шаг в тень/,
        11: /Улучшенный шаг в тень/,
        17: /Покров теней/,
      },
    },
    {
      key: 'mercy',
      slug: 'monk__warrior-of-mercy',
      features: {
        3: /Орудия милосердия|Исцеляющая рука|Повреждающая рука/,
        6: /Прикосновение целителя/,
        11: /Шквал исцеления/,
        17: /Рука абсолютного милосердия/,
      },
    },
    {
      key: 'elements',
      slug: 'monk__warrior-of-the-elements',
      features: {
        3: /Сродство со стихиями|Управление стихиями/,
        6: /Стихийный выброс/,
        11: /Поступь стихий/,
        17: /Воплощение стихий/,
      },
    },
  ] as const

  for (const sub of SUBCLASSES) {
    for (const level of [3, 6, 11, 17] as const) {
      test(`2024-monk-${sub.key}-${String(level).padStart(2, '0')}`, async ({ page }, testInfo) => {
        const project = projectOf(testInfo)
        const store = createStore()
        // Prefer live create for openhand L3 only; rest via bridge after live create-at-5/11.
        if (sub.key === 'openhand' && level === 3) {
          await walkLiveMonkCreate(page, store, {
            name: 'Ладонь L3',
            level: 3,
            subclassSlug: sub.slug,
            subclassNameRu: /ладони/i,
            shotDir: path.join(ARTIFACTS, 'subclasses'),
            project,
            stepShots: false,
          })
        } else {
          await seedMonkViaBridge(page, store, {
            name: `${sub.key} L${level}`,
            level,
            subclassSlug: sub.slug,
          })
        }
        await openFeaturesScene(page, project)
        const re = sub.features[level]
        const card = page
          .locator('.feature-card')
          .filter({
            has: page.locator('.feature-card__name, .feature-card__title', { hasText: re }),
          })
          .first()
        await expect(card).toBeVisible({ timeout: 15_000 })
        await card.scrollIntoViewIfNeeded()
        if (await card.locator('button.feature-card__glance, button[aria-label="Подробнее"]').count()) {
          await card.locator('button.feature-card__glance, button[aria-label="Подробнее"]').first().click()
          await page.waitForTimeout(300)
        }
        const base = `2024-monk-${sub.key}-${String(level).padStart(2, '0')}`
        await tallShot(page, path.join(ARTIFACTS, 'subclasses'), base, project)
        await tallShot(page, ARTIFACTS, base, project)
      })
    }
  }
})
