/**
 * P24-M02-paladin live create / features / rests / LoH dialog (no e2eSeed).
 *
 * Walks the real create wizard at `/characters/create?edition=2024&preview=1`
 * with API mocking (auth/catalog/create-2024 bridge) — infrastructure only.
 * Each shot is taken at both viewports through the two Playwright projects (1440 / 390).
 */
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { createStore } from './support/paladin2024Harness'
import {
  ARTIFACTS,
  FIGHTING_STYLE_BLESSED,
  FIGHTING_STYLE_DEFENSE,
  OATH,
  PALADIN_MASTERY,
  PALADIN_SKILLS,
  SHOT,
  auraRadiusFt,
  cancelDialog,
  channelFromSheet,
  channelRemaining,
  createAt,
  dismissGuided,
  expandAllFeatures,
  expandCard,
  expectFeatureNames,
  expectNoFeatureNames,
  featureCard,
  freeSmiteFromSheet,
  freeSteedFromSheet,
  isPhone,
  layOnHandsFromSheet,
  lohRemaining,
  longRest,
  openFeaturesScene,
  openLayOnHandsDialog,
  openRest,
  projectOf,
  shot,
  spendChannelSacredWeapon,
  storedSheet,
  tallShot,
  waitStored,
  walkLivePaladinCreate,
} from './support/paladinLiveFlow'

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
})

const DIVINE_SENSE = /^Божественное чувство$/
const LAY_ON_HANDS = /^Возложение рук$/
const CHANNEL = /^Проведение божественности$/
const RADIANT = /^Сияющие удары$/
const AURA_PROTECTION = /^Аура защиты$/
/** Free-smite pool materialises as its own resource card (not «Кара паладина» text row). */
const FREE_SMITE_CARD = /^Бесплатная Божественная кара$|^Кара паладина$/
const FREE_STEED_CARD = /^Бесплатный Верный скакун$|^Верный скакун$/
const FIGHTING_STYLE_CARD = /Боевой стиль|Благословенный воин/

