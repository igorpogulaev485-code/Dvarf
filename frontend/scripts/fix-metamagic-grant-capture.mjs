/**
 * FIX metamagic-on-grant evidence (v2): clean live sorcerer 7 — one Shadow Touched
 * via feat_grants ledger only (no duplicate manual feat spell rows).
 *
 * Chain per viewport (resources reset between):
 *   SP 7/7 → grant + Empowered → SP 6/7, grant 0/1, slots untouched
 *   → slot + Quickened → SP 4/7, L1 slot spent, bonus action
 * Plus item (staff) cast with metamagic block.
 *
 * Requires API :8000 + vite :5173. Shots → /opt/cursor/artifacts/
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.FIX_BASE || 'http://127.0.0.1:5173'
const API = process.env.FIX_API || 'http://127.0.0.1:8000'
const EMAIL = `meta-grant-v2-${Date.now()}@example.com`
const PASS = 'meta-grant-dev'
const CLASS_ID = 'live-sorc-7-entry'
const STAFF_RES = 'item:staff-of-swarming:charges'

mkdirSync(ART, { recursive: true })
const out = (name) => `${ART}/${name}`

function md5(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

function spell(partial) {
  return {
    catalog_id: null,
    prepared: true,
    notes: '',
    casting_time: '1 действие',
    range: '60 футов',
    duration: 'Мгновенная',
    attack_or_save: '',
    damage: '',
    concentration: false,
    ritual: false,
    school: '',
    components: { v: true, s: true, m: null },
    ...partial,
  }
}

/** Class spells only — feat spells come from feat_grants ledger sync. */
function sorcerer7Sheet() {
  const known = [
    spell({
      id: 'sorc:mage-hand',
      name: 'Волшебная рука',
      level: 0,
      class_slug: 'sorcerer',
      school: 'воплощение',
    }),
    spell({
      id: 'sorc:chill',
      name: 'Леденящее прикосновение',
      level: 0,
      class_slug: 'sorcerer',
      damage: '2к8 некротическая энергия',
      attack_or_save: 'атака',
      school: 'некромантия',
    }),
    spell({
      id: 'sorc:fire-bolt',
      name: 'Огненный снаряд',
      level: 0,
      class_slug: 'sorcerer',
      damage: '2к10 огонь',
      attack_or_save: 'атака',
      school: 'воплощение',
    }),
    spell({
      id: 'sorc:mm',
      name: 'Волшебная стрела',
      level: 1,
      class_slug: 'sorcerer',
      damage: '3к4+3 силовое',
      school: 'воплощение',
    }),
    spell({
      id: 'sorc:shield',
      name: 'Щит',
      level: 1,
      class_slug: 'sorcerer',
      casting_time: '1 реакция',
      school: 'ограждение',
    }),
    spell({
      id: 'sorc:scorch',
      name: 'Палящий луч',
      level: 2,
      class_slug: 'sorcerer',
      damage: '2к6 огонь',
      attack_or_save: 'атака',
      school: 'воплощение',
    }),
    spell({
      id: 'sorc:fireball',
      name: 'Огненный шар',
      level: 3,
      class_slug: 'sorcerer',
      damage: '8к6 огонь',
      attack_or_save: 'спас Ловкости',
      range: '150 футов',
      school: 'воплощение',
    }),
    // Single Shadow Touched spell row — id matches feat_grants ledger
    // (`feat-spell:${grantId}:${spellId}`) so ensureFeatSpellsFromLedger
    // does not create a second copy (unlike a parallel manual feat-spell:* id).
    spell({
      id: 'feat-spell:grant-shadow-touched-live:ray_of_sickness',
      name: 'Луч болезни',
      level: 1,
      source_kind: 'feat',
      feat_grant: 'innate',
      prepare_source_label: 'Отмеченный тенями',
      prepared_locked: true,
      casting_time: '1 действие',
      range: '60 футов',
      duration: 'Мгновенная',
      attack_or_save: 'атака',
      damage: '2d8 яд',
      school: 'некромантия',
      components: { v: true, s: true, m: null },
      notes: '1/длинный отдых без ячейки · врождённое (черта)',
      grant_cast: {
        label: 'Отмеченный тенями',
        max: 1,
        used: 0,
        reset: 'long',
      },
    }),
    spell({
      id: 'feat-spell:grant-shadow-touched-live:invisibility',
      name: 'Невидимость',
      level: 2,
      source_kind: 'feat',
      feat_grant: 'innate',
      prepare_source_label: 'Отмеченный тенями',
      prepared_locked: true,
      concentration: true,
      duration: '1 час',
      school: 'иллюзия',
      notes: '1/длинный отдых без ячейки · врождённое (черта)',
      grant_cast: {
        label: 'Отмеченный тенями',
        max: 1,
        used: 0,
        reset: 'long',
      },
    }),
    // Staff-borne spell (item_cast) — one charge from the staff pool.
    spell({
      id: 'gear:staff-of-swarming:magic_missile',
      name: 'Волшебная стрела',
      level: 1,
      source_kind: 'feature',
      prepared_locked: true,
      prepare_source_label: 'Посох роя',
      damage: '3к4+3 силовое',
      school: 'воплощение',
      notes: '1 ур. · 1 зарядов',
      item_cast: {
        slug: 'magic_missile',
        resourceId: STAFF_RES,
        charges: 1,
        castLevel: 1,
        itemName: 'Посох роя',
      },
    }),
  ]
  return {
    identity: {
      alignment: 'Хаотично-нейтральный',
      experience: 23000,
      background: 'Отшельник',
    },
    race: { name: 'Человек', slug: 'human' },
    classes: [
      {
        id: CLASS_ID,
        name: 'Чародей',
        catalog_id: 'sorcerer',
        level: 7,
        subclass_name: 'Наследие драконьей крови',
        subclass_catalog_id: 'draconic_bloodline',
      },
    ],
    abilities: {
      str: { score: 10 },
      dex: { score: 14 },
      con: { score: 16 },
      int: { score: 10 },
      wis: { score: 12 },
      cha: { score: 18 },
    },
    saves: { con: { is_proficient: true }, cha: { is_proficient: true } },
    skills: {
      arcana: { is_proficient: true },
      persuasion: { is_proficient: true },
      deception: { is_proficient: true },
      insight: { is_proficient: true },
    },
    combat: {
      inspiration: false,
      speed: 30,
      darkvision: 0,
      conditions: [],
      exhaustion: 0,
      hp_temp: 0,
      concentration: null,
      effects: [],
      hit_die: 'd6',
      turn_economy: {
        action: false,
        bonus: false,
        reaction: false,
        moved: false,
        dashed: false,
        disengaged: false,
        dodged: false,
        cast_leveled: false,
        cast_cantrip: false,
        notes: '',
      },
      ac: 16,
      hp_current: 52,
      hp_max: 52,
    },
    resources: [
      {
        id: `feat:sorcery_points:${CLASS_ID}`,
        name: 'Очки чародейства',
        max: 7,
        used: 0,
        reset: 'long',
        track: 'pool',
      },
      {
        id: STAFF_RES,
        name: 'Посох роя',
        max: 7,
        used: 0,
        reset: 'long',
        track: 'pool',
      },
    ],
    weapons: [],
    spells: {
      casting_ability: 'cha',
      max_prepared: null,
      slots: {
        '1': { max: 4, used: 0 },
        '2': { max: 3, used: 0 },
        '3': { max: 3, used: 0 },
        '4': { max: 1, used: 0 },
        '5': { max: 0, used: 0 },
        '6': { max: 0, used: 0 },
        '7': { max: 0, used: 0 },
        '8': { max: 0, used: 0 },
        '9': { max: 0, used: 0 },
      },
      pact_slots: null,
      known,
      has_spell_focus: true,
      has_component_pouch: true,
    },
    inventory: {
      coins: { cp: 0, sp: 0, ep: 0, gp: 40, pp: 0 },
      items: [
        {
          id: 'live-sorc-pouch',
          name: 'Мешочек с компонентами',
          qty: 1,
          spell_tooling: 'component_pouch',
        },
        {
          id: 'live-staff-swarming',
          name: 'Посох роя',
          qty: 1,
          equipped: true,
          notes: '7 зарядов · Волшебная стрела',
        },
      ],
    },
    feature_picks: {
      values: {
        [`${CLASS_ID}:dragon_ancestor`]: 'red',
        [`${CLASS_ID}:metamagic`]: 'empowered,quickened,twinned,careful',
      },
    },
    // Single Shadow Touched grant — sheet sync adds one spell row per spell.
    feat_grants: [
      {
        id: 'grant-shadow-touched-live',
        featCatalogId: '62f6bd36-d808-512d-aca7-ed120e01898c',
        slug: 'shadow_touched',
        nameRu: 'Отмеченный тенями',
        source: { kind: 'manual' },
        applied: {
          abilityBonuses: { cha: 1 },
          armorProficiencies: [],
          weaponNames: [],
          skills: [],
          tools: [],
          languages: [],
          savingThrows: [],
          initiativeBonus: 0,
          speedBonus: 0,
          hpBonusPerLevel: 0,
          flags: ['shadow_touched'],
          spells: [
            {
              id: 'invisibility',
              spellSlug: 'invisibility',
              nameRu: 'Невидимость',
              level: 2,
              castingAbility: 'cha',
              notesRu: '1/длинный отдых без ячейки',
              unlockLevel: 1,
              grant: 'innate',
            },
            {
              id: 'ray_of_sickness',
              spellSlug: 'ray_of_sickness',
              nameRu: 'Луч болезни',
              level: 1,
              castingAbility: 'cha',
              notesRu: '1/длинный отдых без ячейки',
              unlockLevel: 1,
              grant: 'innate',
            },
          ],
          notes: [],
        },
        picks: {
          abilityKeys: { ability: 'cha' },
          enumIds: { bonus_spell: 'ray_of_sickness' },
          enumIdLists: {},
          counts: {},
          notes: {},
        },
      },
    ],
    notes: 'LIVE FIX v2 metamagic-on-grant · одна черта · посох',
  }
}

