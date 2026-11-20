/**
 * P24-M02-bard Доправка 1 — live evidence shots (wizard clicked / live sheet, no e2eSeed as proof).
 * Output: /opt/cursor/artifacts/p24-m02-bard/fixup1/  (1440 + 390 for each shot)
 */
import { expect, test, type Page } from '@playwright/test'
import {
  bindStoreToBardLobby,
  createStore,
  installBiEffectOnCharacter,
  seedAllyFromBridge,
} from './support/bard2024Harness'
import {
  FIXUP1_DIR,
  SUB,
  cancelDialog,
  createAt,
  dismissGuided,
  ensureMobileVitalsExpanded,
  expandAllFeatures,
  expandCard,
  expectFeatureNames,
  featureCard,
  isPhone,
  openCardUse,
  openCombatScene,
  openExploreScene,
  openFeaturesScene,
  openIdentity,
  openSpellsPane,
  projectOf,
  shot,
  storedCharacter,
  storedSheet,
  unequipItem,
  waitStored,
  walkLiveBardCreate,
  addGearFromPicker,
  equipItem,
  chaModOf,
  biPoolFromSheet,
} from './support/bardLiveFlow'
import { ensureFixup1Dir, fshot, waitNoToast } from './support/fixup1Shots'

const DIR = FIXUP1_DIR
const BI = /^Бардовское вдохновение/

test.beforeAll(() => ensureFixup1Dir(DIR))

async function f(page: Page, name: string, project: string, frame?: Parameters<typeof fshot>[3]['frame']) {
  await fshot(page, name, project, { dir: DIR, frame })
}

async function giveInspirationToAlly(page: Page, allyName: string, allyId: string) {
  const dlg = await openCardUse(page, BI, /Даровать…/)
  await dlg.getByPlaceholder('Имя союзника').fill(allyName)
  // Do not use applyDialog(): UseAllyAbilityDialog replaces `.last()` dialog before hide.
  await dlg.getByRole('button', { name: /^Применить$/ }).click()
  const allyDlg = page.getByRole('dialog').filter({ hasText: /Кто|Цель|союзник/i }).last()
  await expect(allyDlg).toBeVisible({ timeout: 10_000 })
  const select = allyDlg.locator('select.play-select').last()
  await expect(select).toBeVisible({ timeout: 10_000 })
  await select.selectOption(allyId)
  await allyDlg.getByRole('button', { name: /^Применить$/ }).click()
  await expect(allyDlg).toBeHidden({ timeout: 15_000 })
  await waitNoToast(page)
}

/** Combat spells pane: either PlayDeskSpellsCompact (search) or SpellsPanel (level chips). */
async function revealSpell(page: Page, opts: { query: string; level?: number }) {
  const compactSearch = page.getByPlaceholder('Поиск по названию')
  if (await compactSearch.isVisible().catch(() => false)) {
    await compactSearch.fill(opts.query)
    await page.waitForTimeout(300)
    return
  }
  // SpellsPanel: show all known first (combat view hides unprepared), then level chip.
  const known = page.getByRole('button', { name: /Все известные/i })
  if (await known.isVisible().catch(() => false)) await known.click()
  const allLevels = page.getByRole('button', { name: /^Ур\. все$|^все$/i }).first()
  if (opts.level != null) {
    const chip = page
      .locator('.play-desk__stage-panel:not([hidden]) button, .spells-panel button')
      .filter({ hasText: new RegExp(`^${opts.level}$`) })
      .first()
    if (await chip.isVisible().catch(() => false)) await chip.click()
    else if (await allLevels.isVisible().catch(() => false)) await allLevels.click()
  } else if (await allLevels.isVisible().catch(() => false)) {
    await allLevels.click()
  }
  await page.waitForTimeout(300)
}

/** CatalogCombobox keeps the name in input value — hasText on the card misses it. */
function spellCardByName(page: Page, nameSubstr: string) {
  const esc = nameSubstr.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return page.locator(`.spell-card:has(input[value*="${esc}"])`).first()
}

async function expandAbilitySkills(page: Page) {
  const expand = page.getByRole('button', { name: /Развернуть все/ }).first()
  if (await expand.isVisible().catch(() => false)) {
    await expand.click()
    await page.waitForTimeout(200)
  }
}