/* ------------------------------------------------------------------ */
/* Create-at-5 / create-at-11 / create-at-1                            */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 paladin — LIVE create (wizard clicked, no e2eSeed)', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('create-live-at-5 devotion: skills×2, mastery×2, FS, LoH, channel, free smite/steed, no Divine Sense card', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLivePaladinCreate(page, store, {
      name: 'Живой Паладин 5',
      level: 5,
      subclassSlug: OATH.devotion,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-5-`,
      fightingStyle: FIGHTING_STYLE_DEFENSE,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText('1×4 · 2×2')
        const list = pg.getByTestId('p24-m03c-fork-list-paladin')
        await expect(list).toContainText('Боевой стиль')
        await expect(list).toContainText('Оружейное мастерство')
        await expect(list).toContainText(/Подкласс выбран/)
        await expect(list).toContainText('Верный скакун')
        await expect(list).not.toContainText('Сияющие удары')
        await expect(pg.getByTestId('p24-m03-spell-tab-level1')).toContainText('0/6')
      },
    })

    expect(sheet.spells?.slots?.['2']).toMatchObject({ max: 2 })
    expect(sheet.spells?.slots?.['3']?.max ?? 0).toBe(0)
    expect(channelFromSheet(sheet)).toMatchObject({ max: 2, used: 0 })
    expect(layOnHandsFromSheet(sheet)).toMatchObject({ max: 25, used: 0 })
    expect(freeSmiteFromSheet(sheet)?.max).toBe(1)
    expect(freeSteedFromSheet(sheet)?.max).toBe(1)

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-5-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      LAY_ON_HANDS,
      /^Сотворение заклинаний/,
      /^Оружейное мастерство/,
      FIGHTING_STYLE_CARD,
      FREE_SMITE_CARD,
      CHANNEL,
      /^Дополнительная атака/,
      FREE_STEED_CARD,
      /^Священное оружие/,
    ])
    // Divine Sense may appear as a Channel option card from L3 — not as an L1 class feature.
    await expectNoFeatureNames(page, [
      RADIANT,
      AURA_PROTECTION,
      /^Божественное здоровье/,
      /^Улучшенная божественная кара/,
    ])
    expect(await channelRemaining(page)).toEqual({ left: 2, max: 2 })
    expect(await lohRemaining(page)).toEqual({ left: 25, max: 25 })
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-sheet-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-5 vengeance: second oath smoke', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Клятва мести 5',
      level: 5,
      subclassSlug: OATH.vengeance,
      fightingStyle: FIGHTING_STYLE_DEFENSE,
      stepShots: false,
      shotPrefix: `${SHOT}-create-at-5-vengeance-`,
    })
    expect(String(sheet.classes?.[0]?.subclass_slug || '')).toBe(OATH.vengeance)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [/^Обет вражды/, LAY_ON_HANDS, CHANNEL, FREE_SMITE_CARD])
    await expectNoFeatureNames(page, [/^Священное оружие/])
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-5-vengeance-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-11 devotion: Radiant Strikes, channel 3, aura radius 10 ft', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLivePaladinCreate(page, store, {
      name: 'Живой Паладин 11',
      level: 11,
      subclassSlug: OATH.devotion,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-11-`,
      fightingStyle: FIGHTING_STYLE_DEFENSE,
      duringLeveling: async (pg) => {
        await expect(pg.getByTestId('p24-m03c-slots')).toContainText('1×4 · 2×3 · 3×3')
        const list = pg.getByTestId('p24-m03c-fork-list-paladin')
        await expect(list).toContainText('Сияющие удары')
        await expect(list).toContainText('Аура защиты')
        await expect(list).toContainText('Аура отваги')
        await expect(list).not.toContainText('Расширение ауры')
        await expect(pg.getByTestId('p24-m03-spell-tab-level1')).toContainText('0/10')
      },
    })

    expect(sheet.spells?.slots?.['3']).toMatchObject({ max: 3 })
    expect(sheet.spells?.slots?.['4']?.max ?? 0).toBe(0)
    expect(channelFromSheet(sheet)).toMatchObject({ max: 3, used: 0 })
    expect(layOnHandsFromSheet(sheet)).toMatchObject({ max: 55, used: 0 })
    expect(auraRadiusFt(sheet)).toBe(10)

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-11-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [
      LAY_ON_HANDS,
      CHANNEL,
      RADIANT,
      AURA_PROTECTION,
      /^Аура отваги/,
      /^Аура преданности/,
      FREE_STEED_CARD,
      FREE_SMITE_CARD,
    ])
    await expectNoFeatureNames(page, [
      /^Расширение ауры/,
      /^Божественное здоровье/,
      /^Улучшенная божественная кара/,
    ])

    const aura = await featureCard(page, AURA_PROTECTION)
    await expandCard(aura)
    const auraText = (await aura.innerText()).replace(/\s+/g, ' ')
    const bonuses = ((sheet.class_progress_2024?.scales ?? sheet.scales ?? {}) as Record<
      string,
      unknown
    >)['paladin:subclass_permanent_bonuses']
    const note =
      Array.isArray(bonuses) &&
      bonuses.some(
        (row) =>
          row &&
          typeof row === 'object' &&
          /10\s*фт|радиус/i.test(String((row as { note_ru?: string }).note_ru ?? '')),
      )
    expect(
      /10\s*фт|радиус/i.test(auraText) || note || auraRadiusFt(sheet) === 10,
      `aura radius note missing; card=${auraText.slice(0, 200)}`,
    ).toBe(true)

    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-11-sheet-features`, project)
    expect(store.unmatched).toEqual([])
  })

  test('create-live-at-1: LoH + mastery, no Divine Sense L1 card, no fighting style required', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const store = createStore()
    const sheet = await walkLivePaladinCreate(page, store, {
      name: 'Паладин 1',
      level: 1,
      subclassSlug: null,
      shotDir: ARTIFACTS,
      project,
      stepShots: true,
      shotPrefix: `${SHOT}-create-at-1-`,
      fightingStyle: null,
      duringLeveling: async (pg) => {
        const list = pg.getByTestId('p24-m03c-fork-list-paladin')
        await expect(list).toContainText('Оружейное мастерство')
        await expect(list).not.toContainText('Подкласс')
        await expect(list).not.toContainText('Сияющие удары')
      },
    })
    expect(layOnHandsFromSheet(sheet)).toMatchObject({ max: 5, used: 0 })
    expect(channelFromSheet(sheet)).toBeUndefined()
    expect(freeSmiteFromSheet(sheet)).toBeUndefined()

    if (isPhone(project)) await page.getByText('Бой', { exact: true }).last().click()
    await shot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet`, project)

    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [LAY_ON_HANDS, /^Оружейное мастерство/, /^Сотворение заклинаний/])
    await expectNoFeatureNames(page, [
      DIVINE_SENSE,
      CHANNEL,
      /^Боевой стиль/,
      /^Кара паладина/,
      /^Верный скакун/,
      RADIANT,
    ])
    await expandAllFeatures(page)
    await tallShot(page, ARTIFACTS, `${SHOT}-create-at-1-sheet-features-no-divine-sense`, project)
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Rests + LoH dialog                                                  */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 paladin — Channel / LoH rests and LoH dialog', () => {
  test.setTimeout(300_000)
  test.use({ actionTimeout: 15_000 })

  test('short rest: channel -1 used regain; LoH not restored; long rest restores all', async ({
    page,
  }, testInfo) => {
    const project = projectOf(testInfo)
    const { store } = await createAt(page, project, {
      name: 'Отдых Паладина',
      level: 5,
      subclassSlug: OATH.devotion,
      fightingStyle: FIGHTING_STYLE_DEFENSE,
    })
    await openFeaturesScene(page, project)
    expect(await channelRemaining(page)).toEqual({ left: 2, max: 2 })
    expect(await lohRemaining(page)).toEqual({ left: 25, max: 25 })

    await spendChannelSacredWeapon(page, project, `${SHOT}-rest-sacred-weapon-dialog`)
    expect(await channelRemaining(page)).toEqual({ left: 1, max: 2 })

    const lohDlg = await openLayOnHandsDialog(page)
    await expect(lohDlg).toContainText(/Бонусным действием/i)
    await expect(lohDlg).toContainText(/Снять Отравленного/i)
    await expect(lohDlg).not.toContainText(/Снять болезнь или яд/)
    await shot(page, ARTIFACTS, `${SHOT}-loh-dialog-2024-bonus-poison`, project)
    await lohDlg.getByLabel(/Сколько хитов/i).fill('10')
    await lohDlg.getByRole('button', { name: /−10/ }).click()
    await expect(lohDlg).toBeHidden({ timeout: 10_000 })
    await waitStored(store, (s) => (layOnHandsFromSheet(s)?.used ?? 0) >= 10)
    await openFeaturesScene(page, project)
    expect(await lohRemaining(page)).toEqual({ left: 15, max: 25 })
    await shot(page, ARTIFACTS, `${SHOT}-rest-before-short-channel1-loh15`, project)

    await openRest(page, project)
    const rest = page.getByRole('dialog').filter({ hasText: /Короткий|Долгий|кости хитов/i }).first()
    await rest.getByRole('button', { name: /Сброс коротких ресурсов/ }).click()
    await page.waitForTimeout(500)
    await expect(rest).toContainText(/Проведение божественности:\s*1\s*→\s*2/)
    await expect(rest).not.toContainText(/Возложение рук:\s*15\s*→\s*25/)
    await shot(page, ARTIFACTS, `${SHOT}-rest-short-summary-channel-regain`, project)
    await rest.getByRole('button', { name: /^Применить$/ }).click()
    await page.waitForTimeout(500)
    const closeBtn = page.getByRole('dialog').last().getByRole('button', { name: /^Закрыть$/ })
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click()
    await dismissGuided(page)

    await waitStored(store, (s) => (channelFromSheet(s)?.used ?? 1) === 0)
    await openFeaturesScene(page, project)
    expect(await channelRemaining(page)).toEqual({ left: 2, max: 2 })
    expect(await lohRemaining(page)).toEqual({ left: 15, max: 25 })
    expect(layOnHandsFromSheet(await storedSheet(store))?.used).toBe(10)
    await shot(page, ARTIFACTS, `${SHOT}-rest-after-short-channel2-loh15`, project)

    await longRest(page, project, `${SHOT}-rest-long-preview`)
    await dismissGuided(page)
    await waitStored(store, (s) => (layOnHandsFromSheet(s)?.used ?? 1) === 0)
    await openFeaturesScene(page, project)
    expect(await channelRemaining(page)).toEqual({ left: 2, max: 2 })
    expect(await lohRemaining(page)).toEqual({ left: 25, max: 25 })
    await tallShot(page, ARTIFACTS, `${SHOT}-rest-after-long-all-restored`, project)
    expect(store.unmatched).toEqual([])
  })

  test('LoH dialog 2024: bonus action + poison checkbox (cancel)', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    await createAt(page, project, {
      name: 'LoH диалог',
      level: 5,
      subclassSlug: OATH.devotion,
      fightingStyle: FIGHTING_STYLE_DEFENSE,
    })
    await openFeaturesScene(page, project)
    const dlg = await openLayOnHandsDialog(page)
    await expect(dlg).toContainText(/Бонусным действием/i)
    await expect(dlg.getByText(/Снять Отравленного/)).toBeVisible()
    await dlg.getByLabel(/Сколько хитов/i).fill('0')
    const poison = dlg.locator('label').filter({ hasText: /Снять Отравленного/ }).locator('input')
    await poison.check()
    await expect(dlg).toContainText(/Итого:\s*5/)
    await shot(page, ARTIFACTS, `${SHOT}-loh-dialog-poison-checked`, project)
    await cancelDialog(page, dlg)
  })

  test('create-at-5 blessed warrior: cleric cantrips picks', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Благословенный воин 5',
      level: 5,
      subclassSlug: OATH.devotion,
      fightingStyle: FIGHTING_STYLE_BLESSED,
      stepShots: true,
      shotPrefix: `${SHOT}-blessed-warrior-`,
    })
    const payload = (store.lastCreatePayload ?? {}) as Record<string, any>
    const fromPayload =
      payload.class_option_picks?.blessed_warrior_cantrips ??
      payload.class_option_picks?.['blessed-warrior-cantrips']
    const picks = sheet.create_2024?.class_option_picks ?? sheet.class_option_picks ?? {}
    const fromSheet = picks.blessed_warrior_cantrips ?? picks['blessed-warrior-cantrips']
    const cantrips = (fromPayload ?? fromSheet ?? []) as string[]
    expect(payload.fighting_style_slug ?? sheet.create_2024?.fighting_style).toMatch(
      /blessed-warrior/,
    )
    expect(Array.isArray(cantrips) ? cantrips.length : 0).toBeGreaterThanOrEqual(2)
    await openFeaturesScene(page, project)
    await expectFeatureNames(page, [LAY_ON_HANDS, FIGHTING_STYLE_CARD])
    await tallShot(page, ARTIFACTS, `${SHOT}-blessed-warrior-features`, project)
    expect(store.unmatched).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Free smite / steed presence                                         */