function wizard5Sheet() {
  return {
    identity: { alignment: 'Законно-нейтральный', experience: 6500, background: 'Мудрец' },
    race: { name: 'Человек', slug: 'human' },
    classes: [
      {
        id: 'live-wiz-5',
        name: 'Волшебник',
        catalog_id: 'wizard',
        level: 5,
        subclass_name: 'Школа воплощения',
        subclass_catalog_id: 'evocation',
      },
    ],
    abilities: {
      str: { score: 10 },
      dex: { score: 14 },
      con: { score: 14 },
      int: { score: 16 },
      wis: { score: 12 },
      cha: { score: 10 },
    },
    saves: { int: { is_proficient: true }, wis: { is_proficient: true } },
    skills: {
      arcana: { is_proficient: true },
      history: { is_proficient: true },
      investigation: { is_proficient: true },
    },
    combat: {
      inspiration: false,
      speed: 30,
      darkvision: 0,
      conditions: [],
      exhaustion: 0,
      hp_temp: 0,
      concentration: null,
      effects: [],
      hit_die: 'd6',
      turn_economy: {
        action: false,
        bonus: false,
        reaction: false,
        moved: false,
        dashed: false,
        disengaged: false,
        dodged: false,
        cast_leveled: false,
        cast_cantrip: false,
        notes: '',
      },
      ac: 12,
      hp_current: 32,
      hp_max: 32,
    },
    resources: [],
    weapons: [],
    spells: {
      casting_ability: 'int',
      max_prepared: 8,
      slots: {
        '1': { max: 4, used: 0 },
        '2': { max: 3, used: 0 },
        '3': { max: 2, used: 0 },
        '4': { max: 0, used: 0 },
        '5': { max: 0, used: 0 },
        '6': { max: 0, used: 0 },
        '7': { max: 0, used: 0 },
        '8': { max: 0, used: 0 },
        '9': { max: 0, used: 0 },
      },
      pact_slots: null,
      known: [
        spell({
          id: 'wiz:mm',
          name: 'Волшебная стрела',
          level: 1,
          class_slug: 'wizard',
          damage: '3к4+3 силовое',
          school: 'воплощение',
          prepared: true,
        }),
        spell({
          id: 'wiz:shield',
          name: 'Щит',
          level: 1,
          class_slug: 'wizard',
          casting_time: '1 реакция',
          school: 'ограждение',
          prepared: true,
        }),
      ],
      has_spell_focus: true,
      has_component_pouch: true,
    },
    inventory: {
      coins: { cp: 0, sp: 0, ep: 0, gp: 20, pp: 0 },
      items: [
        {
          id: 'live-wiz-pouch',
          name: 'Мешочек с компонентами',
          qty: 1,
          spell_tooling: 'component_pouch',
        },
      ],
    },
    feature_picks: { values: {} },
    feat_grants: [],
    notes: 'LIVE FIX wizard control',
  }
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 400)}`)
  return json
}

async function login(page, access, refresh) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ({ a, r }) => {
      localStorage.setItem('dvarf.access_token', a)
      localStorage.setItem('dvarf.refresh_token', r)
      localStorage.setItem('dvarf.mobileVitals.collapsed.v2', '0')
      localStorage.setItem(
        'creed20.onboarding.v1',
        JSON.stringify({
          version: 1,
          welcomeDone: true,
          segment: 'skip',
          createHintVersion: 1,
          sheetTourDone: true,
          lobbyTourDone: true,
          dismissedPanelHelp: [],
          helpOpened: false,
          pendingReadyBridge: false,
          pendingSheetTour: false,
          pendingLobbyTour: false,
        }),
      )
    },
    { a: access, r: refresh },
  )
}

async function openSheet(page, id) {
  await page.goto(`${BASE}/characters/${id}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  await page.waitForSelector('.play-desk', { timeout: 30_000 })
}