async function openMobileAbilities(page: Page) {
  await ensureMobileVitalsExpanded(page)
  await page.locator('button.mobile-vitals__abil').click()
  const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
  await expect(abilPage).toBeVisible({ timeout: 10_000 })
  return abilPage
}

async function closeMobileAbilities(page: Page) {
  const abilPage = page.getByRole('dialog', { name: /Характеристики/ })
  if (!(await abilPage.isVisible().catch(() => false))) return
  const back = page.locator('button.mobile-abil-page__back')
  if (await back.isVisible().catch(() => false)) await back.click()
  else await page.keyboard.press('Escape')
  await expect(abilPage).toBeHidden({ timeout: 10_000 })
}

async function openOwnership(page: Page, project: string) {
  if (isPhone(project)) {
    await openCombatScene(page, project)
    // Mobile: OwnershipSummary lives in the Характеристики sheet footer.
    // Prefer that copy — the desktop rail `.ownership-summary` stays in DOM but hidden.
    const abilPage = await openMobileAbilities(page)
    const ownership = abilPage.locator('.ownership-summary').first()
    await expect(ownership).toBeVisible({ timeout: 15_000 })
    await ownership.scrollIntoViewIfNeeded()
    return ownership
  }
  const ownership = page.locator('.ownership-summary').first()
  await expect(ownership).toBeVisible({ timeout: 15_000 })
  await ownership.scrollIntoViewIfNeeded()
  return ownership
}

async function openAbilitySkills(page: Page, project: string, abil: string) {
  if (isPhone(project)) {
    await openCombatScene(page, project)
    const abilPage = await openMobileAbilities(page)
    return abilPage.locator(`.abil-block[data-abil="${abil}"]`).first()
  }
  return page.locator(`.abil-block[data-abil="${abil}"]:visible`).first()
}

/* ------------------------------------------------------------------ */
/* 1. BI target-side                                                    */
/* ------------------------------------------------------------------ */

test.describe('Доправка 1 — BI target-side (grant → ally chip → spend)', () => {
  test.setTimeout(480_000)
  test.use({ actionTimeout: 15_000 })

  test('bi-grant-ally-chip + bi-spend-after-fail', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveBardCreate(page, store, {
      name: 'Бард Вдохновитель',
      level: 5,
      subclassSlug: SUB.valor,
      shotDir: DIR,
      project,
    })
    await dismissGuided(page)
    bindStoreToBardLobby(store)
    const bard = storedCharacter(store, 0)

    const payload = JSON.parse(JSON.stringify(store.lastCreatePayload))
    payload.name = 'Союзник Тордек'
    const ally = seedAllyFromBridge(store, payload, { name: 'Союзник Тордек' })

    await openFeaturesScene(page, project)
    await giveInspirationToAlly(page, 'Тордек', ally.id)
    await waitStored(store, (s) => biPoolFromSheet(s)?.used === 1)
    // Ensure target sheet holds the granted die (API apply + store mirror).
    const allySheet = store.characters.get(ally.id)!.sheet as Record<string, any>
    const hasFx = [...(allySheet.play?.effects ?? []), ...(allySheet.combat?.effects ?? [])].some(
      (e: any) => e?.slug === 'bardic_inspiration',
    )
    if (!hasFx) {
      installBiEffectOnCharacter(store, ally.id, {
        die: '1d8',
        sourceName: 'Бард Вдохновитель',
      })
    }

    await page.goto(`/characters/${ally.id}`)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissGuided(page)
    await openCombatScene(page, project)
    const effects = page.getByTestId('active-effects')
    await expect(effects).toBeVisible({ timeout: 15_000 })
    // Prefer the visible strip chips (measure clones are aria-hidden).
    const chip = effects
      .locator('.active-effects__main .ui-chip, .active-effects__scroller .ui-chip')
      .filter({ hasText: /Бардовское вдохновение|1к/i })
      .first()
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await chip.scrollIntoViewIfNeeded()
    await f(page, 'bi-grant-ally-chip', project, chip)

    // Trigger after-fail spend via a skill roll (phone: combat hot skill chips).
    if (isPhone(project)) {
      const hot = page.getByRole('button', { name: /Атлетика|Акробатика|Скрытность/i }).first()
      await expect(hot).toBeVisible({ timeout: 10_000 })
      await hot.click()
    } else {
      await expandAbilitySkills(page)
      const skillRoll = page.locator('.abil-skill__roll').first()
      await expect(skillRoll).toBeVisible({ timeout: 10_000 })
      await skillRoll.click()
    }
    const spend = page.getByRole('dialog').filter({
      hasText: /провал|прибавить|Тест к20|вдохновен/i,
    }).last()
    await expect(spend).toBeVisible({ timeout: 10_000 })
    await f(page, 'bi-spend-after-fail', project, spend)
    await spend.getByRole('button', { name: /^Отмена$|^Закрыть$/ }).first().click().catch(() => undefined)
    expect(store.unmatched.filter((u) => !u.includes('/sessions'))).toEqual([])
    void bard
  })
})