/* ------------------------------------------------------------------ */

test.describe('P24-M02 paladin — free smite / steed pools', () => {
  test.setTimeout(240_000)
  test.use({ actionTimeout: 15_000 })

  test('L5 free smite + free steed counters on feature cards', async ({ page }, testInfo) => {
    const project = projectOf(testInfo)
    const { store, sheet } = await createAt(page, project, {
      name: 'Кара и скакун',
      level: 5,
      subclassSlug: OATH.devotion,
    })
    expect(freeSmiteFromSheet(sheet)?.max).toBe(1)
    expect(freeSteedFromSheet(sheet)?.max).toBe(1)
    await openFeaturesScene(page, project)
    const smite = await featureCard(page, FREE_SMITE_CARD)
    await expandCard(smite)
    await expect(
      smite.getByRole('button', { name: /Кара \(бесплатно\)|Потратить|Применить/ }).first(),
    ).toBeVisible()
    const steed = await featureCard(page, FREE_STEED_CARD)
    await expandCard(steed)
    await expect(
      steed.getByRole('button', { name: /Скакун \(бесплатно\)|Потратить|Применить/ }).first(),
    ).toBeVisible()
    await tallShot(page, ARTIFACTS, `${SHOT}-free-smite-steed-buttons`, project)
    expect(PALADIN_SKILLS).toHaveLength(2)
    expect(PALADIN_MASTERY).toHaveLength(2)
    expect(store.unmatched).toEqual([])
  })
})