async function openCombat(page, w) {
  if (w < 960) {
    const nav = page.locator('.mobile-scene-nav button, .mobile-scene-nav__tab').filter({ hasText: /Бой/i })
    if (await nav.count()) await nav.first().click().catch(() => {})
  }
  const tab = page.locator('button.play-desk__mode').filter({ hasText: /^Бой$/i })
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(400)
}

async function showSpellsMobile(page) {
  const seg = page.locator('.mobile-combat-seg__btn, button').filter({ hasText: /^Заклинания$/i })
  if (await seg.count()) await seg.first().click().catch(() => {})
  await page.waitForTimeout(300)
}

async function dismissToasts(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.toast, .ui-toast, [class*="toast"]').forEach((el) => {
      if (el instanceof HTMLElement) el.remove()
    })
  })
  await page.waitForTimeout(150)
}

async function waitToastsGone(page) {
  await page.waitForTimeout(1200)
  await dismissToasts(page)
  await page.waitForTimeout(200)
}

async function shot(page, name) {
  await dismissToasts(page)
  await page.screenshot({ path: out(name), fullPage: false })
  return out(name)
}

async function readSpAndSlots(page) {
  return page.evaluate(() => {
    const t = document.body.innerText
    const sp = t.match(/Очки чародейства[^\d]*(\d+)\s*\/\s*(\d+)/i)
    const slot1 = t.match(/1[^\n]{0,40}?(\d+)\s*\/\s*(\d+)/) // fragile; prefer API
    return {
      bodySp: sp ? { left: sp[1], max: sp[2], raw: sp[0] } : null,
      slotHint: slot1 ? slot1[0] : null,
    }
  })
}

