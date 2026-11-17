/**
 * FIX metamagic-on-grant evidence: live sorcerer 7 (not MAG-01 seed ids).
 * Requires API :8000 + vite :5173.
 *
 * Shots → /opt/cursor/artifacts/
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.FIX_BASE || 'http://127.0.0.1:5173'
const API = process.env.FIX_API || 'http://127.0.0.1:8000'
const EMAIL = `meta-grant-${Date.now()}@example.com`
const PASS = 'meta-grant-dev'
const CLASS_ID = 'live-sorc-7-entry'

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
      id: 'feat-spell:shadow_touched:ray_of_sickness',
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
      id: 'feat-spell:shadow_touched:invisibility',
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
      hp_dice_current: 7,
      is_dying: false,
      death_successes: 0,
      death_fails: 0,
      turn_economy: {
        action: false,
        bonus: false,
        reaction: false,
        free_object: false,
        interacted: false,
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
      ],
    },
    feature_picks: {
      values: {
        [`${CLASS_ID}:dragon_ancestor`]: 'red',
        [`${CLASS_ID}:metamagic`]: 'empowered,quickened,twinned',
      },
    },
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
    notes: 'LIVE FIX metamagic-on-grant · чародей 7 · Отмеченный тенями',
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
      hp_dice_current: 5,
      is_dying: false,
      death_successes: 0,
      death_fails: 0,
      turn_economy: {
        action: false,
        bonus: false,
        reaction: false,
        free_object: false,
        interacted: false,
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
          id: 'w:fire-bolt',
          name: 'Огненный снаряд',
          level: 0,
          class_slug: 'wizard',
          damage: '2к10 огонь',
          attack_or_save: 'атака',
        }),
        spell({
          id: 'w:mm',
          name: 'Волшебная стрела',
          level: 1,
          class_slug: 'wizard',
          prepared: true,
          in_spellbook: true,
          spellbook_acquisition: 'starting',
          damage: '3к4+3 силовое',
        }),
      ],
      has_spell_focus: true,
      has_component_pouch: true,
      wizard_spellbook: { bookLost: false, primaryBookItemId: null },
    },
    inventory: {
      coins: { cp: 0, sp: 0, ep: 0, gp: 20, pp: 0 },
      items: [
        {
          id: 'wiz-pouch',
          name: 'Мешочек с компонентами',
          qty: 1,
          spell_tooling: 'component_pouch',
        },
      ],
    },
    feature_picks: { values: {} },
    notes: 'LIVE FIX regression wizard 5 · без метамагии',
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
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`)
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

async function openRayCast(page) {
  const root = page.locator('.play-desk-compact--spells').first()
  await root.waitFor({ timeout: 30_000 })
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.play-desk-compact--spells')
      return Boolean(el && /Луч болезни/.test(el.innerText || ''))
    },
    null,
    { timeout: 30_000 },
  )
  const expand = root.getByRole('button', { name: /Развернуть все/i })
  if (await expand.count()) await expand.first().click().catch(() => {})
  await page.waitForTimeout(400)
  const clicked = await page.evaluate(() => {
    const rootEl = document.querySelector('.play-desk-compact--spells')
    if (!rootEl) return 'no-root'
    const row = [...rootEl.querySelectorAll('.play-desk-compact__row.is-spell')].find((r) => {
      const t = r.textContent || ''
      return t.includes('Луч болезни') && /Отмеченный/.test(t)
    })
    if (!row) return 'no-row'
    const btn = [...row.querySelectorAll('button')].find((b) =>
      /каст/i.test((b.textContent || '').trim()),
    )
    if (!btn) return 'no-button'
    btn.click()
    return 'ok'
  })
  if (clicked !== 'ok') throw new Error(`openRayCast click failed: ${clicked}`)
  await page.getByRole('heading', { name: /Кастовать заклинание/i }).waitFor({ timeout: 15_000 })
  await page
    .locator('.ui-dialog')
    .filter({ hasText: /Луч болезни/i })
    .first()
    .waitFor({ timeout: 10_000 })
  await page.waitForTimeout(300)
}

async function shotDialog(page, name) {
  const path = out(name)
  await page.screenshot({ path, fullPage: false })
  return path
}

async function sheetTopShot(page, name) {
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    document.querySelector('.play-desk')?.scrollTo?.(0, 0)
    document.scrollingElement && (document.scrollingElement.scrollTop = 0)
  })
  await page.waitForTimeout(200)
  return shotDialog(page, name)
}

async function captureViewport(browser, { access, refresh, sorcId, wizId, width, height, tag }) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  })
  await login(page, access, refresh)
  await openSheet(page, sorcId)
  await openCombat(page, width)
  if (width < 960) await showSpellsMobile(page)

  // Grant path
  await openRayCast(page)
  const dialog = page.locator('.ui-dialog').filter({ hasText: /Кастовать заклинание/i })
  await dialog.waitFor()
  // Prefer an available grant chip (duplicates may exist from ledger + manual rows).
  const grantChip = dialog
    .locator('.cast-source-chip:not(.is-disabled)')
    .filter({ hasText: /Отмеченный тенями/i })
  if (await grantChip.count()) await grantChip.first().click()
  await page.waitForTimeout(200)
  const meta = dialog.locator('[data-testid="cast-metamagic-block"]')
  if (!(await meta.count())) {
    throw new Error(`metamagic block missing on grant (${tag})`)
  }
  await shotDialog(page, `live-sorc7-cast-grant-meta-collapsed-${tag}.png`)

  // Expand + pick empowered
  await meta.locator('button.cast-metamagic-block__toggle').click()
  await page.waitForTimeout(200)
  const empowered = dialog.locator('.ui-toggle-chip').filter({ hasText: /Усиленн/i })
  if (await empowered.count()) await empowered.first().click()
  await page.waitForTimeout(200)
  await shotDialog(page, `live-sorc7-cast-grant-meta-open-${tag}.png`)

  // Slot path first (do not spend grant yet — keep charges for both viewports).
  const slotChip = dialog.locator('.cast-source-chip').filter({ hasText: /Обычная 1/i })
  if (await slotChip.count()) await slotChip.first().click()
  await page.waitForTimeout(200)
  if (!(await dialog.locator('[data-testid="cast-metamagic-block"]').count())) {
    throw new Error(`metamagic block missing on slot (${tag})`)
  }
  await shotDialog(page, `live-sorc7-cast-slot-meta-${tag}.png`)

  // Back to grant + cast once (only on 1440 to spend SP / prove toast).
  if (tag === '1440') {
    if (await grantChip.count()) await grantChip.first().click()
    await page.waitForTimeout(150)
    const beforePts = await page.evaluate(() => {
      const t = document.body.innerText
      const m = t.match(/Очки чародейства[^\d]*(\d+)\s*\/\s*(\d+)/i)
      return m ? { usedLeft: m[1], max: m[2], raw: m[0] } : { raw: 'not-found' }
    })
    writeFileSync(out(`live-sorc7-sp-before-${tag}.json`), JSON.stringify(beforePts, null, 2))
    const primary = dialog
      .locator('.ui-dialog__actions .ui-button--primary, .ui-dialog__actions button')
      .filter({ hasText: /Каст/i })
    await primary.last().click()
    await page.waitForTimeout(900)
    await shotDialog(page, `live-sorc7-cast-grant-after-${tag}.png`)
    const afterPts = await page.evaluate(() => {
      const t = document.body.innerText
      const m = t.match(/Очки чародейства[^\d]*(\d+)\s*\/\s*(\d+)/i)
      return m ? { usedLeft: m[1], max: m[2], raw: m[0] } : { raw: 'not-found' }
    })
    writeFileSync(out(`live-sorc7-sp-after-${tag}.json`), JSON.stringify(afterPts, null, 2))
  } else {
    await dialog.getByRole('button', { name: /^Отмена$/i }).click()
  }

  // Wizard regression (no metamagic)
  await openSheet(page, wizId)
  await openCombat(page, width)
  if (width < 960) await showSpellsMobile(page)
  await sheetTopShot(page, `live-wiz5-combat-top-${tag}.png`)
  const wizRoot = page.locator('.play-desk-compact--spells').first()
  await wizRoot.waitFor({ timeout: 20_000 })
  const expandWiz = wizRoot.getByRole('button', { name: /Развернуть все/i })
  if (await expandWiz.count()) await expandWiz.first().click().catch(() => {})
  await page.waitForTimeout(350)
  const wizClicked = await page.evaluate(() => {
    const rootEl = document.querySelector('.play-desk-compact--spells')
    if (!rootEl) return 'no-root'
    const row = [...rootEl.querySelectorAll('.play-desk-compact__row.is-spell')].find((r) =>
      (r.textContent || '').includes('Волшебная стрела'),
    )
    if (!row) return 'no-row'
    const btn = [...row.querySelectorAll('button')].find((b) =>
      /каст/i.test((b.textContent || '').trim()),
    )
    if (!btn) return 'no-button'
    btn.click()
    return 'ok'
  })
  if (wizClicked !== 'ok') throw new Error(`wizard cast click failed: ${wizClicked}`)
  await page.getByRole('heading', { name: /Кастовать заклинание/i }).waitFor({ timeout: 15_000 })
  await page.waitForTimeout(250)
  const wizDialog = page.locator('.ui-dialog').filter({ hasText: /Кастовать заклинание/i })
  const wizMeta = await wizDialog.locator('[data-testid="cast-metamagic-block"]').count()
  writeFileSync(
    out(`live-wiz5-cast-meta-count-${tag}.json`),
    JSON.stringify({ metamagicBlocks: wizMeta }, null, 2),
  )
  if (wizMeta !== 0) throw new Error(`wizard unexpectedly has metamagic block (${tag})`)
  await shotDialog(page, `live-wiz5-cast-${tag}.png`)
  await wizDialog.getByRole('button', { name: /^Отмена$/i }).click()

  await page.close()
}

const browser = await chromium.launch({ headless: true })
try {
  await api('/auth/register', {
    method: 'POST',
    body: { email: EMAIL, password: PASS, display_name: 'Meta Grant Live' },
  })
  // Dev DB may require email_verified_at before login.
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
  const auth = await api('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASS },
  })
  const access = auth.access_token
  const refresh = auth.refresh_token
  const sorc = await api('/characters', {
    method: 'POST',
    token: access,
    body: {
      name: 'Лира Теневая',
      rules_edition: '2014',
    },
  })
  const wiz = await api('/characters', {
    method: 'POST',
    token: access,
    body: {
      name: 'Элдар Книжный',
      rules_edition: '2014',
    },
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
        sheetVersions: {
          sorc: sorcPatched.sheet_version,
          wiz: wizPatched.sheet_version,
        },
      },
      null,
      2,
    ),
  )

  for (const vp of [
    { width: 1440, height: 900, tag: '1440' },
    { width: 390, height: 844, tag: '390' },
  ]) {
    await captureViewport(browser, {
      access,
      refresh,
      sorcId: sorc.id,
      wizId: wiz.id,
      ...vp,
    })
  }

  // md5 summary for wizard frames (same char, both viewports)
  const summary = {
    live: { email: EMAIL, sorcId: sorc.id, wizId: wiz.id },
    md5: {},
  }
  for (const name of [
    'live-sorc7-cast-grant-meta-collapsed-1440.png',
    'live-sorc7-cast-grant-meta-open-1440.png',
    'live-sorc7-cast-grant-after-1440.png',
    'live-sorc7-cast-slot-meta-1440.png',
    'live-sorc7-cast-grant-meta-collapsed-390.png',
    'live-sorc7-cast-grant-meta-open-390.png',
    'live-sorc7-cast-slot-meta-390.png',
    'live-wiz5-cast-1440.png',
    'live-wiz5-cast-390.png',
    'live-wiz5-combat-top-1440.png',
    'live-wiz5-combat-top-390.png',
  ]) {
    summary.md5[name] = md5(out(name))
  }
  writeFileSync(out('live-meta-grant-md5.json'), JSON.stringify(summary, null, 2))
  console.log('fix-metamagic-grant-capture done', summary)
} finally {
  await browser.close()
}
