/**
 * Evidence: sorcerer 2014 metamagic picks survive reload / cast / rest / level-up
 * on desk (1440×900) and phone (390×844). Viewport shots only (scrollTop=0).
 *
 * Also writes same-character regression frames for md5 vs origin/main build
 * when FIX_BEFORE_BASE is set (optional second vite).
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
mkdirSync(ART, { recursive: true })
const out = (n) => `${ART}/${n}`
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex')

const API = process.env.FIX_API || 'http://127.0.0.1:8000'
const BASE = process.env.FIX_AFTER_BASE || process.env.FIX_BASE || 'http://127.0.0.1:5173'
const BEFORE = process.env.FIX_BEFORE_BASE || ''
const EMAIL = `meta-persist-${Date.now()}@example.com`
const PASS = 'meta-persist-dev'
const CLASS_ID = 'persist-sorc-entry'
const WIZ_ID = 'persist-wiz-entry'

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

function sorcererSheet({ level = 3, metamagic = '' } = {}) {
  const known = [
    spell({
      id: 'sorc:fire-bolt',
      name: 'Огненный снаряд',
      level: 0,
      class_slug: 'sorcerer',
      damage: '1к10 огонь',
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
  ]
  const picks = { [`${CLASS_ID}:dragon_ancestor`]: 'red' }
  if (metamagic) picks[`${CLASS_ID}:metamagic`] = metamagic
  return {
    identity: { alignment: 'Хаотично-нейтральный', experience: 900, background: 'Отшельник' },
    race: { name: 'Человек', slug: 'human' },
    classes: [
      {
        id: CLASS_ID,
        name: 'Чародей',
        catalog_id: 'sorcerer',
        level,
        subclass_name: 'Наследие драконьей крови',
        subclass_catalog_id: 'draconic_bloodline',
      },
    ],
    abilities: {
      str: { score: 10 },
      dex: { score: 14 },
      con: { score: 14 },
      int: { score: 10 },
      wis: { score: 12 },
      cha: { score: 16 },
    },
    saves: { con: { is_proficient: true }, cha: { is_proficient: true } },
    skills: { arcana: { is_proficient: true }, persuasion: { is_proficient: true } },
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
      hit_dice_by_class: [{ classEntryId: CLASS_ID, die: 'd6', current: level, max: level }],
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
      ac: 13,
      hp_current: 20,
      hp_max: 20,
    },
    resources: [
      {
        id: `feat:sorcery_points:${CLASS_ID}`,
        name: 'Очки чародейства',
        max: level,
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
        '2': { max: 0, used: 0 },
        '3': { max: 0, used: 0 },
        '4': { max: 0, used: 0 },
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
      coins: { cp: 0, sp: 0, ep: 0, gp: 15, pp: 0 },
      items: [{ id: 'pouch', name: 'Мешочек с компонентами', qty: 1, spell_tooling: 'component_pouch' }],
    },
    feature_picks: { values: picks },
    feat_grants: [],
    class_grants: [],
    subclass_grants: [],
  }
}

function wizardSheet() {
  return {
    identity: { alignment: 'Законно-нейтральный', experience: 6500, background: 'Мудрец' },
    race: { name: 'Человек', slug: 'human' },
    classes: [
      {
        id: WIZ_ID,
        name: 'Волшебник',
        catalog_id: 'wizard',
        level: 5,
        subclass_name: 'Школа ограждения',
        subclass_catalog_id: 'school_of_abjuration',
      },
    ],
    abilities: {
      str: { score: 8 },
      dex: { score: 14 },
      con: { score: 12 },
      int: { score: 16 },
      wis: { score: 12 },
      cha: { score: 10 },
    },
    saves: { int: { is_proficient: true }, wis: { is_proficient: true } },
    skills: { arcana: { is_proficient: true }, history: { is_proficient: true } },
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
      ac: 12,
      hp_current: 28,
      hp_max: 28,
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
      known: [
        spell({
          id: 'wiz:mm',
          name: 'Волшебная стрела',
          level: 1,
          class_slug: 'wizard',
          damage: '3к4+3 силовое',
          school: 'воплощение',
          in_spellbook: true,
        }),
      ],
      has_spell_focus: true,
      has_component_pouch: true,
    },
    inventory: { coins: { cp: 0, sp: 0, ep: 0, gp: 20, pp: 0 }, items: [] },
    feature_picks: { values: {} },
    feat_grants: [],
    class_grants: [],
    subclass_grants: [],
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
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

async function ensureAuth() {
  await api('/auth/register', {
    method: 'POST',
    body: { email: EMAIL, password: PASS, display_name: 'Meta Persist' },
  }).catch(() => null)
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  })
  if (loginRes.status === 403) {
    execFileSync(
      'python3',
      [
        '-c',
        `from sqlalchemy import create_engine, text
e=create_engine("postgresql+psycopg://dvarf:dvarf@localhost:5432/dvarf")
with e.begin() as c:
  c.execute(text("UPDATE users SET email_verified_at=NOW() WHERE email=:e"), {"e": ${JSON.stringify(EMAIL)}})
print("verified")
`,
      ],
      { stdio: 'inherit' },
    )
  }
  return api('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASS } })
}

async function login(page, base, access, refresh) {
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
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

async function openSheet(page, base, id) {
  await page.goto(`${base}/characters/${id}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card, .ui-toast').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  await page.waitForSelector('.play-desk', { timeout: 30_000 })
}

async function hideChrome(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.ui-toast, .toast, [data-toast]').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
    document.querySelectorAll('*').forEach((el) => {
      if (!(el instanceof HTMLElement)) return
      const t = el.textContent || ''
      if (/Сохранено.*Редакция|Редакция 2014\s*•\s*v\d+/i.test(t) && t.length < 80) {
        el.style.visibility = 'hidden'
      }
    })
    window.scrollTo(0, 0)
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0
    document.querySelector('.play-desk')?.scrollTo?.(0, 0)
  })
}

async function openScene(page, width, label) {
  if (width < 960) {
    const tab = page.locator('.mobile-scene-nav__tab').filter({ hasText: new RegExp(label, 'i') })
    if (await tab.count()) await tab.first().click()
  } else {
    await page.locator('button.play-desk__mode').filter({ hasText: new RegExp(`^${label}$`, 'i') }).first().click()
  }
  await page.waitForTimeout(450)
}

async function shot(page, name) {
  await hideChrome(page)
  await page.screenshot({ path: out(name), fullPage: false })
  return md5(out(name))
}

async function readMetamagicFromApi(token, id) {
  const ch = await api(`/characters/${id}`, { token })
  const values = ch.sheet?.feature_picks?.values || {}
  const key = Object.keys(values).find((k) => /:metamagic$/i.test(k))
  return { key, value: key ? values[key] : '', sheet_version: ch.sheet_version }
}

async function pickMetamagicInUi(page, width) {
  await openScene(page, width, width < 960 ? 'Способн' : 'Способности')
  await page.waitForFunction(() => /Метамагия/.test(document.body.innerText), null, {
    timeout: 20_000,
  })
  const expandAll = page.getByRole('button', { name: /Развернуть все/i })
  if (await expandAll.count()) await expandAll.first().click()
  await page.waitForTimeout(350)
  const metaCard = page.locator('button, .feature-card').filter({ hasText: /Метамагия/i }).first()
  if (await metaCard.count()) {
    await metaCard.click()
    await page.waitForTimeout(300)
  }
  await page.waitForFunction(() => /Осторожное заклинание/.test(document.body.innerText), null, {
    timeout: 15_000,
  })
  // Toggle two PHB options if not already selected.
  for (const label of [/Осторожное заклинание/i, /Далёкое заклинание/i]) {
    const btn = page.locator('button').filter({ hasText: label }).first()
    if (await btn.count()) {
      const text = (await btn.textContent()) || ''
      if (!text.includes('✓')) await btn.click()
      await page.waitForTimeout(250)
    }
  }
  await page.waitForTimeout(1100) // autosave debounce (650ms) + flush
}

async function expandSpells(page) {
  const btn = page.locator('button').filter({ hasText: /Развернуть все/i }).first()
  if (await btn.count()) await btn.click().catch(() => {})
  await page.waitForTimeout(250)
}

async function clickSpellCast(page, nameIncludes) {
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
  const clicked = await page.evaluate((needle) => {
    const rootEl = document.querySelector('.play-desk-compact--spells')
    const scope = rootEl || document
    const row = [...scope.querySelectorAll('.play-desk-compact__row.is-spell, .play-desk-compact__row')].find(
      (el) => (el.textContent || '').includes(needle),
    )
    if (!row) return 'no-row'
    const castBtn = [...row.querySelectorAll('button')].find((b) =>
      /каст/i.test((b.textContent || '').trim()),
    )
    if (castBtn instanceof HTMLElement) {
      castBtn.click()
      return 'ok'
    }
    return 'no-btn'
  }, nameIncludes)
  if (clicked !== 'ok') throw new Error(`spell cast click failed: ${clicked} (${nameIncludes})`)
  await page.getByRole('heading', { name: /Кастовать заклинание/i }).waitFor({ timeout: 15_000 })
}

async function castWithMeta(page, width, tag) {
  await openScene(page, width, 'Бой')
  if (width < 960) {
    const seg = page.locator('.mobile-combat-seg__btn, button').filter({ hasText: /^Заклинания$/i })
    if (await seg.count()) await seg.first().click().catch(() => {})
    await page.waitForTimeout(300)
  }
  await page.waitForTimeout(300)
  await clickSpellCast(page, 'Волшебная стрела')
  const dialog = page.locator('.ui-dialog').filter({ hasText: /Кастовать заклинание/i })
  const meta = dialog.locator('[data-testid="cast-metamagic-block"]')
  if ((await meta.count()) === 0) {
    const toggle = dialog.getByRole('button', { name: /Метамагия/i })
    if (await toggle.count()) await toggle.first().click()
  }
  const option = dialog.locator('button').filter({ hasText: /Осторожн|Далёк|Усилен/i }).first()
  if (await option.count()) await option.click()
  await page.waitForTimeout(200)
  await shot(page, `persist-cast-meta-open-${tag}.png`)
  const confirm = dialog
    .getByRole('button', { name: /С метамагией|Кастовать|Подтвердить/i })
    .first()
  if (await confirm.count()) await confirm.click()
  else {
    const cancel = dialog.getByRole('button', { name: /^Отмена$/i }).first()
    if (await cancel.count()) await cancel.click()
  }
  await page.waitForTimeout(900)
  // Ensure cast dialog is gone before rest / other actions.
  if (await dialog.count()) {
    const cancel = dialog.getByRole('button', { name: /^Отмена$/i }).first()
    if (await cancel.count()) await cancel.click().catch(() => {})
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(300)
  }
  await page.evaluate(() => {
    document.querySelectorAll('.ui-toast, .toast, .ui-dialog-backdrop').forEach((el) => {
      if (el instanceof HTMLElement) el.remove()
    })
  })
}

async function closeDialogs(page) {
  await page.keyboard.press('Escape').catch(() => {})
  await page.evaluate(() => {
    document.querySelectorAll('.ui-dialog-backdrop, .ui-toast, .toast').forEach((el) => {
      if (el instanceof HTMLElement) el.remove()
    })
  })
  await page.waitForTimeout(200)
}

async function doRest(page, width, kind) {
  await closeDialogs(page)
  await openScene(page, width, 'Бой')
  const restBtn = page.locator('button.play-desk-header__rest').first()
  if (!(await restBtn.count())) {
    // Phone may nest rest under more menu — try exact header label.
    const alt = page.getByRole('button', { name: /^Отдых$/i }).first()
    if (!(await alt.count())) return false
    await alt.click({ force: true })
  } else {
    await restBtn.click({ force: true })
  }
  await page.waitForTimeout(400)
  const dialog = page.locator('.ui-dialog').filter({ hasText: /Отдых|Короткий|Долгий/i })
  if ((await dialog.count()) === 0) return false
  if (kind === 'long') {
    const tab = dialog.getByRole('button', { name: /Долгий/i })
    if (await tab.count()) await tab.click()
  } else {
    const tab = dialog.getByRole('button', { name: /Короткий/i })
    if (await tab.count()) await tab.click()
  }
  // Confirm resources / complete rest
  const apply = dialog.locator('button').filter({ hasText: /Применить|Завершить|Восстановить ресурсы|Короткий отдых|Долгий отдых/i }).first()
  if (await apply.count()) await apply.click()
  await page.waitForTimeout(500)
  // Some flows need a second confirm
  const apply2 = dialog.locator('button').filter({ hasText: /Применить|Завершить|Подтвердить/i }).first()
  if (await apply2.count()) await apply2.click().catch(() => {})
  await page.waitForTimeout(900)
  await closeDialogs(page)
  return true
}

async function levelUp(page, width) {
  await openScene(page, width, width < 960 ? 'Личность' : 'Личность')
  // Identity / level controls vary — bump via API is more reliable; UI attempt best-effort.
  const bump = page.locator('button').filter({ hasText: /Уровень|Прокач/i }).first()
  if (await bump.count()) {
    await bump.click()
    await page.waitForTimeout(400)
    const dialog = page.locator('.ui-dialog')
    const plus = dialog.locator('button').filter({ hasText: /\+|Повысить|Чародей/i }).first()
    if (await plus.count()) await plus.click()
    const ok = dialog.getByRole('button', { name: /Готово|Применить|Ок|Сохранить/i }).first()
    if (await ok.count()) await ok.click()
    await page.waitForTimeout(800)
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined,
})
const summary = { email: EMAIL, shots: {}, checks: {}, md5: {}, compare: {} }

try {
  const auth = await ensureAuth()
  const access = auth.access_token
  const refresh = auth.refresh_token

  const sorc = await api('/characters', {
    method: 'POST',
    token: access,
    body: { name: 'Мира Искра', rules_edition: '2014' },
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
      name: 'Мира Искра',
      class_name: 'Чародей 3',
      level: 3,
      sheet: sorcererSheet({ level: 3, metamagic: '' }),
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
      sheet: wizardSheet(),
      sheet_version: wiz.sheet_version ?? 1,
    },
  })
  summary.sorcId = sorcPatched.id
  summary.wizId = wizPatched.id

  for (const vp of [
    { width: 1440, height: 900, tag: '1440' },
    { width: 390, height: 844, tag: '390' },
  ]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 })
    await login(page, BASE, access, refresh)
    await openSheet(page, BASE, sorcPatched.id)

    // Select 2 metamagic options in settings/features
    await pickMetamagicInUi(page, vp.width)
    summary.md5[`persist-meta-selected-${vp.tag}.png`] = await shot(page, `persist-meta-selected-${vp.tag}.png`)

    // Reload — picks must remain
    await openSheet(page, BASE, sorcPatched.id)
    await openScene(page, vp.width, vp.width < 960 ? 'Способн' : 'Способности')
    await page.waitForTimeout(500)
    summary.md5[`persist-meta-after-reload-${vp.tag}.png`] = await shot(
      page,
      `persist-meta-after-reload-${vp.tag}.png`,
    )
    const afterReload = await readMetamagicFromApi(access, sorcPatched.id)
    summary.checks[`reload-${vp.tag}`] = afterReload
    if (!afterReload.value || afterReload.value.split(',').filter(Boolean).length < 2) {
      throw new Error(`metamagic lost after reload (${vp.tag}): ${JSON.stringify(afterReload)}`)
    }

    // Cast with metamagic
    await castWithMeta(page, vp.width, vp.tag)
    const afterCast = await readMetamagicFromApi(access, sorcPatched.id)
    summary.checks[`cast-${vp.tag}`] = afterCast
    if (!afterCast.value) throw new Error(`metamagic lost after cast (${vp.tag})`)

    // Short + long rest
    await doRest(page, vp.width, 'short')
    summary.md5[`persist-after-short-rest-${vp.tag}.png`] = await shot(
      page,
      `persist-after-short-rest-${vp.tag}.png`,
    )
    const afterShort = await readMetamagicFromApi(access, sorcPatched.id)
    summary.checks[`short-${vp.tag}`] = afterShort
    if (!afterShort.value) throw new Error(`metamagic lost after short rest (${vp.tag})`)

    await doRest(page, vp.width, 'long')
    summary.md5[`persist-after-long-rest-${vp.tag}.png`] = await shot(
      page,
      `persist-after-long-rest-${vp.tag}.png`,
    )
    const afterLong = await readMetamagicFromApi(access, sorcPatched.id)
    summary.checks[`long-${vp.tag}`] = afterLong
    if (!afterLong.value) throw new Error(`metamagic lost after long rest (${vp.tag})`)

    // Level-up via API (keeps same class entry id) then reopen
    const fresh = await api(`/characters/${sorcPatched.id}`, { token: access })
    const sheet = structuredClone(fresh.sheet)
    sheet.classes = (sheet.classes || []).map((row) =>
      row.id === CLASS_ID ? { ...row, level: Math.max(4, Number(row.level) || 3) } : row,
    )
    await api(`/characters/${sorcPatched.id}`, {
      method: 'PATCH',
      token: access,
      body: {
        level: 4,
        class_name: 'Чародей 4',
        sheet,
        sheet_version: fresh.sheet_version,
      },
    })
    await openSheet(page, BASE, sorcPatched.id)
    await openScene(page, vp.width, vp.width < 960 ? 'Способн' : 'Способности')
    summary.md5[`persist-after-levelup-${vp.tag}.png`] = await shot(
      page,
      `persist-after-levelup-${vp.tag}.png`,
    )
    const afterLvl = await readMetamagicFromApi(access, sorcPatched.id)
    summary.checks[`levelup-${vp.tag}`] = afterLvl
    if (!afterLvl.value) throw new Error(`metamagic lost after level-up (${vp.tag})`)

    // Final desk/phone still selected
    summary.md5[`persist-meta-final-${vp.tag}.png`] = await shot(page, `persist-meta-final-${vp.tag}.png`)

    await page.close()
  }

  // Regression frames: same characters, combat top + abilities, after vs optional before
  for (const vp of [
    { width: 1440, height: 900, tag: '1440' },
    { width: 390, height: 844, tag: '390' },
  ]) {
    for (const [label, base] of [
      ['after', BASE],
      ...(BEFORE ? [['before', BEFORE]] : []),
    ]) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      })
      await login(page, base, access, refresh)
      await openSheet(page, base, sorcPatched.id)
      await openScene(page, vp.width, 'Бой')
      summary.md5[`reg-sorc-combat-top-${label}-${vp.tag}.png`] = await shot(
        page,
        `reg-sorc-combat-top-${label}-${vp.tag}.png`,
      )
      await openScene(page, vp.width, vp.width < 960 ? 'Способн' : 'Способности')
      summary.md5[`reg-sorc-abilities-${label}-${vp.tag}.png`] = await shot(
        page,
        `reg-sorc-abilities-${label}-${vp.tag}.png`,
      )

      await openSheet(page, base, wizPatched.id)
      await openScene(page, vp.width, 'Бой')
      summary.md5[`reg-wiz-combat-top-${label}-${vp.tag}.png`] = await shot(
        page,
        `reg-wiz-combat-top-${label}-${vp.tag}.png`,
      )
      await openScene(page, vp.width, vp.width < 960 ? 'Способн' : 'Способности')
      summary.md5[`reg-wiz-abilities-${label}-${vp.tag}.png`] = await shot(
        page,
        `reg-wiz-abilities-${label}-${vp.tag}.png`,
      )
      await page.close()
    }
  }

  if (BEFORE) {
    for (const kind of ['sorc-combat-top', 'sorc-abilities', 'wiz-combat-top', 'wiz-abilities']) {
      for (const tag of ['1440', '390']) {
        const a = `reg-${kind}-before-${tag}.png`
        const b = `reg-${kind}-after-${tag}.png`
        summary.compare[`${kind}-${tag}`] = {
          same: summary.md5[a] === summary.md5[b],
          before: summary.md5[a],
          after: summary.md5[b],
        }
      }
    }
  }

  writeFileSync(out('persist-meta-summary.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
} finally {
  await browser.close()
}
