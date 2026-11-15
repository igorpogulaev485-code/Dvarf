/**
 * FIX-01 real-sheet screenshots (Play Desk + session combat).
 * Requires API :8000 + tip vite :5173 + seed_cmb02 + seed_mag01
 * + lobby session with active combat for PAL5.
 *
 * Optional: FIX01_BEFORE_BASE=http://127.0.0.1:5174 for header «до» from main.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.FIX01_BASE || 'http://127.0.0.1:5173'
const BEFORE_BASE = process.env.FIX01_BEFORE_BASE || 'http://127.0.0.1:5174'
const PAL5 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7'
const SORC20 = 'cccccccc-cccc-4ccc-8ccc-cccccccccc02'
const API = process.env.FIX01_API || 'http://127.0.0.1:8000'

mkdirSync(ART, { recursive: true })
const out = (name) => `${ART}/${name}`

function md5(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

async function apiLogin() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'uikit03@example.com', password: 'uikit03-dev' }),
  })
  const body = await res.json()
  if (!body.access_token) throw new Error(`api login failed: ${JSON.stringify(body).slice(0, 200)}`)
  return body.access_token
}

async function patchTurnEconomy(token, characterId, patch) {
  const res = await fetch(`${API}/characters/${characterId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const ch = await res.json()
  const sheet = structuredClone(ch.sheet || {})
  const combat = sheet.combat || {}
  combat.turn_economy = { ...(combat.turn_economy || {}), ...patch }
  sheet.combat = combat
  const patchRes = await fetch(`${API}/characters/${characterId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sheet, sheet_version: ch.sheet_version }),
  })
  if (!patchRes.ok) {
    throw new Error(`patch TE ${patchRes.status}: ${(await patchRes.text()).slice(0, 200)}`)
  }
}

async function login(page) {
  const body = await page.evaluate(async () => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'uikit03@example.com', password: 'uikit03-dev' }),
    })
    return res.json()
  })
  if (!body.access_token) throw new Error(`login failed: ${JSON.stringify(body).slice(0, 200)}`)
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
    { a: body.access_token, r: body.refresh_token },
  )
  return body.access_token
}

async function dismissChrome(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  const expand = page.getByRole('button', { name: /Развернуть шапку/i })
  if (await expand.count()) await expand.first().click().catch(() => {})
}

async function openSheet(page, id, base = BASE) {
  await page.goto(`${base}/characters/${id}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForTimeout(700)
  await dismissChrome(page)
  await page.waitForSelector('.play-desk', { timeout: 25_000 })
}

async function openCombat(page, w) {
  if (w < 960) {
    const nav = page
      .locator('.mobile-scene-nav button, .mobile-scene-nav__tab')
      .filter({ hasText: /Бой/i })
    if (await nav.count()) await nav.first().click().catch(() => {})
  }
  const tab = page
    .locator('button.play-desk__mode[data-mode="combat"], button.play-desk__mode')
    .filter({ hasText: /^Бой$/i })
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(400)
  if (w < 960) {
    const atk = page.locator('.mobile-combat-seg__btn').filter({ hasText: /^Атаки$/ })
    if (await atk.count()) await atk.first().click().catch(() => {})
  }
  await page
    .waitForSelector('.play-desk-turn-actions, .play-desk-compact[data-onboarding="actions"]', {
      timeout: 15_000,
    })
    .catch(() => {})
}

async function showSpellsMobile(page) {
  const seg = page.locator('.mobile-combat-seg__btn, button').filter({ hasText: /^Заклинания$/i })
  if (await seg.count()) await seg.first().click().catch(() => {})
  await page.waitForTimeout(350)
}

async function shotHeader(page, path) {
  const box = await page.evaluate(() => {
    const desk = document.querySelector('.play-desk')
    if (!desk) return null
    const wide = desk.classList.contains('play-desk--wide')
    const root = wide
      ? document.querySelector('.play-desk__top')
      : document.querySelector('.play-desk__mobile-chrome')
    if (!root) return null
    const r = root.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.x)),
      y: Math.max(0, Math.round(r.y)),
      width: Math.max(80, Math.round(r.width)),
      height: Math.max(40, Math.round(r.height)),
    }
  })
  if (!box) throw new Error(`no header for ${path}`)
  await page.screenshot({ path, clip: box })
}

async function shotViewport(page, path) {
  await page.screenshot({ path, fullPage: false })
}

async function shotTurnRow(page, path) {
  const box = await page.evaluate(() => {
    const el =
      document.querySelector('.play-desk-turn-actions-wrap') ||
      document.querySelector('.play-desk-turn-actions')
    if (!el) return null
    el.scrollIntoView({ block: 'nearest' })
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.left) - 4),
      y: Math.max(0, Math.round(r.top) - 4),
      width: Math.max(80, Math.round(r.width) + 8),
      height: Math.min(
        window.innerHeight - Math.round(r.top) - 4,
        Math.max(90, Math.round(r.height) + 16),
      ),
    }
  })
  if (!box) throw new Error(`no turn row for ${path}`)
  await page.screenshot({ path, clip: box })
}

async function shotAttacksPanel(page, path) {
  const box = await page.evaluate(() => {
    const el =
      document.querySelector('.play-desk-compact[data-onboarding="actions"]') ||
      document.querySelector('.play-desk-compact')
    if (!el) return null
    el.scrollIntoView({ block: 'start' })
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.left) - 4),
      y: Math.max(0, Math.round(r.top)),
      width: Math.max(80, Math.round(r.width) + 8),
      height: Math.min(
        window.innerHeight - Math.round(r.top) - 4,
        Math.max(300, Math.round(r.height) + 8),
      ),
    }
  })
  if (!box) throw new Error(`no attacks for ${path}`)
  await page.screenshot({ path, clip: box })
}

async function shotFeed(page, path) {
  const box = await page.evaluate(() => {
    const candidates = [
      document.querySelector('.session-feed'),
      document.querySelector('[data-onboarding="feed"]'),
      document.querySelector('.play-desk-feed'),
      document.querySelector('.desk-roll-log'),
      document.querySelector('.play-desk__rail'),
    ].filter(Boolean)
    const el = candidates[0]
    if (!el) return null
    el.scrollIntoView({ block: 'nearest' })
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.left) - 4),
      y: Math.max(0, Math.round(r.top) - 4),
      width: Math.max(120, Math.round(r.width) + 8),
      height: Math.min(480, Math.max(140, Math.round(r.height) + 8)),
    }
  })
  if (box && box.width > 40 && box.height > 40) {
    await page.screenshot({ path, clip: box })
    return
  }
  await page.screenshot({ path, fullPage: false })
}

async function openAttackTarget(page) {
  const hitBtn = page.locator('button.play-desk-compact__mod--roll').first()
  if (await hitBtn.count()) {
    await hitBtn.click()
  } else {
    throw new Error('no attack roll button')
  }
  await page.waitForSelector('.ui-dialog, [role="dialog"]', { timeout: 12_000 })
  await page.waitForTimeout(250)
}

async function selectEnemy(page) {
  const chip = page.locator('.combat-target-picker__chip').filter({
    hasText: /Тестовый противник|противник/i,
  })
  if (await chip.count()) {
    await chip.first().click()
    await page.waitForTimeout(200)
    return
  }
  const any = page.locator('.combat-target-picker__chip').first()
  if (await any.count()) await any.click()
}

async function expandMods(page) {
  const tog = page.locator('button').filter({ hasText: /Укрытие \/ состояние цели/i })
  if (!(await tog.count())) return
  const expanded = await tog.first().getAttribute('aria-expanded')
  if (expanded !== 'true') await tog.first().click()
  await page.waitForTimeout(200)
}

const report = { files: [], md5: {} }

async function save(page, name, shotFn) {
  const path = out(name)
  await shotFn(page, path)
  const hash = md5(path)
  report.files.push(name)
  report.md5[name] = hash
  console.log(name, hash)
}

async function withViewport(browser, w, h, base, fn) {
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await login(page)
  try {
    await fn(page, w)
  } finally {
    await context.close()
  }
}

async function beforeBaseAlive() {
  try {
    const res = await fetch(BEFORE_BASE, { method: 'GET' })
    return res.ok || res.status === 200
  } catch {
    return false
  }
}

const token = await apiLogin()
// Reset marks before capture sequence
await patchTurnEconomy(token, PAL5, {
  action: false,
  bonus: false,
  reaction: false,
  object_interaction: false,
  moved: false,
})

const browser = await chromium.launch({ headless: true })
const hasBefore = await beforeBaseAlive()
console.log('BEFORE_BASE', BEFORE_BASE, hasBefore)

if (hasBefore) {
  await withViewport(browser, 1440, 900, BEFORE_BASE, async (page) => {
    await openSheet(page, PAL5, BEFORE_BASE)
    await save(page, 'fix01-header-1440-before.png', shotHeader)
  })
  await withViewport(browser, 390, 844, BEFORE_BASE, async (page) => {
    await openSheet(page, PAL5, BEFORE_BASE)
    await save(page, 'fix01-header-390-before.png', shotHeader)
  })
}

// —— Paladin 1440 ——
await withViewport(browser, 1440, 900, BASE, async (page) => {
  await openSheet(page, PAL5)
  await openCombat(page, 1440)
  await save(page, 'fix01-header-1440-after.png', shotHeader)
  if (!hasBefore) await save(page, 'fix01-header-1440-before.png', shotHeader)

  await save(page, 'fix01-attacks-turn-1440.png', shotAttacksPanel)
  await save(page, 'fix01-turn-closed-1440.png', shotTurnRow)

  const actionTab = page.locator('.play-desk-turn-actions__tab').filter({ hasText: /^Действие$/ })
  await actionTab.first().click()
  await page.waitForTimeout(300)
  await save(page, 'fix01-turn-action-open-1440.png', shotTurnRow)
  // collapse
  await actionTab.first().click()
  await page.waitForTimeout(200)

  await openAttackTarget(page)
  await selectEnemy(page)
  await expandMods(page)
  const prone = page.locator('.ui-toggle-chip').filter({ hasText: /Цель опрокинута/i })
  if (await prone.count()) {
    if ((await prone.first().getAttribute('aria-checked')) !== 'true') {
      await prone.first().click()
    }
  }
  await save(page, 'fix01-target-1440-open.png', shotViewport)

  const tog = page.locator('button').filter({ hasText: /Укрытие \/ состояние цели/i })
  if (await tog.count()) await tog.first().click()
  await page.waitForTimeout(200)
  await save(page, 'fix01-target-1440-collapsed.png', shotViewport)
  await page.keyboard.press('Escape')
})

// —— Bonus spent ——
await patchTurnEconomy(token, PAL5, { bonus: true })
await withViewport(browser, 1440, 900, BASE, async (page) => {
  await openSheet(page, PAL5)
  await openCombat(page, 1440)
  await save(page, 'fix01-turn-bonus-spent-1440.png', shotTurnRow)
})
await withViewport(browser, 390, 844, BASE, async (page) => {
  await openSheet(page, PAL5)
  await openCombat(page, 390)
  await save(page, 'fix01-turn-bonus-spent-390.png', shotTurnRow)
})
await patchTurnEconomy(token, PAL5, { bonus: false })

// —— Paladin 390 ——
await withViewport(browser, 390, 844, BASE, async (page) => {
  await openSheet(page, PAL5)
  await openCombat(page, 390)
  await save(page, 'fix01-header-390-after.png', shotHeader)
  if (!hasBefore) await save(page, 'fix01-header-390-before.png', shotHeader)
  await save(page, 'fix01-attacks-turn-390.png', shotAttacksPanel)
  await save(page, 'fix01-turn-closed-390.png', shotTurnRow)

  const actionTab = page.locator('.play-desk-turn-actions__tab').filter({ hasText: /^Действие$/ })
  if (await actionTab.count()) {
    await actionTab.first().click()
    await page.waitForTimeout(300)
  }
  await save(page, 'fix01-turn-action-open-390.png', shotTurnRow)

  await openAttackTarget(page)
  await selectEnemy(page)
  await expandMods(page)
  const prone = page.locator('.ui-toggle-chip').filter({ hasText: /Цель опрокинута/i })
  if (await prone.count()) {
    if ((await prone.first().getAttribute('aria-checked')) !== 'true') {
      await prone.first().click()
    }
  }
  await save(page, 'fix01-target-390-open.png', shotViewport)
  await page.keyboard.press('Escape')
})

// —— Feed hit / miss via sheet-attack API, then reload sheet ——
async function sessionIdForPal(tok) {
  const res = await fetch(`${API}/characters/${PAL5}`, {
    headers: { Authorization: `Bearer ${tok}` },
  })
  const ch = await res.json()
  return ch.open_session_id
}

async function enemyTarget(tok, sessionId) {
  const res = await fetch(`${API}/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${tok}` },
  })
  const detail = await res.json()
  const combatants = detail.combatants || []
  const enemy = combatants[0]
  if (!enemy) throw new Error('no enemy')
  const member = (enemy.members && enemy.members[0]) || null
  return {
    target_kind: 'enemy',
    target_ref_id: enemy.id,
    target_member_id: member?.id || null,
    name: enemy.name,
  }
}

const sid = await sessionIdForPal(token)
const target = await enemyTarget(token, sid)

// Hit
{
  const res = await fetch(`${API}/sessions/${sid}/combat/sheet-attack`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      character_id: PAL5,
      attack_name: 'Длинный меч',
      target_kind: target.target_kind,
      target_ref_id: target.target_ref_id,
      target_member_id: target.target_member_id,
      mode: 'roll',
      attack_total: 18,
      attack_natural: 12,
      damage_total: 9,
      damage_type: 'slashing',
    }),
  })
  console.log('sheet-attack hit', res.status, (await res.text()).slice(0, 180))
}
await withViewport(browser, 1440, 900, BASE, async (page) => {
  await openSheet(page, PAL5)
  await openCombat(page, 1440)
  // Prefer session feed if linked; else toast area / rail
  await page.waitForTimeout(600)
  await save(page, 'fix01-feed-hit-1440.png', shotFeed)
})

// Miss
{
  const res = await fetch(`${API}/sessions/${sid}/combat/sheet-attack`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      character_id: PAL5,
      attack_name: 'Длинный меч',
      target_kind: target.target_kind,
      target_ref_id: target.target_ref_id,
      target_member_id: target.target_member_id,
      mode: 'roll',
      attack_total: 8,
      attack_natural: 3,
      damage_total: 9,
      damage_type: 'slashing',
    }),
  })
  console.log('sheet-attack miss', res.status, (await res.text()).slice(0, 180))
}
await withViewport(browser, 1440, 900, BASE, async (page) => {
  await openSheet(page, PAL5)
  await openCombat(page, 1440)
  await page.waitForTimeout(600)
  await save(page, 'fix01-feed-miss-1440.png', shotFeed)
})

// —— Sorcerer cast + spell detail 390 ——
await withViewport(browser, 390, 844, BASE, async (page) => {
  await openSheet(page, SORC20)
  await openCombat(page, 390)
  await showSpellsMobile(page)
  await page.waitForTimeout(400)

  const castBtn = page.locator('button.ui-button, button').filter({ hasText: /^Каст$/i })
  if (await castBtn.count()) {
    await castBtn.first().click()
  } else {
    throw new Error('no Каст button on sorcerer')
  }
  await page.waitForSelector('.ui-dialog', { timeout: 12_000 })
  const meta = page.locator('button').filter({ hasText: /Метамагия/i })
  if (await meta.count()) {
    const open = await meta.first().getAttribute('aria-expanded')
    if (open !== 'true') await meta.first().click()
    await page.waitForTimeout(250)
    const chip = page.locator('.ui-toggle-chip').first()
    if (await chip.count()) {
      if ((await chip.first().getAttribute('aria-checked')) !== 'true') {
        await chip.first().click()
      }
    }
  }
  await save(page, 'fix01-cast-390.png', shotViewport)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // Spell detail: tap name
  const nameHit = page.locator(
    '.play-desk-compact__spell-name, button.play-desk-compact__spell-name, .spell-compact__name-btn, .play-desk-compact__spell button',
  )
  let opened = false
  if (await nameHit.count()) {
    await nameHit.first().click()
    await page.waitForTimeout(400)
    if (await page.locator('.ui-dialog').count()) opened = true
  }
  if (!opened) {
    // Expand row then Описание
    const row = page.locator('.play-desk-compact__spell, [class*="spell-compact__row"]').first()
    if (await row.count()) await row.click()
    await page.waitForTimeout(200)
    const desc = page.locator('button').filter({ hasText: /^Описание$/ })
    if (await desc.count()) {
      await desc.first().click()
      opened = true
    }
  }
  await page.waitForTimeout(400)
  await save(page, 'fix01-spell-detail-390.png', shotViewport)
})

await browser.close()

function headerCompare(a, b) {
  if (!existsSync(a) || !existsSync(b)) return { equal: false, missing: true }
  const ha = md5(a)
  const hb = md5(b)
  if (ha === hb) return { equal: true, md5: ha }
  // byte length hint
  const sa = readFileSync(a).length
  const sb = readFileSync(b).length
  return { equal: false, md5Before: ha, md5After: hb, bytesBefore: sa, bytesAfter: sb }
}

report.headerCompare = {
  '1440': headerCompare(out('fix01-header-1440-before.png'), out('fix01-header-1440-after.png')),
  '390': headerCompare(out('fix01-header-390-before.png'), out('fix01-header-390-after.png')),
}

const lines = Object.entries(report.md5).map(([f, h]) => `- \`${f}\` md5=\`${h}\``)
writeFileSync(out('fix01-screenshots.md'), lines.join('\n') + '\n', 'utf8')
writeFileSync(out('fix01-capture-report.json'), JSON.stringify(report, null, 2), 'utf8')

const hashes = Object.values(report.md5)
const uniq = new Set(hashes)
if (uniq.size !== hashes.length) {
  console.warn('WARNING duplicate md5', hashes.length, uniq.size)
  const seen = new Map()
  for (const [f, h] of Object.entries(report.md5)) {
    if (seen.has(h)) console.warn('  dup', seen.get(h), f)
    else seen.set(h, f)
  }
}
console.log('headerCompare', report.headerCompare)
console.log('fix01-capture done', report.files.length, 'files')