async function resetSorcResources(token, sorcId) {
  const char = await api(`/characters/${sorcId}`, { token })
  const sheet = structuredClone(char.sheet)
  const resKey = sheet.resources ? 'resources' : null
  const playRes = sheet.play?.resources
  const pools = playRes?.length ? playRes : sheet.resources || []
  for (const row of pools) {
    if (/sorcery|чародейств/i.test(row.name || '') || /sorcery_points/i.test(row.id || '')) {
      row.used = 0
      row.max = Math.max(row.max || 7, 7)
    }
    if (row.id === STAFF_RES) row.used = 0
  }
  if (playRes?.length) sheet.play.resources = pools
  else sheet.resources = pools
  // Reset slots
  for (const key of Object.keys(sheet.spells?.slots || {})) {
    sheet.spells.slots[key].used = 0
  }
  // Reset grant_cast on feat spells
  for (const s of sheet.spells?.known || []) {
    if (s.grant_cast) s.grant_cast.used = 0
  }
  // Clear turn economy
  if (sheet.combat?.turn_economy) {
    for (const k of Object.keys(sheet.combat.turn_economy)) {
      if (typeof sheet.combat.turn_economy[k] === 'boolean') sheet.combat.turn_economy[k] = false
      if (k === 'notes') sheet.combat.turn_economy[k] = ''
    }
  }
  return api(`/characters/${sorcId}`, {
    method: 'PATCH',
    token,
    body: { sheet, sheet_version: char.sheet_version },
  })
}

async function expandSpells(page) {
  const root = page.locator('.play-desk-compact--spells').first()
  await root.waitFor({ timeout: 30_000 })
  const expand = root.getByRole('button', { name: /Развернуть все/i })
  if (await expand.count()) await expand.first().click().catch(() => {})
  await page.waitForTimeout(350)
}