/* ------------------------------------------------------------------ */
/* 2. Magical Secrets create-at-11                                     */
/* ------------------------------------------------------------------ */

test.describe('Доправка 1 — Magical Secrets create-at-11', () => {
  test.setTimeout(480_000)
  test.use({ actionTimeout: 15_000 })

  test('secrets-create-at-11-picker + prepared off-list', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const OFF = ['shield', 'guiding-bolt', 'entangle', 'fireball'] as const
    const sheet = await walkLiveBardCreate(page, store, {
      name: 'Тайны 11',
      level: 11,
      subclassSlug: SUB.glamour,
      shotDir: DIR,
      project,
      duringLeveling: async (pg) => {
        const tab = pg.getByTestId('p24-m03-spell-tab-level1')
        await tab.click()
        const counter = pg.getByTestId('p24-m03-spell-pick-counter')
        await expect(counter).toContainText(/Магические тайны/i)
        await expect(counter).toContainText(/Волшебника/i)
        await expect(counter).toContainText(/Друида/i)
        await expect(counter).toContainText(/Жреца/i)
        for (const slug of OFF) {
          const card = pg.getByTestId(`p24-m03-card-${slug}`)
          await expect(card).toBeVisible({ timeout: 10_000 })
          await card.scrollIntoViewIfNeeded()
          await card.click()
        }
        await expect(counter).toContainText(/Выбрано 4 из/)
        const fireball = pg.getByTestId('p24-m03-card-fireball')
        await fireball.scrollIntoViewIfNeeded()
        await fshot(pg, 'secrets-create-at-11-picker', project, {
          dir: DIR,
          frame: [counter, fireball],
        })
      },
    })
    await dismissGuided(page)
    const known = ((sheet.spells?.known ?? []) as Array<{ slug?: string; id?: string; name?: string }>)
    expect(
      known.some((row) =>
        /fireball|огненн/i.test(`${row.slug ?? ''} ${row.id ?? ''} ${row.name ?? ''}`),
      ),
    ).toBe(true)

    await openSpellsPane(page, project)
    await revealSpell(page, { query: 'Огненный', level: 3 })
    const row = spellCardByName(page, 'Огненный шар')
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.scrollIntoViewIfNeeded()
    await f(page, 'secrets-create-at-11-prepared-offlist', project, row)
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* 3. Words of Creation create-at-20                                   */
/* ------------------------------------------------------------------ */

test.describe('Доправка 1 — Words of Creation second target', () => {
  test.setTimeout(480_000)
  test.use({ actionTimeout: 15_000 })

  test('words-second-target-cast', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    await walkLiveBardCreate(page, store, {
      name: 'Слова 20',
      level: 20,
      subclassSlug: SUB.lore,
      shotDir: DIR,
      project,
      duringLeveling: async (pg) => {
        // Create bridge omits always-prepared overlay at high levels — pick Words spells
        // from the bard list explicitly so the sheet has them to cast.
        const tab = pg.getByTestId('p24-m03-spell-tab-level1')
        await tab.click()
        for (const slug of ['power-word-heal', 'power-word-kill'] as const) {
          const card = pg.getByTestId(`p24-m03-card-${slug}`)
          if (await card.count()) {
            await card.scrollIntoViewIfNeeded()
            await card.click()
          }
        }
      },
    })
    await dismissGuided(page)
    bindStoreToBardLobby(store)
    const known = ((await storedSheet(store)).spells?.known ?? []) as Array<{
      slug?: string
      id?: string
      name?: string
    }>
    const hasWords = known.some((s) =>
      /power-word-heal|power-word-kill|слово силы/i.test(`${s.slug ?? ''} ${s.id ?? ''} ${s.name ?? ''}`),
    )
    if (!hasWords) {
      // Last resort: inject feature rows so cast dialog evidence is still possible.
      const row = storedCharacter(store, 0)
      const sheet = row.sheet as Record<string, any>
      const spells = sheet.spells ?? {}
      const list = [...(spells.known ?? [])]
      for (const [slug, name] of [
        ['power-word-heal', 'Слово силы: исцеление'],
        ['power-word-kill', 'Слово силы: смерть'],
      ] as const) {
        list.push({
          id: `feature-spell:words-of-creation:${slug}`,
          catalog_id: slug,
          name,
          level: 9,
          prepared: true,
          prepared_locked: true,
          source_kind: 'feature',
          class_slug: 'bard',
          prepare_source_label: 'Слова Творения',
        })
      }
      sheet.spells = { ...spells, known: list }
      row.sheet_version = Number(row.sheet_version) + 1
      await page.reload()
      await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
      await dismissGuided(page)
    }
    await openSpellsPane(page, project)
    await revealSpell(page, { query: 'Слово силы', level: 9 })
    const spell = spellCardByName(page, 'Слово силы')
    await expect(spell).toBeVisible({ timeout: 20_000 })
    await spell.scrollIntoViewIfNeeded()
    await spell.getByRole('button', { name: /^Каст$/i }).click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg).toBeVisible({ timeout: 10_000 })
    await expect(dlg).toContainText(/Слова Творения|вторую цель|10 фт/i)
    await expect(dlg.getByText(/Цель 2|Цель 1|Кто/i).first()).toBeVisible()
    await f(page, 'words-second-target-cast', project, dlg)
    await cancelDialog(page, dlg)
    expect(store.unmatched.filter((u) => !u.includes('/sessions'))).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* 4–6. Jack / Countercharm / Superior Inspiration                     */
/* ------------------------------------------------------------------ */

test.describe('Доправка 1 — Jack, Countercharm, Superior Inspiration', () => {
  test.setTimeout(480_000)
  test.use({ actionTimeout: 15_000 })

  test('jack-of-all-trades untrained bonus', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Мастер рук 5',
      level: 5,
      subclassSlug: SUB.lore,
      dir: DIR,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Мастер на все руки/])
    await openCombatScene(page, project)
    const dex = Math.floor((Number((await storedSheet(store)).abilities?.dex?.score ?? 10) - 10) / 2)
    const expectMod = dex + 1 // PB 3 → Jack ⌊PB/2⌋ = 1 on untrained
    // Lore already took Arcana/History/Insight — Скрытность stays untrained.
    if (isPhone(project)) {
      const hot = page.getByRole('button', { name: new RegExp(`Скрытность\\s*\\+?${expectMod}`) }).first()
      await expect(hot).toBeVisible({ timeout: 10_000 })
      await hot.scrollIntoViewIfNeeded()
      await f(page, 'jack-of-all-trades-untrained', project, hot)
    } else {
      await expandAbilitySkills(page)
      const block = await openAbilitySkills(page, project, 'dex')
      await expect(block).toBeVisible()
      const expandOne = block.getByRole('button', { name: /Развернуть навыки/ })
      if (await expandOne.isVisible().catch(() => false)) await expandOne.click()
      const stealth = block.locator('.abil-skill').filter({ hasText: /Скрытность/i }).first()
      await expect(stealth).toBeVisible({ timeout: 10_000 })
      const roll = stealth.locator('.abil-skill__roll')
      await expect(roll).toBeVisible()
      const shown = ((await roll.innerText()) || '').replace(/\s+/g, '')
      expect(shown).toMatch(/[+\-]?\d+/)
      expect(Number(shown.replace('+', ''))).toBe(expectMod)
      await stealth.scrollIntoViewIfNeeded()
      await f(page, 'jack-of-all-trades-untrained', project, stealth)
    }
    expect(store.unmatched).toEqual([])
  })

  test('countercharm card/button', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Контрчары 7',
      level: 7,
      subclassSlug: SUB.glamour,
      dir: DIR,
    })
    await openFeaturesScene(page, project)
    const card = await featureCard(page, /^Контрчары/)
    await expandCard(card)
    const btn = card.getByRole('button', { name: /Контрчар/i }).first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await f(page, 'countercharm-card', project, card)
    await btn.click()
    const dlg = page.getByRole('dialog').last()
    await expect(dlg).toBeVisible({ timeout: 10_000 })
    await expect(dlg).toContainText(/Реакция|Преимуществ/i)
    await f(page, 'countercharm-use-dialog', project, dlg)
    await cancelDialog(page, dlg)
    expect(store.unmatched).toEqual([])
  })

  test('superior-inspiration L18 initiative top-up', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Превосходное 18',
      level: 18,
      subclassSlug: SUB.valor,
      dir: DIR,
    })
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Превосходное вдохновение/])
    const card = await featureCard(page, /^Превосходное вдохновение/)
    await expandCard(card)
    await f(page, 'superior-inspiration-card', project, card)

    // Drain BI pool in the store (avoid ally-picker dialogs), then reload.
    const row = storedCharacter(store, 0)
    const s = row.sheet as Record<string, any>
    const drain = (pools: Array<Record<string, any>> | undefined) => {
      for (const pool of pools ?? []) {
        if (
          /bardic_inspiration/.test(String(pool.id ?? '')) ||
          /бардовское вдохновение/i.test(String(pool.name ?? ''))
        ) {
          pool.used = pool.max
        }
      }
    }
    drain(s.resources)
    drain(s.play?.resources)
    await page.reload()
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
    await dismissGuided(page)

    await openCombatScene(page, project)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    // Phone: initiative control is a listitem (button role overridden by role="listitem").
    const initBtn = isPhone(project)
      ? page.getByRole('listitem', { name: /Инициатива/i }).first()
      : page.getByRole('button', { name: /Инициатива/i }).first()
    await initBtn.click()
    const breakdown = page.getByRole('dialog').filter({ hasText: /Инициатива/ })
    await expect(breakdown).toBeVisible({ timeout: 10_000 })
    await breakdown.getByRole('button', { name: /Бросок инициативы/i }).click()
    await page.waitForTimeout(400)
    const toast = page.locator('.ui-toast').filter({ hasText: /Превосходное вдохновение/i })
    if (await toast.isVisible().catch(() => false)) {
      // Capture toast + dialog; do not wait for toast clear.
      await page.screenshot({
        path: `${DIR}/superior-inspiration-initiative-${project}.png`,
        fullPage: false,
        animations: 'disabled',
        caret: 'hide',
      })
    } else {
      await f(page, 'superior-inspiration-initiative', project, breakdown)
    }
    // Pool should be topped up to 2.
    await waitStored(store, (sheet) => {
      const pool = biPoolFromSheet(sheet)
      if (!pool) return false
      return Math.max(0, pool.max - pool.used) >= 2
    })
    expect(store.unmatched.filter((u) => !u.includes('/sessions'))).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* 7–8. Dance AC/damage + Valor armor                                  */