async function clickSpellCast(page, { nameIncludes, sourceHint }) {
  await expandSpells(page)
  await page
    .waitForFunction(
      (name) => {
        const root = document.querySelector('.play-desk-compact--spells')
        return Boolean(root && root.textContent?.includes(name))
      },
      nameIncludes,
      { timeout: 30_000 },
    )
    .catch(() => {})
  const clicked = await page.evaluate(
    ({ nameIncludes, sourceHint }) => {
      const rootEl = document.querySelector('.play-desk-compact--spells')
      if (!rootEl) return 'no-root'
      const row = [...rootEl.querySelectorAll('.play-desk-compact__row.is-spell')].find((r) => {
        const t = r.textContent || ''
        if (!t.includes(nameIncludes)) return false
        if (sourceHint && !new RegExp(sourceHint, 'i').test(t)) return false
        return true
      })
      if (!row) return 'no-row'
      const btn = [...row.querySelectorAll('button')].find((b) =>
        /каст/i.test((b.textContent || '').trim()),
      )
      if (!btn) return 'no-button'
      btn.click()
      return 'ok'
    },
    { nameIncludes, sourceHint },
  )
  if (clicked !== 'ok') throw new Error(`clickSpellCast(${nameIncludes}): ${clicked}`)
  await page.getByRole('heading', { name: /Кастовать заклинание/i }).waitFor({ timeout: 15_000 })
  await page.waitForTimeout(250)
}

async function grantChipCount(dialog) {
  return dialog.locator('.cast-source-chip').filter({ hasText: /Отмеченный тенями/i }).count()
}

async function captureViewport(browser, { access, refresh, token, sorcId, wizId, width, height, tag }) {
  await resetSorcResources(token, sorcId)

  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await login(page, access, refresh)
  await openSheet(page, sorcId)
  await openCombat(page, width)
  if (width < 960) await showSpellsMobile(page)

  // --- before: SP 7/7 ---
  await waitToastsGone(page)
  const beforeUi = await readSpAndSlots(page)
  writeFileSync(out(`live-sorc7-sp-before-${tag}.json`), JSON.stringify(beforeUi, null, 2))
  await shot(page, `live-sorc7-sp-before-${tag}.png`)

  // --- grant + Empowered ---
  await clickSpellCast(page, { nameIncludes: 'Луч болезни', sourceHint: 'Отмеченный' })
  const dialog = page.locator('.ui-dialog').filter({ hasText: /Кастовать заклинание/i })
  const nGrant = await grantChipCount(dialog)
  writeFileSync(out(`live-sorc7-grant-chip-count-${tag}.json`), JSON.stringify({ count: nGrant }, null, 2))
  if (nGrant !== 1) throw new Error(`expected 1 Shadow Touched chip, got ${nGrant} (${tag})`)

  const grantChip = dialog
    .locator('.cast-source-chip:not(.is-disabled)')
    .filter({ hasText: /Отмеченный тенями/i })
  if (await grantChip.count()) await grantChip.first().click()
  await page.waitForTimeout(150)

  const meta = dialog.locator('[data-testid="cast-metamagic-block"]')
  if (!(await meta.count())) throw new Error(`metamagic missing on grant (${tag})`)
  await shot(page, `live-sorc7-cast-grant-meta-collapsed-${tag}.png`)

  await meta.locator('button.cast-metamagic-block__toggle').click()
  await page.waitForTimeout(200)
  // Careful disabled reason
  const metaText = await meta.innerText()
  writeFileSync(out(`live-sorc7-meta-text-grant-${tag}.txt`), metaText)
  if (!/нет спасброска/i.test(metaText)) {
    throw new Error(`Careful disable reason missing (${tag})`)
  }
  const empowered = dialog.locator('.ui-toggle-chip').filter({ hasText: /Усиленн/i })
  await empowered.first().click()
  await page.waitForTimeout(200)
  await shot(page, `live-sorc7-cast-grant-meta-open-${tag}.png`)

  // header should still show 7 before cast
  const openHeader = await meta.locator('button.cast-metamagic-block__toggle').innerText()
  if (!/очки\s*7/i.test(openHeader)) {
    throw new Error(`expected очки 7 before grant cast (${tag}): ${openHeader}`)
  }

  const primary = dialog
    .locator('.ui-dialog__actions .ui-button--primary, .ui-dialog__actions button')
    .filter({ hasText: /Каст/i })
  await primary.last().click()
  await waitToastsGone(page)
  await shot(page, `live-sorc7-cast-grant-after-${tag}.png`)
  const afterGrant = await readSpAndSlots(page)
  writeFileSync(out(`live-sorc7-sp-after-grant-${tag}.json`), JSON.stringify(afterGrant, null, 2))

  // Verify in UI (draft may autosave later): SP 6/7, grant 0/1 on row, L1 slots still 4/4
  await openCombat(page, width)
  if (width < 960) await showSpellsMobile(page)
  await expandSpells(page)
  await waitToastsGone(page)
  const midSnap = await page.evaluate(() => {
    const t = document.body.innerText
    const sp = t.match(/Очки чародейства[^\d]*(\d+)\s*\/\s*(\d+)/i)
    const root = document.querySelector('.play-desk-compact--spells')
    const ray = [...(root?.querySelectorAll('.play-desk-compact__row.is-spell') || [])].find((r) =>
      /Луч болезни/.test(r.textContent || ''),
    )
    const rayText = ray?.textContent || ''
    const grant = rayText.match(/Отмеченный тенями\s*(\d+)\s*\/\s*(\d+)/i)
    const slots = (root?.textContent || '').match(/Ячейки\s*(\d+)\s*\/\s*(\d+)/)
    return {
      spLeft: sp?.[1] ?? null,
      spMax: sp?.[2] ?? null,
      grantLeft: grant?.[1] ?? null,
      grantMax: grant?.[2] ?? null,
      slotsHint: slots?.[0] ?? null,
      rayRows: [...(root?.querySelectorAll('.play-desk-compact__row.is-spell') || [])].filter((r) =>
        /Луч болезни/.test(r.textContent || ''),
      ).length,
    }
  })
  writeFileSync(out(`live-sorc7-ui-after-grant-${tag}.json`), JSON.stringify(midSnap, null, 2))
  if (
    midSnap.spLeft !== '6' ||
    midSnap.grantLeft !== '0' ||
    midSnap.rayRows !== 1 ||
    (midSnap.slotsHint && !/4\s*\/\s*4/.test(midSnap.slotsHint))
  ) {
    throw new Error(`grant chain UI check failed (${tag}): ${JSON.stringify(midSnap)}`)
  }

  // --- slot + Quickened ---
  // Fresh sheet open avoids desk-split / dialog leftovers after grant cast.
  await page.keyboard.press('Escape').catch(() => {})
  await openSheet(page, sorcId)
  await openCombat(page, width)
  if (width < 960) await showSpellsMobile(page)
  await clickSpellCast(page, { nameIncludes: 'Луч болезни', sourceHint: 'Отмеченный' })
  const dialog2 = page.locator('.ui-dialog').filter({ hasText: /Кастовать заклинание/i }).last()
  await dialog2.waitFor({ timeout: 15_000 })
  const slotChip = dialog2.locator('.cast-source-chip').filter({ hasText: /Обычная 1/i })
  await slotChip.first().click()
  await page.waitForTimeout(200)
  const meta2 = dialog2.locator('[data-testid="cast-metamagic-block"]')
  if (!(await meta2.count())) throw new Error(`metamagic missing on slot (${tag})`)
  const toggle2 = meta2.locator('button.cast-metamagic-block__toggle')
  if ((await toggle2.getAttribute('aria-expanded')) !== 'true') {
    await toggle2.click()
  }
  await page.waitForTimeout(250)
  const empowered2 = meta2.locator('.ui-toggle-chip.is-on').filter({ hasText: /Усиленн/i })
  if (await empowered2.count()) await empowered2.first().click()
  await page.waitForTimeout(100)
  // Prefer role=checkbox; fall back to text chip if role missing in kit.
  let quickened = meta2.getByRole('checkbox', { name: /Ускоренн/i })
  if (!(await quickened.count())) {
    quickened = meta2.locator('.ui-toggle-chip').filter({ hasText: /Ускоренн/i })
  }
  if (!(await quickened.count())) {
    const dump = await meta2.innerText()
    writeFileSync(out(`debug-meta2-${tag}.txt`), dump)
    await shot(page, `debug-meta2-${tag}.png`)
    throw new Error(`Quickened chip missing (${tag})`)
  }
  await quickened.first().scrollIntoViewIfNeeded()
  await quickened.first().click({ timeout: 10_000 })
  await page.waitForTimeout(200)
  const preview = await dialog2.locator('[data-testid="cast-metamagic-params"]').innerText().catch(() => '')
  writeFileSync(out(`live-sorc7-quickened-preview-${tag}.txt`), preview)
  if (!/бонус/i.test(preview)) {
    throw new Error(`Quickened preview missing bonus action (${tag}): ${preview}`)
  }
  await shot(page, `live-sorc7-cast-slot-quickened-open-${tag}.png`)
  await dialog2
    .locator('.ui-dialog__actions .ui-button--primary, .ui-dialog__actions button')
    .filter({ hasText: /Каст/i })
    .last()
    .click()
  await waitToastsGone(page)
  await shot(page, `live-sorc7-cast-slot-quickened-after-${tag}.png`)
  await openCombat(page, width)
  if (width < 960) await showSpellsMobile(page)
  await expandSpells(page)
  await waitToastsGone(page)
  const slotSnap = await page.evaluate(() => {
    const t = document.body.innerText
    const sp = t.match(/Очки чародейства[^\d]*(\d+)\s*\/\s*(\d+)/i)
    const root = document.querySelector('.play-desk-compact--spells')
    const level1 = [...(root?.querySelectorAll('*') || [])].find((el) =>
      /^1-й уровень/i.test((el.textContent || '').trim().slice(0, 20)),
    )
    // Prefer the slots line near 1st level
    const slotsMatch = (root?.textContent || '').match(/1-й уровень[\s\S]{0,80}?Ячейки\s*(\d+)\s*\/\s*(\d+)/i)
    return {
      spLeft: sp?.[1] ?? null,
      spMax: sp?.[2] ?? null,
      slot1left: slotsMatch?.[1] ?? null,
      slot1max: slotsMatch?.[2] ?? null,
      slotsRaw: slotsMatch?.[0]?.replace(/\s+/g, ' ') ?? null,
    }
  })
  writeFileSync(out(`live-sorc7-ui-after-slot-${tag}.json`), JSON.stringify(slotSnap, null, 2))
  // 7 - 1 (empowered) - 2 (quickened) = 4 left; L1 slots 3/4
  if (slotSnap.spLeft !== '4' || slotSnap.slot1left !== '3') {
    throw new Error(`slot+quickened UI check failed (${tag}): ${JSON.stringify(slotSnap)}`)
  }

  // --- item (staff) cast + metamagic ---
  await resetSorcResources(token, sorcId)
  await openSheet(page, sorcId)
  await openCombat(page, width)
  if (width < 960) await showSpellsMobile(page)
  await clickSpellCast(page, { nameIncludes: 'Волшебная стрела', sourceHint: 'Посох|заряд|предмет|роя' })
  const dialog3 = page.locator('.ui-dialog').filter({ hasText: /Кастовать заклинание/i })
  const meta3 = dialog3.locator('[data-testid="cast-metamagic-block"]')
  if (!(await meta3.count())) throw new Error(`metamagic missing on item cast (${tag})`)
  await meta3.locator('button.cast-metamagic-block__toggle').click()
  await page.waitForTimeout(150)
  const emp3 = dialog3.locator('.ui-toggle-chip').filter({ hasText: /Усиленн/i })
  if (await emp3.count()) await emp3.first().click()
  await page.waitForTimeout(150)
  await shot(page, `live-sorc7-cast-item-meta-open-${tag}.png`)
  await dialog3.getByRole('button', { name: /^Отмена$/i }).click()

  // Wizard cast unchanged (no metamagic)
  await openSheet(page, wizId)
  await openCombat(page, width)
  if (width < 960) await showSpellsMobile(page)
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    document.querySelector('.play-desk')?.scrollTo?.(0, 0)
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0
  })
  await shot(page, `live-wiz5-combat-top-${tag}.png`)
  await clickSpellCast(page, { nameIncludes: 'Волшебная стрела' })
  const wizDialog = page.locator('.ui-dialog').filter({ hasText: /Кастовать заклинание/i })
  const wizMeta = await wizDialog.locator('[data-testid="cast-metamagic-block"]').count()
  writeFileSync(out(`live-wiz5-cast-meta-count-${tag}.json`), JSON.stringify({ metamagicBlocks: wizMeta }, null, 2))
  if (wizMeta !== 0) throw new Error(`wizard has metamagic (${tag})`)
  await shot(page, `live-wiz5-cast-${tag}.png`)
  await wizDialog.getByRole('button', { name: /^Отмена$/i }).click()

  await page.close()
}