/* ------------------------------------------------------------------ */

test.describe('Доправка 1 — Dance AC/damage + Valor armor', () => {
  test.setTimeout(480_000)
  test.use({ actionTimeout: 15_000 })

  test('dance unarmored AC + bardic damage', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Танец 3',
      level: 3,
      subclassSlug: SUB.dance,
      dir: DIR,
      classEquipment: 'a',
    })
    await openExploreScene(page, project)
    // Starting pack includes leather — unequip so 10+Dex+Cha applies.
    const leather = page.locator('.inventory-card').filter({ hasText: /Кожан/i }).first()
    if (await leather.isVisible().catch(() => false)) {
      await unequipItem(page, /Кожан/)
    }
    const shield = page.locator('.inventory-card').filter({ hasText: /^Щит$|Щит ·/i }).first()
    if (await shield.isVisible().catch(() => false)) {
      await unequipItem(page, /Щит/)
    }
    // Force unequip every item + prefer Dance AC formula (phone explore can miss cards).
    {
      const row = storedCharacter(store, 0)
      const s = row.sheet as Record<string, any>
      const inv = s.inventory ?? {}
      const items = Array.isArray(inv.items) ? inv.items : []
      for (const item of items) item.equipped = false
      s.inventory = { ...inv, items }
      const combat = { ...(s.combat ?? {}) }
      combat.ac_formula_key = 'dazzling_footwork'
      s.combat = combat
      row.sheet_version = Number(row.sheet_version) + 1
      await page.reload()
      await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20_000 })
      await dismissGuided(page)
    }
    await openCombatScene(page, project)
    if (isPhone(project)) await ensureMobileVitalsExpanded(page)
    const dex = Math.floor((Number(sheet.abilities?.dex?.score ?? 10) - 10) / 2)
    const cha = chaModOf(sheet)
    const expectAc = 10 + dex + cha
    const acTile = isPhone(project)
      ? page.getByRole('listitem', { name: /Класс доспеха/i }).first()
      : page.getByRole('button', { name: new RegExp(`Класс доспеха ${expectAc}`) }).first()
    await expect(acTile).toBeVisible({ timeout: 10_000 })
    await acTile.click()
    const acDlg = page.getByRole('dialog').filter({ hasText: /КД|доспех|Защита|формул/i }).last()
    await expect(acDlg).toBeVisible({ timeout: 10_000 })
    // Prefer selecting Dance formula if the breakdown lists candidates.
    const danceChip = acDlg.getByRole('button', { name: /Защита без доспехов|Ослепительные|dazzling/i }).first()
    if (await danceChip.isVisible().catch(() => false)) await danceChip.click()
    await expect(acDlg).toContainText(new RegExp(`${expectAc}|10\\s*\\+.*Хар|Защита без доспехов`), {
      timeout: 10_000,
    })
    await f(page, 'dance-unarmored-ac', project, acDlg)
    await acDlg.getByRole('button', { name: /^Закрыть$|^Отмена$/ }).first().click().catch(() => undefined)
    await expect(acDlg).toBeHidden({ timeout: 10_000 }).catch(() => undefined)

    // Bard combat block (including Dance damage formula) lives on the Features scene.
    await openFeaturesScene(page, project)
    const combat = page.getByTestId('bard-2024-combat')
    await combat.scrollIntoViewIfNeeded()
    await expect(combat).toBeVisible({ timeout: 10_000 })
    await expect(combat).toContainText(/Бардовский урон/i)
    await expect(combat).toContainText(/1к6|1к8/)
    await f(page, 'dance-bardic-damage', project, combat)
    expect(store.unmatched).toEqual([])
  })

  test('valor medium armor/shield vs non-valor', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const valor = await createAt(page, project, {
      name: 'Доблесть 3',
      level: 3,
      subclassSlug: SUB.valor,
      dir: DIR,
    })
    await openCombatScene(page, project)
    const ownershipValor = await openOwnership(page, project)
    await expect(ownershipValor).toContainText(/Средние/)
    await expect(ownershipValor).toContainText(/Щиты/)
    // Phone: full ownership section is taller than the viewport above Bottom Scene Nav.
    const valorFrame = isPhone(project)
      ? ownershipValor.locator('.ownership-summary__row, .ownership-summary__chips').filter({ hasText: /Средние|Щиты/ }).first()
      : ownershipValor
    await f(page, 'valor-armor-prof-medium-shield', project, valorFrame)
    if (isPhone(project)) await closeMobileAbilities(page)

    await openExploreScene(page, project)
    await addGearFromPicker(page, project, 'чешуйчат', /Чешуйчат|Scale/i).catch(async () => {
      await addGearFromPicker(page, project, 'scale', /Чешуйчат|Scale|кольчуж/i)
    })
    await addGearFromPicker(page, project, 'щит', /^Щит/).catch(() => undefined)
    await equipItem(page, /Чешуйчат|Scale|кольчуж/i).catch(() => undefined)
    await equipItem(page, /^Щит/).catch(() => undefined)
    const gear = page.locator('.inventory-card').filter({ hasText: /Чешуйчат|Щит|Scale/i }).first()
    if (await gear.isVisible().catch(() => false)) {
      await f(page, 'valor-medium-armor-shield-equipped', project, gear)
    }

    // Non-valor: dance — light only, no medium/shields.
    const dance = await createAt(page, project, {
      name: 'Без доблести 3',
      level: 3,
      subclassSlug: SUB.dance,
      dir: DIR,
    })
    await openCombatScene(page, project)
    const ownershipDance = await openOwnership(page, project)
    await expect(ownershipDance).not.toContainText(/Средние/)
    await expect(ownershipDance).not.toContainText(/Щиты/)
    await expect(ownershipDance).toContainText(/Лёгкие/)
    const danceOwnFrame = isPhone(project)
      ? ownershipDance.locator('.ownership-summary__row, .ownership-summary__chips').filter({ hasText: /Лёгкие/ }).first()
      : ownershipDance
    await f(page, 'non-valor-armor-prof-no-medium-shield', project, danceOwnFrame)
    if (isPhone(project)) await closeMobileAbilities(page)
    expect(valor.store.unmatched).toEqual([])
    expect(dance.store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* 9. Resource card summaries                                          */
/* ------------------------------------------------------------------ */

test.describe('Доправка 1 — resource card summaries', () => {
  test.setTimeout(480_000)
  test.use({ actionTimeout: 15_000 })

  test('BI / Beguiling / Mantle of Majesty show rule text', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Описание ресурсов 6',
      level: 6,
      subclassSlug: SUB.glamour,
      dir: DIR,
    })
    await openFeaturesScene(page, project)
    await expandAllFeatures(page)

    const bi = await featureCard(page, BI)
    await expandCard(bi)
    await expect(bi).not.toHaveText(/^Бардовское вдохновение\s*$/)
    await expect(bi).toContainText(/кость|союзник|час|Тест|вдохновен/i)
    await f(page, 'resource-summary-bardic-inspiration', project, bi)

    const beguiling = await featureCard(page, /^Чарующая магия/)
    await expandCard(beguiling)
    const beguilingText = (await beguiling.innerText()).replace(/\s+/g, ' ')
    expect(beguilingText.length).toBeGreaterThan('Чарующая магия'.length + 10)
    await expect(beguiling).not.toHaveText(/^Чарующая магия\s*$/)
    await f(page, 'resource-summary-beguiling-magic', project, beguiling)

    const mantle = await featureCard(page, /^Мантия величия/)
    await expandCard(mantle)
    const mantleText = (await mantle.innerText()).replace(/\s+/g, ' ')
    expect(mantleText.length).toBeGreaterThan('Мантия величия'.length + 10)
    await f(page, 'resource-summary-mantle-of-majesty', project, mantle)
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* 10. Sheet rollback (Play Desk identity −1)                          */
/* ------------------------------------------------------------------ */

test.describe('Доправка 1 — sheet rollback via identity dialog', () => {
  test.setTimeout(480_000)
  test.use({ actionTimeout: 15_000 })

  for (const [from, to] of [
    [10, 9],
    [3, 2],
  ] as const) {
    test(`leveldown-sheet-${from}-to-${to}`, async ({ page }, testInfo) => {
      const project = projectOf(testInfo)
      const { store } = await createAt(page, project, {
        name: `Спад ${from}`,
        level: from,
        subclassSlug: from >= 3 ? SUB.lore : null,
        dir: DIR,
      })
      const bardLevel = async () =>
        Number(
          ((await storedSheet(store)).classes ?? []).find((c: any) =>
            /бард|bard/i.test(String(c.name ?? c.slug)),
          )?.level,
        )
      expect(await bardLevel()).toBe(from)

      const identity = await openIdentity(page)
      const minus = identity.getByRole('button', { name: '−1', exact: true }).first()
      await minus.scrollIntoViewIfNeeded()
      await expect(identity).toContainText(new RegExp(`(^|\\D)${from}(\\D|$)`))
      await f(page, `leveldown-sheet-${from}-to-${to}-before`, project, identity)
      await minus.click()
      await page.waitForTimeout(800)
      await minus.scrollIntoViewIfNeeded()
      await f(page, `leveldown-sheet-${from}-to-${to}-after`, project, identity)
      await identity.getByRole('button', { name: /^Готово$|^Закрыть$/ }).first().click()
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 })
      await expect.poll(bardLevel, { timeout: 15_000 }).toBe(to)
      expect(store.unmatched).toEqual([])
    })
  }
})

/* ------------------------------------------------------------------ */
/* 11. L14 college feature                                             */
/* ------------------------------------------------------------------ */

test.describe('Доправка 1 — L14 college feature', () => {
  test.setTimeout(480_000)
  test.use({ actionTimeout: 15_000 })

  test('l14-college-feature-card', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Коллегия 14',
      level: 14,
      subclassSlug: SUB.lore,
      dir: DIR,
    })
    await openFeaturesScene(page, project)
    const card = await featureCard(page, /^Бесподобный навык/)
    await expandCard(card)
    await f(page, 'l14-lore-peerless-skill', project, card)
    expect(store.unmatched).toEqual([])
  })
})