const browser = await chromium.launch({ headless: true })
try {
  await api('/auth/register', {
    method: 'POST',
    body: { email: EMAIL, password: PASS, display_name: 'Meta Grant Live V2' },
  })
  const verifyRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  })
  if (verifyRes.status === 403) {
    const { execFileSync } = await import('node:child_process')
    const py = `
from sqlalchemy import create_engine, text
e = create_engine("postgresql+psycopg://dvarf:dvarf@localhost:5432/dvarf")
with e.begin() as c:
    c.execute(text("UPDATE users SET email_verified_at=NOW() WHERE email=:e"), {"e": ${JSON.stringify(EMAIL)}})
print("verified")
`
    execFileSync('python3', ['-c', py], { stdio: 'inherit' })
  }
  const auth = await api('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASS } })
  const access = auth.access_token
  const refresh = auth.refresh_token
  const sorc = await api('/characters', {
    method: 'POST',
    token: access,
    body: { name: 'Лира Теневая', rules_edition: '2014' },
  })
  const wiz = await api('/characters', {
    method: 'POST',
    token: access,
    body: { name: 'Элдар Книжный', rules_edition: '2014' },
  })
  const sorcPatched = await api(`/characters/${sorc.id}`, {
    method: 'PATCH',
    token: access,
    body: {
      name: 'Лира Теневая',
      class_name: 'Чародей 7',
      level: 7,
      sheet: sorcerer7Sheet(),
      sheet_version: sorc.sheet_version ?? 1,
    },
  })
  const wizPatched = await api(`/characters/${wiz.id}`, {
    method: 'PATCH',
    token: access,
    body: {
      name: 'Элдар Книжный',
      class_name: 'Волшебник 5',
      level: 5,
      sheet: wizard5Sheet(),
      sheet_version: wiz.sheet_version ?? 1,
    },
  })
  writeFileSync(
    out('live-meta-grant-ids.json'),
    JSON.stringify(
      {
        email: EMAIL,
        sorcId: sorcPatched.id,
        wizId: wizPatched.id,
        sheetVersions: { sorc: sorcPatched.sheet_version, wiz: wizPatched.sheet_version },
        note: 'v2: single Shadow Touched via feat_grants only',
      },
      null,
      2,
    ),
  )

  // Ledger sync materializes feat spells in the client draft (may not flush to API yet).
  // Verify exactly one Ray + one Shadow Touched chip in the UI.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await login(page, access, refresh)
    await openSheet(page, sorc.id)
    await openCombat(page, 1440)
    // Wait for one-shot feat-spell hydrate toast / draft patch.
    await page.waitForFunction(
      () => {
        const root = document.querySelector('.play-desk-compact--spells')
        return Boolean(root && /Луч болезни/.test(root.textContent || ''))
      },
      null,
      { timeout: 30_000 },
    ).catch(() => {})
    await expandSpells(page)
    const syncInfo = await page.evaluate(() => {
      const root = document.querySelector('.play-desk-compact--spells')
      const text = root?.textContent || ''
      const rayRows = [...(root?.querySelectorAll('.play-desk-compact__row.is-spell') || [])].filter(
        (r) => /Луч болезни/.test(r.textContent || ''),
      )
      return {
        rayRows: rayRows.length,
        rayLabels: rayRows.map((r) => (r.textContent || '').replace(/\s+/g, ' ').slice(0, 120)),
        hasShadow: /Отмеченный тенями/.test(text),
      }
    })
    writeFileSync(out('live-sorc7-ray-rows.json'), JSON.stringify(syncInfo, null, 2))
    if (syncInfo.rayRows !== 1) {
      await page.screenshot({ path: out('debug-feat-sync-fail.png'), fullPage: false })
      throw new Error(`expected 1 Ray of Sickness in UI, got ${syncInfo.rayRows}`)
    }
    await page.close()
  }

  for (const vp of [
    { width: 1440, height: 900, tag: '1440' },
    { width: 390, height: 844, tag: '390' },
  ]) {
    await captureViewport(browser, {
      access,
      refresh,
      token: access,
      sorcId: sorc.id,
      wizId: wiz.id,
      ...vp,
    })
  }

  const summary = { live: JSON.parse(readFileSync(out('live-meta-grant-ids.json'), 'utf8')), md5: {} }
  for (const name of [
    'live-sorc7-sp-before-1440.png',
    'live-sorc7-cast-grant-meta-open-1440.png',
    'live-sorc7-cast-grant-after-1440.png',
    'live-sorc7-cast-slot-quickened-open-1440.png',
    'live-sorc7-cast-slot-quickened-after-1440.png',
    'live-sorc7-cast-item-meta-open-1440.png',
    'live-sorc7-sp-before-390.png',
    'live-sorc7-cast-grant-meta-open-390.png',
    'live-sorc7-cast-grant-after-390.png',
    'live-sorc7-cast-slot-quickened-open-390.png',
    'live-sorc7-cast-slot-quickened-after-390.png',
    'live-sorc7-cast-item-meta-open-390.png',
  ]) {
    summary.md5[name] = md5(out(name))
  }
  writeFileSync(out('live-meta-grant-md5.json'), JSON.stringify(summary, null, 2))
  console.log('fix-metamagic-grant-capture v2 done', summary)
} finally {
  await browser.close()
}
